// 🔥 FIREBASE IMPORT
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
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

// 🔥 TRACK VENDOR VIEW
async function trackVendorView(vendorId, vendorName) {
  try {
    await addDoc(collection(db, "vendor_views"), {
      vendorId,
      vendorName,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.log("Vendor tracking error:", error);
  }
}

// 🔥 TRACK WHATSAPP CLICK
async function trackWhatsappClick(vendorId, vendorName) {
  try {
    await addDoc(collection(db, "whatsapp_clicks"), {
      vendorId,
      vendorName,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.log("WhatsApp tracking error:", error);
  }
}

// 🔥 TRACK SEARCHES
async function trackSearch(keyword) {
  try {
    await addDoc(collection(db, "searches"), {
      keyword,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.log("Search tracking error:", error);
  }
}

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
// ─────────────────────────────────────────────
const AVATAR_PALETTE = [
  ["#FF6D00", "#fff"],
  ["#1565C0", "#fff"],
  ["#2E7D32", "#fff"],
  ["#6A1B9A", "#fff"],
  ["#AD1457", "#fff"],
  ["#00838F", "#fff"],
  ["#E65100", "#fff"],
  ["#283593", "#fff"],
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

    // ── DEDUPLICATE claimed vs manually-added vendors ──────────
    // When a vendor claims their business, a new doc is created
    // with ownerUid. The old manual doc still exists → duplicate.
    // We keep the claimed version (has ownerUid) over the manual one.
    const seen = new Map();
    vendors.forEach((vendor) => {
      const key = (vendor.businessName || "").trim().toLowerCase();
      if (!seen.has(key)) {
        seen.set(key, vendor);
      } else {
        const existing = seen.get(key);
        // Prefer the claimed version
        if (vendor.ownerUid && !existing.ownerUid) {
          seen.set(key, vendor);
        }
      }
    });
    const deduped = Array.from(seen.values());

    // ── Sort: vendors with products first, then category, then A-Z
    deduped.sort((a, b) => {
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

      if (productsB !== productsA) return productsB - productsA;

      const catA = (a.category || "").toLowerCase();
      const catB = (b.category || "").toLowerCase();
      if (catA !== catB) return catA.localeCompare(catB);

      return (a.businessName || "").localeCompare(b.businessName || "");
    });

    let html = "";

    deduped.forEach((data) => {
      if (data.isActive === false) return;

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
  trackVendorView(card.dataset.id, vendorName);

  const rawPhone = (card.dataset.whatsapp || "").replace(/\D/g, "");
  let phone = rawPhone;
  if (phone.startsWith("0")) phone = "234" + phone.substring(1);

  const categoryLabel = card.dataset.category || "Vendor";

  // ── Hero image: use stored image, or generate avatar as fallback
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

  // ── Fancy info tags
  const tagsWrap = document.getElementById("vendorDetailTags");
  if (tagsWrap) {
    const hasWA = phone.length > 0;
    tagsWrap.innerHTML =
      '<span class="vd-tag vd-tag--category">' +
      '<i class="fa-solid fa-tag"></i> ' +
      categoryLabel +
      "</span>" +
      (card.dataset.location
        ? '<span class="vd-tag vd-tag--location">' +
          '<i class="fa-solid fa-location-dot"></i> ' +
          card.dataset.location +
          "</span>"
        : "") +
      (hasWA
        ? '<span class="vd-tag vd-tag--wa">' +
          '<i class="fa-brands fa-whatsapp"></i> Replies on WhatsApp' +
          "</span>"
        : '<span class="vd-tag vd-tag--no-wa">' +
          '<i class="fa-solid fa-comment-slash"></i> No WhatsApp' +
          "</span>") +
      '<span class="vd-tag vd-tag--verified">' +
      '<i class="fa-solid fa-circle-check"></i> Verified Vendor' +
      "</span>";
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
    searchInput.addEventListener("input", async () => {
      activeQuery = searchInput.value.trim().toLowerCase();
      applyFilters();
      if (activeQuery.length > 2) {
        trackSearch(activeQuery);
      }
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

  // ── Handle ?category= and ?q= from URL
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

  // ── Auto-open a vendor if ?vendor=ID came from homepage
  const vendorIdFromUrl = urlParams.get("vendor");

  if (vendorIdFromUrl) {
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
