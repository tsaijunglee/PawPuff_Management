(() => {
  "use strict";

  const refs = {};
  let confirmModal = null;
  let pendingPayload = null;

  function showToast(message) {
    const toastMessage = document.getElementById("toastMessage");
    if (toastMessage) toastMessage.textContent = message;
    const toastElement = document.getElementById("actionToast");
    const toast = toastElement && window.bootstrap?.Toast
      ? window.bootstrap.Toast.getOrCreateInstance(toastElement, { delay: 1800 })
      : null;
    toast?.show();
  }

  function getSelectedAudienceOption() {
    return refs.audience?.selectedOptions?.[0] || null;
  }

  function getAudienceLabel() {
    return getSelectedAudienceOption()?.dataset.label || "";
  }

  function getCurrentAccountListId() {
    return getSelectedAudienceOption()?.dataset.list || "";
  }

  function getCurrentAccounts() {
    const listId = getCurrentAccountListId();
    if (!listId) return [];
    return Array.from(document.querySelectorAll("#" + listId + " option"))
      .map((option) => option.value.trim())
      .filter(Boolean);
  }

  function syncAccountField() {
    const listId = getCurrentAccountListId();
    const hasAudience = Boolean(listId);
    refs.accountField?.classList.toggle("is-hidden", !hasAudience);
    refs.account.disabled = !hasAudience;
    refs.account.value = "";
    refs.account.setAttribute("list", listId);
    refs.account.placeholder = hasAudience ? "輸入" + getAudienceLabel() + "帳號" : "請先選擇對象";
    refs.account.setCustomValidity("");
  }

  function validateForm() {
    const account = refs.account.value.trim();
    const message = refs.message.value.trim();
    const accounts = getCurrentAccounts();

    refs.audience.setCustomValidity(refs.audience.value ? "" : "請選擇訊息傳送對象。");
    refs.account.setCustomValidity(accounts.includes(account) ? "" : "請選擇假資料中存在的帳號。");
    refs.message.setCustomValidity(message ? "" : "請輸入通知內容。");
    refs.form.classList.add("was-validated");

    return refs.form.checkValidity();
  }

  function openConfirmModal() {
    pendingPayload = {
      audienceLabel: getAudienceLabel(),
      account: refs.account.value.trim(),
      message: refs.message.value.trim()
    };

    refs.confirmTarget.textContent = pendingPayload.audienceLabel + "「" + pendingPayload.account + "」";
    refs.confirmMessage.textContent = pendingPayload.message;
    confirmModal?.show();
  }

  function resetForm() {
    refs.form.reset();
    refs.form.classList.remove("was-validated");
    refs.form.querySelectorAll("select, input, textarea").forEach((field) => field.setCustomValidity(""));
    syncAccountField();
  }

  function bindEvents() {
    refs.audience.addEventListener("change", () => {
      syncAccountField();
      refs.audience.setCustomValidity("");
    });

    refs.account.addEventListener("input", () => refs.account.setCustomValidity(""));
    refs.message.addEventListener("input", () => refs.message.setCustomValidity(""));

    refs.form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!validateForm()) return;
      openConfirmModal();
    });

    refs.confirmButton.addEventListener("click", () => {
      if (!pendingPayload) return;
      confirmModal?.hide();
      showToast("已發送訊息給" + pendingPayload.audienceLabel + "「" + pendingPayload.account + "」");
      pendingPayload = null;
      resetForm();
    });
  }

  function init() {
    Object.assign(refs, {
      form: document.getElementById("sendNotificationForm"),
      audience: document.getElementById("notificationAudience"),
      accountField: document.getElementById("notificationAccountField"),
      account: document.getElementById("notificationAccount"),
      message: document.getElementById("notificationMessage"),
      confirmTarget: document.getElementById("sendConfirmTarget"),
      confirmMessage: document.getElementById("sendConfirmMessage"),
      confirmButton: document.getElementById("sendNotificationConfirmButton")
    });

    if (!refs.form) return;
    confirmModal = document.getElementById("sendNotificationConfirmModal") && window.bootstrap?.Modal
      ? window.bootstrap.Modal.getOrCreateInstance(document.getElementById("sendNotificationConfirmModal"))
      : null;
    syncAccountField();
    bindEvents();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
