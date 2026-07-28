import { GoogleGenAI } from "@google/genai";

if (!process.env.GOOGLE_API_KEY) {
  throw new Error("GOOGLE_API_KEY must be set. Please add your Google API key as a secret.");
}

export const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

export const GEMINI_MODEL = "gemini-2.0-flash";
