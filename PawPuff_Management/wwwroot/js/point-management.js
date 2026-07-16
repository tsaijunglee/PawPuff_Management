(() => {
  "use strict";

  const state = {
    page: 1,
    pageSize: 10,
    sortKey: "changedAt",
    sortDir: "desc",
    filters: {
      account: "",
      rule: "",
      dateStart: "",
      dateEnd: ""
    }
  };

  const refs = {};
  const accountBalances = new Map();
  let rows = [];
  let createModal = null;

  function normalize(value) {
    return String(value || "").trim().toLowerCase();
  }

  function formatNumber(value) {
    return new Intl.NumberFormat("zh-Hant-TW").format(Number(value) || 0);
  }

  function formatSigned(value) {
    const numericValue = Number(value) || 0;
    if (numericValue > 0) return "+" + formatNumber(numericValue);
    if (numericValue < 0) return "-" + formatNumber(Math.abs(numericValue));
    return "0";
  }

  function formatDateTime(date) {
    const pad = (value) => String(value).padStart(2, "0");
    return [
      date.getFullYear(),
      pad(date.getMonth() + 1),
      pad(date.getDate())
    ].join("-") + " " + [
      pad(date.getHours()),
      pad(date.getMinutes()),
      pad(date.getSeconds())
    ].join(":");
  }

  function parseDateTime(value) {
    return Date.parse(String(value || "").replace(" ", "T")) || 0;
  }

  function parseDateStart(value) {
    return value ? Date.parse(value + "T00:00:00") : null;
  }

  function parseDateEnd(value) {
    return value ? Date.parse(value + "T23:59:59") : null;
  }

  function getPointData(row) {
    return {
      id: Number(row.dataset.id) || 0,
      account: row.dataset.account || "",
      rule: row.dataset.rule || "",
      change: Number(row.dataset.change) || 0,
      balance: Number(row.dataset.balance) || 0,
      description: row.dataset.description || "",
      changedAt: row.dataset.changedAt || "",
      admin: row.dataset.admin || "NULL",
      order: row.dataset.order || "NULL"
    };
  }

  function collectRows() {
    rows = Array.from(refs.tableBody?.querySelectorAll("[data-point-row]") || []);
  }

  function collectAccountBalances() {
    document.querySelectorAll("#pointAccountOptions option").forEach((option) => {
      const account = option.value.trim();
      if (!account) return;
      accountBalances.set(account, Number(option.dataset.balance) || 0);
    });
  }

  function matchesFilters(row) {
    const data = getPointData(row);
    const changedAt = parseDateTime(data.changedAt);
    const dateStart = parseDateStart(state.filters.dateStart);
    const dateEnd = parseDateEnd(state.filters.dateEnd);

    return (!state.filters.account || normalize(data.account).includes(normalize(state.filters.account)))
      && (!state.filters.rule || data.rule === state.filters.rule)
      && (dateStart === null || changedAt >= dateStart)
      && (dateEnd === null || changedAt <= dateEnd);
  }

  function getSortValue(row, key) {
    const data = getPointData(row);
    if (key === "change" || key === "balance" || key === "id") return Number(data[key]) || 0;
    if (key === "changedAt") return parseDateTime(data.changedAt);
    return data[key] || "";
  }

  function getFilteredRows() {
    const dir = state.sortDir === "asc" ? 1 : -1;
    return rows.filter(matchesFilters).sort((rowA, rowB) => {
      const valueA = getSortValue(rowA, state.sortKey);
      const valueB = getSortValue(rowB, state.sortKey);

      if (typeof valueA === "number" || typeof valueB === "number") {
        return ((Number(valueA) || 0) - (Number(valueB) || 0)) * dir;
      }

      return String(valueA).localeCompare(String(valueB), "zh-Hant") * dir;
    });
  }

  function updateSortIcons() {
    document.querySelectorAll("[data-point-sort]").forEach((button) => {
      const icon = button.querySelector("i");
      if (!icon) return;

      icon.className = button.dataset.pointSort === state.sortKey
        ? "bi " + (state.sortDir === "asc" ? "bi-sort-up" : "bi-sort-down")
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
    row.className = "member-empty-row";
    row.dataset.pointEmpty = "true";
    const cell = document.createElement("td");
    cell.colSpan = 8;
    cell.textContent = "查無符合條件的點數異動資料";
    row.appendChild(cell);
    return row;
  }

  function renderTable() {
    if (!refs.tableBody) return;

    refs.tableBody.querySelector("[data-point-empty]")?.remove();
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
        : "沒有符合條件的點數異動";
    }
    renderPagination(totalPages);
    updateSortIcons();
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

  function getAccountOption(account) {
    return Array.from(document.querySelectorAll("#pointAccountOptions option"))
      .find((option) => option.value.trim() === account);
  }

  function getNextId() {
    return rows.reduce((maxId, row) => Math.max(maxId, Number(row.dataset.id) || 0), 0) + 1;
  }

  function createCell(cellName, content) {
    const cell = document.createElement("td");
    cell.dataset.pointCell = cellName;
    if (content instanceof Node) cell.appendChild(content);
    else cell.textContent = content;
    return cell;
  }

  function createNullCell(cellName) {
    const span = document.createElement("span");
    span.className = "point-null";
    span.setAttribute("aria-label", "NULL");
    span.textContent = "—";
    return createCell(cellName, span);
  }

  function createChangeCell(change) {
    const span = document.createElement("span");
    span.className = "point-change " + (change > 0 ? "is-positive" : "is-negative");
    span.textContent = formatSigned(change);
    return createCell("change", span);
  }

  function createPointRow(record) {
    const row = document.createElement("tr");
    row.dataset.pointRow = "";
    row.dataset.id = String(record.id);
    row.dataset.account = record.account;
    row.dataset.rule = record.rule;
    row.dataset.change = String(record.change);
    row.dataset.balance = String(record.balance);
    row.dataset.description = record.description;
    row.dataset.changedAt = record.changedAt;
    row.dataset.admin = record.admin;
    row.dataset.order = record.order;

    row.appendChild(createCell("account", record.account));
    row.appendChild(createCell("rule", record.rule));
    row.appendChild(createChangeCell(record.change));
    row.appendChild(createCell("balance", formatNumber(record.balance)));
    row.appendChild(createCell("description", record.description));
    row.appendChild(createCell("changedAt", record.changedAt));
    row.appendChild(record.admin === "NULL" ? createNullCell("admin") : createCell("admin", record.admin));
    row.appendChild(record.order === "NULL" ? createNullCell("order") : createCell("order", record.order));

    return row;
  }

  function resetCreateForm() {
    refs.createForm?.reset();
    refs.createForm?.classList.remove("was-validated");
    refs.createForm?.querySelectorAll("input, textarea").forEach((field) => field.setCustomValidity(""));
  }

  function handleCreateSubmit(event) {
    event.preventDefault();

    const accountInput = document.getElementById("pointCreateAccount");
    const changeInput = document.getElementById("pointCreateChange");
    const descriptionInput = document.getElementById("pointCreateDescription");
    const account = accountInput.value.trim();
    const change = Number(changeInput.value);
    const description = descriptionInput.value.trim();
    const accountOption = getAccountOption(account);

    accountInput.setCustomValidity(accountOption ? "" : "請選擇假資料中存在的帳號。");
    changeInput.setCustomValidity(Number.isFinite(change) && change !== 0 ? "" : "請輸入不可為 0 的點數變化。");
    descriptionInput.setCustomValidity(description ? "" : "請輸入描述。");
    refs.createForm.classList.add("was-validated");
    if (!refs.createForm.checkValidity()) return;

    const previousBalance = accountBalances.get(account) ?? (Number(accountOption.dataset.balance) || 0);
    const nextBalance = previousBalance + change;
    const rule = change > 0 ? "管理員給予" : "管理員扣除";
    const actorAdmin = document.getElementById("pointManagementView")?.dataset.actorAdminAccount || "admin01";
    const record = {
      id: getNextId(),
      account,
      rule,
      change,
      balance: nextBalance,
      description,
      changedAt: formatDateTime(new Date()),
      admin: actorAdmin,
      order: "NULL"
    };

    accountBalances.set(account, nextBalance);
    accountOption.dataset.balance = String(nextBalance);
    accountOption.textContent = "目前點數 " + formatNumber(nextBalance);

    const row = createPointRow(record);
    refs.tableBody.appendChild(row);
    rows.push(row);
    state.sortKey = "changedAt";
    state.sortDir = "desc";
    state.page = 1;
    renderTable();
    createModal?.hide();
    showToast("已新增點數變更紀錄");
  }

  function bindEvents() {
    document.querySelectorAll("[data-point-filter]").forEach((input) => {
      const update = () => {
        state.filters[input.dataset.pointFilter] = input.value.trim();
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
      document.querySelectorAll("[data-point-filter]").forEach((input) => {
        input.value = "";
        state.filters[input.dataset.pointFilter] = "";
      });
      state.page = 1;
      renderTable();
    });

    document.querySelectorAll("[data-point-sort]").forEach((button) => {
      button.addEventListener("click", () => {
        const sortKey = button.dataset.pointSort;
        if (state.sortKey === sortKey) state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
        else {
          state.sortKey = sortKey;
          state.sortDir = sortKey === "changedAt" ? "desc" : "asc";
        }
        state.page = 1;
        renderTable();
      });
    });

    refs.createForm?.addEventListener("submit", handleCreateSubmit);
    document.getElementById("pointCreateModal")?.addEventListener("hidden.bs.modal", resetCreateForm);
    refs.createForm?.querySelectorAll("input, textarea").forEach((field) => {
      field.addEventListener("input", () => field.setCustomValidity(""));
    });
  }

  function init() {
    Object.assign(refs, {
      searchForm: document.getElementById("pointSearchForm"),
      tableBody: document.getElementById("pointTableBody"),
      pagination: document.getElementById("pointPagination"),
      pageInfo: document.getElementById("pointPageInfo"),
      resultCount: document.getElementById("pointResultCount"),
      reset: document.getElementById("pointFilterReset"),
      createForm: document.getElementById("pointCreateForm")
    });

    if (!refs.tableBody) return;
    createModal = document.getElementById("pointCreateModal") && window.bootstrap?.Modal
      ? window.bootstrap.Modal.getOrCreateInstance(document.getElementById("pointCreateModal"))
      : null;
    collectRows();
    collectAccountBalances();
    bindEvents();
    renderTable();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
