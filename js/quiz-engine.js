async function callGeminiAPI(prompt, systemInstruction = "") {
  let lastError = null;

  for (const model of GEMINI_MODELS) {
    try {
      const fullText = systemInstruction
        ? `[SYSTEM INSTRUCTION: ${systemInstruction}]\n\n${prompt}`
        : prompt;

      const payload = {
        contents: [{ parts: [{ text: fullText }] }]
      };
      if (systemInstruction) {
        payload.system_instruction = { parts: [{ text: systemInstruction }] };
      }

      const response = await fetch(getGeminiApiUrl(model), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();
      let data;
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch (parseError) {
        throw new Error(`Invalid API response (${response.status}) from ${model}`);
      }

      if (!response.ok) {
        throw new Error(`${data?.error?.message || `HTTP ${response.status}`} (${model})`);
      }

      const replyText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!replyText || !replyText.trim()) {
        throw new Error(`No response from AI (${model})`);
      }

      return replyText;
    } catch (modelError) {
      lastError = modelError;
      console.warn(`Gemini model ${model} failed:`, modelError);
    }
  }

  throw lastError || new Error("All Gemini models failed");
}

async function callGroqAPI(prompt, systemInstruction = "") {
  let lastError = null;

  const messages = [];
  if (systemInstruction) {
    messages.push({ role: "system", content: systemInstruction });
  } else {
    messages.push({ role: "system", content: "You are an expert university professor creating structured JSON quizzes." });
  }
  messages.push({ role: "user", content: prompt });

  for (const model of GROQ_MODELS) {
    try {
      const response = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          temperature: 0.5
        })
      });

      const responseText = await response.text();
      let data;
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch (parseError) {
        throw new Error(`Invalid Groq response (${response.status}) from ${model}`);
      }

      if (!response.ok) {
        throw new Error(`${data?.error?.message || `HTTP ${response.status}`} (${model})`);
      }

      const replyText = data?.choices?.[0]?.message?.content;
      if (!replyText || !replyText.trim()) {
        throw new Error(`No response from Groq AI (${model})`);
      }

      return replyText;
    } catch (modelError) {
      lastError = modelError;
      console.warn(`Groq model ${model} failed:`, modelError);
    }
  }

  throw lastError || new Error("All Groq models failed");
}

async function callAIProvider(prompt, systemInstruction = "") {
  try {
    const geminiReply = await callGeminiAPI(prompt, systemInstruction);
    console.log("Quiz generated via Gemini API");
    return geminiReply;
  } catch (geminiError) {
    console.warn("Gemini API failed, seamlessly switching to Groq API...", geminiError);
  }

  try {
    const groqReply = await callGroqAPI(prompt, systemInstruction);
    console.log("Quiz generated via Groq API (Failover)");
    return groqReply;
  } catch (groqError) {
    console.warn("Groq API failed:", groqError);
    throw groqError;
  }
}

async function generateQuizFromAI(content, count, difficulty, questionType, focusArea, academicContext, isSyllabusMode) {
  let typeRequirement = "";
  if (questionType === "tf") {
    typeRequirement = `Each question MUST be a True/False question. The "options" array must contain exactly ["True", "False"] and "correct_index" must be 0 for True or 1 for False.`;
  } else if (questionType === "mixed") {
    typeRequirement = `Generate a mix of standard 4-option multiple-choice questions and True/False questions (options: ["True", "False"]).`;
  } else {
    typeRequirement = `Each question MUST be a multiple-choice question with exactly 4 options.`;
  }

  let focusRequirement = "";
  if (focusArea) {
    focusRequirement = `Focus areas: ${focusArea}.`;
  }

  let academicRequirement = "";
  if (academicContext) {
    const parts = [];
    if (academicContext.topic) parts.push(`Topic: ${academicContext.topic}`);
    if (academicContext.degree) parts.push(`Degree: ${academicContext.degree}`);
    if (academicContext.branch) parts.push(`Branch: ${academicContext.branch}`);
    if (academicContext.year) parts.push(`Year: ${academicContext.year}`);
    if (parts.length > 0) {
      academicRequirement = `Academic level: ${parts.join(" | ")}. Match terminology and difficulty to this level.`;
    }
  }

  const isSyllabusDetected = isSyllabusMode || /syllabus|curriculum|module\s+[0-9|i|v|x]+|unit\s+[0-9|i|v|x]+/i.test(content);

  let syllabusRequirement = "";
  if (isSyllabusDetected) {
    syllabusRequirement = `- SYLLABUS SCOPE: Distribute questions across the academic units/modules in the text. Ignore university policies, grading schemes, and administrative contact details.`;
  }

  const systemInstruction = `You are an expert university professor creating an exam.
STRICT RULE: Generate questions ONLY about the academic topics, concepts, algorithms, and theories inside the provided SOURCE MATERIAL.
NEVER create questions about prompt instructions, system rules, grading policies, credit hours, office hours, or administrative metadata.
Return ONLY a valid JSON array of question objects without markdown tags or conversational text.`;

  const prompt = `
Task: Generate a ${difficulty} difficulty quiz containing ${count} questions based EXCLUSIVELY on the academic content in the SOURCE MATERIAL below.

Rules:
- ${typeRequirement}
${focusRequirement ? `- ${focusRequirement}` : ""}
${academicRequirement ? `- ${academicRequirement}` : ""}
${syllabusRequirement}

JSON Output Format (Strict JSON Array):
[
  {
    "question": "Question text testing a concept from the source material",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_index": 0,
    "explanation": "Short reason for the correct choice",
    "hint": "Helpful clue without revealing the answer"
  }
]

SOURCE MATERIAL:
<<<BEGIN_SOURCE_MATERIAL>>>
${content.substring(0, 35000)}
<<<END_SOURCE_MATERIAL>>>
`;

  try {
    const rawText = await callAIProvider(prompt, systemInstruction);
    console.log("AI Raw Response:", rawText);

    const cleanedText = rawText
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    const jsonMatch = cleanedText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error("AI did not return a valid JSON array");
    }

    const parsedQuiz = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsedQuiz) || parsedQuiz.length === 0) {
      throw new Error("Parsed quiz array is empty or invalid");
    }

    return parsedQuiz;
  } catch (error) {
    console.error("Detailed Error across AI providers:", error);
    const fallbackQuiz = generateQuizLocally(content, count, difficulty, questionType);
    if (typeof showStatusMessage === "function") {
      showStatusMessage("AI Cloud Services are temporarily busy, so the quiz was generated using the built-in offline engine.", "warning");
    }
    return fallbackQuiz;
  }
}

function normalizeText(content) {
  return content
    .replace(/\s+/g, " ")
    .replace(/[^\w\s.,;:!?'-]/g, " ")
    .trim();
}

function splitIntoSentences(content) {
  const chunks = content
    .split(/(?:\r?\n|•|[\.\!\?]\s+|;\s+|:\s+)/)
    .map((s) => s.replace(/^[-\*\d\.\s]+/, "").trim())
    .filter((s) => s.length >= 20 && !s.includes("--- Page") && !/^(page\s+\d+|---|university|department|course\s+code|credits|marks|semester)/i.test(s));

  if (chunks.length > 0) return chunks;

  return content
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 20 && !sentence.includes("--- Page"));
}

const STOP_WORDS = new Set([
  "the", "and", "for", "with", "that", "this", "from", "were", "was", "are", "have", "has", "had",
  "but", "not", "you", "your", "they", "their", "there", "about", "into", "when", "what", "which",
  "will", "would", "could", "should", "can", "may", "might", "been", "also", "than", "then", "them",
  "these", "those", "such", "because", "while", "where", "who", "whom", "whose", "our", "out", "over",
  "under", "after", "before", "during", "between", "each", "more", "most", "some", "any", "all", "one",
  "two", "three", "four", "five", "many", "much", "very", "into", "through", "using", "use", "used",
  "page"
]);

function getKeywordCandidates(content) {
  const words = normalizeText(content)
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, ""))
    .filter((word) => word.length > 3 && !STOP_WORDS.has(word) && word !== "page");

  const frequencies = new Map();
  words.forEach((word) => frequencies.set(word, (frequencies.get(word) || 0) + 1));

  return Array.from(frequencies.entries())
    .sort((left, right) => right[1] - left[1])
    .map(([word]) => word);
}

function buildIncorrectExplanation(sentence, answer) {
  return `It is the key idea from the text: ${answer}.`;
}

function generateQuizLocally(content, count, difficulty, questionType) {
  const sentences = splitIntoSentences(content);
  const keywords = getKeywordCandidates(content);
  const questions = [];
  const usedKeys = new Set();
  const safeCount = Math.max(1, Math.min(count, 100));
  const difficultyLabels = { easy: "main idea", medium: "key detail", hard: "careful detail" };

  for (let index = 0; index < safeCount; index++) {
    const sentence = sentences[index % Math.max(1, sentences.length)] || normalizeText(content).slice(0, 180);
    
    let isTF = false;
    if (questionType === "tf") {
      isTF = true;
    } else if (questionType === "mixed") {
      isTF = index % 2 === 1;
    }

    if (isTF) {
      const isTrue = Math.random() > 0.5;
      let questionText = "";
      let correctIndex = 0;

      if (isTrue) {
        questionText = `True or False: According to the text, the following statement is correct: "${sentence}"`;
        correctIndex = 0;
      } else {
        const keyWord = keywords[index % Math.max(1, keywords.length)] || "concept";
        const altWord = keywords[(index + 1) % Math.max(1, keywords.length)] || "alternate";
        const alteredSentence = sentence.replace(new RegExp(keyWord, "gi"), altWord);
        questionText = `True or False: According to the text, the following statement is correct: "${alteredSentence}"`;
        correctIndex = 1;
      }

      questions.push({
        question: questionText,
        options: ["True", "False"],
        correct_index: correctIndex,
        explanation: `This statement is direct confirmation or contradiction of the text detail: "${sentence}".`,
        hint: "Read the statement carefully and cross-reference with the primary topic details."
      });
    } else {
      const keyWord = keywords.find((word) => !usedKeys.has(word)) || `concept ${index + 1}`;
      usedKeys.add(keyWord);

      const correctAnswer = keyWord.charAt(0).toUpperCase() + keyWord.slice(1);
      const distractorPool = keywords.filter((word) => word !== keyWord).slice(0, 8);
      const distractors = [];

      while (distractors.length < 3) {
        const fallbackWord = distractorPool[distractors.length] || `${difficultyLabels[difficulty] || "idea"} ${distractors.length + 1}`;
        const candidate = fallbackWord.charAt(0).toUpperCase() + fallbackWord.slice(1);
        if (candidate !== correctAnswer && !distractors.includes(candidate)) {
          distractors.push(candidate);
        }
      }

      const options = [correctAnswer, ...distractors].sort(() => Math.random() - 0.5);

      questions.push({
        question: `Which option best matches this ${difficultyLabels[difficulty] || "detail"}? ${sentence}`,
        options,
        correct_index: options.indexOf(correctAnswer),
        explanation: buildIncorrectExplanation(sentence, correctAnswer),
        hint: `Try to match keywords such as "${correctAnswer}" with the question statement.`
      });
    }
  }

  return questions;
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function shuffleQuiz(questions) {
  questions.forEach((q) => {
    if (q.options && q.options.length > 0) {
      const correctText = q.options[q.correct_index];
      const shuffledOpts = [...q.options];
      shuffleArray(shuffledOpts);
      q.options = shuffledOpts;
      q.correct_index = shuffledOpts.indexOf(correctText);
    }
  });
  return shuffleArray(questions);
}

function isQuizRelatedTutorQuestion(rawQuestion) {
  const question = rawQuestion.trim().toLowerCase();
  return question.length > 0;
}

function buildTutorQuizContext(quizData, userAnswers) {
  return quizData
    .map((item, index) => {
      const userAnswerIndex = userAnswers[index];
      const userAnswer =
        userAnswerIndex === null || userAnswerIndex === undefined
          ? "Skipped"
          : item.options[userAnswerIndex] || "Skipped";
      const correctAnswer = item.options[item.correct_index] || "Unknown";
      const status = userAnswerIndex === item.correct_index ? "Correct" : userAnswerIndex === null ? "Skipped" : "Wrong";

      return [
        `Q${index + 1}: ${item.question}`,
        `Options: ${item.options.map((option, optionIndex) => `${optionIndex + 1}. ${option}`).join(" | ")}`,
        `User answer: ${userAnswer}`,
        `Correct answer: ${correctAnswer}`,
        `Status: ${status}`,
        `Hint: ${item.explanation || "Use the correct answer from the question context."}`,
      ].join("\n");
    })
    .join("\n\n");
}

function buildTutorPrompt(rawQuestion, quizData, userAnswers) {
  return `You are a friendly quiz tutor inside a study app.
You can answer questions about this quiz, correct answers, the user's score, or explain any terms or concepts related to the quiz content.
Explain things in the easiest and most simple way possible.
If the user asks about topics completely unrelated to the quiz content, politely steer them back to the quiz.
Keep the answer brief, simple, and engaging. Use 1 to 3 short sentences.
Do not use markdown bullets, tables, or long explanations.

Quiz context:
${buildTutorQuizContext(quizData, userAnswers)}

User question: ${rawQuestion}
`;
}

async function askTutorWithAI(rawQuestion, quizData, userAnswers) {
  try {
    const reply = await callAIProvider(buildTutorPrompt(rawQuestion, quizData, userAnswers));
    return reply.trim();
  } catch (error) {
    console.warn("AI Tutor unavailable:", error);
    return getIncorrectAnswerSummary(quizData, userAnswers);
  }
}
