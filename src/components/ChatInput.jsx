import { useState, useRef, useEffect } from "react";

export default function ChatInput({ onSend, onStop, isStreaming }) {
  const [text, setText] = useState("");
  const textareaRef = useRef(null);

  // Auto-resize textarea as user types
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [text]);

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
    
    // Reset height after sending
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  return (
    <div style={styles.container}>
      <textarea
        ref={textareaRef}
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        style={styles.input}
        placeholder="Type your message…"
        rows={1}
      />

      {!isStreaming ? (
        <button onClick={handleSend} style={styles.button}>
          Send
        </button>
      ) : (
        <button onClick={onStop} style={styles.stopButton}>
          Stop
        </button>
      )}
    </div>
  );
}

/* =========================
   STYLES
   ========================= */

const styles = {
  container: {
    display: "flex",
    alignItems: "flex-end",
    width: "100%",
    maxWidth: "860px",
    padding: "12px 14px",
    border: "1px solid #1f1f1f",
    borderRadius: "14px",
    background: "#0f0f0f"
  },

  input: {
    flex: 1,
    resize: "none",
    border: "none",
    outline: "none",
    background: "transparent",
    color: "#ffffff",
    fontSize: "16px",
    lineHeight: 1.5,
    caretColor: "#ff6200",
    maxHeight: "200px",
    overflowY: "auto"
  },

  button: {
    marginLeft: "12px",
    border: "none",
    background: "#ff6200",
    color: "#000000",
    padding: "8px 16px",
    borderRadius: "10px",
    fontWeight: 500,
    cursor: "pointer"
  },

  stopButton: {
    marginLeft: "12px",
    border: "1px solid #ff6200",
    background: "transparent",
    color: "#ff6200",
    padding: "8px 16px",
    borderRadius: "10px",
    fontWeight: 600,
    cursor: "pointer"
  }
};