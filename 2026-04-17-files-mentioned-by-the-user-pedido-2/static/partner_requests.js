const requestState = {
  partners: [],
  selectedPartner: "",
  selectedYear: null,
  selectedMonth: null,
  initialized: false,
};

const requestElements = {
  partnerCount: document.querySelector("#requests-partner-count"),
  selectedTotal: document.querySelector("#requests-selected-total"),
  partnerList: document.querySelector("#requests-partner-list"),
  yearList: document.querySelector("#request-year-list"),
  monthList: document.querySelector("#request-month-list"),
  title: document.querySelector("#request-report-title"),
  pixKey: document.querySelector("#request-pix-key"),
  body: document.querySelector("#request-report-body"),
  total: document.querySelector("#request-report-total"),
  exportPdfButton: document.querySelector("#export-request-pdf-button"),
  exportXlsxButton: document.querySelector("#export-request-xlsx-button"),
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

function currentPartnerMeta() {
  return requestState.partners.find((partner) => partner.partner_name === requestState.selectedPartner) || null;
}

function buildPartnerQuery(partnerName) {
  const params = new URLSearchParams({ partner: partnerName });
  if (requestState.selectedYear) params.set("year", requestState.selectedYear);
  if (requestState.selectedMonth) params.set("month", requestState.selectedMonth);
  return params.toString();
}

function syncPeriodState() {
  const partner = currentPartnerMeta();
  if (!partner?.years?.length) {
    requestState.selectedYear = null;
    requestState.selectedMonth = null;
    return;
  }

  const selectedYearNode = partner.years.find((year) => Number(year.year_number) === Number(requestState.selectedYear)) || partner.years[0];
  requestState.selectedYear = selectedYearNode.year_number;

  if (!selectedYearNode.months?.length) {
    requestState.selectedMonth = null;
    return;
  }

  const selectedMonthNode =
    selectedYearNode.months.find((month) => Number(month.month_number) === Number(requestState.selectedMonth)) || selectedYearNode.months[0];
  requestState.selectedMonth = selectedMonthNode.month_number;
}

function renderPartnerList() {
  requestElements.partnerCount.textContent = requestState.partners.length;
  if (!requestState.partners.length) {
    requestElements.partnerList.innerHTML = '<div class="empty-state">Nenhum parceiro com pagamento Rec ainda.</div>';
    return;
  }

  requestElements.partnerList.innerHTML = "";
  requestState.partners.forEach((partner) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `request-partner-button ${partner.partner_name === requestState.selectedPartner ? "is-active" : ""}`;
    button.innerHTML = `
      <span>${escapeHtml(partner.partner_name)}</span>
      <small>${partner.entry_count} lanc. | ${formatCurrency(partner.total_value)}</small>
    `;
    button.addEventListener("click", () => selectPartner(partner.partner_name));
    requestElements.partnerList.appendChild(button);
  });
}

function renderYearList() {
  const partner = currentPartnerMeta();
  if (!partner || !partner.years?.length) {
    requestElements.yearList.innerHTML = '<div class="empty-state">Selecione um parceiro para ver os anos.</div>';
    return;
  }

  requestElements.yearList.innerHTML = "";
  partner.years.forEach((year) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `request-filter-button ${Number(requestState.selectedYear) === Number(year.year_number) ? "is-active" : ""}`;
    button.innerHTML = `<span>${year.year_number}</span><small>${year.entry_count} lanc.</small>`;
    button.addEventListener("click", () => selectYear(year.year_number));
    requestElements.yearList.appendChild(button);
  });
}

function renderMonthList() {
  const partner = currentPartnerMeta();
  const selectedYearNode = partner?.years?.find((year) => Number(year.year_number) === Number(requestState.selectedYear));
  if (!selectedYearNode || !selectedYearNode.months?.length) {
    requestElements.monthList.innerHTML = '<div class="empty-state">Selecione um ano para ver os meses.</div>';
    return;
  }

  requestElements.monthList.innerHTML = "";
  selectedYearNode.months.forEach((month) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `request-filter-button ${Number(requestState.selectedMonth) === Number(month.month_number) ? "is-active" : ""}`;
    button.innerHTML = `<span>${month.month_title}</span><small>${month.entry_count} lanc.</small>`;
    button.addEventListener("click", () => selectMonth(month.month_number));
    requestElements.monthList.appendChild(button);
  });
}

function renderReport(payload) {
  requestState.selectedPartner = payload.partner_name;
  requestState.selectedYear = payload.selected_year;
  requestState.selectedMonth = payload.selected_month;

  requestElements.title.textContent = payload.title;
  if (payload.selected_period_label) {
    requestElements.title.textContent = `${payload.title} - ${payload.selected_period_label}`;
  }
  requestElements.pixKey.textContent = `Chave PIX: ${payload.pix_key}`;
  requestElements.total.textContent = formatCurrency(payload.total_value);
  requestElements.selectedTotal.textContent = formatCurrency(payload.total_value);
  requestElements.exportPdfButton.disabled = false;
  requestElements.exportXlsxButton.disabled = false;

  if (!payload.entries.length) {
    requestElements.body.innerHTML = '<tr><td colspan="5" class="empty-state">Nenhuma requisicao para este parceiro neste periodo.</td></tr>';
    renderPartnerList();
    renderYearList();
    renderMonthList();
    return;
  }

  requestElements.body.innerHTML = payload.entries
    .map(
      (entry) => `
        <tr>
          <td>${escapeHtml(entry.display_date)}</td>
          <td>${escapeHtml(entry.plate || "-")}</td>
          <td>${escapeHtml(entry.service_name)}</td>
          <td>${formatCurrency(entry.amount)}</td>
          <td>
            <select class="request-status-select" data-entry-id="${entry.id}">
              <option value="em_aberto" ${entry.request_payment_status === "em_aberto" ? "selected" : ""}>Em aberto</option>
              <option value="pago" ${entry.request_payment_status === "pago" ? "selected" : ""}>Pago</option>
            </select>
          </td>
        </tr>
      `,
    )
    .join("");

  requestElements.body.querySelectorAll(".request-status-select").forEach((select) => {
    select.addEventListener("change", async () => {
      await updateRequestStatus(select.dataset.entryId, select.value);
    });
  });

  renderPartnerList();
  renderYearList();
  renderMonthList();
}

async function updateRequestStatus(entryId, status) {
  const response = await fetch(`/api/partner-requests/status/${entryId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  const data = await response.json();
  if (!response.ok) {
    alert(data.error || "Nao foi possivel atualizar o status.");
    await loadPartner(requestState.selectedPartner);
    return;
  }
  await loadPartner(requestState.selectedPartner);
}

async function loadPartner(partnerName) {
  const response = await fetch(`/api/partner-requests/detail?${buildPartnerQuery(partnerName)}`);
  const data = await response.json();
  if (!response.ok) {
    alert(data.error || "Nao foi possivel carregar a requisicao.");
    return;
  }
  renderReport(data);
}

async function selectPartner(partnerName) {
  requestState.selectedPartner = partnerName;
  requestState.selectedYear = null;
  requestState.selectedMonth = null;
  syncPeriodState();
  renderPartnerList();
  renderYearList();
  renderMonthList();
  await loadPartner(partnerName);
}

async function selectYear(yearNumber) {
  requestState.selectedYear = Number(yearNumber);
  requestState.selectedMonth = null;
  syncPeriodState();
  renderYearList();
  renderMonthList();
  await loadPartner(requestState.selectedPartner);
}

async function selectMonth(monthNumber) {
  requestState.selectedMonth = Number(monthNumber);
  renderMonthList();
  await loadPartner(requestState.selectedPartner);
}

async function loadPartners() {
  const response = await fetch("/api/partner-requests");
  const data = await response.json();
  if (!response.ok) {
    alert(data.error || "Nao foi possivel carregar os parceiros.");
    return;
  }

  requestState.partners = data.partners || [];
  renderPartnerList();
  renderYearList();
  renderMonthList();

  if (requestState.partners.length) {
    await selectPartner(requestState.partners[0].partner_name);
  }
}

function setupEvents() {
  requestElements.exportPdfButton.addEventListener("click", () => {
    if (!requestState.selectedPartner) return;
    window.open(`/api/partner-requests/export.pdf?${buildPartnerQuery(requestState.selectedPartner)}`, "_blank");
  });
  requestElements.exportXlsxButton.addEventListener("click", () => {
    if (!requestState.selectedPartner) return;
    window.open(`/api/partner-requests/export.xlsx?${buildPartnerQuery(requestState.selectedPartner)}`, "_blank");
  });
}

async function initPartnerRequestsSection() {
  if (!requestElements.partnerList || requestState.initialized) return;
  requestState.initialized = true;
  setupEvents();
  await loadPartners();
}

window.initPartnerRequestsSection = initPartnerRequestsSection;

if (requestElements.partnerList && document.body.dataset.page !== "monthly-report") {
  initPartnerRequestsSection();
}
