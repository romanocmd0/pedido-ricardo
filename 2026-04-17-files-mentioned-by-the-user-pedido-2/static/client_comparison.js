const clientComparisonState = {
  months: [],
  ranking: [],
  evolution: [],
  barChart: null,
  quantityBarChart: null,
  lineChart: null,
};

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value || 0));
}

function setCanvasState(canvasId, emptyId, hasData, message = "Sem dados") {
  const canvas = document.querySelector(canvasId);
  const empty = document.querySelector(emptyId);
  if (hasData) {
    canvas.classList.remove("hidden");
    empty.classList.add("hidden");
  } else {
    canvas.classList.add("hidden");
    empty.classList.remove("hidden");
    empty.textContent = message;
  }
}

function buildBarChart(labels, values) {
  const canvas = document.querySelector("#client-bar-canvas");
  if (clientComparisonState.barChart) clientComparisonState.barChart.destroy();
  return new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Valor total",
          data: values,
          backgroundColor: "#d4af37",
          borderRadius: 8,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: "#f0d777" } } },
      scales: {
        x: { ticks: { color: "#c7d3e2" }, grid: { color: "rgba(212,175,55,0.08)" } },
        y: { ticks: { color: "#c7d3e2" }, grid: { color: "rgba(212,175,55,0.08)" } },
      },
    },
  });
}

function buildQuantityBarChart(labels, values) {
  const canvas = document.querySelector("#client-quantity-bar-canvas");
  if (clientComparisonState.quantityBarChart) clientComparisonState.quantityBarChart.destroy();
  return new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Quantidade de vistorias",
          data: values,
          backgroundColor: "#8cc7ff",
          borderRadius: 8,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: "#f0d777" } } },
      scales: {
        x: { ticks: { color: "#c7d3e2" }, grid: { color: "rgba(212,175,55,0.08)" } },
        y: { ticks: { color: "#c7d3e2" }, grid: { color: "rgba(212,175,55,0.08)" } },
      },
    },
  });
}

function buildLineChart(labels, datasets) {
  const canvas = document.querySelector("#client-line-canvas");
  if (clientComparisonState.lineChart) clientComparisonState.lineChart.destroy();
  return new Chart(canvas, {
    type: "line",
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: "#f0d777" } } },
      scales: {
        x: { ticks: { color: "#c7d3e2" }, grid: { color: "rgba(212,175,55,0.08)" } },
        y: { ticks: { color: "#c7d3e2" }, grid: { color: "rgba(212,175,55,0.08)" } },
      },
    },
  });
}

function renderRankingTable(ranking) {
  const body = document.querySelector("#client-ranking-body");
  if (!ranking.length) {
    body.innerHTML = '<tr><td colspan="3" class="empty-state">Nenhum cliente encontrado.</td></tr>';
    return;
  }

  body.innerHTML = "";
  ranking.forEach((item) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${item.partner_name}</td>
      <td>${formatCurrency(item.total_value)}</td>
      <td>${item.vistoria_count}</td>
    `;
    body.appendChild(row);
  });
}

function populateMonthSelect(months) {
  const select = document.querySelector("#client-month-select");
  select.innerHTML = '<option value="">Selecione um mes</option>';
  months.forEach((month) => {
    const option = document.createElement("option");
    option.value = month.month_key;
    option.textContent = month.month_title;
    select.appendChild(option);
  });
}

function renderCharts(payload) {
  const ranking = payload.ranking || [];
  if (!ranking.length) {
    if (clientComparisonState.barChart) {
      clientComparisonState.barChart.destroy();
      clientComparisonState.barChart = null;
    }
    if (clientComparisonState.lineChart) {
      clientComparisonState.lineChart.destroy();
      clientComparisonState.lineChart = null;
    }
    if (clientComparisonState.quantityBarChart) {
      clientComparisonState.quantityBarChart.destroy();
      clientComparisonState.quantityBarChart = null;
    }
    setCanvasState("#client-bar-canvas", "#client-bar-empty", false, "Sem dados");
    setCanvasState("#client-quantity-bar-canvas", "#client-quantity-bar-empty", false, "Sem dados");
    setCanvasState("#client-line-canvas", "#client-line-empty", false, "Sem dados");
    renderRankingTable([]);
    return;
  }

  setCanvasState("#client-bar-canvas", "#client-bar-empty", true);
  setCanvasState("#client-quantity-bar-canvas", "#client-quantity-bar-empty", true);
  renderRankingTable(ranking);
  clientComparisonState.barChart = buildBarChart(
    ranking.slice(0, 10).map((item) => item.partner_name),
    ranking.slice(0, 10).map((item) => item.total_value),
  );
  clientComparisonState.quantityBarChart = buildQuantityBarChart(
    ranking.slice(0, 10).map((item) => item.partner_name),
    ranking.slice(0, 10).map((item) => item.vistoria_count),
  );

  const labels = (payload.evolution || []).map((item) => item.month_title);
  const names = payload.top_names || [];
  if (!labels.length || !names.length) {
    if (clientComparisonState.lineChart) {
      clientComparisonState.lineChart.destroy();
      clientComparisonState.lineChart = null;
    }
    setCanvasState("#client-line-canvas", "#client-line-empty", false, "Sem dados");
  } else {
    setCanvasState("#client-line-canvas", "#client-line-empty", true);
    const palette = ["#d4af37", "#8cc7ff", "#4fd3a7", "#f59f70", "#ff8aa6"];
    clientComparisonState.lineChart = buildLineChart(
      labels,
      names.map((name, index) => ({
        label: name,
        data: payload.evolution.map((item) => item[name] || 0),
        borderColor: palette[index % palette.length],
        backgroundColor: `${palette[index % palette.length]}33`,
        fill: false,
        tension: 0.25,
      })),
    );
  }
}

async function loadClientComparison() {
  const mode = document.querySelector("#client-view-mode").value;
  const monthKey = document.querySelector("#client-month-select").value;
  const params = new URLSearchParams();
  if (mode === "month" && monthKey) params.set("month_key", monthKey);

  const response = await fetch(`/api/client-comparison?${params.toString()}`);
  const data = await response.json();
  if (!response.ok) {
    alert(data.error || "Nao foi possivel carregar a comparacao entre clientes.");
    return;
  }

  clientComparisonState.months = data.months || [];
  clientComparisonState.ranking = data.ranking || [];
  clientComparisonState.evolution = data.evolution || [];
  document.querySelector("#client-scope-label").textContent =
    mode === "month" && monthKey
      ? clientComparisonState.months.find((item) => item.month_key === monthKey)?.month_title || "Mes especifico"
      : "Total geral";

  renderCharts(data);
}

document.querySelector("#client-view-mode").addEventListener("change", (event) => {
  const select = document.querySelector("#client-month-select");
  select.disabled = event.target.value !== "month";
});

document.querySelector("#apply-client-filter-button").addEventListener("click", loadClientComparison);

(async function init() {
  const comparison = await fetch("/api/comparison");
  const data = await comparison.json();
  if (comparison.ok) populateMonthSelect(data.months || []);
  await loadClientComparison();
})();
