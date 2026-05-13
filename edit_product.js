// ─────────────────────────────────────────────
// FIREBASE IMPORTS
// ─────────────────────────────────────────────
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js";

// ─────────────────────────────────────────────
// INIT  (same config as add-product.js)
// ─────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyAZRPoc-FkbdQ8ZNSkGIYFukU1TG-FJF6s",
  authDomain: "ojahub-c10d9.firebaseapp.com",
  projectId: "ojahub-c10d9",
  storageBucket: "ojahub-c10d9.firebasestorage.app",
  messagingSenderId: "896902243220",
  appId: "1:896902243220:web:7259724fe7865c281aa581",
};

// getApps check prevents "duplicate app" error if Firebase is already
// initialized by another script on the same page (e.g. main.js)
import {
  getApps,
  getApp,
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js";
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ─────────────────────────────────────────────
// PRODUCT ID FROM URL
// ─────────────────────────────────────────────
const params = new URLSearchParams(window.location.search);
const productId = params.get("id");

if (!productId) {
  alert("No product ID provided.");
  window.location.href = "pages/my_product/my_product.html";
}

// ─────────────────────────────────────────────
// ELEMENTS
// ─────────────────────────────────────────────
const nameInput = document.getElementById("name");
const priceInput = document.getElementById("price");
const categoryInput = document.getElementById("category");
const statusInput = document.getElementById("status");
const descEditor = document.getElementById("desc");
const descHidden = document.getElementById("descHidden");
const imageInput = document.getElementById("image");
const uploadZone = document.getElementById("uploadZone");
const thumbContainer = document.getElementById("thumbContainer");
const existingStrip = document.getElementById("existingImagesStrip");
const existingThumbs = document.getElementById("existingThumbContainer");
const loadingMsg = document.getElementById("apLoadingMsg");
const saveBtn = document.getElementById("saveBtn");
const saveDraftBtn = document.getElementById("saveDraftBtn");

const previewImg = document.getElementById("previewDisplay");
const previewPlaceholder = document.getElementById("previewPlaceholder");
const previewName = document.getElementById("previewName");
const previewPrice = document.getElementById("previewPrice");
const previewDesc = document.getElementById("previewDesc");
const previewCategory = document.getElementById("previewCategory");
const previewVendor = document.getElementById("previewVendor");
const previewStatus = document.getElementById("previewStatus");

const currentUser = JSON.parse(localStorage.getItem("currentuser")) || {};
if (currentUser.businessName)
  previewVendor.textContent = currentUser.businessName;

// ─────────────────────────────────────────────
// IMAGE STATE
// ─────────────────────────────────────────────
let existingImages = [];
let selectedFiles = [];

// ─────────────────────────────────────────────
// WAIT FOR AUTH SESSION BEFORE LOADING
// Without this, auth.currentUser is null on page
// load and Firestore rejects the updateDoc call.
// ─────────────────────────────────────────────
onAuthStateChanged(auth, function (user) {
  if (!user) {
    alert("You must be logged in to edit products.");
    window.location.href = "pages/my_product/my_product.html";
    return;
  }
  // Auth is confirmed — safe to load and later write
  loadProduct();
});

// ─────────────────────────────────────────────
// LOAD PRODUCT
// ─────────────────────────────────────────────
async function loadProduct() {
  try {
    const snap = await getDoc(doc(db, "products", productId));
    if (!snap.exists()) {
      alert("Product not found.");
      goBack();
      return;
    }
    const data = snap.data();

    nameInput.value = data.name || "";
    priceInput.value = data.price || "";
    descEditor.innerHTML = data.description || "";
    descHidden.value = data.description || "";

    if (data.category) categoryInput.value = data.category;
    if (data.status) statusInput.value = data.status;

    existingImages =
      Array.isArray(data.images) && data.images.length
        ? [...data.images]
        : data.imageUrl
          ? [data.imageUrl]
          : [];

    renderExistingThumbs();
    syncPreview();
  } catch (err) {
    console.error("Load error:", err);
    alert("Failed to load product. Please try again.");
  }
}

// ─────────────────────────────────────────────
// RENDER EXISTING THUMBNAILS
// ─────────────────────────────────────────────
function renderExistingThumbs() {
  existingThumbs.innerHTML = "";

  if (existingImages.length === 0) {
    existingStrip.style.display = "none";
    previewImg.style.display = "none";
    previewPlaceholder.style.display = "flex";
    return;
  }

  existingStrip.style.display = "block";

  existingImages.forEach(function (url, i) {
    const wrap = document.createElement("div");
    wrap.className = "ap-thumb";

    const img = document.createElement("img");
    img.src = url;
    img.alt = "existing";

    const btn = document.createElement("button");
    btn.className = "ap-thumb-remove";
    btn.innerHTML = "<i class='bi bi-x'></i>";
    btn.title = "Remove";
    btn.type = "button";
    btn.onclick = function () {
      existingImages.splice(i, 1);
      renderExistingThumbs();
      syncPreviewImage();
    };

    wrap.appendChild(img);
    wrap.appendChild(btn);
    existingThumbs.appendChild(wrap);
  });

  syncPreviewImage();
}

// ─────────────────────────────────────────────
// RENDER NEW-FILE THUMBNAILS
// ─────────────────────────────────────────────
function renderNewThumbs() {
  thumbContainer.innerHTML = "";

  selectedFiles.forEach(function (f, i) {
    const url = URL.createObjectURL(f);
    const wrap = document.createElement("div");
    wrap.className = "ap-thumb";
    wrap.innerHTML = `<img src="${url}" alt="thumb">
      <button class="ap-thumb-remove" data-i="${i}" title="Remove" type="button">
        <i class="bi bi-x"></i>
      </button>`;
    thumbContainer.appendChild(wrap);
  });

  thumbContainer.querySelectorAll(".ap-thumb-remove").forEach(function (btn) {
    btn.onclick = function () {
      selectedFiles.splice(parseInt(btn.dataset.i), 1);
      renderNewThumbs();
      syncPreviewImage();
    };
  });

  syncPreviewImage();
}

// ─────────────────────────────────────────────
// PREVIEW IMAGE
// ─────────────────────────────────────────────
function syncPreviewImage() {
  if (existingImages.length > 0) {
    previewImg.src = existingImages[0];
    previewImg.style.display = "block";
    previewPlaceholder.style.display = "none";
  } else if (selectedFiles.length > 0) {
    previewImg.src = URL.createObjectURL(selectedFiles[0]);
    previewImg.style.display = "block";
    previewPlaceholder.style.display = "none";
  } else {
    previewImg.style.display = "none";
    previewPlaceholder.style.display = "flex";
  }
}

// ─────────────────────────────────────────────
// LIVE PREVIEW
// ─────────────────────────────────────────────
function syncPreview() {
  const name = nameInput.value.trim();
  const price = parseFloat(priceInput.value);
  const cat = categoryInput.value;
  const stat = statusInput.value;
  const desc = descEditor.innerText.trim();

  previewName.textContent = name || "Product Name";
  previewPrice.textContent = isNaN(price)
    ? "₦0.00"
    : "₦" + price.toLocaleString("en-NG", { minimumFractionDigits: 2 });
  previewDesc.textContent =
    desc ||
    "This is a short description of your product. It will appear here for buyers to preview.";

  const opt = categoryInput.options[categoryInput.selectedIndex];
  previewCategory.textContent = opt && opt.value ? opt.text : "--";

  previewStatus.textContent = stat
    ? stat.charAt(0).toUpperCase() + stat.slice(1)
    : "Published";
  previewStatus.className = stat === "draft" ? "badge-draft" : "badge-instock";

  syncPreviewImage();
}

nameInput.addEventListener("input", syncPreview);
priceInput.addEventListener("input", syncPreview);
categoryInput.addEventListener("change", syncPreview);
statusInput.addEventListener("change", syncPreview);
descEditor.addEventListener("input", function () {
  descHidden.value = descEditor.innerText.trim();
  syncPreview();
});

// ─────────────────────────────────────────────
// RICH TEXT TOOLBAR
// ─────────────────────────────────────────────
document.querySelectorAll(".rt-btn[data-cmd]").forEach(function (btn) {
  btn.addEventListener("mousedown", function (e) {
    e.preventDefault();
    document.execCommand(btn.dataset.cmd, false, null);
    descEditor.focus();
    btn.classList.toggle("active", document.queryCommandState(btn.dataset.cmd));
  });
});

document
  .getElementById("rtLinkBtn")
  .addEventListener("mousedown", function (e) {
    e.preventDefault();
    const url = prompt("Enter URL:");
    if (url) document.execCommand("createLink", false, url);
    descEditor.focus();
  });

descEditor.addEventListener("keyup", function () {
  document.querySelectorAll(".rt-btn[data-cmd]").forEach(function (btn) {
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
// IMAGE UPLOAD
// ─────────────────────────────────────────────
imageInput.addEventListener("change", function (e) {
  const remaining = 5 - existingImages.length;
  const newFiles = Array.from(e.target.files).filter(
    (f) => f.size <= 5 * 1024 * 1024,
  );
  selectedFiles = [...selectedFiles, ...newFiles].slice(0, remaining);
  renderNewThumbs();
  imageInput.value = "";
});

uploadZone.addEventListener("dragover", function (e) {
  e.preventDefault();
  uploadZone.classList.add("dragover");
});
uploadZone.addEventListener("dragleave", function () {
  uploadZone.classList.remove("dragover");
});
uploadZone.addEventListener("drop", function (e) {
  e.preventDefault();
  uploadZone.classList.remove("dragover");
  const remaining = 5 - existingImages.length;
  const newFiles = Array.from(e.dataTransfer.files).filter(
    (f) => f.type.startsWith("image/") && f.size <= 5 * 1024 * 1024,
  );
  selectedFiles = [...selectedFiles, ...newFiles].slice(0, remaining);
  renderNewThumbs();
});

// ─────────────────────────────────────────────
// CLOUDINARY UPLOAD
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
  if (!data.secure_url) throw new Error("Cloudinary upload failed");
  return data.secure_url;
}

// ─────────────────────────────────────────────
// SAVE
// ─────────────────────────────────────────────
async function handleSave(forceDraft = false) {
  const name = nameInput.value.trim();
  const price = priceInput.value.trim();
  const desc = descEditor.innerText.trim();
  const category = categoryInput.value;
  const status = forceDraft ? "draft" : statusInput.value;

  if (!name) return alert("Please enter a product name.");
  if (!price) return alert("Please enter a price.");
  if (!category) return alert("Please select a category.");
  if (existingImages.length === 0 && selectedFiles.length === 0)
    return alert("Please keep or add at least one image.");

  // Auth must still be valid at save time
  const user = auth.currentUser;
  if (!user) {
    alert("Session expired. Please log in again.");
    return;
  }

  loadingMsg.textContent = selectedFiles.length
    ? "Uploading images… ⏳"
    : "Saving changes… ⏳";
  saveBtn.disabled = true;
  saveDraftBtn.disabled = true;
  saveBtn.innerHTML = `<span class="ap-spinner"></span> Saving…`;

  try {
    // Upload new images to Cloudinary
    const newUrls = [];
    for (const file of selectedFiles) {
      newUrls.push(await uploadToCloudinary(file));
    }

    const allImages = [...existingImages, ...newUrls];

    await updateDoc(doc(db, "products", productId), {
      name,
      price: Number(price),
      description: desc,
      category,
      status,
      imageUrl: allImages[0] || "",
      images: allImages,
      updatedAt: new Date(),
    });

    // Navigate back — ?updated=1 triggers a hard reload in my_product.js
    window.location.href = "pages/my_product/my_product.html?updated=1";
  } catch (err) {
    console.error("Save error:", err);
    loadingMsg.textContent =
      err.code === "permission-denied"
        ? "Permission denied — check your Firestore rules."
        : "Something went wrong. Please try again.";
    saveBtn.disabled = false;
    saveDraftBtn.disabled = false;
    saveBtn.innerHTML = `<i class="bi bi-check2-circle"></i> Save Changes`;
  }
}

saveBtn.addEventListener("click", () => handleSave(false));
saveDraftBtn.addEventListener("click", () => handleSave(true));

// ─────────────────────────────────────────────
// BACK
// ─────────────────────────────────────────────
window.goBack = function () {
  window.location.href = "pages/my_product/my_product.html";
};

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
