// ═══════════════════════════════════════════════════════════
// OJAHUB ADMIN — LOGIN
// admin/login.js
//
// Mock credential check for now. When ready to go live with
// Firebase, replace the checkCredentials() function body with
// a real signInWithEmailAndPassword() call — everything else
// (session storage, redirect, error handling) stays the same.
// ═══════════════════════════════════════════════════════════

// ── Mock credentials (replace with Firebase Auth later) ────
const ADMIN_EMAIL = "admin@ojahub.com";
const ADMIN_PASSWORD = "@@OJAbutterfy@@";

// ── Elements ─────────────────────────────────────────────
const form = document.getElementById("adminLoginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const errorBox = document.getElementById("loginError");
const errorText = document.getElementById("loginErrorText");
const loginBtn = document.getElementById("loginBtn");
const btnText = loginBtn.querySelector(".admin-login-btn-text");
const btnSpinner = loginBtn.querySelector(".admin-login-spinner");
const pwToggle = document.getElementById("pwToggle");

// ── If already logged in, skip straight to dashboard ────
if (sessionStorage.getItem("ojahub_admin_session") === "active") {
  window.location.href = "index.html";
}

// ── Password show/hide toggle ───────────────────────────
pwToggle.addEventListener("click", () => {
  const isPassword = passwordInput.type === "password";
  passwordInput.type = isPassword ? "text" : "password";
  pwToggle.innerHTML = isPassword
    ? '<i class="fa-regular fa-eye-slash"></i>'
    : '<i class="fa-regular fa-eye"></i>';
});

// ── Mock credential check ───────────────────────────────
// Swap this out for real Firebase Auth when ready:
//   const cred = await signInWithEmailAndPassword(auth, email, password);
function checkCredentials(email, password) {
  return (
    email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase() &&
    password === ADMIN_PASSWORD
  );
}

function showError(message) {
  errorText.textContent = message;
  errorBox.classList.remove("hidden");
}

function hideError() {
  errorBox.classList.add("hidden");
}

function setLoading(isLoading) {
  loginBtn.disabled = isLoading;
  btnText.classList.toggle("hidden", isLoading);
  btnSpinner.classList.toggle("hidden", !isLoading);
}

// ── Submit handler ───────────────────────────────────────
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideError();

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    showError("Please enter both email and password.");
    return;
  }

  setLoading(true);

  // Simulate a brief network delay so the spinner is visible
  // (remove this artificial delay once using real Firebase Auth)
  await new Promise((resolve) => setTimeout(resolve, 500));

  const isValid = checkCredentials(email, password);

  if (!isValid) {
    setLoading(false);
    showError("Invalid email or password.");
    passwordInput.value = "";
    passwordInput.focus();
    return;
  }

  // ── Success: store session + redirect ──────────────────
  sessionStorage.setItem("ojahub_admin_session", "active");
  sessionStorage.setItem("ojahub_admin_email", email);
  sessionStorage.setItem("ojahub_admin_login_time", Date.now().toString());

  window.location.href = "index.html";
});
