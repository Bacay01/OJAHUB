// 🔥 FIREBASE AUTH
import { auth } from "../../js/firebase.js";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js";

// 🔥 FIRESTORE
import {
  getFirestore,
  collection,
  getDocs,
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";

const db = getFirestore();

// 🔥 DOM
const loginForm = document.getElementById("loginForm");
const loginPassword = document.getElementById("loginPassword");
const toggleLoginPassword = document.getElementById("toggleLoginPassword");
const forgotPasswordLink = document.getElementById("forgotPasswordLink");
const message = document.getElementById("message");

// 🐵 MONKEY — big display above card (mirrors typing state)
const monkeyDisplay = document.getElementById("monkeyDisplay");
const passwordWrap = document.getElementById("passwordWrap");

let keysHeld = 0;

if (loginPassword) {
  // Key down → cover both monkeys immediately
  loginPassword.addEventListener("keydown", () => {
    keysHeld++;
    if (monkeyDisplay) monkeyDisplay.classList.add("typing");
    if (passwordWrap) passwordWrap.classList.add("pw-typing");
  });

  // Key up → uncover when all keys released
  loginPassword.addEventListener("keyup", () => {
    keysHeld = Math.max(0, keysHeld - 1);
    if (keysHeld === 0) {
      if (monkeyDisplay) monkeyDisplay.classList.remove("typing");
      if (passwordWrap) passwordWrap.classList.remove("pw-typing");
    }
  });

  // Blur → always uncover
  loginPassword.addEventListener("blur", () => {
    keysHeld = 0;
    if (monkeyDisplay) monkeyDisplay.classList.remove("typing");
    if (passwordWrap) passwordWrap.classList.remove("pw-typing");
  });
}

// 🐵 TOGGLE BUTTON — peek / hide
if (toggleLoginPassword && loginPassword && passwordWrap) {
  toggleLoginPassword.addEventListener("click", () => {
    const isPassword = loginPassword.type === "password";
    loginPassword.type = isPassword ? "text" : "password";
    passwordWrap.classList.toggle("pw-visible", isPassword);
  });
}

// 🔥 LOGIN
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value.trim();

    if (!email || !password) {
      showMessage("Please fill all fields", "red");
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const user = userCredential.user;

      const snapshot = await getDocs(collection(db, "vendors"));

      let currentVendor = null;

      snapshot.forEach((item) => {
        const data = item.data();
        if ((data.email || "").toLowerCase() === user.email.toLowerCase()) {
          currentVendor = data;
        }
      });

      if (currentVendor) {
        localStorage.setItem(
          "currentuser",
          JSON.stringify({
            ...currentVendor,
            uid: user.uid,
          }),
        );
      } else {
        localStorage.setItem(
          "currentuser",
          JSON.stringify({
            email: user.email,
            businessName: "Unknown Vendor",
            uid: user.uid,
          }),
        );
      }

      showMessage("Login successful ✓", "green");

      setTimeout(() => {
        window.location.href = "../dashboard/dashboard.html";
      }, 800);
    } catch (error) {
      console.error(error);
      showMessage("Invalid email or password", "red");
    }
  });
}

// 🔥 FORGOT PASSWORD
if (forgotPasswordLink) {
  forgotPasswordLink.addEventListener("click", async (e) => {
    e.preventDefault();

    const email = document.getElementById("loginEmail").value.trim();

    if (!email) {
      showMessage("Enter your email first", "red");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      showMessage("Reset link sent to your email ✓", "green");
    } catch (error) {
      console.error(error);
      showMessage(error.message, "red");
    }
  });
}

// 🔥 MESSAGE FUNCTION
function showMessage(text, color) {
  if (message) {
    message.textContent = text;
    message.style.color = color;
  }
}
