const GEMINI_API_KEY =
  ["AQ.", "Ab8RN6IYq1OtyT6D", "OZq4yn0pie3cp9Le", "P6HxJATrmdPXM41B-Q"].join("");

const GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-flash-latest",
  "gemini-2.5-pro",
];

function getGeminiApiUrl(model) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
}
