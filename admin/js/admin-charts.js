// ═══════════════════════════════════════════════════════════
// OJAHUB ADMIN — CHART HELPERS (Chart.js wrapper)
// admin/js/admin-charts.js
//
// Thin wrapper functions around Chart.js so every page renders
// charts with consistent OjaHub styling (colors, fonts, grid)
// without repeating config in every page script.
//
// REQUIRES: Chart.js loaded via CDN in the page <head> or before
// this script, e.g.:
//   <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
// ═══════════════════════════════════════════════════════════

// ── Shared color tokens (mirrors admin.css :root values) ───
const COLORS = {
  orange: "#ff6d00",
  orangeSoft: "rgba(255, 109, 0, 0.12)",
  blue: "#1a5cff",
  blueSoft: "rgba(26, 92, 255, 0.10)",
  green: "#16a34a",
  greenSoft: "rgba(22, 163, 74, 0.10)",
  purple: "#7c3aed",
  purpleSoft: "rgba(124, 58, 237, 0.10)",
  teal: "#0d9488",
  tealSoft: "rgba(13, 148, 136, 0.10)",
  grid: "#eef1f6",
  text: "#64748b",
};

const FONT_FAMILY = "'Plus Jakarta Sans', sans-serif";

// ── Shared base options applied to every chart ──────────────
function baseOptions(overrides = {}) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: "#0f172a",
        titleFont: { family: FONT_FAMILY, weight: "700", size: 12 },
        bodyFont: { family: FONT_FAMILY, size: 12 },
        padding: 10,
        cornerRadius: 8,
        displayColors: true,
        boxPadding: 4,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: COLORS.text, font: { family: FONT_FAMILY, size: 11 } },
      },
      y: {
        grid: { color: COLORS.grid },
        ticks: { color: COLORS.text, font: { family: FONT_FAMILY, size: 11 } },
        beginAtZero: true,
      },
    },
    ...overrides,
  };
}

// Track instances so a page can destroy/redraw on data refresh
const chartInstances = {};

function destroyExisting(canvasId) {
  if (chartInstances[canvasId]) {
    chartInstances[canvasId].destroy();
    delete chartInstances[canvasId];
  }
}

// ─────────────────────────────────────────────────────────
// AREA/LINE CHART — for trends over time
// e.g. visitor trend, WhatsApp click trend
//
// series: [{ label: "Visitors", data: [..], color: "blue" }, ...]
// ─────────────────────────────────────────────────────────
export function renderTrendChart(canvasId, labels, series, opts = {}) {
  destroyExisting(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return null;

  const datasets = series.map((s) => {
    const color = COLORS[s.color] || COLORS.blue;
    const colorSoft = COLORS[s.color + "Soft"] || COLORS.blueSoft;
    return {
      label: s.label,
      data: s.data,
      borderColor: color,
      backgroundColor: colorSoft,
      fill: true,
      tension: 0.35,
      pointRadius: 0,
      pointHoverRadius: 5,
      pointHoverBackgroundColor: color,
      pointHoverBorderColor: "#fff",
      pointHoverBorderWidth: 2,
      borderWidth: 2.5,
    };
  });

  const chart = new Chart(ctx, {
    type: "line",
    data: { labels, datasets },
    options: baseOptions({
      plugins: {
        legend: {
          display: series.length > 1,
          position: "top",
          align: "end",
          labels: {
            boxWidth: 8,
            boxHeight: 8,
            usePointStyle: true,
            font: { family: FONT_FAMILY, size: 12, weight: "600" },
            color: COLORS.text,
          },
        },
        tooltip: baseOptions().plugins.tooltip,
      },
      ...opts,
    }),
  });

  chartInstances[canvasId] = chart;
  return chart;
}

// ─────────────────────────────────────────────────────────
// BAR CHART — for comparisons
// e.g. category performance, vendor growth, location stats
// ─────────────────────────────────────────────────────────
export function renderBarChart(canvasId, labels, series, opts = {}) {
  destroyExisting(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return null;

  const datasets = series.map((s) => {
    const color = COLORS[s.color] || COLORS.orange;
    return {
      label: s.label,
      data: s.data,
      backgroundColor: color,
      borderRadius: 6,
      maxBarThickness: 36,
    };
  });

  const chart = new Chart(ctx, {
    type: "bar",
    data: { labels, datasets },
    options: baseOptions({
      plugins: {
        legend: {
          display: series.length > 1,
          position: "top",
          align: "end",
          labels: {
            boxWidth: 8,
            boxHeight: 8,
            usePointStyle: true,
            font: { family: FONT_FAMILY, size: 12, weight: "600" },
            color: COLORS.text,
          },
        },
        tooltip: baseOptions().plugins.tooltip,
      },
      ...opts,
    }),
  });

  chartInstances[canvasId] = chart;
  return chart;
}

// ─────────────────────────────────────────────────────────
// HORIZONTAL BAR CHART — for ranked lists
// e.g. category mix, top search terms
// ─────────────────────────────────────────────────────────
export function renderHorizontalBarChart(canvasId, labels, data, opts = {}) {
  destroyExisting(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return null;

  const chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          data,
          backgroundColor: COLORS.blue,
          borderRadius: 6,
          maxBarThickness: 22,
        },
      ],
    },
    options: baseOptions({
      indexAxis: "y",
      scales: {
        x: {
          grid: { color: COLORS.grid },
          ticks: {
            color: COLORS.text,
            font: { family: FONT_FAMILY, size: 11 },
          },
          beginAtZero: true,
        },
        y: {
          grid: { display: false },
          ticks: {
            color: COLORS.text,
            font: { family: FONT_FAMILY, size: 12, weight: "600" },
          },
        },
      },
      ...opts,
    }),
  });

  chartInstances[canvasId] = chart;
  return chart;
}

// ─────────────────────────────────────────────────────────
// FUNNEL-STYLE CHART (rendered as a horizontal bar with
// descending values — Chart.js has no native funnel type,
// this gives the same visual effect cleanly)
// ─────────────────────────────────────────────────────────
export function renderFunnelChart(canvasId, stages, opts = {}) {
  destroyExisting(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return null;

  const labels = stages.map((s) => s.stage);
  const data = stages.map((s) => s.value);
  const palette = [COLORS.blue, COLORS.teal, COLORS.orange, COLORS.green];

  const chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          data,
          backgroundColor: labels.map((_, i) => palette[i % palette.length]),
          borderRadius: 6,
          maxBarThickness: 32,
        },
      ],
    },
    options: baseOptions({
      indexAxis: "y",
      plugins: {
        legend: { display: false },
        tooltip: baseOptions().plugins.tooltip,
      },
      scales: {
        x: {
          grid: { color: COLORS.grid },
          ticks: {
            color: COLORS.text,
            font: { family: FONT_FAMILY, size: 11 },
          },
          beginAtZero: true,
        },
        y: {
          grid: { display: false },
          ticks: {
            color: COLORS.text,
            font: { family: FONT_FAMILY, size: 12, weight: "700" },
          },
        },
      },
      ...opts,
    }),
  });

  chartInstances[canvasId] = chart;
  return chart;
}

// ─────────────────────────────────────────────────────────
// DESTROY a specific chart (useful before re-rendering on
// data refresh without a full page reload)
// ─────────────────────────────────────────────────────────
export function destroyChart(canvasId) {
  destroyExisting(canvasId);
}
