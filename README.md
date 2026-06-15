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
##  Repository Structure

```tree
├── data/                          # Folder for local JSON profile storage
│   └── enrolled.json              # Local persistent identity database
├── src/                           # Live React & TypeScript front-end application
│   ├── App.tsx                    # Main portal component with vector landmark overlays
│   ├── index.css                  # Global styles, fonts imports, scan lines animations
│   └── main.tsx                   # Render entry point
├── server.ts                      # Express.js backend & static asset routing
├── python/                        # Local Python Core module
│   └── recognizer.py              # OpenCV face tracking & dlib Vector face recognition
├── sql/                           # Relational Database scripts
│   └── schema.sql                 # SQL tables for identities, audits, and landmarks
├── java/                          # Enterprise integration scripts
│   └── FaceBiometricRegistry.java # Java controller for SQL transactions & base64 files
├── package.json                   # JS/TS dependencies manager
├── tsconfig.json                  # Compiler specs 
├── vite.config.ts                 # Dev server boundaries & aliases map
└── README.md                      # Repository guide (This document)
```

