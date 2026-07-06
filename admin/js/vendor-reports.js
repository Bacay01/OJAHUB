// ═══════════════════════════════════════════════════════════
// OJAHUB ADMIN — VENDOR REPORTS PAGE
// admin/js/vendor-reports.js
//
// Reads from the `vendorReports` collection — the same
// collection the public marketplace writes feedback to.
// ═══════════════════════════════════════════════════════════

import { db } from "../../js/firebase.js";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  orderBy,
  query,
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";
import { adminReady } from "./admin-auth.js";

// ── Wait for admin auth before loading anything ───────────
adminReady.then(() => {
  loadReports();
  initFilters();
});

// ── State ─────────────────────────────────────────────────
let allReports = [];

// ── Load all feedback from vendorReports collection ───────
async function loadReports() {
  setLoadingState(true);

  try {
    const q = query(
      collection(db, "vendorReports"),
      orderBy("timestamp", "desc"),
    );
    const snapshot = await getDocs(q);

    allReports = [];
    snapshot.forEach((d) => {
      allReports.push({ id: d.id, ...d.data() });
    });

    updateStatCards();
    renderTable(allReports);
  } catch (err) {
    console.error("Failed to load vendor reports:", err);
    setLoadingState(false);
    document.getElementById("reportsTableBody").innerHTML =
      '<tr><td colspan="7" style="text-align:center;color:#e53935;padding:24px">Failed to load reports. Please refresh.</td></tr>';
  }
}

// ── Stat cards ────────────────────────────────────────────
function updateStatCards() {
  const total = allReports.length;
  const positive = allReports.filter((r) => r.sentiment === "positive").length;
  const neutral = allReports.filter((r) => r.sentiment === "neutral").length;
  const negative = allReports.filter((r) => r.sentiment === "negative").length;
  const newCount = allReports.filter(
    (r) => !r.status || r.status === "new",
  ).length;

  setValue("statTotal", total);
  setValue("statNew", newCount);
  setValue("statPositive", positive);
  setValue("statNeutral", neutral);
  setValue("statNegative", negative);
}

function setValue(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ── Render table rows ─────────────────────────────────────
function renderTable(reports) {
  setLoadingState(false);

  const tbody = document.getElementById("reportsTableBody");
  const empty = document.getElementById("reportsEmpty");

  if (!reports || reports.length === 0) {
    tbody.innerHTML = "";
    if (empty) empty.classList.remove("hidden");
    return;
  }

  if (empty) empty.classList.add("hidden");

  tbody.innerHTML = reports
    .map((r) => {
      const sentiment = r.sentiment || "neutral";
      const status = r.status || "new";
      const vendorName = r.vendorName || "Unknown Vendor";
      const message = r.message || r.comment || "—";
      const reporter = r.reporterName || r.name || "Anonymous";
      const timestamp = r.timestamp
        ? new Date(
            r.timestamp.toMillis ? r.timestamp.toMillis() : r.timestamp,
          ).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        : "—";

      const sentimentBadge =
        {
          positive:
            '<span class="admin-badge green"><i class="fa-solid fa-face-smile"></i> Positive</span>',
          neutral:
            '<span class="admin-badge gray"><i class="fa-solid fa-face-meh"></i> Neutral</span>',
          negative:
            '<span class="admin-badge red"><i class="fa-solid fa-face-frown"></i> Negative</span>',
        }[sentiment] || '<span class="admin-badge gray">Unknown</span>';

      const statusBadge =
        {
          new: '<span class="admin-badge blue">New</span>',
          reviewed: '<span class="admin-badge green">Reviewed</span>',
          resolved: '<span class="admin-badge gray">Resolved</span>',
        }[status] || '<span class="admin-badge gray">' + status + "</span>";

      return `
      <tr>
        <td><span class="admin-table-name">${vendorName}</span></td>
        <td>${sentimentBadge}</td>
        <td style="max-width:280px;white-space:normal;line-height:1.5">${message}</td>
        <td>${reporter}</td>
        <td>${timestamp}</td>
        <td>${statusBadge}</td>
        <td>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            ${
              status !== "reviewed"
                ? `<button class="report-action-btn blue" onclick="markStatus('${r.id}', 'reviewed')">
                  <i class="fa-solid fa-check"></i> Review
                </button>`
                : ""
            }
            ${
              status !== "resolved"
                ? `<button class="report-action-btn green" onclick="markStatus('${r.id}', 'resolved')">
                  <i class="fa-solid fa-circle-check"></i> Resolve
                </button>`
                : ""
            }
            <button class="report-action-btn red" onclick="deleteReport('${r.id}')">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
    })
    .join("");
}

// ── Mark status ───────────────────────────────────────────
window.markStatus = async function (id, status) {
  try {
    await updateDoc(doc(db, "vendorReports", id), { status });
    const report = allReports.find((r) => r.id === id);
    if (report) report.status = status;
    renderTable(getFilteredReports());
    updateStatCards();
  } catch (err) {
    console.error("Failed to update status:", err);
    alert("Could not update status. Please try again.");
  }
};

// ── Delete report ─────────────────────────────────────────
window.deleteReport = async function (id) {
  if (!confirm("Delete this feedback report permanently?")) return;
  try {
    await deleteDoc(doc(db, "vendorReports", id));
    allReports = allReports.filter((r) => r.id !== id);
    renderTable(getFilteredReports());
    updateStatCards();
  } catch (err) {
    console.error("Failed to delete report:", err);
    alert("Could not delete report. Please try again.");
  }
};

// ── Filters ───────────────────────────────────────────────
function initFilters() {
  const searchInput = document.getElementById("reportSearch");
  const sentimentFilter = document.getElementById("sentimentFilter");
  const statusFilter = document.getElementById("statusFilter");

  if (searchInput) searchInput.addEventListener("input", applyFilters);
  if (sentimentFilter) sentimentFilter.addEventListener("change", applyFilters);
  if (statusFilter) statusFilter.addEventListener("change", applyFilters);
}

function applyFilters() {
  renderTable(getFilteredReports());
}

function getFilteredReports() {
  const search = (
    document.getElementById("reportSearch")?.value || ""
  ).toLowerCase();
  const sentiment = document.getElementById("sentimentFilter")?.value || "all";
  const status = document.getElementById("statusFilter")?.value || "all";

  return allReports.filter((r) => {
    const matchSearch =
      !search ||
      (r.vendorName || "").toLowerCase().includes(search) ||
      (r.message || r.comment || "").toLowerCase().includes(search) ||
      (r.reporterName || r.name || "").toLowerCase().includes(search);

    const matchSentiment = sentiment === "all" || r.sentiment === sentiment;
    const matchStatus = status === "all" || (r.status || "new") === status;

    return matchSearch && matchSentiment && matchStatus;
  });
}

// ── Loading skeleton ──────────────────────────────────────
function setLoadingState(on) {
  const tbody = document.getElementById("reportsTableBody");
  if (!tbody) return;

  if (on) {
    tbody.innerHTML = [1, 2, 3]
      .map(
        () => `
      <tr>
        ${[1, 2, 3, 4, 5, 6, 7]
          .map(
            () =>
              '<td><div style="height:14px;background:#f1f5f9;border-radius:6px;animation:admin-pulse 1.4s infinite"></div></td>',
          )
          .join("")}
      </tr>
    `,
      )
      .join("");
  }
}
