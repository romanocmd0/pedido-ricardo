const state = {
  records: [],
  months: [],
  activeMonthKey: "",
  sortBy: "partner_name",
  sortOrder: "asc",
  summary: null,
  editingRowId: null,
};

const elements = {
  monthTabs: document.querySelector("#month-tabs"),
  searchInput: document.querySelector("#search-input"),
  refreshButton: document.querySelector("#refresh-button"),
  exportXlsxButton: document.querySelector("#export-xlsx-button"),
  exportPdfButton: document.querySelector("#export-pdf-button"),
  newRecordButton: document.querySelector("#new-record-button"),
  recordsBody: document.querySelector("#records-body"),
  recordCount: document.querySelector("#record-count"),
  periodCount: document.querySelector("#period-count"),
  activeMonthTitle: document.querySelector("#active-month-title"),
  headerTotalValue: document.querySelector("#header-total-value"),
  summaryTotalValue: document.querySelector("#summary-total-value"),
  summaryTransferenciaQty: document.querySelector("#summary-transferencia-qty"),
  summaryTransferenciaPct: document.querySelector("#summary-transferencia-pct"),
  summaryComboTransferenciaQty: document.querySelector("#summary-combo-transferencia-qty"),
  summaryComboTransferenciaPct: document.querySelector("#summary-combo-transferencia-pct"),
  summaryCautelarQty: document.querySelector("#summary-cautelar-qty"),
  summaryCautelarPct: document.querySelector("#summary-cautelar-pct"),
  summaryPesquisaQty: document.querySelector("#summary-pesquisa-qty"),
  summaryPesquisaPct: document.querySelector("#summary-pesquisa-pct"),
  summaryTransferenciaTotalValue: document.querySelector("#summary-transferencia-total-value"),
  summaryComboTransferenciaTotalValue: document.querySelector("#summary-combo-transferencia-total-value"),
  summaryCautelarTotalValue: document.querySelector("#summary-cautelar-total-value"),
  summaryPesquisaTotalValue: document.querySelector("#summary-pesquisa-total-value"),
  formTitle: document.querySelector("#form-title"),
  formMonthCaption: document.querySelector("#form-month-caption"),
  form: document.querySelector("#record-form"),
  recordId: document.querySelector("#record-id"),
  partnerName: document.querySelector("#partner-name"),
  transferenciaQty: document.querySelector("#transferencia-qty"),
  comboTransferenciaQty: document.querySelector("#combo-transferencia-qty"),
  cautelarQty: document.querySelector("#cautelar-qty"),
  pesquisaQty: document.querySelector("#pesquisa-qty"),
  unitTransferencia: document.querySelector("#unit-transferencia"),
  unitComboTransferencia: document.querySelector("#unit-combo-transferencia"),
  unitCautelar: document.querySelector("#unit-cautelar"),
  unitPesquisa: document.querySelector("#unit-pesquisa"),
  calculatedTotal: document.querySelector("#calculated-total"),
  cancelEditButton: document.querySelector("#cancel-edit-button"),
};

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value || 0));
}

function formatPercent(value) {
  return `${Number(value || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}% do total de operacoes`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function currentPayload() {
  return {
    month_key: state.activeMonthKey,
    partner_name: elements.partnerName.value.trim(),
    transferencia_qty: Number(elements.transferenciaQty.value || 0),
    combo_transferencia_qty: Number(elements.comboTransferenciaQty.value || 0),
    cautelar_qty: Number(elements.cautelarQty.value || 0),
    pesquisa_qty: Number(elements.pesquisaQty.value || 0),
    unit_transferencia: Number(elements.unitTransferencia.value || 0),
    unit_combo_transferencia: Number(elements.unitComboTransferencia.value || 0),
    unit_cautelar: Number(elements.unitCautelar.value || 0),
    unit_pesquisa: Number(elements.unitPesquisa.value || 0),
  };
}

function recordPayloadFromInputs(row) {
  return {
    month_key: state.activeMonthKey,
    partner_name: row.querySelector('[data-field="partner_name"]').value.trim(),
    transferencia_qty: Number(row.querySelector('[data-field="transferencia_qty"]').value || 0),
    combo_transferencia_qty: Number(row.querySelector('[data-field="combo_transferencia_qty"]').value || 0),
    cautelar_qty: Number(row.querySelector('[data-field="cautelar_qty"]').value || 0),
    pesquisa_qty: Number(row.querySelector('[data-field="pesquisa_qty"]').value || 0),
    unit_transferencia: Number(row.querySelector('[data-field="unit_transferencia"]').value || 0),
    unit_combo_transferencia: Number(row.querySelector('[data-field="unit_combo_transferencia"]').value || 0),
    unit_cautelar: Number(row.querySelector('[data-field="unit_cautelar"]').value || 0),
    unit_pesquisa: Number(row.querySelector('[data-field="unit_pesquisa"]').value || 0),
  };
}

function calculateTotal(payload) {
  return (
    payload.transferencia_qty * payload.unit_transferencia +
    payload.combo_transferencia_qty * payload.unit_combo_transferencia +
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
  elements.comboTransferenciaQty.value = 0;
  elements.cautelarQty.value = 0;
  elements.pesquisaQty.value = 0;
  elements.unitTransferencia.value = 160;
  elements.unitComboTransferencia.value = 0;
  elements.unitCautelar.value = 240;
  elements.unitPesquisa.value = 80;
  elements.formMonthCaption.textContent = `Mes ativo: ${getActiveMonth()?.month_title || "-"}`;
  updateCalculatedTotal();
}

function renderMonthTabs() {
  elements.monthTabs.innerHTML = "";
  state.months.forEach((month) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `month-tab ${month.month_key === state.activeMonthKey ? "is-active" : ""}`;
    button.innerHTML = `<span>${month.month_title}</span><small>${month.record_count} registro(s)</small>`;
    button.addEventListener("click", async () => {
      if (state.activeMonthKey === month.month_key) return;
      state.activeMonthKey = month.month_key;
      state.editingRowId = null;
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
    combo_transferencia_qty: 0,
    cautelar_qty: 0,
    pesquisa_qty: 0,
    transferencia_pct: 0,
    combo_transferencia_pct: 0,
    cautelar_pct: 0,
    pesquisa_pct: 0,
    transferencia_total_value: 0,
    combo_transferencia_total_value: 0,
    cautelar_total_value: 0,
    pesquisa_total_value: 0,
    record_count: 0,
  };

  elements.activeMonthTitle.textContent = getActiveMonth()?.month_title || "Relatorio Mensal";
  elements.recordCount.textContent = String(summary.record_count || 0);
  elements.headerTotalValue.textContent = formatCurrency(summary.total_value);
  elements.summaryTotalValue.textContent = formatCurrency(summary.total_value);
  elements.summaryTransferenciaQty.textContent = String(summary.transferencia_qty || 0);
  elements.summaryTransferenciaPct.textContent = formatPercent(summary.transferencia_pct);
  elements.summaryComboTransferenciaQty.textContent = String(summary.combo_transferencia_qty || 0);
  elements.summaryComboTransferenciaPct.textContent = formatPercent(summary.combo_transferencia_pct);
  elements.summaryCautelarQty.textContent = String(summary.cautelar_qty || 0);
  elements.summaryCautelarPct.textContent = formatPercent(summary.cautelar_pct);
  elements.summaryPesquisaQty.textContent = String(summary.pesquisa_qty || 0);
  elements.summaryPesquisaPct.textContent = formatPercent(summary.pesquisa_pct);
  elements.summaryTransferenciaTotalValue.textContent = formatCurrency(summary.transferencia_total_value);
  elements.summaryComboTransferenciaTotalValue.textContent = formatCurrency(summary.combo_transferencia_total_value);
  elements.summaryCautelarTotalValue.textContent = formatCurrency(summary.cautelar_total_value);
  elements.summaryPesquisaTotalValue.textContent = formatCurrency(summary.pesquisa_total_value);
}

function renderReadonlyCell(value, field, isCurrency = false) {
  const display = isCurrency ? formatCurrency(value) : escapeHtml(value);
  return `<td class="editable-cell" data-start-edit="${field}">${display}</td>`;
}

function renderEditableCell(value, field, type = "number", step = "1") {
  const safeValue = value ?? 0;
  const inputType = field === "partner_name" ? "text" : type;
  return `
    <td class="editing-cell">
      <input class="inline-input" data-field="${field}" type="${inputType}" ${inputType === "number" ? `min="0" step="${step}"` : ""} value="${escapeHtml(safeValue)}" />
    </td>
  `;
}

function recordPayloadFromInlineRecord(record) {
  return {
    month_key: state.activeMonthKey,
    partner_name: record.partner_name,
    transferencia_qty: Number(record.transferencia_qty || 0),
    combo_transferencia_qty: Number(record.combo_transferencia_qty || 0),
    cautelar_qty: Number(record.cautelar_qty || 0),
    pesquisa_qty: Number(record.pesquisa_qty || 0),
    unit_transferencia: Number(record.unit_transferencia || 0),
    unit_combo_transferencia: Number(record.unit_combo_transferencia || 0),
    unit_cautelar: Number(record.unit_cautelar || 0),
    unit_pesquisa: Number(record.unit_pesquisa || 0),
  };
}

function attachInlineEditing(rowElement, record) {
  rowElement.querySelectorAll("[data-start-edit]").forEach((cell) => {
    cell.addEventListener("click", () => {
      state.editingRowId = record.id;
      renderTable();
      elements.recordsBody.querySelector(`tr[data-row-id="${record.id}"]`)?.querySelector(".inline-input")?.focus();
    });
  });
}

async function saveInlineRow(rowElement, recordId) {
  const response = await fetch(`/api/records/${recordId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(recordPayloadFromInputs(rowElement)),
  });
  const data = await response.json();
  if (!response.ok) {
    alert(data.error || "Nao foi possivel salvar a linha.");
    return false;
  }
  state.editingRowId = null;
  await loadRecords();
  return true;
}

function attachEditingEvents(rowElement, recordId) {
  const inputs = rowElement.querySelectorAll(".inline-input");
  let isSaving = false;
  const totalCell = rowElement.querySelector(".inline-total");

  const saveIfNeeded = async () => {
    if (isSaving) return;
    isSaving = true;
    await saveInlineRow(rowElement, recordId);
    isSaving = false;
  };

  const refreshInlineTotal = () => {
    if (totalCell) totalCell.textContent = formatCurrency(calculateTotal(recordPayloadFromInputs(rowElement)));
  };

  inputs.forEach((input) => {
    input.addEventListener("input", refreshInlineTotal);
    input.addEventListener("keydown", async (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        await saveIfNeeded();
      }
      if (event.key === "Escape") {
        state.editingRowId = null;
        renderTable();
      }
    });
    input.addEventListener("blur", () => {
      setTimeout(async () => {
        if (!rowElement.contains(document.activeElement)) await saveIfNeeded();
      }, 0);
    });
  });
  refreshInlineTotal();
}

function renderTable() {
  if (!state.records.length) {
    elements.recordsBody.innerHTML = '<tr><td colspan="11" class="empty-state">Nenhum registro encontrado para este mes.</td></tr>';
    return;
  }

  elements.recordsBody.innerHTML = "";
  state.records.forEach((record) => {
    const isEditing = state.editingRowId === record.id;
    const row = document.createElement("tr");
    row.dataset.rowId = String(record.id);

    if (isEditing) {
      row.className = "editing-row";
      row.innerHTML = `
        ${renderEditableCell(record.partner_name, "partner_name", "text")}
        ${renderEditableCell(record.transferencia_qty, "transferencia_qty")}
        ${renderEditableCell(record.combo_transferencia_qty, "combo_transferencia_qty")}
        ${renderEditableCell(record.cautelar_qty, "cautelar_qty")}
        ${renderEditableCell(record.pesquisa_qty, "pesquisa_qty")}
        ${renderEditableCell(record.unit_transferencia, "unit_transferencia", "number", "0.01")}
        ${renderEditableCell(record.unit_combo_transferencia, "unit_combo_transferencia", "number", "0.01")}
        ${renderEditableCell(record.unit_cautelar, "unit_cautelar", "number", "0.01")}
        ${renderEditableCell(record.unit_pesquisa, "unit_pesquisa", "number", "0.01")}
        <td class="inline-total">${formatCurrency(calculateTotal(recordPayloadFromInlineRecord(record)))}</td>
        <td></td>
      `;
    } else {
      row.innerHTML = `
        ${renderReadonlyCell(record.partner_name, "partner_name")}
        ${renderReadonlyCell(record.transferencia_qty, "transferencia_qty")}
        ${renderReadonlyCell(record.combo_transferencia_qty, "combo_transferencia_qty")}
        ${renderReadonlyCell(record.cautelar_qty, "cautelar_qty")}
        ${renderReadonlyCell(record.pesquisa_qty, "pesquisa_qty")}
        ${renderReadonlyCell(record.unit_transferencia, "unit_transferencia", true)}
        ${renderReadonlyCell(record.unit_combo_transferencia, "unit_combo_transferencia", true)}
        ${renderReadonlyCell(record.unit_cautelar, "unit_cautelar", true)}
        ${renderReadonlyCell(record.unit_pesquisa, "unit_pesquisa", true)}
        <td class="editable-cell total-cell" data-start-edit="total_value">${formatCurrency(record.total_value)}</td>
        <td></td>
      `;
    }

    const actionsCell = row.querySelector("td:last-child");
    const actionWrap = document.createElement("div");
    actionWrap.className = "actions";
    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "icon-button danger-button";
    deleteButton.textContent = "Excluir";
    deleteButton.addEventListener("click", () => removeRecord(record.id));
    actionWrap.append(deleteButton);
    actionsCell.appendChild(actionWrap);
    elements.recordsBody.appendChild(row);

    if (isEditing) attachEditingEvents(row, record.id);
    else attachInlineEditing(row, record);
  });
}

async function loadRecords() {
  if (!state.activeMonthKey) state.activeMonthKey = "2026-04";

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
  if (data.active_month?.month_key) state.activeMonthKey = data.active_month.month_key;

  renderMonthTabs();
  renderSummary();
  renderTable();
  resetForm();
}

async function saveRecord(event) {
  event.preventDefault();
  const recordId = elements.recordId.value;
  const response = await fetch(recordId ? `/api/records/${recordId}` : "/api/records", {
    method: recordId ? "PUT" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(currentPayload()),
  });
  const data = await response.json();
  if (!response.ok) {
    alert(data.error || "Nao foi possivel salvar o registro.");
    return;
  }
  await loadRecords();
}

async function removeRecord(recordId) {
  if (!window.confirm("Deseja realmente excluir este registro?")) return;
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
      if (state.sortBy === nextSort) state.sortOrder = state.sortOrder === "asc" ? "desc" : "asc";
      else {
        state.sortBy = nextSort;
        state.sortOrder = "asc";
      }
      await loadRecords();
    });
  });
}

function downloadExport(type) {
  if (!state.activeMonthKey) return;
  window.open(`/api/export/${state.activeMonthKey}.${type}`, "_blank");
}

function setupEvents() {
  elements.form.addEventListener("submit", saveRecord);
  elements.cancelEditButton.addEventListener("click", resetForm);
  elements.refreshButton.addEventListener("click", loadRecords);
  elements.newRecordButton.addEventListener("click", resetForm);
  elements.searchInput.addEventListener("input", loadRecords);
  elements.exportXlsxButton.addEventListener("click", () => downloadExport("xlsx"));
  elements.exportPdfButton.addEventListener("click", () => downloadExport("pdf"));

  [
    elements.partnerName,
    elements.transferenciaQty,
    elements.comboTransferenciaQty,
    elements.cautelarQty,
    elements.pesquisaQty,
    elements.unitTransferencia,
    elements.unitComboTransferencia,
    elements.unitCautelar,
    elements.unitPesquisa,
  ].forEach((input) => input.addEventListener("input", updateCalculatedTotal));
}

setupSorting();
setupEvents();
resetForm();
loadRecords();
