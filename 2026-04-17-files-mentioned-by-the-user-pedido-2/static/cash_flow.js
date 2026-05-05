const cashState = {
  activeDate: new Date().toISOString().slice(0, 10),
  entries: [],
  day: null,
  clientNames: [],
  clients: [],
};

const cashElements = {
  dateInput: document.querySelector("#cash-date-input"),
  openButton: document.querySelector("#open-cash-day-button"),
  tree: document.querySelector("#cash-tree"),
  title: document.querySelector("#cash-day-title"),
  result: document.querySelector("#cash-result"),
  status: document.querySelector("#cash-status"),
  exportPdfButton: document.querySelector("#export-cash-pdf-button"),
  exportMonthPdfButton: document.querySelector("#export-cash-month-pdf-button"),
  finalizeButton: document.querySelector("#finalize-cash-button"),
  reopenButton: document.querySelector("#reopen-cash-button"),
  deleteDayButton: document.querySelector("#delete-cash-day-button"),
  form: document.querySelector("#cash-entry-form"),
  partnerPaymentForm: document.querySelector("#partner-payment-form"),
  clientRegistrationForm: document.querySelector("#client-registration-form"),
  entryId: document.querySelector("#cash-entry-id"),
  customerName: document.querySelector("#cash-customer-name"),
  plate: document.querySelector("#cash-plate"),
  plateHelp: document.querySelector("#cash-plate-help"),
  serviceName: document.querySelector("#cash-service-name"),
  amount: document.querySelector("#cash-amount"),
  paymentMethod: document.querySelector("#cash-payment-method"),
  flowType: document.querySelector("#cash-flow-type"),
  saveButton: document.querySelector("#save-cash-entry-button"),
  clearButton: document.querySelector("#clear-cash-form-button"),
  partnerPaymentName: document.querySelector("#partner-payment-name"),
  partnerPaymentDescription: document.querySelector("#partner-payment-description"),
  partnerPaymentAmount: document.querySelector("#partner-payment-amount"),
  clientRegistrationId: document.querySelector("#client-registration-id"),
  clientRegistrationName: document.querySelector("#client-registration-name"),
  clientRegistrationSubmit: document.querySelector("#client-registration-submit"),
  clientRegistrationClear: document.querySelector("#client-registration-clear"),
  clientPriceTransferencia: document.querySelector("#client-price-transferencia"),
  clientPriceCaminhaoTransferencia: document.querySelector("#client-price-caminhao-transferencia"),
  clientPriceComboTransferencia: document.querySelector("#client-price-combo-transferencia"),
  clientPriceCautelar: document.querySelector("#client-price-cautelar"),
  clientPricePesquisa: document.querySelector("#client-price-pesquisa"),
  clientPriceDiversos: document.querySelector("#client-price-diversos"),
  clientSuggestions: document.querySelector("#client-name-suggestions"),
  clientRegistrationBody: document.querySelector("#client-registration-body"),
  body: document.querySelector("#cash-entries-body"),
  dinheiro: document.querySelector("#cash-total-dinheiro"),
  debito: document.querySelector("#cash-total-debito"),
  credito: document.querySelector("#cash-total-credito"),
  pix: document.querySelector("#cash-total-pix"),
  outras: document.querySelector("#cash-total-outras"),
  vaultBalance: document.querySelector("#cash-vault-balance"),
  totalIn: document.querySelector("#cash-total-in"),
  totalOut: document.querySelector("#cash-total-out"),
  totalDeposit: document.querySelector("#cash-total-deposit"),
  totalPartnerPayment: document.querySelector("#cash-total-partner-payment"),
};

const cashPageMode = {
  hasEntryForm: Boolean(cashElements.form),
  hasPartnerPaymentForm: Boolean(cashElements.partnerPaymentForm),
  hasTree: Boolean(cashElements.tree),
  hasClientRegistration: Boolean(cashElements.clientRegistrationForm),
};

const servicePriceFieldMap = {
  Transferencia: "price_transferencia",
  "Transf. de Caminhao": "price_caminhao_transferencia",
  "Transf. do Combo": "price_combo_transferencia",
  Cautelar: "price_cautelar",
  Pesquisa: "price_pesquisa",
  Diversos: "price_diversos",
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

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

function normalizePlate(value) {
  const raw = String(value ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (raw.length <= 3) return raw;
  return `${raw.slice(0, 3)}-${raw.slice(3, 7)}`;
}

function isValidPlate(value) {
  return /^[A-Z0-9]{3}-[A-Z0-9]{4}$/.test(String(value || "").toUpperCase());
}

function findClientByName(name) {
  const normalized = normalizeText(name);
  return cashState.clients.find((client) => normalizeText(client.client_name) === normalized) || null;
}

function currentPayload() {
  return {
    customer_name: cashElements.customerName.value.trim(),
    plate: cashElements.plate.value.trim().toUpperCase(),
    service_name: cashElements.serviceName.value.trim(),
    amount: Number(cashElements.amount.value || 0),
    payment_method: cashElements.paymentMethod.value.trim(),
    flow_type: cashElements.flowType.value,
  };
}

function partnerPaymentPayload() {
  const description = cashElements.partnerPaymentDescription.value.trim();
  return {
    customer_name: cashElements.partnerPaymentName.value.trim(),
    plate: description,
    service_name: "Pagamento Parceiros",
    amount: Number(cashElements.partnerPaymentAmount.value || 0),
    payment_method: "Pagamento Parceiros",
    flow_type: "pagamento_parceiros",
  };
}

function currentClientRegistrationPayload() {
  return {
    client_name: cashElements.clientRegistrationName.value.trim(),
    price_transferencia: Number(cashElements.clientPriceTransferencia.value || 0),
    price_caminhao_transferencia: Number(cashElements.clientPriceCaminhaoTransferencia.value || 0),
    price_combo_transferencia: Number(cashElements.clientPriceComboTransferencia.value || 0),
    price_cautelar: Number(cashElements.clientPriceCautelar.value || 0),
    price_pesquisa: Number(cashElements.clientPricePesquisa.value || 0),
    price_diversos: Number(cashElements.clientPriceDiversos.value || 0),
  };
}

function syncDateInput() {
  if (cashElements.dateInput) cashElements.dateInput.value = cashState.activeDate;
}

function renderClientSuggestions(clients) {
  if (!cashElements.clientSuggestions) return;
  cashElements.clientSuggestions.innerHTML = "";
  (clients || []).forEach((client) => {
    const option = document.createElement("option");
    option.value = client;
    cashElements.clientSuggestions.appendChild(option);
  });
}

function applyClientCatalog(clients, items) {
  cashState.clientNames = clients || [];
  cashState.clients = items || [];
  renderClientSuggestions(cashState.clientNames);
  renderClientTable();
}

function renderClientTable() {
  if (!cashElements.clientRegistrationBody) return;
  if (!cashState.clients.length) {
    cashElements.clientRegistrationBody.innerHTML =
      '<tr><td colspan="8" class="empty-state">Nenhum cliente cadastrado ainda.</td></tr>';
    return;
  }

  cashElements.clientRegistrationBody.innerHTML = "";
  cashState.clients.forEach((client) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${escapeHtml(client.client_name)}</td>
      <td>${formatCurrency(client.price_transferencia)}</td>
      <td>${formatCurrency(client.price_caminhao_transferencia)}</td>
      <td>${formatCurrency(client.price_combo_transferencia)}</td>
      <td>${formatCurrency(client.price_cautelar)}</td>
      <td>${formatCurrency(client.price_pesquisa)}</td>
      <td>${formatCurrency(client.price_diversos)}</td>
      <td></td>
    `;
    const actions = document.createElement("div");
    actions.className = "actions";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "icon-button";
    editButton.textContent = "Editar";
    editButton.addEventListener("click", () => {
      fillClientRegistrationForm(client);
      cashElements.clientRegistrationName?.focus();
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "icon-button danger-button";
    deleteButton.textContent = "Excluir";
    deleteButton.addEventListener("click", () => deleteClientRegistration(client.id));

    actions.append(editButton, deleteButton);
    row.querySelector("td:last-child").appendChild(actions);
    cashElements.clientRegistrationBody.appendChild(row);
  });
}

async function loadClientSuggestions() {
  if (!cashElements.clientSuggestions && !cashElements.clientRegistrationForm) return;
  const response = await fetch("/api/clients");
  const data = await response.json();
  if (!response.ok) {
    alert(data.error || "Nao foi possivel carregar os clientes cadastrados.");
    return;
  }
  applyClientCatalog(data.clients || [], data.items || []);
}

function setFieldEnabled(field, enabled) {
  if (!field) return;
  field.disabled = !enabled;
}

function updatePlateState() {
  if (!cashElements.plate || !cashElements.plateHelp) return false;
  const hasValue = Boolean(cashElements.plate.value.trim());
  const valid = isValidPlate(cashElements.plate.value);
  cashElements.plateHelp.textContent = !hasValue
    ? "Use o formato XXX-XXXX."
    : valid
      ? "Placa valida."
      : "Formato invalido. Use 3 caracteres, hifen e 4 caracteres.";
  cashElements.plateHelp.classList.toggle("field-help-error", hasValue && !valid);
  cashElements.plateHelp.classList.toggle("field-help-success", hasValue && valid);
  return valid;
}

function updateAutoAmount() {
  if (!cashPageMode.hasEntryForm) return;
  const client = findClientByName(cashElements.customerName.value);
  const service = cashElements.serviceName.value;
  if (!client || !service) {
    cashElements.amount.value = "";
    return;
  }
  const fieldName = servicePriceFieldMap[service];
  cashElements.amount.value = fieldName ? Number(client[fieldName] || 0).toFixed(2) : "0.00";
}

function updateGuidedFlow() {
  if (!cashPageMode.hasEntryForm) return;
  const hasDate = Boolean(cashElements.dateInput?.value);
  const client = findClientByName(cashElements.customerName.value);
  const hasClient = Boolean(client);
  const plateValid = updatePlateState();
  const hasService = Boolean(cashElements.serviceName.value);
  const hasAmount = Number(cashElements.amount.value || 0) >= 0 && cashElements.amount.value !== "";
  const hasPayment = Boolean(cashElements.paymentMethod.value);
  const hasType = Boolean(cashElements.flowType.value);

  setFieldEnabled(cashElements.customerName, hasDate);
  setFieldEnabled(cashElements.plate, hasDate && hasClient);
  setFieldEnabled(cashElements.serviceName, hasDate && hasClient && plateValid);
  setFieldEnabled(cashElements.amount, hasDate && hasClient && plateValid && hasService);
  setFieldEnabled(cashElements.paymentMethod, hasDate && hasClient && plateValid && hasService && hasAmount);
  setFieldEnabled(cashElements.flowType, hasDate && hasClient && plateValid && hasService && hasAmount && hasPayment);
  setFieldEnabled(cashElements.saveButton, hasDate && hasClient && plateValid && hasService && hasAmount && hasPayment && hasType);
}

function resetCashForm() {
  if (!cashElements.form) return;
  cashElements.form.reset();
  cashElements.entryId.value = "";
  cashElements.amount.value = "";
  updateGuidedFlow();
}

function resetPartnerPaymentForm() {
  if (!cashElements.partnerPaymentForm) return;
  cashElements.partnerPaymentForm.reset();
}

function resetClientRegistrationForm() {
  if (!cashElements.clientRegistrationForm) return;
  cashElements.clientRegistrationForm.reset();
  if (cashElements.clientRegistrationId) cashElements.clientRegistrationId.value = "";
  if (cashElements.clientRegistrationSubmit) cashElements.clientRegistrationSubmit.textContent = "Cadastrar cliente";
}

function clearClientRegistrationPrices() {
  cashElements.clientRegistrationId.value = "";
  cashElements.clientPriceTransferencia.value = 0;
  cashElements.clientPriceCaminhaoTransferencia.value = 0;
  cashElements.clientPriceComboTransferencia.value = 0;
  cashElements.clientPriceCautelar.value = 0;
  cashElements.clientPricePesquisa.value = 0;
  cashElements.clientPriceDiversos.value = 0;
  if (cashElements.clientRegistrationSubmit) cashElements.clientRegistrationSubmit.textContent = "Cadastrar cliente";
}

function fillClientRegistrationForm(client) {
  if (!cashElements.clientRegistrationForm || !client) return;
  cashElements.clientRegistrationId.value = client.id;
  cashElements.clientRegistrationName.value = client.client_name;
  cashElements.clientPriceTransferencia.value = Number(client.price_transferencia || 0);
  cashElements.clientPriceCaminhaoTransferencia.value = Number(client.price_caminhao_transferencia || 0);
  cashElements.clientPriceComboTransferencia.value = Number(client.price_combo_transferencia || 0);
  cashElements.clientPriceCautelar.value = Number(client.price_cautelar || 0);
  cashElements.clientPricePesquisa.value = Number(client.price_pesquisa || 0);
  cashElements.clientPriceDiversos.value = Number(client.price_diversos || 0);
  if (cashElements.clientRegistrationSubmit) cashElements.clientRegistrationSubmit.textContent = "Atualizar cliente";
}

function setSelectValue(select, value) {
  if (!select) return;
  const rawValue = String(value || "");
  const option = Array.from(select.options).find((item) => item.value.toLowerCase() === rawValue.toLowerCase());
  if (option) {
    select.value = option.value;
    return;
  }
  if (rawValue) {
    const legacyOption = new Option(rawValue, rawValue, true, true);
    select.add(legacyOption);
  } else {
    select.value = "";
  }
}

function renderSummary(summary) {
  const titlePrefix = cashElements.title?.dataset.prefix || "Caixa de";
  if (cashElements.title) cashElements.title.textContent = `${titlePrefix} ${summary.display_date}`.trim();
  if (cashElements.result) cashElements.result.textContent = formatCurrency(summary.result);
  if (cashElements.dinheiro) cashElements.dinheiro.textContent = formatCurrency(summary.payment_totals.dinheiro);
  if (cashElements.debito) cashElements.debito.textContent = formatCurrency(summary.payment_totals.cartao_debito);
  if (cashElements.credito) cashElements.credito.textContent = formatCurrency(summary.payment_totals.cartao_credito);
  if (cashElements.pix) cashElements.pix.textContent = formatCurrency(summary.payment_totals.pix);
  if (cashElements.outras) cashElements.outras.textContent = formatCurrency(summary.payment_totals.outras);
  if (cashElements.vaultBalance) cashElements.vaultBalance.textContent = formatCurrency(summary.vault_balance);
  if (cashElements.totalIn) cashElements.totalIn.textContent = formatCurrency(summary.total_in);
  if (cashElements.totalOut) cashElements.totalOut.textContent = formatCurrency(summary.total_out);
  if (cashElements.totalDeposit) cashElements.totalDeposit.textContent = formatCurrency(summary.total_deposit);
  if (cashElements.totalPartnerPayment) cashElements.totalPartnerPayment.textContent = formatCurrency(summary.total_partner_payment);
}

function renderDeletedCashDay() {
  cashState.day = null;
  cashState.entries = [];
  if (cashElements.title) cashElements.title.textContent = "Caixa excluido";
  if (cashElements.result) cashElements.result.textContent = formatCurrency(0);
  if (cashElements.status) cashElements.status.textContent = "Excluido";
  renderSummary({
    display_date: cashState.activeDate.split("-").reverse().join("/"),
    result: 0,
    payment_totals: { dinheiro: 0, cartao_debito: 0, cartao_credito: 0, pix: 0, outras: 0 },
    vault_balance: 0,
    total_in: 0,
    total_out: 0,
    total_deposit: 0,
    total_partner_payment: 0,
  });
  if (cashElements.body) {
    cashElements.body.innerHTML =
      '<tr><td colspan="7" class="empty-state">Caixa excluido. Escolha uma data no arquivo ou abra um novo caixa.</td></tr>';
  }
}

function renderEntries() {
  if (!cashElements.body) return;
  if (!cashState.entries.length) {
    cashElements.body.innerHTML = '<tr><td colspan="7" class="empty-state">Nenhum lancamento neste dia.</td></tr>';
    return;
  }

  cashElements.body.innerHTML = "";
  cashState.entries.forEach((entry) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${escapeHtml(entry.customer_name)}</td>
      <td>${escapeHtml(entry.plate)}</td>
      <td>${escapeHtml(entry.service_name)}</td>
      <td>${formatCurrency(entry.amount)}</td>
      <td>${escapeHtml(entry.payment_method)}</td>
      <td>${entry.flow_type === "pagamento_parceiros" ? "Pagamento Parceiros" : entry.flow_type === "deposito" ? "Deposito" : entry.flow_type === "saida" ? "Saida" : "Entrada"}</td>
      <td></td>
    `;
    const actions = document.createElement("div");
    actions.className = "actions";
    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "icon-button danger-button";
    deleteButton.textContent = "Excluir";
    deleteButton.addEventListener("click", () => deleteEntry(entry.id));
    if (cashPageMode.hasEntryForm && entry.flow_type !== "pagamento_parceiros") {
      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.className = "icon-button";
      editButton.textContent = "Editar";
      editButton.addEventListener("click", () => editEntry(entry));
      actions.append(editButton);
    }
    actions.append(deleteButton);
    row.querySelector("td:last-child").appendChild(actions);
    cashElements.body.appendChild(row);
  });
}

function renderTree(tree) {
  if (!cashElements.tree) return;
  if (!tree.length) {
    cashElements.tree.innerHTML = '<div class="empty-state">Nenhum caixa criado ainda.</div>';
    return;
  }

  cashElements.tree.innerHTML = tree
    .map(
      (year) => `
        <details class="cash-tree-node" open>
          <summary>${year.year}</summary>
          ${year.months
            .map(
              (month) => `
                <details class="cash-tree-node">
                  <summary>${month.month_title}</summary>
                  <div class="cash-day-list">
                    ${month.days
                      .map(
                        (day) => `
                          <button class="cash-day-button ${day.cash_date === cashState.activeDate ? "is-active" : ""}" type="button" data-date="${day.cash_date}">
                            <span>${day.display_date}</span>
                            <small>${day.entry_count} lanc. | ${formatCurrency(day.result_value)} ${day.finalized ? "| finalizado" : "| aberto"}</small>
                          </button>
                        `,
                      )
                      .join("")}
                  </div>
                </details>
              `,
            )
            .join("")}
        </details>
      `,
    )
    .join("");

  cashElements.tree.querySelectorAll("[data-date]").forEach((button) => {
    button.addEventListener("click", async () => {
      cashState.activeDate = button.dataset.date;
      syncDateInput();
      await loadDay();
    });
  });
}

function editEntry(entry) {
  if (!cashPageMode.hasEntryForm) return;
  cashElements.entryId.value = entry.id;
  cashElements.customerName.value = entry.customer_name;
  cashElements.plate.value = normalizePlate(entry.plate || "");
  setSelectValue(cashElements.serviceName, entry.service_name);
  setSelectValue(cashElements.paymentMethod, entry.payment_method);
  setSelectValue(cashElements.flowType, entry.flow_type);
  updateAutoAmount();
  if (!cashElements.amount.value) {
    cashElements.amount.value = Number(entry.amount || 0).toFixed(2);
  }
  updateGuidedFlow();
  cashElements.customerName.focus();
}

async function loadTree() {
  if (!cashPageMode.hasTree) return;
  const response = await fetch("/api/cash-flow/tree");
  const data = await response.json();
  if (!response.ok) {
    alert(data.error || "Nao foi possivel carregar o arquivo do caixa.");
    return;
  }
  renderTree(data.tree || []);
}

async function loadDay() {
  const response = await fetch(`/api/cash-flow/day/${cashState.activeDate}`);
  const data = await response.json();
  if (!response.ok) {
    alert(data.error || "Nao foi possivel carregar o caixa do dia.");
    return;
  }
  cashState.day = data.day;
  cashState.entries = data.entries || [];
  if (cashElements.status) cashElements.status.textContent = data.day.finalized ? "Finalizado" : "Aberto";
  renderSummary(data.summary);
  renderEntries();
  updateGuidedFlow();
  await loadTree();
}

async function saveEntry(event) {
  if (!cashPageMode.hasEntryForm) return;
  event.preventDefault();
  if (!isValidPlate(cashElements.plate.value)) {
    updateGuidedFlow();
    alert("A placa precisa seguir o formato XXX-XXXX.");
    return;
  }
  const entryId = cashElements.entryId.value;
  const response = await fetch(entryId ? `/api/cash-flow/entries/${entryId}` : `/api/cash-flow/day/${cashState.activeDate}/entries`, {
    method: entryId ? "PUT" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(currentPayload()),
  });
  const data = await response.json();
  if (!response.ok) {
    alert(data.error || "Nao foi possivel salvar o lancamento.");
    return;
  }
  resetCashForm();
  await loadDay();
}

async function savePartnerPayment(event) {
  if (!cashElements.partnerPaymentForm) return;
  event.preventDefault();
  const response = await fetch(`/api/cash-flow/day/${cashState.activeDate}/entries`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(partnerPaymentPayload()),
  });
  const data = await response.json();
  if (!response.ok) {
    alert(data.error || "Nao foi possivel salvar o Pagamento Parceiros.");
    return;
  }
  resetPartnerPaymentForm();
  await loadDay();
}

async function saveClientRegistration(event) {
  if (!cashPageMode.hasClientRegistration) return;
  event.preventDefault();
  const clientId = cashElements.clientRegistrationId.value;
  const payload = currentClientRegistrationPayload();
  const response = await fetch(clientId ? `/api/clients/${clientId}` : "/api/clients", {
    method: clientId ? "PUT" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) {
    alert(data.error || "Nao foi possivel salvar o cliente.");
    return;
  }
  applyClientCatalog(data.clients || [], data.items || []);
  resetClientRegistrationForm();
  updateGuidedFlow();
}

async function deleteClientRegistration(clientId) {
  if (!window.confirm("Tem certeza que deseja excluir este cliente?")) return;
  const response = await fetch(`/api/clients/${clientId}`, { method: "DELETE" });
  const data = await response.json();
  if (!response.ok) {
    alert(data.error || "Nao foi possivel excluir o cliente.");
    return;
  }
  applyClientCatalog(data.clients || [], data.items || []);
  if (String(cashElements.clientRegistrationId?.value || "") === String(clientId)) {
    resetClientRegistrationForm();
  }
  updateGuidedFlow();
}

async function deleteEntry(entryId) {
  if (!window.confirm("Deseja excluir este lancamento?")) return;
  const response = await fetch(`/api/cash-flow/entries/${entryId}`, { method: "DELETE" });
  const data = await response.json();
  if (!response.ok) {
    alert(data.error || "Nao foi possivel excluir o lancamento.");
    return;
  }
  await loadDay();
}

async function deleteCashDay() {
  if (!window.confirm("Tem certeza que deseja excluir este caixa?")) return;
  const response = await fetch(`/api/cash-flow/day/${cashState.activeDate}`, { method: "DELETE" });
  const data = await response.json();
  if (!response.ok) {
    alert(data.error || "Nao foi possivel excluir o caixa.");
    return;
  }

  resetCashForm();
  renderDeletedCashDay();
  await loadTree();
}

async function setFinalized(finalized) {
  const endpoint = finalized ? "finalize" : "reopen";
  const response = await fetch(`/api/cash-flow/day/${cashState.activeDate}/${endpoint}`, { method: "POST" });
  const data = await response.json();
  if (!response.ok) {
    alert(data.error || "Nao foi possivel atualizar o status do caixa.");
    return;
  }
  cashState.day = data.day;
  cashState.entries = data.entries || [];
  if (cashElements.status) cashElements.status.textContent = data.day.finalized ? "Finalizado" : "Aberto";
  renderSummary(data.summary);
  renderEntries();
  await loadTree();
}

function handleClientRegistrationLookup() {
  const client = findClientByName(cashElements.clientRegistrationName?.value);
  if (client) fillClientRegistrationForm(client);
  else clearClientRegistrationPrices();
  if (cashElements.clientRegistrationName) cashElements.clientRegistrationName.value = cashElements.clientRegistrationName.value.trim();
}

function setupGuidedFormEvents() {
  if (!cashPageMode.hasEntryForm) return;
  cashElements.customerName.addEventListener("change", () => {
    updateAutoAmount();
    updateGuidedFlow();
  });
  cashElements.customerName.addEventListener("blur", () => {
    updateAutoAmount();
    updateGuidedFlow();
  });
  cashElements.plate.addEventListener("input", () => {
    cashElements.plate.value = normalizePlate(cashElements.plate.value);
    updateGuidedFlow();
  });
  cashElements.serviceName.addEventListener("change", () => {
    updateAutoAmount();
    updateGuidedFlow();
  });
  cashElements.paymentMethod.addEventListener("change", updateGuidedFlow);
  cashElements.flowType.addEventListener("change", updateGuidedFlow);
}

function setupEvents() {
  cashElements.openButton?.addEventListener("click", async () => {
    cashState.activeDate = cashElements.dateInput.value || cashState.activeDate;
    await loadDay();
  });
  cashElements.dateInput?.addEventListener("change", async () => {
    cashState.activeDate = cashElements.dateInput.value || cashState.activeDate;
    updateGuidedFlow();
    await loadDay();
  });
  cashElements.form?.addEventListener("submit", saveEntry);
  cashElements.partnerPaymentForm?.addEventListener("submit", savePartnerPayment);
  cashElements.clientRegistrationForm?.addEventListener("submit", saveClientRegistration);
  cashElements.clientRegistrationName?.addEventListener("change", handleClientRegistrationLookup);
  cashElements.clientRegistrationName?.addEventListener("blur", handleClientRegistrationLookup);
  cashElements.clientRegistrationClear?.addEventListener("click", resetClientRegistrationForm);
  cashElements.clearButton?.addEventListener("click", resetCashForm);
  cashElements.exportPdfButton?.addEventListener("click", () => {
    window.open(`/api/cash-flow/day/${cashState.activeDate}.pdf`, "_blank");
  });
  cashElements.exportMonthPdfButton?.addEventListener("click", () => {
    window.open(`/api/cash-flow/month/${cashState.activeDate.slice(0, 7)}.pdf`, "_blank");
  });
  cashElements.finalizeButton?.addEventListener("click", () => setFinalized(true));
  cashElements.reopenButton?.addEventListener("click", () => setFinalized(false));
  cashElements.deleteDayButton?.addEventListener("click", deleteCashDay);
  setupGuidedFormEvents();
}

if (cashElements.dateInput && cashElements.body) {
  syncDateInput();
  setupEvents();
  loadClientSuggestions().then(() => updateGuidedFlow());
  updateGuidedFlow();
  loadDay();
}
