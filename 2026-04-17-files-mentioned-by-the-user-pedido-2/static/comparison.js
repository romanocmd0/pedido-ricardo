const comparisonState = {
  months: [],
  selectedMonthKey: "",
};

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value || 0));
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
    button.innerHTML = `
      <span>${month.month_title}</span>
      <small>${month.record_count} registro(s)</small>
    `;
    button.addEventListener("click", async () => {
      comparisonState.selectedMonthKey = month.month_key;
      renderMonthTabs(comparisonState.months);
      renderComparisonTable(comparisonState.months);
      await loadMonthCharts(month.month_key);
    });
    container.appendChild(button);
  });
}

function createBarMarkup(items, colorClass) {
  const maxValue = Math.max(...items.map((item) => item.value), 1);
  return items
    .map(
      (item) => `
        <div class="bar-group">
          <div class="bar-label">${item.label}</div>
          <div class="bar-track">
            <div class="bar-fill ${colorClass}" style="width: ${(item.value / maxValue) * 100}%"></div>
          </div>
          <div class="bar-value">${formatCurrency(item.value)}</div>
        </div>
      `,
    )
    .join("");
}

function renderPieChart(monthTitle, pieData) {
  const container = document.querySelector("#pie-chart");
  const total = pieData.reduce((sum, item) => sum + item.value, 0);
  if (!total) {
    container.className = "chart-surface empty-chart";
    container.textContent = "Sem dados";
    return;
  }

  container.className = "chart-surface";
  const segments = pieData
    .map((item, index) => {
      const colors = ["#d4af37", "#8cc7ff", "#4fd3a7", "#f59f70"];
      const percentage = total === 0 ? 0 : ((item.value / total) * 100).toFixed(1);
      return `
        <div class="pie-row">
          <span class="pie-dot" style="background:${colors[index % colors.length]}"></span>
          <span class="pie-label">${item.label}</span>
          <strong class="pie-value">${percentage}%</strong>
          <span class="pie-amount">${formatCurrency(item.value)}</span>
        </div>
      `;
    })
    .join("");

  container.innerHTML = `
    <div class="chart-title">${monthTitle}</div>
    ${segments}
  `;
}

function renderLineChart(monthTitle, lineData) {
  const container = document.querySelector("#line-chart");
  if (!lineData.length) {
    container.className = "chart-surface empty-chart";
    container.textContent = "Sem dados";
    return;
  }

  container.className = "chart-surface";
  container.innerHTML = `
    <div class="chart-title">${monthTitle}</div>
    ${createBarMarkup(lineData, "blue-bar")}
  `;
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
    document.querySelector("#pie-chart").className = "chart-surface empty-chart";
    document.querySelector("#line-chart").className = "chart-surface empty-chart";
    document.querySelector("#pie-chart").textContent = "Sem dados";
    document.querySelector("#line-chart").textContent = "Sem dados";
    return;
  }

  renderPieChart(data.month_title, data.pie || []);
  renderLineChart(data.month_title, data.line || []);
}

async function loadComparison() {
  const response = await fetch("/api/comparison");
  const data = await response.json();
  if (!response.ok) {
    alert(data.error || "Nao foi possivel carregar a comparacao.");
    return;
  }

  comparisonState.months = data.months || [];
  renderMonthTabs(comparisonState.months);
  renderComparisonTable(comparisonState.months);
}

loadComparison();
