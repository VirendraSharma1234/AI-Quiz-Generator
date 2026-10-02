// ==============================================================
// QUIZWEE AI - AUTHENTICATION, LANDING GATE & ADMIN CONTROLLER
// ==============================================================

const AUTH_CONFIG = {
  TOKEN_KEY: "quizwee_auth_token",
  USER_KEY: "quizwee_auth_user",
  API_BASE: "" // Relative to host
};

// Use sessionStorage so fresh page visits ALWAYS display the landing page
function getAuthToken() {
  return sessionStorage.getItem(AUTH_CONFIG.TOKEN_KEY);
}

function getAuthUser() {
  try {
    const raw = sessionStorage.getItem(AUTH_CONFIG.USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function setAuthSession(token, user) {
  if (token) sessionStorage.setItem(AUTH_CONFIG.TOKEN_KEY, token);
  if (user) sessionStorage.setItem(AUTH_CONFIG.USER_KEY, JSON.stringify(user));
  applyUserState();
}

function clearAuthSession() {
  sessionStorage.removeItem(AUTH_CONFIG.TOKEN_KEY);
  sessionStorage.removeItem(AUTH_CONFIG.USER_KEY);
  // Also clean any legacy persistent storage
  localStorage.removeItem(AUTH_CONFIG.TOKEN_KEY);
  localStorage.removeItem(AUTH_CONFIG.USER_KEY);
  applyUserState();
}

function isLoggedIn() {
  return !!getAuthToken() && !!getAuthUser();
}

function isAdmin() {
  const user = getAuthUser();
  return user && user.role === "admin";
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Client-Side Validation Helpers
function isValidEmail(email) {
  if (!email || typeof email !== "string") return false;
  const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return re.test(email.trim()) && email.length <= 254;
}

function isValidName(name) {
  if (!name || typeof name !== "string") return false;
  const re = /^[a-zA-Z\s.'-]{2,60}$/;
  return re.test(name.trim());
}

function clearValidationErrors() {
  $(".auth-input").removeClass("is-invalid");
}

// -------------------------------------------------------------
// STATE MANAGER: GATEKEEPER & ROLE-BASED UI
// -------------------------------------------------------------

function applyUserState() {
  const user = getAuthUser();
  const loggedIn = isLoggedIn();
  const admin = isAdmin();

  // 1. Update Navbar Auth widget
  updateNavbarAuth(user, admin);

  // 2. Control Layout Visibility
  if (!loggedIn) {
    // Logged Out: Show full landing hero & showcase, lock quiz generator, hide admin section
    $("#landing-hero-container").removeClass("d-none");
    $("#landing-auth-box").removeClass("d-none");
    $("#gated-locked-container").removeClass("d-none");
    $("#user-welcome-banner").addClass("d-none");
    $("#quiz-generator-wrapper").addClass("d-none");
    $("#admin-section").addClass("d-none");
  } else if (admin) {
    // Admin Logged In: Hide landing hero & lock, show welcome banner, quiz generator & admin section
    $("#landing-hero-container").addClass("d-none");
    $("#landing-auth-box").addClass("d-none");
    $("#gated-locked-container").addClass("d-none");
    $("#user-welcome-banner").removeClass("d-none");
    $("#quiz-generator-wrapper").removeClass("d-none");
    $("#admin-section").removeClass("d-none");

    const initial = user && user.name ? user.name.charAt(0).toUpperCase() : "A";
    $("#banner-user-avatar").text(initial);
    $("#welcome-user-name").text(user.name || "Administrator");
    $("#welcome-user-role-badge")
      .text("ADMIN")
      .removeClass("bg-primary-subtle text-primary")
      .addClass("admin-badge-indicator");

    loadAdminDashboard();
  } else {
    // Student/Educator Logged In: Hide landing hero & lock, show welcome banner & quiz generator
    $("#landing-hero-container").addClass("d-none");
    $("#landing-auth-box").addClass("d-none");
    $("#gated-locked-container").addClass("d-none");
    $("#user-welcome-banner").removeClass("d-none");
    $("#quiz-generator-wrapper").removeClass("d-none");
    $("#admin-section").addClass("d-none");

    const initial = user && user.name ? user.name.charAt(0).toUpperCase() : "S";
    const firstName = user && user.name ? user.name.split(" ")[0] : "Student";
    $("#banner-user-avatar").text(initial);
    $("#welcome-user-name").text(firstName);
    $("#welcome-user-role-badge")
      .text((user && user.role ? user.role : "student").toUpperCase())
      .removeClass("admin-badge-indicator")
      .addClass("bg-primary-subtle text-primary");
  }
}

function updateNavbarAuth(user, admin) {
  const container = $("#auth-nav-container");
  if (!container.length) return;

  if (user && user.name) {
    const initial = user.name.charAt(0).toUpperCase();
    const displayName = user.name.split(" ")[0];
    const roleBadge = admin ? '<span class="admin-badge-indicator ms-1">ADMIN</span>' : "";

    container.html(`
      <div class="dropdown" id="user-profile-dropdown">
        <button class="btn user-profile-btn dropdown-toggle d-flex align-items-center gap-2" type="button" data-bs-toggle="dropdown" aria-expanded="false">
          <span class="user-avatar-badge">${initial}</span>
          <span class="user-name-text d-none d-md-inline fw-semibold">${escapeHtml(displayName)}</span>
          ${roleBadge}
        </button>
        <ul class="dropdown-menu dropdown-menu-end user-dropdown-menu shadow-lg border-0 py-2">
          <li class="px-3 py-2 border-bottom user-menu-header">
            <div class="fw-bold text-truncate">${escapeHtml(user.name)}</div>
            <div class="small text-muted text-truncate">${escapeHtml(user.email)}</div>
          </li>
          ${admin ? `
          <li>
            <button class="dropdown-item d-flex align-items-center gap-2 py-2 fw-semibold text-primary" id="nav-open-admin-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              Admin Dashboard
            </button>
          </li>
          ` : ""}
          <li>
            <button class="dropdown-item d-flex align-items-center gap-2 py-2" id="view-history-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              My Quiz History
            </button>
          </li>
          <li><hr class="dropdown-divider my-1"></li>
          <li>
            <button class="dropdown-item text-danger d-flex align-items-center gap-2 py-2" id="logout-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
              Sign Out
            </button>
          </li>
        </ul>
      </div>
    `);

    $("#logout-btn").on("click", function () {
      clearAuthSession();
      if (typeof showStatusMessage === "function") {
        showStatusMessage("Signed out successfully.", "info");
      }
      $("html, body").animate({ scrollTop: 0 }, 300);
    });

    $("#view-history-btn").on("click", function () {
      openHistoryModal();
    });

    $("#nav-open-admin-btn").on("click", function () {
      $("html, body").animate({ scrollTop: $("#admin-section").offset().top - 80 }, 400);
    });
  } else {
    container.html(`
      <button id="open-auth-modal-btn" class="btn btn-primary btn-sm px-3 rounded-pill fw-semibold d-flex align-items-center gap-1.5 shadow-sm" type="button">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        <span>Sign In / Register</span>
      </button>
    `);

    $("#open-auth-modal-btn").on("click", function () {
      if (!$("#landing-hero-container").hasClass("d-none") && $("#auth-email-input").length) {
        $("html, body").animate({ scrollTop: $("#landing-auth-box").offset().top - 80 }, 400);
        $("#auth-email-input").focus();
      } else {
        openAuthModal("login");
      }
    });
  }
}

// -------------------------------------------------------------
// AUTH MODAL & FORM SWITCHER
// -------------------------------------------------------------

let currentAuthMode = "login"; // 'login' | 'register' | 'admin'

function openAuthModal(mode = "login") {
  const modalEl = document.getElementById("authModal");
  if (!modalEl) return;

  switchAuthTab(mode);
  purgeAllFormAutofill(true);
  clearAuthAlert();
  clearValidationErrors();

  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
  modal.show();
}

function closeAuthModal() {
  const modalEl = document.getElementById("authModal");
  if (modalEl) {
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();
  }
}

function switchAuthTab(tab) {
  currentAuthMode = tab;
  clearAuthAlert();
  clearValidationErrors();

  $(".auth-tab-btn").removeClass("active");

  // Always reset fields to empty when switching tabs - no hardcoded credentials!
  $("#auth-email-input, #modal-auth-email-input").val("").removeData("user-typing");
  $("#auth-password-input, #modal-auth-password-input").val("").removeData("user-typing");
  $("#auth-name-input, #modal-auth-name-input").val("").removeData("user-typing");
  $("#auth-confirm-input, #modal-auth-confirm-input").val("").removeData("user-typing");

  if (tab === "register") {
    $("#auth-tab-register, #modal-tab-register").addClass("active");
    $("#auth-name-group, #modal-name-group").removeClass("d-none");
    $("#auth-confirm-group, #modal-confirm-group").removeClass("d-none");
    $("#auth-email-input, #modal-auth-email-input").attr("placeholder", "Enter your email address");
    $("#auth-password-input, #modal-auth-password-input").attr("placeholder", "Create password (min 6 characters)");
    $("#auth-confirm-input, #modal-auth-confirm-input").attr("placeholder", "Confirm your password");
    $(".auth-submit-btn-text").text("Create Free Account");
    $(".auth-modal-title-text").text("Create Your Account");
    $(".auth-switch-prompt").html('Already have an account? <a href="#" class="switch-to-login text-primary fw-semibold text-decoration-none">Sign In</a>');
  } else if (tab === "admin") {
    $("#auth-tab-admin, #modal-tab-admin").addClass("active");
    $("#auth-name-group, #modal-name-group").addClass("d-none");
    $("#auth-confirm-group, #modal-confirm-group").addClass("d-none");
    // Clean placeholders - zero pre-filled credentials!
    $("#auth-email-input, #modal-auth-email-input").attr("placeholder", "Enter administrator email");
    $("#auth-password-input, #modal-auth-password-input").attr("placeholder", "Enter administrator password");
    $(".auth-submit-btn-text").text("Enter Admin Portal");
    $(".auth-modal-title-text").text("Admin Access Portal");
    $(".auth-switch-prompt").html('Not an admin? <a href="#" class="switch-to-login text-primary fw-semibold text-decoration-none">Student Sign In</a>');
  } else {
    // Default 'login'
    $("#auth-tab-login, #modal-tab-login").addClass("active");
    $("#auth-name-group, #modal-name-group").addClass("d-none");
    $("#auth-confirm-group, #modal-confirm-group").addClass("d-none");
    $("#auth-email-input, #modal-auth-email-input").attr("placeholder", "Enter your email address");
    $("#auth-password-input, #modal-auth-password-input").attr("placeholder", "Enter your password");
    $(".auth-submit-btn-text").text("Sign In");
    $(".auth-modal-title-text").text("Sign In to Quizwee AI");
    $(".auth-switch-prompt").html('Don\'t have an account? <a href="#" class="switch-to-register text-primary fw-semibold text-decoration-none">Sign Up</a> | <a href="#" class="switch-to-admin text-secondary text-decoration-none">Admin Login</a>');
  }

  $(document).off("click", ".switch-to-login").on("click", ".switch-to-login", (e) => { e.preventDefault(); switchAuthTab("login"); });
  $(document).off("click", ".switch-to-register").on("click", ".switch-to-register", (e) => { e.preventDefault(); switchAuthTab("register"); });
  $(document).off("click", ".switch-to-admin").on("click", ".switch-to-admin", (e) => { e.preventDefault(); switchAuthTab("admin"); });
}

function showAuthAlert(message, type = "danger", isModal = false) {
  const alertEl = isModal ? $("#modal-auth-alert") : $("#auth-alert");
  $("#auth-alert, #modal-auth-alert")
    .removeClass("d-none alert-danger alert-success alert-warning alert-info")
    .addClass(`alert-${type}`)
    .text(message);
  alertEl.removeClass("d-none");
}

function clearAuthAlert() {
  $("#auth-alert, #modal-auth-alert")
    .addClass("d-none")
    .removeClass("alert-danger alert-success alert-warning alert-info")
    .text("");
}

// -------------------------------------------------------------
// SUBMIT AUTH FORM (HANDLES EMBEDDED CARD & MODAL WITH VALIDATION)
// -------------------------------------------------------------

let consecutiveFailedAttempts = 0;
let lockoutTimer = null;

async function handleAuthSubmission(formEl) {
  clearAuthAlert();
  clearValidationErrors();

  if (lockoutTimer) {
    return showAuthAlert("Security cooldown active. Please wait a moment before trying again.", "warning");
  }

  const isModal = $(formEl).attr("id") === "modal-auth-form";
  const prefix = isModal ? "#modal-" : "#";

  const emailInput = $(`${prefix}auth-email-input`);
  const passwordInput = $(`${prefix}auth-password-input`);
  const nameInput = $(`${prefix}auth-name-input`);
  const confirmInput = $(`${prefix}auth-confirm-input`);

  const email = (emailInput.val() || "").trim();
  const password = passwordInput.val() || "";
  const name = (nameInput.val() || "").trim();
  const confirmPassword = confirmInput.val() || "";

  // Client-Side Validation
  if (currentAuthMode === "register") {
    if (!name) {
      nameInput.addClass("is-invalid").focus();
      return showAuthAlert("Please enter your full name.", "danger", isModal);
    }
    if (!isValidName(name)) {
      nameInput.addClass("is-invalid").focus();
      return showAuthAlert("Please enter a valid full name (2–60 characters, letters only).", "danger", isModal);
    }
    if (!email) {
      emailInput.addClass("is-invalid").focus();
      return showAuthAlert("Please enter your email address.", "danger", isModal);
    }
    if (!isValidEmail(email)) {
      emailInput.addClass("is-invalid").focus();
      return showAuthAlert("Please enter a valid email address (e.g. name@domain.com).", "danger", isModal);
    }
    if (!password || password.length < 6) {
      passwordInput.addClass("is-invalid").focus();
      return showAuthAlert("Password must be at least 6 characters long.", "danger", isModal);
    }
    if (password !== confirmPassword) {
      confirmInput.addClass("is-invalid").focus();
      return showAuthAlert("Passwords do not match. Please verify your password confirmation.", "danger", isModal);
    }
  } else {
    // login or admin
    if (!email) {
      emailInput.addClass("is-invalid").focus();
      return showAuthAlert("Please enter your email address.", "danger", isModal);
    }
    if (!isValidEmail(email)) {
      emailInput.addClass("is-invalid").focus();
      return showAuthAlert("Please enter a valid email format.", "danger", isModal);
    }
    if (!password) {
      passwordInput.addClass("is-invalid").focus();
      return showAuthAlert("Please enter your password.", "danger", isModal);
    }
    if (password.length < 6) {
      passwordInput.addClass("is-invalid").focus();
      return showAuthAlert("Password must be at least 6 characters.", "danger", isModal);
    }
  }

  const isRegister = currentAuthMode === "register";
  const endpoint = isRegister ? "/api/auth/register" : "/api/auth/login";
  const payload = isRegister ? { name, email, password } : { email, password };

  const submitBtn = $(formEl).find('button[type="submit"]');
  const spinner = submitBtn.find(".spinner-border");

  submitBtn.prop("disabled", true);
  spinner.removeClass("d-none");

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      consecutiveFailedAttempts++;
      if (consecutiveFailedAttempts >= 5) {
        let remainingSeconds = 30;
        submitBtn.prop("disabled", true);
        showAuthAlert(`Too many failed attempts. Security cooldown active for ${remainingSeconds}s.`, "warning", isModal);

        lockoutTimer = setInterval(() => {
          remainingSeconds--;
          if (remainingSeconds <= 0) {
            clearInterval(lockoutTimer);
            lockoutTimer = null;
            consecutiveFailedAttempts = 0;
            submitBtn.prop("disabled", false);
            clearAuthAlert();
          } else {
            showAuthAlert(`Too many failed attempts. Security cooldown active for ${remainingSeconds}s.`, "warning", isModal);
          }
        }, 1000);
      }
      throw new Error(data.message || "Authentication failed. Please verify your credentials.");
    }

    // Reset failed counter on success
    consecutiveFailedAttempts = 0;

    setAuthSession(data.token, data.user);
    showAuthAlert(data.message || "Success!", "success", isModal);

    setTimeout(() => {
      closeAuthModal();
      if (typeof showStatusMessage === "function") {
        showStatusMessage(`Welcome, ${data.user.name}! ${data.user.role === "admin" ? "Admin database console active." : "Quiz generator unlocked."}`, "success");
      }
      if (data.user.role === "admin") {
        $("html, body").animate({ scrollTop: $("#admin-section").offset().top - 80 }, 400);
      } else {
        $("html, body").animate({ scrollTop: $("#user-welcome-banner").offset().top - 80 }, 400);
      }
    }, 400);
  } catch (error) {
    console.error("Auth Error:", error);
    showAuthAlert(error.message || "Server error. Please verify your details.", "danger", isModal);
  } finally {
    if (!lockoutTimer) {
      submitBtn.prop("disabled", false);
    }
    spinner.addClass("d-none");
  }
}

// -------------------------------------------------------------
// ADMIN PANEL DATA CONTROLLER
// -------------------------------------------------------------

async function loadAdminDashboard() {
  if (!isAdmin()) return;

  const token = getAuthToken();

  // 1. Fetch Overview Stats
  try {
    const statsRes = await fetch("/api/admin/overview", {
      headers: { "Authorization": `Bearer ${token}` }
    });
    const statsData = await statsRes.json();
    if (statsData.success && statsData.stats) {
      $("#admin-stat-users").text(statsData.stats.totalUsers);
      $("#admin-stat-quizzes").text(statsData.stats.totalQuizzes);
      $("#admin-stat-db").text(statsData.stats.database);
    }
  } catch (err) {
    console.warn("Failed to load admin stats:", err);
  }

  // 2. Load Users Directory
  loadAdminUsersList();

  // 3. Load Quiz Logs
  loadAdminQuizHistoryList();
}

async function loadAdminUsersList() {
  const token = getAuthToken();
  const tableBody = $("#admin-users-table-body");
  tableBody.html('<tr><td colspan="7" class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm me-2"></div>Loading MongoDB users...</td></tr>');

  try {
    const res = await fetch("/api/admin/users", {
      headers: { "Authorization": `Bearer ${token}` }
    });
    const data = await res.json();

    if (!data.success || !data.users || data.users.length === 0) {
      tableBody.html('<tr><td colspan="7" class="text-center py-3 text-muted">No registered users found.</td></tr>');
      return;
    }

    const currentAdmin = getAuthUser();
    const rows = data.users.map((u, i) => {
      const dateStr = u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "Recent";
      const roleBadge = u.role === "admin" 
        ? '<span class="badge admin-badge-indicator">ADMIN</span>' 
        : '<span class="badge bg-primary-subtle text-primary">STUDENT</span>';
      
      const isSelf = currentAdmin && (currentAdmin.id === u._id || currentAdmin.id === u.id || currentAdmin.email === u.email);

      return `
        <tr>
          <td class="fw-semibold text-muted">${i + 1}</td>
          <td><strong>${escapeHtml(u.name)}</strong></td>
          <td class="text-muted">${escapeHtml(u.email)}</td>
          <td>${roleBadge}</td>
          <td><span class="badge bg-secondary-subtle text-secondary">${u.quizzes_taken || 0}</span></td>
          <td class="text-muted small">${dateStr}</td>
          <td>
            ${isSelf ? '<span class="text-muted small fw-semibold">Current User</span>' : `
            <button class="btn btn-sm btn-outline-danger py-1 px-2.5 rounded-pill delete-user-btn" data-id="${u._id || u.id}" title="Delete User">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              <span class="d-none d-sm-inline ms-1">Delete</span>
            </button>
            `}
          </td>
        </tr>
      `;
    }).join("");

    tableBody.html(rows);

    $(".delete-user-btn").off("click").on("click", async function () {
      const userId = $(this).data("id");
      if (confirm("Are you sure you want to delete this user and their quiz history?")) {
        try {
          const delRes = await fetch(`/api/admin/users/${userId}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
          });
          const delData = await delRes.json();
          if (delData.success) {
            loadAdminDashboard();
          } else {
            alert(delData.message || "Failed to delete user.");
          }
        } catch (e) {
          alert("Error deleting user.");
        }
      }
    });
  } catch (err) {
    tableBody.html('<tr><td colspan="7" class="text-center py-3 text-danger">Failed to load users from database.</td></tr>');
  }
}

async function loadAdminQuizHistoryList() {
  const token = getAuthToken();
  const tableBody = $("#admin-quizzes-table-body");
  tableBody.html('<tr><td colspan="6" class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm me-2"></div>Loading quiz logs...</td></tr>');

  try {
    const res = await fetch("/api/admin/quiz-history", {
      headers: { "Authorization": `Bearer ${token}` }
    });
    const data = await res.json();

    if (!data.success || !data.history || data.history.length === 0) {
      tableBody.html('<tr><td colspan="6" class="text-center py-3 text-muted">No quiz logs recorded yet.</td></tr>');
      return;
    }

    const rows = data.history.map((q, i) => {
      const dateStr = q.createdAt ? new Date(q.createdAt).toLocaleDateString() : "Recent";
      const userName = q.userId?.name || "Student";
      const scoreBadge = q.scorePercent >= 70 ? "bg-success" : q.scorePercent >= 40 ? "bg-warning" : "bg-danger";

      return `
        <tr>
          <td class="fw-semibold text-muted">${i + 1}</td>
          <td><strong>${escapeHtml(userName)}</strong></td>
          <td>${escapeHtml(q.topic || "General Assessment")}</td>
          <td><span class="badge ${scoreBadge} rounded-pill">${q.scorePercent}%</span></td>
          <td>${q.correctCount}/${q.totalQuestions}</td>
          <td class="text-muted small">${dateStr}</td>
        </tr>
      `;
    }).join("");

    tableBody.html(rows);
  } catch (err) {
    tableBody.html('<tr><td colspan="6" class="text-center py-3 text-danger">Failed to load quiz attempts.</td></tr>');
  }
}

// -------------------------------------------------------------
// QUIZ RESULT AUTO-SYNCING TO MONGODB
// -------------------------------------------------------------

async function syncQuizResultToDatabase(quizDetails) {
  if (!isLoggedIn()) return;

  const token = getAuthToken();
  try {
    const response = await fetch("/api/quiz/save-result", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(quizDetails)
    });

    const data = await response.json();
    if (data.success) {
      console.log("Quiz progress automatically saved to MongoDB:", data.data);
    }
  } catch (err) {
    console.warn("Failed to sync quiz to database:", err);
  }
}

// -------------------------------------------------------------
// QUIZ HISTORY MODAL
// -------------------------------------------------------------

async function openHistoryModal() {
  const modalEl = document.getElementById("historyModal");
  if (!modalEl) return;

  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
  modal.show();

  const container = $("#history-list-container");
  container.html('<div class="text-center py-4"><div class="spinner-border text-primary" role="status"></div><div class="mt-2 text-muted">Loading your quiz history...</div></div>');

  try {
    const token = getAuthToken();
    const response = await fetch("/api/quiz/my-history", {
      headers: { "Authorization": `Bearer ${token}` }
    });

    const res = await response.json();
    if (!res.success || !res.data || res.data.length === 0) {
      container.html('<div class="text-center py-5 text-muted"><div class="fs-1 mb-2">📚</div><div>No quiz history recorded yet. Complete a quiz to view your performance logs!</div></div>');
      return;
    }

    const itemsHtml = res.data.map((item) => {
      const dateStr = new Date(item.createdAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric"
      });
      const badgeClass = item.scorePercent >= 70 ? "bg-success" : item.scorePercent >= 40 ? "bg-warning" : "bg-danger";

      return `
        <div class="history-item-card p-3 mb-2 rounded-3 border d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div>
            <div class="fw-bold fs-6">${escapeHtml(item.topic || "Quiz Assessment")}</div>
            <div class="small text-muted">Date: ${dateStr} • ${item.correctCount}/${item.totalQuestions} Correct (${item.submissionType})</div>
          </div>
          <div>
            <span class="badge ${badgeClass} fs-6 px-3 py-2 rounded-pill">${item.scorePercent}%</span>
          </div>
        </div>
      `;
    }).join("");

    container.html(itemsHtml);
  } catch (err) {
    container.html('<div class="alert alert-danger">Failed to fetch quiz history. Please try again.</div>');
  }
}

// -------------------------------------------------------------
// VERIFY SESSION ON STARTUP
// -------------------------------------------------------------

async function verifySessionOnStartup() {
  const token = getAuthToken();
  if (!token) return;

  try {
    const res = await fetch("/api/auth/me", {
      headers: { "Authorization": `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.success && data.user) {
      sessionStorage.setItem(AUTH_CONFIG.USER_KEY, JSON.stringify(data.user));
      applyUserState();
    } else {
      clearAuthSession();
    }
  } catch (err) {
    console.warn("Session startup verification skipped:", err);
  }
}

// -------------------------------------------------------------
// INITIALIZATION & AUTOFILL SUPPRESSION
// -------------------------------------------------------------

function purgeAllFormAutofill(force = false) {
  const selectors = [
    "#auth-email-input",
    "#auth-password-input",
    "#auth-name-input",
    "#auth-confirm-input",
    "#modal-auth-email-input",
    "#modal-auth-password-input",
    "#modal-auth-name-input",
    "#modal-auth-confirm-input"
  ];
  selectors.forEach(function (sel) {
    const el = $(sel);
    if (el.length && (force || !el.data("user-typing"))) {
      el.val("");
    }
  });
}

$(document).ready(function () {
  // Wipe any old lingering localStorage keys so fresh visitors always see the landing page
  localStorage.removeItem(AUTH_CONFIG.TOKEN_KEY);
  localStorage.removeItem(AUTH_CONFIG.USER_KEY);

  // Apply initial user state (gatekeeping, role visibility)
  applyUserState();
  verifySessionOnStartup();

  // Wipe inputs immediately and on staggered intervals to intercept any delayed browser autofill
  purgeAllFormAutofill(true);
  [30, 80, 160, 300, 600, 1000].forEach((delay) => {
    setTimeout(() => purgeAllFormAutofill(false), delay);
  });
  window.addEventListener("pageshow", () => purgeAllFormAutofill(false));
  window.addEventListener("load", () => purgeAllFormAutofill(false));

  // Mark field as user-typed so delayed clear timers don't wipe active user input
  $(document).on("input keydown", ".auth-input", function () {
    $(this).data("user-typing", true);
    $(this).removeClass("is-invalid");
    clearAuthAlert();
  });

  // Modal open listener to ensure fresh inputs
  $("#authModal").on("show.bs.modal shown.bs.modal", function () {
    purgeAllFormAutofill(true);
  });

  // Embedded Landing Auth Form handler
  $("#auth-form").on("submit", function (e) {
    e.preventDefault();
    handleAuthSubmission(this);
  });

  // Modal Auth Form handler
  $("#modal-auth-form").on("submit", function (e) {
    e.preventDefault();
    handleAuthSubmission(this);
  });

  // Tab switcher clicks
  $("#auth-tab-login, #modal-tab-login").on("click", () => switchAuthTab("login"));
  $("#auth-tab-register, #modal-tab-register").on("click", () => switchAuthTab("register"));
  $("#auth-tab-admin, #modal-tab-admin").on("click", () => switchAuthTab("admin"));

  // Prompt CTA clicks
  $("#unlock-signin-cta-btn").on("click", function () {
    switchAuthTab("login");
    $("html, body").animate({ scrollTop: $("#landing-auth-box").offset().top - 80 }, 400);
    $("#auth-email-input").focus();
  });

  $("#unlock-register-cta-btn").on("click", function () {
    switchAuthTab("register");
    $("html, body").animate({ scrollTop: $("#landing-auth-box").offset().top - 80 }, 400);
    $("#auth-name-input").focus();
  });

  // Welcome banner shortcut buttons
  $("#banner-history-btn").on("click", function () {
    openHistoryModal();
  });

  $("#banner-create-btn").on("click", function () {
    $("html, body").animate({ scrollTop: $("#input-section").offset().top - 80 }, 300);
    $("#text-input").focus();
  });

  // Refresh admin console
  $("#refresh-admin-btn").on("click", function () {
    loadAdminDashboard();
  });

  // Password visibility toggle handler
  $(document).on("click", ".password-toggle-btn", function () {
    const targetSelector = $(this).attr("data-target");
    const input = $(targetSelector);
    if (!input.length) return;
    const isPassword = input.attr("type") === "password";
    input.attr("type", isPassword ? "text" : "password");
    $(this).html(
      isPassword
        ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`
        : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`
    );
  });

  // Admin search filter handler
  $("#admin-search-users").on("input", function () {
    const q = $(this).val().toLowerCase().trim();
    $("#admin-users-table-body tr").each(function () {
      const text = $(this).text().toLowerCase();
      $(this).toggle(text.indexOf(q) > -1);
    });
    $("#admin-quizzes-table-body tr").each(function () {
      const text = $(this).text().toLowerCase();
      $(this).toggle(text.indexOf(q) > -1);
    });
  });
});
