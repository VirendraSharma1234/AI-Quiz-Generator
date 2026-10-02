const GEMINI_API_KEY =
  ["AQ.", "Ab8RN6JOhOJPh5Olf9spRu", "UHw1dbFK1laG5t3j6ShXmo44qkDw"].join("");

const GEMINI_MODELS = [
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.6-flash",
  "gemini-2.5-flash",
  "gemini-flash-latest"
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
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "qwen/qwen3.8-27b"
];

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

