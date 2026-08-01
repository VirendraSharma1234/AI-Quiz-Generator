function applyTheme(theme) {
  const nextTheme = theme === "dark" ? "dark" : "light";
  document.body.setAttribute("data-theme", nextTheme);
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

function clearFieldErrors() {
  $("#file-input, #text-input, #question-count, #time-limit, #focus-area, #academic-topic").removeClass("is-invalid");
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
  const syllabusMode = $("#syllabus-mode").is(":checked");
  const practiceMode = $("#practice-mode").is(":checked");
  const proctoredMode = $("#proctored-mode").is(":checked");

  const academicTopic = $("#academic-topic").val().trim() || "";
  const academicDegree = $("#academic-degree").val().trim() || "";
  const academicBranch = $("#academic-branch").val().trim() || "";
  const academicYear = $("#academic-year").val().trim() || "";

  const finalContent = textInput || extractedText;

  if (!finalContent && !academicTopic) {
    $("#file-input, #text-input, #academic-topic").addClass("is-invalid");
    showStatusMessage("Please upload a PDF/text file, paste text, or enter an Academic Topic to generate a quiz.", "warning");
    return null;
  }

  const sourceContent = finalContent || `Topic: ${academicTopic}. Degree: ${academicDegree}. Branch: ${academicBranch}. Year: ${academicYear}.`;

  if (!Number.isInteger(count) || count < 1 || count > 100) {
    $("#question-count").addClass("is-invalid");
    showStatusMessage("Question count must be between 1 and 100.", "warning");
    return null;
  }

  if (!Number.isInteger(timeLimit) || timeLimit < 1 || timeLimit > 180) {
    $("#time-limit").addClass("is-invalid");
    showStatusMessage("Time limit must be between 1 and 180 minutes.", "warning");
    return null;
  }

  clearStatusMessage();
  return {
    finalContent: sourceContent,
    count,
    timeLimit,
    difficulty,
    questionType,
    focusArea,
    shuffleSettings,
    syllabusMode,
    practiceMode,
    proctoredMode,
    academicContext: { topic: academicTopic, degree: academicDegree, branch: academicBranch, year: academicYear },
  };
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

  const optionLetters = ["A", "B", "C", "D", "E", "F"];
  const savedAnswer = userAnswers[currentQuestionIndex];
  const optionsHtml = q.options
    .map((opt, idx) => {
      const isSelected = savedAnswer === idx;
      const letter = optionLetters[idx] || (idx + 1);
      return `<div class="quiz-option ${isSelected ? 'selected' : ''}" data-index="${idx}">
        <span class="option-badge">${letter}</span>
        <span class="option-text">${opt}</span>
      </div>`;
    })
    .join("");

  $("#options-container").hide().html(optionsHtml).fadeIn(200);
  $("#next-btn")
    .prop("disabled", savedAnswer === null)
    .text(currentQuestionIndex === quizData.length - 1 ? "Finish Quiz" : "Next Question");
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
    renderNavGrid();

    if (isPracticeMode) {
      showImmediateFeedback(q, selectedIndex);
    }
  });
}

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
      statusIcon = "[Skipped]";
    } else if (isCorrect) {
      statusText = "Correct";
      statusClass = "text-success";
      statusIcon = "[Correct]";
    } else {
      statusText = "Incorrect";
      statusClass = "text-danger";
      statusIcon = "[Incorrect]";
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
          <span class="${statusClass} fw-bold ms-2">${statusText}</span>
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
