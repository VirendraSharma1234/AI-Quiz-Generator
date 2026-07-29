let proctorTimer = null;
let proctorCountdownVal = 5;

function enterFullscreen() {
  const docElm = document.documentElement;
  if (docElm.requestFullscreen) {
    docElm.requestFullscreen().catch((err) => {
      console.warn("Fullscreen request rejected:", err);
    });
  }
}

function setupProctorListeners(onViolationSubmit) {
  $(document).off("fullscreenchange.proctor");
  $(document).on("fullscreenchange.proctor", function () {
    if (!document.fullscreenElement && typeof quizSubmitted !== "undefined" && !quizSubmitted) {
      triggerProctorAlert(onViolationSubmit);
    } else {
      dismissProctorAlert();
    }
  });
}

function triggerProctorAlert(onViolationSubmit) {
  stopProctorTimer();
  $("#proctor-warning-overlay").removeClass("d-none");
  proctorCountdownVal = 5;
  $("#proctor-countdown").text(proctorCountdownVal);

  proctorTimer = setInterval(function () {
    proctorCountdownVal -= 1;
    $("#proctor-countdown").text(proctorCountdownVal);
    if (proctorCountdownVal <= 0) {
      stopProctorTimer();
      $("#proctor-warning-overlay").addClass("d-none");
      if (typeof onViolationSubmit === "function") {
        onViolationSubmit(true);
      } else if (typeof submitQuiz === "function") {
        submitQuiz(true);
      }
    }
  }, 1000);
}

function dismissProctorAlert() {
  stopProctorTimer();
  $("#proctor-warning-overlay").addClass("d-none");
}

function stopProctorTimer() {
  if (proctorTimer) {
    clearInterval(proctorTimer);
    proctorTimer = null;
  }
}
