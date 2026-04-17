const comparisonState = {
  months: [],
  clients: [],
  selectedMonthKey: "",
  pieChart: null,
  quantityChart: null,
  lineChart: null,
  clientVisitsChart: null,
  clientValuesChart: null,
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
  if (hasData) {
    canvas.classList.remove("hidden");
    empty.classList.add("hidden");
  } else {
    canvas.classList.add("hidden");
    empty.classList.remove("hidden");
    empty.textContent = message;
  }
}

function buildLineChart(target, labels, datasets) {
  if (target.chart) target.chart.destroy();
  return new Chart(target.context, {
    type: "line",
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: "#f0d777" } },
        tooltip: {
          callbacks: {
            title: (items) => items[0]?.label || "",
          },
        },
      },
      scales: {
        x: {
          ticks: {
            color: "#c7d3e2",
            maxRotation: 45,
            minRotation: 25,
            autoSkip: true,
            callback: function (value) {
              const label = this.getLabelForValue(value);
              return label.length > 22 ? `${label.slice(0, 22)}...` : label;
            },
          },
          grid: { color: "rgba(212,175,55,0.08)" },
        },
        y: { ticks: { color: "#c7d3e2" }, grid: { color: "rgba(212,175,55,0.08)" } },
      },
    },
  });
}

function buildBarChart(target, labels, datasets) {
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
  if (target.chart) target.chart.destroy();
  return new Chart(target.context, {
    type: "pie",
    data: {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: ["#d4af37", "#8cc7ff", "#f0d777", "#4fd3a7", "#f59f70"],
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
  counter.textContent = `${months.length}`;

  if (!months.length) {
    body.innerHTML = '<tr><td colspan="6" class="empty-state">Nenhum dado disponivel para comparacao.</td></tr>';
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
      <td>${formatCurrency(month.combo_transferencia_total_value)}</td>
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

function populateMonthCompareSelectors(months) {
  const first = document.querySelector("#compare-first-month");
  const second = document.querySelector("#compare-second-month");
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

function populateClientSelector(clients) {
  const select = document.querySelector("#client-select");
  select.innerHTML = '<option value="">Selecione um cliente</option>';
  clients.forEach((client) => {
    const option = document.createElement("option");
    option.value = client;
    option.textContent = client;
    select.appendChild(option);
  });
}

function renderMonthTabs(months) {
  const container = document.querySelector("#comparison-month-tabs");
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

async function loadMonthCharts(monthKey) {
  const response = await fetch(`/api/comparison/${monthKey}`);
  const data = await response.json();
  if (!response.ok) {
    alert(data.error || "Nao foi possivel carregar os graficos do mes.");
    return;
  }

  document.querySelector("#selected-month-title").textContent = data.month_title || "Nenhum";
  if (!data.has_data) {
    if (comparisonState.pieChart) {
      comparisonState.pieChart.destroy();
      comparisonState.pieChart = null;
    }
    if (comparisonState.lineChart) {
      comparisonState.lineChart.destroy();
      comparisonState.lineChart = null;
    }
    if (comparisonState.quantityChart) {
      comparisonState.quantityChart.destroy();
      comparisonState.quantityChart = null;
    }
    setCanvasState("#pie-chart-canvas", "#pie-chart-empty", false, "Sem dados");
    setCanvasState("#quantity-chart-canvas", "#quantity-chart-empty", false, "Sem dados");
    setCanvasState("#line-chart-canvas", "#line-chart-empty", false, "Sem dados");
    return;
  }

  setCanvasState("#pie-chart-canvas", "#pie-chart-empty", true);
  setCanvasState("#quantity-chart-canvas", "#quantity-chart-empty", true);
  setCanvasState("#line-chart-canvas", "#line-chart-empty", true);

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

  comparisonState.lineChart = buildLineChart(
    {
      context: document.querySelector("#line-chart-canvas"),
      chart: comparisonState.lineChart,
    },
    data.line.map((item) => item.partner_name || item.label),
    [
      {
        label: "Valor por vistoria",
        data: data.line.map((item) => item.value),
        borderColor: "#8cc7ff",
        backgroundColor: "rgba(140,199,255,0.18)",
        fill: false,
        tension: 0.25,
      },
    ],
  );
}

async function loadClientHistory(partnerName) {
  if (!partnerName) {
    if (comparisonState.clientVisitsChart) {
      comparisonState.clientVisitsChart.destroy();
      comparisonState.clientVisitsChart = null;
    }
    if (comparisonState.clientValuesChart) {
      comparisonState.clientValuesChart.destroy();
      comparisonState.clientValuesChart = null;
    }
    setCanvasState("#client-visits-canvas", "#client-visits-empty", false, "Selecione um cliente para visualizar.");
    setCanvasState("#client-values-canvas", "#client-values-empty", false, "Selecione um cliente para visualizar.");
    return;
  }

  const response = await fetch(`/api/client-history/${encodeURIComponent(partnerName)}`);
  const data = await response.json();
  if (!response.ok) {
    alert(data.error || "Nao foi possivel carregar o historico do cliente.");
    return;
  }

  if (!data.has_data) {
    if (comparisonState.clientVisitsChart) {
      comparisonState.clientVisitsChart.destroy();
      comparisonState.clientVisitsChart = null;
    }
    if (comparisonState.clientValuesChart) {
      comparisonState.clientValuesChart.destroy();
      comparisonState.clientValuesChart = null;
    }
    setCanvasState("#client-visits-canvas", "#client-visits-empty", false, "Sem dados");
    setCanvasState("#client-values-canvas", "#client-values-empty", false, "Sem dados");
    return;
  }

  setCanvasState("#client-visits-canvas", "#client-visits-empty", true);
  setCanvasState("#client-values-canvas", "#client-values-empty", true);

  const labels = data.months.map((item) => item.month_title);
  comparisonState.clientVisitsChart = buildLineChart(
    { context: document.querySelector("#client-visits-canvas"), chart: comparisonState.clientVisitsChart },
    labels,
    [
      {
        label: "Quantidade de vistorias",
        data: data.months.map((item) => item.vistoria_count),
        borderColor: "#d4af37",
        backgroundColor: "rgba(212,175,55,0.18)",
        fill: true,
        tension: 0.25,
      },
    ],
  );

  comparisonState.clientValuesChart = buildLineChart(
    { context: document.querySelector("#client-values-canvas"), chart: comparisonState.clientValuesChart },
    labels,
    [
      {
        label: "Valores por mes",
        data: data.months.map((item) => item.total_value),
        borderColor: "#4fd3a7",
        backgroundColor: "rgba(79,211,167,0.18)",
        fill: true,
        tension: 0.25,
      },
    ],
  );
}

async function compareSelectedMonths() {
  const first = document.querySelector("#compare-first-month").value;
  const second = document.querySelector("#compare-second-month").value;
  if (!first || !second) return;

  const response = await fetch(`/api/month-compare?first=${encodeURIComponent(first)}&second=${encodeURIComponent(second)}`);
  const data = await response.json();
  if (!response.ok) {
    alert(data.error || "Nao foi possivel comparar os meses.");
    return;
  }

  const metrics = [
    ["Total geral", "total_value"],
    ["Total de Transferencias", "transferencia_total_value"],
    ["Transf. de Combo", "combo_transferencia_total_value"],
    ["Cautelar", "cautelar_total_value"],
    ["Pesquisa", "pesquisa_total_value"],
  ];
  const container = document.querySelector("#month-compare-results");
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
    ["Total Transferencias", "transferencia_total_value"],
    ["Transf. Combo", "combo_transferencia_total_value"],
    ["Cautelar", "cautelar_total_value"],
    ["Pesquisa", "pesquisa_total_value"],
  ];
  const quantityMetrics = [
    ["Transferencia", "transferencia_qty"],
    ["Transf. Caminhao", "caminhao_transferencia_qty"],
    ["Transf. Combo", "combo_transferencia_qty"],
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
  comparisonState.clients = data.clients || [];
  renderMonthTabs(comparisonState.months);
  renderComparisonTable(comparisonState.months);
  populateMonthCompareSelectors(comparisonState.months);
  populateClientSelector(comparisonState.clients);
}

document.querySelector("#client-select").addEventListener("change", (event) => loadClientHistory(event.target.value));
document.querySelector("#compare-months-button").addEventListener("click", compareSelectedMonths);

loadComparison();
