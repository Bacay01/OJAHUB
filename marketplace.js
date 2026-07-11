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

// ─────────────────────────────────────────────
// 🎨 SELF-CONTAINED STYLES FOR THE PRODUCT PREVIEW STRIP
// Injected directly (instead of relying on a separate <link>
// tag being wired correctly into every copy of the HTML), so
// this works no matter how the page's stylesheets are set up.
// High-specificity selectors + !important on the layout-critical
// rules so nothing in style.css (e.g. ".vendor-card img") can
// silently override the grid/overlay/flex behavior.
// ─────────────────────────────────────────────
function injectPreviewStyles() {
  if (document.getElementById("oja-vc-preview-styles")) return;

  const css = `
    .vendor-card .card-content {
      display: flex !important;
      flex-direction: column !important;
    }

    /* Reserved-height header block — keeps the badge/name/meta/location
       area exactly the same height on every card (verified or not,
       one-line or two-line business name), so the preview strip below
       it always starts at the same vertical position across a row. */
    .vendor-card .vc-card-header {
      flex: 0 0 auto !important;
    }

    .vendor-card .card-badges {
      min-height: 24px !important;
      margin: 0 0 6px !important;
    }

    .vendor-card .card-business-name {
      display: -webkit-box !important;
      -webkit-line-clamp: 2 !important;
      -webkit-box-orient: vertical !important;
      overflow: hidden !important;
      min-height: 44px !important;
      line-height: 1.3 !important;
      margin: 0 0 4px !important;
    }

    .vendor-card .card-meta {
      min-height: 18px !important;
      margin: 0 0 4px !important;
      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
    }

    .vendor-card .card-location {
      min-height: 18px !important;
      margin: 0 0 4px !important;
    }

    .vendor-card .vc-preview-strip {
      display: grid !important;
      grid-template-columns: repeat(3, 1fr) !important;
      gap: 8px !important;
      margin: 12px 0 10px !important;
      width: 100% !important;
    }

    .vendor-card .vc-thumb {
      position: relative !important;
      width: 100% !important;
      aspect-ratio: 1 / 1 !important;
      height: auto !important;
      border-radius: 10px !important;
      overflow: hidden !important;
      background: #f3f4f6 !important;
    }

    .vendor-card .vc-thumb img {
      position: absolute !important;
      inset: 0 !important;
      width: 100% !important;
      height: 100% !important;
      object-fit: cover !important;
      display: block !important;
      margin: 0 !important;
    }

    .vendor-card .vc-thumb-price {
      position: absolute !important;
      left: 5px !important;
      bottom: 5px !important;
      z-index: 2 !important;
      background: rgba(17, 17, 17, 0.75) !important;
      color: #fff !important;
      font-size: 10.5px !important;
      font-weight: 700 !important;
      padding: 3px 7px !important;
      border-radius: 20px !important;
      line-height: 1 !important;
      white-space: nowrap !important;
    }

    .vendor-card .vc-thumb--empty {
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      background: #fafafa !important;
      border: 1.5px dashed #e5e7eb !important;
      color: #d1d5db !important;
      font-size: 18px !important;
    }

    .vendor-card .vc-tint-food { background: #fff3e0 !important; }
    .vendor-card .vc-tint-fashion { background: #fce4ec !important; }
    .vendor-card .vc-tint-beauty { background: #f3e5f5 !important; }
    .vendor-card .vc-tint-phones { background: #e3f2fd !important; }
    .vendor-card .vc-tint-electronics { background: #fff8e1 !important; }
    .vendor-card .vc-tint-services { background: #e0f2f1 !important; }
    .vendor-card .vc-tint-default { background: #f3f4f6 !important; }

    .vendor-card .vc-summary-row {
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      gap: 10px !important;
      font-size: 12.5px !important;
      margin: 0 0 12px !important;
      width: 100% !important;
    }

    .vendor-card .vc-items-shown {
      color: #888 !important;
      white-space: nowrap !important;
    }

    .vendor-card .vc-from-price {
      font-weight: 700 !important;
      color: #ff6d00 !important;
      white-space: nowrap !important;
    }

    .vendor-card .vc-footer-actions {
      margin-top: auto !important;
      display: flex !important;
      align-items: stretch !important;
      gap: 8px !important;
      width: 100% !important;
    }

    .vendor-card .vc-footer-actions .view-btn {
      flex: 1 1 auto !important;
      margin-top: 0 !important;
      min-width: 0 !important;
    }

    .vendor-card .vc-wa-quick {
      flex-shrink: 0 !important;
      width: 44px !important;
      height: 44px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      background: #25d366 !important;
      color: #fff !important;
      border-radius: 10px !important;
      font-size: 18px !important;
      text-decoration: none !important;
      transition: background 0.2s ease, transform 0.1s ease;
    }

    .vendor-card .vc-wa-quick:hover {
      background: #128c3e !important;
      transform: translateY(-1px);
    }

    @media (max-width: 600px) {
      .vendor-card .vc-preview-strip { gap: 6px !important; margin: 10px 0 8px !important; }
      .vendor-card .vc-thumb-price { font-size: 10px !important; padding: 2px 6px !important; }
      .vendor-card .vc-summary-row { font-size: 12px !important; margin-bottom: 10px !important; }
      .vendor-card .vc-wa-quick { width: 40px !important; height: 40px !important; font-size: 16px !important; }
    }
  `;

  const style = document.createElement("style");
  style.id = "oja-vc-preview-styles";
  style.textContent = css;
  document.head.appendChild(style);
}

injectPreviewStyles();

// ─────────────────────────────────────────────
// 📍 REAL LOCATION PIN ICON (inline SVG)
// ─────────────────────────────────────────────
function locationPinSvg(size) {
  size = size || 13;
  return (
    '<svg width="' +
    size +
    '" height="' +
    (size * (512 / 384)).toFixed(0) +
    '" viewBox="0 0 384 512" fill="currentColor" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M215.7 499.2C267 435 384 279.4 384 192C384 86 298 0 192 0S0 86 0 192c0 87.4 117 243 168.3 307.2c12.3 15.3 35.1 15.3 47.4 0zM192 128a64 64 0 1 1 0 128 64 64 0 1 1 0-128z"/>' +
    "</svg>"
  );
}

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
// 🏷️ CATEGORY → THUMBNAIL ACCENT TINT
// ─────────────────────────────────────────────
const CATEGORY_TINTS = {
  food: "vc-tint-food",
  fashion: "vc-tint-fashion",
  beauty: "vc-tint-beauty",
  phones: "vc-tint-phones",
  "phones & tech": "vc-tint-phones",
  electronics: "vc-tint-electronics",
  services: "vc-tint-services",
};

function getCategoryTint(category) {
  const key = (category || "").trim().toLowerCase();
  return CATEGORY_TINTS[key] || "vc-tint-default";
}

// ─────────────────────────────────────────────
// 💰 PRICE HELPERS
// ─────────────────────────────────────────────
function formatNaira(value) {
  const num = Number(value);
  if (!value || isNaN(num) || num <= 0) return null;
  return "₦" + num.toLocaleString();
}

function getLowestPrice(products) {
  let lowest = null;
  products.forEach((p) => {
    const num = Number(p.price);
    if (!isNaN(num) && num > 0) {
      if (lowest === null || num < lowest) lowest = num;
    }
  });
  return lowest;
}

// Pick which products to preview in the strip.
// DECISION FLAGGED: there's no reliable `featured` flag on product docs,
// and not every doc has createdAt. This sorts by createdAt (newest first)
// where present, and falls back to natural Firestore order otherwise.
// Add a `featured: true` field to products if you'd rather curate this.
function pickPreviewProducts(products, count) {
  const withDates = products.filter((p) => p.createdAt);
  const withoutDates = products.filter((p) => !p.createdAt);

  withDates.sort((a, b) => {
    const aTime = a.createdAt.toMillis ? a.createdAt.toMillis() : 0;
    const bTime = b.createdAt.toMillis ? b.createdAt.toMillis() : 0;
    return bTime - aTime;
  });

  return [...withDates, ...withoutDates].slice(0, count);
}

// ─────────────────────────────────────────────
// 🧱 BUILD ONE THUMBNAIL TILE (product preview)
// ─────────────────────────────────────────────
function buildThumbTile(product, tintClass) {
  const img =
    product.imageUrl ||
    product.image ||
    "https://via.placeholder.com/160x160?text=No+Image";
  const priceLabel = formatNaira(product.price) || "POR";

  return (
    '<div class="vc-thumb ' +
    tintClass +
    '">' +
    '<img src="' +
    img +
    '" alt="' +
    (product.name || "Product") +
    '" onerror="this.src=\'https://via.placeholder.com/160x160?text=No+Image\'" />' +
    '<span class="vc-thumb-price">' +
    priceLabel +
    "</span>" +
    "</div>"
  );
}

function buildEmptyThumbTile() {
  return '<div class="vc-thumb vc-thumb--empty"><i class="fa-solid fa-image"></i></div>';
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
    const seen = new Map();
    vendors.forEach((vendor) => {
      const key = (vendor.businessName || "").trim().toLowerCase();
      if (!seen.has(key)) {
        seen.set(key, vendor);
      } else {
        const existing = seen.get(key);
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
        return p.vendorId === a.id || pVendor === bName;
      }).length;

      const productsB = products.filter((p) => {
        const pVendor = (p.vendorName || "").trim().toLowerCase();
        const bName = (b.businessName || "").trim().toLowerCase();
        return p.vendorId === b.id || pVendor === bName;
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
        return p.vendorId === data.id || pVendor === bName;
      });

      // WhatsApp check
      const rawPhone = (data.whatsapp || "").replace(/\D/g, "");
      const hasWhatsapp = rawPhone.length > 0;
      let waPhone = rawPhone;
      if (waPhone.startsWith("0")) waPhone = "234" + waPhone.substring(1);

      // Vendor logo/banner — real image or generated initials avatar
      const vendorLogo = getVendorImage(data);

      const categoryLabel = data.category || "Vendor";
      const cityLabel = data.city || "";
      const subCat = data.subCategory ? " · " + data.subCategory : "";
      const tintClass = getCategoryTint(categoryLabel);

      // ── Verified = manually flagged OR vendor has claimed their business
      const isVerifiedVendor = !!(data.verified || data.ownerUid);

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

      const hasCatalog = vendorProducts.length > 0;
      const lowestPrice = hasCatalog ? getLowestPrice(vendorProducts) : null;

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
        ' data-verified="' +
        (isVerifiedVendor ? "1" : "0") +
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

      // ── FIXED-HEIGHT HEADER BLOCK ──
      // Badge/name/meta/location vary in whether they exist at all
      // (verified or not) and how many lines they wrap to. Without a
      // reserved height here, the preview strip below starts at a
      // different vertical position on every card, which is what made
      // the grid look uneven. This wrapper always reserves the same
      // space — badge slot included even when empty — so the strip
      // lines up across every card in a row.
      html += '<div class="vc-card-header">';

      html += '<div class="card-badges">';
      if (isVerifiedVendor) {
        html +=
          '<span class="badge-verified">' +
          '<i class="fa-solid fa-circle-check"></i> Verified · ' +
          cityLabel +
          "</span>";
      }
      html += "</div>";

      html +=
        '<h3 class="card-business-name">' +
        (data.businessName || "No Name") +
        "</h3>";
      html += '<p class="card-meta">' + categoryLabel + subCat + "</p>";

      html +=
        '<p class="card-location">' +
        (cityLabel ? locationPinSvg(12) + " " + cityLabel : "") +
        "</p>";

      html += "</div>"; // close .vc-card-header

      if (hasCatalog) {
        // ── PRODUCT PREVIEW STRIP (up to 3 thumbnails) ──
        const previewProducts = pickPreviewProducts(vendorProducts, 3);
        html += '<div class="vc-preview-strip">';
        previewProducts.forEach((p) => {
          html += buildThumbTile(p, tintClass);
        });
        for (let i = previewProducts.length; i < 3; i++) {
          html += buildEmptyThumbTile();
        }
        html += "</div>";

        // ── SUMMARY ROW ──
        html +=
          '<div class="vc-summary-row">' +
          '<span class="vc-items-shown">' +
          vendorProducts.length +
          " item" +
          (vendorProducts.length !== 1 ? "s" : "") +
          " shown</span>" +
          '<span class="vc-from-price">' +
          (lowestPrice
            ? "from " + formatNaira(lowestPrice)
            : "Price on request") +
          "</span>" +
          "</div>";

        // ── FOOTER ACTIONS: Browse all products + WhatsApp quick action ──
        html += '<div class="vc-footer-actions">';
        html +=
          '<button class="view-btn" type="button">' +
          '<i class="fa-solid fa-store"></i> Browse all products' +
          "</button>";
        if (hasWhatsapp) {
          html +=
            '<a class="vc-wa-quick" href="https://wa.me/' +
            waPhone +
            '" target="_blank" title="Chat on WhatsApp" data-vendor-id="' +
            data.id +
            '" data-vendor-name="' +
            (data.businessName || "").replace(/"/g, "&quot;") +
            '"><i class="fa-brands fa-whatsapp"></i></a>';
        }
        html += "</div>";
      } else {
        // ── FALLBACK: no catalog yet — keep the simple banner-style card ──
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
      }

      html += "</div></div>";
    });

    vendorList.innerHTML = html;

    applyFilters();
    attachViewDetails();
    attachQuickWhatsapp();

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
// (handles both "Browse all products" and legacy "View Details" buttons)
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

// ─────────────────────────────────────────────
// 🔥 QUICK WHATSAPP ACTION (on the card, next to the CTA)
// ─────────────────────────────────────────────
function attachQuickWhatsapp() {
  const quickButtons = document.querySelectorAll(".vc-wa-quick");
  quickButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      trackWhatsappClick(
        btn.dataset.vendorId || "",
        btn.dataset.vendorName || "",
      );
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
  const isVerified = card.dataset.verified === "1";

  // ── Hero image: use stored image, or generate avatar as fallback
  const storedImage = card.dataset.image;
  detailImg.src = storedImage || makeAvatarUrl(vendorName);
  detailImg.alt = vendorName;

  // ── Verified badge on avatar
  const verifiedBadge = document.getElementById("vpVerifiedBadge");
  if (verifiedBadge) {
    verifiedBadge.classList.toggle("hidden", !isVerified);
  }

  // ── Category badge
  detailTag.textContent =
    categoryLabel.charAt(0).toUpperCase() + categoryLabel.slice(1);

  // ── Name, location, description
  detailName.textContent = vendorName;
  detailLocation.innerHTML =
    locationPinSvg(13) + " " + (card.dataset.location || "");
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
          locationPinSvg(12) +
          " " +
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
      (isVerified
        ? '<span class="vd-tag vd-tag--verified">' +
          '<i class="fa-solid fa-circle-check"></i> Verified Vendor' +
          "</span>"
        : "");
  }

  // ── WhatsApp button (in hero actions row)
  if (detailWhatsapp) {
    if (phone) {
      detailWhatsapp.href = "https://wa.me/" + phone;
      detailWhatsapp.classList.remove("hidden");
      detailWhatsapp.onclick = () =>
        trackWhatsappClick(card.dataset.id, vendorName);
    } else {
      detailWhatsapp.classList.add("hidden");
    }
  }

  // ── Claim button
  claimBtn.href =
    "pages/claim_business/claim_business.html?vendorId=" + card.dataset.id;

  // ── Stash current vendor so the feedback form knows who it's about
  window.currentDetailVendor = {
    id: card.dataset.id,
    name: vendorName,
  };

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
// 🔥 VENDOR FEEDBACK / REPORT FORM
// ─────────────────────────────────────────────
function setupFeedbackForm() {
  const sentimentRow = document.getElementById("vpSentimentRow");
  const feedbackForm = document.getElementById("vendorFeedbackForm");
  const statusEl = document.getElementById("vpFeedbackStatus");
  const submitBtn = document.getElementById("vpFeedbackSubmitBtn");

  if (!feedbackForm) return;

  let selectedSentiment = "neutral";

  if (sentimentRow) {
    sentimentRow.querySelectorAll(".vp-sentiment-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        sentimentRow
          .querySelectorAll(".vp-sentiment-btn")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        selectedSentiment = btn.dataset.sentiment;
      });
    });
  }

  feedbackForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const vendor = window.currentDetailVendor;
    const messageInput = document.getElementById("vpFeedbackMessage");
    const nameInput = document.getElementById("vpFeedbackName");
    const message = messageInput ? messageInput.value.trim() : "";
    const reporterName = nameInput ? nameInput.value.trim() : "";

    if (!vendor) {
      statusEl.textContent =
        "Something went wrong. Please reopen the vendor page and try again.";
      statusEl.className = "vp-feedback-status error";
      return;
    }
    if (!message) {
      statusEl.textContent = "Please write a message before submitting.";
      statusEl.className = "vp-feedback-status error";
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting...";

    try {
      await addDoc(collection(db, "vendorReports"), {
        vendorId: vendor.id,
        vendorName: vendor.name,
        sentiment: selectedSentiment,
        message: message,
        reporterName: reporterName || "Anonymous",
        status: "new",
        timestamp: serverTimestamp(),
      });

      statusEl.textContent =
        "Thank you — your feedback has been submitted to the OjaHub team.";
      statusEl.className = "vp-feedback-status success";
      feedbackForm.reset();
      if (sentimentRow) {
        sentimentRow
          .querySelectorAll(".vp-sentiment-btn")
          .forEach((b) => b.classList.remove("active"));
      }
      selectedSentiment = "neutral";
    } catch (err) {
      console.error("Feedback submit error:", err);
      statusEl.textContent = "Failed to submit. Please try again.";
      statusEl.className = "vp-feedback-status error";
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit Feedback";
    }
  });
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

  // ── Feedback form wiring
  setupFeedbackForm();

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
