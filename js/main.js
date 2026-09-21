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
let uploadedPdfBase64 = null;
let uploadedPdfName = "";

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

  function extractTextFromRawPdfBuffer(arrayBuffer) {
    try {
      const decoder = new TextDecoder("latin1");
      const rawStr = decoder.decode(arrayBuffer);
      
      const matches = rawStr.match(/\(([^()\\]|\\[\s\S])*\)/g) || [];
      let extracted = matches
        .map(m => m.slice(1, -1).replace(/\\([0-7]{1,3})/g, (match, octal) => String.fromCharCode(parseInt(octal, 8))).replace(/\\(.)/g, "$1"))
        .filter(str => str.trim().length > 2 && !/^[\d\s]+$/.test(str) && !/^\/[A-Z0-9]+$/i.test(str))
        .join(" ");

      if (extracted.trim().length < 30) {
        const asciiMatches = rawStr.match(/[\x20-\x7E\n\r\t]{5,}/g) || [];
        extracted = asciiMatches
          .filter(str => !/^(obj|endobj|stream|endstream|xref|trailer|startxref|Catalog|Pages|Parent|Type|Font|Length|Filter|FlateDecode)/i.test(str.trim()))
          .join(" ");
      }

      return extracted.replace(/\s+/g, " ").trim();
    } catch (e) {
      console.warn("Raw PDF buffer fallback failed:", e);
      return "";
    }
  }

  async function extractTextFromPdf(file) {
    $("#file-name-text").text(`Parsing ${file.name}...`);
    $("#file-name-badge").removeClass("d-none");

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async function () {
        const arrayBuffer = this.result;
        try {
          const typedarray = new Uint8Array(arrayBuffer);
          
          let pdf;
          try {
            pdf = await pdfjsLib.getDocument({
              data: typedarray,
              cMapUrl: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/cmaps/",
              cMapPacked: true,
              standardFontDataUrl: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/standard_fonts/"
            }).promise;
          } catch (docErr) {
            console.error("pdfjsLib.getDocument error with CMaps:", docErr);
            pdf = await pdfjsLib.getDocument(typedarray).promise;
          }

          let textParts = [];
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            
            let pageStrings = textContent.items
              .map(item => item.str)
              .filter(str => str && str.trim().length > 0);

            if (pageStrings.length > 0) {
              textParts.push(`\n--- Page ${i} ---\n` + pageStrings.join(" "));
            }
          }

          let fullExtractedText = textParts.join("\n").trim();

          if (fullExtractedText.length === 0) {
            console.log("PDF.js returned 0 text items. Running raw PDF binary stream fallback...");
            fullExtractedText = extractTextFromRawPdfBuffer(arrayBuffer);
          }

          extractedText = fullExtractedText;

          if (fullExtractedText.length === 0) {
            const pageCountText = pdf && pdf.numPages ? ` (${pdf.numPages} ${pdf.numPages === 1 ? "page" : "pages"})` : "";
            $("#file-name-text").text(`${file.name}${pageCountText} - Scanned PDF (Gemini OCR Active)`);
            $("#file-name-badge").removeClass("bg-primary-subtle text-primary bg-danger-subtle text-danger").addClass("bg-info-subtle text-info border border-info-subtle");
            showStatusMessage(`Scanned/Image PDF detected for "${file.name}". Gemini Multimodal OCR will read and process the entire document directly!`, "info");
          } else {
            const pageCountText = pdf && pdf.numPages ? ` (${pdf.numPages} ${pdf.numPages === 1 ? "page" : "pages"} loaded)` : "";
            $("#file-name-text").text(`${file.name}${pageCountText}`);
            $("#file-name-badge").removeClass("bg-info-subtle text-info bg-danger-subtle text-danger").addClass("bg-primary-subtle text-primary");
            $("#text-input").val(fullExtractedText);
            showStatusMessage(`Loaded ${file.name} (${fullExtractedText.length} characters extracted).`, "success");
          }

          resolve(fullExtractedText);
        } catch (err) {
          console.error("PDF Parsing Error:", err);
          let rawFallbackText = extractTextFromRawPdfBuffer(arrayBuffer);
          if (rawFallbackText.length > 30) {
            extractedText = rawFallbackText;
            $("#file-name-text").text(`${file.name} (recovered)`);
            $("#text-input").val(rawFallbackText);
            showStatusMessage(`Loaded ${file.name} via raw stream recovery (${rawFallbackText.length} characters).`, "success");
            resolve(rawFallbackText);
          } else {
            $("#file-name-text").text(`Error reading ${file.name}`);
            showStatusMessage(`Failed to read PDF file (${err.message || "Unknown error"}).`, "danger");
            reject(err);
          }
        }
      };

      reader.onerror = (err) => {
        showStatusMessage("Failed to read file.", "danger");
        reject(err);
      };

      reader.readAsArrayBuffer(file);
    });
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result || "";
        const base64 = result.includes(",") ? result.split(",")[1] : result;
        resolve(base64);
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  }

  function handleFileSelected(file) {
    if (!file) return;
    const fileName = file.name || "uploaded_file";
    const lowerName = fileName.toLowerCase();

    $("#file-name-text").text(fileName);
    $("#file-name-badge").removeClass("d-none");

    if (lowerName.endsWith(".txt") || lowerName.endsWith(".md") || lowerName.endsWith(".csv") || file.type.includes("text")) {
      uploadedPdfBase64 = null;
      uploadedPdfName = "";
      const reader = new FileReader();
      fileParsingPromise = new Promise((resolve, reject) => {
        reader.onload = (e) => {
          extractedText = (e.target.result || "").trim();
          $("#text-input").val(extractedText);
          if (!extractedText) {
            showStatusMessage("Uploaded text file is empty.", "warning");
          } else {
            showStatusMessage(`Loaded ${fileName} (${extractedText.length} characters).`, "success");
          }
          resolve(extractedText);
        };
        reader.onerror = (err) => reject(err);
        reader.readAsText(file);
      });
    } else {
      uploadedPdfName = fileName;
      fileToBase64(file).then(b64 => {
        uploadedPdfBase64 = b64;
        console.log("PDF Base64 encoded successfully for native Gemini multimodal analysis");
      }).catch(err => console.warn("Base64 conversion failed:", err));
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
        formData.syllabusMode,
        formData.pdfBase64 || uploadedPdfBase64
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
