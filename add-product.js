// ─────────────────────────────────────────────
// FIREBASE IMPORTS
// ─────────────────────────────────────────────
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAZRPoc-FkbdQ8ZNSkGIYFukU1TG-FJF6s",
  authDomain: "ojahub-c10d9.firebaseapp.com",
  projectId: "ojahub-c10d9",
  storageBucket: "ojahub-c10d9.firebasestorage.app",
  messagingSenderId: "896902243220",
  appId: "1:896902243220:web:7259724fe7865c281aa581",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ─────────────────────────────────────────────
// ELEMENTS
// ─────────────────────────────────────────────
const nameInput = document.getElementById("name");
const priceInput = document.getElementById("price");
const categoryInput = document.getElementById("category");
const descEditor = document.getElementById("desc");
const descHidden = document.getElementById("descHidden");
const imageInput = document.getElementById("image");
const uploadZone = document.getElementById("uploadZone");
const thumbContainer = document.getElementById("thumbContainer");
const loadingMsg = document.getElementById("apLoadingMsg");
const publishBtn = document.getElementById("publishBtn");
const saveDraftBtn = document.getElementById("saveDraftBtn");

// Preview elements
const previewImg = document.getElementById("previewDisplay");
const previewPlaceholder = document.getElementById("previewPlaceholder");
const previewName = document.getElementById("previewName");
const previewPrice = document.getElementById("previewPrice");
const previewDesc = document.getElementById("previewDesc");
const previewCategory = document.getElementById("previewCategory");
const previewVendor = document.getElementById("previewVendor");

// Prefill vendor name from localStorage
const currentUser = JSON.parse(localStorage.getItem("currentuser")) || {};
if (currentUser.businessName)
  previewVendor.textContent = currentUser.businessName;

// ─────────────────────────────────────────────
// LIVE PREVIEW UPDATES
// ─────────────────────────────────────────────
nameInput.addEventListener("input", () => {
  previewName.textContent = nameInput.value.trim() || "Product Name";
});

priceInput.addEventListener("input", () => {
  const v = parseFloat(priceInput.value);
  previewPrice.textContent = isNaN(v)
    ? "₦0.00"
    : "₦" + v.toLocaleString("en-NG", { minimumFractionDigits: 2 });
});

const DESC_LIMIT = 150; // characters — adjust to your taste

descEditor.addEventListener("input", () => {
  const text = descEditor.innerText.trim();

  // Enforce limit
  if (text.length > DESC_LIMIT) {
    descEditor.innerText = text.slice(0, DESC_LIMIT);
    // Move cursor to end
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(descEditor);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  // Update counter
  const remaining = DESC_LIMIT - Math.min(text.length, DESC_LIMIT);
  document.getElementById("descCounter").textContent =
    remaining + " characters remaining";

  // Update preview
  const preview = descEditor.innerText.trim();
  previewDesc.textContent =
    preview ||
    "This is a short description of your product. It will appear here for buyers to preview.";
  descHidden.value = preview;
});

// descEditor.addEventListener("input", () => {
//   const text = descEditor.innerText.trim();
//   previewDesc.textContent =
//     text ||
//     "This is a short description of your product. It will appear here for buyers to preview.";
//   descHidden.value = text;
// });

categoryInput.addEventListener("change", () => {
  const opt = categoryInput.options[categoryInput.selectedIndex];
  previewCategory.textContent = opt && opt.value ? opt.text : "--";
});

// ─────────────────────────────────────────────
// RICH TEXT TOOLBAR
// ─────────────────────────────────────────────
document.querySelectorAll(".rt-btn[data-cmd]").forEach((btn) => {
  btn.addEventListener("mousedown", (e) => {
    e.preventDefault();
    document.execCommand(btn.dataset.cmd, false, null);
    descEditor.focus();
    btn.classList.toggle("active", document.queryCommandState(btn.dataset.cmd));
  });
});

document.getElementById("rtLinkBtn").addEventListener("mousedown", (e) => {
  e.preventDefault();
  const url = prompt("Enter URL:");
  if (url) document.execCommand("createLink", false, url);
  descEditor.focus();
});

descEditor.addEventListener("keyup", () => {
  document.querySelectorAll(".rt-btn[data-cmd]").forEach((btn) => {
    if (
      ["bold", "italic", "underline", "strikeThrough"].includes(btn.dataset.cmd)
    ) {
      btn.classList.toggle(
        "active",
        document.queryCommandState(btn.dataset.cmd),
      );
    }
  });
});

// ─────────────────────────────────────────────
// IMAGE UPLOAD — MULTI-FILE WITH THUMBNAILS
// ─────────────────────────────────────────────
let selectedFiles = [];

function renderThumbs() {
  thumbContainer.innerHTML = "";
  selectedFiles.forEach((f, i) => {
    const url = URL.createObjectURL(f);
    const wrap = document.createElement("div");
    wrap.className = "ap-thumb";
    wrap.innerHTML = `<img src="${url}" alt="thumb"><button class="ap-thumb-remove" data-i="${i}" title="Remove"><i class="bi bi-x"></i></button>`;
    thumbContainer.appendChild(wrap);

    // First image → preview card
    if (i === 0) {
      previewImg.src = url;
      previewImg.style.display = "block";
      previewPlaceholder.style.display = "none";
    }
  });
  if (selectedFiles.length === 0) {
    previewImg.style.display = "none";
    previewImg.src = "";
    previewPlaceholder.style.display = "flex";
  }
}

thumbContainer.addEventListener("click", (e) => {
  const btn = e.target.closest(".ap-thumb-remove");
  if (!btn) return;
  const idx = parseInt(btn.dataset.i);
  selectedFiles.splice(idx, 1);
  renderThumbs();
});

imageInput.addEventListener("change", (e) => {
  const newFiles = Array.from(e.target.files).filter(
    (f) => f.size <= 5 * 1024 * 1024,
  );
  const combined = [...selectedFiles, ...newFiles];
  selectedFiles = combined.slice(0, 5); // max 5
  renderThumbs();
  imageInput.value = ""; // reset so same file can be re-added if removed
});

// Drag & drop
uploadZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  uploadZone.classList.add("dragover");
});
uploadZone.addEventListener("dragleave", () =>
  uploadZone.classList.remove("dragover"),
);
uploadZone.addEventListener("drop", (e) => {
  e.preventDefault();
  uploadZone.classList.remove("dragover");
  const newFiles = Array.from(e.dataTransfer.files).filter(
    (f) => f.type.startsWith("image/") && f.size <= 5 * 1024 * 1024,
  );
  const combined = [...selectedFiles, ...newFiles];
  selectedFiles = combined.slice(0, 5);
  renderThumbs();
});

// ─────────────────────────────────────────────
// CLOUDINARY UPLOAD (returns URL)
// ─────────────────────────────────────────────
async function uploadToCloudinary(file) {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", "ojahub_upload");
  const res = await fetch(
    "https://api.cloudinary.com/v1_1/ds3zdc11c/image/upload",
    {
      method: "POST",
      body: fd,
    },
  );
  const data = await res.json();
  if (!data.secure_url) throw new Error("Image upload failed");
  return data.secure_url;
}

// ─────────────────────────────────────────────
// SUBMIT HANDLER (shared by publish + draft)
// ─────────────────────────────────────────────
async function handleSubmit(isDraft = false) {
  const name = nameInput.value.trim();
  const price = priceInput.value.trim();
  const desc = descEditor.innerText.trim();
  const category = categoryInput.value;

  if (!name) return alert("Please enter a product name.");
  if (!price) return alert("Please enter a price.");
  if (!category) return alert("Please select a category.");
  if (selectedFiles.length === 0)
    return alert("Please upload at least one image.");

  const user = auth.currentUser;
  if (!user) return alert("Please login first.");

  // UI lock
  loadingMsg.textContent = "Uploading images… ⏳";
  publishBtn.disabled = true;
  saveDraftBtn.disabled = true;
  publishBtn.innerHTML = `<span class="ap-spinner"></span> Uploading…`;

  try {
    // Upload all images
    const imageUrls = [];
    for (const file of selectedFiles) {
      const url = await uploadToCloudinary(file);
      imageUrls.push(url);
    }

    // Save to Firestore
    await addDoc(collection(db, "products"), {
      name,
      price: Number(price),
      description: desc,
      category,
      imageUrl: imageUrls[0], // primary image (backward-compatible)
      images: imageUrls, // all images
      status: isDraft ? "draft" : "published",
      vendorId: user.uid,
      vendorName: currentUser.businessName || "",
      createdAt: new Date(),
    });

    loadingMsg.textContent = "";
    alert(isDraft ? "Draft saved! ✅" : "Product published successfully 🚀");

    // Reset form
    document.getElementById("productForm").reset();
    descEditor.innerHTML = "";
    selectedFiles = [];
    renderThumbs();
    previewName.textContent = "Product Name";
    previewPrice.textContent = "₦0.00";
    previewDesc.textContent =
      "This is a short description of your product. It will appear here for buyers to preview.";
    previewCategory.textContent = "--";

    setTimeout(() => {
      window.location.href = "pages/my_product/my_product.html";
    }, 800);
  } catch (err) {
    console.error(err);
    loadingMsg.textContent = "Something went wrong. Please try again.";
  } finally {
    publishBtn.disabled = false;
    saveDraftBtn.disabled = false;
    publishBtn.innerHTML = `<i class="bi bi-rocket-takeoff-fill"></i> Publish Product`;
  }
}

publishBtn.addEventListener("click", () => handleSubmit(false));
saveDraftBtn.addEventListener("click", () => handleSubmit(true));

// ─────────────────────────────────────────────
// BACK
// ─────────────────────────────────────────────
window.goBack = function () {
  window.location.href = "pages/dashboard/dashboard.html";
};
