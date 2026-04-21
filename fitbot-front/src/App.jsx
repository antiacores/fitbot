import { useState, useRef, useEffect } from "react";

export default function App() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hola, soy FitBot. Tu asistente de fitness. ¿En qué te puedo ayudar hoy?",
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

    setMessages((prev) => [...prev, { role: "user", content: text, tools: [], tiempo: null }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${API}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, mensaje: text }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.respuesta,
          tools: data.tools_usadas || [],
          tiempo: data.tiempo_segundos || null,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Error al conectar con el servidor.", tools: [], tiempo: null },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  const toolLabels = {
    calcular_imc: "Tool: Calcular IMC",
    calcular_calorias: "Tool: Calcular calorías",
    calcular_macros: "Tool: Calcular macronutrientes",
    rutina_ejercicio: "Tool: Generar rutina",
    consultar_base_de_conocimiento: "Tool: Consultar base de conocimiento",
    consultar_ibero_fitness: "Tool: Consultar IBERO Fitness",
    tavily_search_results_json: "Tool: Buscar en la web",
  };

  return (
    <div className="root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700&family=DM+Sans:wght@300;400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          background: #080f13;
          font-family: 'DM Sans', sans-serif;
        }

        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1e3040; border-radius: 2px; }

        .root {
          display: flex;
          flex-direction: column;
          height: 100vh;
          max-width: 760px;
          margin: 0 auto;
          background: #080f13;
          color: #dce8f0;
          position: relative;
        }

        /* subtle grid texture */
        .root::before {
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

        .header {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 24px 24px 18px;
          border-bottom: 1px solid #0e2030;
          position: relative;
          z-index: 1;
          gap: 6px;
        }

        .header img {
          height: 48px;
          object-fit: contain;
        }

        .header-status {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: #4a7a8a;
          font-family: 'DM Sans', sans-serif;
          letter-spacing: 0.05em;
        }

        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #0A8484;
          box-shadow: 0 0 6px #0A8484;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }

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

        .message-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

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
          gap: 8px;
          padding: 0 4px;
          flex-wrap: wrap;
        }

        .tool-tag {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 10px;
          color: #4a7a8a;
          background: #0a1a25;
          border: 1px solid #0e2a3a;
          border-radius: 20px;
          padding: 2px 8px;
          font-family: 'DM Sans', sans-serif;
          letter-spacing: 0.02em;
        }

        .tiempo-tag {
          font-size: 10px;
          color: #2d5060;
          margin-left: auto;
          font-family: 'DM Sans', sans-serif;
        }

        .typing-bubble {
          background: #0e2030;
          border: 1px solid #152e42;
          border-radius: 18px 18px 18px 4px;
          padding: 14px 18px;
        }

        .dots {
          display: inline-flex;
          gap: 4px;
          align-items: center;
        }

        .dots span {
          width: 6px;
          height: 6px;
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

        .textarea:focus {
          outline: none;
          border-color: #0A8484;
        }

        .textarea::placeholder { color: #2d4a58; }

        .send-btn {
          width: 42px;
          height: 42px;
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

        .send-btn:hover:not(:disabled) {
          background: #0d9e9e;
          transform: scale(1.05);
        }

        .send-btn:disabled {
          opacity: 0.35;
          cursor: not-allowed;
          box-shadow: none;
        }
      `}</style>

      {/* Header */}
      <div className="header">
        <img src="/src/assets/logo.png" alt="FitBot" />
        <div className="header-status">
          <div className="status-dot" />
          en línea
        </div>
      </div>

      {/* Messages */}
      <div className="messages">
        {messages.map((msg, i) => (
          <div key={i} className="message-group">
            <div className="message-row" style={{ justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
              <div className={`bubble ${msg.role === "user" ? "bubble-user" : "bubble-bot"}`}>
                {msg.content}
              </div>
            </div>

            {/* Debug bar — solo mensajes del bot con tools */}
            {msg.role === "assistant" && (msg.tools?.length > 0 || msg.tiempo) && (
              <div className="debug-bar" style={{ justifyContent: "flex-start", paddingLeft: "4px" }}>
                {msg.tools?.map((t, j) => (
                  <span key={j} className="tool-tag">
                    {toolLabels[t] || t}
                  </span>
                ))}
                {msg.tiempo && (
                  <span className="tiempo-tag">⏱ {msg.tiempo}s</span>
                )}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="message-row" style={{ justifyContent: "flex-start" }}>
            <div className="typing-bubble">
              <div className="dots">
                <span /><span /><span />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="input-row">
        <textarea
          className="textarea"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe tu mensaje..."
          rows={1}
        />
        <button
          className="send-btn"
          onClick={sendMessage}
          disabled={loading || !input.trim()}
        >
          ↑
        </button>
      </div>
    </div>
  );
}