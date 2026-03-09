// Aliased to avoid name conflicts with this file's own exports
import {
  initWebLLM,
  streamChat as streamChatGPU,
  stopGeneration as stopGPU,
  setWebLLMModel
} from "./webllm";

// Tracks the active engine ("gpu" or null) and which model is loaded
let activeEngine = null;
let currentModel = null;

// Checks if the browser supports WebGPU before attempting to load a model
function canUseWebGPU() {
  return typeof navigator !== "undefined" && !!navigator.gpu;
}

// Initializes the inference engine. Resets if model changed, skips if already loaded.
export async function initInference(onProgress, modelId) {
  // If model switched, tear down the current engine first
  if (currentModel !== modelId) {
    stopGeneration();
    activeEngine = null;
    currentModel = modelId;
  }

  // Singleton guard — skip loading if engine is already ready
  if (activeEngine) return activeEngine;

  if (!canUseWebGPU()) {
    throw new Error("WebGPU not supported on this device.");
  }

  await setWebLLMModel(modelId);
  await initWebLLM(onProgress);

  activeEngine = "gpu";
  return activeEngine;
}

// Passes stream request to the GPU engine. Throws if engine isn't ready.
export async function streamChat(options) {
  if (!activeEngine) {
    throw new Error("No inference engine initialized. Call initInference() first.");
  }

  return streamChatGPU(options);
}

// Stops active generation. Only fires if a GPU engine is running.
export function stopGeneration() {
  if (activeEngine === "gpu") {
    stopGPU();
  }
}

// Returns the current engine status ("gpu" or null)
export function getActiveEngine() {
  return activeEngine;
}

// Full reset — stops generation and clears all engine state
export function resetEngine() {
  stopGeneration();
  activeEngine = null;
  currentModel = null;
}