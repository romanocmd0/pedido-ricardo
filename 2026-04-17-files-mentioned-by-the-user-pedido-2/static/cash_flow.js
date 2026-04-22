const cashState = {
  activeDate: new Date().toISOString().slice(0, 10),
  entries: [],
  day: null,
};

const cashElements = {
  dateInput: document.querySelector("#cash-date-input"),
  openButton: document.querySelector("#open-cash-day-button"),
  tree: document.querySelector("#cash-tree"),
  title: document.querySelector("#cash-day-title"),
  result: document.querySelector("#cash-result"),
  status: document.querySelector("#cash-status"),
  exportPdfButton: document.querySelector("#export-cash-pdf-button"),
  finalizeButton: document.querySelector("#finalize-cash-button"),
  reopenButton: document.querySelector("#reopen-cash-button"),
  form: document.querySelector("#cash-entry-form"),
  entryId: document.querySelector("#cash-entry-id"),
  customerName: document.querySelector("#cash-customer-name"),
  plate: document.querySelector("#cash-plate"),
  serviceName: document.querySelector("#cash-service-name"),
  amount: document.querySelector("#cash-amount"),
  paymentMethod: document.querySelector("#cash-payment-method"),
  flowType: document.querySelector("#cash-flow-type"),
  clearButton: document.querySelector("#clear-cash-form-button"),
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

function currentPayload() {
  return {
    customer_name: cashElements.customerName.value.trim(),
    plate: cashElements.plate.value.trim(),
    service_name: cashElements.serviceName.value.trim(),
    amount: Number(cashElements.amount.value || 0),
    payment_method: cashElements.paymentMethod.value.trim(),
    flow_type: cashElements.flowType.value,
  };
}

function resetCashForm() {
  cashElements.form.reset();
  cashElements.entryId.value = "";
  cashElements.flowType.value = "entrada";
}

function setSelectValue(select, value) {
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
  cashElements.title.textContent = `Caixa de ${summary.display_date}`;
  cashElements.result.textContent = formatCurrency(summary.result);
  cashElements.dinheiro.textContent = formatCurrency(summary.payment_totals.dinheiro);
  cashElements.debito.textContent = formatCurrency(summary.payment_totals.cartao_debito);
  cashElements.credito.textContent = formatCurrency(summary.payment_totals.cartao_credito);
  cashElements.pix.textContent = formatCurrency(summary.payment_totals.pix);
  cashElements.outras.textContent = formatCurrency(summary.payment_totals.outras);
  cashElements.vaultBalance.textContent = formatCurrency(summary.vault_balance);
  cashElements.totalIn.textContent = formatCurrency(summary.total_in);
  cashElements.totalOut.textContent = formatCurrency(summary.total_out);
  cashElements.totalDeposit.textContent = formatCurrency(summary.total_deposit);
}

function renderEntries() {
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
      <td>${entry.flow_type === "deposito" ? "Deposito" : entry.flow_type === "saida" ? "Saida" : "Entrada"}</td>
      <td></td>
    `;
    const actions = document.createElement("div");
    actions.className = "actions";
    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "icon-button";
    editButton.textContent = "Editar";
    editButton.addEventListener("click", () => editEntry(entry));
    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "icon-button danger-button";
    deleteButton.textContent = "Excluir";
    deleteButton.addEventListener("click", () => deleteEntry(entry.id));
    actions.append(editButton, deleteButton);
    row.querySelector("td:last-child").appendChild(actions);
    cashElements.body.appendChild(row);
  });
}

function renderTree(tree) {
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
      cashElements.dateInput.value = cashState.activeDate;
      await loadDay();
    });
  });
}

function editEntry(entry) {
  cashElements.entryId.value = entry.id;
  cashElements.customerName.value = entry.customer_name;
  cashElements.plate.value = entry.plate || "";
  cashElements.serviceName.value = entry.service_name;
  cashElements.amount.value = entry.amount;
  setSelectValue(cashElements.paymentMethod, entry.payment_method);
  cashElements.flowType.value = entry.flow_type;
  cashElements.customerName.focus();
}

async function loadTree() {
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
  cashElements.status.textContent = data.day.finalized ? "Finalizado" : "Aberto";
  renderSummary(data.summary);
  renderEntries();
  await loadTree();
}

async function saveEntry(event) {
  event.preventDefault();
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
  cashElements.status.textContent = data.day.finalized ? "Finalizado" : "Aberto";
  renderSummary(data.summary);
  renderEntries();
  await loadTree();
}

function setupEvents() {
  cashElements.openButton.addEventListener("click", async () => {
    cashState.activeDate = cashElements.dateInput.value || cashState.activeDate;
    await loadDay();
  });
  cashElements.form.addEventListener("submit", saveEntry);
  cashElements.clearButton.addEventListener("click", resetCashForm);
  cashElements.exportPdfButton.addEventListener("click", () => {
    window.open(`/api/cash-flow/day/${cashState.activeDate}.pdf`, "_blank");
  });
  cashElements.finalizeButton.addEventListener("click", () => setFinalized(true));
  cashElements.reopenButton.addEventListener("click", () => setFinalized(false));
}

cashElements.dateInput.value = cashState.activeDate;
setupEvents();
loadDay();
