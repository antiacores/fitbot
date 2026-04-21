import { useState, useRef, useEffect } from "react";

const API = "http://localhost:8000";

const GLOBAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700&family=DM+Sans:wght@300;400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #080f13; font-family: 'DM Sans', sans-serif; }

  ::-webkit-scrollbar { width: 3px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #1e3040; border-radius: 2px; }

  .screen {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: #080f13;
    position: relative;
  }

  .screen::before {
    content: '';
    position: fixed;
    inset: 0;
    background-image:
      linear-gradient(rgba(10,132,132,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(10,132,132,0.03) 1px, transparent 1px);
    background-size: 40px 40px;
    pointer-events: none;
    z-index: 0;
  }

  .card {
    background: #0b1820;
    border: 1px solid #0e2a3a;
    border-radius: 20px;
    padding: 40px;
    width: 100%;
    max-width: 440px;
    position: relative;
    z-index: 1;
  }

  .card-logo {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    margin-bottom: 32px;
  }

  .card-logo img { height: 44px; object-fit: contain; }

  .card-subtitle {
    font-size: 12px;
    color: #4a7a8a;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .form-title {
    font-family: 'Syne', sans-serif;
    font-size: 20px;
    font-weight: 600;
    color: #dce8f0;
    margin-bottom: 24px;
    text-align: center;
  }

  .form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 12px;
  }

  .form-grid-full {
    grid-column: 1 / -1;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 12px;
  }

  .field label {
    font-size: 11px;
    color: #4a7a8a;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .field input, .field select, .field textarea {
    background: #0e1e28;
    border: 1px solid #152e42;
    border-radius: 10px;
    padding: 10px 14px;
    color: #dce8f0;
    font-size: 14px;
    font-family: 'DM Sans', sans-serif;
    transition: border-color 0.2s;
    width: 100%;
  }

  .field textarea {
    resize: none;
    line-height: 1.5;
  }

  .field input:focus, .field select:focus, .field textarea:focus {
    outline: none;
    border-color: #0A8484;
  }

  .field input::placeholder, .field textarea::placeholder { color: #2d4a58; }
  .field select option { background: #0e1e28; }

  .optional-label {
    color: #2d4a58;
    text-transform: none;
    letter-spacing: 0;
    font-size: 10px;
  }

  .btn-primary {
    width: 100%;
    padding: 12px;
    background: #0A8484;
    border: none;
    border-radius: 12px;
    color: #fff;
    font-size: 14px;
    font-family: 'DM Sans', sans-serif;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 2px 10px rgba(10,132,132,0.3);
    margin-top: 8px;
  }

  .btn-primary:hover:not(:disabled) {
    background: #0d9e9e;
    transform: translateY(-1px);
  }

  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

  .link-text {
    text-align: center;
    font-size: 13px;
    color: #4a7a8a;
    margin-top: 16px;
  }

  .link-text button {
    background: none;
    border: none;
    color: #0A8484;
    cursor: pointer;
    font-size: 13px;
    font-family: 'DM Sans', sans-serif;
    text-decoration: underline;
  }

  .error-msg {
    font-size: 12px;
    color: #e05c5c;
    text-align: center;
    margin-top: 8px;
  }

  /* ── CHAT ── */

  .chat-root {
    display: flex;
    flex-direction: column;
    height: 100vh;
    max-width: 760px;
    margin: 0 auto;
    background: #080f13;
    color: #dce8f0;
    position: relative;
  }

  .chat-root::before {
    content: '';
    position: fixed;
    inset: 0;
    background-image:
      linear-gradient(rgba(10,132,132,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(10,132,132,0.03) 1px, transparent 1px);
    background-size: 40px 40px;
    pointer-events: none;
    z-index: 0;
  }

  .chat-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 24px;
    border-bottom: 1px solid #0e2030;
    position: relative;
    z-index: 1;
  }

  .chat-header-center {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  .chat-header img { height: 36px; object-fit: contain; }

  .header-status {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 11px;
    color: #4a7a8a;
  }

  .status-dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: #0A8484;
    box-shadow: 0 0 6px #0A8484;
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }

  .user-badge {
    font-size: 12px;
    color: #4a7a8a;
    background: #0e1e28;
    border: 1px solid #152e42;
    border-radius: 20px;
    padding: 4px 12px;
  }

  .logout-btn {
    background: none;
    border: 1px solid #152e42;
    border-radius: 8px;
    color: #4a7a8a;
    font-size: 12px;
    padding: 4px 10px;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    transition: all 0.2s;
  }

  .logout-btn:hover { border-color: #0A8484; color: #0A8484; }

  .messages {
    flex: 1;
    overflow-y: auto;
    padding: 28px 20px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    position: relative;
    z-index: 1;
  }

  .message-group { display: flex; flex-direction: column; gap: 4px; }

  .message-row {
    display: flex;
    width: 100%;
    animation: fadeUp 0.25s ease forwards;
  }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .bubble {
    max-width: 74%;
    padding: 12px 16px;
    font-size: 14px;
    line-height: 1.65;
    white-space: pre-wrap;
    word-break: break-word;
    color: #dce8f0;
  }

  .bubble-user {
    background: linear-gradient(135deg, #0A8484, #0d9e9e);
    border-radius: 18px 18px 4px 18px;
    margin-left: auto;
    box-shadow: 0 2px 12px rgba(10,132,132,0.3);
  }

  .bubble-bot {
    background: #0e2030;
    border-radius: 18px 18px 18px 4px;
    border: 1px solid #152e42;
  }

  .debug-bar {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0 4px;
    flex-wrap: wrap;
  }

  .tool-tag {
    display: inline-flex;
    align-items: center;
    font-size: 10px;
    color: #4a7a8a;
    background: #0a1a25;
    border: 1px solid #0e2a3a;
    border-radius: 20px;
    padding: 2px 8px;
    letter-spacing: 0.02em;
  }

  .tiempo-tag {
    font-size: 10px;
    color: #2d5060;
    margin-left: auto;
  }

  .typing-bubble {
    background: #0e2030;
    border: 1px solid #152e42;
    border-radius: 18px 18px 18px 4px;
    padding: 14px 18px;
  }

  .dots { display: inline-flex; gap: 4px; align-items: center; }

  .dots span {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: #0A8484;
    display: block;
    animation: blink 1.2s infinite;
  }

  .dots span:nth-child(2) { animation-delay: 0.2s; }
  .dots span:nth-child(3) { animation-delay: 0.4s; }

  @keyframes blink {
    0%, 100% { opacity: 0.2; transform: scale(0.8); }
    50% { opacity: 1; transform: scale(1); }
  }

  .input-row {
    display: flex;
    align-items: flex-end;
    gap: 10px;
    padding: 16px 20px 20px;
    border-top: 1px solid #0e2030;
    position: relative;
    z-index: 1;
    background: #080f13;
  }

  .textarea {
    flex: 1;
    background: #0e1e28;
    border: 1px solid #152e42;
    border-radius: 14px;
    padding: 12px 16px;
    color: #dce8f0;
    font-size: 14px;
    font-family: 'DM Sans', sans-serif;
    resize: none;
    line-height: 1.5;
    transition: border-color 0.2s;
  }

  .textarea:focus { outline: none; border-color: #0A8484; }
  .textarea::placeholder { color: #2d4a58; }

  .send-btn {
    width: 42px; height: 42px;
    border-radius: 50%;
    background: #0A8484;
    border: none;
    color: #fff;
    font-size: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
    transition: all 0.2s;
    box-shadow: 0 2px 10px rgba(10,132,132,0.4);
  }

  .send-btn:hover:not(:disabled) { background: #0d9e9e; transform: scale(1.05); }
  .send-btn:disabled { opacity: 0.35; cursor: not-allowed; box-shadow: none; }
`;

const toolLabels = {
  calcular_imc: "IMC",
  calcular_calorias: "Calorías",
  calcular_macros: "Macros",
  rutina_ejercicio: "Rutina",
  consultar_base_de_conocimiento: "Base de conocimiento",
  consultar_ibero_fitness: "IBERO Fitness",
  tavily_search_results_json: "Web",
};

// LOGIN
function LoginScreen({ onLogin, onGoRegister }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!username || !password) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail || "Error al iniciar sesión"); return; }
      onLogin(data.username, data.nombre);
    } catch {
      setError("Error al conectar con el servidor");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="screen">
      <div className="card">
        <div className="card-logo">
          <img src="/src/assets/logo.png" alt="FitBot" />
          <span className="card-subtitle">Tu asistente de fitness</span>
        </div>
        <p className="form-title">Iniciar sesión</p>
        <div className="field">
          <label>Username</label>
          <input value={username} onChange={e => setUsername(e.target.value)} placeholder="tu_usuario" onKeyDown={e => e.key === "Enter" && handleLogin()} />
        </div>
        <div className="field">
          <label>Contraseña</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" onKeyDown={e => e.key === "Enter" && handleLogin()} />
        </div>
        {error && <p className="error-msg">{error}</p>}
        <button className="btn-primary" onClick={handleLogin} disabled={loading || !username || !password}>
          {loading ? "Entrando..." : "Entrar"}
        </button>
        <p className="link-text">¿No tienes cuenta? <button onClick={onGoRegister}>Regístrate</button></p>
      </div>
    </div>
  );
}

// REGISTRO
function RegisterScreen({ onRegister, onGoLogin }) {
  const [form, setForm] = useState({
    username: "", password: "", nombre: "", edad: "",
    sexo: "hombre", peso_kg: "", altura_m: "",
    nivel_actividad: "moderado", objetivo: "mantener",
    condiciones_medicas: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function handleRegister() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/registro`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail || "Error al registrarse"); return; }
      onRegister(form.username, form.nombre);
    } catch {
      setError("Error al conectar con el servidor");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="screen" style={{ justifyContent: "flex-start", paddingTop: "40px" }}>
      <div className="card" style={{ maxWidth: "520px" }}>
        <div className="card-logo">
          <img src="/src/assets/logo.png" alt="FitBot" />
          <span className="card-subtitle">Crea tu perfil</span>
        </div>
        <p className="form-title">Registro</p>

        <div className="form-grid">
          <div className="field">
            <label>Username</label>
            <input value={form.username} onChange={e => set("username", e.target.value)} placeholder="tu_usuario" />
          </div>
          <div className="field">
            <label>Contraseña</label>
            <input type="password" value={form.password} onChange={e => set("password", e.target.value)} placeholder="••••••••" />
          </div>
          <div className="field form-grid-full">
            <label>Nombre completo</label>
            <input value={form.nombre} onChange={e => set("nombre", e.target.value)} placeholder="Tu nombre" />
          </div>
          <div className="field">
            <label>Edad</label>
            <input value={form.edad} onChange={e => set("edad", e.target.value)} placeholder="25" />
          </div>
          <div className="field">
            <label>Sexo</label>
            <select value={form.sexo} onChange={e => set("sexo", e.target.value)}>
              <option value="hombre">Hombre</option>
              <option value="mujer">Mujer</option>
            </select>
          </div>
          <div className="field">
            <label>Peso (kg)</label>
            <input value={form.peso_kg} onChange={e => set("peso_kg", e.target.value)} placeholder="70" />
          </div>
          <div className="field">
            <label>Altura (m)</label>
            <input value={form.altura_m} onChange={e => set("altura_m", e.target.value)} placeholder="1.70" />
          </div>
          <div className="field form-grid-full">
            <label>Nivel de actividad</label>
            <select value={form.nivel_actividad} onChange={e => set("nivel_actividad", e.target.value)}>
              <option value="sedentario">Sedentario</option>
              <option value="ligero">Ligero</option>
              <option value="moderado">Moderado</option>
              <option value="activo">Activo</option>
              <option value="muy activo">Muy activo</option>
            </select>
          </div>
          <div className="field form-grid-full">
            <label>Objetivo principal</label>
            <select value={form.objetivo} onChange={e => set("objetivo", e.target.value)}>
              <option value="bajar peso">Bajar peso</option>
              <option value="mantener">Mantener peso</option>
              <option value="ganar músculo">Ganar músculo</option>
              <option value="resistencia">Mejorar resistencia</option>
            </select>
          </div>
          <div className="field form-grid-full">
            <label>Condiciones médicas <span className="optional-label">(opcional)</span></label>
            <textarea
              value={form.condiciones_medicas}
              onChange={e => set("condiciones_medicas", e.target.value)}
              placeholder="Ej: diabetes tipo 2, lesión de rodilla, cirugía de hombro..."
              rows={2}
            />
          </div>
        </div>

        {error && <p className="error-msg">{error}</p>}
        <button className="btn-primary" onClick={handleRegister} disabled={loading}>
          {loading ? "Creando perfil..." : "Crear perfil"}
        </button>
        <p className="link-text">¿Ya tienes cuenta? <button onClick={onGoLogin}>Inicia sesión</button></p>
      </div>
    </div>
  );
}

// CHAT
function ChatScreen({ username, nombre, onLogout }) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: `¡Hola, ${nombre}! Soy FitBot, tu asistente personal de fitness. Ya tengo tu perfil cargado, así que puedo ayudarte sin que tengas que repetirme tus datos. ¿En qué te puedo ayudar hoy?`,
      tools: [],
      tiempo: null,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    setMessages(prev => [...prev, { role: "user", content: text, tools: [], tiempo: null }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${API}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, mensaje: text }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, {
        role: "assistant",
        content: data.respuesta,
        tools: data.tools_usadas || [],
        tiempo: data.tiempo_segundos || null,
      }]);
    } catch {
      setMessages(prev => [...prev, {
        role: "assistant", content: "Error al conectar con el servidor.", tools: [], tiempo: null
      }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  return (
    <div className="chat-root">
      <div className="chat-header">
        <div className="user-badge">👤 {nombre}</div>
        <div className="chat-header-center">
          <img src="/src/assets/logo.png" alt="FitBot" />
          <div className="header-status">
            <div className="status-dot" />
            en línea
          </div>
        </div>
        <button className="logout-btn" onClick={onLogout}>Salir</button>
      </div>

      <div className="messages">
        {messages.map((msg, i) => (
          <div key={i} className="message-group">
            <div className="message-row" style={{ justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
              <div className={`bubble ${msg.role === "user" ? "bubble-user" : "bubble-bot"}`}>
                {msg.content}
              </div>
            </div>
            {msg.role === "assistant" && (msg.tools?.length > 0 || msg.tiempo) && (
              <div className="debug-bar">
                {msg.tools?.map((t, j) => (
                  <span key={j} className="tool-tag">{toolLabels[t] || t}</span>
                ))}
                {msg.tiempo && <span className="tiempo-tag">⏱ {msg.tiempo}s</span>}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="message-row" style={{ justifyContent: "flex-start" }}>
            <div className="typing-bubble">
              <div className="dots"><span /><span /><span /></div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="input-row">
        <textarea
          className="textarea"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe tu mensaje..."
          rows={1}
        />
        <button className="send-btn" onClick={sendMessage} disabled={loading || !input.trim()}>↑</button>
      </div>
    </div>
  );
}

// APP
export default function App() {
  const [pantalla, setPantalla] = useState("login");
  const [usuario, setUsuario] = useState(null);

  function handleLogin(username, nombre) {
    setUsuario({ username, nombre });
    setPantalla("chat");
  }

  function handleLogout() {
    setUsuario(null);
    setPantalla("login");
  }

  return (
    <>
      <style>{GLOBAL_STYLES}</style>
      {pantalla === "login" && (
        <LoginScreen onLogin={handleLogin} onGoRegister={() => setPantalla("registro")} />
      )}
      {pantalla === "registro" && (
        <RegisterScreen onRegister={handleLogin} onGoLogin={() => setPantalla("login")} />
      )}
      {pantalla === "chat" && usuario && (
        <ChatScreen username={usuario.username} nombre={usuario.nombre} onLogout={handleLogout} />
      )}
    </>
  );
}