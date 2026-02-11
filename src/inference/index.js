import {
  initWebLLM,
  streamChat as streamChatGPU,
  stopGeneration as stopGPU,
  setWebLLMModel
} from "./webllm";

let activeEngine = null;
let currentModel = null;

function canUseWebGPU() {
  return typeof navigator !== "undefined" && !!navigator.gpu;
}

export async function initInference(onProgress, modelId) {
  // Reset if model changed
  if (currentModel !== modelId) {
    stopGeneration();
    activeEngine = null;
    currentModel = modelId;
  }

  if (activeEngine) return activeEngine;

  if (!canUseWebGPU()) {
    throw new Error("WebGPU not supported on this device.");
  }

  await setWebLLMModel(modelId);
  await initWebLLM(onProgress);

  activeEngine = "gpu";
  return activeEngine;
}

export async function streamChat(options) {
  if (!activeEngine) {
    throw new Error("No inference engine initialized. Call initInference() first.");
  }

  return streamChatGPU(options);
}

export function stopGeneration() {
  if (activeEngine === "gpu") {
    stopGPU();
  }
}

export function getActiveEngine() {
  return activeEngine;
}

export function resetEngine() {
  stopGeneration();
  activeEngine = null;
  currentModel = null;
}
