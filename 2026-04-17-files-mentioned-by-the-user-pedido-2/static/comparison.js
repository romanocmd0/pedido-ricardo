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
    row.innerHTML = `
      <td>${month.month_title}</td>
      <td>${formatCurrency(month.total_value)}</td>
      <td>${formatCurrency(month.transferencia_total_value)}</td>
      <td>${formatCurrency(month.combo_transferencia_total_value)}</td>
      <td>${formatCurrency(month.cautelar_total_value)}</td>
      <td>${formatCurrency(month.pesquisa_total_value)}</td>
    `;
    body.appendChild(row);
  });
}

function createBars(values, colorClass) {
  const maxValue = Math.max(...values.map((item) => item.value), 1);
  return values
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

function renderCharts(months) {
  const evolution = document.querySelector("#evolution-chart");
  const types = document.querySelector("#types-chart");

  const recentMonths = months.slice(-12);
  evolution.innerHTML = createBars(
    recentMonths.map((month) => ({ label: month.month_title, value: month.total_value })),
    "gold-bar",
  );

  const totals = [
    {
      label: "Transferencia",
      value: months.reduce((sum, month) => sum + month.transferencia_total_value, 0),
    },
    {
      label: "Transf. Combo",
      value: months.reduce((sum, month) => sum + month.combo_transferencia_total_value, 0),
    },
    {
      label: "Cautelar",
      value: months.reduce((sum, month) => sum + month.cautelar_total_value, 0),
    },
    {
      label: "Pesquisa",
      value: months.reduce((sum, month) => sum + month.pesquisa_total_value, 0),
    },
  ];
  types.innerHTML = createBars(totals, "blue-bar");
}

async function loadComparison() {
  const response = await fetch("/api/comparison");
  const data = await response.json();
  if (!response.ok) {
    alert(data.error || "Nao foi possivel carregar a comparacao.");
    return;
  }
  const months = data.months || [];
  renderComparisonTable(months);
  renderCharts(months);
}

loadComparison();
