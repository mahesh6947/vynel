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
  content: `
You are a helpful, concise, and technically accurate AI assistant.

GENERAL BEHAVIOR:
- Provide clear, well-structured responses.
- Avoid unnecessary repetition.
- Do not add filler text.
- Do not insert excessive blank lines.
- Keep formatting clean and readable.

IDENTITY RULES:
- Only refer to yourself as "Vynel" if the user explicitly asks about your name or identity.
- Do not insert the name "Vynel" into fictional stories or examples unless explicitly requested.

CODE RULES:
- Only provide code when the user explicitly requests code or when code is clearly required.
- When providing code, always use proper triple backtick fenced blocks with a language label.
- Do not wrap normal text inside code blocks.
- Do not provide unnecessary code versions of plain text responses.

LENGTH CONTROL:
- When a specific word count is requested, strictly adhere to it.
- Stay within ±5% of the requested word count.
- Do not significantly exceed the requested length.
- Do not artificially pad content to reach the limit.
- End naturally and cleanly within the target range.

CREATIVE WRITING:
- Use neutral character names unless otherwise specified.
- Maintain narrative coherence.
- Ensure a satisfying and complete ending when requested.
- Avoid repeating character names excessively.

Your goal is to produce high-quality, precise, and well-formatted responses.
`
};


const MAX_CONTEXT_MESSAGES = 6;

/* ========================= MODELS ========================= */

const MODELS = [
  { id: "TinyLlama-1.1B-Chat-v0.4-q4f16_1-MLC-1k", label: "TinyLlama — Fast" },
  { id: "Llama-3-8B-Instruct-q4f16_1-MLC", label: "Llama 3 8B — Smart" },
  { id: "Mistral-7B-Instruct-v0.3-q4f16_1-MLC", label: "Mistral 7B — Deep" },
  { id: "gemma-2-2b-it-q4f16_1-MLC", label: "Gemma — Balanced" },
];

const STORAGE_KEY = "vynellm:selectedModel";

/* ========================= COLORS ========================= */

const COLORS = {
  black: "#0b0b0f",
  glass: "rgba(20,20,20,0.75)",
  border: "rgba(255,255,255,0.08)",
  text: "#ffffff",
  muted: "#9ca3af",
  orange: "#ff6200",
};

/* ========================= HELPERS ========================= */

function normalizeContent(text) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\n\s+\n/g, "\n\n")
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

  /* =========================
     PERFORMANCE TRACKING
  ========================= */
  const perfModelStart = performance.now();
  let perfGenerationStart = null;
  let perfFirstTokenLogged = false;
  let perfTokenCount = 0;
  /* ========================= */

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
    console.log(
      `[Perf] Model ready — load time: ${perfModelLoadMs.toFixed(0)}ms`
    );

    setStatus("Generating…");
    perfGenerationStart = performance.now();

    await streamChat({
      messages: buildContextMessages(userMessage),

      onToken: (token) => {
        if (!perfFirstTokenLogged) {
          const ttft = performance.now() - perfGenerationStart;
          console.log(
            `[Perf] Time to first token (TTFT): ${ttft.toFixed(0)}ms`
          );
          perfFirstTokenLogged = true;
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
        const perfTotalMs =
          performance.now() - perfGenerationStart;

        const perfTps =
          perfTokenCount / (perfTotalMs / 1000);

        console.log(
          `[Perf] Generation complete — tokens: ${perfTokenCount}, total time: ${perfTotalMs.toFixed(
            0
          )}ms, TPS: ${perfTps.toFixed(1)}`
        );

        setStatus(null);
        setIsStreaming(false);
      },

      onError: (err) => {
        console.error("Stream error:", err);
        setStatus(
          `Error: ${err.message || "Generation failed"}`
        );
        setIsStreaming(false);
      },
    });
  } catch (err) {
    console.error("Initialization error:", err);
    setStatus(`Failed to load model: ${err.message}`);
    setIsStreaming(false);
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
    <>
      <style>{`
        html { scroll-behavior: smooth; }

        @keyframes fadeSlide {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Modern Scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.15);
          border-radius: 8px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(255,98,0,0.6);
        }
      `}</style>

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
            <h2 style={styles.emptyTitle}>Ask Vynel anything</h2>
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
                <div
                  key={i}
                  style={{
                    ...styles.messageRow,
                    animation: "fadeSlide 0.2s ease",
                  }}
                >
                  <div
                    style={{
                      ...styles.messageBubble,
                      ...(msg.role === "assistant"
                        ? styles.assistantBubble
                        : styles.userBubble),
                    }}
                  >
                    <ReactMarkdown
  remarkPlugins={[remarkGfm]}
  components={{
    code({ inline, className, children, ...props }) {
      const isBlock = !inline && className;

      if (!isBlock) {
        return (
          <code style={styles.inlineCode}>
            {children}
          </code>
        );
      }

      return (
        <pre style={styles.codeBlock}>
          <code>{children}</code>
        </pre>
      );
    },

    p({ children }) {
      return (
        <p style={{ margin: "0 0 6px 0" }}>
          {children}
        </p>
      );
    }
  }}
>
  {normalizeContent(msg.content)}
</ReactMarkdown>

                  </div>
                </div>
              ))}

              {status && <div style={styles.statusInline}>{status}</div>}
              <div ref={bottomRef} />
            </div>

            <div style={styles.footer}>
              <div style={styles.footerBar}>
                <button
                  onClick={clearChat}
                  style={styles.clearButton}
                >
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
    </>
  );
}

/* ========================= STYLES ========================= */

const styles = {
  container: {
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    background: `
      radial-gradient(circle at 30% 20%, rgba(255,98,0,0.05), transparent 40%),
      #0b0b0f
    `,
    color: COLORS.text,
  },

  modelBar: {
    display: "flex",
    justifyContent: "flex-end",
    padding: "14px 20px",
  },

  modelSelect: {
    background: COLORS.glass,
    color: COLORS.muted,
    border: `1px solid ${COLORS.border}`,
    padding: "10px 16px",
    borderRadius: "12px",
    backdropFilter: "blur(10px)",
  },

  emptyState: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    gap: "24px",
  },

  emptyTitle: {
    fontSize: "30px",
    fontWeight: 300,
    color: COLORS.orange,
  },

  status: {
    fontSize: "14px",
    color: COLORS.muted,
  },

  statusInline: {
    fontSize: "14px",
    color: COLORS.muted,
    marginTop: "12px",
  },

  chatArea: {
    flex: 1,
    overflowY: "auto",
    padding: "32px 16px",
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
    padding: "16px 18px",
    borderRadius: "16px",
    fontSize: "16px",
    lineHeight: 1.6,
  },

  assistantBubble: {
    background: "rgba(255,98,0,0.06)",
    border: "1px solid rgba(255,98,0,0.2)",
    boxShadow: "0 0 20px rgba(255,98,0,0.08)",
  },

  userBubble: {
    background: "rgba(255,255,255,0.04)",
    border: `1px solid ${COLORS.border}`,
  },

  inlineCode: {
    background: "rgba(255,255,255,0.08)",
    padding: "2px 6px",
    borderRadius: "6px",
    fontFamily: "monospace",
    fontSize: "0.9em",
  },

  codeBlock: {
    background: "#020617",
    padding: "14px 16px",
    borderRadius: "12px",
    margin: "10px 0",
    border: `1px solid ${COLORS.border}`,
    fontFamily: "monospace",
    fontSize: "14px",
    overflowX: "auto",
    whiteSpace: "pre-wrap",
    lineHeight: 1.6,
  },

  footer: {
    borderTop: `1px solid ${COLORS.border}`,
    backdropFilter: "blur(10px)",
    background: "rgba(10,10,10,0.6)",
  },

  footerBar: {
    maxWidth: "860px",
    margin: "0 auto",
    padding: "10px 24px",
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
    padding: "12px 24px",
  },

  centerInputHero: {
    width: "100%",
    maxWidth: "720px",
    padding: "12px 24px",
  },
};
