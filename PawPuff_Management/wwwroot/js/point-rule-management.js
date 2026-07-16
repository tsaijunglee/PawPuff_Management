(() => {
  "use strict";

  let editModal = null;
  let activeRow = null;

  function showToast(message) {
    const toastMessage = document.getElementById("toastMessage");
    if (toastMessage) toastMessage.textContent = message;
    const toastElement = document.getElementById("actionToast");
    const toast = toastElement && window.bootstrap?.Toast
      ? window.bootstrap.Toast.getOrCreateInstance(toastElement, { delay: 1800 })
      : null;
    toast?.show();
  }

  function getRuleName(row) {
    return row.querySelector('[data-point-rule-cell="name"]')?.textContent.trim() || "此規則";
  }

  function getDefaultValueCell(row) {
    return row.querySelector('[data-point-rule-cell="defaultValue"]');
  }

  function getDescriptionCell(row) {
    return row.querySelector('[data-point-rule-cell="description"]');
  }

  function resetEditForm() {
    const form = document.getElementById("pointRuleEditForm");
    form?.reset();
    form?.classList.remove("was-validated");
    form?.querySelectorAll("input, textarea").forEach((field) => field.setCustomValidity(""));
    activeRow = null;
  }

  function openEditModal(row) {
    if (!row || row.dataset.fixed !== "true") {
      showToast("此規則不是固定值，無法編輯預設值");
      return;
    }

    activeRow = row;
    const value = String(row.dataset.defaultValue || "").trim();
    const description = String(row.dataset.description || getDescriptionCell(row)?.textContent || "").trim();
    row.dataset.description = description;
    document.getElementById("pointRuleEditId").value = row.dataset.id || "";
    document.getElementById("pointRuleEditName").value = getRuleName(row);
    document.getElementById("pointRuleEditValue").value = value;
    document.getElementById("pointRuleEditReason").value = description;
    document.getElementById("pointRuleEditForm")?.classList.remove("was-validated");
    editModal?.show();
  }

  function handleEditSubmit(event) {
    event.preventDefault();
    if (!activeRow) return;

    const form = event.target;
    const valueInput = document.getElementById("pointRuleEditValue");
    const descriptionInput = document.getElementById("pointRuleEditReason");
    const nextValue = String(valueInput.value).trim();
    const originalValue = String(activeRow.dataset.defaultValue || "").trim();
    const nextDescription = descriptionInput.value.trim();
    const originalDescription = String(activeRow.dataset.description || getDescriptionCell(activeRow)?.textContent || "").trim();

    valueInput.setCustomValidity(nextValue ? "" : "請輸入預設值。");
    descriptionInput.setCustomValidity(nextDescription ? "" : "請填寫描述。");
    form.classList.add("was-validated");
    if (!form.checkValidity()) return;

    if (nextValue === originalValue && nextDescription === originalDescription) {
      showToast("預設值與描述未變更");
      return;
    }

    activeRow.dataset.defaultValue = nextValue;
    activeRow.dataset.description = nextDescription;
    const valueCell = getDefaultValueCell(activeRow);
    if (valueCell) valueCell.textContent = nextValue;
    const descriptionCell = getDescriptionCell(activeRow);
    if (descriptionCell) descriptionCell.textContent = nextDescription;
    showToast(getRuleName(activeRow) + "已更新");
    editModal?.hide();
  }

  function bindEvents() {
    const tableBody = document.getElementById("pointRuleTableBody");
    if (!tableBody) return;

    tableBody.addEventListener("click", (event) => {
      const button = event.target.closest("[data-point-rule-edit]");
      if (!button) return;
      openEditModal(button.closest("[data-point-rule-row]"));
    });

    document.getElementById("pointRuleEditForm")?.addEventListener("submit", handleEditSubmit);
    document.getElementById("pointRuleEditModal")?.addEventListener("hidden.bs.modal", resetEditForm);
    document.getElementById("pointRuleEditValue")?.addEventListener("input", (event) => event.target.setCustomValidity(""));
    document.getElementById("pointRuleEditReason")?.addEventListener("input", (event) => event.target.setCustomValidity(""));
  }

  function init() {
    if (!document.getElementById("pointRuleView")) return;
    editModal = document.getElementById("pointRuleEditModal") && window.bootstrap?.Modal
      ? window.bootstrap.Modal.getOrCreateInstance(document.getElementById("pointRuleEditModal"))
      : null;
    bindEvents();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
