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

/**
 * SYSTEM_PROMPT — The AI's personality and behavior rules.
 * Sent with EVERY request to remind the model how to behave.
 * The AI is stateless — it forgets rules between calls — so
 * this must be included every single time.
 */
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

/**
 * MAX_CONTEXT_MESSAGES — How many past messages to send to the AI.
 * Keeping this low prevents hitting the model's context window
 * limit and avoids excessive browser memory usage.
 */
const MAX_CONTEXT_MESSAGES = 6;

/* ========================= MODELS ========================= */

/**
 * MODELS — List of available AI models the user can switch between.
 * Each model has:
 *   id    → the exact model string used by the WebLLM engine
 *   label → the human-readable name shown in the dropdown
 */
const MODELS = [
  { id: "TinyLlama-1.1B-Chat-v0.4-q4f16_1-MLC-1k", label: "TinyLlama — Fast" },
  { id: "Llama-3-8B-Instruct-q4f16_1-MLC", label: "Llama 3 8B — Smart" },
  { id: "Mistral-7B-Instruct-v0.3-q4f16_1-MLC", label: "Mistral 7B — Deep" },
  { id: "gemma-2-2b-it-q4f16_1-MLC", label: "Gemma — Balanced" },
];

/**
 * STORAGE_KEY — The localStorage key for saving the selected model.
 * Prefixed with "vynellm:" to avoid collisions with other apps.
 */
const STORAGE_KEY = "vynellm:selectedModel";

/* ========================= COLORS ========================= */

/**
 * COLORS — Central color palette for the entire UI.
 * Defined once here so changes propagate everywhere automatically.
 */
const COLORS = {
  black: "#0b0b0f",
  glass: "rgba(20,20,20,0.75)",
  border: "rgba(255,255,255,0.08)",
  text: "#ffffff",
  muted: "#9ca3af",
  orange: "#ff6200",
};

/* ========================= HELPERS ========================= */

/**
 * normalizeContent — Cleans up raw AI output before rendering.
 * Fixes inconsistent line endings and collapses excessive blank lines
 * so the chat bubbles look clean and consistent.
 *
 * @param {string} text - Raw text from the AI
 * @returns {string} - Cleaned text safe to render
 */
function normalizeContent(text) {
  return text
    .replace(/\r\n/g, "\n")       // Normalize Windows line endings to Unix
    .replace(/\n{3,}/g, "\n\n")   // Collapse 3+ blank lines down to 2
    .replace(/\n\s+\n/g, "\n\n")  // Remove lines that contain only whitespace
    .trim();                       // Strip leading/trailing whitespace
}

/**
 * ChatApp — The root component of the entire application.
 * Owns all state, handles all logic, and renders the full UI.
 * Child components (Header, ChatInput) receive callbacks as props.
 */
export default function ChatApp() {

  // messages — Array of all chat messages: { role: "user"|"assistant", content: string }
  const [messages, setMessages] = useState([]);

  // status — Loading/error text shown to the user e.g. "Loading model… 45%"
  const [status, setStatus] = useState(null);

  // isStreaming — True while the AI is generating. Disables input and model switcher.
  const [isStreaming, setIsStreaming] = useState(false);

  // selectedModel — The currently active model ID.
  // Initializes from localStorage so the user's last choice persists on refresh.
  const [selectedModel, setSelectedModel] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || MODELS[0].id;
  });

  // bottomRef — Points to an invisible div at the bottom of the chat list.
  // Used by useEffect to auto-scroll down on new messages.
  const bottomRef = useRef(null);

  // Convenience flag — true once at least one message exists
  const hasMessages = messages.length > 0;

  /**
   * buildContextMessages — Assembles the full message array to send to the AI.
   * Combines: system prompt + last 6 messages + the new user message.
   * The AI is stateless, so the entire conversation context must be
   * resent with every request.
   *
   * @param {Object} userMessage - The new { role: "user", content } message
   * @returns {Array} - Full message array ready for the inference engine
   */
  function buildContextMessages(userMessage) {
    const recent = messages.slice(-MAX_CONTEXT_MESSAGES); // Keep only last 6
    return [SYSTEM_PROMPT, ...recent, userMessage];
  }

  /**
   * clearChat — Resets the entire chat to its initial empty state.
   * Also stops any active generation to prevent orphaned streaming callbacks.
   */
  function clearChat() {
    stopGeneration();     // Abort any in-progress AI generation
    setMessages([]);      // Wipe all messages from the UI
    setStatus(null);      // Clear any status text
    setIsStreaming(false); // Re-enable input
  }

  /**
   * handleModelChange — Fires when the user picks a different model.
   * Clears the chat because conversation history from one model
   * is not compatible with another model's context.
   * Saves the new selection to localStorage for persistence.
   *
   * @param {Event} e - The select element's onChange event
   */
  function handleModelChange(e) {
    const modelId = e.target.value;
    stopGeneration();           // Stop any active generation
    setMessages([]);            // Clear chat (model switch = fresh start)
    setStatus(null);
    setIsStreaming(false);
    setSelectedModel(modelId);
    localStorage.setItem(STORAGE_KEY, modelId); // Persist selection
  }

  /**
   * handleSend — The core function. Fires when the user submits a message.
   * Flow:
   *   1. Add user message + empty assistant bubble to UI immediately
   *   2. Load/initialize the AI model (with progress updates)
   *   3. Stream the AI response token by token into the assistant bubble
   *   4. Track performance metrics (load time, TTFT, TPS)
   *
   * @param {string} text - The user's message text
   */
  async function handleSend(text) {
    // Guard: ignore empty input or if AI is already responding
    if (!text.trim() || isStreaming) return;

    const userMessage = { role: "user", content: text };

    // Add both the user message AND an empty assistant bubble immediately.
    // The empty bubble is required so onToken has a target to append tokens to.
    // It also gives the user instant visual feedback before the model loads.
    setMessages((prev) => [
      ...prev,
      userMessage,
      { role: "assistant", content: "" }, // Placeholder — filled in by onToken
    ]);

    setIsStreaming(true);
    setStatus("Loading model…");

    /* ─── Performance Tracking Variables ───────────────────────────────
     * These measure how long each phase takes and are logged to console.
     * perfModelStart    → timestamp when we started loading the model
     * perfGenerationStart → timestamp when generation began
     * perfFirstTokenLogged → ensures TTFT is only logged once
     * perfTokenCount    → total tokens received (used to calculate TPS)
     * ─────────────────────────────────────────────────────────────────*/
    const perfModelStart = performance.now();
    let perfGenerationStart = null;
    let perfFirstTokenLogged = false;
    let perfTokenCount = 0;

    try {
      // ── Step 1: Initialize the inference engine ──────────────────────
      // Loads the selected model into WebGPU memory.
      // The progress callback fires repeatedly during download/compilation,
      // updating the status text shown to the user e.g. "Loading model… 62%"
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

      // Log total model load time to browser console
      const perfModelLoadMs = performance.now() - perfModelStart;
      console.log(`[Perf] Model ready — load time: ${perfModelLoadMs.toFixed(0)}ms`);

      setStatus("Generating…");
      perfGenerationStart = performance.now();

      // ── Step 2: Stream the AI response ───────────────────────────────
      // streamChat sends the conversation to the engine and fires callbacks
      // for each token, completion, and error.
      await streamChat({
        messages: buildContextMessages(userMessage),

        /**
         * onToken — Fires for every token (word fragment) the AI generates.
         * Appends each token to the last message (the assistant bubble).
         * This creates the live "typewriter" streaming effect in the UI.
         */
        onToken: (token) => {
          // Log Time To First Token once — measures how fast generation started
          if (!perfFirstTokenLogged) {
            const ttft = performance.now() - perfGenerationStart;
            console.log(`[Perf] Time to first token (TTFT): ${ttft.toFixed(0)}ms`);
            perfFirstTokenLogged = true;
          }

          perfTokenCount++;

          // Append the new token to the last message in the array (assistant bubble)
          setMessages((prev) => {
            const updated = [...prev];
            const lastMsg = updated[updated.length - 1];
            // Safety check: avoid duplicating a token if it was already appended
            if (!lastMsg.content.endsWith(token)) {
              lastMsg.content += token;
            }
            return updated;
          });
        },

        /**
         * onDone — Fires when the AI has finished generating the full response.
         * Logs final performance stats and re-enables the input.
         */
        onDone: () => {
          const perfTotalMs = performance.now() - perfGenerationStart;
          const perfTps = perfTokenCount / (perfTotalMs / 1000);
          console.log(
            `[Perf] Generation complete — tokens: ${perfTokenCount}, total time: ${perfTotalMs.toFixed(0)}ms, TPS: ${perfTps.toFixed(1)}`
          );
          setStatus(null);
          setIsStreaming(false); // Re-enable the input
        },

        /**
         * onError — Fires if the stream encounters an error mid-generation.
         * Displays the error message and re-enables the input.
         */
        onError: (err) => {
          console.error("Stream error:", err);
          setStatus(`Error: ${err.message || "Generation failed"}`);
          setIsStreaming(false);
        },
      });

    } catch (err) {
      // Catches errors from initInference (e.g. model failed to load, no WebGPU)
      console.error("Initialization error:", err);
      setStatus(`Failed to load model: ${err.message}`);
      setIsStreaming(false);
    }
  }

  /**
   * handleStop — Fires when the user clicks the Stop button mid-generation.
   * Sets a flag in webllm.js that breaks the streaming loop on the next token.
   * The partial response already shown in the bubble is preserved.
   */
  function handleStop() {
    stopGeneration(); // Sets abortRequested = true in webllm.js
    setStatus(null);
    setIsStreaming(false);
  }

  /**
   * useEffect — Auto-scrolls to the bottom of the chat on every update.
   * Triggers whenever messages change (new message or new token appended)
   * or when status text changes (e.g. "Loading model…" appears).
   * bottomRef points to an invisible div placed after the last message.
   */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  /* ========================= RENDER ========================= */
  return (
    <>
      {/* Global styles — scrollbar styling and fade-in animation */}
      <style>{`
        html { scroll-behavior: smooth; }

        /* Fade + slide up animation applied to each new message bubble */
        @keyframes fadeSlide {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Custom scrollbar styling */
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.15);
          border-radius: 8px;
        }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,98,0,0.6); }
      `}</style>

      <div style={styles.container}>

        {/* Top bar — app name/logo */}
        <Header />

        {/* Model selector dropdown — disabled while AI is streaming */}
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

        {/* ── Empty State ─────────────────────────────────────────────────
          * Shown before any messages exist.
          * Centers the input in the middle of the screen like a hero section.
          * ────────────────────────────────────────────────────────────── */}
        {!hasMessages && (
          <div style={styles.emptyState}>
            <h2 style={styles.emptyTitle}>Ask Vynel anything</h2>
            {/* Status text shown here during initial model load */}
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

        {/* ── Active Chat ─────────────────────────────────────────────────
          * Shown once at least one message exists.
          * Scrollable message list + fixed footer with input bar.
          * ────────────────────────────────────────────────────────────── */}
        {hasMessages && (
          <>
            {/* Scrollable message list */}
            <div style={styles.chatArea}>
              {messages.map((msg, i) => (
                <div
                  key={i}
                  style={{
                    ...styles.messageRow,
                    animation: "fadeSlide 0.2s ease", // Animate each bubble in
                  }}
                >
                  {/* Apply different bubble styles for user vs assistant */}
                  <div
                    style={{
                      ...styles.messageBubble,
                      ...(msg.role === "assistant"
                        ? styles.assistantBubble
                        : styles.userBubble),
                    }}
                  >
                    {/* Render message content as Markdown.
                      * normalizeContent cleans up spacing/line endings first.
                      * Custom renderers for code blocks and paragraphs. */}
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]} // Enables tables, strikethrough etc.
                      components={{
                        // Custom inline code renderer — small styled badge
                        // Custom block code renderer — dark pre block
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
                        // Tighter paragraph spacing inside bubbles
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

              {/* Inline status text shown below messages during generation */}
              {status && <div style={styles.statusInline}>{status}</div>}

              {/* Invisible anchor div — useEffect scrolls here on every update */}
              <div ref={bottomRef} />
            </div>

            {/* Fixed footer — clear button + chat input */}
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
    </>
  );
}

/* ========================= STYLES ========================= */

const styles = {
  // Full viewport container with dark background + subtle orange glow
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

  // Top-right aligned model dropdown bar
  modelBar: {
    display: "flex",
    justifyContent: "flex-end",
    padding: "14px 20px",
  },

  // Glassmorphism styled dropdown
  modelSelect: {
    background: COLORS.glass,
    color: COLORS.muted,
    border: `1px solid ${COLORS.border}`,
    padding: "10px 16px",
    borderRadius: "12px",
    backdropFilter: "blur(10px)",
  },

  // Centered hero layout before any messages exist
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

  // Status text in empty state (shown during initial model load)
  status: {
    fontSize: "14px",
    color: COLORS.muted,
  },

  // Status text shown inline below messages during generation
  statusInline: {
    fontSize: "14px",
    color: COLORS.muted,
    marginTop: "12px",
  },

  // Scrollable message list — takes all available vertical space
  chatArea: {
    flex: 1,
    overflowY: "auto",
    padding: "32px 16px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },

  // Constrains each message to max 860px width, centered
  messageRow: {
    width: "100%",
    maxWidth: "860px",
    marginBottom: "16px",
  },

  // Base bubble styles shared by both user and assistant
  messageBubble: {
    padding: "16px 18px",
    borderRadius: "16px",
    fontSize: "16px",
    lineHeight: 1.6,
  },

  // Assistant bubble — subtle orange tint with glow
  assistantBubble: {
    background: "rgba(255,98,0,0.06)",
    border: "1px solid rgba(255,98,0,0.2)",
    boxShadow: "0 0 20px rgba(255,98,0,0.08)",
  },

  // User bubble — neutral dark style
  userBubble: {
    background: "rgba(255,255,255,0.04)",
    border: `1px solid ${COLORS.border}`,
  },

  // Inline code style — small monospace badge
  inlineCode: {
    background: "rgba(255,255,255,0.08)",
    padding: "2px 6px",
    borderRadius: "6px",
    fontFamily: "monospace",
    fontSize: "0.9em",
  },

  // Block code style — dark panel with horizontal scroll
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

  // Frosted glass footer bar
  footer: {
    borderTop: `1px solid ${COLORS.border}`,
    backdropFilter: "blur(10px)",
    background: "rgba(10,10,10,0.6)",
  },

  // Inner footer row — right-aligns the clear button
  footerBar: {
    maxWidth: "860px",
    margin: "0 auto",
    padding: "10px 24px",
    display: "flex",
    justifyContent: "flex-end",
  },

  // Minimal clear button — no background, orange text
  clearButton: {
    background: "none",
    border: "none",
    color: COLORS.orange,
    cursor: "pointer",
  },

  // Centers the ChatInput in the footer
  centerInput: {
    display: "flex",
    justifyContent: "center",
    padding: "12px 24px",
  },

  // Full-width centered input for the empty state hero
  centerInputHero: {
    width: "100%",
    maxWidth: "720px",
    padding: "12px 24px",
  },
};