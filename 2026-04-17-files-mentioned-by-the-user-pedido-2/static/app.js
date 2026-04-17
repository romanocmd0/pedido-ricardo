const state = {
  records: [],
  months: [],
  activeMonthKey: "",
  sortBy: "partner_name",
  sortOrder: "asc",
  summary: null,
};

const elements = {
  monthTabs: document.querySelector("#month-tabs"),
  searchInput: document.querySelector("#search-input"),
  refreshButton: document.querySelector("#refresh-button"),
  newRecordButton: document.querySelector("#new-record-button"),
  recordsBody: document.querySelector("#records-body"),
  recordCount: document.querySelector("#record-count"),
  periodCount: document.querySelector("#period-count"),
  activeMonthTitle: document.querySelector("#active-month-title"),
  headerTotalValue: document.querySelector("#header-total-value"),
  summaryTotalValue: document.querySelector("#summary-total-value"),
  summaryTransferenciaQty: document.querySelector("#summary-transferencia-qty"),
  summaryTransferenciaPct: document.querySelector("#summary-transferencia-pct"),
  summaryCautelarQty: document.querySelector("#summary-cautelar-qty"),
  summaryCautelarPct: document.querySelector("#summary-cautelar-pct"),
  summaryPesquisaQty: document.querySelector("#summary-pesquisa-qty"),
  summaryPesquisaPct: document.querySelector("#summary-pesquisa-pct"),
  formTitle: document.querySelector("#form-title"),
  formMonthCaption: document.querySelector("#form-month-caption"),
  form: document.querySelector("#record-form"),
  recordId: document.querySelector("#record-id"),
  partnerName: document.querySelector("#partner-name"),
  transferenciaQty: document.querySelector("#transferencia-qty"),
  cautelarQty: document.querySelector("#cautelar-qty"),
  pesquisaQty: document.querySelector("#pesquisa-qty"),
  unitTransferencia: document.querySelector("#unit-transferencia"),
  unitCautelar: document.querySelector("#unit-cautelar"),
  unitPesquisa: document.querySelector("#unit-pesquisa"),
  calculatedTotal: document.querySelector("#calculated-total"),
  cancelEditButton: document.querySelector("#cancel-edit-button"),
};

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value || 0));
}

function formatPercent(value) {
  return `${Number(value || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}% do total de operacoes`;
}

function currentPayload() {
  return {
    month_key: state.activeMonthKey,
    partner_name: elements.partnerName.value.trim(),
    transferencia_qty: Number(elements.transferenciaQty.value || 0),
    cautelar_qty: Number(elements.cautelarQty.value || 0),
    pesquisa_qty: Number(elements.pesquisaQty.value || 0),
    unit_transferencia: Number(elements.unitTransferencia.value || 0),
    unit_cautelar: Number(elements.unitCautelar.value || 0),
    unit_pesquisa: Number(elements.unitPesquisa.value || 0),
  };
}

function calculateTotal(payload) {
  return (
    payload.transferencia_qty * payload.unit_transferencia +
    payload.cautelar_qty * payload.unit_cautelar +
    payload.pesquisa_qty * payload.unit_pesquisa
  );
}

function getActiveMonth() {
  return state.months.find((month) => month.month_key === state.activeMonthKey) || null;
}

function updateCalculatedTotal() {
  elements.calculatedTotal.textContent = formatCurrency(calculateTotal(currentPayload()));
}

function resetForm() {
  elements.form.reset();
  elements.recordId.value = "";
  elements.formTitle.textContent = "Novo registro";
  elements.transferenciaQty.value = 0;
  elements.cautelarQty.value = 0;
  elements.pesquisaQty.value = 0;
  elements.unitTransferencia.value = 160;
  elements.unitCautelar.value = 240;
  elements.unitPesquisa.value = 80;

  const activeMonth = getActiveMonth();
  const monthTitle = activeMonth ? activeMonth.month_title : "-";
  elements.formMonthCaption.textContent = `Mes ativo: ${monthTitle}`;
  updateCalculatedTotal();
}

function renderMonthTabs() {
  elements.monthTabs.innerHTML = "";

  state.months.forEach((month) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `month-tab ${month.month_key === state.activeMonthKey ? "is-active" : ""}`;
    button.innerHTML = `
      <span>${month.month_title}</span>
      <small>${month.record_count} registro(s)</small>
    `;
    button.addEventListener("click", async () => {
      if (state.activeMonthKey === month.month_key) {
        return;
      }
      state.activeMonthKey = month.month_key;
      resetForm();
      await loadRecords();
    });
    elements.monthTabs.appendChild(button);
  });

  elements.periodCount.textContent = `${state.months.length} meses`;
}

function renderSummary() {
  const summary = state.summary || {
    total_value: 0,
    transferencia_qty: 0,
    cautelar_qty: 0,
    pesquisa_qty: 0,
    transferencia_pct: 0,
    cautelar_pct: 0,
    pesquisa_pct: 0,
    record_count: 0,
  };

  const activeMonth = getActiveMonth();
  elements.activeMonthTitle.textContent = activeMonth ? activeMonth.month_title : "-";
  elements.recordCount.textContent = String(summary.record_count || 0);
  elements.headerTotalValue.textContent = formatCurrency(summary.total_value);
  elements.summaryTotalValue.textContent = formatCurrency(summary.total_value);
  elements.summaryTransferenciaQty.textContent = String(summary.transferencia_qty || 0);
  elements.summaryTransferenciaPct.textContent = formatPercent(summary.transferencia_pct);
  elements.summaryCautelarQty.textContent = String(summary.cautelar_qty || 0);
  elements.summaryCautelarPct.textContent = formatPercent(summary.cautelar_pct);
  elements.summaryPesquisaQty.textContent = String(summary.pesquisa_qty || 0);
  elements.summaryPesquisaPct.textContent = formatPercent(summary.pesquisa_pct);
}

function renderTable() {
  if (!state.records.length) {
    elements.recordsBody.innerHTML =
      '<tr><td colspan="9" class="empty-state">Nenhum registro encontrado para este mes.</td></tr>';
    return;
  }

  elements.recordsBody.innerHTML = "";
  state.records.forEach((record) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${record.partner_name}</td>
      <td>${record.transferencia_qty}</td>
      <td>${record.cautelar_qty}</td>
      <td>${record.pesquisa_qty}</td>
      <td>${formatCurrency(record.unit_transferencia)}</td>
      <td>${formatCurrency(record.unit_cautelar)}</td>
      <td>${formatCurrency(record.unit_pesquisa)}</td>
      <td>${formatCurrency(record.total_value)}</td>
      <td></td>
    `;

    const actionsCell = row.querySelector("td:last-child");
    const actionWrap = document.createElement("div");
    actionWrap.className = "actions";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "icon-button";
    editButton.textContent = "Editar";
    editButton.addEventListener("click", () => fillForm(record));

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "icon-button danger-button";
    deleteButton.textContent = "Excluir";
    deleteButton.addEventListener("click", () => removeRecord(record.id));

    actionWrap.append(editButton, deleteButton);
    actionsCell.appendChild(actionWrap);
    elements.recordsBody.appendChild(row);
  });
}

async function loadRecords() {
  if (!state.activeMonthKey) {
    const today = new Date();
    state.activeMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  }

  const params = new URLSearchParams({
    search: elements.searchInput.value.trim(),
    month_key: state.activeMonthKey,
    sort_by: state.sortBy,
    sort_order: state.sortOrder,
  });

  const response = await fetch(`/api/records?${params.toString()}`);
  const data = await response.json();
  if (!response.ok) {
    alert(data.error || "Nao foi possivel carregar os registros.");
    return;
  }

  state.records = data.records || [];
  state.months = data.months || [];
  state.summary = data.summary || null;
  if (data.active_month?.month_key) {
    state.activeMonthKey = data.active_month.month_key;
  }

  renderMonthTabs();
  renderSummary();
  renderTable();
  resetForm();
}

function fillForm(record) {
  elements.formTitle.textContent = `Editando #${record.id}`;
  elements.recordId.value = record.id;
  elements.partnerName.value = record.partner_name || "";
  elements.transferenciaQty.value = record.transferencia_qty ?? 0;
  elements.cautelarQty.value = record.cautelar_qty ?? 0;
  elements.pesquisaQty.value = record.pesquisa_qty ?? 0;
  elements.unitTransferencia.value = record.unit_transferencia ?? 0;
  elements.unitCautelar.value = record.unit_cautelar ?? 0;
  elements.unitPesquisa.value = record.unit_pesquisa ?? 0;
  updateCalculatedTotal();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function saveRecord(event) {
  event.preventDefault();

  const payload = currentPayload();
  const recordId = elements.recordId.value;
  const method = recordId ? "PUT" : "POST";
  const url = recordId ? `/api/records/${recordId}` : "/api/records";

  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    alert(data.error || "Nao foi possivel salvar o registro.");
    return;
  }

  await loadRecords();
}

async function removeRecord(recordId) {
  const confirmed = window.confirm("Deseja realmente excluir este registro?");
  if (!confirmed) {
    return;
  }

  const response = await fetch(`/api/records/${recordId}`, { method: "DELETE" });
  const data = await response.json();
  if (!response.ok) {
    alert(data.error || "Nao foi possivel excluir o registro.");
    return;
  }

  await loadRecords();
}

function setupSorting() {
  document.querySelectorAll("th[data-sort]").forEach((header) => {
    header.addEventListener("click", async () => {
      const nextSort = header.dataset.sort;
      if (state.sortBy === nextSort) {
        state.sortOrder = state.sortOrder === "asc" ? "desc" : "asc";
      } else {
        state.sortBy = nextSort;
        state.sortOrder = "asc";
      }
      await loadRecords();
    });
  });
}

function setupEvents() {
  elements.form.addEventListener("submit", saveRecord);
  elements.cancelEditButton.addEventListener("click", resetForm);
  elements.refreshButton.addEventListener("click", loadRecords);
  elements.newRecordButton.addEventListener("click", resetForm);
  elements.searchInput.addEventListener("input", loadRecords);

  [
    elements.partnerName,
    elements.transferenciaQty,
    elements.cautelarQty,
    elements.pesquisaQty,
    elements.unitTransferencia,
    elements.unitCautelar,
    elements.unitPesquisa,
  ].forEach((input) => input.addEventListener("input", updateCalculatedTotal));
}

setupSorting();
setupEvents();
resetForm();
loadRecords();
