const requestState = {
  partners: [],
  selectedPartner: "",
};

const requestElements = {
  partnerCount: document.querySelector("#requests-partner-count"),
  selectedTotal: document.querySelector("#requests-selected-total"),
  partnerList: document.querySelector("#requests-partner-list"),
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

function partnerUrl(partnerName) {
  return new URLSearchParams({ partner: partnerName }).toString();
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
    button.addEventListener("click", () => loadPartner(partner.partner_name));
    requestElements.partnerList.appendChild(button);
  });
}

function renderReport(payload) {
  requestState.selectedPartner = payload.partner_name;
  requestElements.title.textContent = payload.title;
  requestElements.pixKey.textContent = `Chave PIX: ${payload.pix_key}`;
  requestElements.total.textContent = formatCurrency(payload.total_value);
  requestElements.selectedTotal.textContent = formatCurrency(payload.total_value);
  requestElements.exportPdfButton.disabled = false;
  requestElements.exportXlsxButton.disabled = false;

  if (!payload.entries.length) {
    requestElements.body.innerHTML = '<tr><td colspan="5" class="empty-state">Nenhuma requisicao para este parceiro.</td></tr>';
    renderPartnerList();
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
  const response = await fetch(`/api/partner-requests/detail?${partnerUrl(partnerName)}`);
  const data = await response.json();
  if (!response.ok) {
    alert(data.error || "Nao foi possivel carregar a requisicao.");
    return;
  }
  renderReport(data);
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
  if (requestState.partners.length) {
    await loadPartner(requestState.partners[0].partner_name);
  }
}

function setupEvents() {
  requestElements.exportPdfButton.addEventListener("click", () => {
    if (!requestState.selectedPartner) return;
    window.open(`/api/partner-requests/export.pdf?${partnerUrl(requestState.selectedPartner)}`, "_blank");
  });
  requestElements.exportXlsxButton.addEventListener("click", () => {
    if (!requestState.selectedPartner) return;
    window.open(`/api/partner-requests/export.xlsx?${partnerUrl(requestState.selectedPartner)}`, "_blank");
  });
}

setupEvents();
loadPartners();
