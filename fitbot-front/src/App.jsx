import { useState, useRef, useEffect } from "react";

const TEAL = "#0A8484";
const SLATE = "#314453";

export default function App() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hola, soy FitBot 💪 Tu asistente de fitness. ¿En qué te puedo ayudar hoy?",
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

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensaje: text }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.respuesta }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Error al conectar con el servidor." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div style={styles.root}>
      {/* Header */}
      <div style={styles.header}>
        <img src="/src/assets/logo.png" alt="FitBot" style={styles.logo} />
      </div>

      {/* Messages */}
      <div style={styles.messages}>
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              ...styles.messageRow,
              justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
            }}
          >
            <div
              style={{
                ...styles.bubble,
                backgroundColor: msg.role === "user" ? TEAL : SLATE,
                borderRadius:
                  msg.role === "user"
                    ? "18px 18px 4px 18px"
                    : "18px 18px 18px 4px",
              }}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ ...styles.messageRow, justifyContent: "flex-start" }}>
            <div style={{ ...styles.bubble, backgroundColor: SLATE }}>
              <span style={styles.dots}>
                <span>.</span><span>.</span><span>.</span>
              </span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={styles.inputRow}>
        <textarea
          style={styles.textarea}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe tu mensaje..."
          rows={1}
        />
        <button
          style={{
            ...styles.button,
            opacity: loading || !input.trim() ? 0.4 : 1,
            cursor: loading || !input.trim() ? "not-allowed" : "pointer",
          }}
          onClick={sendMessage}
          disabled={loading || !input.trim()}
        >
          ↑
        </button>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0d1b22; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #314453; border-radius: 2px; }
        @keyframes blink {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 1; }
        }
        span[style*="dots"] span:nth-child(1) { animation: blink 1s infinite 0s; }
        span[style*="dots"] span:nth-child(2) { animation: blink 1s infinite 0.2s; }
        span[style*="dots"] span:nth-child(3) { animation: blink 1s infinite 0.4s; }
        .dots span:nth-child(1) { animation: blink 1s infinite 0s; }
        .dots span:nth-child(2) { animation: blink 1s infinite 0.2s; }
        .dots span:nth-child(3) { animation: blink 1s infinite 0.4s; }
        textarea:focus { outline: none; }
      `}</style>
    </div>
  );
}

const styles = {
  root: {
    fontFamily: "'DM Sans', sans-serif",
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    maxWidth: "720px",
    margin: "0 auto",
    background: "#0d1b22",
    color: "#e8edf0",
  },
  header: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "28px 24px 20px",
    borderBottom: "1px solid #1e2f3a",
  },
  logo: {
    height: "52px",
    objectFit: "contain",
  },
  messages: {
    flex: 1,
    overflowY: "auto",
    padding: "24px 20px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  messageRow: {
    display: "flex",
    width: "100%",
  },
  bubble: {
    maxWidth: "72%",
    padding: "12px 16px",
    fontSize: "14px",
    lineHeight: "1.6",
    color: "#e8edf0",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  inputRow: {
    display: "flex",
    alignItems: "flex-end",
    gap: "10px",
    padding: "16px 20px",
    borderTop: "1px solid #1e2f3a",
  },
  textarea: {
    flex: 1,
    background: "#1a2b35",
    border: "1px solid #1e2f3a",
    borderRadius: "12px",
    padding: "12px 16px",
    color: "#e8edf0",
    fontSize: "14px",
    fontFamily: "'DM Sans', sans-serif",
    resize: "none",
    lineHeight: "1.5",
  },
  button: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    background: "#0A8484",
    border: "none",
    color: "#fff",
    fontSize: "18px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "opacity 0.2s",
    flexShrink: 0,
  },
  dots: {
    display: "inline-flex",
    gap: "3px",
    fontSize: "20px",
    lineHeight: 1,
  },
};