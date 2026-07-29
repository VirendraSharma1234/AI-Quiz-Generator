async function callGeminiAPI(prompt) {
  let lastError = null;

  for (const model of GEMINI_MODELS) {
    try {
      const response = await fetch(getGeminiApiUrl(model), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
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

async function generateQuizFromAI(content, count, difficulty, questionType, focusArea, academicContext, isSyllabusMode) {
  let typeRequirement = "";
  if (questionType === "tf") {
    typeRequirement = `Each question MUST be a True/False question. The "options" array must contain exactly ["True", "False"] and "correct_index" must be 0 for True or 1 for False.`;
  } else if (questionType === "mixed") {
    typeRequirement = `You should generate a mix of standard 4-option multiple-choice questions and True/False questions (using exactly ["True", "False"] as options and correct_index 0 or 1).`;
  } else {
    typeRequirement = `Each question MUST be a multiple-choice question with exactly 4 options.`;
  }

  let focusRequirement = "";
  if (focusArea) {
    focusRequirement = `Focus quiz questions specifically on the following topics/area: ${focusArea}.`;
  }

  let academicRequirement = "";
  if (academicContext) {
    const parts = [];
    if (academicContext.topic) parts.push(`Topic/Subject: ${academicContext.topic}`);
    if (academicContext.degree) parts.push(`Degree: ${academicContext.degree}`);
    if (academicContext.branch) parts.push(`Branch/Specialization: ${academicContext.branch}`);
    if (academicContext.year) parts.push(`Academic Year/Semester: ${academicContext.year}`);
    if (parts.length > 0) {
      academicRequirement = `Target Academic Level Context: [${parts.join(" | ")}]. Ensure the questions, terminology, difficulty, and problem complexity match standard university exam questions for a student pursuing this degree and branch.`;
    }
  }

  let syllabusRequirement = "";
  if (isSyllabusMode) {
    syllabusRequirement = `SYLLABUS REFERENCE MODE ENABLED: The provided source material is an academic syllabus. Carefully analyze all modules, units, sub-topics, and learning outcomes in this syllabus, and ensure the generated quiz questions cover main concepts and key units across the entire syllabus scope.`;
  }

  const prompt = `
          Based on the following text and academic parameters, generate a ${difficulty} difficulty quiz with ${count} questions.
          ${typeRequirement}
          ${focusRequirement}
          ${academicRequirement}
          ${syllabusRequirement}

          Return ONLY a valid JSON array of objects. Do not include any markdown formatting or extra text.
          Each object must have:
          "question": "string",
          "options": ["option1", "option2", ...],
          "correct_index": integer (0-indexed representing the correct option),
          "explanation": "short, simple reason for the correct answer",
          "hint": "short, helpful clue or hint to guide the user to the correct choice without revealing it directly"
          
          Text: ${content.substring(0, 15000)}
      `;

  try {
    const rawText = await callGeminiAPI(prompt);
    console.log("AI Raw Response:", rawText);

    const jsonMatch = rawText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error("AI did not return a valid JSON array");
    }

    const parsedQuiz = JSON.parse(jsonMatch[0]);
    return parsedQuiz;
  } catch (error) {
    console.error("Detailed Error:", error);
    if (typeof isQuotaOrAvailabilityError === "function" && isQuotaOrAvailabilityError(error)) {
      const fallbackQuiz = generateQuizLocally(content, count, difficulty, questionType);
      if (typeof showStatusMessage === "function") {
        showStatusMessage("Gemini is unavailable right now, so the app is using the built-in quiz generator.", "warning");
      }
      return fallbackQuiz;
    }
    throw error;
  }
}

function normalizeText(content) {
  return content
    .replace(/\s+/g, " ")
    .replace(/[^\w\s.,;:!?'-]/g, " ")
    .trim();
}

function splitIntoSentences(content) {
  return content
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 35);
}

const STOP_WORDS = new Set([
  "the", "and", "for", "with", "that", "this", "from", "were", "was", "are", "have", "has", "had",
  "but", "not", "you", "your", "they", "their", "there", "about", "into", "when", "what", "which",
  "will", "would", "could", "should", "can", "may", "might", "been", "also", "than", "then", "them",
  "these", "those", "such", "because", "while", "where", "who", "whom", "whose", "our", "out", "over",
  "under", "after", "before", "during", "between", "each", "more", "most", "some", "any", "all", "one",
  "two", "three", "four", "five", "many", "much", "very", "into", "through", "using", "use", "used",
]);

function getKeywordCandidates(content) {
  const words = normalizeText(content)
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, ""))
    .filter((word) => word.length > 3 && !STOP_WORDS.has(word));

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
  const safeCount = Math.max(1, Math.min(count, 20));
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
  if (!question) return false;

  const quizKeywords = [
    "question", "quiz", "answer", "option", "choice", "correct", "wrong",
    "mistake", "incorrect", "review", "skip", "score", "explain",
  ];

  return quizKeywords.some((word) => question.includes(word)) || /\d+/.test(question);
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
Only answer about this quiz and its questions, options, correct answers, user's answers, and score.
If the user asks about anything else, reply exactly: I can only help with this quiz.
Keep the answer very brief, simple, and engaging. Use 1 to 3 short sentences.
Do not use markdown bullets, tables, or long explanations.

Quiz context:
${buildTutorQuizContext(quizData, userAnswers)}

User question: ${rawQuestion}
`;
}

async function askTutorWithAI(rawQuestion, quizData, userAnswers) {
  const reply = await callGeminiAPI(buildTutorPrompt(rawQuestion, quizData, userAnswers));
  return reply.trim();
}
