(() => {
  "use strict";

  const state = {
    page: 1,
    pageSize: 10,
    sortKey: "sortOrder",
    sortDir: "asc",
    filters: {
      type: "",
      question: "",
      answer: ""
    }
  };

  let rows = [];
  let createModal = null;
  let editModal = null;
  let statusModal = null;
  let pendingStatusChange = null;

  const refs = {};

  function normalize(value) {
    return String(value || "").trim().toLowerCase();
  }

  // 後端統一輸出 yyyy-MM-dd HH:mm(不到秒),但舊資料可能仍帶秒,
  // 所以秒的部分做成選擇性,兩種格式都吃得下。
  function parseTime(value) {
    if (!value || value === "NULL") return 0;
    const match = String(value).match(/^(\d{4})-(\d{1,2})-(\d{1,2})[T\s](\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (match) {
      const [, year, month, day, hour, minute, second] = match;
      // 沒有秒時 second 是 undefined,不補 0 會變 NaN
      return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second || 0)).getTime();
    }
    const fallback = Date.parse(String(value).replace(" ", "T"));
    return Number.isNaN(fallback) ? 0 : fallback;
  }

  function getLastUpdatedAt(data) {
    return data.updatedAt && data.updatedAt !== "NULL" ? data.updatedAt : data.createdAt;
  }

  function showToast(message) {
    const toastMessage = document.getElementById("toastMessage");
    if (toastMessage) toastMessage.textContent = message;
    const toastElement = document.getElementById("actionToast");
    const toast = toastElement && window.bootstrap?.Toast
      ? window.bootstrap.Toast.getOrCreateInstance(toastElement, { delay: 1800 })
      : null;
    toast?.show();
  }

  /* ---------------------------------------------------------------
   * 與後端溝通
   * ------------------------------------------------------------- */

  function antiForgeryToken() {
    const input = document.querySelector('input[name="__RequestVerificationToken"]');
    return input ? input.value : "";
  }

  async function faqPost(url, data) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "RequestVerificationToken": antiForgeryToken() },
      body: new URLSearchParams(data)
    });

    if (!response.ok) {
      return { success: false, message: "伺服器沒有回應,請稍後再試。", fieldErrors: {} };
    }
    return await response.json();
  }

  // 排序的位移邏輯在 Service 層做,前端自己算一定會不同步,
  // 所以任何存檔成功後都回來重讀整份清單。
  async function reloadRows() {
    const listUrl = refs.screen?.dataset.faqListUrl;
    if (!listUrl) return;

    const response = await fetch(listUrl);
    if (!response.ok) {
      showToast("重新載入清單失敗,請重新整理頁面。");
      return;
    }

    const list = await response.json();
    refs.tableBody.innerHTML = "";
    list.forEach((item) => refs.tableBody.appendChild(buildFaqRow(item)));
    collectRows();
    renderTable();
  }

  /* ---------------------------------------------------------------
   * 表格資料
   * ------------------------------------------------------------- */

  function collectRows() {
    rows = Array.from(refs.tableBody?.querySelectorAll("[data-faq-row]") || []);
    rows.forEach((row) => {
      ensureAnswerPreview(row);
      setCell(row, "updatedAt", getLastUpdatedAt(getFaqData(row)));
    });
  }

  function getFaqData(row) {
    return {
      id: row.dataset.faqId || "",
      type: row.dataset.type || "",
      typeValue: row.dataset.typeValue || "",
      question: row.dataset.question || "",
      answer: row.dataset.answer || "",
      sortOrder: Number(row.dataset.sortOrder) || 0,
      active: row.dataset.active === "true",
      createdAt: row.dataset.createdAt || "",
      updatedAt: row.dataset.updatedAt || "NULL"
    };
  }

  function setCell(row, key, value) {
    const cell = row.querySelector('[data-faq-cell="' + key + '"]');
    if (cell) cell.textContent = value;
    if (key === "answer") ensureAnswerPreview(row);
  }

  function ensureAnswerPreview(row) {
    const cell = row.querySelector('[data-faq-cell="answer"]');
    if (!cell || cell.querySelector(".faq-answer-preview")) return;

    const text = cell.textContent.trim();
    cell.textContent = "";
    const preview = document.createElement("span");
    preview.className = "faq-answer-preview";
    preview.textContent = text;
    cell.appendChild(preview);
  }

  function syncStatusLabel(row) {
    const input = row.querySelector("[data-faq-status]");
    const label = row.querySelector(".member-status-text");
    if (!input) return;

    row.dataset.active = String(input.checked);
    if (label) label.textContent = input.checked ? "啟用" : "停用";
  }

  function updateCreateStatusLabel() {
    const input = document.getElementById("faqCreateActive");
    const label = document.querySelector('label[for="faqCreateActive"]');
    if (label) label.textContent = input?.checked ? "啟用" : "停用";
  }

  function matchesFilters(row) {
    const data = getFaqData(row);
    const question = normalize(state.filters.question);
    const answer = normalize(state.filters.answer);
    return (!state.filters.type || data.type === state.filters.type)
      && (!question || normalize(data.question).includes(question))
      && (!answer || normalize(data.answer).includes(answer));
  }

  function getSortValue(row, key) {
    const data = getFaqData(row);
    if (key === "sortOrder") return data.sortOrder;
    if (key === "active") return Number(data.active);
    if (key === "updatedAt") return parseTime(getLastUpdatedAt(data));
    return data[key] || "";
  }

  function compareRows(rowA, rowB) {
    const valueA = getSortValue(rowA, state.sortKey);
    const valueB = getSortValue(rowB, state.sortKey);
    let result = 0;

    if (typeof valueA === "number" || typeof valueB === "number") {
      result = (Number(valueA) || 0) - (Number(valueB) || 0);
    } else {
      result = String(valueA).localeCompare(String(valueB), "zh-Hant");
    }

    if (result === 0) {
      result = (Number(rowA.dataset.sortOrder) || 0) - (Number(rowB.dataset.sortOrder) || 0);
    }

    return state.sortDir === "asc" ? result : -result;
  }

  function getFilteredRows() {
    return rows.filter(matchesFilters).sort(compareRows);
  }

  function updateSortIcons() {
    document.querySelectorAll("[data-faq-sort]").forEach((button) => {
      const icon = button.querySelector("i");
      if (!icon) return;
      icon.className = button.dataset.faqSort === state.sortKey
        ? "bi " + (state.sortDir === "asc" ? "bi-sort-down" : "bi-sort-up")
        : "bi bi-arrow-down-up";
    });
  }

  function renderPagination(totalPages) {
    if (!refs.pagination) return;

    refs.pagination.innerHTML = "";
    const addButton = (label, page, disabled = false, active = false) => {
      const item = document.createElement("li");
      const button = document.createElement("button");
      item.className = "page-item";
      if (disabled) item.classList.add("disabled");
      if (active) item.classList.add("active");
      button.className = "page-link";
      button.type = "button";
      button.innerHTML = label;
      button.disabled = disabled;
      button.addEventListener("click", () => {
        state.page = page;
        renderTable();
      });
      item.appendChild(button);
      refs.pagination.appendChild(item);
    };

    addButton('<i class="bi bi-chevron-left"></i>', Math.max(state.page - 1, 1), state.page === 1);
    for (let page = 1; page <= totalPages; page += 1) {
      addButton(String(page), page, false, page === state.page);
    }
    addButton('<i class="bi bi-chevron-right"></i>', Math.min(state.page + 1, totalPages), state.page === totalPages);
  }

  function getEmptyRow() {
    const row = document.createElement("tr");
    row.className = "faq-empty-row";
    row.dataset.faqEmpty = "true";
    const cell = document.createElement("td");
    cell.colSpan = 7;
    cell.textContent = "查無符合條件的問與答資料";
    row.appendChild(cell);
    return row;
  }

  function renderTable() {
    if (!refs.tableBody) return;

    refs.tableBody.querySelector("[data-faq-empty]")?.remove();
    const filteredRows = getFilteredRows();
    const totalPages = Math.max(Math.ceil(filteredRows.length / state.pageSize), 1);
    state.page = Math.min(state.page, totalPages);
    const startIndex = (state.page - 1) * state.pageSize;
    const pageRows = filteredRows.slice(startIndex, startIndex + state.pageSize);
    const endIndex = startIndex + pageRows.length;

    rows.forEach((row) => row.classList.add("d-none"));
    if (!pageRows.length) {
      refs.tableBody.appendChild(getEmptyRow());
    } else {
      pageRows.forEach((row) => {
        row.classList.remove("d-none");
        refs.tableBody.appendChild(row);
      });
    }

    if (refs.resultCount) refs.resultCount.textContent = "共 " + filteredRows.length + " 筆";
    if (refs.pageInfo) {
      refs.pageInfo.textContent = filteredRows.length
        ? "第 " + state.page + " / " + totalPages + " 頁・顯示 " + (startIndex + 1) + "-" + endIndex + " 筆"
        : "沒有符合條件的問與答資料";
    }
    renderPagination(totalPages);
    updateSortIcons();
  }

  // 新增 Modal 開啟時用來預填排序,實際採用的號碼仍以伺服器回傳為準
  function getNextSortOrder() {
    return rows.reduce((maxSort, row) => Math.max(maxSort, Number(row.dataset.sortOrder) || 0), 0) + 1;
  }

  function findRowById(id) {
    return rows.find((item) => item.dataset.faqId === String(id));
  }

  function getPageForRowId(id) {
    const filteredRows = getFilteredRows();
    const rowIndex = filteredRows.findIndex((item) => item.dataset.faqId === String(id));
    return rowIndex >= 0 ? Math.floor(rowIndex / state.pageSize) + 1 : 1;
  }

  /* ---------------------------------------------------------------
   * 表單
   * ------------------------------------------------------------- */

  function getFormValues(prefix) {
    return {
      type: document.getElementById(prefix + "Type")?.value.trim() || "",
      question: document.getElementById(prefix + "Question")?.value.trim() || "",
      answer: document.getElementById(prefix + "Answer")?.value.trim() || "",
      sortOrder: Number(document.getElementById(prefix + "SortOrder")?.value) || 0
    };
  }

  function validateForm(form) {
    const sortInput = form.querySelector('input[type="number"]');
    if (sortInput) {
      sortInput.setCustomValidity(Number(sortInput.value) > 0 ? "" : "請輸入大於 0 的排序數字。");
    }
    form.classList.add("was-validated");
    return form.checkValidity();
  }

  function resetForm(form) {
    form?.reset();
    form?.classList.remove("was-validated");
    form?.querySelectorAll("[data-custom-invalid]").forEach((input) => input.removeAttribute("data-custom-invalid"));
    form?.querySelectorAll("input, textarea, select").forEach((input) => input.setCustomValidity(""));
  }

  // 把後端回傳的欄位錯誤標到對應欄位。
  // fieldErrors 的 key 是 DTO 屬性名(Question / Answer / Type / SortOrder),
  // 加上 prefix 剛好就是畫面上的 element id。
  function applyServerErrors(form, prefix, fieldErrors) {
    if (!form || !fieldErrors) return;

    Object.keys(fieldErrors).forEach((key) => {
      const field = document.getElementById(prefix + key);
      if (!field) return;

      field.setCustomValidity(fieldErrors[key]);
      const feedback = field.parentElement?.querySelector(".invalid-feedback");
      if (feedback) feedback.textContent = fieldErrors[key];
    });

    form.classList.add("was-validated");
  }

  /* ---------------------------------------------------------------
   * 新增 / 編輯 / 狀態切換
   * ------------------------------------------------------------- */

  function buildFaqRow(data) {
    const row = document.createElement("tr");
    const sortCell = document.createElement("td");
    const typeCell = document.createElement("td");
    const questionCell = document.createElement("td");
    const answerCell = document.createElement("td");
    const updatedCell = document.createElement("td");
    const statusCell = document.createElement("td");
    const actionCell = document.createElement("td");
    const switchWrap = document.createElement("div");
    const input = document.createElement("input");
    const label = document.createElement("label");
    const editButton = document.createElement("button");
    const editIcon = document.createElement("i");
    const statusId = "faqStatus" + data.id;

    row.dataset.faqRow = "";
    row.dataset.faqId = String(data.id);
    row.dataset.type = data.type;
    row.dataset.typeValue = String(data.typeValue);
    row.dataset.question = data.question;
    row.dataset.answer = data.answer;
    row.dataset.sortOrder = String(data.sortOrder);
    row.dataset.active = String(data.active);
    row.dataset.createdAt = data.createdAt;
    row.dataset.updatedAt = data.updatedAt;

    sortCell.dataset.faqCell = "sortOrder";
    sortCell.textContent = data.sortOrder;
    typeCell.dataset.faqCell = "type";
    typeCell.textContent = data.type;
    questionCell.dataset.faqCell = "question";
    questionCell.textContent = data.question;
    answerCell.className = "faq-answer-cell";
    answerCell.dataset.faqCell = "answer";
    const answerPreview = document.createElement("span");
    answerPreview.className = "faq-answer-preview";
    answerPreview.textContent = data.answer;
    answerCell.appendChild(answerPreview);
    updatedCell.dataset.faqCell = "updatedAt";
    updatedCell.textContent = getLastUpdatedAt(data);

    switchWrap.className = "form-check form-switch member-status-switch faq-status-switch";
    input.className = "form-check-input";
    input.id = statusId;
    input.type = "checkbox";
    input.role = "switch";
    input.dataset.faqStatus = String(data.id);
    input.checked = data.active;
    label.className = "member-status-text";
    label.htmlFor = statusId;
    label.textContent = data.active ? "啟用" : "停用";
    switchWrap.append(input, label);
    statusCell.appendChild(switchWrap);

    editButton.className = "member-detail-btn faq-edit-btn";
    editButton.type = "button";
    editButton.dataset.faqEdit = String(data.id);
    editIcon.className = "bi bi-pencil-square";
    editButton.append(editIcon, "編輯");
    actionCell.appendChild(editButton);

    row.append(sortCell, typeCell, questionCell, answerCell, updatedCell, statusCell, actionCell);
    return row;
  }

  function openEditModal(row) {
    const data = getFaqData(row);
    resetForm(refs.editForm);
    document.getElementById("faqEditId").value = data.id;
    // 類型的 select 用數字當 value,所以要用 typeValue 而不是中文的 type
    document.getElementById("faqEditType").value = data.typeValue;
    document.getElementById("faqEditSortOrder").value = data.sortOrder;
    document.getElementById("faqEditQuestion").value = data.question;
    document.getElementById("faqEditAnswer").value = data.answer;
    editModal?.show();
  }

  async function handleCreateSubmit(event) {
    event.preventDefault();
    if (!validateForm(event.target)) return;

    const submitButton = event.target.querySelector('button[type="submit"]');
    const values = getFormValues("faqCreate");
    const activeInput = document.getElementById("faqCreateActive");

    submitButton.disabled = true;
    const result = await faqPost(refs.screen.dataset.faqSaveUrl, {
      Id: 0,
      Type: values.type,
      SortOrder: values.sortOrder,
      Question: values.question,
      Answer: values.answer,
      IsActive: Boolean(activeInput?.checked)
    });
    submitButton.disabled = false;

    if (!result.success) {
      applyServerErrors(refs.createForm, "faqCreate", result.fieldErrors);
      showToast(result.message);
      return;
    }

    await reloadRows();
    state.sortKey = "sortOrder";
    state.sortDir = "asc";
    state.page = getPageForRowId(result.row.id);
    renderTable();
    createModal?.hide();
    showToast(result.message);
  }

  async function handleEditSubmit(event) {
    event.preventDefault();
    if (!validateForm(event.target)) return;

    const id = document.getElementById("faqEditId")?.value || "";
    const row = findRowById(id);
    if (!row) return;

    const submitButton = event.target.querySelector('button[type="submit"]');
    const values = getFormValues("faqEdit");

    submitButton.disabled = true;
    const result = await faqPost(refs.screen.dataset.faqSaveUrl, {
      Id: id,
      Type: values.type,
      SortOrder: values.sortOrder,
      Question: values.question,
      Answer: values.answer,
      // 編輯 Modal 沒有啟用開關,要把該列目前的狀態帶回去,
      // 否則後端會用 DTO 預設值 true,把停用中的問答又打開。
      IsActive: row.dataset.active === "true"
    });
    submitButton.disabled = false;

    if (!result.success) {
      applyServerErrors(refs.editForm, "faqEdit", result.fieldErrors);
      showToast(result.message);
      return;
    }

    await reloadRows();
    state.sortKey = "sortOrder";
    state.sortDir = "asc";
    state.page = getPageForRowId(result.row.id);
    renderTable();
    editModal?.hide();
    showToast(result.message);
  }

  function openStatusConfirm(row, nextActive) {
    const data = getFaqData(row);
    pendingStatusChange = { row, nextActive };

    const title = document.getElementById("faqStatusModalTitle");
    const description = document.getElementById("faqStatusModalDescription");
    if (title) title.textContent = nextActive ? "確認啟用問答" : "確認停用問答";
    if (description) description.textContent = "確定要" + (nextActive ? "啟用" : "停用") + "「" + data.question + "」嗎？";

    if (statusModal) {
      statusModal.show();
      return;
    }

    if (window.confirm(description?.textContent || "確定要變更問答狀態嗎？")) applyStatusChange(row, nextActive);
    pendingStatusChange = null;
  }

  async function applyStatusChange(row, nextActive) {
    const result = await faqPost(refs.screen.dataset.faqToggleUrl, {
      id: row.dataset.faqId,
      isActive: nextActive
    });

    if (!result.success) {
      showToast(result.message);
      return;
    }

    const input = row.querySelector("[data-faq-status]");
    if (input) input.checked = result.row.active;
    syncStatusLabel(row);

    // 狀態變更會更新最後修改時間,用伺服器回傳的值才不會顯示舊資料
    row.dataset.updatedAt = result.row.updatedAt;
    setCell(row, "updatedAt", getLastUpdatedAt(getFaqData(row)));

    if (state.sortKey === "active" || state.sortKey === "updatedAt") renderTable();
    showToast(result.message);
  }

  /* ---------------------------------------------------------------
   * 事件綁定
   * ------------------------------------------------------------- */

  function bindEvents() {
    createModal = document.getElementById("faqCreateModal") && window.bootstrap?.Modal
      ? window.bootstrap.Modal.getOrCreateInstance(document.getElementById("faqCreateModal"))
      : null;
    editModal = document.getElementById("faqEditModal") && window.bootstrap?.Modal
      ? window.bootstrap.Modal.getOrCreateInstance(document.getElementById("faqEditModal"))
      : null;
    statusModal = document.getElementById("faqStatusModal") && window.bootstrap?.Modal
      ? window.bootstrap.Modal.getOrCreateInstance(document.getElementById("faqStatusModal"))
      : null;

    document.querySelectorAll("[data-faq-filter]").forEach((input) => {
      const update = () => {
        state.filters[input.dataset.faqFilter] = input.value.trim();
        state.page = 1;
        renderTable();
      };
      input.addEventListener("input", update);
      input.addEventListener("change", update);
    });

    refs.searchForm?.addEventListener("submit", (event) => {
      event.preventDefault();
      state.page = 1;
      renderTable();
    });

    refs.reset?.addEventListener("click", () => {
      document.querySelectorAll("[data-faq-filter]").forEach((input) => {
        input.value = "";
        state.filters[input.dataset.faqFilter] = "";
      });
      state.page = 1;
      renderTable();
    });

    document.querySelectorAll("[data-faq-sort]").forEach((button) => {
      button.addEventListener("click", () => {
        const sortKey = button.dataset.faqSort;
        if (state.sortKey === sortKey) state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
        else {
          state.sortKey = sortKey;
          state.sortDir = "asc";
        }
        state.page = 1;
        renderTable();
      });
    });

    refs.tableBody?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-faq-edit]");
      if (!button) return;
      const row = button.closest("[data-faq-row]");
      if (row) openEditModal(row);
    });

    refs.tableBody?.addEventListener("change", (event) => {
      const input = event.target.closest("[data-faq-status]");
      if (!input) return;

      const row = input.closest("[data-faq-row]");
      const nextActive = input.checked;
      // 先還原,等使用者在確認視窗按下確認、伺服器也回覆成功後才真的改
      input.checked = !nextActive;
      openStatusConfirm(row, nextActive);
    });

    refs.createForm?.addEventListener("submit", handleCreateSubmit);
    refs.editForm?.addEventListener("submit", handleEditSubmit);

    document.getElementById("faqCreateModal")?.addEventListener("shown.bs.modal", () => {
      document.getElementById("faqCreateSortOrder").value = getNextSortOrder();
      document.getElementById("faqCreateType")?.focus();
      updateCreateStatusLabel();
    });
    document.getElementById("faqCreateModal")?.addEventListener("hidden.bs.modal", () => {
      resetForm(refs.createForm);
      document.getElementById("faqCreateActive").checked = true;
      updateCreateStatusLabel();
    });
    document.getElementById("faqEditModal")?.addEventListener("hidden.bs.modal", () => resetForm(refs.editForm));
    document.getElementById("faqCreateActive")?.addEventListener("change", updateCreateStatusLabel);

    document.getElementById("faqStatusConfirm")?.addEventListener("click", async () => {
      if (!pendingStatusChange) return;
      const { row, nextActive } = pendingStatusChange;
      pendingStatusChange = null;
      statusModal?.hide();
      await applyStatusChange(row, nextActive);
    });

    document.getElementById("faqStatusModal")?.addEventListener("hidden.bs.modal", () => {
      pendingStatusChange = null;
    });
  }

  function init() {
    Object.assign(refs, {
      screen: document.getElementById("managementScreen"),
      view: document.getElementById("faqManagementView"),
      tableBody: document.getElementById("faqTableBody"),
      searchForm: document.getElementById("faqSearchForm"),
      reset: document.getElementById("faqFilterReset"),
      resultCount: document.getElementById("faqResultCount"),
      pageInfo: document.getElementById("faqPageInfo"),
      pagination: document.getElementById("faqPagination"),
      createForm: document.getElementById("faqCreateForm"),
      editForm: document.getElementById("faqEditForm")
    });

    if (!refs.view || !refs.tableBody) return;

    // 排序號碼由資料庫決定,前端不再重新編號
    collectRows();
    bindEvents();
    updateCreateStatusLabel();
    renderTable();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
