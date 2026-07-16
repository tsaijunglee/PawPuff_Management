(() => {
  "use strict";

  const state = {
    page: 1,
    pageSize: 10,
    sortKey: "id",
    sortDir: "asc",
    filters: {
      account: "",
      body: "",
      accessory: "",
      color: ""
    }
  };

  const refs = {};
  let rows = [];

  function normalize(value) {
    return String(value || "").trim().toLowerCase();
  }

  function nonNullValues(values) {
    return values.filter((value) => value && value !== "NULL");
  }

  function getCombinationData(row) {
    const accessories = [
      row.dataset.accessory1 || "",
      row.dataset.accessory2 || "",
      row.dataset.accessory3 || ""
    ];
    const colors = [
      row.dataset.bodyColor || "",
      row.dataset.accessory1Color || "",
      row.dataset.accessory2Color || "",
      row.dataset.accessory3Color || ""
    ];

    return {
      id: Number(row.dataset.id) || 0,
      account: row.dataset.account || "",
      body: row.dataset.body || "",
      accessory1: row.dataset.accessory1 || "",
      accessory2: row.dataset.accessory2 || "",
      accessory3: row.dataset.accessory3 || "",
      accessories: nonNullValues(accessories).join(" "),
      colors: nonNullValues(colors).join(" ")
    };
  }

  function collectRows() {
    rows = Array.from(refs.tableBody?.querySelectorAll("[data-owned-combination-row]") || []);
  }

  function matchesFilters(row) {
    const data = getCombinationData(row);
    return (!state.filters.account || normalize(data.account).includes(normalize(state.filters.account)))
      && (!state.filters.body || normalize(data.body).includes(normalize(state.filters.body)))
      && (!state.filters.accessory || normalize(data.accessories).includes(normalize(state.filters.accessory)))
      && (!state.filters.color || normalize(data.colors).includes(normalize(state.filters.color)));
  }

  function getSortValue(row, key) {
    const data = getCombinationData(row);
    if (key === "id") return data.id;
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
    document.querySelectorAll("[data-owned-combination-sort]").forEach((button) => {
      const icon = button.querySelector("i");
      if (!icon) return;

      icon.className = button.dataset.ownedCombinationSort === state.sortKey
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
    row.dataset.ownedCombinationEmpty = "true";
    const cell = document.createElement("td");
    cell.colSpan = 7;
    cell.textContent = "查無符合條件的持有組合資料";
    row.appendChild(cell);
    return row;
  }

  function renderTable() {
    if (!refs.tableBody) return;

    refs.tableBody.querySelector("[data-owned-combination-empty]")?.remove();
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
        : "沒有符合條件的持有組合";
    }
    renderPagination(totalPages);
    updateSortIcons();
  }

  function bindEvents() {
    document.querySelectorAll("[data-owned-combination-filter]").forEach((input) => {
      const update = () => {
        state.filters[input.dataset.ownedCombinationFilter] = input.value.trim();
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
      document.querySelectorAll("[data-owned-combination-filter]").forEach((input) => {
        input.value = "";
        state.filters[input.dataset.ownedCombinationFilter] = "";
      });
      state.page = 1;
      renderTable();
    });

    document.querySelectorAll("[data-owned-combination-sort]").forEach((button) => {
      button.addEventListener("click", () => {
        const sortKey = button.dataset.ownedCombinationSort;
        if (state.sortKey === sortKey) state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
        else {
          state.sortKey = sortKey;
          state.sortDir = "asc";
        }
        state.page = 1;
        renderTable();
      });
    });
  }

  function init() {
    Object.assign(refs, {
      searchForm: document.getElementById("ownedCombinationSearchForm"),
      tableBody: document.getElementById("ownedCombinationTableBody"),
      pagination: document.getElementById("ownedCombinationPagination"),
      pageInfo: document.getElementById("ownedCombinationPageInfo"),
      resultCount: document.getElementById("ownedCombinationResultCount"),
      reset: document.getElementById("ownedCombinationFilterReset")
    });

    if (!refs.tableBody) return;
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
