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
  pixCopy: document.querySelector("#request-pix-copy"),
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
  requestElements.pixCopy.value = payload.pix_copy_paste || "";
  requestElements.total.textContent = formatCurrency(payload.total_value);
  requestElements.selectedTotal.textContent = formatCurrency(payload.total_value);
  requestElements.exportPdfButton.disabled = false;
  requestElements.exportXlsxButton.disabled = false;

  if (!payload.entries.length) {
    requestElements.body.innerHTML = '<tr><td colspan="4" class="empty-state">Nenhuma requisicao para este parceiro.</td></tr>';
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
        </tr>
      `,
    )
    .join("");
  renderPartnerList();
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
  } else if (data.pix_copy_paste) {
    requestElements.pixCopy.value = data.pix_copy_paste;
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
