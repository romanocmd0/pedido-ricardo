const reportNavButtons = document.querySelectorAll("[data-report-nav]");
const reportViews = document.querySelectorAll("[data-report-view]");

async function initializeReportView(key) {
  if (key === "comparison" && window.initComparisonSection) {
    await window.initComparisonSection();
  }
  if (key === "clients" && window.initClientComparisonSection) {
    await window.initClientComparisonSection();
  }
  if (key === "requests" && window.initPartnerRequestsSection) {
    await window.initPartnerRequestsSection();
  }
}

async function openReportView(key) {
  reportNavButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.reportNav === key);
  });

  reportViews.forEach((view) => {
    view.classList.toggle("is-active", view.dataset.reportView === key);
  });

  await initializeReportView(key);
  setTimeout(() => window.dispatchEvent(new Event("resize")), 220);
}

if (reportNavButtons.length && reportViews.length) {
  reportNavButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      const key = button.dataset.reportNav;
      if (!key || button.classList.contains("is-active")) {
        return;
      }
      await openReportView(key);
    });
  });
}
