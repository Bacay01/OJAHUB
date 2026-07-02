// ═══════════════════════════════════════════════════════════
// OJAHUB ADMIN — CATEGORIES PAGE
// admin/js/categories.js
//
// Renders:
//  1. Stat strip  — total categories / top category / total
//                   views / total WA clicks
//  2. Views by category chart   (horizontal bar)
//  3. WA clicks by category chart (horizontal bar)
//  4. Category overview cards   — vendor count + views + clicks
//                                  per card with a progress bar
//  5. Full category table       — filterable, sortable by views
//
// Data: vendors (for category + vendor count),
//       vendor_views, whatsapp_clicks
// Uses getCategoryPerformance() from data-service.js which
// already handles dedup + strict matching.
// ═══════════════════════════════════════════════════════════

import { db } from "../../js/firebase.js";
import {
  collection,
  getDocs,
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";

import { renderHorizontalBarChart } from "./admin-charts.js";

// ── State ────────────────────────────────────────────────
let allCategories = []; // [{ category, vendors, views, clicks, convRate }]
let filteredCategories = [];

// ── DOM refs ─────────────────────────────────────────────
let tbody, tableEmpty, tableEmptyMsg, tableError, tableSub;
let resultsLabel, catSearchInput;

// ── Color palette for category icon chips ────────────────
const COLOR_CYCLE = [
  "orange",
  "blue",
  "green",
  "purple",
  "teal",
  "orange",
  "blue",
  "green",
  "purple",
  "teal",
];

// ─────────────────────────────────────────────────────────
// DEDUP VENDORS (same logic as marketplace.js)
// ─────────────────────────────────────────────────────────
function dedupeVendors(vendors) {
  const seen = new Map();
  vendors.forEach((v) => {
    const key = (v.businessName || "").trim().toLowerCase();
    if (!seen.has(key)) {
      seen.set(key, v);
    } else {
      if (v.ownerUid && !seen.get(key).ownerUid) seen.set(key, v);
    }
  });
  return Array.from(seen.values());
}

// ─────────────────────────────────────────────────────────
// CONVERSION RATE BADGE
// ─────────────────────────────────────────────────────────
function convRateBadge(views, clicks) {
  if (!views) return `<span class="conv-rate low">—</span>`;
  const rate = ((clicks / views) * 100).toFixed(1);
  const cls = rate >= 15 ? "high" : rate >= 5 ? "mid" : "low";
  return `<span class="conv-rate ${cls}">${rate}%</span>`;
}

// ─────────────────────────────────────────────────────────
// BUILD TABLE ROW
// ─────────────────────────────────────────────────────────
function buildTableRow(cat, rank) {
  return `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:10px;">
          <div class="admin-stat-card-icon ${COLOR_CYCLE[rank % COLOR_CYCLE.length]}"
               style="width:30px;height:30px;border-radius:8px;font-size:12px;flex-shrink:0;">
            <i class="fa-solid fa-tag"></i>
          </div>
          <span style="font-weight:700;font-size:13.5px;color:var(--text-primary);">${cat.category}</span>
        </div>
      </td>
      <td style="font-size:13px;color:var(--text-secondary);">${cat.vendors.toLocaleString()}</td>
      <td style="font-size:13px;font-weight:700;color:var(--text-primary);">${cat.views.toLocaleString()}</td>
      <td style="font-size:13px;color:var(--text-secondary);">${cat.clicks.toLocaleString()}</td>
      <td>${convRateBadge(cat.views, cat.clicks)}</td>
    </tr>
  `;
}

// ─────────────────────────────────────────────────────────
// RENDER TABLE
// ─────────────────────────────────────────────────────────
function renderTable() {
  if (filteredCategories.length === 0) {
    tbody.innerHTML = "";
    tableEmpty.classList.remove("hidden");
    tableEmptyMsg.textContent = catSearchInput.value
      ? `No categories match "${catSearchInput.value}".`
      : "No category data found.";
    resultsLabel.textContent = "";
    tableSub.textContent = "0 categories";
    return;
  }

  tableEmpty.classList.add("hidden");
  tbody.innerHTML = filteredCategories
    .map((cat, i) => buildTableRow(cat, i))
    .join("");
  tableSub.textContent = `${filteredCategories.length} categor${filteredCategories.length !== 1 ? "ies" : "y"}`;
  resultsLabel.textContent = `${filteredCategories.length} of ${allCategories.length}`;
}

// ─────────────────────────────────────────────────────────
// APPLY FILTER
// ─────────────────────────────────────────────────────────
function applyFilter() {
  const q = (catSearchInput.value || "").toLowerCase().trim();
  filteredCategories = q
    ? allCategories.filter((c) => c.category.toLowerCase().includes(q))
    : [...allCategories];
  renderTable();
}

// ─────────────────────────────────────────────────────────
// STAT STRIP
// ─────────────────────────────────────────────────────────
function renderStatStrip(categories) {
  const totalViews = categories.reduce((s, c) => s + c.views, 0);
  const totalClicks = categories.reduce((s, c) => s + c.clicks, 0);
  const topCat = categories[0]?.category || "—";

  document.getElementById("statTotalCats").textContent =
    categories.length.toLocaleString();
  document.getElementById("statTopCat").textContent = topCat;
  document.getElementById("statTotalViews").textContent =
    totalViews.toLocaleString();
  document.getElementById("statTotalWA").textContent =
    totalClicks.toLocaleString();

  document.querySelectorAll("#catStatStrip .admin-stat-card").forEach((c) => {
    c.style.opacity = "1";
  });
}

// ─────────────────────────────────────────────────────────
// CHARTS
// ─────────────────────────────────────────────────────────
function renderCharts(categories) {
  const top = categories.slice(0, 10);

  // Views chart
  if (top.some((c) => c.views > 0)) {
    renderHorizontalBarChart(
      "catViewsChart",
      top.map((c) => c.category),
      top.map((c) => c.views),
    );
  } else {
    document.getElementById("catViewsEmpty").classList.remove("hidden");
  }

  // WA clicks chart
  if (top.some((c) => c.clicks > 0)) {
    renderHorizontalBarChart(
      "catWAChart",
      top.map((c) => c.category),
      top.map((c) => c.clicks),
    );
  } else {
    document.getElementById("catWAEmpty").classList.remove("hidden");
  }
}

// ─────────────────────────────────────────────────────────
// CATEGORY OVERVIEW CARDS
// ─────────────────────────────────────────────────────────
function renderCategoryCards(categories) {
  const grid = document.getElementById("catCardsGrid");
  const emptyEl = document.getElementById("catCardsEmpty");
  const maxViews = categories[0]?.views || 1;

  if (categories.length === 0) {
    grid.innerHTML = "";
    emptyEl.classList.remove("hidden");
    return;
  }

  grid.innerHTML = categories
    .map((cat, i) => {
      const color = COLOR_CYCLE[i % COLOR_CYCLE.length];
      const pct = Math.round((cat.views / maxViews) * 100);
      const conv = cat.views
        ? ((cat.clicks / cat.views) * 100).toFixed(1) + "%"
        : "—";

      return `
      <div class="cat-card">
        <div class="cat-card-header">
          <div class="admin-stat-card-icon ${color} cat-card-icon">
            <i class="fa-solid fa-tag"></i>
          </div>
          <span class="cat-card-name">${cat.category}</span>
        </div>
        <div class="cat-card-metrics">
          <div class="cat-metric">
            <div class="cat-metric-value">${cat.vendors.toLocaleString()}</div>
            <div class="cat-metric-label">Vendors</div>
          </div>
          <div class="cat-metric">
            <div class="cat-metric-value">${cat.views.toLocaleString()}</div>
            <div class="cat-metric-label">Views</div>
          </div>
          <div class="cat-metric">
            <div class="cat-metric-value">${conv}</div>
            <div class="cat-metric-label">Conv.</div>
          </div>
        </div>
        <div class="cat-bar-wrap">
          <div class="cat-bar" style="width:${pct}%"></div>
        </div>
      </div>
    `;
    })
    .join("");
}

// ─────────────────────────────────────────────────────────
// LOAD FROM FIRESTORE
// ─────────────────────────────────────────────────────────
async function loadCategories() {
  try {
    const [vendorSnap, viewsSnap, waSnap] = await Promise.all([
      getDocs(collection(db, "vendors")),
      getDocs(collection(db, "vendor_views")),
      getDocs(collection(db, "whatsapp_clicks")),
    ]);

    // Dedup vendors
    const rawVendors = [];
    vendorSnap.forEach((d) => rawVendors.push({ id: d.id, ...d.data() }));
    const vendors = dedupeVendors(rawVendors).filter(
      (v) => v.isActive !== false,
    );

    // Build vendor-id → category map
    const vendorCatMap = {};
    vendors.forEach((v) => {
      vendorCatMap[v.id] = (v.category || "Other").trim();
    });

    // Count vendors per category
    const vendorCounts = {};
    vendors.forEach((v) => {
      const cat = (v.category || "Other").trim();
      vendorCounts[cat] = (vendorCounts[cat] || 0) + 1;
    });

    // Count views per category (via vendorId → category)
    const viewCounts = {};
    viewsSnap.forEach((d) => {
      const { vendorId } = d.data();
      const cat = vendorCatMap[vendorId];
      if (cat) viewCounts[cat] = (viewCounts[cat] || 0) + 1;
    });

    // Count WA clicks per category
    const waCounts = {};
    waSnap.forEach((d) => {
      const { vendorId } = d.data();
      const cat = vendorCatMap[vendorId];
      if (cat) waCounts[cat] = (waCounts[cat] || 0) + 1;
    });

    // Merge all known categories
    const allCats = new Set([
      ...Object.keys(vendorCounts),
      ...Object.keys(viewCounts),
      ...Object.keys(waCounts),
    ]);

    allCategories = Array.from(allCats)
      .map((cat) => ({
        category: cat,
        vendors: vendorCounts[cat] || 0,
        views: viewCounts[cat] || 0,
        clicks: waCounts[cat] || 0,
      }))
      .sort((a, b) => b.views - a.views || b.clicks - a.clicks);

    filteredCategories = [...allCategories];

    renderStatStrip(allCategories);
    renderCharts(allCategories);
    renderCategoryCards(allCategories);
    renderTable();
  } catch (err) {
    console.error("Categories page load error:", err);
    tbody.innerHTML = "";
    tableError.classList.remove("hidden");
    tableSub.textContent = "Failed to load";
    document.getElementById("catCardsGrid").innerHTML = "";
    document.getElementById("catCardsEmpty").classList.remove("hidden");
  }
}

// ─────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  tbody = document.getElementById("catTableBody");
  tableEmpty = document.getElementById("catTableEmpty");
  tableEmptyMsg = document.getElementById("catTableEmptyMsg");
  tableError = document.getElementById("catTableError");
  tableSub = document.getElementById("catTableSub");
  resultsLabel = document.getElementById("catResultsLabel");
  catSearchInput = document.getElementById("catSearch");

  catSearchInput.addEventListener("input", applyFilter);

  loadCategories();
});
