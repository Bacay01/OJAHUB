// ═══════════════════════════════════════════════════════════
// OJAHUB ADMIN — LOCATIONS PAGE
// admin/js/locations.js
//
// Renders:
//  1. Stat strip  — total locations / top location / total
//                   views / total WA clicks
//  2. Views by location chart     (horizontal bar)
//  3. WA clicks by location chart (horizontal bar)
//  4. Location overview cards     — vendor count + views + clicks
//                                    per city with a progress bar
//  5. Full location table         — filterable, sortable by
//                                    vendor count, CSV-exportable
//
// Data: getLocationStats() from data-service.js — already
// dedupes vendors, filters isActive, and canonicalizes city
// names (trims/lowercases/aliases) before grouping, so
// "Lagos" / " lagos " / "LAGOS" collapse into one row instead
// of showing as separate duplicate rows.
// ═══════════════════════════════════════════════════════════

import {
  getLocationStats,
  clearDataCache,
  downloadCSV,
} from "./data-service.js";
import { renderHorizontalBarChart } from "./admin-charts.js";

// ── State ────────────────────────────────────────────────
let allLocations = []; // [{ city, vendors, views, whatsappClicks }]
let filteredLocations = [];

// ── DOM refs ─────────────────────────────────────────────
let tbody, tableEmpty, tableEmptyMsg, tableError, tableSub;
let resultsLabel, locSearchInput, exportBtn;

// ── Color palette for city icon chips ───────────────────
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
// CONVERSION RATE (shared calc + badge)
// ─────────────────────────────────────────────────────────
function conversionValue(views, clicks) {
  if (!views) return null;
  return Number(((clicks / views) * 100).toFixed(1));
}

function convRateBadge(views, clicks) {
  const rate = conversionValue(views, clicks);
  if (rate === null) return `<span class="conv-rate low">—</span>`;
  const cls = rate >= 15 ? "high" : rate >= 5 ? "mid" : "low";
  return `<span class="conv-rate ${cls}">${rate}%</span>`;
}

// ─────────────────────────────────────────────────────────
// BUILD TABLE ROW
// ─────────────────────────────────────────────────────────
function buildTableRow(loc, rank) {
  return `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:10px;">
          <div class="admin-stat-card-icon ${COLOR_CYCLE[rank % COLOR_CYCLE.length]}"
               style="width:30px;height:30px;border-radius:8px;font-size:12px;flex-shrink:0;">
            <i class="fa-solid fa-location-dot"></i>
          </div>
          <span style="font-weight:700;font-size:13.5px;color:var(--text-primary);">${loc.city}</span>
        </div>
      </td>
      <td style="font-size:13px;color:var(--text-secondary);">${loc.vendors.toLocaleString()}</td>
      <td style="font-size:13px;font-weight:700;color:var(--text-primary);">${loc.views.toLocaleString()}</td>
      <td style="font-size:13px;color:var(--text-secondary);">${loc.whatsappClicks.toLocaleString()}</td>
      <td>${convRateBadge(loc.views, loc.whatsappClicks)}</td>
    </tr>
  `;
}

// ─────────────────────────────────────────────────────────
// RENDER TABLE
// ─────────────────────────────────────────────────────────
function renderTable() {
  if (filteredLocations.length === 0) {
    tbody.innerHTML = "";
    tableEmpty.classList.remove("hidden");
    tableEmptyMsg.textContent = locSearchInput.value
      ? `No locations match "${locSearchInput.value}".`
      : "No location data found.";
    resultsLabel.textContent = "";
    tableSub.textContent = "0 locations";
    return;
  }

  tableEmpty.classList.add("hidden");
  tbody.innerHTML = filteredLocations
    .map((loc, i) => buildTableRow(loc, i))
    .join("");
  tableSub.textContent = `${filteredLocations.length} location${filteredLocations.length !== 1 ? "s" : ""}`;
  resultsLabel.textContent = `${filteredLocations.length} of ${allLocations.length}`;
}

// ─────────────────────────────────────────────────────────
// APPLY FILTER
// ─────────────────────────────────────────────────────────
function applyFilter() {
  const q = (locSearchInput.value || "").toLowerCase().trim();
  filteredLocations = q
    ? allLocations.filter((l) => l.city.toLowerCase().includes(q))
    : [...allLocations];
  renderTable();
}

// ─────────────────────────────────────────────────────────
// EXPORT CURRENTLY FILTERED ROWS AS CSV
// ─────────────────────────────────────────────────────────
function exportCSV() {
  const rows = filteredLocations.map((loc) => {
    const rate = conversionValue(loc.views, loc.whatsappClicks);
    return [
      loc.city,
      loc.vendors,
      loc.views,
      loc.whatsappClicks,
      rate === null ? "—" : `${rate}%`,
    ];
  });

  const dateStamp = new Date().toISOString().slice(0, 10);
  downloadCSV(
    `ojahub-locations-${dateStamp}.csv`,
    ["City", "Vendors", "Views", "WA Clicks", "Conversion"],
    rows,
  );
}

// ─────────────────────────────────────────────────────────
// STAT STRIP
// ─────────────────────────────────────────────────────────
function renderStatStrip(locations) {
  const totalViews = locations.reduce((s, l) => s + l.views, 0);
  const totalClicks = locations.reduce((s, l) => s + l.whatsappClicks, 0);
  const topLoc = locations[0]?.city || "—";

  document.getElementById("statTotalLoc").textContent =
    locations.length.toLocaleString();
  document.getElementById("statTopLoc").textContent = topLoc;
  document.getElementById("statTotalViewsLoc").textContent =
    totalViews.toLocaleString();
  document.getElementById("statTotalWALoc").textContent =
    totalClicks.toLocaleString();

  document.querySelectorAll("#locStatStrip .admin-stat-card").forEach((c) => {
    c.style.opacity = "1";
  });
}

// ─────────────────────────────────────────────────────────
// CHARTS
// ─────────────────────────────────────────────────────────
function renderCharts(locations) {
  const top = locations.slice(0, 10);

  if (top.some((l) => l.views > 0)) {
    renderHorizontalBarChart(
      "locViewsChart",
      top.map((l) => l.city),
      top.map((l) => l.views),
    );
  } else {
    document.getElementById("locViewsEmpty").classList.remove("hidden");
  }

  if (top.some((l) => l.whatsappClicks > 0)) {
    renderHorizontalBarChart(
      "locWAChart",
      top.map((l) => l.city),
      top.map((l) => l.whatsappClicks),
    );
  } else {
    document.getElementById("locWAEmpty").classList.remove("hidden");
  }
}

// ─────────────────────────────────────────────────────────
// LOCATION OVERVIEW CARDS
// ─────────────────────────────────────────────────────────
function renderLocationCards(locations) {
  const grid = document.getElementById("locCardsGrid");
  const emptyEl = document.getElementById("locCardsEmpty");
  const maxViews = locations[0]?.views || 1;

  if (locations.length === 0) {
    grid.innerHTML = "";
    emptyEl.classList.remove("hidden");
    return;
  }

  grid.innerHTML = locations
    .map((loc, i) => {
      const color = COLOR_CYCLE[i % COLOR_CYCLE.length];
      const pct = Math.round((loc.views / maxViews) * 100);
      const rate = conversionValue(loc.views, loc.whatsappClicks);
      const conv = rate === null ? "—" : `${rate}%`;

      return `
      <div class="loc-card">
        <div class="loc-card-header">
          <div class="admin-stat-card-icon ${color} loc-card-icon">
            <i class="fa-solid fa-location-dot"></i>
          </div>
          <span class="loc-card-name">${loc.city}</span>
        </div>
        <div class="loc-card-metrics">
          <div class="loc-metric">
            <div class="loc-metric-value">${loc.vendors.toLocaleString()}</div>
            <div class="loc-metric-label">Vendors</div>
          </div>
          <div class="loc-metric">
            <div class="loc-metric-value">${loc.views.toLocaleString()}</div>
            <div class="loc-metric-label">Views</div>
          </div>
          <div class="loc-metric">
            <div class="loc-metric-value">${conv}</div>
            <div class="loc-metric-label">Conv.</div>
          </div>
        </div>
        <div class="loc-bar-wrap">
          <div class="loc-bar" style="width:${pct}%"></div>
        </div>
      </div>
    `;
    })
    .join("");
}

// ─────────────────────────────────────────────────────────
// LOAD
// ─────────────────────────────────────────────────────────
async function loadLocations() {
  try {
    clearDataCache();
    allLocations = await getLocationStats();
    filteredLocations = [...allLocations];

    renderStatStrip(allLocations);
    renderCharts(allLocations);
    renderLocationCards(allLocations);
    renderTable();
  } catch (err) {
    console.error("Locations page load error:", err);
    tbody.innerHTML = "";
    tableError.classList.remove("hidden");
    tableSub.textContent = "Failed to load";
    document.getElementById("locCardsGrid").innerHTML = "";
    document.getElementById("locCardsEmpty").classList.remove("hidden");
  }
}

// ─────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  tbody = document.getElementById("locTableBody");
  tableEmpty = document.getElementById("locTableEmpty");
  tableEmptyMsg = document.getElementById("locTableEmptyMsg");
  tableError = document.getElementById("locTableError");
  tableSub = document.getElementById("locTableSub");
  resultsLabel = document.getElementById("locResultsLabel");
  locSearchInput = document.getElementById("locSearch");
  exportBtn = document.getElementById("locExportBtn");

  locSearchInput.addEventListener("input", applyFilter);
  exportBtn.addEventListener("click", exportCSV);

  loadLocations();
});
