Vynel
Private by default. Local by design.
Vynel is a fully client-side AI chat application that runs entirely in your browser using WebGPU acceleration. All inference happens locally on your machine — there is no backend server and no cloud-based AI.
⚠️ Current scope: Vynel is intentionally GPU-only for now. CPU / WASM fallback has been removed to keep the architecture clean and correct.
________________________________________
✨ Features
•	🔒 100% local inference (no backend, no API keys)
•	⚡ WebGPU acceleration (MLC / WebLLM)
•	🧠 Multiple large language models
•	💬 Streaming responses (ChatGPT-style UX)
•	🔄 Model selector with persistence
•	🗂️ Sliding context window
•	🖤 Dark UI (black & orange theme)
________________________________________
🧠 Supported Models (WebGPU only)
These models are compiled with MLC and require WebGPU:
•	TinyLlama 1.1B — Fast
•	Llama 3 8B — Smart
•	Mistral 7B — Deep
•	Gemma 2 2B — Balanced
All models run locally on your GPU. No model runs on CPU at this stage.
________________________________________
📋 System Requirements
✅ Operating System
•	Windows 10 / 11 only
macOS and Linux are not supported yet.
________________________________________
✅ Browser
•	Google Chrome (required)
Chromium-based browsers may work, but Chrome is the only supported browser.
________________________________________
✅ Hardware
•	A GPU with WebGPU support
•	Modern integrated or discrete GPU (Intel / AMD / NVIDIA)
________________________________________
🧪 Chrome Setup (VERY IMPORTANT)
WebGPU must be fully enabled in Chrome.
Step 1: Enable WebGPU
1.	Open Chrome
2.	Go to:
3.	chrome://flags
4.	Enable the following flags:
o	WebGPU
o	Unsafe WebGPU Support (if available)
5.	Relaunch Chrome
________________________________________
Step 2: Ensure Hardware Acceleration is ON
1.	Open Chrome Settings
2.	Go to System
3.	Enable:
o	✅ Use hardware acceleration when available
4.	Relaunch Chrome
________________________________________
Step 3: Verify WebGPU (Optional)
Open DevTools → Console and run:
navigator.gpu
If it returns an object, WebGPU is enabled.
________________________________________
🛠️ Installation (from scratch)
These steps assume nothing is installed on the system.
________________________________________
Step 1: Install Node.js
Download and install Node.js 20+:
👉 https://nodejs.org/
Verify installation:
node -v
npm -v
________________________________________
Step 2: Clone the repository
git clone https://github.com/<your-username>/vynel.git
cd vynel
________________________________________
Step 3: Install dependencies
npm install
This installs:
•	React
•	Vite
•	@mlc-ai/web-llm
•	react-markdown
•	remark-gfm
________________________________________
Step 4: Start the development server
npm run dev
You should see:
Local: http://localhost:5173/
Open the URL in Google Chrome.
________________________________________
🚀 Usage
1.	Open Vynel in Chrome
2.	Select a model from the dropdown
3.	Start chatting
4.	Responses stream in real time
5.	Use Stop to interrupt generation
6.	Use Clear chat to reset context
If WebGPU is not available, the app will fail to load models.
________________________________________
📁 Project Structure
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
________________________________________
🔐 Privacy
•	No backend
•	No cloud inference
•	No API keys
•	No telemetry
•	Model files are downloaded locally
Everything runs entirely on your machine.
________________________________________
🧭 Roadmap
•	Settings panel (temperature, system prompt)
•	Engine diagnostics panel
•	Better WebGPU capability checks
•	Model download size warnings
•	Mobile WebGPU (when supported)
________________________________________
📄 License
MIT License
________________________________________
⭐ Final note
Vynel exists to prove that serious, private, local AI in the browser is already possible.
If you like this project, consider starring the repo ⭐

