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
