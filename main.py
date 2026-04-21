from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from langchain_groq import ChatGroq
from langchain.agents import create_agent
from langchain_core.messages import HumanMessage, AIMessage
from langchain_core.tools import tool
from langchain_community.tools.tavily_search import TavilySearchResults
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from datetime import datetime
import json
import os
import time
import requests
import bcrypt
from bs4 import BeautifulSoup

load_dotenv()

embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
vectorstore = Chroma(
    persist_directory="./chroma_db",
    embedding_function=embeddings
)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

USUARIOS_FILE = "usuarios.json"
PERFILES_DIR = "perfiles"
os.makedirs(PERFILES_DIR, exist_ok=True)

def cargar_usuarios() -> dict:
    if os.path.exists(USUARIOS_FILE):
        with open(USUARIOS_FILE, "r", encoding="utf-8") as f:
            contenido = f.read().strip()
            if contenido:
                return json.loads(contenido)
    return {}

def guardar_usuarios(usuarios: dict):
    with open(USUARIOS_FILE, "w", encoding="utf-8") as f:
        json.dump(usuarios, f, ensure_ascii=False, indent=2)

def crear_perfil_md(username: str, datos: dict):
    """Crea el archivo .md del perfil del usuario de forma ordenada."""
    contenido = f"""# Perfil de {datos['nombre']}

## Datos Básicos
- **Username**: {username}
- **Nombre**: {datos['nombre']}
- **Edad**: {datos['edad']} años
- **Sexo**: {datos['sexo']}
- **Peso**: {datos['peso_kg']} kg
- **Altura**: {datos['altura_m']} m
- **Nivel de actividad**: {datos['nivel_actividad']}
- **Objetivo principal**: {datos['objetivo']}

## Condiciones Médicas
{f"- {datos['condiciones_medicas']}" if datos.get('condiciones_medicas') else "*(Sin condiciones registradas)*"}

## Progreso
*(Se actualizará automáticamente con la conversación)*

## Preferencias Deportivas
*(Se actualizará automáticamente con la conversación)*

## Preferencias Alimentarias
*(Se actualizará automáticamente con la conversación)*

## Preferencias de Ejercicio
*(Se actualizará automáticamente con la conversación)*

## Historial y Notas
- Perfil creado el {datetime.now().strftime('%d/%m/%Y')}
"""
    path = os.path.join(PERFILES_DIR, f"{username}.md")
    with open(path, "w", encoding="utf-8") as f:
        f.write(contenido)
    return path

def indexar_perfil(username: str):
    """Indexa o re-indexa el perfil del usuario en ChromaDB."""
    path = os.path.join(PERFILES_DIR, f"{username}.md")
    with open(path, "r", encoding="utf-8") as f:
        contenido = f.read()

    try:
        vectorstore._collection.delete(where={"username": username})
    except Exception:
        pass

    vectorstore.add_texts(
        texts=[contenido],
        metadatas=[{"username": username, "tipo": "perfil"}],
        ids=[f"perfil_{username}"]
    )

def actualizar_perfil_md(username: str, seccion: str, nuevo_dato: str):
    """Agrega información nueva a una sección del perfil."""
    path = os.path.join(PERFILES_DIR, f"{username}.md")
    with open(path, "r", encoding="utf-8") as f:
        contenido = f.read()

    marcador = f"## {seccion}"
    if marcador in contenido:
        placeholder = "*(Se actualizará automáticamente con la conversación)*"
        if f"{marcador}\n{placeholder}" in contenido:
            contenido = contenido.replace(
                f"{marcador}\n{placeholder}",
                f"{marcador}\n- {nuevo_dato}"
            )
        else:
            partes = contenido.split(marcador)
            siguiente = partes[1].find("\n## ")
            if siguiente != -1:
                partes[1] = partes[1][:siguiente] + f"\n- {nuevo_dato}" + partes[1][siguiente:]
            else:
                partes[1] = partes[1].rstrip() + f"\n- {nuevo_dato}\n"
            contenido = marcador.join(partes)

    with open(path, "w", encoding="utf-8") as f:
        f.write(contenido)

    indexar_perfil(username)

def actualizar_dato_basico(username: str, dato: str):
    """Registra un cambio en datos básicos con timestamp en el historial."""
    actualizar_perfil_md(
        username,
        "Historial y Notas",
        f"{datetime.now().strftime('%d/%m/%Y')}: {dato}"
    )

LOGS_FILE = "fitness_agent_logs.json"

def cargar_log() -> dict:
    if os.path.exists(LOGS_FILE):
        with open(LOGS_FILE, "r", encoding="utf-8") as f:
            contenido = f.read().strip()
            if not contenido:
                return {}
            return json.loads(contenido)
    return {}

def guardar_log(username: str, role: str, content: str, tools_usadas: list = []):
    logs = cargar_log()
    if username not in logs:
        logs[username] = []
    logs[username].append({
        "role": role,
        "content": content,
        "tools_usadas": tools_usadas,
        "timestamp": datetime.now().isoformat()
    })
    with open(LOGS_FILE, "w", encoding="utf-8") as f:
        json.dump(logs, f, ensure_ascii=False, indent=2)

@tool
def consultar_base_de_conocimiento(consulta: str) -> str:
    """
    Busca información en la base de conocimiento de FitBot sobre ejercicios,
    nutrición, planes de dieta, lesiones y términos fitness.
    Úsala para responder preguntas generales de fitness que no requieran cálculos.
    """
    try:
        docs = vectorstore.similarity_search(consulta, k=3)
        if not docs:
            return "No encontré información relevante en la base de conocimiento."
        resultados = "\n\n".join([doc.page_content for doc in docs])
        return resultados
    except Exception as e:
        return f"Error al consultar la base de conocimiento: {e}"

@tool
def calcular_imc(peso_kg: str, altura_m: str) -> str:
    """Calcula el Índice de Masa Corporal (IMC) dado el peso en Kg y la altura en m."""
    try:
        peso_kg = float(peso_kg)
        altura_m = float(altura_m)
        imc = peso_kg / (altura_m ** 2)
        if imc < 18.5:
            categoria = "Bajo peso"
        elif 18.5 <= imc < 25:
            categoria = "Peso normal"
        elif 25 <= imc < 30:
            categoria = "Sobrepeso"
        else:
            categoria = "Obesidad"
        return f"IMC: {imc:.2f} - {categoria}."
    except Exception as e:
        return f"Error al calcular el IMC: {e}"

@tool
def calcular_calorias(peso_kg: str, altura_m: str, edad: str, sexo: str, nivel_actividad: str) -> str:
    """
    Calcula las calorías diarias recomendadas usando la fórmula de Harris-Benedict.
    Sexo: 'hombre' o 'mujer'.
    Nivel de actividad: 'sedentario', 'ligero', 'moderado', 'activo', 'muy activo'.
    """
    try:
        peso_kg = float(peso_kg)
        altura_m = float(altura_m)
        edad = int(edad)
        if sexo.lower() == 'hombre':
            tmb = 88.362 + (13.397 * peso_kg) + (4.799 * altura_m * 100) - (5.677 * edad)
        elif sexo.lower() == 'mujer':
            tmb = 447.593 + (9.247 * peso_kg) + (3.098 * altura_m * 100) - (4.330 * edad)
        else:
            return "Sexo no reconocido. Use 'hombre' o 'mujer'."
        factores = {
            "sedentario": 1.2,
            "ligero": 1.375,
            "moderado": 1.55,
            "activo": 1.725,
            "muy activo": 1.9,
        }
        factor = factores.get(nivel_actividad.lower(), 1.2)
        calorias = tmb * factor
        return f"Calorías diarias recomendadas: {calorias:.2f} kcal/día. (TMB: {tmb:.0f} kcal)"
    except Exception as e:
        return f"Error al calcular las calorías: {e}"

@tool
def calcular_macros(calorias: str, objetivo: str) -> str:
    """
    Calcula la distribución de macronutrientes según el objetivo.
    Objetivo: 'bajar peso', 'mantener', 'ganar músculo'.
    """
    try:
        calorias = float(calorias)
        distribuciones = {
            "bajar peso":    {"proteina": 0.40, "carbos": 0.30, "grasas": 0.30},
            "mantener":      {"proteina": 0.30, "carbos": 0.40, "grasas": 0.30},
            "ganar músculo": {"proteina": 0.35, "carbos": 0.45, "grasas": 0.20},
        }
        d = distribuciones.get(objetivo.lower(), distribuciones["mantener"])
        proteina_g = (calorias * d["proteina"]) / 4
        carbos_g   = (calorias * d["carbos"])   / 4
        grasas_g   = (calorias * d["grasas"])   / 9
        return (
            f"Macros para '{objetivo}' con {calorias:.0f} kcal:\n"
            f"  Proteína: {proteina_g:.0f}g\n"
            f"  Carbohidratos: {carbos_g:.0f}g\n"
            f"  Grasas: {grasas_g:.0f}g"
        )
    except Exception as e:
        return f"Error al calcular los macronutrientes: {e}"

@tool
def rutina_ejercicio(objetivo: str, dias_disponibles: str) -> str:
    """
    Devuelve una rutina de ejercicio según el objetivo y los días disponibles por semana.
    Objetivo: 'bajar peso', 'ganar músculo', 'resistencia'.
    Días disponibles: número entre 1 y 6.
    """
    try:
        dias_disponibles = int(dias_disponibles)
        rutinas = {
            "bajar peso": {
                3: "Lunes: Cardio + Full Body\nMiércoles: HIIT\nViernes: Cardio + Core",
                4: "Lunes: Cardio + Full Body\nMartes: Descanso\nMiércoles: HIIT\nJueves: Descanso\nViernes: Cardio + Core\nSábado: Descanso",
                5: "Lunes: Cardio + Full Body\nMartes: HIIT\nMiércoles: Descanso\nJueves: Cardio + Core\nViernes: HIIT\nSábado: Descanso",
                6: "Lunes: Cardio + Full Body\nMartes: HIIT\nMiércoles: Cardio + Core\nJueves: HIIT\nViernes: Cardio + Full Body\nSábado: HIIT"
            },
            "ganar músculo": {
                3: "Lunes: Pecho + Tríceps\nMiércoles: Espalda + Bíceps\nViernes: Piernas + Hombros",
                4: "Lunes: Pecho + Tríceps\nMartes: Espalda + Bíceps\nMiércoles: Descanso\nJueves: Piernas + Hombros\nViernes: Pecho + Tríceps\nSábado: Descanso",
                5: "Lunes: Pecho + Tríceps\nMartes: Espalda + Bíceps\nMiércoles: Piernas + Hombros\nJueves: Descanso\nViernes: Pecho + Tríceps\nSábado: Espalda + Bíceps",
                6: "Lunes: Pecho + Tríceps\nMartes: Espalda + Bíceps\nMiércoles: Piernas + Hombros\nJueves: Pecho + Tríceps\nViernes: Espalda + Bíceps\nSábado: Piernas + Hombros"
            },
            "resistencia": {
                3: "Lunes, Miércoles, Viernes:\n- Calentamiento (10 min)\n- Circuito de cuerpo completo (30 min)\n- Enfriamiento (10 min)",
                4: "Lunes, Martes, Jueves, Viernes:\n- Calentamiento (10 min)\n- Circuito de cuerpo completo (30 min)\n- Enfriamiento (10 min)\nMiércoles, Sábado: Actividad ligera (yoga, caminata)",
                5: "Lunes, Martes, Jueves, Viernes:\n- Calentamiento (10 min)\n- Circuito de cuerpo completo (30 min)\n- Enfriamiento (10 min)\nMiércoles, Sábado: Actividad ligera (yoga, caminata)",
                6: "Lunes, Martes, Jueves, Viernes:\n- Calentamiento (10 min)\n- Circuito de cuerpo completo (30 min)\n- Enfriamiento (10 min)\nMiércoles, Sábado: Actividad ligera (yoga, caminata)"
            }
        }
        objetivo_lower = objetivo.lower()
        if objetivo_lower not in rutinas:
            objetivo_lower = "resistencia"
        dias_key = min(rutinas[objetivo_lower].keys(), key=lambda x: abs(x - dias_disponibles))
        return f"Rutina para '{objetivo}' ({dias_disponibles} días/semana):\n{rutinas[objetivo_lower][dias_key]}"
    except Exception as e:
        return f"Error al generar la rutina de ejercicio: {e}"

@tool
def consultar_ibero_fitness(consulta: str = "fitness") -> str:
    """
    Obtiene información actualizada sobre las clases fitness, talleres deportivos
    y gimnasio de la IBERO Puebla desde su sitio web oficial.
    """
    try:
        url = "https://www.iberopuebla.mx/IBEROmas/fitness"
        headers = {"User-Agent": "Mozilla/5.0"}
        response = requests.get(url, headers=headers, timeout=10)
        soup = BeautifulSoup(response.text, "html.parser")
        for tag in soup(["script", "style", "nav", "footer", "header"]):
            tag.decompose()
        main = soup.find("main") or soup.find("body")
        texto = main.get_text(separator="\n", strip=True)
        lineas = [l for l in texto.splitlines() if l.strip()]
        resultado = "\n".join(lineas[:80])
        return f"Información del fitness IBERO Puebla:\n\n{resultado}"
    except Exception as e:
        return f"Error al obtener información de la IBERO: {e}"

tavily = TavilySearchResults(max_results=3)

def crear_agente(perfil_usuario: str = ""):
    system_prompt = f"""
    Eres FitBot, un experto en fitness y salud personalizado.
    {"Información del usuario actual: " + perfil_usuario if perfil_usuario else ""}

    Usa las herramientas disponibles:
    - consultar_base_de_conocimiento: para preguntas sobre ejercicios, nutrición, lesiones, planes de dieta y términos fitness.
    - calcular_imc: para evaluar el estado corporal.
    - calcular_calorias: para determinar necesidades energéticas.
    - calcular_macros: para planificar dietas según objetivos.
    - rutina_ejercicio: para generar rutinas según objetivos y disponibilidad semanal.
    - consultar_ibero_fitness: para información sobre clases, talleres y gimnasio de la IBERO Puebla.
    - Tavily: para buscar noticias y consejos actualizados de fitness en internet.

    SIEMPRE usa las herramientas disponibles. Nunca inventes datos ni rutinas de memoria.
    Si conoces el perfil del usuario, úsalo para personalizar tus respuestas sin pedirle datos que ya tienes.
    Si el usuario tiene condiciones médicas registradas, tenlas siempre en cuenta al dar recomendaciones.
    """
    return create_agent(
        model=ChatGroq(model="meta-llama/llama-4-scout-17b-16e-instruct"),
        tools=[consultar_base_de_conocimiento, consultar_ibero_fitness, calcular_imc, calcular_calorias, calcular_macros, rutina_ejercicio, tavily],
        system_prompt=system_prompt
    )

def detectar_y_actualizar_perfil(username: str, mensaje: str, respuesta: str):
    """Usa el LLM para detectar info relevante del usuario y actualizar su perfil."""
    llm = ChatGroq(model="meta-llama/llama-4-scout-17b-16e-instruct")
    prompt = f"""Analiza este intercambio y detecta si el usuario mencionó información relevante para su perfil fitness. Solo añádelo si no tenías ese dato registrado.

Mensaje del usuario: "{mensaje}"
Respuesta del asistente: "{respuesta}"

Detecta las cosas más relevante de estas categorías:
- "Progreso": avances, cambios de peso, logros, cómo va con su entrenamiento
- "Condiciones Médicas": enfermedades, cirugías, lesiones, limitaciones físicas
- "Preferencias Deportivas": deportes o actividades que le gustan o no
- "Preferencias Alimentarias": alimentos que le gustan, no le gustan o no puede comer
- "Preferencias de Ejercicio": ejercicios específicos que prefiere o evita
- "Datos Básicos": si menciona un cambio en peso, altura o nivel de actividad

Si detectas algo, responde SOLO en JSON sin markdown:
{{"seccion": "nombre de la sección", "dato": "descripción concisa del dato"}}

Si es un cambio en Datos Básicos como el peso, incluye el nuevo valor en el dato.
Si no hay nada relevante, responde exactamente: null"""

    result = llm.invoke(prompt)
    texto = result.content.strip()
    print(f"DEBUG perfil update: '{texto}'")

    if texto == "null" or not texto:
        return

    try:
        texto_limpio = "[" + texto + "]"
        items = json.loads(texto_limpio)
        
        for info in items:
            if not info:
                continue
            if "seccion" in info and "dato" in info:
                seccion, dato = info["seccion"], info["dato"]
            else:
                seccion, dato = next(iter(info.items()))
            
            if seccion == "Datos Básicos":
                actualizar_dato_basico(username, dato)
            else:
                actualizar_perfil_md(username, seccion, dato)
    except Exception as e:
        print(f"Error parseando perfil: {e}")

class RegistroRequest(BaseModel):
    username: str
    password: str
    nombre: str
    edad: str
    sexo: str
    peso_kg: str
    altura_m: str
    nivel_actividad: str
    objetivo: str
    condiciones_medicas: str = ""

class LoginRequest(BaseModel):
    username: str
    password: str

class ChatRequest(BaseModel):
    username: str
    mensaje: str

@app.post("/registro")
def registro(request: RegistroRequest):
    usuarios = cargar_usuarios()

    if request.username in usuarios:
        raise HTTPException(status_code=400, detail="El username ya existe")

    hashed = bcrypt.hashpw(request.password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    usuarios[request.username] = {"password": hashed, "nombre": request.nombre}
    guardar_usuarios(usuarios)

    datos = {
        "nombre": request.nombre,
        "edad": request.edad,
        "sexo": request.sexo,
        "peso_kg": request.peso_kg,
        "altura_m": request.altura_m,
        "nivel_actividad": request.nivel_actividad,
        "objetivo": request.objetivo,
        "condiciones_medicas": request.condiciones_medicas,
    }
    crear_perfil_md(request.username, datos)
    indexar_perfil(request.username)

    return {"mensaje": f"Usuario {request.username} registrado exitosamente"}

@app.post("/login")
def login(request: LoginRequest):
    usuarios = cargar_usuarios()

    if request.username not in usuarios:
        raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos")

    hashed = usuarios[request.username]["password"].encode("utf-8")
    if not bcrypt.checkpw(request.password.encode("utf-8"), hashed):
        raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos")

    return {"mensaje": "Login exitoso", "username": request.username, "nombre": usuarios[request.username]["nombre"]}

@app.post("/chat")
def chat(request: ChatRequest):
    guardar_log(request.username, "user", request.mensaje)

    perfil_usuario = ""
    try:
        docs = vectorstore.similarity_search(
            f"perfil {request.username}",
            k=1,
            filter={"username": request.username}
        )
        if docs:
            perfil_usuario = docs[0].page_content
    except Exception:
        pass

    agent = crear_agente(perfil_usuario)

    inicio = time.time()
    result = agent.invoke({"messages": [HumanMessage(content=request.mensaje)]})
    tiempo = round(time.time() - inicio, 2)

    respuesta = result["messages"][-1].content

    tools_usadas = []
    for msg in result["messages"]:
        if isinstance(msg, AIMessage) and msg.tool_calls:
            for tc in msg.tool_calls:
                tools_usadas.append(tc["name"])

    guardar_log(request.username, "assistant", respuesta, tools_usadas)

    try:
        detectar_y_actualizar_perfil(request.username, request.mensaje, respuesta)
    except Exception:
        pass

    return {
        "respuesta": respuesta,
        "tools_usadas": tools_usadas,
        "tiempo_segundos": tiempo
    }