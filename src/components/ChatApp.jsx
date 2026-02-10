import { useState, useRef, useEffect } from "react";
import ChatInput from "./ChatInput";
import Header from "./Header";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  initInference,
  streamChat,
  stopGeneration,
} from "../inference";

/* ========================= CONFIG ========================= */

const SYSTEM_PROMPT = {
  role: "system",
  content:
    "You are Vynel, a helpful, concise, and technically accurate assistant. Prefer clear explanations and well-formatted code.",
};

const MAX_CONTEXT_MESSAGES = 6;

/* ========================= MODEL REGISTRY ========================= */

const MODELS = [
  {
    id: "TinyLlama-1.1B-Chat-v0.4-q4f16_1-MLC-1k",
    label: "TinyLlama — Fast",
  },
  {
    id: "Llama-3-8B-Instruct-q4f16_1-MLC",
    label: "Llama 3 8B — Smart",
  },
  {
    id: "Mistral-7B-Instruct-v0.3-q4f16_1-MLC",
    label: "Mistral 7B — Deep",
  },
  {
    id: "gemma-2-2b-it-q4f16_1-MLC",
    label: "Gemma — Balanced",
  },
];

const STORAGE_KEY = "vynellm:selectedModel";

/* ========================= COLORS ========================= */

const COLORS = {
  black: "#000000",
  dark: "#0f0f0f",
  darkAlt: "#141414",
  border: "#1f1f1f",
  text: "#ffffff",
  muted: "#9ca3af",
  orange: "#ff6200",
};

/* ========================= HELPERS ========================= */

function normalizeContent(text) {
  return text
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export default function ChatApp() {
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);

  const [selectedModel, setSelectedModel] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || MODELS[0].id;
  });

  const bottomRef = useRef(null);
  const hasMessages = messages.length > 0;

  function buildContextMessages(userMessage) {
    const recent = messages.slice(-MAX_CONTEXT_MESSAGES);
    return [SYSTEM_PROMPT, ...recent, userMessage];
  }

  function clearChat() {
    stopGeneration();
    setMessages([]);
    setStatus(null);
    setIsStreaming(false);
  }

  function handleModelChange(e) {
    const modelId = e.target.value;
    stopGeneration();
    setMessages([]);
    setStatus(null);
    setIsStreaming(false);
    setSelectedModel(modelId);
    localStorage.setItem(STORAGE_KEY, modelId);
  }

  async function handleSend(text) {
    if (!text.trim() || isStreaming) return;

    const userMessage = { role: "user", content: text };

    setMessages((prev) => [
      ...prev,
      userMessage,
      { role: "assistant", content: "" },
    ]);

    setIsStreaming(true);
    setStatus("Loading model…");

    // --- Perf tracking ---
    const perfModelStart = performance.now();
    let perfGenerationStart = null;
    let perfTokenCount = 0;
    // ---------------------

    try {
      await initInference(
        (p) => {
          if (p.error) {
            setStatus(`Error: ${p.error}`);
          } else {
            setStatus(`Loading model… ${Math.round(p.progress * 100)}%`);
          }
        },
        selectedModel
      );

      const perfModelLoadMs = performance.now() - perfModelStart;
      console.log(`[Perf] Model ready — load time: ${perfModelLoadMs.toFixed(0)}ms`);

      setStatus("Generating…");
      perfGenerationStart = performance.now();

      await streamChat({
        messages: buildContextMessages(userMessage),
        onToken: (token) => {
          if (perfTokenCount === 0) {
            const perfFirstTokenTime = performance.now() - perfGenerationStart;
            console.log(`[Perf] Time to first token (TTFT): ${perfFirstTokenTime.toFixed(0)}ms`);
          }
          perfTokenCount++;

          setMessages((prev) => {
            const updated = [...prev];
            const lastMsg = updated[updated.length - 1];
            if (!lastMsg.content.endsWith(token)) {
              lastMsg.content += token;
            }
            return updated;
          });
        },
        onDone: () => {
          const perfTotalMs = performance.now() - perfGenerationStart;
          const perfTps = perfTokenCount / (perfTotalMs / 1000);
          console.log(
            `[Perf] Generation complete — ` +
              `tokens: ${perfTokenCount}, ` +
              `total time: ${perfTotalMs.toFixed(0)}ms, ` +
              `TPS: ${perfTps.toFixed(1)}`
          );
          setStatus(null);
          setIsStreaming(false);
        },
        onError: (err) => {
          console.error("Stream error:", err);
          setStatus(`Error: ${err.message || "Generation failed"}`);
          setIsStreaming(false);
          setMessages((prev) => {
            const updated = [...prev];
            if (updated[updated.length - 1]?.content === "") updated.pop();
            return updated;
          });
        },
      });
    } catch (err) {
      console.error("Initialization error:", err);
      setStatus(`Failed to load model: ${err.message}`);
      setIsStreaming(false);
      setMessages((prev) => {
        const updated = [...prev];
        if (updated[updated.length - 1]?.content === "") updated.pop();
        return updated;
      });
    }
  }

  function handleStop() {
    stopGeneration();
    setStatus(null);
    setIsStreaming(false);
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  return (
    <div style={styles.container}>
      <Header />

      <div style={styles.modelBar}>
        <select
          value={selectedModel}
          disabled={isStreaming}
          onChange={handleModelChange}
          style={styles.modelSelect}
        >
          {MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      {!hasMessages && (
        <div style={styles.emptyState}>
          <h2 style={styles.emptyTitle}>What's on your mind?</h2>
          {status && <div style={styles.status}>{status}</div>}
          <div style={styles.centerInputHero}>
            <ChatInput
              onSend={handleSend}
              onStop={handleStop}
              isStreaming={isStreaming}
            />
          </div>
        </div>
      )}

      {hasMessages && (
        <>
          <div style={styles.chatArea}>
            {messages.map((msg, i) => (
              <div key={i} style={styles.messageRow}>
                <div style={styles.messageBubble}>
                  {msg.role === "assistant" &&
                  isStreaming &&
                  i === messages.length - 1 ? (
                    <div style={styles.streamingText}>
                      {normalizeContent(msg.content)}
                    </div>
                  ) : (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        // FIX: the root cause. inline code was rendering as a
                        // block <code> element, putting each backtick word on
                        // its own line. Use a <span> with display:inline so it
                        // stays in the flow of the surrounding paragraph text.
                        code({ node, inline, className, children, ...props }) {
                          const isBlock = !inline && className;

                          if (!isBlock) {
                            // Inline code — stays in the sentence
                            return (
                              <span style={styles.inlineCode}>
                                {children}
                              </span>
                            );
                          }

                          // Fenced code block with a language tag
                          return (
                            <pre style={styles.codeBlock}>
                              <code>{children}</code>
                            </pre>
                          );
                        },
                        p({ children }) {
                          return (
                            <p style={{ margin: "0 0 8px 0" }}>{children}</p>
                          );
                        },
                        ul({ children }) {
                          return (
                            <ul
                              style={{
                                margin: "0 0 8px 0",
                                paddingLeft: "20px",
                              }}
                            >
                              {children}
                            </ul>
                          );
                        },
                        ol({ children }) {
                          return (
                            <ol
                              style={{
                                margin: "0 0 8px 0",
                                paddingLeft: "20px",
                              }}
                            >
                              {children}
                            </ol>
                          );
                        },
                        li({ children }) {
                          return (
                            <li style={{ marginBottom: "4px" }}>{children}</li>
                          );
                        },
                        h1({ children }) {
                          return (
                            <h1 style={{ margin: "0 0 8px 0", fontSize: "24px" }}>
                              {children}
                            </h1>
                          );
                        },
                        h2({ children }) {
                          return (
                            <h2 style={{ margin: "0 0 8px 0", fontSize: "20px" }}>
                              {children}
                            </h2>
                          );
                        },
                        h3({ children }) {
                          return (
                            <h3 style={{ margin: "0 0 8px 0", fontSize: "18px" }}>
                              {children}
                            </h3>
                          );
                        },
                      }}
                    >
                      {normalizeContent(msg.content)}
                    </ReactMarkdown>
                  )}
                </div>
              </div>
            ))}

            {status && <div style={styles.statusInline}>{status}</div>}

            <div ref={bottomRef} />
          </div>

          <div style={styles.footer}>
            <div style={styles.footerBar}>
              <button onClick={clearChat} style={styles.clearButton}>
                Clear chat
              </button>
            </div>

            <div style={styles.centerInput}>
              <ChatInput
                onSend={handleSend}
                onStop={handleStop}
                isStreaming={isStreaming}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ========================= STYLES ========================= */

const styles = {
  container: {
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    background: COLORS.black,
    color: COLORS.text,
  },
  modelBar: {
    display: "flex",
    justifyContent: "flex-end",
    padding: "10px 16px",
  },
  modelSelect: {
    background: COLORS.darkAlt,
    color: COLORS.muted,
    border: `1px solid ${COLORS.border}`,
    padding: "8px 14px",
    borderRadius: "6px",
  },
  emptyState: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    gap: "20px",
  },
  emptyTitle: {
    fontSize: "28px",
    fontWeight: 300,
    color: COLORS.orange,
    fontStyle: "italic",
  },
  status: {
    fontSize: "14px",
    color: COLORS.muted,
  },
  statusInline: {
    fontSize: "14px",
    color: COLORS.muted,
    marginTop: "8px",
  },
  chatArea: {
    flex: 1,
    overflowY: "auto",
    padding: "24px 16px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  messageRow: {
    width: "100%",
    maxWidth: "860px",
    marginBottom: "16px",
  },
  messageBubble: {
    background: COLORS.darkAlt,
    borderRadius: "12px",
    padding: "14px 16px",
    border: `1px solid ${COLORS.border}`,
    fontSize: "16px",
    lineHeight: 1.7,
  },
  streamingText: {
    margin: 0,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  // FIX: display inline so inline code stays inside the sentence
  inlineCode: {
    display: "inline",
    background: "#1a1a1a",
    padding: "1px 5px",
    borderRadius: "4px",
    fontFamily: "monospace",
    fontSize: "0.9em",
  },
  codeBlock: {
    background: "#020617",
    padding: "14px",
    borderRadius: "10px",
    margin: "10px 0",
    border: `1px solid ${COLORS.border}`,
    fontFamily: "monospace",
    overflowX: "auto",
    whiteSpace: "pre",
  },
  footer: {
    borderTop: `1px solid ${COLORS.border}`,
  },
  footerBar: {
    maxWidth: "860px",
    margin: "0 auto",
    padding: "0 24px",
    display: "flex",
    justifyContent: "flex-end",
  },
  clearButton: {
    background: "none",
    border: "none",
    color: COLORS.orange,
    cursor: "pointer",
  },
  centerInput: {
    display: "flex",
    justifyContent: "center",
    padding: "8px 24px",
    fontWeight: 300,
  },
  centerInputHero: {
    width: "100%",
    maxWidth: "720px",
    padding: "8px 24px",
    fontWeight: 300,
  },
};