import { CreateMLCEngine } from "@mlc-ai/web-llm";

let engine = null;
let abortRequested = false;
let modelId = null;

export async function setWebLLMModel(newModelId) {
  if (modelId !== newModelId) {
    engine = null;
    modelId = newModelId;
  }
}

export async function initWebLLM(onProgress) {
  if (engine) return engine;

  engine = await CreateMLCEngine(modelId, {
    initProgressCallback: onProgress
  });

  return engine;
}

export async function streamChat({ messages, onToken, onDone, onError }) {
  try {
    abortRequested = false;

    const response = await engine.chat.completions.create({
      messages,
      stream: true,
      temperature: 0.7,
      max_tokens: 1024   // 🚀 Controlled cap for performance
    });

    for await (const chunk of response) {
      if (abortRequested) break;

      const choice = chunk.choices[0];
      if (choice && choice.delta && choice.delta.content) {
        onToken(choice.delta.content);
      }
    }

    onDone();
  } catch (err) {
    if (!abortRequested) onError(err);
  }
}

export function stopGeneration() {
  abortRequested = true;
}
