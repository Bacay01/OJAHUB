// ═══════════════════════════════════════════════════════════
// OJAHUB ADMIN — PRODUCTS PAGE
// admin/js/products.js
//
// Renders:
//  1. Stat strip  — total / published / drafts / WA clicks
//  2. Top products by WA clicks (horizontal bar chart)
//  3. Products by category (horizontal bar chart)
//  4. Full products table — search + category + status
//     filters, client-side pagination (25 per page)
//
// Reads directly from Firestore (products + whatsapp_clicks)
// and reuses the strict vendorOwnsProduct matching logic from
// data-service.js (vendorId strict equality, NO .includes()).
// ═══════════════════════════════════════════════════════════

import { db } from "../../js/firebase.js";
import {
  collection,
  getDocs,
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";

import { renderHorizontalBarChart } from "./admin-charts.js";

// ── Pagination ───────────────────────────────────────────
const PAGE_SIZE = 25;

// ── State ────────────────────────────────────────────────
let allProducts = []; // raw products enriched with waClicks count
let filteredProducts = []; // after filters
let currentPage = 1;

// ── DOM refs ─────────────────────────────────────────────
let tbody, tableEmpty, tableEmptyMsg, tableError, tableSub;
let paginationEl, resultsLabel;
let productSearch, categoryFilter, statusFilter;

// ─────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────
function formatPrice(price) {
  if (!price && price !== 0) return "—";
  return "₦" + Number(price).toLocaleString("en-NG");
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
// BUILD ONE TABLE ROW
// ─────────────────────────────────────────────────────────
function buildRow(product) {
  const name = product.name || "Untitled Product";
  const vendor = product.vendorName || "—";
  const category = product.category || "—";
  const price = formatPrice(product.price);
  const waClicks = (product._waClicks || 0).toLocaleString();
  const added = formatDate(product.createdAt);
  const status = (product.status || "published").toLowerCase();

  const imgSrc =
    product.imageUrl || (product.images && product.images[0]) || "";
  const imgHtml = imgSrc
    ? `<img src="${imgSrc}" alt="${name}" class="product-thumb"
         onerror="this.style.display='none';this.nextElementSibling.style.display='inline-flex';" />
       <span class="product-thumb-placeholder" style="display:none;">
         <i class="fa-solid fa-image"></i>
       </span>`
    : `<span class="product-thumb-placeholder"><i class="fa-solid fa-image"></i></span>`;

  const statusHtml =
    status === "published"
      ? `<span class="badge-published"><i class="fa-solid fa-circle-check"></i> Published</span>`
      : `<span class="badge-draft"><i class="fa-solid fa-pen-to-square"></i> Draft</span>`;

  return `
    <tr>
      <td>
        <div class="product-name-cell">
          ${imgHtml}
          <div class="product-name-text">
            <span class="product-name-primary">${name}</span>
          </div>
        </div>
      </td>
      <td>
        <div class="product-name-text">
          <span class="product-name-primary" style="max-width:130px;">${vendor}</span>
        </div>
      </td>
      <td><span class="admin-badge">${category}</span></td>
      <td style="font-size:13px;font-weight:600;color:var(--text-primary);">${price}</td>
      <td style="font-size:13px;color:var(--text-secondary);">${waClicks}</td>
      <td style="font-size:12px;color:var(--text-muted);">${added}</td>
      <td>${statusHtml}</td>
    </tr>
  `;
}

// ─────────────────────────────────────────────────────────
// RENDER TABLE PAGE
// ─────────────────────────────────────────────────────────
function renderTable() {
  const start = (currentPage - 1) * PAGE_SIZE;
  const slice = filteredProducts.slice(start, start + PAGE_SIZE);

  if (filteredProducts.length === 0) {
    tbody.innerHTML = "";
    tableEmpty.classList.remove("hidden");
    tableEmptyMsg.textContent =
      productSearch.value || categoryFilter.value || statusFilter.value
        ? "No products match your filters."
        : "No products found.";
    paginationEl.classList.add("hidden");
    resultsLabel.textContent = "";
    tableSub.textContent = "0 products";
    return;
  }

  tableEmpty.classList.add("hidden");
  tbody.innerHTML = slice.map(buildRow).join("");

  tableSub.textContent = `${filteredProducts.length.toLocaleString()} product${filteredProducts.length !== 1 ? "s" : ""}`;

  resultsLabel.textContent = `Showing ${start + 1}–${Math.min(start + PAGE_SIZE, filteredProducts.length)} of ${filteredProducts.length.toLocaleString()}`;

  renderPagination();
}

// ─────────────────────────────────────────────────────────
// PAGINATION
// ─────────────────────────────────────────────────────────
function renderPagination() {
  const totalPages = Math.ceil(filteredProducts.length / PAGE_SIZE);

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
// APPLY FILTERS
// ─────────────────────────────────────────────────────────
function applyFilters() {
  const q = (productSearch.value || "").toLowerCase().trim();
  const cat = (categoryFilter.value || "").toLowerCase();
  const status = statusFilter.value;

  filteredProducts = allProducts.filter((p) => {
    if (q) {
      const searchable = [p.name, p.vendorName, p.category, p.description]
        .join(" ")
        .toLowerCase();
      if (!searchable.includes(q)) return false;
    }
    if (cat && (p.category || "").toLowerCase() !== cat) return false;
    if (status) {
      const s = (p.status || "published").toLowerCase();
      if (s !== status) return false;
    }
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
      allProducts
        .map((p) => (p.category || "").trim())
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
function renderStatStrip(products, totalWA) {
  const total = products.length;
  const published = products.filter(
    (p) => (p.status || "published").toLowerCase() === "published",
  ).length;
  const drafts = products.filter(
    (p) => (p.status || "").toLowerCase() === "draft",
  ).length;

  document.getElementById("statTotalProducts").textContent =
    total.toLocaleString();
  document.getElementById("statPublished").textContent =
    published.toLocaleString();
  document.getElementById("statDrafts").textContent = drafts.toLocaleString();
  document.getElementById("statProductWA").textContent =
    totalWA.toLocaleString();

  document
    .querySelectorAll("#productStatStrip .admin-stat-card")
    .forEach((c) => {
      c.style.opacity = "1";
    });
}

// ─────────────────────────────────────────────────────────
// TOP PRODUCTS CHART (by WA clicks)
// ─────────────────────────────────────────────────────────
function renderTopProductsChart(products) {
  const top = [...products]
    .filter((p) => (p._waClicks || 0) > 0)
    .sort((a, b) => b._waClicks - a._waClicks)
    .slice(0, 8);

  if (top.length === 0) {
    document.getElementById("topProductsEmpty").classList.remove("hidden");
    return;
  }

  renderHorizontalBarChart(
    "topProductsChart",
    top.map((p) => p.name || "Untitled"),
    top.map((p) => p._waClicks),
  );
}

// ─────────────────────────────────────────────────────────
// CATEGORY CHART (product count per category)
// ─────────────────────────────────────────────────────────
function renderCategoryChart(products) {
  const counts = {};
  products.forEach((p) => {
    const cat = (p.category || "Other").trim();
    counts[cat] = (counts[cat] || 0) + 1;
  });

  const sorted = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  if (sorted.length === 0) {
    document.getElementById("productCategoryEmpty").classList.remove("hidden");
    return;
  }

  renderHorizontalBarChart(
    "productCategoryChart",
    sorted.map(([cat]) => cat),
    sorted.map(([, count]) => count),
  );
}

// ─────────────────────────────────────────────────────────
// LOAD DATA FROM FIRESTORE
// ─────────────────────────────────────────────────────────
async function loadProducts() {
  try {
    // Fetch products + whatsapp_clicks in parallel
    const [productSnap, waSnap] = await Promise.all([
      getDocs(collection(db, "products")),
      getDocs(collection(db, "whatsapp_clicks")),
    ]);

    // Build WA click counts keyed by productId (strict equality only)
    const waCounts = {};
    waSnap.forEach((d) => {
      const data = d.data();
      if (data.productId) {
        waCounts[data.productId] = (waCounts[data.productId] || 0) + 1;
      }
    });

    const totalWA = Object.values(waCounts).reduce((s, n) => s + n, 0);

    // Build enriched product list
    const products = [];
    productSnap.forEach((d) => {
      const p = { id: d.id, ...d.data() };
      p._waClicks = waCounts[d.id] || 0;
      products.push(p);
    });

    // Sort by WA clicks desc, then by name A-Z
    products.sort((a, b) => {
      if (b._waClicks !== a._waClicks) return b._waClicks - a._waClicks;
      return (a.name || "").localeCompare(b.name || "");
    });

    allProducts = products;
    filteredProducts = [...products];

    renderStatStrip(products, totalWA);
    populateCategoryDropdown();
    renderTopProductsChart(products);
    renderCategoryChart(products);
    renderTable();
  } catch (err) {
    console.error("Products page load error:", err);
    tbody.innerHTML = "";
    tableError.classList.remove("hidden");
    tableSub.textContent = "Failed to load";
  }
}

// ─────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  tbody = document.getElementById("productTableBody");
  tableEmpty = document.getElementById("productTableEmpty");
  tableEmptyMsg = document.getElementById("productTableEmptyMsg");
  tableError = document.getElementById("productTableError");
  tableSub = document.getElementById("productTableSub");
  paginationEl = document.getElementById("productPagination");
  resultsLabel = document.getElementById("productResultsLabel");
  productSearch = document.getElementById("productSearch");
  categoryFilter = document.getElementById("productCategoryFilter");
  statusFilter = document.getElementById("productStatusFilter");

  productSearch.addEventListener("input", applyFilters);
  categoryFilter.addEventListener("change", applyFilters);
  statusFilter.addEventListener("change", applyFilters);

  loadProducts();
});
