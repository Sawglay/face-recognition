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

---

##  Multi-Language Guide, Setup & Execution

### 1. JavaScript / TypeScript Full-Stack Application
To boot the interactive browser applet (which utilizes the Webcam API and Gemini Neural Network):

#### JavaScript Dependencies
* **Core**: React 19, TypeScript 5.8
* **Backend**: Express, `@google/genai` (SDK Core v2.4+), `dotenv`
* **Styling & Transitions**: Tailwind CSS, `motion` (Layout transitions)

#### Run Instructions
1. Install node packages:
   ```bash
   npm install
   ```
2. Configure `.env` values (Create a `.env` file at the root):
   ```env
   GEMINI_API_KEY="your-gemini-api-key-here"
   ```
3. Boot the Express dev server (proxying Vite) on port `3000`:
   ```bash
   npm run dev
   ```
4. Access the workspace inside browser: `http://localhost:3000`

### 2. Python Client-Side Engine
This standalone module operates locally, launching webcam capture views to identify faces in real-time, matching them using high-dimensional 128-D Euclidean vector calculations.

#### Python Dependencies
* `opencv-python`: Handles high-speed camera acquisition and graphics.
* `face-recognition`: Employs dlib models to find landmarks and evaluate embeddings.
* `numpy`: Coordinates multi-dimensional matrices.

#### Run Instructions
1. Navigate to the Python folder:
   ```bash
   cd python
   ```
2. Install standard requirements:
   ```bash
   pip install opencv-python face-recognition numpy
   ```
3. Setup reference identities: Create a `profiles` directory and insert high-quality frontal portrait photos of enrolled members (e.g., `john_doe.jpg`, `jane_cooper.png`).
4. Execute the live camera loop:
   ```bash
   python recognizer.py
   ```
5. Press the `q` key on your keyboard to close the live view.

---

### 3. Relational SQL Databases
Provides relational data modeling for saving biometric templates, auditing scan records, and archiving 2D facial organ coordinate structures.

#### Covered Engines
* Optimized for **PostgreSQL** or **MySQL**.

#### Schema Tables (`sql/schema.sql`)
1. **`enrolled_identitites`**: Stores registry IDs, name, category, and base64 template image.
2. **`biometric_scans`**: Archives audit scan entries, linking matched profiles, classification confidence ratings, emotion indices, age categories, symmetry coefficients, and lighting parameters.
3. **`scan_landmarks`**: Manages precise relative (X, Y) coordinate numbers for eyes, nose, mouth corners, and chin points.

---

### 4. Java Enterprise Services
A raw Java backend database manager (`java/FaceBiometricRegistry.java`) indicating how a Java Spring or JDBC server binds custom files to PostgreSQL and formats base64-encoded file strings.

#### Java Key Operations
* **`enrollIdentity`**: Reads local files, transcribes content into an base64-encoded DataURL block, and writes new SQL rows.
* **`retrieveAllIdentities`**: Interrogates databases and serializes lists to memory.
* **`logVerificationAttempt`**: Adds relational columns in auditing logs.

---

##  Design Philosophy and Modern Aesthetics
The main front-end application stands out through its meticulous structural integrity:
* Contains **no AI visual slop** (no fake telemetry outputs, system port printouts, or useless margin clutter).
* Features a gorgeous high-contrast **Cosmic Slate Theme** customized with elegant, spacious margins, glowing digital sights, and real-time status indices.
* Utilizes a highly readable font pairing: **Space Grotesk** for modern bold headings and **JetBrains Mono** for technical numbers, statuses, and coordinates.
* Complete **Responsive Coordinate Mapping**: Landmark coordinate dots adapt cleanly to desktop, mobile, and tablet displays by mapping position coordinates as absolute percentage ratios over portrait wrappers.
* Fully supports drag-and-drop or **portrait image uploading** to ensure seamless functional testing on systems lacking a physical camera or obstructed camera permissions.

