# Core Biometrics: Multi-Language Face Recognition, Verification & Analysis Studio

An advanced, full-stack biometric facial analysis, detection, and authentication suite. This repository houses a fully operational browser-based WebRTC face analysis dashboard with real-time vector coordinate overlays, as well as enterprise-ready modules programmed in **Python**, **TypeScript/JavaScript**, **Java**, and **SQL**.

---

##  Interactive Portal Framework (React + Express + Gemini)

The primary live application is a full-stack, real-time portal:
* **Frontend**: Built with **React**, **Vite**, **TypeScript**, and styled with high-tech custom **Tailwind CSS**. It captures webcam video feeds via HTML5 WebRTC.
* **Biometric overlays**: Points (eyes, nose, mouth corners, chin tip) and outline contours are drawn dynamically as absolute-positioned vector items over captured video frames.
* **Backend**: Express.js server proxies frame data to **Gemini 3.5 Flash** using the modern `@google/genai` TypeScript SDK. The AI acts as a biometric comparison and analytics model, identifying matches against registered faces and extracting demographic data.
* **Database**: Persistent local enrollment is recorded in `data/enrolled.json`.

---
