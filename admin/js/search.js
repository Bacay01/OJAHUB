// ═══════════════════════════════════════════════════════════
// OJAHUB ADMIN — SEARCH PAGE
// admin/js/search.js
//
// Renders:
//  1. Stat strip  — total searches / unique keywords / top keyword
//  2. Search volume trend chart — last 7 days
//  3. Top keywords ranked list  — visual bar + count
//  4. Full keyword table        — all unique terms, count, share %
//                                 with keyword filter + pagination
//
// Reads directly from Firestore: searches collection.
// Fields used: keyword (string), timestamp (Firestore Timestamp)
// Note: resultCount field doesn't exist yet on search docs —
//       "no result searches" section is omitted until that
//       field is added to trackSearch() on the public site.
// ═══════════════════════════════════════════════════════════

import { db } from "../../js/firebase.js";
import {
  collection,
  getDocs,
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";

import { renderTrendChart } from "./admin-charts.js";

// ── Pagination ───────────────────────────────────────────
const PAGE_SIZE = 30;

// ── State ────────────────────────────────────────────────
let allKeywords = []; // [{ keyword, count, share }] sorted desc
let filteredKeywords = [];
let currentPage = 1;
let totalSearches = 0;

// ── DOM refs ─────────────────────────────────────────────
let tbody, tableEmpty, tableEmptyMsg, tableError, tableSub;
let paginationEl, resultsLabel, keywordFilterInput;

// ─────────────────────────────────────────────────────────
// BUILD TABLE ROW
// ─────────────────────────────────────────────────────────
function buildRow(item, globalIndex) {
  const shareBar = `
    <div style="display:flex;align-items:center;gap:8px;">
      <div style="flex:1;height:6px;background:var(--border);border-radius:3px;overflow:hidden;min-width:40px;">
        <div style="width:${item.share}%;height:100%;background:var(--oja-blue);border-radius:3px;"></div>
      </div>
      <span style="font-size:11px;color:var(--text-muted);white-space:nowrap;">${item.share.toFixed(1)}%</span>
    </div>
  `;

  return `
    <tr>
      <td style="font-size:12px;color:var(--text-muted);width:36px;">${globalIndex}</td>
      <td>
        <span style="font-size:13.5px;font-weight:700;color:var(--text-primary);">
          ${item.keyword}
        </span>
      </td>
      <td style="font-size:13px;font-weight:700;color:var(--text-secondary);">
        ${item.count.toLocaleString()}
      </td>
      <td style="min-width:100px;">${shareBar}</td>
    </tr>
  `;
}

// ─────────────────────────────────────────────────────────
// RENDER TABLE
// ─────────────────────────────────────────────────────────
function renderTable() {
  const start = (currentPage - 1) * PAGE_SIZE;
  const slice = filteredKeywords.slice(start, start + PAGE_SIZE);

  if (filteredKeywords.length === 0) {
    tbody.innerHTML = "";
    tableEmpty.classList.remove("hidden");
    tableEmptyMsg.textContent = keywordFilterInput.value
      ? `No keywords match "${keywordFilterInput.value}".`
      : "No search terms recorded yet.";
    paginationEl.classList.add("hidden");
    resultsLabel.textContent = "";
    tableSub.textContent = "0 keywords";
    return;
  }

  tableEmpty.classList.add("hidden");

  // Global index = position in full allKeywords list (not filtered)
  tbody.innerHTML = slice
    .map((item) => {
      const globalIdx = allKeywords.indexOf(item) + 1;
      return buildRow(item, globalIdx);
    })
    .join("");

  tableSub.textContent = `${filteredKeywords.length.toLocaleString()} unique keyword${filteredKeywords.length !== 1 ? "s" : ""}`;

  resultsLabel.textContent = `Showing ${start + 1}–${Math.min(start + PAGE_SIZE, filteredKeywords.length)} of ${filteredKeywords.length.toLocaleString()}`;

  renderPagination();
}

// ─────────────────────────────────────────────────────────
// PAGINATION
// ─────────────────────────────────────────────────────────
function renderPagination() {
  const totalPages = Math.ceil(filteredKeywords.length / PAGE_SIZE);

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
    if (prev !== null && p - prev > 1)
      html += `<span class="page-info">…</span>`;
    html += `<button class="page-btn ${p === currentPage ? "active" : ""}" data-page="${p}">${p}</button>`;
    prev = p;
  });

  html += `
    <button class="page-btn" id="pageNext" ${currentPage === totalPages ? "disabled" : ""}>
      <i class="fa-solid fa-chevron-right"></i>
    </button>
  `;

  paginationEl.innerHTML = html;

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
// APPLY FILTER
// ─────────────────────────────────────────────────────────
function applyFilter() {
  const q = (keywordFilterInput.value || "").toLowerCase().trim();
  filteredKeywords = q
    ? allKeywords.filter((k) => k.keyword.toLowerCase().includes(q))
    : [...allKeywords];
  currentPage = 1;
  renderTable();
}

// ─────────────────────────────────────────────────────────
// STAT STRIP
// ─────────────────────────────────────────────────────────
function renderStatStrip(keywords, total) {
  document.getElementById("statTotalSearches").textContent =
    total.toLocaleString();
  document.getElementById("statUniqueKeywords").textContent =
    keywords.length.toLocaleString();
  document.getElementById("statTopKeyword").textContent =
    keywords[0]?.keyword || "—";

  document
    .querySelectorAll("#searchStatStrip .admin-stat-card")
    .forEach((c) => {
      c.style.opacity = "1";
    });
}

// ─────────────────────────────────────────────────────────
// TOP KEYWORDS RANKED LIST
// ─────────────────────────────────────────────────────────
function renderTopKeywordList(keywords) {
  const skeletons = document.getElementById("keywordListSkeletons");
  const listEl = document.getElementById("topKeywordList");
  const emptyEl = document.getElementById("keywordListEmpty");

  skeletons.style.display = "none";

  const top = keywords.slice(0, 10);
  const max = top[0]?.count || 1;

  if (top.length === 0) {
    emptyEl.classList.remove("hidden");
    return;
  }

  listEl.innerHTML = top
    .map(
      (item, i) => `
    <div class="keyword-row">
      <div class="keyword-rank ${i < 3 ? "top" : ""}">${i + 1}</div>
      <div class="keyword-text">${item.keyword}</div>
      <div class="keyword-bar-wrap">
        <div class="keyword-bar" style="width:${Math.round((item.count / max) * 100)}%"></div>
      </div>
      <div class="keyword-count">${item.count.toLocaleString()}</div>
    </div>
  `,
    )
    .join("");
}

// ─────────────────────────────────────────────────────────
// SEARCH TREND CHART (searches per day, last 7 days)
// ─────────────────────────────────────────────────────────
function renderSearchTrend(docs) {
  const now = new Date();
  const days = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    days.push({
      label: d.toLocaleDateString("en-NG", { weekday: "short" }),
      date: d.toDateString(),
      count: 0,
    });
  }

  docs.forEach((doc) => {
    const ts = doc.timestamp;
    if (!ts) return;
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    const str = d.toDateString();
    const slot = days.find((day) => day.date === str);
    if (slot) slot.count++;
  });

  const total7d = days.reduce((s, d) => s + d.count, 0);

  if (total7d === 0) {
    document.getElementById("searchTrendEmpty").classList.remove("hidden");
    return;
  }

  renderTrendChart(
    "searchTrendChart",
    days.map((d) => d.label),
    [{ label: "Searches", data: days.map((d) => d.count), color: "blue" }],
  );
}

// ─────────────────────────────────────────────────────────
// LOAD FROM FIRESTORE
// ─────────────────────────────────────────────────────────
async function loadSearchData() {
  try {
    const snapshot = await getDocs(collection(db, "searches"));

    const docs = [];
    const counts = {};

    snapshot.forEach((d) => {
      const data = d.data();
      docs.push(data);

      const kw = (data.keyword || "").trim().toLowerCase();
      if (!kw) return;
      counts[kw] = (counts[kw] || 0) + 1;
    });

    totalSearches = docs.length;

    // Build sorted keyword array
    allKeywords = Object.entries(counts)
      .map(([keyword, count]) => ({
        keyword,
        count,
        share: totalSearches > 0 ? (count / totalSearches) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    filteredKeywords = [...allKeywords];

    // Render everything
    renderStatStrip(allKeywords, totalSearches);
    renderTopKeywordList(allKeywords);
    renderSearchTrend(docs);
    renderTable();
  } catch (err) {
    console.error("Search page load error:", err);
    tbody.innerHTML = "";
    tableError.classList.remove("hidden");
    tableSub.textContent = "Failed to load";
    document.getElementById("keywordListSkeletons").style.display = "none";
    document.getElementById("keywordListEmpty").classList.remove("hidden");
  }
}

// ─────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  tbody = document.getElementById("searchTableBody");
  tableEmpty = document.getElementById("searchTableEmpty");
  tableEmptyMsg = document.getElementById("searchTableEmptyMsg");
  tableError = document.getElementById("searchTableError");
  tableSub = document.getElementById("searchTableSub");
  paginationEl = document.getElementById("searchPagination");
  resultsLabel = document.getElementById("searchResultsLabel");
  keywordFilterInput = document.getElementById("keywordFilter");

  keywordFilterInput.addEventListener("input", applyFilter);

  loadSearchData();
});
