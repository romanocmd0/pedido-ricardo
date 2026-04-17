const state = {
  records: [],
  periods: [],
  sortBy: "partner_name",
  sortOrder: "asc",
};

const elements = {
  searchInput: document.querySelector("#search-input"),
  periodFilter: document.querySelector("#period-filter"),
  refreshButton: document.querySelector("#refresh-button"),
  newRecordButton: document.querySelector("#new-record-button"),
  recordsBody: document.querySelector("#records-body"),
  recordCount: document.querySelector("#record-count"),
  periodCount: document.querySelector("#period-count"),
  formTitle: document.querySelector("#form-title"),
  form: document.querySelector("#record-form"),
  recordId: document.querySelector("#record-id"),
  referenceDate: document.querySelector("#reference-date"),
  periodLabel: document.querySelector("#period-label"),
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

function formatDate(dateString) {
  if (!dateString) {
    return "Histórico";
  }

  const [year, month, day] = dateString.split("-");
  return `${day}/${month}/${year}`;
}

function currentPayload() {
  return {
    reference_date: elements.referenceDate.value || null,
    period_label: elements.periodLabel.value.trim(),
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
  updateCalculatedTotal();
}

function populatePeriods() {
  const currentValue = elements.periodFilter.value;
  elements.periodFilter.innerHTML = '<option value="">Todos</option>';

  state.periods.forEach((period) => {
    const option = document.createElement("option");
    option.value = period;
    option.textContent = period;
    if (period === currentValue) {
      option.selected = true;
    }
    elements.periodFilter.appendChild(option);
  });

  elements.periodCount.textContent = state.periods.length;
}

function renderTable() {
  if (!state.records.length) {
    elements.recordsBody.innerHTML =
      '<tr><td colspan="11" class="empty-state">Nenhum registro encontrado para os filtros atuais.</td></tr>';
    elements.recordCount.textContent = "0";
    return;
  }

  elements.recordsBody.innerHTML = "";
  state.records.forEach((record) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${formatDate(record.reference_date)}</td>
      <td>${record.period_label}</td>
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
    editButton.className = "icon-button edit-button";
    editButton.textContent = "Editar";
    editButton.addEventListener("click", () => fillForm(record));

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "icon-button danger-button delete-button";
    deleteButton.textContent = "Excluir";
    deleteButton.addEventListener("click", () => removeRecord(record.id));

    actionWrap.append(editButton, deleteButton);
    actionsCell.appendChild(actionWrap);
    elements.recordsBody.appendChild(row);
  });

  elements.recordCount.textContent = String(state.records.length);
}

async function loadRecords() {
  const params = new URLSearchParams({
    search: elements.searchInput.value.trim(),
    period: elements.periodFilter.value,
    sort_by: state.sortBy,
    sort_order: state.sortOrder,
  });

  const response = await fetch(`/api/records?${params.toString()}`);
  const data = await response.json();
  state.records = data.records;
  state.periods = data.periods;
  populatePeriods();
  renderTable();
}

function fillForm(record) {
  elements.formTitle.textContent = `Editando #${record.id}`;
  elements.recordId.value = record.id;
  elements.referenceDate.value = record.reference_date || "";
  elements.periodLabel.value = record.period_label || "";
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
    alert(data.error || "Não foi possível salvar o registro.");
    return;
  }

  resetForm();
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
    alert(data.error || "Não foi possível excluir o registro.");
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
  elements.periodFilter.addEventListener("change", loadRecords);

  [
    elements.referenceDate,
    elements.periodLabel,
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
