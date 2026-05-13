// 🔥 IMPORTS
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js";
import {
  getFirestore,
  doc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js";

// 🔥 FIREBASE CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyAZRPoc-FkbdQ8ZNSkGIYFukU1TG-FJF6s",
  authDomain: "ojahub-c10d9.firebaseapp.com",
  projectId: "ojahub-c10d9",
  storageBucket: "ojahub-c10d9.firebasestorage.app",
  messagingSenderId: "896902243220",
  appId: "1:896902243220:web:7259724fe7865c281aa581",
};

// 🔥 INIT
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// 🐵 MONKEY PASSWORD TOGGLE
const passwordInput = document.getElementById("password");
const toggleBtn = document.getElementById("togglePassword");
const wrap = document.querySelector(".password-wrap");

let keysHeld = 0;

if (passwordInput && toggleBtn && wrap) {
  // Key pressed → cover eyes immediately
  passwordInput.addEventListener("keydown", () => {
    keysHeld++;
    wrap.classList.add("pw-typing");
  });

  // Key released → uncover as soon as no keys are held
  passwordInput.addEventListener("keyup", () => {
    keysHeld = Math.max(0, keysHeld - 1);
    if (keysHeld === 0) {
      wrap.classList.remove("pw-typing");
    }
  });

  // Safety: if focus leaves the field, always uncover
  passwordInput.addEventListener("blur", () => {
    keysHeld = 0;
    wrap.classList.remove("pw-typing");
  });

  // Click → peek / hide
  toggleBtn.addEventListener("click", () => {
    const isPassword = passwordInput.type === "password";
    passwordInput.type = isPassword ? "text" : "password";
    wrap.classList.toggle("pw-visible", isPassword);
  });
}

// 📁 FILE INPUT LABEL UPDATE
const fileInput = document.getElementById("imageFile");
const fileText = document.querySelector(".file-text");

if (fileInput && fileText) {
  fileInput.addEventListener("change", () => {
    fileText.textContent = fileInput.files[0]
      ? fileInput.files[0].name
      : "Choose image file";
  });
}

// 🔥 FORM SUBMIT
const form = document.getElementById("signupForm");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  try {
    // 📥 GET INPUTS
    const businessName = document.getElementById("businessName").value;
    const ownerName = document.getElementById("ownerName").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const phone = document.getElementById("phone").value;
    const whatsapp = document.getElementById("whatsapp").value;
    const category = document.getElementById("category").value;
    const description = document.getElementById("description").value;
    const city = document.getElementById("city").value;
    const state = document.getElementById("state").value;
    const address = document.getElementById("address").value;

    const file = document.getElementById("imageFile").files[0];

    // 🔥 CLOUDINARY UPLOAD
    let imageUrl = "";

    if (!file) {
      alert("Please upload a business image");
      return;
    }

    console.log("Uploading image...");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "ojahub_upload");

    try {
      const res = await fetch(
        "https://api.cloudinary.com/v1_1/ds3zdc11c/image/upload",
        {
          method: "POST",
          body: formData,
        },
      );

      const data = await res.json();
      console.log("Cloudinary response:", data);

      if (!data.secure_url) {
        alert("Image upload failed. Try again.");
        return;
      }

      imageUrl = data.secure_url;
    } catch (error) {
      console.error("Image upload error:", error);
      alert("Something went wrong uploading image");
      return;
    }

    // 🔥 CREATE AUTH USER
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password,
    );
    const user = userCredential.user;

    // 🔥 SAVE TO FIRESTORE (LINKED WITH UID)
    await setDoc(doc(db, "vendors", user.uid), {
      businessName,
      ownerName,
      email,
      phone,
      whatsapp,
      category,
      description,
      city,
      state,
      address,
      imageUrl,
      createdAt: new Date(),
    });

    alert("Signup successful 🚀");
    form.reset();

    window.location.href = "../dashboard/dashboard.html";
  } catch (error) {
    console.error(error);
    alert(error.message);
  }
});

// 🔥 AUTO SAVE FORM DATA
const inputs = document.querySelectorAll(
  "#signupForm input, #signupForm textarea, #signupForm select",
);

inputs.forEach((input) => {
  input.addEventListener("input", () => {
    localStorage.setItem(input.id, input.value);
  });
});

// 🔥 LOAD SAVED DATA
window.addEventListener("load", () => {
  inputs.forEach((input) => {
    const savedValue = localStorage.getItem(input.id);
    if (savedValue) {
      input.value = savedValue;
    }
  });
});
