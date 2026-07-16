(() => {
  "use strict";

  const state = {
    sortKey: "id",
    sortDir: "asc",
    filters: {
      id: "",
      account: "",
      nickname: "",
      permission: ""
    }
  };

  let rows = [];
  let originalPermissions = new Map();
  let emptyRow = null;

  function normalize(value) {
    return String(value || "").trim().toLowerCase();
  }

  function getCellText(row, key) {
    return row.querySelector('[data-permission-cell="' + key + '"]')?.textContent.trim() || row.dataset[key] || "";
  }

  function getCheckedPermissions(row) {
    return Array.from(row.querySelectorAll("[data-permission-check]:checked"))
      .map((checkbox) => checkbox.value)
      .sort();
  }

  function serializePermissions(permissions) {
    return permissions.slice().sort().join("|");
  }

  function collectRows() {
    rows = Array.from(document.querySelectorAll("[data-permission-row]"));
    originalPermissions = new Map(
      rows.map((row) => [row.dataset.id, serializePermissions(getCheckedPermissions(row))])
    );
  }

  function getPermissionTemplateValues() {
    const templateRow = document.querySelector("[data-permission-row]");
    return Array.from(templateRow?.querySelectorAll("[data-permission-check]") || [])
      .map((checkbox) => checkbox.value);
  }

  function buildPermissionRow(memberRow) {
    const row = document.createElement("tr");
    const id = memberRow.dataset.id || "";
    const account = memberRow.dataset.account || memberRow.querySelector('[data-member-cell="account"]')?.textContent.trim() || "";
    const nickname = memberRow.dataset.nickname || memberRow.querySelector('[data-member-cell="nickname"]')?.textContent.trim() || "";

    row.dataset.permissionRow = "";
    row.dataset.id = id;
    row.dataset.account = account;
    row.dataset.nickname = nickname;

    ["id", "account", "nickname"].forEach((key) => {
      const cell = document.createElement("td");
      cell.dataset.permissionCell = key;
      cell.textContent = { id, account, nickname }[key];
      row.appendChild(cell);
    });

    const permissionCell = document.createElement("td");
    const grid = document.createElement("div");
    permissionCell.className = "permission-cell";
    grid.className = "permission-check-grid";
    grid.setAttribute("aria-label", account + " 權限");

    getPermissionTemplateValues().forEach((permission) => {
      const label = document.createElement("label");
      const checkbox = document.createElement("input");
      label.className = "permission-check";
      checkbox.className = "form-check-input";
      checkbox.type = "checkbox";
      checkbox.dataset.permissionCheck = "";
      checkbox.value = permission;
      label.append(checkbox, document.createTextNode(permission));
      grid.appendChild(label);
    });

    permissionCell.appendChild(grid);
    row.appendChild(permissionCell);
    return row;
  }

  function syncRowsFromAdminTable() {
    const tableBody = document.getElementById("permissionTableBody");
    if (!tableBody) return;

    const existingIds = new Set(rows.map((row) => row.dataset.id));
    document.querySelectorAll("[data-member-row]").forEach((memberRow) => {
      const id = memberRow.dataset.id;
      if (!id || existingIds.has(id)) return;

      const row = buildPermissionRow(memberRow);
      tableBody.appendChild(row);
      rows.push(row);
      originalPermissions.set(id, serializePermissions(getCheckedPermissions(row)));
      existingIds.add(id);
    });
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

  function isRowDirty(row) {
    return originalPermissions.get(row.dataset.id) !== serializePermissions(getCheckedPermissions(row));
  }

  function updateSaveState() {
    const saveButton = document.getElementById("permissionSaveButton");
    let hasDirty = false;

    rows.forEach((row) => {
      const dirty = isRowDirty(row);
      row.classList.toggle("permission-row-dirty", dirty);
      hasDirty = hasDirty || dirty;
    });

    if (saveButton) saveButton.disabled = !hasDirty;
  }

  function matchesFilters(row) {
    const permissionKeyword = normalize(state.filters.permission);
    const checkedPermissionText = getCheckedPermissions(row).join(" ");

    return (!state.filters.id || normalize(getCellText(row, "id")).includes(normalize(state.filters.id)))
      && (!state.filters.account || normalize(getCellText(row, "account")).includes(normalize(state.filters.account)))
      && (!state.filters.nickname || normalize(getCellText(row, "nickname")).includes(normalize(state.filters.nickname)))
      && (!permissionKeyword || normalize(checkedPermissionText).includes(permissionKeyword));
  }

  function compareRows(rowA, rowB) {
    const valueA = getCellText(rowA, state.sortKey);
    const valueB = getCellText(rowB, state.sortKey);
    const result = state.sortKey === "id"
      ? (Number(valueA) || 0) - (Number(valueB) || 0)
      : valueA.localeCompare(valueB, "zh-Hant");

    return state.sortDir === "asc" ? result : -result;
  }

  function updateSortIcons() {
    document.querySelectorAll("[data-permission-sort]").forEach((button) => {
      const icon = button.querySelector("i");
      if (!icon) return;

      icon.className = button.dataset.permissionSort === state.sortKey
        ? "bi " + (state.sortDir === "asc" ? "bi-sort-down" : "bi-sort-up")
        : "bi bi-arrow-down-up";
    });
  }

  function ensureEmptyRow(tableBody) {
    if (emptyRow) return emptyRow;

    emptyRow = document.createElement("tr");
    emptyRow.className = "permission-empty-row d-none";
    const cell = document.createElement("td");
    cell.colSpan = 4;
    cell.textContent = "沒有符合條件的權限資料";
    emptyRow.appendChild(cell);
    tableBody.appendChild(emptyRow);
    return emptyRow;
  }

  function renderTable() {
    const tableBody = document.getElementById("permissionTableBody");
    const resultCount = document.getElementById("permissionResultCount");
    const pageInfo = document.getElementById("permissionPageInfo");
    if (!tableBody) return;

    const sortedRows = rows.slice().sort(compareRows);
    const visibleRows = sortedRows.filter(matchesFilters);
    sortedRows.forEach((row) => tableBody.appendChild(row));
    const empty = ensureEmptyRow(tableBody);
    tableBody.appendChild(empty);

    sortedRows.forEach((row) => {
      row.classList.toggle("d-none", !visibleRows.includes(row));
    });
    empty.classList.toggle("d-none", visibleRows.length > 0);

    if (resultCount) resultCount.textContent = "共 " + visibleRows.length + " 筆";
    if (pageInfo) pageInfo.textContent = visibleRows.length ? "顯示 " + visibleRows.length + " 筆" : "沒有符合條件的權限資料";
    updateSortIcons();
    updateSaveState();
  }

  function showPermissionView() {
    syncRowsFromAdminTable();
    document.getElementById("memberManagementView")?.classList.add("d-none");
    document.getElementById("memberDetailView")?.classList.add("d-none");
    document.getElementById("permissionManagementView")?.classList.remove("d-none");

    const title = document.getElementById("managementTitle");
    const description = document.getElementById("managementDescription");
    if (title) title.textContent = "權限管理";
    if (description) description.textContent = "管理各管理員帳號可使用的後台功能權限。";
    renderTable();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function showAdminView() {
    document.getElementById("permissionManagementView")?.classList.add("d-none");
    document.getElementById("memberManagementView")?.classList.remove("d-none");
    document.getElementById("memberDetailView")?.classList.add("d-none");

    const title = document.getElementById("managementTitle");
    const description = document.getElementById("managementDescription");
    if (title) title.textContent = "管理員管理";
    if (description) description.textContent = "管理後台管理員帳號、權限與個人資料維護。";
    window.PawPuffMemberManagement?.renderTable();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function bindEvents() {
    document.getElementById("permissionManageOpen")?.addEventListener("click", showPermissionView);
    document.getElementById("permissionBackToAdmin")?.addEventListener("click", showAdminView);

    document.querySelectorAll("[data-permission-filter]").forEach((input) => {
      const updateFilter = () => {
        state.filters[input.dataset.permissionFilter] = input.value.trim();
        renderTable();
      };

      input.addEventListener("input", updateFilter);
      input.addEventListener("change", updateFilter);
    });

    document.getElementById("permissionSearchForm")?.addEventListener("submit", (event) => {
      event.preventDefault();
      renderTable();
    });

    document.getElementById("permissionFilterReset")?.addEventListener("click", () => {
      document.querySelectorAll("[data-permission-filter]").forEach((input) => {
        input.value = "";
        state.filters[input.dataset.permissionFilter] = "";
      });
      renderTable();
    });

    document.querySelectorAll("[data-permission-sort]").forEach((button) => {
      button.addEventListener("click", () => {
        const sortKey = button.dataset.permissionSort;
        if (state.sortKey === sortKey) {
          state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
        } else {
          state.sortKey = sortKey;
          state.sortDir = "asc";
        }
        renderTable();
      });
    });

    document.getElementById("permissionTableBody")?.addEventListener("change", (event) => {
      if (!event.target.matches("[data-permission-check]")) return;
      updateSaveState();
    });

    document.getElementById("permissionSaveButton")?.addEventListener("click", () => {
      rows.forEach((row) => {
        originalPermissions.set(row.dataset.id, serializePermissions(getCheckedPermissions(row)));
      });
      updateSaveState();
      showToast("權限設定已儲存");
    });
  }

  function init() {
    if (!document.getElementById("permissionManagementView")) return;

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
