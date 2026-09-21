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
let isProctoredMode = false;
let isShuffled = true;

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

  if (isProctoredMode) {
    $("#quiz-card-content").addClass("d-none");
    $("#proctor-start-screen").removeClass("d-none");

    $("#start-proctored-btn").off("click").on("click", function () {
      enterFullscreen();
      setupProctorListeners(submitQuiz);
      
      $("#proctor-start-screen").addClass("d-none");
      $("#quiz-card-content").removeClass("d-none");
      
      startTimer(timeLimitMinutes);
      showQuestion();
    });

    $("#loading-section").fadeOut(300, function () {
      $("#quiz-section").fadeIn(300);
    });
  } else {
    $("#proctor-start-screen").addClass("d-none");
    $("#quiz-card-content").removeClass("d-none");
    
    startTimer(timeLimitMinutes);

    $("#loading-section").fadeOut(300, function () {
      $("#quiz-section").fadeIn(300);
      showQuestion();
    });
  }
}

function submitQuiz(isAutoSubmit = false) {
  if (quizSubmitted) return;
  quizSubmitted = true;
  stopTimer();
  stopProctorTimer();
  $(document).off("fullscreenchange.proctor");
  $("#proctor-warning-overlay").addClass("d-none");

  if (document.fullscreenElement) {
    document.exitFullscreen().catch((err) => console.log(err));
  }

  $("#submit-btn, #next-btn, #skip-btn").prop("disabled", true);

  if (isAutoSubmit) {
    showStatusMessage("Time is up or proctoring protocol was violated. Submitted automatically.", "warning");
  }

  showResults();
}

function goToNextQuestionOrFinish() {
  if (currentQuestionIndex < quizData.length - 1) {
    currentQuestionIndex++;
    showQuestion();
  } else {
    submitQuiz(false);
  }
}

$(document).ready(function () {
  const savedTheme = localStorage.getItem("theme");
  const preferredTheme =
    savedTheme || (window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  applyTheme(preferredTheme);

  $("#theme-toggle").on("click", function () {
    const currentTheme = document.body.getAttribute("data-theme");
    applyTheme(currentTheme === "dark" ? "light" : "dark");
  });

  let fileParsingPromise = null;

  async function extractTextFromPdf(file) {
    $("#file-name-text").text(`Reading ${file.name}...`);
    $("#file-name-badge").removeClass("d-none");

    const reader = new FileReader();
    return new Promise((resolve, reject) => {
      reader.onload = async function () {
        try {
          const typedarray = new Uint8Array(this.result);
          const pdf = await pdfjsLib.getDocument(typedarray).promise;
          let text = "";
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            let pageText = "";
            let lastY = null;

            for (const item of content.items) {
              if (!item.str) continue;
              const currentY = item.transform ? item.transform[5] : null;

              if (lastY !== null && currentY !== null && Math.abs(currentY - lastY) > 4) {
                pageText += "\n";
              } else if (item.hasEOL) {
                pageText += "\n";
              } else if (pageText.length > 0 && !pageText.endsWith(" ") && !pageText.endsWith("\n")) {
                pageText += " ";
              }

              pageText += item.str;
              if (currentY !== null) lastY = currentY;
            }

            text += `\n--- Page ${i} ---\n` + pageText;
          }

          extractedText = text.trim();
          if (extractedText.length === 0) {
            $("#file-name-text").text(`No text found in ${file.name}`);
            showStatusMessage("No selectable text could be extracted from this PDF. If it is an image/scanned document, please copy and paste the text directly into the text area.", "warning");
          } else {
            $("#file-name-text").text(`${file.name} (${pdf.numPages} ${pdf.numPages === 1 ? "page" : "pages"} loaded)`);
          }
          resolve(extractedText);
        } catch (err) {
          console.error("PDF Parsing Error:", err);
          $("#file-name-text").text(`Error reading ${file.name}`);
          showStatusMessage("Could not read PDF file. Please ensure it is a valid PDF document.", "danger");
          reject(err);
        }
      };

      reader.onerror = (err) => {
        showStatusMessage("Failed to read file.", "danger");
        reject(err);
      };

      reader.readAsArrayBuffer(file);
    });
  }

  function handleFileSelected(file) {
    if (!file) return;
    const fileName = file.name || "uploaded_file";
    const lowerName = fileName.toLowerCase();

    $("#file-name-text").text(fileName);
    $("#file-name-badge").removeClass("d-none");
    extractedText = "";

    if (file.type.includes("text") || lowerName.endsWith(".txt") || lowerName.endsWith(".md") || lowerName.endsWith(".csv")) {
      const reader = new FileReader();
      fileParsingPromise = new Promise((resolve, reject) => {
        reader.onload = (e) => {
          extractedText = (e.target.result || "").trim();
          if (!extractedText) {
            showStatusMessage("Uploaded text file is empty.", "warning");
          }
          resolve(extractedText);
        };
        reader.onerror = (err) => reject(err);
        reader.readAsText(file);
      });
    } else {
      fileParsingPromise = extractTextFromPdf(file);
    }
  }

  $("#file-input").on("change", function (e) {
    handleFileSelected(e.target.files[0]);
  });

  const dropZone = $("#drop-zone");
  dropZone.on("dragover dragenter", function (e) {
    e.preventDefault();
    e.stopPropagation();
    dropZone.addClass("drag-over");
  });

  dropZone.on("dragleave dragend drop", function (e) {
    e.preventDefault();
    e.stopPropagation();
    dropZone.removeClass("drag-over");
  });

  dropZone.on("drop", function (e) {
    const files = e.originalEvent.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelected(files[0]);
    }
  });

  $("#generate-btn").on("click", async function () {
    if (fileParsingPromise) {
      try {
        await fileParsingPromise;
      } catch (err) {
        console.warn("File parsing promise failed:", err);
      }
    }

    const formData = validateForm();
    if (!formData) return;

    clearStatusMessage();
    $("#hero-card").fadeOut(300);
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
        formData.focusArea,
        formData.academicContext,
        formData.syllabusMode
      );
      startQuiz(formData.timeLimit);
    } catch (error) {
      console.error("Quiz generation error:", error);
      showStatusMessage(typeof getApiErrorMessage === "function" ? getApiErrorMessage(error) : (error.message || "Failed to generate quiz."), "danger");
      $("#hero-card").fadeIn(300);
      $("#loading-section").hide();
      $("#input-section").show();
    }
  });

  $("#next-btn").on("click", goToNextQuestionOrFinish);

  $("#skip-btn").on("click", function () {
    skippedQuestions.add(currentQuestionIndex);
    userAnswers[currentQuestionIndex] = null;
    goToNextQuestionOrFinish();
  });

  $("#submit-btn").on("click", function () {
    submitQuiz(false);
  });

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
      thinkingBubble.text(await askTutorWithAI(userQuestion, quizData, userAnswers));
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

    if (isShuffled) {
      quizData = shuffleQuiz(quizData);
      quizExplanations = quizData.map((item) => item.explanation || "");
      quizHints = quizData.map((item) => item.hint || "");
    }

    const timeLimit = Number.parseInt($("#time-limit").val(), 10) || 5;

    if (isProctoredMode) {
      $("#quiz-card-content").addClass("d-none");
      $("#proctor-start-screen").removeClass("d-none");

      $("#start-proctored-btn").off("click").on("click", function () {
        enterFullscreen();
        setupProctorListeners(submitQuiz);
        
        $("#proctor-start-screen").addClass("d-none");
        $("#quiz-card-content").removeClass("d-none");
        
        startTimer(timeLimit);
        showQuestion();
      });

      $("#result-section").fadeOut(300, function () {
        $("#quiz-section").fadeIn(300);
      });
    } else {
      $("#proctor-start-screen").addClass("d-none");
      $("#quiz-card-content").removeClass("d-none");
      
      startTimer(timeLimit);

      $("#result-section").fadeOut(300, function () {
        $("#quiz-section").fadeIn(300);
        showQuestion();
      });
    }
  });

  $("#show-hint-btn").on("click", function () {
    $("#hint-box").removeClass("d-none");
    $("#quiz-feedback-container").removeClass("d-none");
    $(this).addClass("d-none");
  });

  $("#re-enter-fullscreen-btn").on("click", function () {
    enterFullscreen();
  });
});
