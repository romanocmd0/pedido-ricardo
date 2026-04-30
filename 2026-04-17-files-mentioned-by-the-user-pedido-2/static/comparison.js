const comparisonRoot = document.querySelector("#comparison-body");

const comparisonState = {
  months: [],
  selectedMonthKey: "",
  pieChart: null,
  quantityChart: null,
  groupedPieChart: null,
  groupedQuantityChart: null,
  monthValuesCompareChart: null,
  monthQuantityCompareChart: null,
};

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value || 0));
}

function formatPercentDelta(value) {
  if (value === null || value === undefined) return "Novo";
  return `${value > 0 ? "+" : ""}${value.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}%`;
}

function setCanvasState(canvasId, emptyId, hasData, message = "Sem dados") {
  const canvas = document.querySelector(canvasId);
  const empty = document.querySelector(emptyId);
  if (!canvas || !empty) return;
  if (hasData) {
    canvas.classList.remove("hidden");
    empty.classList.add("hidden");
  } else {
    canvas.classList.add("hidden");
    empty.classList.remove("hidden");
    empty.textContent = message;
  }
}

function buildBarChart(target, labels, datasets) {
  if (!target.context) return null;
  if (target.chart) target.chart.destroy();
  return new Chart(target.context, {
    type: "bar",
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

function buildPieChart(target, labels, values) {
  if (!target.context) return null;
  if (target.chart) target.chart.destroy();
  return new Chart(target.context, {
    type: "pie",
    data: {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: ["#d4af37", "#8cc7ff", "#4fd3a7", "#f59f70", "#ff8aa6"],
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: "#f0d777" } } },
    },
  });
}

function renderComparisonTable(months) {
  const body = document.querySelector("#comparison-body");
  const counter = document.querySelector("#comparison-month-count");
  if (!body || !counter) return;
  counter.textContent = `${months.length}`;

  if (!months.length) {
    body.innerHTML = '<tr><td colspan="5" class="empty-state">Nenhum dado disponivel para comparacao.</td></tr>';
    return;
  }

  body.innerHTML = "";
  months.forEach((month) => {
    const row = document.createElement("tr");
    row.className = `comparison-row ${comparisonState.selectedMonthKey === month.month_key ? "is-selected" : ""}`;
    row.innerHTML = `
      <td>${month.month_title}</td>
      <td>${formatCurrency(month.total_value)}</td>
      <td>${formatCurrency(month.transferencia_total_value)}</td>
      <td>${formatCurrency(month.cautelar_total_value)}</td>
      <td>${formatCurrency(month.pesquisa_total_value)}</td>
    `;
    row.addEventListener("click", async () => {
      comparisonState.selectedMonthKey = month.month_key;
      renderComparisonTable(comparisonState.months);
      renderMonthTabs(comparisonState.months);
      await loadMonthCharts(month.month_key);
    });
    body.appendChild(row);
  });
}

function renderMonthTabs(months) {
  const container = document.querySelector("#comparison-month-tabs");
  if (!container) return;
  container.innerHTML = "";

  if (!months.length) {
    container.innerHTML = '<div class="empty-state">Nenhum mes com dados para exibir no dashboard.</div>';
    return;
  }

  months.forEach((month) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `month-tab ${comparisonState.selectedMonthKey === month.month_key ? "is-active" : ""}`;
    button.innerHTML = `<span>${month.month_title}</span><small>${month.record_count} registro(s)</small>`;
    button.addEventListener("click", async () => {
      comparisonState.selectedMonthKey = month.month_key;
      renderMonthTabs(comparisonState.months);
      renderComparisonTable(comparisonState.months);
      await loadMonthCharts(month.month_key);
    });
    container.appendChild(button);
  });
}

function populateMonthCompareSelectors(months) {
  const first = document.querySelector("#compare-first-month");
  const second = document.querySelector("#compare-second-month");
  if (!first || !second) return;
  first.innerHTML = "";
  second.innerHTML = "";
  months.forEach((month, index) => {
    const firstOption = document.createElement("option");
    firstOption.value = month.month_key;
    firstOption.textContent = month.month_title;
    if (index === 0) firstOption.selected = true;
    first.appendChild(firstOption);

    const secondOption = document.createElement("option");
    secondOption.value = month.month_key;
    secondOption.textContent = month.month_title;
    if (index === months.length - 1) secondOption.selected = true;
    second.appendChild(secondOption);
  });
}

function clearMonthCharts() {
  ["pieChart", "quantityChart", "groupedPieChart", "groupedQuantityChart"].forEach((key) => {
    if (comparisonState[key]) {
      comparisonState[key].destroy();
      comparisonState[key] = null;
    }
  });
}

async function loadMonthCharts(monthKey) {
  const response = await fetch(`/api/comparison/${monthKey}`);
  const data = await response.json();
  if (!response.ok) {
    alert(data.error || "Nao foi possivel carregar os graficos do mes.");
    return;
  }

  const selectedTitle = document.querySelector("#selected-month-title");
  if (selectedTitle) selectedTitle.textContent = data.month_title || "Nenhum";

  if (!data.has_data) {
    clearMonthCharts();
    setCanvasState("#pie-chart-canvas", "#pie-chart-empty", false, "Sem dados");
    setCanvasState("#quantity-chart-canvas", "#quantity-chart-empty", false, "Sem dados");
    setCanvasState("#grouped-pie-chart-canvas", "#grouped-pie-chart-empty", false, "Sem dados");
    setCanvasState("#grouped-quantity-chart-canvas", "#grouped-quantity-chart-empty", false, "Sem dados");
    return;
  }

  setCanvasState("#pie-chart-canvas", "#pie-chart-empty", true);
  setCanvasState("#quantity-chart-canvas", "#quantity-chart-empty", true);
  setCanvasState("#grouped-pie-chart-canvas", "#grouped-pie-chart-empty", true);
  setCanvasState("#grouped-quantity-chart-canvas", "#grouped-quantity-chart-empty", true);

  comparisonState.pieChart = buildPieChart(
    {
      context: document.querySelector("#pie-chart-canvas"),
      chart: comparisonState.pieChart,
    },
    data.pie.map((item) => item.label),
    data.pie.map((item) => item.value),
  );

  comparisonState.quantityChart = buildPieChart(
    {
      context: document.querySelector("#quantity-chart-canvas"),
      chart: comparisonState.quantityChart,
    },
    data.quantity.map((item) => item.label),
    data.quantity.map((item) => item.value),
  );

  comparisonState.groupedPieChart = buildPieChart(
    {
      context: document.querySelector("#grouped-pie-chart-canvas"),
      chart: comparisonState.groupedPieChart,
    },
    data.grouped_pie.map((item) => item.label),
    data.grouped_pie.map((item) => item.value),
  );

  comparisonState.groupedQuantityChart = buildPieChart(
    {
      context: document.querySelector("#grouped-quantity-chart-canvas"),
      chart: comparisonState.groupedQuantityChart,
    },
    data.grouped_quantity.map((item) => item.label),
    data.grouped_quantity.map((item) => item.value),
  );
}

async function compareSelectedMonths() {
  const firstSelect = document.querySelector("#compare-first-month");
  const secondSelect = document.querySelector("#compare-second-month");
  const container = document.querySelector("#month-compare-results");
  if (!firstSelect || !secondSelect || !container) return;
  const first = firstSelect.value;
  const second = secondSelect.value;
  if (!first || !second) return;

  const response = await fetch(`/api/month-compare?first=${encodeURIComponent(first)}&second=${encodeURIComponent(second)}`);
  const data = await response.json();
  if (!response.ok) {
    alert(data.error || "Nao foi possivel comparar os meses.");
    return;
  }

  const metrics = [
    ["Total geral", "total_value"],
    ["Transferencias", "transferencia_total_value"],
    ["Cautelar", "cautelar_total_value"],
    ["Pesquisa", "pesquisa_total_value"],
  ];
  container.innerHTML = metrics
    .map(([label, key]) => {
      const delta = data.delta[key];
      return `
        <article class="breakdown-card">
          <span>${label}</span>
          <div class="compare-total-pair">
            <div>
              <small>${data.first.month_title}</small>
              <strong>${formatCurrency(data.first[key])}</strong>
            </div>
            <div>
              <small>${data.second.month_title}</small>
              <strong>${formatCurrency(data.second[key])}</strong>
            </div>
          </div>
          <p class="compare-delta">Diferenca: ${formatCurrency(delta.difference)} | ${formatPercentDelta(delta.pct_change)}</p>
        </article>
      `;
    })
    .join("");

  const valueMetrics = [
    ["Total geral", "total_value"],
    ["Transferencias", "transferencia_total_value"],
    ["Cautelar", "cautelar_total_value"],
    ["Pesquisa", "pesquisa_total_value"],
  ];
  const quantityMetrics = [
    ["Transferencias", "transferencia_qty"],
    ["Cautelar", "cautelar_qty"],
    ["Pesquisa", "pesquisa_qty"],
  ];

  setCanvasState("#month-values-compare-canvas", "#month-values-compare-empty", true);
  setCanvasState("#month-quantity-compare-canvas", "#month-quantity-compare-empty", true);

  comparisonState.monthValuesCompareChart = buildBarChart(
    {
      context: document.querySelector("#month-values-compare-canvas"),
      chart: comparisonState.monthValuesCompareChart,
    },
    valueMetrics.map(([label]) => label),
    [
      {
        label: data.first.month_title,
        data: valueMetrics.map(([, key]) => data.first[key] || 0),
        backgroundColor: "#d4af37",
        borderRadius: 8,
      },
      {
        label: data.second.month_title,
        data: valueMetrics.map(([, key]) => data.second[key] || 0),
        backgroundColor: "#8cc7ff",
        borderRadius: 8,
      },
    ],
  );

  comparisonState.monthQuantityCompareChart = buildBarChart(
    {
      context: document.querySelector("#month-quantity-compare-canvas"),
      chart: comparisonState.monthQuantityCompareChart,
    },
    quantityMetrics.map(([label]) => label),
    [
      {
        label: data.first.month_title,
        data: quantityMetrics.map(([, key]) => data.first[key] || 0),
        backgroundColor: "#d4af37",
        borderRadius: 8,
      },
      {
        label: data.second.month_title,
        data: quantityMetrics.map(([, key]) => data.second[key] || 0),
        backgroundColor: "#4fd3a7",
        borderRadius: 8,
      },
    ],
  );
}

async function loadComparison() {
  const response = await fetch("/api/comparison");
  const data = await response.json();
  if (!response.ok) {
    alert(data.error || "Nao foi possivel carregar a comparacao.");
    return;
  }

  comparisonState.months = data.months || [];
  comparisonState.selectedMonthKey = comparisonState.selectedMonthKey || comparisonState.months[0]?.month_key || "";
  renderMonthTabs(comparisonState.months);
  renderComparisonTable(comparisonState.months);
  populateMonthCompareSelectors(comparisonState.months);
  if (comparisonState.selectedMonthKey) {
    await loadMonthCharts(comparisonState.selectedMonthKey);
  }
}

if (comparisonRoot) {
  document.querySelector("#compare-months-button")?.addEventListener("click", compareSelectedMonths);
  loadComparison();
}
