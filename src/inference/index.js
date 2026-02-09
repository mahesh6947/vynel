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
  // If model changed → reset engine
  if (currentModel !== modelId) {
    stopGeneration();
    activeEngine = null;
    currentModel = modelId;
  }

  if (activeEngine) return activeEngine;

  /* ================= GPU PATH ================= */

  if (canUseWebGPU()) {
    try {
      console.log("[INIT] Attempting WebGPU with model:", modelId);
      await setWebLLMModel(modelId);
      await initWebLLM(onProgress);
      activeEngine = "gpu";
      console.log("[INIT] ✓ Using WebGPU model:", modelId);
      return activeEngine;
    } catch (err) {
      console.warn("[INIT] WebGPU failed, falling back to CPU:", err);
      activeEngine = null; // Reset before CPU fallback
    }
  } else {
    console.log("[INIT] WebGPU not available, using CPU fallback");
  }

  /* ================= CPU FALLBACK ================= */

  try {
    console.log("[INIT] Initializing CPU fallback...");
    
    // Simulate progress updates for UI
    const progressInterval = setInterval(() => {
      if (onProgress && !isCPUReady()) {
        onProgress({
          progress: Math.min(0.95, 0.3 + Math.random() * 0.6)
        });
      }
    }, 300);

    // Initialize CPU with actual progress callback
    await initCPU((cpuProgress) => {
      clearInterval(progressInterval);
      if (onProgress) {
        // CPU loading can report real progress
        onProgress({
          progress: cpuProgress.progress || 0.9
        });
      }
    });

    clearInterval(progressInterval);

    // Mark as complete
    if (onProgress) {
      onProgress({ progress: 1 });
    }

    activeEngine = "cpu";
    console.log("[INIT] ✓ Using CPU fallback (transformers.js)");
    return activeEngine;

  } catch (err) {
    console.error("[INIT] CPU initialization failed:", err);
    
    if (onProgress) {
      onProgress({ progress: 0, error: err.message });
    }
    
    throw new Error(`Failed to initialize both GPU and CPU: ${err.message}`);
  }
}

export async function streamChat(options) {
  if (!activeEngine) {
    throw new Error("No inference engine initialized. Call initInference() first.");
  }

  console.log(`[STREAM] Using ${activeEngine} engine`);

  if (activeEngine === "gpu") {
    return streamChatGPU(options);
  } else if (activeEngine === "cpu") {
    return streamChatCPU(options);
  } else {
    throw new Error(`Unknown engine: ${activeEngine}`);
  }
}

export function stopGeneration() {
  console.log(`[STOP] Stopping ${activeEngine || 'unknown'} engine`);
  
  if (activeEngine === "gpu") {
    stopGPU();
  } else if (activeEngine === "cpu") {
    stopCPU();
  }
}

export function getActiveEngine() {
  return activeEngine;
}

export function resetEngine() {
  console.log("[RESET] Resetting inference engine");
  stopGeneration();
  activeEngine = null;
  currentModel = null;
}