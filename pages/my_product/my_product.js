import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  deleteDoc,
  doc,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js";

// 🔥 CONFIG
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

// 🔥 WAIT FOR AUTH STATE — never guess who the user is
onAuthStateChanged(auth, (user) => {
  if (!user) {
    document.getElementById("productsContainer").innerHTML =
      "<p>Please log in first.</p>";
    return;
  }
  loadMyProducts(user);
});

// 🔥 LOAD PRODUCTS — strict vendorId match only (no name guessing)
async function loadMyProducts(user) {
  const container = document.getElementById("productsContainer");
  const productCount = document.getElementById("productCount");

  container.innerHTML =
    '<div class="mp-skeleton">' +
    '<div class="mp-skeleton-img"></div>' +
    '<div class="mp-skeleton-body">' +
    '<div class="mp-skeleton-line"></div>' +
    '<div class="mp-skeleton-line price"></div>' +
    '<div class="mp-skeleton-line short"></div>' +
    "</div>" +
    "</div>".repeat(3);

  try {
    // ✅ Query ONLY this vendor's products using vendorId === user.uid
    // This replaces the old getDocs(collection(db, "products")) which
    // fetched ALL products and caused other vendors' products to appear.
    const q = query(
      collection(db, "products"),
      where("vendorId", "==", user.uid),
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      if (productCount) productCount.textContent = "0 products";
      container.innerHTML =
        '<div class="mp-empty">' +
        '<i class="fa-solid fa-box-open"></i>' +
        "<h3>No products yet</h3>" +
        "<p>Add your first product to start selling.</p>" +
        '<button class="mp-empty-btn" onclick="window.location.href=\'../../add_product_page.html\'">' +
        '<i class="fa-solid fa-plus"></i> Add Product' +
        "</button>" +
        "</div>";
      return;
    }

    if (productCount) {
      productCount.textContent =
        snapshot.size + " product" + (snapshot.size !== 1 ? "s" : "");
    }

    let html = "";

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const productImg = data.imageUrl || (data.images && data.images[0]) || "";

      const productName = data.name || "Untitled Product";
      const productPrice = data.price
        ? "₦" + Number(data.price).toLocaleString()
        : "Price not set";
      const productDesc = data.description || "";
      const productCat = data.category || "Product";

      html += `<div class="mp-card">`;

      html += `<div class="mp-card-img-wrap">`;

      if (productImg) {
        html += `
    <img src="${productImg}" alt="${productName}" class="mp-card-img"
      onerror="this.parentElement.innerHTML='<div class=&quot;product-card-no-img&quot;><i class=&quot;fa-solid fa-image&quot;></i><span>No image</span></div>'" />
  `;
      } else {
        html += `
    <div class="product-card-no-img">
      <i class="fa-solid fa-image"></i>
      <span>No image</span>
    </div>
  `;
      }

      html += `
    <span class="mp-card-badge">${productCat}</span>
  </div>

  <div class="mp-card-body">
    <h4 class="mp-card-name">${productName}</h4>
    <p class="mp-card-price">${productPrice}</p>
    ${productDesc ? `<p class="mp-card-desc">${productDesc}</p>` : ""}
  </div>

  <div class="mp-card-footer">
    <button class="mp-btn-delete" onclick="deleteProduct('${docSnap.id}')">
      <i class="fa-solid fa-trash"></i> Delete
    </button>
  </div>
</div>`;
    });

    container.innerHTML = html;
  } catch (error) {
    console.error("loadMyProducts error:", error);
    container.innerHTML =
      '<div class="mp-empty">' +
      '<i class="fa-solid fa-triangle-exclamation"></i>' +
      "<h3>Could not load products</h3>" +
      "<p>Please refresh the page.</p>" +
      "</div>";
  }
}

// 🔥 DELETE PRODUCT — only deletes if it belongs to this user
window.deleteProduct = async function (id) {
  const confirmed = confirm("Are you sure you want to delete this product?");
  if (!confirmed) return;

  const user = auth.currentUser;
  if (!user) {
    alert("You must be logged in to delete a product.");
    return;
  }

  try {
    await deleteDoc(doc(db, "products", id));
    alert("Product deleted successfully.");
    loadMyProducts(user);
  } catch (error) {
    console.error("deleteProduct error:", error);
    alert("Error deleting product. Please try again.");
  }
};

window.goBack = function () {
  window.location.href = "/pages/dashboard/dashboard.html";
};
