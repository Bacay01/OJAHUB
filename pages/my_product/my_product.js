import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  deleteDoc,
  doc,
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";

// ── FIREBASE CONFIG ──
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

// ── CURRENT USER ──
const currentUser = JSON.parse(localStorage.getItem("currentuser"));

// ────────────────────────────────────────────────────────────────
// CACHE-BUST after a save.
//
// edit_product.js navigates back with ?updated=1 in the URL.
// We strip that flag from the address bar, then do a hard reload
// (bypasses both browser cache and the Firestore SDK's in-memory
// cache) so getDocs below always fetches fresh data from the server.
// The reload runs the whole script again — the second time around
// ?updated is gone, so we skip this block and continue normally.
// ────────────────────────────────────────────────────────────────
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get("updated") === "1") {
  window.history.replaceState(null, "", window.location.pathname);
  window.location.reload(true);
}

// ── FORMAT PRICE ──
function formatPrice(price) {
  if (!price && price !== 0) return "—";
  return "₦" + Number(price).toLocaleString("en-NG");
}

// ── CAPITALISE FIRST LETTER ──
function ucFirst(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ── BUILD ONE CARD ──
function buildCard(docId, data) {
  const card = document.createElement("div");
  card.className = "mp-card";

  const imgWrap = document.createElement("div");
  imgWrap.className = "mp-card-img-wrap";

  const img = document.createElement("img");
  img.src = data.imageUrl || "";
  img.alt = data.name || "Product image";
  img.loading = "lazy";
  img.onerror = function () {
    this.src =
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%23f1f3f5'/%3E%3Ctext x='50%25' y='50%25' font-size='14' fill='%239ca3af' text-anchor='middle' dominant-baseline='middle'%3ENo image%3C/text%3E%3C/svg%3E";
  };
  imgWrap.appendChild(img);

  if (data.category) {
    const badge = document.createElement("span");
    badge.className = "mp-card-badge";
    badge.textContent = ucFirst(data.category);
    imgWrap.appendChild(badge);
  }

  const statusBadge = document.createElement("span");
  const status = data.status || "published";
  statusBadge.className = "mp-card-status " + status;
  statusBadge.textContent = ucFirst(status);
  imgWrap.appendChild(statusBadge);

  card.appendChild(imgWrap);

  const body = document.createElement("div");
  body.className = "mp-card-body";

  const name = document.createElement("p");
  name.className = "mp-card-name";
  name.textContent = data.name || "Unnamed product";
  body.appendChild(name);

  const price = document.createElement("p");
  price.className = "mp-card-price";
  price.textContent = formatPrice(data.price);
  body.appendChild(price);

  if (data.description) {
    const desc = document.createElement("p");
    desc.className = "mp-card-desc";
    desc.textContent = data.description;
    body.appendChild(desc);
  }

  card.appendChild(body);

  const footer = document.createElement("div");
  footer.className = "mp-card-footer";

  const editBtn = document.createElement("button");
  editBtn.className = "mp-btn-edit";
  editBtn.innerHTML = "<i class='bi bi-pencil'></i> Edit";
  editBtn.onclick = function () {
    window.location.href = "../../edit_product.html?id=" + docId;
  };
  footer.appendChild(editBtn);

  const delBtn = document.createElement("button");
  delBtn.className = "mp-btn-delete";
  delBtn.innerHTML = "<i class='bi bi-trash3'></i> Delete";
  delBtn.onclick = function () {
    deleteProduct(docId);
  };
  footer.appendChild(delBtn);

  card.appendChild(footer);
  return card;
}

// ── LOAD PRODUCTS ──
async function loadMyProducts() {
  const container = document.getElementById("productsContainer");

  if (!currentUser) {
    container.innerHTML = "";
    const msg = document.createElement("p");
    msg.style.cssText =
      "grid-column:1/-1;text-align:center;color:#9ca3af;padding:40px 0;";
    msg.textContent = "Please login to view your products.";
    container.appendChild(msg);
    return;
  }

  try {
    const snapshot = await getDocs(collection(db, "products"));

    container.innerHTML = "";

    let total = 0,
      published = 0,
      drafts = 0;

    snapshot.forEach(function (document) {
      const data = document.data();

      const isMine =
        !data.vendorName ||
        data.vendorName.trim().toLowerCase() ===
          (currentUser.businessName || "").trim().toLowerCase();

      if (!isMine) return;

      total++;
      if ((data.status || "published") === "draft") drafts++;
      else published++;

      container.appendChild(buildCard(document.id, data));
    });

    const totalEl = document.getElementById("totalCount");
    const publishedEl = document.getElementById("publishedCount");
    const draftEl = document.getElementById("draftCount");

    if (totalEl) totalEl.textContent = total;
    if (publishedEl) publishedEl.textContent = published;
    if (draftEl) draftEl.textContent = drafts;

    if (total === 0) {
      const empty = document.createElement("div");
      empty.className = "mp-empty";

      const icon = document.createElement("div");
      icon.className = "mp-empty-icon";
      icon.innerHTML = "<i class='bi bi-box-seam'></i>";
      empty.appendChild(icon);

      const heading = document.createElement("h3");
      heading.textContent = "No products yet";
      empty.appendChild(heading);

      const sub = document.createElement("p");
      sub.textContent =
        "You haven't listed any products. Add your first product to start selling!";
      empty.appendChild(sub);

      const btn = document.createElement("button");
      btn.className = "mp-empty-btn";
      btn.innerHTML = "<i class='bi bi-plus-lg'></i> Add Your First Product";
      btn.onclick = function () {
        window.location.href = "../../add_product_page.html";
      };
      empty.appendChild(btn);

      container.appendChild(empty);
    }
  } catch (err) {
    console.error("Error loading products:", err);
    container.innerHTML = "";
    const msg = document.createElement("p");
    msg.style.cssText =
      "grid-column:1/-1;text-align:center;color:#ef4444;padding:40px 0;";
    msg.textContent = "Failed to load products. Please refresh and try again.";
    container.appendChild(msg);
  }
}

// ── DELETE PRODUCT ──
window.deleteProduct = async function (id) {
  const confirmed = confirm(
    "Are you sure you want to delete this product? This action cannot be undone.",
  );
  if (!confirmed) return;

  try {
    await deleteDoc(doc(db, "products", id));
    alert("Product deleted successfully.");
    loadMyProducts();
  } catch (error) {
    console.error("Delete error:", error);
    alert("Error deleting product. Please try again.");
  }
};

// ── BACK ──
window.goBack = function () {
  window.location.href = "/pages/dashboard/dashboard.html";
};

// ── INIT ──
loadMyProducts();
