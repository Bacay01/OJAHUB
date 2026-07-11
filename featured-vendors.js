// ═══════════════════════════════════════════════════════════
// OJAHUB — HOMEPAGE FEATURED VENDORS (live from Firebase)
// ═══════════════════════════════════════════════════════════

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";

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

// ─────────────────────────────────────────────
// 🎨 SELF-CONTAINED STYLES FOR THE PRODUCT PREVIEW STRIP
// Injected directly (same approach as marketplace.js) so this
// works regardless of how style.css cascades on this page —
// high-specificity selectors + !important on layout-critical
// rules, scoped under .featured-vendors-card so it never leaks
// into the marketplace page's .vendor-card styles.
// ─────────────────────────────────────────────
function injectPreviewStyles() {
  if (document.getElementById("oja-fv-preview-styles")) return;

  const css = `
    .featured-vendors-card {
      display: flex !important;
      flex-direction: column !important;
    }

    .featured-vendors-card .featured-vendors-card-body {
      display: flex !important;
      flex-direction: column !important;
    }

    /* Reserved-height header block — badge/name/category/location
       always take up the same vertical space whether or not a
       vendor is verified and whether the name wraps to one or two
       lines, so the preview strip below starts at the same
       vertical position across every card in a row. */
    .featured-vendors-card .fv-card-header {
      flex: 0 0 auto !important;
    }

    .featured-vendors-card .fv-badges {
      min-height: 24px !important;
      margin: 0 0 6px !important;
    }

    .featured-vendors-card .featured-vendors-card-name {
      display: -webkit-box !important;
      -webkit-line-clamp: 2 !important;
      -webkit-box-orient: vertical !important;
      overflow: hidden !important;
      min-height: 42px !important;
      line-height: 1.25 !important;
      margin: 2px 0 2px !important;
    }

    .featured-vendors-card .featured-vendors-card-category {
      min-height: 17px !important;
      margin: 0 0 2px !important;
      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
    }

    .featured-vendors-card .featured-vendors-card-location {
      min-height: 17px !important;
      margin: 0 !important;
    }

    /* ── Product preview strip: up to 3 thumbnails ─────────── */
    .featured-vendors-card .fv-preview-strip {
      display: grid !important;
      grid-template-columns: repeat(3, 1fr) !important;
      gap: 7px !important;
      margin: 10px 0 8px !important;
      width: 100% !important;
    }

    .featured-vendors-card .fv-thumb {
      position: relative !important;
      width: 100% !important;
      aspect-ratio: 1 / 1 !important;
      height: auto !important;
      border-radius: 9px !important;
      overflow: hidden !important;
      background: #f3f4f6 !important;
    }

    .featured-vendors-card .fv-thumb img {
      position: absolute !important;
      inset: 0 !important;
      width: 100% !important;
      height: 100% !important;
      object-fit: cover !important;
      display: block !important;
      margin: 0 !important;
    }

    .featured-vendors-card .fv-thumb-price {
      position: absolute !important;
      left: 4px !important;
      bottom: 4px !important;
      z-index: 2 !important;
      background: rgba(17, 17, 17, 0.75) !important;
      color: #fff !important;
      font-size: 10px !important;
      font-weight: 700 !important;
      padding: 2px 6px !important;
      border-radius: 20px !important;
      line-height: 1 !important;
      white-space: nowrap !important;
    }

    .featured-vendors-card .fv-thumb--empty {
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      background: #fafafa !important;
      border: 1.5px dashed #e5e7eb !important;
      color: #d1d5db !important;
      font-size: 16px !important;
    }

    .featured-vendors-card .fv-tint-food { background: #fff3e0 !important; }
    .featured-vendors-card .fv-tint-fashion { background: #fce4ec !important; }
    .featured-vendors-card .fv-tint-beauty { background: #f3e5f5 !important; }
    .featured-vendors-card .fv-tint-phones { background: #e3f2fd !important; }
    .featured-vendors-card .fv-tint-electronics { background: #fff8e1 !important; }
    .featured-vendors-card .fv-tint-services { background: #e0f2f1 !important; }
    .featured-vendors-card .fv-tint-default { background: #f3f4f6 !important; }

    /* ── Summary row: "X items shown" / "from ₦Y" ──────────── */
    .featured-vendors-card .fv-summary-row {
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      gap: 8px !important;
      font-size: 12px !important;
      margin: 0 !important;
      width: 100% !important;
    }

    .featured-vendors-card .fv-items-shown {
      color: #888 !important;
      white-space: nowrap !important;
    }

    .featured-vendors-card .fv-from-price {
      font-weight: 700 !important;
      color: #ff7a00 !important;
      white-space: nowrap !important;
    }

    /* ── Match the marketplace page's button shape ──────────
       style.css's .btn-veiw-details is a full pill (999px) —
       the marketplace grid's buttons use a 10px squared-off
       radius instead. Overriding here so both pages match.
       (The WhatsApp quick button's radius is set further below,
       in its main rule block.) */
    .featured-vendors-card .btn-veiw-details {
      border-radius: 10px !important;
    }

    /* ── Footer actions: Browse all products + quick WhatsApp ── */
    .featured-vendors-card-footer.fv-footer-actions {
      display: flex !important;
      align-items: stretch !important;
      gap: 8px !important;
    }

    .featured-vendors-card-footer.fv-footer-actions .btn-veiw-details {
      flex: 1 1 auto !important;
      min-width: 0 !important;
    }

    .featured-vendors-card .fv-wa-quick {
      flex-shrink: 0 !important;
      width: 42px !important;
      height: 42px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      background: #25d366 !important;
      color: #fff !important;
      border-radius: 10px !important;
      font-size: 17px !important;
      text-decoration: none !important;
      transition: background 0.2s ease, transform 0.1s ease;
    }

    .featured-vendors-card .fv-wa-quick:hover {
      background: #128c3e !important;
      transform: translateY(-1px);
    }

    @media (max-width: 600px) {
      .featured-vendors-card .fv-preview-strip { gap: 6px !important; margin: 8px 0 6px !important; }
      .featured-vendors-card .fv-thumb-price { font-size: 9.5px !important; padding: 2px 5px !important; }
      .featured-vendors-card .fv-summary-row { font-size: 11.5px !important; }
      .featured-vendors-card .fv-wa-quick { width: 38px !important; height: 38px !important; font-size: 15px !important; }
    }
  `;

  const style = document.createElement("style");
  style.id = "oja-fv-preview-styles";
  style.textContent = css;
  document.head.appendChild(style);
}

// ── Avatar system ─────────────────────────────────────────
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
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

function makeAvatarUrl(businessName) {
  businessName = businessName || "";
  var initials = getInitials(businessName);
  var pair = nameToColor(businessName);
  var bg = pair[0],
    fg = pair[1];

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
    return (
      "data:image/svg+xml;base64," +
      btoa(
        '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="240"><rect width="400" height="240" fill="' +
          bg +
          '"/></svg>',
      )
    );
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

// ── Category → thumbnail accent tint (mirrors marketplace.js) ─
const CATEGORY_TINTS = {
  food: "fv-tint-food",
  fashion: "fv-tint-fashion",
  beauty: "fv-tint-beauty",
  phones: "fv-tint-phones",
  "phones & tech": "fv-tint-phones",
  electronics: "fv-tint-electronics",
  services: "fv-tint-services",
};

function getCategoryTint(category) {
  const key = (category || "").trim().toLowerCase();
  return CATEGORY_TINTS[key] || "fv-tint-default";
}

// ── Price helpers ──────────────────────────────────────────
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

// Same "which products to preview" decision as marketplace.js:
// prefer createdAt (newest first) where present, else natural order.
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

function buildThumbTile(product, tintClass) {
  const img =
    product.imageUrl ||
    product.image ||
    "https://via.placeholder.com/160x160?text=No+Image";
  const priceLabel = formatNaira(product.price) || "POR";

  return (
    '<div class="fv-thumb ' +
    tintClass +
    '">' +
    '<img src="' +
    img +
    '" alt="' +
    (product.name || "Product") +
    '" onerror="this.src=\'https://via.placeholder.com/160x160?text=No+Image\'" />' +
    '<span class="fv-thumb-price">' +
    priceLabel +
    "</span>" +
    "</div>"
  );
}

function buildEmptyThumbTile() {
  return '<div class="fv-thumb fv-thumb--empty"><i class="fa-solid fa-image"></i></div>';
}

// ── Detect base path ──────────────────────────────────────
function getBasePath() {
  const isLocalhost =
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "localhost";
  const isCustomDomain =
    window.location.hostname === "ojahubapp.com" ||
    window.location.hostname === "www.ojahubapp.com";

  if (isLocalhost) return ""; // localhost → no prefix
  if (isCustomDomain) return ""; // ojahubapp.com → no prefix
  return "/ojahub_v2"; // GitHub Pages subdomain → needs prefix
}

// ── Build one vendor card ─────────────────────────────────
function buildCard(data) {
  const name = data.businessName || "No Name";
  const category = data.category || "Vendor";
  const subCat = data.subCategory ? " · " + data.subCategory : "";
  const city = data.city || "";
  const imgSrc = getVendorImage(data);
  const tintClass = getCategoryTint(category);

  const rawPhone = (data.whatsapp || "").replace(/\D/g, "");
  const hasWA = rawPhone.length > 0;
  let waPhone = rawPhone;
  if (waPhone.startsWith("0")) waPhone = "234" + waPhone.substring(1);

  const base = getBasePath();
  const detailUrl =
    base + "/marketplace.html?vendor=" + encodeURIComponent(data.id);

  // Verified = manually flagged OR vendor has claimed their business —
  // same rule as the marketplace grid. (Previously this badge showed
  // on every card regardless of vendor.verified/ownerUid — fixed here.)
  const isVerifiedVendor = !!(data.verified || data.ownerUid);

  const vendorProducts = data._products || [];
  const hasCatalog = vendorProducts.length > 0;
  const lowestPrice = hasCatalog ? getLowestPrice(vendorProducts) : null;

  let html =
    '<div class="featured-vendors-card anim anim-up" data-id="' +
    data.id +
    '">';

  html +=
    '<img class="featured-vendors-card-img" src="' +
    imgSrc +
    '" alt="' +
    name +
    '" />';

  html += '<div class="featured-vendors-card-body">';

  // ── FIXED-HEIGHT HEADER BLOCK (badge/name/category/location) ──
  html += '<div class="fv-card-header">';

  html += '<div class="fv-badges">';
  if (isVerifiedVendor) {
    // Same markup/class as the marketplace grid's badge (.badge-verified,
    // orange pill) — was previously using the older blue .verified-badge
    // style, which is why the two pages looked inconsistent.
    html +=
      '<span class="badge-verified">' +
      '<i class="fa-solid fa-circle-check"></i> Verified · ' +
      city +
      "</span>";
  }
  html += "</div>";

  html += '<p class="featured-vendors-card-name">' + name + "</p>";
  html +=
    '<p class="featured-vendors-card-category">' + category + subCat + "</p>";
  html +=
    '<p class="featured-vendors-card-location">' +
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
    '<path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/>' +
    '<circle cx="12" cy="10" r="3"/>' +
    "</svg>" +
    " " +
    city +
    "</p>";

  html += "</div>"; // close .fv-card-header

  if (hasCatalog) {
    // ── PRODUCT PREVIEW STRIP (up to 3 thumbnails) ──
    const previewProducts = pickPreviewProducts(vendorProducts, 3);
    html += '<div class="fv-preview-strip">';
    previewProducts.forEach((p) => {
      html += buildThumbTile(p, tintClass);
    });
    for (let i = previewProducts.length; i < 3; i++) {
      html += buildEmptyThumbTile();
    }
    html += "</div>";

    // ── SUMMARY ROW ──
    html +=
      '<div class="fv-summary-row">' +
      '<span class="fv-items-shown">' +
      vendorProducts.length +
      " item" +
      (vendorProducts.length !== 1 ? "s" : "") +
      " shown</span>" +
      '<span class="fv-from-price">' +
      (lowestPrice ? "from " + formatNaira(lowestPrice) : "Price on request") +
      "</span>" +
      "</div>";
  } else {
    // ── FALLBACK: no catalog yet ──
    html += '<div class="featured-vendors-card-tags">';
    html += hasWA
      ? '<span class="tag replies-tag">Replies on WhatsApp</span>'
      : '<span class="tag price-tag">No WhatsApp</span>';
    html += '<span class="tag price-tag">Price on request</span>';
    html += "</div>";
  }

  html += "</div>"; // close .featured-vendors-card-body

  // ── FOOTER: Browse all products + quick WhatsApp (or plain View Details) ──
  if (hasCatalog) {
    html += '<div class="featured-vendors-card-footer fv-footer-actions">';
    html +=
      '<a href="' +
      detailUrl +
      '" class="btn-veiw-details">' +
      '<i class="fa-solid fa-store"></i> Browse all products' +
      "</a>";
    if (hasWA) {
      html +=
        '<a class="fv-wa-quick" href="https://wa.me/' +
        waPhone +
        '" target="_blank" title="Chat on WhatsApp"><i class="fa-brands fa-whatsapp"></i></a>';
    }
    html += "</div>";
  } else {
    html += '<div class="featured-vendors-card-footer">';
    html +=
      '<a href="' +
      detailUrl +
      '" class="btn-veiw-details">' +
      '<i class="fa-regular fa-eye"></i> View Details' +
      "</a>";
    html += "</div>";
  }

  html += "</div>"; // close .featured-vendors-card

  return html;
}

// ── Update category counts on homepage ────────────────────
function updateCategoryCounts(vendors) {
  const categoryCounts = {};
  vendors.forEach((v) => {
    const cat = (v.category || "others").toLowerCase();
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });

  const categorySlug = [
    "food",
    "fashion",
    "beauty",
    "phones",
    "services",
    "others",
  ];

  categorySlug.forEach((slug) => {
    const link = document.querySelector(
      `a[href="marketplace.html?category=${slug}"]`,
    );
    if (!link) return;

    const paragraphs = link.querySelectorAll("p");
    const countEl = paragraphs[1];
    if (!countEl) return;

    const count = categoryCounts[slug] || 0;
    countEl.textContent = count + (count === 1 ? " vendor" : " vendors");
  });
}

// ── Main: fetch vendors + products, render ────────────────
async function loadFeaturedVendors() {
  const grid = document.getElementById("vendorGrid");
  if (!grid) return;

  injectPreviewStyles();

  grid.innerHTML = '<div class="featured-vendors-card skeleton"></div>'.repeat(
    9,
  );

  try {
    const [vendorSnapshot, productSnapshot] = await Promise.all([
      getDocs(collection(db, "vendors")),
      getDocs(collection(db, "products")),
    ]);

    const products = [];
    productSnapshot.forEach((d) => products.push({ id: d.id, ...d.data() }));

    const vendors = [];
    vendorSnapshot.forEach((d) => vendors.push({ id: d.id, ...d.data() }));

    // ── DEDUPLICATE claimed vs manually-added vendors ──────
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

    // UPDATE CATEGORY COUNTS (use deduped list)
    updateCategoryCounts(deduped);

    if (deduped.length === 0) {
      grid.innerHTML =
        '<p style="grid-column:1/-1;text-align:center;color:#999;padding:40px 0">No vendors yet.</p>';
      return;
    }

    // Match products per vendor, store both the list (for the preview
    // strip) and the count (for sorting) on the vendor object.
    deduped.forEach((vendor) => {
      vendor._products = products.filter((p) => {
        const pVendor = (p.vendorName || "").trim().toLowerCase();
        const bName = (vendor.businessName || "").trim().toLowerCase();
        return p.vendorId === vendor.id || pVendor === bName;
      });
      vendor._productCount = vendor._products.length;
    });

    // Sort by product count descending, then A-Z
    deduped.sort((a, b) => {
      if (b._productCount !== a._productCount)
        return b._productCount - a._productCount;
      return (a.businessName || "").localeCompare(b.businessName || "");
    });

    // Take top 9
    const featured = deduped.slice(0, Math.min(9, deduped.length));
    grid.innerHTML = featured.map(buildCard).join("");

    // Re-run intersection observer so cards animate in
    const newCards = grid.querySelectorAll(".anim");
    if (newCards.length > 0) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("show");
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.1 },
      );
      newCards.forEach((el) => observer.observe(el));
    }
  } catch (err) {
    console.error("loadFeaturedVendors error:", err);
    grid.innerHTML =
      '<p style="grid-column:1/-1;text-align:center;color:#c00;padding:40px 0">Could not load vendors. Please refresh.</p>';
  }
}

// Run when DOM is ready
document.addEventListener("DOMContentLoaded", loadFeaturedVendors);
