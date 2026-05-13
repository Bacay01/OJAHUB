import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js";

import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";

import {
  getAuth,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js";

// 🔥 FIREBASE CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyAZRPoc-FkbdQ8ZNSkGIYFukU1TG-FJF6s",
  authDomain: "ojahub-c10d9.firebaseapp.com",
  projectId: "ojahub-c10d9",
  storageBucket: "ojahub-c10d9.appspot.com",
  messagingSenderId: "896902243220",
  appId: "1:896902243220:web:7259724fe7865c281aa581",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// 🔥 CLOUDINARY CONFIG
const CLOUD_NAME = "ds3zdc11c";
const UPLOAD_PRESET = "ojahub_upload";

// 🔥 GET USER FROM LOCALSTORAGE (for immediate redirect check)
const currentUser = JSON.parse(localStorage.getItem("currentuser"));

if (!currentUser) {
  alert("Please login first");
  window.location.href = "../login/login.html";
}

// 🔥 CLOUDINARY UPLOAD
async function uploadToCloudinary(file) {
  const formData = new FormData();

  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("public_id", "ojahub_" + Date.now());

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    {
      method: "POST",
      body: formData,
    },
  );

  const data = await response.json();

  console.log("Cloudinary Response:", data);

  if (!data.secure_url) {
    throw new Error("Image upload failed");
  }

  return data.secure_url;
}

// 🔥 LOAD PROFILE
async function loadProfile() {
  const docRef = doc(db, "vendors", currentUser.uid);
  const snap = await getDoc(docRef);

  if (snap.exists()) {
    const data = snap.data();

    document.getElementById("businessName").value = data.businessName || "";
    document.getElementById("ownerName").value = data.ownerName || "";
    document.getElementById("phone").value = data.phone || "";
    document.getElementById("whatsapp").value = data.whatsapp || "";
    document.getElementById("state").value = data.state || "";
    document.getElementById("address").value = data.address || "";
    document.getElementById("description").value = data.description || "";

    const logoPreview = document.getElementById("logoPreview");
    const coverPreview = document.getElementById("coverPreview");

    if (logoPreview && data.imageUrl) {
      logoPreview.src = data.imageUrl + "?t=" + Date.now();
    }

    if (coverPreview && data.coverUrl) {
      coverPreview.src = data.coverUrl + "?t=" + Date.now();
      // show cover image, hide the upload overlay
      const coverWrap = coverPreview.closest(".ps-cover-wrap");
      if (coverWrap) coverWrap.classList.add("has-image");
    }
  }
}

loadProfile();

// 🔥 UPDATE PROFILE
// Wait for Firebase Auth to resolve before attaching the submit listener
onAuthStateChanged(auth, (user) => {
  if (!user) {
    // Auth resolved but no user — redirect
    alert("Session expired. Please login again.");
    window.location.href = "../login/login.html";
    return;
  }

  document
    .getElementById("profileForm")
    .addEventListener("submit", async (e) => {
      e.preventDefault();

      const loading = document.getElementById("loading");
      loading.innerText = "Updating...";

      try {
        const uid = user.uid;

        let logoUrl = "";
        let coverUrl = "";

        const logoFileEl = document.getElementById("logoFile");
        const coverFileEl = document.getElementById("coverFile");

        const logoFile = logoFileEl ? logoFileEl.files[0] : null;
        const coverFile = coverFileEl ? coverFileEl.files[0] : null;

        // 🔥 Upload Logo
        if (logoFile) {
          logoUrl = await uploadToCloudinary(logoFile);
        }

        // 🔥 Upload Cover
        if (coverFile) {
          coverUrl = await uploadToCloudinary(coverFile);
        }

        // 🔥 SAVE TO FIRESTORE
        await setDoc(
          doc(db, "vendors", uid),
          {
            businessName: document.getElementById("businessName").value,
            ownerName: document.getElementById("ownerName").value,
            phone: document.getElementById("phone").value,
            whatsapp: document.getElementById("whatsapp").value,
            state: document.getElementById("state").value,
            address: document.getElementById("address").value,
            description: document.getElementById("description").value,

            ...(logoUrl && {
              imageUrl: logoUrl,
              logoUrl: logoUrl,
            }),

            ...(coverUrl && {
              coverUrl: coverUrl,
            }),
          },
          { merge: true },
        );

        loading.innerText = "";
        alert("Updated Successfully ✅");

        location.reload();
      } catch (error) {
        console.error(error);
        alert(error.message);
        loading.innerText = "";
      }
    });
});

// 🔥 BACK
window.goBack = function () {
  window.location.href = "../dashboard/dashboard.html";
};
