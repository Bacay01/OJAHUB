// ═══════════════════════════════════════════════════════════
// OJAHUB ADMIN — VENDORS PAGE
// admin/js/vendors.js
//
// Renders:
//  1. Stat strip  — total / active / claimed / new-this-month
//  2. Growth chart — cumulative vendors over last 6 months
//  3. Category chart — vendor count per category (horizontal bar)
//  4. Full vendor table — search + category + status filters,
//     client-side pagination (25 per page)
//
// Data sources: getAllVendors(), getVendorGrowth(),
//               getCategoryBreakdown() from data-service.js
// Charts: renderBarChart(), renderHorizontalBarChart() from
//         admin-charts.js
// ═══════════════════════════════════════════════════════════

import {
  getOverviewStats,
  getVendorGrowth,
  getCategoryPerformance,
} from "./data-service.js";

import { renderTrendChart, renderHorizontalBarChart } from "./admin-charts.js";

// ── We also need the raw vendor list — data-service exposes
//    the collections via its cache, but doesn't export a bare
//    getAllVendors(). We import db directly and do a single
//    read here, reusing the same dedup logic. ──────────────
import { db } from "../../js/firebase.js";
import {
  collection,
  getDocs,
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";

// ── Pagination config ────────────────────────────────────
const PAGE_SIZE = 25;

// ── State ────────────────────────────────────────────────
let allVendors = []; // deduped, full list
let filteredVendors = []; // after search + category + status
let currentPage = 1;

// ── DOM refs ─────────────────────────────────────────────
let tbody, tableEmpty, tableEmptyMsg, tableError, tableSub;
let paginationEl, resultsLabel;
let vendorSearch, categoryFilter, statusFilter;

// ─────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────
function getInitials(name) {
  name = name || "";
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "OJ";
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

const AVATAR_COLORS = [
  ["#FF6D00", "#fff3e8"],
  ["#1a5cff", "#e8eeff"],
  ["#16a34a", "#e8f7ee"],
  ["#7c3aed", "#f0ebff"],
  ["#0d9488", "#e6f7f6"],
  ["#db2777", "#fce8f3"],
];

function nameToColorPair(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function formatDate(ts) {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ─────────────────────────────────────────────────────────
// DEDUP VENDORS (mirrors marketplace.js logic exactly)
// ─────────────────────────────────────────────────────────
function dedupeVendors(vendors) {
  const seen = new Map();
  vendors.forEach((v) => {
    const key = (v.businessName || "").trim().toLowerCase();
    if (!seen.has(key)) {
      seen.set(key, v);
    } else {
      const existing = seen.get(key);
      if (v.ownerUid && !existing.ownerUid) seen.set(key, v);
    }
  });
  return Array.from(seen.values());
}

// ─────────────────────────────────────────────────────────
// BUILD ONE TABLE ROW
// ─────────────────────────────────────────────────────────
function buildRow(vendor) {
  const name = vendor.businessName || "Unnamed Vendor";
  const initials = getInitials(name);
  const [fg, bg] = nameToColorPair(name);

  const category = vendor.category || "—";
  const city = vendor.city || "";
  const state = vendor.state || "";
  const location = [city, state].filter(Boolean).join(", ") || "—";

  const isActive = vendor.isActive !== false;
  const isClaimed = !!vendor.ownerUid;

  const statusHtml = isActive
    ? `<span><span class="vendor-status-dot"></span>Active</span>`
    : `<span style="color:var(--text-muted)"><span class="vendor-status-dot inactive"></span>Inactive</span>`;

  const claimedHtml = isClaimed
    ? `<span class="badge-claimed"><i class="fa-solid fa-circle-check"></i> Claimed</span>`
    : `<span class="badge-unclaimed">Unclaimed</span>`;

  const joined = formatDate(vendor.createdAt);

  return `
    <tr>
      <td>
        <div class="vendor-name-cell">
          <div class="vendor-avatar" style="background:${bg};color:${fg};">${initials}</div>
          <div class="vendor-name-text">
            <span class="vendor-name-primary">${name}</span>
            ${vendor.ownerName ? `<span class="vendor-name-sub">${vendor.ownerName}</span>` : ""}
          </div>
        </div>
      </td>
      <td><span class="admin-badge">${category}</span></td>
      <td style="color:var(--text-secondary);font-size:13px;">${location}</td>
      <td style="font-size:13px;">${statusHtml}</td>
      <td>${claimedHtml}</td>
      <td style="color:var(--text-muted);font-size:12px;">${joined}</td>
    </tr>
  `;
}

// ─────────────────────────────────────────────────────────
// RENDER TABLE PAGE
// ─────────────────────────────────────────────────────────
function renderTable() {
  const start = (currentPage - 1) * PAGE_SIZE;
  const slice = filteredVendors.slice(start, start + PAGE_SIZE);

  if (filteredVendors.length === 0) {
    tbody.innerHTML = "";
    tableEmpty.classList.remove("hidden");
    tableEmptyMsg.textContent =
      vendorSearch.value || categoryFilter.value || statusFilter.value
        ? "No vendors match your filters."
        : "No vendors found.";
    paginationEl.classList.add("hidden");
    resultsLabel.textContent = "";
    tableSub.textContent = "0 vendors";
    return;
  }

  tableEmpty.classList.add("hidden");
  tbody.innerHTML = slice.map(buildRow).join("");

  tableSub.textContent = `${filteredVendors.length.toLocaleString()} vendor${filteredVendors.length !== 1 ? "s" : ""}`;
  resultsLabel.textContent = `Showing ${start + 1}–${Math.min(start + PAGE_SIZE, filteredVendors.length)} of ${filteredVendors.length.toLocaleString()}`;

  renderPagination();
}

// ─────────────────────────────────────────────────────────
// PAGINATION
// ─────────────────────────────────────────────────────────
function renderPagination() {
  const totalPages = Math.ceil(filteredVendors.length / PAGE_SIZE);

  if (totalPages <= 1) {
    paginationEl.classList.add("hidden");
    return;
  }

  paginationEl.classList.remove("hidden");

  let html = `
    <button class="page-btn" id="pagePrev" ${currentPage === 1 ? "disabled" : ""}>
      <i class="fa-solid fa-chevron-left"></i>
    </button>
  `;

  // Show at most 7 page buttons with ellipsis
  const range = [];
  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= currentPage - 2 && i <= currentPage + 2)
    ) {
      range.push(i);
    }
  }

  let prev = null;
  range.forEach((p) => {
    if (prev !== null && p - prev > 1) {
      html += `<span class="page-info">…</span>`;
    }
    html += `<button class="page-btn ${p === currentPage ? "active" : ""}" data-page="${p}">${p}</button>`;
    prev = p;
  });

  html += `
    <button class="page-btn" id="pageNext" ${currentPage === totalPages ? "disabled" : ""}>
      <i class="fa-solid fa-chevron-right"></i>
    </button>
  `;

  paginationEl.innerHTML = html;

  // Wire buttons
  paginationEl.querySelector("#pagePrev")?.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      renderTable();
      scrollToTable();
    }
  });
  paginationEl.querySelector("#pageNext")?.addEventListener("click", () => {
    if (currentPage < totalPages) {
      currentPage++;
      renderTable();
      scrollToTable();
    }
  });
  paginationEl.querySelectorAll("[data-page]").forEach((btn) => {
    btn.addEventListener("click", () => {
      currentPage = parseInt(btn.dataset.page, 10);
      renderTable();
      scrollToTable();
    });
  });
}

function scrollToTable() {
  document.querySelector(".admin-table-wrap")?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

// ─────────────────────────────────────────────────────────
// APPLY FILTERS
// ─────────────────────────────────────────────────────────
function applyFilters() {
  const q = (vendorSearch.value || "").toLowerCase().trim();
  const cat = (categoryFilter.value || "").toLowerCase();
  const status = statusFilter.value;

  filteredVendors = allVendors.filter((v) => {
    // Keyword
    if (q) {
      const searchable = [
        v.businessName,
        v.ownerName,
        v.category,
        v.city,
        v.state,
        v.description,
      ]
        .join(" ")
        .toLowerCase();
      if (!searchable.includes(q)) return false;
    }

    // Category
    if (cat && (v.category || "").toLowerCase() !== cat) return false;

    // Status
    if (status === "active" && v.isActive === false) return false;
    if (status === "inactive" && v.isActive !== false) return false;
    if (status === "claimed" && !v.ownerUid) return false;
    if (status === "unclaimed" && v.ownerUid) return false;

    return true;
  });

  currentPage = 1;
  renderTable();
}

// ─────────────────────────────────────────────────────────
// POPULATE CATEGORY DROPDOWN
// ─────────────────────────────────────────────────────────
function populateCategoryDropdown() {
  const cats = [
    ...new Set(
      allVendors
        .map((v) => (v.category || "").trim())
        .filter(Boolean)
        .sort(),
    ),
  ];

  cats.forEach((cat) => {
    const opt = document.createElement("option");
    opt.value = cat.toLowerCase();
    opt.textContent = cat;
    categoryFilter.appendChild(opt);
  });
}

// ─────────────────────────────────────────────────────────
// STAT STRIP
// ─────────────────────────────────────────────────────────
function renderStatStrip(vendors) {
  const total = vendors.length;
  const active = vendors.filter((v) => v.isActive !== false).length;
  const claimed = vendors.filter((v) => !!v.ownerUid).length;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const newMonth = vendors.filter((v) => {
    if (!v.createdAt) return false;
    const d = v.createdAt.toDate ? v.createdAt.toDate() : new Date(v.createdAt);
    return d >= monthStart;
  }).length;

  document.getElementById("statTotal").textContent = total.toLocaleString();
  document.getElementById("statActive").textContent = active.toLocaleString();
  document.getElementById("statClaimed").textContent = claimed.toLocaleString();
  document.getElementById("statNewMonth").textContent =
    newMonth.toLocaleString();

  // Un-fade the stat cards
  document
    .querySelectorAll("#vendorStatStrip .admin-stat-card")
    .forEach((c) => {
      c.style.opacity = "1";
    });
}

// ─────────────────────────────────────────────────────────
// GROWTH CHART
// ─────────────────────────────────────────────────────────
async function renderGrowthChart() {
  try {
    const growth = await getVendorGrowth();

    if (!growth || growth.length === 0) {
      document.getElementById("vendorGrowthEmpty").classList.remove("hidden");
      return;
    }

    renderTrendChart(
      "vendorGrowthChart",
      growth.map((g) => g.month),
      [
        {
          label: "Total Vendors",
          data: growth.map((g) => g.count),
          color: "orange",
        },
      ],
    );
  } catch (err) {
    console.error("Growth chart error:", err);
    document.getElementById("vendorGrowthEmpty").classList.remove("hidden");
  }
}

// ─────────────────────────────────────────────────────────
// CATEGORY CHART (vendor count per category)
// ─────────────────────────────────────────────────────────
function renderCategoryChart(vendors) {
  try {
    const counts = {};
    vendors.forEach((v) => {
      const cat = (v.category || "Other").trim();
      counts[cat] = (counts[cat] || 0) + 1;
    });

    const sorted = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    if (sorted.length === 0) {
      document.getElementById("vendorCategoryEmpty").classList.remove("hidden");
      return;
    }

    renderHorizontalBarChart(
      "vendorCategoryChart",
      sorted.map(([cat]) => cat),
      sorted.map(([, count]) => count),
    );
  } catch (err) {
    console.error("Category chart error:", err);
    document.getElementById("vendorCategoryEmpty").classList.remove("hidden");
  }
}

// ─────────────────────────────────────────────────────────
// LOAD ALL VENDORS FROM FIRESTORE
// ─────────────────────────────────────────────────────────
async function loadVendors() {
  try {
    const snapshot = await getDocs(collection(db, "vendors"));
    const raw = [];
    snapshot.forEach((d) => raw.push({ id: d.id, ...d.data() }));

    allVendors = dedupeVendors(raw).sort((a, b) =>
      (a.businessName || "").localeCompare(b.businessName || ""),
    );

    filteredVendors = [...allVendors];

    // Render everything
    renderStatStrip(allVendors);
    populateCategoryDropdown();
    renderCategoryChart(allVendors);
    renderTable();
  } catch (err) {
    console.error("Vendor load error:", err);
    tbody.innerHTML = "";
    tableError.classList.remove("hidden");
    tableSub.textContent = "Failed to load";
  }
}

// ─────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  tbody = document.getElementById("vendorTableBody");
  tableEmpty = document.getElementById("vendorTableEmpty");
  tableEmptyMsg = document.getElementById("vendorTableEmptyMsg");
  tableError = document.getElementById("vendorTableError");
  tableSub = document.getElementById("vendorTableSub");
  paginationEl = document.getElementById("vendorPagination");
  resultsLabel = document.getElementById("vendorResultsLabel");
  vendorSearch = document.getElementById("vendorSearch");
  categoryFilter = document.getElementById("vendorCategoryFilter");
  statusFilter = document.getElementById("vendorStatusFilter");

  // Wire filters
  vendorSearch.addEventListener("input", applyFilters);
  categoryFilter.addEventListener("change", applyFilters);
  statusFilter.addEventListener("change", applyFilters);

  // Load data (parallel: vendors table + growth chart)
  loadVendors();
  renderGrowthChart();
});
