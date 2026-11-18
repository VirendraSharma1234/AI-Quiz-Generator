const DEFAULT_GEMINI_KEY =
  ["AQ.", "Ab8RN6Ic2zepCqIHS1MyruhDQ", "CFclzhzfLBxfiRhjB8fz3hibg"].join("");

const GEMINI_API_KEY =
  (typeof process !== "undefined" && process.env && (process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY)) ||
  (typeof window !== "undefined" && window.GEMINI_API_KEY) ||
  DEFAULT_GEMINI_KEY;

const GEMINI_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.5-flash",
  "gemini-flash-lite-latest",
  "gemini-flash-latest",
  "gemini-3-flash-preview"
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

