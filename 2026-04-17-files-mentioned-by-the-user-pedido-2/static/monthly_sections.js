const accordionSections = document.querySelectorAll(".accordion-section");

function closeAccordion(section) {
  section.classList.remove("is-open");
}

async function openAccordion(section) {
  const key = section.dataset.accordionSection;
  accordionSections.forEach((item) => {
    if (item !== section) closeAccordion(item);
  });
  section.classList.add("is-open");

  if (key === "comparison" && window.initComparisonSection) {
    await window.initComparisonSection();
  }
  if (key === "clients" && window.initClientComparisonSection) {
    await window.initClientComparisonSection();
  }
  if (key === "requests" && window.initPartnerRequestsSection) {
    await window.initPartnerRequestsSection();
  }

  setTimeout(() => window.dispatchEvent(new Event("resize")), 220);
}

if (accordionSections.length) {
  accordionSections.forEach((section) => {
    section.querySelector("[data-accordion-toggle]")?.addEventListener("click", async () => {
      if (section.classList.contains("is-open")) {
        closeAccordion(section);
        return;
      }
      await openAccordion(section);
    });
  });
}
