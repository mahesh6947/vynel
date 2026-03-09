import { CreateMLCEngine } from "@mlc-ai/web-llm";

// Active engine instance, abort flag, and current model tracker
let engine = null;
let abortRequested = false;
let modelId = null;

// Updates the target model. Resets engine if model has changed.
export async function setWebLLMModel(newModelId) {
  if (modelId !== newModelId) {
    engine = null;
    modelId = newModelId;
  }
}

// Loads the model into WebGPU. Skips if already loaded (singleton).
export async function initWebLLM(onProgress) {
  if (engine) return engine;

  engine = await CreateMLCEngine(modelId, {
    initProgressCallback: onProgress
  });

  return engine;
}

// Streams AI response token by token. Fires onToken, onDone, or onError.
export async function streamChat({ messages, onToken, onDone, onError }) {
  try {
    abortRequested = false;

    const response = await engine.chat.completions.create({
      messages,
      stream: true,
      temperature: 0.7,  // 0 = robotic, 1 = creative
      max_tokens: 1024   // Cap to avoid runaway responses
    });

    for await (const chunk of response) {
      if (abortRequested) break; // Stop reading if user pressed Stop

      const choice = chunk.choices[0];
      // Only fire onToken if the chunk has actual text content
      if (choice && choice.delta && choice.delta.content) {
        onToken(choice.delta.content);
      }
    }

    onDone();
  } catch (err) {
    // Ignore errors caused by intentional stop
    if (!abortRequested) onError(err);
  }
}

// Sets abort flag — streaming loop checks this on every token
export function stopGeneration() {
  abortRequested = true;
}