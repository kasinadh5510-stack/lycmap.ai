import OpenAI from "openai";

if (!process.env.GROQ_API_KEY) {
  throw new Error("GROQ_API_KEY must be set. Please add your Groq API key as a secret.");
}

// Groq is OpenAI-compatible — free tier, no credit card needed
export const ai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

// Best free Groq model for quiz/tutor tasks
export const GEMINI_MODEL = "llama-3.3-70b-versatile";
