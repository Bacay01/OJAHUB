// ═══════════════════════════════════════════════════════════
// OJAHUB ADMIN — REPORTS PAGE
// admin/js/reports.js
//
// Lets the admin: (1) pick one of 7 datasets, (2) pick a date
// range (or All Time), (3) preview the result, (4) export the
// FULL filtered result as CSV — not just the previewed rows.
//
// Data: getVendorsReportData / getProductsReportData /
// getCategoriesReportData / getLocationsReportData /
// getSearchTermsReportData / getWhatsappReportData /
// getTrafficReportData, all from data-service.js. Each accepts
// (startMs, endMs) and returns date-range-filtered rows —
// see the "REPORT DATASETS" section in data-service.js for the
// exact filtering rules per dataset (events vs. join-date vs.
// current-snapshot counts).
// ═══════════════════════════════════════════════════════════

import {
  clearDataCache,
  downloadCSV,
  getVendorsReportData,
  getProductsReportData,
  getCategoriesReportData,
  getLocationsReportData,
  getSearchTermsReportData,
  getWhatsappReportData,
  getTrafficReportData,
} from "./data-service.js";

const PREVIEW_LIMIT = 50;

// ─────────────────────────────────────────────────────────
// DATASET CONFIG
// Column `key` must match the field name returned by the
// corresponding data-service function exactly.
// ─────────────────────────────────────────────────────────
const REPORT_TYPES = [
  {
    key: "vendors",
    label: "Vendors",
    icon: "fa-solid fa-store",
    loader: getVendorsReportData,
    filenamePrefix: "ojahub-vendors",
    columns: [
      { key: "businessName", label: "Business Name" },
      { key: "category", label: "Category" },
      { key: "subCategory", label: "Sub-category" },
      { key: "city", label: "City" },
      { key: "state", label: "State" },
      { key: "whatsapp", label: "WhatsApp" },
      { key: "status", label: "Status" },
      { key: "claimed", label: "Claimed" },
      { key: "createdAtLabel", label: "Joined" },
    ],
  },
  {
    key: "products",
    label: "Products",
    icon: "fa-solid fa-box",
    loader: getProductsReportData,
    filenamePrefix: "ojahub-products",
    columns: [
      { key: "name", label: "Product Name" },
      { key: "vendor", label: "Vendor" },
      { key: "category", label: "Category" },
      {
        key: "price",
        label: "Price",
        format: (v) => (v ? "₦" + Number(v).toLocaleString() : "—"),
      },
      { key: "status", label: "Status" },
      { key: "createdAtLabel", label: "Listed" },
    ],
  },
  {
    key: "categories",
    label: "Categories",
    icon: "fa-solid fa-layer-group",
    loader: getCategoriesReportData,
    filenamePrefix: "ojahub-categories",
    columns: [
      { key: "category", label: "Category" },
      { key: "vendors", label: "Vendors", format: (v) => v.toLocaleString() },
      { key: "views", label: "Views", format: (v) => v.toLocaleString() },
      {
        key: "whatsappClicks",
        label: "WA Clicks",
        format: (v) => v.toLocaleString(),
      },
      {
        key: "conversion",
        label: "Conversion",
        format: (v) => (v === null ? "—" : v + "%"),
        badge: true,
      },
    ],
  },
  {
    key: "locations",
    label: "Locations",
    icon: "fa-solid fa-map-location-dot",
    loader: getLocationsReportData,
    filenamePrefix: "ojahub-locations",
    columns: [
      { key: "city", label: "City" },
      { key: "vendors", label: "Vendors", format: (v) => v.toLocaleString() },
      { key: "views", label: "Views", format: (v) => v.toLocaleString() },
      {
        key: "whatsappClicks",
        label: "WA Clicks",
        format: (v) => v.toLocaleString(),
      },
      {
        key: "conversion",
        label: "Conversion",
        format: (v) => (v === null ? "—" : v + "%"),
        badge: true,
      },
    ],
  },
  {
    key: "search",
    label: "Search Terms",
    icon: "fa-solid fa-magnifying-glass",
    loader: getSearchTermsReportData,
    filenamePrefix: "ojahub-search-terms",
    columns: [
      { key: "term", label: "Search Term" },
      {
        key: "count",
        label: "Times Searched",
        format: (v) => v.toLocaleString(),
      },
      { key: "lastSearchedLabel", label: "Last Searched" },
    ],
  },
  {
    key: "whatsapp",
    label: "WhatsApp",
    icon: "fa-brands fa-whatsapp",
    loader: getWhatsappReportData,
    filenamePrefix: "ojahub-whatsapp-clicks",
    columns: [
      { key: "vendorName", label: "Vendor" },
      { key: "productName", label: "Product" },
      { key: "clickedAtLabel", label: "Clicked At" },
    ],
  },
  {
    key: "traffic",
    label: "Traffic",
    icon: "fa-solid fa-chart-line",
    loader: getTrafficReportData,
    filenamePrefix: "ojahub-traffic",
    columns: [
      { key: "dateLabel", label: "Date" },
      { key: "visitors", label: "Visitors", format: (v) => v.toLocaleString() },
      {
        key: "whatsappClicks",
        label: "WA Clicks",
        format: (v) => v.toLocaleString(),
      },
    ],
  },
];

// ── State ────────────────────────────────────────────────
let activeType = REPORT_TYPES[0];
let activeRangeKey = "30d";
let currentRows = [];
let loadToken = 0; // guards against out-of-order async responses

// ── DOM refs ─────────────────────────────────────────────
let repTypeGrid,
  repRangeRow,
  repCustomDates,
  repStartDate,
  repEndDate,
  repRangeLabel,
  repSummaryText,
  repExportBtn,
  repTableHead,
  repTableBody,
  repTableEmpty,
  repTableError,
  repPreviewNote;

// ─────────────────────────────────────────────────────────
// DATE RANGE RESOLUTION
// ─────────────────────────────────────────────────────────
function startOfDay(ms) {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function endOfDay(ms) {
  const d = new Date(ms);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

function resolveRange() {
  const now = Date.now();

  switch (activeRangeKey) {
    case "today":
      return { startMs: startOfDay(now), endMs: now, label: "Today" };
    case "7d":
      return {
        startMs: startOfDay(now - 6 * 24 * 60 * 60 * 1000),
        endMs: now,
        label: "Last 7 days",
      };
    case "30d":
      return {
        startMs: startOfDay(now - 29 * 24 * 60 * 60 * 1000),
        endMs: now,
        label: "Last 30 days",
      };
    case "90d":
      return {
        startMs: startOfDay(now - 89 * 24 * 60 * 60 * 1000),
        endMs: now,
        label: "Last 90 days",
      };
    case "all":
      return { startMs: null, endMs: null, label: "All time" };
    case "custom": {
      const startVal = repStartDate.value;
      const endVal = repEndDate.value;
      if (!startVal || !endVal) {
        return { startMs: null, endMs: null, label: "All time" };
      }
      const startMs = startOfDay(new Date(startVal).getTime());
      const endMs = endOfDay(new Date(endVal).getTime());
      return {
        startMs,
        endMs,
        label: `${startVal} to ${endVal}`,
      };
    }
    default:
      return { startMs: null, endMs: null, label: "All time" };
  }
}

// ─────────────────────────────────────────────────────────
// RENDER: DATASET PICKER
// ─────────────────────────────────────────────────────────
function renderTypeGrid() {
  repTypeGrid.innerHTML = REPORT_TYPES.map(
    (t) => `
    <button class="rep-type-btn ${t.key === activeType.key ? "active" : ""}" data-type="${t.key}" type="button">
      <span class="rep-type-icon"><i class="${t.icon}"></i></span>
      <span class="rep-type-label">${t.label}</span>
    </button>
  `,
  ).join("");

  repTypeGrid.querySelectorAll(".rep-type-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const type = REPORT_TYPES.find((t) => t.key === btn.dataset.type);
      if (!type || type.key === activeType.key) return;
      activeType = type;
      renderTypeGrid();
      loadReport();
    });
  });
}

// ─────────────────────────────────────────────────────────
// RENDER: TABLE
// ─────────────────────────────────────────────────────────
function renderTableHead() {
  repTableHead.innerHTML =
    "<tr>" +
    activeType.columns.map((c) => `<th>${c.label}</th>`).join("") +
    "</tr>";
}

function cellHtml(col, value) {
  const display = col.format ? col.format(value) : value;
  if (col.badge) {
    const rate =
      typeof value === "number"
        ? value
        : parseFloat(String(display).replace("%", "")) || 0;
    const cls =
      value === null ? "low" : rate >= 15 ? "high" : rate >= 5 ? "mid" : "low";
    return `<span class="conv-rate ${cls}">${display}</span>`;
  }
  return `<span>${display}</span>`;
}

function renderTable(rows) {
  if (rows.length === 0) {
    repTableBody.innerHTML = "";
    repTableEmpty.classList.remove("hidden");
    repPreviewNote.classList.add("hidden");
    return;
  }

  repTableEmpty.classList.add("hidden");

  const preview = rows.slice(0, PREVIEW_LIMIT);
  repTableBody.innerHTML = preview
    .map(
      (row) =>
        "<tr>" +
        activeType.columns
          .map((c) => `<td>${cellHtml(c, row[c.key])}</td>`)
          .join("") +
        "</tr>",
    )
    .join("");

  if (rows.length > PREVIEW_LIMIT) {
    repPreviewNote.textContent = `Showing first ${PREVIEW_LIMIT} of ${rows.length.toLocaleString()} rows — the full dataset is included in the CSV export.`;
    repPreviewNote.classList.remove("hidden");
  } else {
    repPreviewNote.classList.add("hidden");
  }
}

// ─────────────────────────────────────────────────────────
// EXPORT
// ─────────────────────────────────────────────────────────
function exportCSV() {
  if (currentRows.length === 0) return;

  const { label } = resolveRange();
  const headers = activeType.columns.map((c) => c.label);
  const rows = currentRows.map((row) =>
    activeType.columns.map((c) => {
      const val = row[c.key];
      return c.format ? c.format(val) : val;
    }),
  );

  const dateStamp = new Date().toISOString().slice(0, 10);
  downloadCSV(`${activeType.filenamePrefix}-${dateStamp}.csv`, headers, rows);
}

// ─────────────────────────────────────────────────────────
// LOAD REPORT DATA
// ─────────────────────────────────────────────────────────
async function loadReport() {
  const myToken = ++loadToken;

  repTableError.classList.add("hidden");
  repTableEmpty.classList.add("hidden");
  repPreviewNote.classList.add("hidden");
  repExportBtn.disabled = true;
  repSummaryText.textContent = "Loading…";
  renderTableHead();
  repTableBody.innerHTML = `
    <tr>
      <td><div class="skeleton-cell" style="width:120px"></div></td>
      <td><div class="skeleton-cell" style="width:80px"></div></td>
      <td><div class="skeleton-cell" style="width:80px"></div></td>
    </tr>
  `;

  const { startMs, endMs, label } = resolveRange();
  repRangeLabel.textContent = label;

  try {
    clearDataCache();
    const rows = await activeType.loader(startMs, endMs);

    // A newer request finished before this one — discard stale result
    if (myToken !== loadToken) return;

    currentRows = rows;
    renderTable(rows);
    repSummaryText.innerHTML = `<strong>${rows.length.toLocaleString()}</strong> row${rows.length !== 1 ? "s" : ""} · ${activeType.label} · ${label}`;
    repExportBtn.disabled = rows.length === 0;
  } catch (err) {
    if (myToken !== loadToken) return;
    console.error("Reports page load error:", err);
    repTableBody.innerHTML = "";
    repTableError.classList.remove("hidden");
    repSummaryText.textContent = "Failed to load";
    repExportBtn.disabled = true;
  }
}

// ─────────────────────────────────────────────────────────
// RANGE PILL HANDLING
// ─────────────────────────────────────────────────────────
function setActiveRangePill(key) {
  repRangeRow.querySelectorAll(".rep-pill").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.range === key);
  });
  repCustomDates.classList.toggle("visible", key === "custom");
}

function initRangePills() {
  repRangeRow.querySelectorAll(".rep-pill").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeRangeKey = btn.dataset.range;
      setActiveRangePill(activeRangeKey);

      if (activeRangeKey === "custom") {
        // Wait for the admin to actually pick both dates before loading
        if (repStartDate.value && repEndDate.value) loadReport();
        return;
      }
      loadReport();
    });
  });

  repStartDate.addEventListener("change", () => {
    if (activeRangeKey === "custom" && repStartDate.value && repEndDate.value) {
      loadReport();
    }
  });
  repEndDate.addEventListener("change", () => {
    if (activeRangeKey === "custom" && repStartDate.value && repEndDate.value) {
      loadReport();
    }
  });
}

// ─────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  repTypeGrid = document.getElementById("repTypeGrid");
  repRangeRow = document.getElementById("repRangeRow");
  repCustomDates = document.getElementById("repCustomDates");
  repStartDate = document.getElementById("repStartDate");
  repEndDate = document.getElementById("repEndDate");
  repRangeLabel = document.getElementById("repRangeLabel");
  repSummaryText = document.getElementById("repSummaryText");
  repExportBtn = document.getElementById("repExportBtn");
  repTableHead = document.getElementById("repTableHead");
  repTableBody = document.getElementById("repTableBody");
  repTableEmpty = document.getElementById("repTableEmpty");
  repTableError = document.getElementById("repTableError");
  repPreviewNote = document.getElementById("repPreviewNote");

  renderTypeGrid();
  initRangePills();
  repExportBtn.addEventListener("click", exportCSV);

  loadReport();
});
