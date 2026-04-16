from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from langchain_groq import ChatGroq
from langchain.agents import create_agent
from langchain_core.messages import HumanMessage
from langchain_core.tools import tool
from langchain_community.tools.tavily_search import TavilySearchResults
from datetime import datetime
import json
import os

load_dotenv()

# ─────────────────────────────────────────────
# FASTAPI
# ─────────────────────────────────────────────

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # origen de React
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────
# MANEJO DE LOGS EN JSON
# ─────────────────────────────────────────────

LOGS_FILE = "fitness_agent_logs.json"

def cargar_log() -> dict:
    if os.path.exists(LOGS_FILE):
        with open(LOGS_FILE, "r", encoding="utf-8") as f:
            contenido = f.read().strip()
            if not contenido:
                return {}
            return json.loads(contenido)
    return {}

def guardar_log(role: str, content: str):
    logs = cargar_log()
    if "mensajes" not in logs:
        logs["mensajes"] = []
    logs["mensajes"].append({
        "role": role,
        "content": content,
        "timestamp": datetime.now().isoformat()
    })
    with open(LOGS_FILE, "w", encoding="utf-8") as f:
        json.dump(logs, f, ensure_ascii=False, indent=2)

# ─────────────────────────────────────────────
# HERRAMIENTAS
# ─────────────────────────────────────────────

@tool
def calcular_imc(peso_kg: float, altura_m: float) -> str:
    """Calcula el Índice de Masa Corporal (IMC) dado el peso en Kg y la altura en m."""
    try:
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
def calcular_calorias(peso_kg: float, altura_m: float, edad: int, sexo: str, nivel_actividad: str) -> str:
    """
    Calcula las calorías diarias recomendadas usando la fórmula de Harris-Benedict.
    Sexo: 'hombre' o 'mujer'.
    Nivel de actividad: 'sedentario', 'ligero', 'moderado', 'activo', 'muy activo'.
    """
    try:
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
def calcular_macros(calorias: float, objetivo: str) -> str:
    """
    Calcula la distribución de macronutrientes según el objetivo.
    Objetivo: 'bajar peso', 'mantener', 'ganar músculo'.
    """
    try:
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
def rutina_ejercicio(objetivo: str, dias_disponibles: int) -> str:
    """
    Devuelve una rutina de ejercicio según el objetivo y los días disponibles por semana.
    Objetivo: 'bajar peso', 'ganar músculo', 'resistencia'.
    Días disponibles: número entre 1 y 6.
    """
    try:
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

tavily = TavilySearchResults(max_results=3)

# ─────────────────────────────────────────────
# AGENTE
# ─────────────────────────────────────────────

agent = create_agent(
    model=ChatGroq(model="llama-3.3-70b-versatile"),
    tools=[calcular_imc, calcular_calorias, calcular_macros, rutina_ejercicio, tavily],
    system_prompt="""
    Eres FitBot, un experto en fitness y salud.
    Usa:
    - Tavily para búsqueda web de ejercicios, dietas y consejos actualizados.
    - calcular_imc para evaluar el estado corporal.
    - calcular_calorias para determinar necesidades energéticas.
    - calcular_macros para planificar dietas según objetivos.
    - rutina_ejercicio para generar rutinas según objetivos y disponibilidad semanal.
    SIEMPRE usa las herramientas disponibles. Nunca inventes datos ni rutinas de memoria.
    """
)

# ─────────────────────────────────────────────
# ENDPOINT
# ─────────────────────────────────────────────

class ChatRequest(BaseModel):
    mensaje: str

@app.post("/chat")
def chat(request: ChatRequest):
    guardar_log("user", request.mensaje)

    result = agent.invoke({"messages": [HumanMessage(content=request.mensaje)]})
    respuesta = result["messages"][-1].content

    guardar_log("assistant", respuesta)

    return {"respuesta": respuesta}