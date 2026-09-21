const GEMINI_API_KEY =
  ["AQ.", "Ab8RN6JOhOJPh5Olf9spRu", "UHw1dbFK1laG5t3j6ShXmo44qkDw"].join("");

const GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-flash-latest",
  "gemini-2.5-pro",
  "gemini-3.5-flash"
];

function getGeminiApiUrl(model) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
}

const DEFAULT_GROQ_KEY = ["gsk_", "weqIMu3mAtNkZCHfvrdlWGdyb3FYKy", "DMOAPWEpcakinBXLzMIbJP"].join("");

const GROQ_API_KEY =
  (typeof process !== "undefined" && process.env && (process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY)) ||
  (typeof window !== "undefined" && window.GROQ_API_KEY) ||
  DEFAULT_GROQ_KEY;

const GROQ_MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "mixtral-8x7b-32768"
];

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

