$(document).ready(function () {
  
  const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];

  function getGeminiApiUrl(model) {
    return `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
  }

  let quizData = [];
  let currentQuestionIndex = 0;
  let userAnswers = [];
  let skippedQuestions = new Set();
  let extractedText = "";
  let timerInterval = null;
  let timeRemainingSeconds = 0;
  let quizSubmitted = false;
  let quizExplanations = [];
  let quizHints = [];
  let isPracticeMode = false;
  let isShuffled = true;

  function clearFieldErrors() {
    $("#file-input, #text-input, #question-count, #time-limit, #focus-area").removeClass("is-invalid");
  }

  function showStatusMessage(message, variant = "danger") {
    $("#status-message")
      .removeClass("d-none alert-danger alert-warning alert-success")
      .addClass(`alert-${variant}`)
      .text(message);
  }

  function clearStatusMessage() {
    $("#status-message").addClass("d-none").removeClass("alert-danger alert-warning alert-success").text("");
  }

  function validateForm() {
    clearFieldErrors();

    const textInput = $("#text-input").val().trim();
    const count = Number.parseInt($("#question-count").val(), 10);
    const timeLimit = Number.parseInt($("#time-limit").val(), 10);
    const difficulty = $("#difficulty").val();
    const questionType = $("#question-type").val() || "mcq";
    const focusArea = $("#focus-area").val().trim() || "";
    const shuffleSettings = $("#shuffle-settings").is(":checked");
    const practiceMode = $("#practice-mode").is(":checked");
    const finalContent = textInput || extractedText;

    if (!finalContent) {
      $("#file-input, #text-input").addClass("is-invalid");
      showStatusMessage("Please upload a PDF/text file or paste some text before generating a quiz.", "warning");
      return null;
    }

    if (!Number.isInteger(count) || count < 1 || count > 20) {
      $("#question-count").addClass("is-invalid");
      showStatusMessage("Question count must be between 1 and 20.", "warning");
      return null;
    }

    if (!Number.isInteger(timeLimit) || timeLimit < 1 || timeLimit > 180) {
      $("#time-limit").addClass("is-invalid");
      showStatusMessage("Time limit must be between 1 and 180 minutes.", "warning");
      return null;
    }

    clearStatusMessage();
    return { finalContent, count, timeLimit, difficulty, questionType, focusArea, shuffleSettings, practiceMode };
  }

  function getApiErrorMessage(error, fallbackMessage = "Network Connection unstable problem. Please try again in a moment.") {
    if (!error) return fallbackMessage;
    if (typeof error === "string" && error.trim()) return `${fallbackMessage} (${error.trim()})`;
    if (error.message && error.message.trim()) return `${fallbackMessage} (${error.message.trim()})`;
    return fallbackMessage;
  }

  function isQuotaOrAvailabilityError(error) {
    const message = (error?.message || String(error || "")).toLowerCase();
    return [
      "quota", "rate limit", "429", "resource exhausted",
      "too many requests", "service unavailable", "temporarily unavailable", "network unstable",
    ].some((flag) => message.includes(flag));
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

  function buildTutorQuizContext() {
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

  function buildTutorPrompt(rawQuestion) {
    return `You are a friendly quiz tutor inside a study app.
Only answer about this quiz and its questions, options, correct answers, user's answers, and score.
If the user asks about anything else, reply exactly: I can only help with this quiz.
Keep the answer very brief, simple, and engaging. Use 1 to 3 short sentences.
Do not use markdown bullets, tables, or long explanations.

Quiz context:
${buildTutorQuizContext()}

User question: ${rawQuestion}
`;
  }

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

  async function askTutorWithAI(rawQuestion) {
    const reply = await callGeminiAPI(buildTutorPrompt(rawQuestion));
    return reply.trim();
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

  function applyTheme(theme) {
    const nextTheme = theme === "dark" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", nextTheme);
    localStorage.setItem("theme", nextTheme);

    const isDark = nextTheme === "dark";
    $("#theme-toggle")
      .attr("aria-label", isDark ? "Switch to light theme" : "Switch to dark theme")
      .find(".theme-toggle-icon")
      .text(isDark ? "☀️" : "🌙")
      .end()
      .find(".theme-toggle-text")
      .text(isDark ? "Light" : "Dark");
  }

  const savedTheme = localStorage.getItem("theme");
  const preferredTheme =
    savedTheme || (window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  applyTheme(preferredTheme);

  $("#theme-toggle").on("click", function () {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    applyTheme(currentTheme === "dark" ? "light" : "dark");
  });

  $("#file-input").on("change", function (e) {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type === "text/plain") {
      const reader = new FileReader();
      reader.onload = (e) => (extractedText = e.target.result);
      reader.readAsText(file);
    } else if (file.type === "application/pdf") {
      const reader = new FileReader();
      reader.onload = async function () {
        const typedarray = new Uint8Array(this.result);
        const pdf = await pdfjsLib.getDocument(typedarray).promise;
        let text = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          text += content.items.map((item) => item.str).join(" ") + "\n";
        }
        extractedText = text;
      };
      reader.readAsArrayBuffer(file);
    }
  });

  $("#generate-btn").on("click", async function () {
    const formData = validateForm();
    if (!formData) return;

    clearStatusMessage();
    $("#input-section").fadeOut(300, function () {
      $("#loading-section").fadeIn(300);
    });

    try {
      isShuffled = formData.shuffleSettings;
      isPracticeMode = formData.practiceMode;
      isProctoredMode = formData.proctoredMode;

      quizData = await generateQuizFromAI(
        formData.finalContent,
        formData.count,
        formData.difficulty,
        formData.questionType,
        formData.focusArea
      );
      startQuiz(formData.timeLimit);
    } catch (error) {
      console.error(error);
      showStatusMessage(getApiErrorMessage(error), "danger");
      $("#loading-section").hide();
      $("#input-section").show();
    }
  });

  async function generateQuizFromAI(content, count, difficulty, questionType, focusArea) {
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

    const prompt = `
            Based on the following text, generate a ${difficulty} difficulty quiz with ${count} questions.
            ${typeRequirement}
            ${focusRequirement}

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
      if (isQuotaOrAvailabilityError(error)) {
        const fallbackQuiz = generateQuizLocally(content, count, difficulty, questionType);
        showStatusMessage("Gemini is unavailable right now, so the app is using the built-in quiz generator.", "warning");
        return fallbackQuiz;
      }
      throw error;
    }
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

  function startQuiz(timeLimitMinutes) {
    currentQuestionIndex = 0;
    
    if (isShuffled) {
      quizData = shuffleQuiz(quizData);
    }
    
    quizExplanations = quizData.map((item) => item.explanation || "");
    quizHints = quizData.map((item) => item.hint || "");
    
    userAnswers = new Array(quizData.length).fill(null);
    skippedQuestions.clear();
    quizSubmitted = false;

    startTimer(timeLimitMinutes);

    $("#loading-section").fadeOut(300, function () {
      $("#quiz-section").fadeIn(300);
      showQuestion();
    });
  }

  function formatTime(seconds) {
    const safeSeconds = Math.max(0, seconds);
    const minutes = Math.floor(safeSeconds / 60).toString().padStart(2, "0");
    const remainingSeconds = (safeSeconds % 60).toString().padStart(2, "0");
    return `${minutes}:${remainingSeconds}`;
  }

  function updateTimerDisplay() {
    $("#time-remaining").text(`Time Left: ${formatTime(timeRemainingSeconds)}`);
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function startTimer(timeLimitMinutes) {
    stopTimer();
    timeRemainingSeconds = Math.max(1, timeLimitMinutes) * 60;
    updateTimerDisplay();

    timerInterval = setInterval(function () {
      timeRemainingSeconds -= 1;
      updateTimerDisplay();

      if (timeRemainingSeconds <= 0) {
        submitQuiz(true);
      }
    }, 1000);
  }

  function submitQuiz(isAutoSubmit = false) {
    if (quizSubmitted) return;
    quizSubmitted = true;
    stopTimer();

    $("#submit-btn, #next-btn, #skip-btn").prop("disabled", true);

    if (isAutoSubmit) {
      showStatusMessage("Time is up. Submitted automatically.", "warning");
    }

    showResults();
  }

  function renderNavGrid() {
    const grid = $("#question-nav-grid");
    grid.empty();
    
    quizData.forEach((_, idx) => {
      let stateClass = "";
      if (idx === currentQuestionIndex) {
        stateClass = "active";
      } else if (userAnswers[idx] !== null) {
        stateClass = "answered";
      } else if (skippedQuestions.has(idx)) {
        stateClass = "skipped";
      }
      
      const btn = $(`<div class="nav-btn ${stateClass}">${idx + 1}</div>`);
      btn.on("click", function () {
        currentQuestionIndex = idx;
        showQuestion();
      });
      grid.append(btn);
    });
  }

  function showImmediateFeedback(q, selectedIndex) {
    $(".quiz-option").addClass("disabled-option");
    
    $(".quiz-option").each(function () {
      const idx = $(this).data("index");
      if (idx === q.correct_index) {
        $(this).addClass("correct-choice");
      } else if (idx === selectedIndex) {
        $(this).addClass("incorrect-choice");
      }
    });
    
    $("#explanation-text").text(q.explanation || "No explanation provided.");
    $("#explanation-box").removeClass("d-none");
    $("#quiz-feedback-container").removeClass("d-none");
    $("#show-hint-btn").addClass("d-none");
  }

  function showQuestion() {
    const q = quizData[currentQuestionIndex];

    $("#question-progress").text(`Question ${currentQuestionIndex + 1} of ${quizData.length}`);
    $("#progress-bar").css("width", `${((currentQuestionIndex + 1) / quizData.length) * 100}%`);
    $("#question-text").text(q.question);

    renderNavGrid();

    $("#quiz-feedback-container").addClass("d-none");
    $("#hint-box").addClass("d-none");
    $("#explanation-box").addClass("d-none");
    $("#show-hint-btn").addClass("d-none");

    const savedAnswer = userAnswers[currentQuestionIndex];
    const optionsHtml = q.options
      .map((opt, idx) => {
        const isSelected = savedAnswer === idx;
        return `<div class="quiz-option ${isSelected ? 'selected' : ''}" data-index="${idx}">${opt}</div>`;
      })
      .join("");

    $("#options-container").hide().html(optionsHtml).fadeIn(200);
    $("#next-btn")
      .prop("disabled", savedAnswer === null)
      .text(currentQuestionIndex === quizData.length - 1 ? "Finish Quiz" : "Next Question");
    $("#skip-btn").prop("disabled", savedAnswer !== null);
    $("#submit-btn").prop("disabled", false);

    if (savedAnswer !== null && isPracticeMode) {
      showImmediateFeedback(q, savedAnswer);
    } else if (isPracticeMode && q.hint) {
      $("#hint-text").text(q.hint);
      $("#show-hint-btn").removeClass("d-none");
    }

    $(".quiz-option").on("click", function () {
      if (isPracticeMode && userAnswers[currentQuestionIndex] !== null) {
        return;
      }

      $(".quiz-option").removeClass("selected");
      $(this).addClass("selected");
      const selectedIndex = $(this).data("index");
      userAnswers[currentQuestionIndex] = selectedIndex;
      skippedQuestions.delete(currentQuestionIndex);
      $("#next-btn").prop("disabled", false);
      $("#skip-btn").prop("disabled", true);
      renderNavGrid();

      if (isPracticeMode) {
        showImmediateFeedback(q, selectedIndex);
      }
    });
  }

  function goToNextQuestionOrFinish() {
    if (currentQuestionIndex < quizData.length - 1) {
      currentQuestionIndex++;
      showQuestion();
    } else {
      submitQuiz(false);
    }
  }

  $("#next-btn").on("click", goToNextQuestionOrFinish);

  $("#skip-btn").on("click", function () {
    skippedQuestions.add(currentQuestionIndex);
    userAnswers[currentQuestionIndex] = null;
    goToNextQuestionOrFinish();
  });

  $("#submit-btn").on("click", function () {
    submitQuiz(false);
  });

  function renderReviewAccordion() {
    const accordion = $("#review-accordion");
    accordion.empty();
    
    quizData.forEach((q, idx) => {
      const userAnswerIndex = userAnswers[idx];
      const correctIndex = q.correct_index;
      const isCorrect = userAnswerIndex === correctIndex;
      const isSkipped = userAnswerIndex === null;
      
      let statusText = "";
      let statusClass = "";
      let statusIcon = "";
      
      if (isSkipped) {
        statusText = "Skipped";
        statusClass = "text-secondary";
        statusIcon = "⬜";
      } else if (isCorrect) {
        statusText = "Correct";
        statusClass = "text-success";
        statusIcon = "✅";
      } else {
        statusText = "Incorrect";
        statusClass = "text-danger";
        statusIcon = "❌";
      }
      
      const optionsHtml = q.options.map((opt, optIdx) => {
        let optClass = "";
        if (optIdx === correctIndex) {
          optClass = "correct";
        } else if (optIdx === userAnswerIndex && !isCorrect) {
          optClass = "incorrect";
        }
        
        return `<div class="review-option-item ${optClass}">${opt}</div>`;
      }).join("");
      
      const itemHtml = $(`
        <div class="review-item">
          <div class="review-header d-flex align-items-center justify-content-between">
            <span class="fw-bold text-truncate" style="max-width: 80%;">${idx + 1}. ${q.question}</span>
            <span class="${statusClass} fw-bold ms-2">${statusIcon} ${statusText}</span>
          </div>
          <div class="review-body" style="display: none;">
            <p class="mb-3 fw-semibold">${q.question}</p>
            <div class="review-options mb-3">
              ${optionsHtml}
            </div>
            <div class="review-explanation">
              <strong>Explanation:</strong> ${q.explanation || "No explanation provided."}
            </div>
          </div>
        </div>
      `);
      
      itemHtml.find(".review-header").on("click", function () {
        $(this).next(".review-body").slideToggle(200);
      });
      
      accordion.append(itemHtml);
    });
  }

  function showResults() {
    stopTimer();

    let correct = 0, incorrect = 0, unattempted = 0;
    userAnswers.forEach((ans, idx) => {
      if (ans === null) unattempted++;
      else if (ans === quizData[idx].correct_index) correct++;
      else incorrect++;
    });

    const scorePercent = Math.round((correct / quizData.length) * 100);
    $("#res-correct").text(correct);
    $("#res-incorrect").text(incorrect);
    $("#res-unattempted").text(unattempted);
    $("#final-percentage").text(`${scorePercent}%`);

    renderReviewAccordion();

    $("#quiz-section").fadeOut(300, function () {
      $("#result-section").fadeIn(300);
      initializeTutorChat();
    });
  }

  function initializeTutorChat() {
    $("#tutor-chat-log").empty();

    const introMessage = quizExplanations.length
      ? "I can explain your incorrect answers in simple words. Try: 'show my mistakes', 'which ones were wrong?', or 'why was question 2 wrong?'"
      : "I can explain your quiz results in simple words. Try asking about a question number or your mistakes.";

    appendTutorMessage("assistant", introMessage);
    renderTutorQuickPrompts();
    $("#tutor-question-input").val("");
    $("#tutor-send-btn").prop("disabled", false);
  }

  function renderTutorQuickPrompts() {
    $("#tutor-chat-log").prepend(`
      <div class="tutor-prompts mb-3">
        <button type="button" class="btn btn-sm btn-outline-secondary tutor-prompt" data-prompt="show my mistakes">Show my mistakes</button>
        <button type="button" class="btn btn-sm btn-outline-secondary tutor-prompt" data-prompt="which ones were wrong?">Which ones were wrong?</button>
        <button type="button" class="btn btn-sm btn-outline-secondary tutor-prompt" data-prompt="why was question 1 wrong?">Why question 1?</button>
      </div>
    `);
  }

  function appendTutorMessage(role, message) {
    const bubbleClass = role === "assistant" ? "tutor-bubble assistant" : "tutor-bubble user";
    $("#tutor-chat-log").append($("<div></div>").addClass(bubbleClass).text(message));
    const logElement = $("#tutor-chat-log");
    logElement.scrollTop(logElement[0].scrollHeight);
  }

  function getIncorrectAnswerSummary() {
    const incorrectItems = quizData
      .map((item, index) => ({ index, item, answer: userAnswers[index] }))
      .filter((entry) => entry.answer !== null && entry.answer !== entry.item.correct_index);

    if (!incorrectItems.length) {
      return "You didn’t miss any questions. That’s a strong result.";
    }

    return incorrectItems
      .map((entry) => {
        const chosenAnswer = entry.item.options[entry.answer] || "your selected answer";
        const correctAnswer = entry.item.options[entry.item.correct_index] || "the correct answer";
        const reason = entry.item.explanation || "It matches the clue in the question.";
        return `Q${entry.index + 1}: you chose ${chosenAnswer}, but ${correctAnswer} is correct because ${reason}`;
      })
      .join(" ");
  }

  function answerTutorQuestionLocally(rawQuestion) {
    const question = rawQuestion.trim().toLowerCase();

    if (!question) {
      return "Type a short question like 'show my mistakes' or 'why was question 3 wrong?'";
    }

    const asksForMistakes = [
      "mistake", "mistakes", "wrong", "incorrect", "missed", "review", "summary", "all",
    ].some((word) => question.includes(word));

    if (asksForMistakes) {
      return getIncorrectAnswerSummary();
    }

    const questionMatch = question.match(/(?:question|q)\s*(\d+)/) || question.match(/(\d+)\s*(?:question|q)?/);
    if (questionMatch) {
      const questionNumber = Number.parseInt(questionMatch[1], 10);
      const quizIndex = questionNumber - 1;

      if (!Number.isInteger(questionNumber) || quizIndex < 0 || quizIndex >= quizData.length) {
        return "I can only explain questions from this quiz. Try a question number that was actually asked.";
      }

      const quizItem = quizData[quizIndex];
      const chosenIndex = userAnswers[quizIndex];
      const chosenText = chosenIndex === null ? "no answer" : quizItem.options[chosenIndex];
      const correctText = quizItem.options[quizItem.correct_index];
      const reason = quizItem.explanation || "The correct choice fits the clue in the question.";

      if (chosenIndex === quizItem.correct_index) {
        return `Q${questionNumber}: correct. ${correctText} fits best because ${reason}`;
      }
      if (chosenIndex === null) {
        return `Q${questionNumber}: you skipped it. ${correctText} is the right one because ${reason}`;
      }
      return `Q${questionNumber}: not quite. You picked ${chosenText}, but ${correctText} is right because ${reason}`;
    }

    return "I can help with 'show my mistakes' or with a question number, like 'why was question 2 wrong?'";
  }

  $("#tutor-send-btn").on("click", async function () {
    const userQuestion = $("#tutor-question-input").val().trim();
    if (!userQuestion) return;

    appendTutorMessage("user", userQuestion);
    $("#tutor-question-input").val("");
    $("#tutor-send-btn").prop("disabled", true);

    if (!isQuizRelatedTutorQuestion(userQuestion)) {
      appendTutorMessage("assistant", "I can only help with this quiz and its questions.");
      $("#tutor-send-btn").prop("disabled", false);
      return;
    }

    const thinkingBubble = $("<div></div>").addClass("tutor-bubble assistant").text("Thinking...");
    $("#tutor-chat-log").append(thinkingBubble);

    try {
      thinkingBubble.text(await askTutorWithAI(userQuestion));
    } catch (error) {
      console.error("Tutor API error:", error);
      thinkingBubble.text(answerTutorQuestionLocally(userQuestion));
    } finally {
      $("#tutor-send-btn").prop("disabled", false);
    }
  });

  $(document).on("click", ".tutor-prompt", function () {
    $("#tutor-question-input").val($(this).data("prompt"));
    $("#tutor-send-btn").trigger("click");
  });

  $("#tutor-question-input").on("keydown", function (event) {
    if (event.key === "Enter") {
      event.preventDefault();
      $("#tutor-send-btn").trigger("click");
    }
  });

  $("#restart-quiz-btn").on("click", function () {
    location.reload();
  });

  $("#reattempt-quiz-btn").on("click", function () {
    currentQuestionIndex = 0;
    userAnswers = new Array(quizData.length).fill(null);
    skippedQuestions.clear();
    quizSubmitted = false;

    // Reshuffle if configured
    if (isShuffled) {
      quizData = shuffleQuiz(quizData);
      quizExplanations = quizData.map((item) => item.explanation || "");
      quizHints = quizData.map((item) => item.hint || "");
    }

    const timeLimit = Number.parseInt($("#time-limit").val(), 10) || 5;
    startTimer(timeLimit);

    $("#result-section").fadeOut(300, function () {
      $("#quiz-section").fadeIn(300);
      showQuestion();
    });
  });

  $("#show-hint-btn").on("click", function () {
    $("#hint-box").removeClass("d-none");
    $("#quiz-feedback-container").removeClass("d-none");
    $(this).addClass("d-none");
  });

  // Auth Functions and State Management
  function checkAuthState() {
    const userStr = localStorage.getItem("quiz_user");
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        $("#user-display-name").text(user.name);
        $("#auth-section").addClass("d-none");
        $("#user-header").removeClass("d-none").addClass("d-flex");
        $("#dashboard-section").removeClass("d-none");
      } catch (e) {
        localStorage.removeItem("quiz_user");
        showAuthScreen();
      }
    } else {
      showAuthScreen();
    }
  }

  function showAuthScreen() {
    $("#auth-section").removeClass("d-none");
    $("#user-header").removeClass("d-flex").addClass("d-none");
    $("#dashboard-section").addClass("d-none");
  }

  function showAuthStatus(message, variant = "danger") {
    $("#auth-status-message")
      .removeClass("d-none alert-danger alert-warning alert-success")
      .addClass(`alert-${variant}`)
      .text(message);
  }

  function clearAuthStatus() {
    $("#auth-status-message").addClass("d-none").text("");
  }

  // Toggle Auth Tabs
  $("#tab-login").on("click", function () {
    clearAuthStatus();
    $("#tab-login").addClass("active-tab").removeClass("text-muted");
    $("#tab-register").removeClass("active-tab").addClass("text-muted");
    $("#login-form").removeClass("d-none");
    $("#register-form").addClass("d-none");
  });

  $("#tab-register").on("click", function () {
    clearAuthStatus();
    $("#tab-register").addClass("active-tab").removeClass("text-muted");
    $("#tab-login").removeClass("active-tab").addClass("text-muted");
    $("#register-form").removeClass("d-none");
    $("#login-form").addClass("d-none");
  });

  // Handle Login Form Submission
  $("#login-form").on("submit", async function (e) {
    e.preventDefault();
    clearAuthStatus();
    $("#login-email, #login-password").removeClass("is-invalid");

    const email = $("#login-email").val().trim();
    const password = $("#login-password").val();
    let isValid = true;

    // Client-side validation: Email
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      $("#login-email").addClass("is-invalid");
      $("#login-email-feedback").text("Email address is required.");
      isValid = false;
    } else if (!emailPattern.test(email)) {
      $("#login-email").addClass("is-invalid");
      $("#login-email-feedback").text("Please enter a valid email address.");
      isValid = false;
    }

    // Client-side validation: Password
    if (!password) {
      $("#login-password").addClass("is-invalid");
      $("#login-password-feedback").text("Password is required.");
      isValid = false;
    } else if (password.length < 6) {
      $("#login-password").addClass("is-invalid");
      $("#login-password-feedback").text("Password must be at least 6 characters.");
      isValid = false;
    }

    if (!isValid) return;

    try {
      const response = await fetch("login.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Login failed.");
      }

      localStorage.setItem("quiz_user", JSON.stringify(data.user));
      checkAuthState();
      $("#login-email").val("");
      $("#login-password").val("");
    } catch (err) {
      showAuthStatus(err.message, "danger");
    }
  });

  // Clear validation styles on user input
  $("#login-email").on("input keyup", function () {
    $(this).removeClass("is-invalid");
  });

  $("#login-password").on("input keyup", function () {
    $(this).removeClass("is-invalid");
  });

  // Handle Registration Form Submission
  $("#register-form").on("submit", async function (e) {
    e.preventDefault();
    clearAuthStatus();
    const name = $("#register-name").val().trim();
    const email = $("#register-email").val().trim();
    const password = $("#register-password").val();

    try {
      const response = await fetch("register.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Registration failed.");
      }

      // Auto login after successful signup
      localStorage.setItem("quiz_user", JSON.stringify(data.user));
      checkAuthState();
      $("#register-name").val("");
      $("#register-email").val("");
      $("#register-password").val("");
    } catch (err) {
      showAuthStatus(err.message, "danger");
    }
  });

  // Handle View Users List
  $("#view-users-btn").on("click", async function () {
    const tableBody = $("#users-table-body");
    tableBody.html(`
      <tr>
        <td colspan="4" class="text-center py-4">
          <div class="spinner-border text-primary spinner-border-sm" role="status"></div>
          <span class="ms-2">Loading database table...</span>
        </td>
      </tr>
    `);

    const modal = new bootstrap.Modal(document.getElementById("users-list-modal"));
    modal.show();

    try {
      const response = await fetch("get_users.php");
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to load users list.");
      }

      tableBody.empty();
      if (data.users.length === 0) {
        tableBody.html(`
          <tr>
            <td colspan="4" class="text-center py-4 text-muted">No users registered in the database.</td>
          </tr>
        `);
        return;
      }

      data.users.forEach((user) => {
        const shortHash = user.password.length > 25 ? user.password.substring(0, 25) + "..." : user.password;
        const row = $(`
          <tr style="border-bottom: 1px solid var(--border);">
            <td class="py-3 fw-bold">${user.id}</td>
            <td class="py-3">${user.name}</td>
            <td class="py-3 text-muted">${user.email}</td>
            <td class="py-3 font-monospace text-muted small" title="${user.password}">${shortHash}</td>
          </tr>
        `);
        tableBody.append(row);
      });
    } catch (err) {
      tableBody.html(`
        <tr>
          <td colspan="4" class="text-center py-3 text-danger fw-semibold">Error: ${err.message}</td>
        </tr>
      `);
    }
  });

  // Handle Logout Button
  $("#logout-btn").on("click", function () {
    localStorage.removeItem("quiz_user");
    location.reload();
  });

  
  checkAuthState();
});