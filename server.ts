import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

// Force JSON body parsing with high base64 limit
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const DATA_DIR = path.join(process.cwd(), "data");
const ENROLLED_FILE = path.join(DATA_DIR, "enrolled.json");

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialise enrolled DB if not present
if (!fs.existsSync(ENROLLED_FILE)) {
  fs.writeFileSync(ENROLLED_FILE, JSON.stringify([], null, 2));
}

// Read database
function readEnrolledDB() {
  try {
    const data = fs.readFileSync(ENROLLED_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading db", error);
    return [];
  }
}

// Write database
function writeEnrolledDB(data: any) {
  try {
    fs.writeFileSync(ENROLLED_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error("Error writing db", error);
    return false;
  }
}

// Helper to clean base64 string for Gemini API
function parseBase64Image(dataUrl: string) {
  const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    // If it's not a DataURL, assume it's already a raw base64 string
    return { mimeType: "image/jpeg", data: dataUrl };
  }
  return {
    mimeType: matches[1],
    data: matches[2],
  };
}

// Initialize Gemini Client
const geminiApiKey = process.env.GEMINI_API_KEY;  //Warning: Do not share code with API Keys.
const ai = new GoogleGenAI({
  apiKey: geminiApiKey,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// ==========================================
// API ENDPOINTS
// ==========================================

// Get all enrolled users (excl. matching payload if too heavy, but returning metadata & photos for UI display)
app.get("/api/enrolled", (req, res) => {
  try {
    const db = readEnrolledDB();
    // Return all records (since it is a browser application, displaying registered faces is useful)
    res.json({ success: true, count: db.length, data: db });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Enroll a new user face
app.post("/api/enroll", (req, res) => {
  try {
    const { name, role, photo } = req.body;
    if (!name || !role || !photo) {
      return res.status(400).json({ success: false, error: "Missing required fields (name, role, photo)." });
    }

    const db = readEnrolledDB();
// Check if name already enrolled
    const exists = db.some((u: any) => u.name.toLowerCase() === name.toLowerCase());
    if (exists) {
      return res.status(400).json({ success: false, error: `Identity '${name}' is already enrolled.` });
    }

    const newUser = {
      id: "usr_" + Math.random().toString(36).substring(2, 11),
      name,
      role,
      photoData: photo, // DataURL base64
      enrolledAt: new Date().toISOString(),
    };

    db.push(newUser);
    const saved = writeEnrolledDB(db);

    if (saved) {
      res.json({ success: true, data: { id: newUser.id, name: newUser.name, role: newUser.role, enrolledAt: newUser.enrolledAt } });
    } else {
      res.status(500).json({ success: false, error: "Failed to write database." });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete an enrolled user
app.post("/api/delete", (req, res) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ success: false, error: "Missing identity ID." });
    }

    let db = readEnrolledDB();
    const beforeLength = db.length;
    db = db.filter((u: any) => u.id !== id);

    if (db.length === beforeLength) {
      return res.status(404).json({ success: false, error: "Identity not found." });
    }

    const saved = writeEnrolledDB(db);
    if (saved) {
      res.json({ success: true, message: "Identity removed successfully." });
    } else {
      res.status(500).json({ success: false, error: "Failed to write database." });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Verify captured face (returns both Biometric Landmark overlays + Identity match results)
app.post("/api/verify", async (req, res) => {
  try {
    const { photo } = req.body;
    if (!photo) {
      return res.status(400).json({ success: false, error: "No face capture data received." });
    }

    if (!geminiApiKey) {
      return res.status(500).json({ 
        success: false, 
        error: "GEMINI_API_KEY environment variable is not configured. Please set it in Settings > Secrets." 
      });
    }

    const enrolledList = readEnrolledDB();
    const parsedLive = parseBase64Image(photo);

    let promptString = "";
    const contentParts: any[] = [];

    // Add Live Photo
    contentParts.push({
      inlineData: {
        mimeType: parsedLive.mimeType,
        data: parsedLive.data,
      },
    });

    if (enrolledList.length === 0) {
      // MODE 1: FACE DETECTION & BIOMETRIC DETAILS ONLY (NO ENROLLED USERS)
      promptString = `You are an advanced Biometric Facial Analysis and Computer Vision engine. 
Analyze the provided face image and produce structured output.
Extract exact landmark coordinate positions (where coordinate mapping 0-100 values represent percentage x and y positions offset from top-left. For example, x: 50, y: 50 is exactly centered on the image). 

Requirements:
1. Detect face boundaries and produce a bounding box (xMin, yMin, width, height) in 0-100 percentage layout values.
2. Produce key coordinate points: leftEye, rightEye, noseTip, mouthLeft, mouthRight, chinTip, and an array of 8 coordinates outlining the jaw/cheek 'faceOutline'.
3. Estimate age, gender, facial symmetry score (0-100), emotion, glasses, and facial hair.
4. Evaluate quality metrics: focus quality, lighting, and head rotation/pose.
5. Because there are NO enrolled profiles to compare against, set matchedId and matchedName to null, and confidence to 0.

Respond strictly with valid JSON. Do not include markdown codeblock tags.`;
    } else {
      // MODE 2: FULL RECOGNITION (VERIFICATION AND IDENTIFICATION)
      // We will feed the enrolled faces into the context!
      // To prevent token overload, we take up to 6 registered profiles for comparison.
      const profilesForComparison = enrolledList.slice(0, 6);

      promptString = `You are a professional Biometric Facial Verification and Authentication engine. 
Compare Image #0 (the live captured feed) with the other provided profile pictures corresponding to Enrolled Identities. 

Enrolled Identities:
${profilesForComparison.map((u: any, idx: number) => `Identity Profiles #${idx + 1}:
- ID: ${u.id}
- Name: ${u.name}
- Role/Category: ${u.role}`).join("\n\n")}

Task Instructions:
1. Perform high-precision facial geometry comparison. Is Image #0 (Live Feed) the same person as any of the Enrolled Identities (Profile Pictures #1 to #${profilesForComparison.length})?
2. If yes, specify matchedId, matchedName, and a matchConfidence percentage (0 to 100). If no match exists or confidence is lower than 60%, set matchedId and matchedName to null and confidence to 0.
3. Provide a clear matchReason explaining what matches (e.g. eye spacing, nose shape, eyebrow alignment) or why it does not match.
4. Extract precise biometric overlay coordinates (percentage 0-100 mapping values relative to the canvas size) for: bounding box (xMin, yMin, width, height), leftEye, rightEye, noseTip, mouthLeft, mouthRight, chinTip, and a face outline array of 8 points.
5. Provide estimation labels: age range, gender, emotion, glasses, facial hair, facial symmetry percent, lighting environment, and head pose.

Respond strictly with a valid JSON document matching the requested JSON schema.`;

      // Append Enrolled Profiles
      profilesForComparison.forEach((u: any, idx: number) => {
        const parsedProfile = parseBase64Image(u.photoData);
        contentParts.push({
          inlineData: {
            mimeType: parsedProfile.mimeType,
            data: parsedProfile.data,
          },
        });
      });
    }

     const responseSchema = {
      type: Type.OBJECT,
      properties: {
        matchedId: { type: Type.STRING, description: "ID of matching profile, or null if no confident match" },
        matchedName: { type: Type.STRING, description: "Name of matching profile, or null" },
        matchConfidence: { type: Type.NUMBER, description: "Matching confidence rating from 0 to 100" },
        matchReason: { type: Type.STRING, description: "Biometric correlation analysis explaining matching elements or discrepancy details" },
        biometrics: {
          type: Type.OBJECT,
          properties: {
            estimatedAge: { type: Type.STRING, description: "Estimated age or age bracket, such as '20-25' or '34'" },
            estimatedGender: { type: Type.STRING, description: "Estimated biological category profile (e.g., Male, Female, Other)" },
            emotion: { type: Type.STRING, description: "Dominant facial micro-expression detected (e.g., Neutral, Smiling, Surprised, Serious)" },
            glassesDetected: { type: Type.BOOLEAN, description: "Whether prescription or sunglasses are worn" },
            facialHair: { type: Type.STRING, description: "Type of facial hair (e.g., None, Beard, Mustache, stubble)" },
            symmetryScore: { type: Type.NUMBER, description: "Facial structural alignment rating between 0 and 100" },
            boundingBox: {
              type: Type.OBJECT,
              properties: {
                xMin: { type: Type.NUMBER, description: "Leftmost face position percentage overlay (0-100)" },
                yMin: { type: Type.NUMBER, description: "Topmost face position percentage overlay (0-100)" },
                width: { type: Type.NUMBER, description: "Width scale percentage outline (0-100)" },
                height: { type: Type.NUMBER, description: "Height scale percentage outline (0-100)" },
              },
              required: ["xMin", "yMin", "width", "height"],
            },
            landmarks: {
              type: Type.OBJECT,
              properties: {
                leftEye: {
                  type: Type.OBJECT,
                  properties: { x: { type: Type.NUMBER }, y: { type: Type.NUMBER } },
                  required: ["x", "y"],
                },
                rightEye: {
                  type: Type.OBJECT,
                  properties: { x: { type: Type.NUMBER }, y: { type: Type.NUMBER } },
                  required: ["x", "y"],
                },
                noseTip: {
                  type: Type.OBJECT,
                  properties: { x: { type: Type.NUMBER }, y: { type: Type.NUMBER } },
                  required: ["x", "y"],
                },
                mouthLeft: {
                  type: Type.OBJECT,
                  properties: { x: { type: Type.NUMBER }, y: { type: Type.NUMBER } },
                  required: ["x", "y"],
                },
                mouthRight: {
                  type: Type.OBJECT,
                  properties: { x: { type: Type.NUMBER }, y: { type: Type.NUMBER } },
                  required: ["x", "y"],
                },
                chinTip: {
                  type: Type.OBJECT,
                  properties: { x: { type: Type.NUMBER }, y: { type: Type.NUMBER } },
                  required: ["x", "y"],
                },
                faceOutline: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: { x: { type: Type.NUMBER }, y: { type: Type.NUMBER } },
                    required: ["x", "y"],
                  },
                },
              },
              required: ["leftEye", "rightEye", "noseTip", "mouthLeft", "mouthRight", "chinTip", "faceOutline"],
            },
            technicalReport: {
              type: Type.OBJECT,
              properties: {
                focusQuality: { type: Type.STRING },
                lightingConditions: { type: Type.STRING },
                headPose: { type: Type.STRING },
              },
              required: ["focusQuality", "lightingConditions", "headPose"],
            },
          },
          required: ["estimatedAge", "estimatedGender", "emotion", "glassesDetected", "facialHair", "symmetryScore", "boundingBox", "landmarks", "technicalReport"],
        },
      },
      required: ["matchedId", "matchedName", "matchConfidence", "matchReason", "biometrics"],
    };

    const finalParts = [...contentParts, { text: promptString }];

    const geminiResponse = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: { parts: finalParts },
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.1, // low temperature for precise comparison tasks
      },
    });

    const parsedJson = JSON.parse(geminiResponse.text?.trim() || "{}");
    res.json({ success: true, data: parsedJson });
  } catch (error: any) {
    console.error("Gemini Biometric Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

