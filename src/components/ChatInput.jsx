import { useState, useRef, useEffect } from "react";

export default function ChatInput({ onSend, onStop, isStreaming }) {
  const [text, setText] = useState("");
  const textareaRef = useRef(null);
  const containerRef = useRef(null);

  /* =========================
     AUTO RESIZE
  ========================= */
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [text]);

  /* =========================
     FOCUS GLOW
  ========================= */
  useEffect(() => {
    const textarea = textareaRef.current;
    const container = containerRef.current;
    if (!textarea || !container) return;

    const handleFocus = () => {
      container.style.boxShadow =
        "0 0 0 1px rgba(255,98,0,0.6), 0 0 25px rgba(255,98,0,0.15)";
    };

    const handleBlur = () => {
      container.style.boxShadow =
        "0 10px 40px rgba(0,0,0,0.6)";
    };

    textarea.addEventListener("focus", handleFocus);
    textarea.addEventListener("blur", handleBlur);

    return () => {
      textarea.removeEventListener("focus", handleFocus);
      textarea.removeEventListener("blur", handleBlur);
    };
  }, []);

  function handleKeyDown(e) {
    if (
      e.key === "Enter" &&
      !e.shiftKey &&
      !e.nativeEvent.isComposing
    ) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleSend() {
    if (!text.trim() || isStreaming) return;
    onSend(text);
    setText("");

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  return (
    <>
      <style>{`
        @keyframes pulse {
          0% { opacity: 0.6; }
          50% { opacity: 1; }
          100% { opacity: 0.6; }
        }
      `}</style>

      <div ref={containerRef} style={styles.container}>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          style={styles.input}
          placeholder="Ask Vynel anything…"
          rows={1}
        />

        {!isStreaming ? (
          <button
            onClick={handleSend}
            style={styles.button}
            onMouseEnter={(e) =>
              (e.currentTarget.style.transform = "translateY(-2px)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.transform = "translateY(0)")
            }
          >
            Send
          </button>
        ) : (
          <button
            onClick={onStop}
            style={styles.stopButton}
            onMouseEnter={(e) =>
              (e.currentTarget.style.transform = "translateY(-2px)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.transform = "translateY(0)")
            }
          >
            Stop
          </button>
        )}
      </div>
    </>
  );
}

/* =========================
   STYLES (Aligned to ChatApp)
========================= */

const styles = {
  container: {
    display: "flex",
    alignItems: "flex-end",
    width: "100%",
    maxWidth: "860px",
    padding: "14px 16px",
    borderRadius: "18px",
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(20,20,20,0.75)",
    backdropFilter: "blur(14px)",
    WebkitBackdropFilter: "blur(14px)",
    boxShadow: "0 10px 40px rgba(0,0,0,0.6)",
    transition: "all 0.25s ease"
  },

  input: {
    flex: 1,
    resize: "none",
    border: "none",
    outline: "none",
    background: "transparent",
    color: "#ffffff",
    fontSize: "16px",
    lineHeight: 1.6,
    caretColor: "#ff6200",
    maxHeight: "200px",
    overflowY: "auto",
    transition: "all 0.2s ease"
  },

  button: {
    marginLeft: "14px",
    border: "none",
    background: "linear-gradient(135deg, #ff6200, #ff8c42)",
    color: "#000000",
    padding: "10px 20px",
    borderRadius: "14px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s ease",
    boxShadow: "0 6px 18px rgba(255,98,0,0.35)"
  },

  stopButton: {
    marginLeft: "14px",
    border: "1px solid rgba(255,98,0,0.4)",
    background: "rgba(255,98,0,0.08)",
    color: "#ff6200",
    padding: "10px 20px",
    borderRadius: "14px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s ease",
    animation: "pulse 1.2s infinite"
  }
};
