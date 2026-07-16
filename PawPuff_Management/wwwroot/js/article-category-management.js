(() => {
  "use strict";

  const state = {
    page: 1,
    pageSize: 10,
    sortKey: "id",
    sortDir: "asc",
    filters: {
      id: "",
      name: ""
    }
  };

  let rows = [];
  let createModal = null;
  let statusModal = null;
  let pendingStatusChange = null;
  let emptyRow = null;

  function getCellText(row, key) {
    return row.querySelector('[data-category-cell="' + key + '"]')?.textContent.trim() || "";
  }

  function normalize(value) {
    return String(value || "").trim().toLowerCase();
  }

  function collectRows() {
    rows = Array.from(document.querySelectorAll("[data-category-row]"));
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

  function getCategoryData(row) {
    const active = row.dataset.active === "true";
    return {
      id: row.dataset.id || getCellText(row, "id"),
      name: row.dataset.name || getCellText(row, "name"),
      active,
      activeText: active ? "啟用" : "停用"
    };
  }

  function syncStatusLabel(row) {
    const input = row.querySelector("[data-category-status]");
    const label = row.querySelector(".member-status-text");
    if (!input) return;

    row.dataset.active = String(input.checked);
    if (label) label.textContent = input.checked ? "啟用" : "停用";
  }

  function matchesFilters(row) {
    return (!state.filters.id || normalize(getCellText(row, "id")).includes(normalize(state.filters.id)))
      && (!state.filters.name || normalize(getCellText(row, "name")).includes(normalize(state.filters.name)));
  }

  function compareRows(rowA, rowB) {
    const dataA = getCategoryData(rowA);
    const dataB = getCategoryData(rowB);
    let result = 0;

    if (state.sortKey === "id") {
      result = (Number(dataA.id) || 0) - (Number(dataB.id) || 0);
    } else if (state.sortKey === "active") {
      result = Number(dataA.active) - Number(dataB.active);
    } else {
      result = dataA.name.localeCompare(dataB.name, "zh-Hant");
    }

    return state.sortDir === "asc" ? result : -result;
  }

  function updateSortIcons() {
    document.querySelectorAll("[data-category-sort]").forEach((button) => {
      const icon = button.querySelector("i");
      if (!icon) return;

      icon.className = button.dataset.categorySort === state.sortKey
        ? "bi " + (state.sortDir === "asc" ? "bi-sort-down" : "bi-sort-up")
        : "bi bi-arrow-down-up";
    });
  }

  function ensureEmptyRow(tableBody) {
    if (emptyRow) return emptyRow;

    emptyRow = document.createElement("tr");
    emptyRow.className = "category-empty-row d-none";
    const cell = document.createElement("td");
    cell.colSpan = 3;
    cell.textContent = "沒有符合條件的文章分類";
    emptyRow.appendChild(cell);
    tableBody.appendChild(emptyRow);
    return emptyRow;
  }

  function getFilteredRows() {
    return rows.filter(matchesFilters).sort(compareRows);
  }

  function renderPagination(totalPages) {
    const pagination = document.getElementById("categoryPagination");
    if (!pagination) return;

    pagination.innerHTML = "";
    const addPageItem = (label, page, disabled = false, active = false) => {
      const item = document.createElement("li");
      const button = document.createElement("button");
      item.className = "page-item";
      if (disabled) item.classList.add("disabled");
      if (active) item.classList.add("active");
      button.className = "page-link";
      button.type = "button";
      button.textContent = label;
      button.disabled = disabled;
      button.addEventListener("click", () => {
        state.page = page;
        renderTable();
      });
      item.appendChild(button);
      pagination.appendChild(item);
    };

    addPageItem("‹", Math.max(state.page - 1, 1), state.page === 1);
    for (let page = 1; page <= totalPages; page += 1) {
      addPageItem(String(page), page, false, page === state.page);
    }
    addPageItem("›", Math.min(state.page + 1, totalPages), state.page === totalPages);
  }

  function renderTable() {
    const tableBody = document.getElementById("categoryTableBody");
    const resultCount = document.getElementById("categoryResultCount");
    const pageInfo = document.getElementById("categoryPageInfo");
    if (!tableBody) return;

    const filteredRows = getFilteredRows();
    const totalPages = Math.max(Math.ceil(filteredRows.length / state.pageSize), 1);
    state.page = Math.min(state.page, totalPages);

    const startIndex = (state.page - 1) * state.pageSize;
    const endIndex = Math.min(startIndex + state.pageSize, filteredRows.length);
    const visibleRows = filteredRows.slice(startIndex, endIndex);

    rows.slice().sort(compareRows).forEach((row) => tableBody.appendChild(row));
    const empty = ensureEmptyRow(tableBody);
    tableBody.appendChild(empty);

    rows.forEach((row) => {
      row.classList.toggle("d-none", !visibleRows.includes(row));
    });
    empty.classList.toggle("d-none", filteredRows.length > 0);

    if (resultCount) resultCount.textContent = "共 " + filteredRows.length + " 筆";
    if (pageInfo) {
      pageInfo.textContent = filteredRows.length
        ? "第 " + state.page + " / " + totalPages + " 頁・顯示 " + (startIndex + 1) + "-" + endIndex + " 筆"
        : "沒有符合條件的文章分類";
    }
    renderPagination(totalPages);
    updateSortIcons();
  }

  function setCreateInvalid(message = "") {
    const input = document.getElementById("categoryCreateName");
    const feedback = input?.parentElement?.querySelector(".invalid-feedback");
    if (!input) return;

    if (feedback && !feedback.dataset.defaultMessage) feedback.dataset.defaultMessage = feedback.textContent;
    input.classList.toggle("is-invalid", Boolean(message));
    if (feedback) feedback.textContent = message || feedback.dataset.defaultMessage;
  }

  function categoryNameExists(name) {
    return rows.some((row) => normalize(row.dataset.name) === normalize(name));
  }

  function getNextCategoryId() {
    return rows.reduce((maxId, row) => Math.max(maxId, Number(row.dataset.id) || 0), 0) + 1;
  }

  function buildCategoryRow(category) {
    const row = document.createElement("tr");
    const idCell = document.createElement("td");
    const nameCell = document.createElement("td");
    const statusCell = document.createElement("td");
    const switchWrap = document.createElement("div");
    const input = document.createElement("input");
    const label = document.createElement("label");
    const statusId = "categoryStatus" + category.id;

    row.dataset.categoryRow = "";
    row.dataset.id = String(category.id);
    row.dataset.name = category.name;
    row.dataset.active = "true";

    idCell.dataset.categoryCell = "id";
    idCell.textContent = category.id;
    nameCell.dataset.categoryCell = "name";
    nameCell.textContent = category.name;

    switchWrap.className = "form-check form-switch member-status-switch category-status-switch";
    input.className = "form-check-input";
    input.id = statusId;
    input.type = "checkbox";
    input.role = "switch";
    input.dataset.categoryStatus = String(category.id);
    input.checked = true;
    label.className = "member-status-text";
    label.htmlFor = statusId;
    label.textContent = "啟用";

    switchWrap.append(input, label);
    statusCell.appendChild(switchWrap);
    row.append(idCell, nameCell, statusCell);
    return row;
  }

  function handleCreateSubmit(event) {
    event.preventDefault();
    const input = document.getElementById("categoryCreateName");
    const name = input?.value.trim() || "";

    setCreateInvalid();
    if (!name) {
      setCreateInvalid("請輸入分類名稱。");
      return;
    }
    if (categoryNameExists(name)) {
      setCreateInvalid("此分類名稱已存在。");
      return;
    }

    document.getElementById("categoryTableBody")?.appendChild(buildCategoryRow({
      id: getNextCategoryId(),
      name
    }));
    collectRows();
    state.sortKey = "id";
    state.sortDir = "asc";
    state.page = Math.max(Math.ceil(getFilteredRows().length / state.pageSize), 1);
    renderTable();
    createModal?.hide();
    event.target.reset();
    showToast("已新增文章分類");
  }

  function openStatusConfirm(row, nextActive) {
    const data = getCategoryData(row);
    pendingStatusChange = { row, nextActive };

    const title = document.getElementById("categoryStatusModalTitle");
    const description = document.getElementById("categoryStatusModalDescription");
    if (title) title.textContent = nextActive ? "確認啟用分類" : "確認停用分類";
    if (description) description.textContent = "確定要" + (nextActive ? "啟用" : "停用") + "「" + data.name + "」分類嗎？";

    if (statusModal) {
      statusModal.show();
      return;
    }

    if (window.confirm(description?.textContent || "確定要變更分類狀態嗎？")) applyStatusChange(row, nextActive);
    pendingStatusChange = null;
  }

  function applyStatusChange(row, nextActive) {
    const input = row.querySelector("[data-category-status]");
    if (input) input.checked = nextActive;
    syncStatusLabel(row);
    if (state.sortKey === "active") renderTable();
    showToast("分類狀態已更新");
  }

  function bindEvents() {
    createModal = document.getElementById("categoryCreateModal") && window.bootstrap?.Modal
      ? window.bootstrap.Modal.getOrCreateInstance(document.getElementById("categoryCreateModal"))
      : null;
    statusModal = document.getElementById("categoryStatusModal") && window.bootstrap?.Modal
      ? window.bootstrap.Modal.getOrCreateInstance(document.getElementById("categoryStatusModal"))
      : null;

    document.querySelectorAll("[data-category-filter]").forEach((input) => {
      input.addEventListener("input", () => {
        state.filters[input.dataset.categoryFilter] = input.value.trim();
        state.page = 1;
        renderTable();
      });
    });

    document.getElementById("categorySearchForm")?.addEventListener("submit", (event) => {
      event.preventDefault();
      state.page = 1;
      renderTable();
    });

    document.getElementById("categoryFilterReset")?.addEventListener("click", () => {
      document.querySelectorAll("[data-category-filter]").forEach((input) => {
        input.value = "";
        state.filters[input.dataset.categoryFilter] = "";
      });
      state.page = 1;
      renderTable();
    });

    document.querySelectorAll("[data-category-sort]").forEach((button) => {
      button.addEventListener("click", () => {
        const sortKey = button.dataset.categorySort;
        if (state.sortKey === sortKey) {
          state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
        } else {
          state.sortKey = sortKey;
          state.sortDir = "asc";
        }
        state.page = 1;
        renderTable();
      });
    });

    document.getElementById("categoryCreateForm")?.addEventListener("submit", handleCreateSubmit);
    document.getElementById("categoryCreateModal")?.addEventListener("hidden.bs.modal", () => {
      document.getElementById("categoryCreateForm")?.reset();
      setCreateInvalid();
    });
    document.getElementById("categoryCreateModal")?.addEventListener("shown.bs.modal", () => {
      document.getElementById("categoryCreateName")?.focus();
    });
    document.getElementById("categoryCreateName")?.addEventListener("input", () => setCreateInvalid());

    document.getElementById("categoryTableBody")?.addEventListener("change", (event) => {
      const input = event.target.closest("[data-category-status]");
      if (!input) return;

      const row = input.closest("[data-category-row]");
      const nextActive = input.checked;
      input.checked = !nextActive;
      openStatusConfirm(row, nextActive);
    });

    document.getElementById("categoryStatusConfirm")?.addEventListener("click", () => {
      if (!pendingStatusChange) return;
      applyStatusChange(pendingStatusChange.row, pendingStatusChange.nextActive);
      pendingStatusChange = null;
      statusModal?.hide();
    });

    document.getElementById("categoryStatusModal")?.addEventListener("hidden.bs.modal", () => {
      pendingStatusChange = null;
    });
  }

  function init() {
    if (!document.getElementById("articleCategoryView")) return;

    collectRows();
    bindEvents();
    renderTable();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
