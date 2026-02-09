# Vynel

**Private by default. Local by design.**

Vynel is a fully client-side AI chat application that runs **entirely in your browser** using **WebGPU acceleration**.  
All inference happens locally on your machine — **no backend server, no cloud AI, no API keys**.

> ⚠️ **Scope notice**  
> Vynel is intentionally **GPU-only**.  
> CPU / WASM fallback has been removed to keep the architecture clean and correct.

---

## ✨ Features

- 🔒 **100% local inference** (no backend, no API keys)
- ⚡ **WebGPU acceleration** (MLC / WebLLM)
- 🧠 **Multiple large language models**
- 💬 **Streaming responses** (ChatGPT-style UX)
- 🔄 **Model selector with persistence**
- 🖤 **Dark UI** (black & orange theme)

---

## 🧠 Supported Models (WebGPU only)

All models are compiled with **MLC** and require **WebGPU**.

- **TinyLlama 1.1B** — Fast
- **Llama 3 8B** — Smart
- **Mistral 7B** — Deep
- **Gemma 2 2B** — Balanced

> All models run locally on your GPU.  
> ❌ No model runs on CPU at this stage.

---

## 📋 System Requirements

### ✅ Operating System

- **Windows 10 / 11 only**
- macOS and Linux are **not supported yet**

---

### ✅ Browser

- **Google Chrome (required)**
- Other Chromium-based browsers *may* work, but only Chrome is supported

---

### ✅ Hardware

- GPU with **WebGPU support**
- Modern **Intel / AMD / NVIDIA** GPU  
  (integrated or discrete)

---

## 🧪 Chrome Setup (VERY IMPORTANT)

WebGPU **must** be fully enabled in Chrome.

---

### Step 1: Enable WebGPU Flags

1. Open **Google Chrome**
2. Navigate to:
3. Enable:
- **WebGPU**
- **Unsafe WebGPU Support** (if available)
4. Relaunch Chrome

---

### Step 2: Enable Hardware Acceleration

1. Open **Chrome Settings**
2. Go to **System**
3. Enable:
- ✅ *Use hardware acceleration when available*
4. Relaunch Chrome

---




## Installation (from scratch)

These steps assume nothing is installed on the system.

## Step 1: Install Node.js

Install Node.js 20+
👉 https://nodejs.org/

Verify installation:

node -v
npm -v

## Step 2: Clone the Repository
git clone https://github.com/<your-username>/vynel.git
cd vynel

## Step 3: Install Dependencies
npm install

Installs:
React
Vite
@mlc-ai/web-llm
react-markdown
remark-gfm

## Step 4: Start the Development Server
npm run dev

##You should see:

Local: http://localhost:5173/


## Open the URL in Google Chrome.


## 🚀 Usage

Open Vynel in Chrome

Select a model from the dropdown

Start chatting

Responses stream in real time

Use Stop to interrupt generation

Use Clear chat to reset context

⚠️ If WebGPU is unavailable, the app will fail to load models.


Project Structure
src/
├─ components/
│  ├─ ChatApp.jsx      # Main UI + logic
│  ├─ ChatInput.jsx   # Input + send/stop
│  └─ Header.jsx      # App header
│
├─ inference/
│  ├─ index.js        # WebGPU inference manager
│  └─ webllm.js       # WebLLM / MLC engine
│
├─ main.jsx
├─ App.jsx

🔐 Privacy

No backend

No cloud inference

No API keys

No telemetry

Model files are downloaded locally

Everything runs entirely on your machine.

⭐ Final Note

Vynel exists to prove that serious, private, local AI in the browser is already possible.

If you like this project, consider starring the repo ⭐