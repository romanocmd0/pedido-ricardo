const finalElements = {
  totalValue: document.querySelector("#final-total-value"),
  totalQuantity: document.querySelector("#final-total-quantity"),
  body: document.querySelector("#final-report-body"),
  refreshButton: document.querySelector("#refresh-final-report-button"),
};

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value || 0));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderFinalReport(data) {
  finalElements.totalValue.textContent = formatCurrency(data.summary?.total_value || 0);
  finalElements.totalQuantity.textContent = String(data.summary?.quantity || 0);

  const rows = data.rows || [];
  if (!rows.length) {
    finalElements.body.innerHTML = '<tr><td colspan="6" class="empty-state">Nenhum caixa finalizado ainda.</td></tr>';
    return;
  }

  finalElements.body.innerHTML = rows
    .map(
      (row) => `
        <tr>
          <td>${escapeHtml(row.customer_name)}</td>
          <td>${escapeHtml(row.service_name)}</td>
          <td>${row.quantity}</td>
          <td>${formatCurrency(row.total_value)}</td>
          <td>${row.first_date}</td>
          <td>${row.last_date}</td>
        </tr>
      `,
    )
    .join("");
}

async function loadFinalReport() {
  const response = await fetch("/api/final-report");
  const data = await response.json();
  if (!response.ok) {
    alert(data.error || "Nao foi possivel carregar o relatorio final.");
    return;
  }
  renderFinalReport(data);
}

finalElements.refreshButton.addEventListener("click", loadFinalReport);
loadFinalReport();
