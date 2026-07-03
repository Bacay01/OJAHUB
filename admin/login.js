// ═══════════════════════════════════════════════════════════
// OJAHUB ADMIN — LOGIN
// admin/login.js
//
// SECURITY MODEL:
//   1. Firebase Auth signs in the user with real credentials
//      (no passwords are ever stored or compared in this file)
//   2. After sign-in, we check Firestore /admins/{uid} to
//      confirm this user is actually an admin — not just any
//      Firebase Auth user (vendors have Auth accounts too)
//   3. If either check fails, we sign out immediately and
//      show an error — no session is stored
// ═══════════════════════════════════════════════════════════

import { auth, db } from "../js/firebase.js";
import {
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js";
import {
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";

// ── Elements ─────────────────────────────────────────────
const form = document.getElementById("adminLoginForm");
const emailEl = document.getElementById("email");
const passwordEl = document.getElementById("password");
const errorBox = document.getElementById("loginError");
const errorText = document.getElementById("loginErrorText");
const loginBtn = document.getElementById("loginBtn");
const btnText = loginBtn.querySelector(".admin-login-btn-text");
const btnSpinner = loginBtn.querySelector(".admin-login-spinner");
const pwToggle = document.getElementById("pwToggle");

// ── Password show/hide ────────────────────────────────────
pwToggle.addEventListener("click", () => {
  const isPassword = passwordEl.type === "password";
  passwordEl.type = isPassword ? "text" : "password";
  pwToggle.innerHTML = isPassword
    ? '<i class="fa-regular fa-eye-slash"></i>'
    : '<i class="fa-regular fa-eye"></i>';
});

// ── UI helpers ────────────────────────────────────────────
function showError(message) {
  errorText.textContent = message;
  errorBox.classList.remove("hidden");
}

function hideError() {
  errorBox.classList.add("hidden");
}

function setLoading(on) {
  loginBtn.disabled = on;
  btnText.classList.toggle("hidden", on);
  btnSpinner.classList.toggle("hidden", !on);
}

// ── Main login handler ────────────────────────────────────
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideError();

  const email = emailEl.value.trim();
  const password = passwordEl.value;

  if (!email || !password) {
    showError("Please enter your email and password.");
    return;
  }

  setLoading(true);

  try {
    // STEP 1 — Firebase Auth credential check
    // (credentials are verified by Firebase servers — never
    //  compared or stored in this file)
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password,
    );
    const user = userCredential.user;

    // STEP 2 — Firestore admin role check
    // Vendors also have Firebase Auth accounts, so passing
    // Auth alone is NOT enough. We verify the uid exists in
    // the /admins collection, which only real admins are in.
    const adminDoc = await getDoc(doc(db, "admin", user.uid));

    if (!adminDoc.exists()) {
      // Valid Firebase Auth user but NOT an admin — reject
      await signOut(auth);
      setLoading(false);
      showError("You are not authorized to access the admin console.");
      return;
    }

    // STEP 3 — Both checks passed. Firebase Auth now holds
    // the session natively (persisted in IndexedDB by the
    // Firebase SDK). We just redirect — admin-auth.js will
    // verify the session on every subsequent page load.
    window.location.href = "index.html";
  } catch (err) {
    setLoading(false);

    // Firebase Auth error codes → friendly messages
    const code = err.code || "";
    if (
      code === "auth/user-not-found" ||
      code === "auth/wrong-password" ||
      code === "auth/invalid-credential"
    ) {
      showError("Invalid email or password.");
    } else if (code === "auth/too-many-requests") {
      showError("Too many attempts. Please wait a few minutes and try again.");
    } else if (code === "auth/network-request-failed") {
      showError("Network error. Please check your connection.");
    } else {
      showError("Sign in failed. Please try again.");
      console.error("[Admin Login]", err);
    }

    passwordEl.value = "";
    passwordEl.focus();
  }
});
