// 🔥 FIREBASE IMPORT
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";

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

// 🔥 DOM REFS (set in DOMContentLoaded)
let vendorList;
let detailSection;
let detailImg;
let detailName;
let detailDesc;
let detailLocation;
let detailTag;
let detailWhatsapp;
let claimBtn;
let productsWrap;

// 🔥 ACTIVE FILTERS
let activeCategory = "all";
let activeQuery = "";

// ─────────────────────────────────────────────
// 🎨 INITIALS AVATAR GENERATOR
// Returns a data: URL SVG avatar showing business
// name initials. Colour is deterministic per name.
// ─────────────────────────────────────────────
const AVATAR_PALETTE = [
  ["#FF6D00", "#fff"], // OjaHub orange  / white text
  ["#1565C0", "#fff"], // deep blue      / white text
  ["#2E7D32", "#fff"], // forest green   / white text
  ["#6A1B9A", "#fff"], // purple         / white text
  ["#AD1457", "#fff"], // deep pink      / white text
  ["#00838F", "#fff"], // teal           / white text
  ["#E65100", "#fff"], // burnt orange   / white text
  ["#283593", "#fff"], // indigo         / white text
];

function getInitials(name) {
  name = name || "";
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "OJ";
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function nameToColor(name) {
  name = name || "";
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[idx];
}

function makeAvatarUrl(businessName) {
  businessName = businessName || "";
  var initials = getInitials(businessName);
  var colorPair = nameToColor(businessName);
  var bg = colorPair[0];
  var fg = colorPair[1];

  // Single string concat — no array join breaking SVG attributes
  var svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="240" viewBox="0 0 400 240">' +
    '<rect width="400" height="240" fill="' +
    bg +
    '"/>' +
    '<pattern id="dots" width="20" height="20" patternUnits="userSpaceOnUse">' +
    '<circle cx="2" cy="2" r="1.5" fill="' +
    fg +
    '" fill-opacity="0.08"/>' +
    "</pattern>" +
    '<rect width="400" height="240" fill="url(#dots)"/>' +
    '<text x="200" y="118" font-family="Arial,sans-serif" font-size="80" font-weight="800" fill="' +
    fg +
    '" text-anchor="middle" dominant-baseline="middle" letter-spacing="4">' +
    initials +
    "</text>" +
    '<text x="200" y="218" font-family="Arial,sans-serif" font-size="12" font-weight="600" fill="' +
    fg +
    '" fill-opacity="0.45" text-anchor="middle">OjaHub Marketplace</text>' +
    "</svg>";

  // Use btoa (base64) — never throws URI errors unlike encodeURIComponent
  try {
    return "data:image/svg+xml;base64," + btoa(svg);
  } catch (e) {
    var fallback =
      '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="240">' +
      '<rect width="400" height="240" fill="' +
      bg +
      '"/>' +
      "</svg>";
    return "data:image/svg+xml;base64," + btoa(fallback);
  }
}

function getVendorImage(data) {
  return (
    data.imageUrl ||
    data.logoUrl ||
    data.profileImage ||
    makeAvatarUrl(data.businessName || "")
  );
}

// ─────────────────────────────────────────────
// 🔥 LOAD VENDORS + PRODUCTS
// ─────────────────────────────────────────────
async function loadVendors() {
  try {
    const [vendorSnapshot, productSnapshot] = await Promise.all([
      getDocs(collection(db, "vendors")),
      getDocs(collection(db, "products")),
    ]);

    const products = [];
    productSnapshot.forEach((d) => products.push({ id: d.id, ...d.data() }));

    const vendors = [];
    vendorSnapshot.forEach((d) => vendors.push({ id: d.id, ...d.data() }));

    // Sort: category → then A-Z
    vendors.sort((a, b) => {
      // Count products per vendor
      const productsA = products.filter((p) => {
        const pVendor = (p.vendorName || "").trim().toLowerCase();
        const bName = (a.businessName || "").trim().toLowerCase();
        return (
          p.vendorId === a.id ||
          pVendor === bName ||
          pVendor.includes(bName) ||
          bName.includes(pVendor)
        );
      }).length;

      const productsB = products.filter((p) => {
        const pVendor = (p.vendorName || "").trim().toLowerCase();
        const bName = (b.businessName || "").trim().toLowerCase();
        return (
          p.vendorId === b.id ||
          pVendor === bName ||
          pVendor.includes(bName) ||
          bName.includes(pVendor)
        );
      }).length;

      // Vendors with products rank first
      if (productsB !== productsA) return productsB - productsA;

      // Then by category
      const catA = (a.category || "").toLowerCase();
      const catB = (b.category || "").toLowerCase();
      if (catA !== catB) return catA.localeCompare(catB);

      // Then A-Z
      return (a.businessName || "").localeCompare(b.businessName || "");
    });

    let html = "";

    vendors.forEach((data) => {
      // Match products to this vendor
      const vendorProducts = products.filter((p) => {
        const pVendor = (p.vendorName || "").trim().toLowerCase();
        const bName = (data.businessName || "").trim().toLowerCase();
        return (
          p.vendorId === data.id ||
          pVendor === bName ||
          pVendor.includes(bName) ||
          bName.includes(pVendor)
        );
      });

      // WhatsApp check
      const rawPhone = (data.whatsapp || "").replace(/\D/g, "");
      const hasWhatsapp = rawPhone.length > 0;

      // Vendor logo/banner — real image or generated initials avatar
      const vendorLogo = getVendorImage(data);

      const categoryLabel = data.category || "Vendor";
      const cityLabel = data.city || "";
      const subCat = data.subCategory ? " · " + data.subCategory : "";

      // Searchable text blob
      const searchable = [
        data.businessName || "",
        data.category || "",
        data.subCategory || "",
        data.description || "",
        data.city || "",
        data.state || "",
      ]
        .join(" ")
        .toLowerCase();

      html +=
        '<div class="vendor-card"' +
        ' data-id="' +
        data.id +
        '"' +
        ' data-category="' +
        categoryLabel.toLowerCase() +
        '"' +
        ' data-name="' +
        (data.businessName || "").replace(/"/g, "&quot;") +
        '"' +
        ' data-desc="' +
        (data.description || "").replace(/"/g, "&quot;") +
        '"' +
        ' data-location="' +
        cityLabel +
        '"' +
        ' data-image="' +
        vendorLogo +
        '"' +
        ' data-whatsapp="' +
        (data.whatsapp || "") +
        '"' +
        ' data-searchable="' +
        searchable +
        '"' +
        " data-products='" +
        JSON.stringify(vendorProducts).replace(/'/g, "&#39;") +
        "'" +
        ">";

      html +=
        '<div class="vendor-card-img-wrap">' +
        '<img src="' +
        vendorLogo +
        '" alt="' +
        (data.businessName || "Vendor") +
        '" class="vendor-card-img" />' +
        "</div>";

      html += '<div class="card-content">';
      html +=
        '<div class="card-badges">' +
        '<span class="badge-verified">' +
        '<i class="fa-solid fa-circle-check"></i> Verified · ' +
        cityLabel +
        "</span>" +
        "</div>";

      html +=
        '<h3 class="card-business-name">' +
        (data.businessName || "No Name") +
        "</h3>";
      html += '<p class="card-meta">' + categoryLabel + subCat + "</p>";

      if (cityLabel) {
        html +=
          '<p class="card-location"><i class="fa-solid fa-location-dot"></i> ' +
          cityLabel +
          "</p>";
      }

      html += '<div class="card-tags-row">';
      if (hasWhatsapp) {
        html +=
          '<span class="tag-whatsapp"><i class="fa-brands fa-whatsapp"></i> Replies on WhatsApp</span>';
      } else {
        html += '<span class="tag-no-wa">No WhatsApp</span>';
      }
      html += '<span class="tag-price">Price on request</span>';
      html += "</div>";

      html +=
        '<button class="view-btn" type="button">' +
        '<i class="fa-regular fa-eye"></i> View Details' +
        "</button>";

      html += "</div></div>";
    });

    vendorList.innerHTML = html;

    applyFilters();
    attachViewDetails();

    if (window.OjaAnimations) {
      window.OjaAnimations.observeCards("#vendorList");
    }
  } catch (error) {
    console.error("loadVendors error:", error);
    if (vendorList) {
      vendorList.innerHTML =
        '<p class="error-msg">Failed to load vendors. Please refresh.</p>';
    }
  }
}

// ─────────────────────────────────────────────
// 🔥 UNIFIED FILTER
// ─────────────────────────────────────────────
function applyFilters() {
  const cards = document.querySelectorAll(".vendor-card");
  const resultsCount = document.getElementById("resultsCount");
  let visible = 0;

  cards.forEach((card) => {
    const cardCategory = card.dataset.category || "";
    const cardSearchable = card.dataset.searchable || "";

    const matchesCategory =
      activeCategory === "all" || cardCategory.includes(activeCategory);
    const matchesQuery =
      activeQuery === "" || cardSearchable.includes(activeQuery);

    if (matchesCategory && matchesQuery) {
      card.style.display = "";
      visible++;
    } else {
      card.style.display = "none";
    }
  });

  if (resultsCount) {
    resultsCount.textContent =
      visible + " vendor" + (visible !== 1 ? "s" : "") + " found";
  }
}

// ─────────────────────────────────────────────
// 🔥 VIEW DETAILS — opens full detail panel
// ─────────────────────────────────────────────
function attachViewDetails() {
  const cards = document.querySelectorAll(".vendor-card");

  cards.forEach((card) => {
    const button = card.querySelector(".view-btn");
    if (!button) return;

    button.addEventListener("click", () => {
      openVendorDetail(card);
    });
  });
}

function openVendorDetail(card) {
  const vendorName = card.dataset.name || "";
  const rawPhone = (card.dataset.whatsapp || "").replace(/\D/g, "");
  let phone = rawPhone;
  if (phone.startsWith("0")) phone = "234" + phone.substring(1);

  const categoryLabel = card.dataset.category || "Vendor";

  // ── Hero image: use stored image, or generate avatar as fallback
  // Avatar SVG is a data: URL so it never fails to load — no onerror needed
  const storedImage = card.dataset.image;
  detailImg.src = storedImage || makeAvatarUrl(vendorName);
  detailImg.alt = vendorName;

  // ── Category badge
  detailTag.textContent =
    categoryLabel.charAt(0).toUpperCase() + categoryLabel.slice(1);

  // ── Name, location, description
  detailName.textContent = vendorName;
  detailLocation.innerHTML =
    '<i class="fa-solid fa-location-dot"></i> ' + (card.dataset.location || "");
  detailDesc.innerHTML =
    "<p>" + (card.dataset.desc || "No description available.") + "</p>";

  // ── WhatsApp link
  if (phone) {
    detailWhatsapp.href = "https://wa.me/" + phone;
    detailWhatsapp.classList.remove("hidden");
    detailWhatsapp.innerHTML =
      '<i class="fa-brands fa-whatsapp"></i> Contact Vendor';
  } else {
    detailWhatsapp.classList.add("hidden");
  }

  // ── Claim button
  claimBtn.href =
    "pages/claim_business/claim_business.html?vendorId=" + card.dataset.id;

  // ── Products
  const products = JSON.parse(card.dataset.products || "[]");
  buildProductGrid(products, phone);

  // ── Show detail, hide list
  vendorList.style.display = "none";
  detailSection.classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ─────────────────────────────────────────────
// 🔥 BUILD PRODUCT GRID (clean, card-based)
// ─────────────────────────────────────────────
function buildProductGrid(products, phone) {
  if (products.length === 0) {
    productsWrap.innerHTML =
      '<div class="products-section-header"><h3>Products</h3></div>' +
      '<p class="no-products-msg">This vendor hasn\'t listed any products yet.</p>';
    return;
  }

  let html =
    '<div class="products-section-header">' +
    '<h3>Products <span class="products-count">' +
    products.length +
    "</span></h3>" +
    "</div>" +
    '<div class="products-grid-clean">';

  products.forEach((p) => {
    const productImg =
      p.imageUrl ||
      p.image ||
      "https://via.placeholder.com/300x200?text=No+Image";

    const productName = p.name || "Untitled Product";
    const productPrice = p.price
      ? "₦" + Number(p.price).toLocaleString()
      : "Price on request";
    const productDesc = p.description || "";
    const productCat = p.category || "Product";

    const message =
      "Hello, I saw this product on OjaHub.\n\nProduct: " +
      productName +
      "\nPrice: " +
      productPrice +
      "\nDescription: " +
      productDesc +
      "\n\nIs it still available?";
    const encoded = encodeURIComponent(message);
    const waLink = phone ? "https://wa.me/" + phone + "?text=" + encoded : "#";

    html += '<div class="product-card-clean">';
    html += '<div class="product-card-img-wrap">';
    html +=
      '<img src="' +
      productImg +
      '" alt="' +
      productName +
      '" class="product-card-img"' +
      " onerror=\"this.src='https://via.placeholder.com/300x200?text=No+Image'\" />";
    html += '<span class="product-cat-badge">' + productCat + "</span>";
    html += "</div>";
    html += '<div class="product-card-body">';
    html += '<h4 class="product-card-name">' + productName + "</h4>";
    html += '<p class="product-card-price">' + productPrice + "</p>";
    if (productDesc) {
      html += '<p class="product-card-desc">' + productDesc + "</p>";
    }
    if (phone) {
      html +=
        '<a href="' +
        waLink +
        '" target="_blank" class="product-wa-btn">' +
        '<i class="fa-brands fa-whatsapp"></i> Chat on WhatsApp</a>';
    } else {
      html +=
        '<button class="product-wa-btn disabled" disabled>No WhatsApp</button>';
    }
    html += "</div></div>";
  });

  html += "</div>";
  productsWrap.innerHTML = html;
}

// ─────────────────────────────────────────────
// 🔥 DOM READY
// ─────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  vendorList = document.getElementById("vendorList");
  detailSection = document.getElementById("vendorDetail");
  detailImg = document.getElementById("detailImg");
  detailName = document.getElementById("detailName");
  detailDesc = document.getElementById("detailDesc");
  detailLocation = document.getElementById("detailLocation");
  detailTag = document.getElementById("detailTag");
  detailWhatsapp = document.getElementById("detailWhatsapp");
  claimBtn = document.getElementById("claimBtn");
  productsWrap = document.getElementById("productsWrap");

  const backBtn = document.getElementById("backBtn");
  const catButtons = document.querySelectorAll(".cat-btn");
  const searchInput = document.getElementById("searchInput");
  const sortSelect = document.getElementById("sortSelect");

  // ── Category filter
  catButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      catButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      activeCategory = (btn.dataset.category || "all").toLowerCase();
      applyFilters();
    });
  });

  // ── Search
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      activeQuery = searchInput.value.trim().toLowerCase();
      applyFilters();
    });
  }

  // ── Sort
  if (sortSelect) {
    sortSelect.addEventListener("change", () => {
      sortVendorCards(sortSelect.value);
    });
  }

  // ── Back button
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      detailSection.classList.add("hidden");
      vendorList.style.display = "";
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  // ── Handle ?category= and ?q= from URL (e.g. coming from homepage)
  const urlParams = new URLSearchParams(window.location.search);
  const urlCategory = (urlParams.get("category") || "all").toLowerCase();
  const urlQuery = (urlParams.get("q") || "").toLowerCase();

  if (urlCategory !== "all") {
    const matchBtn = document.querySelector(
      '.cat-btn[data-category="' + urlCategory + '"]',
    );
    if (matchBtn) {
      catButtons.forEach((b) => b.classList.remove("active"));
      matchBtn.classList.add("active");
    }
    activeCategory = urlCategory;
  }

  if (urlQuery) {
    activeQuery = urlQuery;
    if (searchInput) searchInput.value = urlQuery;
  }

  // ── Auto-open a vendor if ?vendor=ID came from homepage ──
  const vendorIdFromUrl = urlParams.get("vendor");

  if (vendorIdFromUrl) {
    // loadVendors() is async — wait for it, then find & open the card
    loadVendors().then(() => {
      const card = document.querySelector(
        '.vendor-card[data-id="' + vendorIdFromUrl + '"]',
      );
      if (card) openVendorDetail(card);
    });
  } else {
    loadVendors();
  }
});

// ─────────────────────────────────────────────
// 🔥 SORT VENDOR CARDS IN DOM
// ─────────────────────────────────────────────
function sortVendorCards(mode) {
  if (!vendorList) return;
  const cards = Array.from(vendorList.querySelectorAll(".vendor-card"));

  cards.sort((a, b) => {
    const nameA = (a.dataset.name || "").toLowerCase();
    const nameB = (b.dataset.name || "").toLowerCase();
    const catA = (a.dataset.category || "").toLowerCase();
    const catB = (b.dataset.category || "").toLowerCase();

    if (mode === "az") return nameA.localeCompare(nameB);
    if (mode === "za") return nameB.localeCompare(nameA);
    if (mode === "category")
      return catA.localeCompare(catB) || nameA.localeCompare(nameB);
    return 0;
  });

  cards.forEach((card) => vendorList.appendChild(card));
}
