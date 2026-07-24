(() => {
  "use strict";

  const pageSize = 10;

  function normalize(value) {
    return String(value || "").trim().toLowerCase();
  }

  function parseMinutes(value) {
    const match = String(value || "").match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return -1;
    return Number(match[1]) * 60 + Number(match[2]);
  }

  function parseDateKey(value) {
    return Date.parse(String(value || "").replaceAll("/", "-")) || 0;
  }

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function getNowParts() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    return {
      dateKey: year + "-" + pad(month) + "-" + pad(day),
      workDate: year + "/" + month + "/" + day,
      time: now.getHours() + ":" + pad(now.getMinutes())
    };
  }

  function showToast(message) {
    const toastElement = document.getElementById("actionToast");
    const toastMessage = document.getElementById("toastMessage");
    if (toastMessage) toastMessage.textContent = message;
    if (toastElement && window.bootstrap?.Toast) {
      bootstrap.Toast.getOrCreateInstance(toastElement, { delay: 1800 }).show();
    }
  }

  function renderPagination(pagination, totalPages, state, renderTable) {
    if (!pagination) return;

    pagination.innerHTML = "";
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
      pagination.appendChild(item);
    };

    addButton('<i class="bi bi-chevron-left"></i>', Math.max(state.page - 1, 1), state.page === 1);
    for (let page = 1; page <= totalPages; page += 1) {
      addButton(String(page), page, false, page === state.page);
    }
    addButton('<i class="bi bi-chevron-right"></i>', Math.min(state.page + 1, totalPages), state.page === totalPages);
  }

  function getEmptyRow(message, colSpan) {
    const row = document.createElement("tr");
    row.className = "member-empty-row";
    row.dataset.attendanceEmpty = "true";
    const cell = document.createElement("td");
    cell.colSpan = colSpan;
    cell.textContent = message;
    row.appendChild(cell);
    return row;
  }

  function updateSortIcons(selector, activeKey, sortDir) {
    document.querySelectorAll(selector).forEach((button) => {
      const icon = button.querySelector("i");
      if (!icon) return;
      const sortKey = button.dataset.dashboardAttendanceSort || button.dataset.attendanceRecordSort;
      icon.className = sortKey === activeKey
        ? "bi " + (sortDir === "asc" ? "bi-sort-up" : "bi-sort-down")
        : "bi bi-arrow-down-up";
    });
  }

    function initDashboardAttendance() {
        const attendancePanel =
            document.getElementById(
                "dashboardAttendance"
            );

        const tableBody =
            document.getElementById(
                "dashboardAttendanceTableBody"
            );

        if (!attendancePanel || !tableBody) {
            return;
        }

        const recordsUrl =
            attendancePanel.dataset.recordsUrl;

        const clockInUrl =
            attendancePanel.dataset.clockInUrl;

        const clockOutUrl =
            attendancePanel.dataset.clockOutUrl;

        const token =
            attendancePanel.querySelector(
                'input[name="__RequestVerificationToken"]'
            )?.value;

    const refs = {
      tableBody,
      pagination: document.getElementById("dashboardAttendancePagination"),
      pageInfo: document.getElementById("dashboardAttendancePageInfo"),
      resultCount: document.getElementById("dashboardAttendanceResultCount"),
      clockIn: document.getElementById("dashboardClockInBtn"),
      clockOut: document.getElementById("dashboardClockOutBtn"),
      status: document.getElementById("dashboardAttendanceStatus"),
      clockInStatus: document.getElementById("dashboardClockInStatus"),
      clockOutStatus: document.getElementById("dashboardClockOutStatus")
    };
    const state = { page: 1, sortKey: "date", sortDir: "desc" };
    let rows = Array.from(refs.tableBody.querySelectorAll("[data-dashboard-attendance-row]"));

    function getData(row) {
      return {
        date: row.dataset.dateKey || "",
        workDate: row.dataset.workDate || "",
        clockIn: row.dataset.clockIn || "",
        clockOut: row.dataset.clockOut || ""
        };
        }

        async function loadClockRecords() {
            if (!recordsUrl) {
                showToast("找不到打卡紀錄 API。");
                return;
            }

            try {
                const response = await fetch(
                    recordsUrl,
                    {
                        method: "GET",
                        headers: {
                            "Accept": "application/json"
                        }
                    }
                );

                const result = await response
                    .json()
                    .catch(() => ({}));

                if (!response.ok) {
                    throw new Error(
                        result.message ||
                        "取得打卡紀錄失敗。"
                    );
                }

                refs.tableBody.innerHTML = "";

                (result.records || []).forEach(
                    record => {
                        const row =
                            document.createElement("tr");

                        row.dataset
                            .dashboardAttendanceRow = "";

                        row.dataset.dateKey =
                            record.workDate;

                        row.dataset.workDate =
                            record.workDate
                                .replaceAll("-", "/");

                        row.dataset.clockIn =
                            record.clockIn || "";

                        row.dataset.clockOut =
                            record.clockOut || "";

                        row.innerHTML = `
                    <td data-dashboard-attendance-cell="date"></td>
                    <td data-dashboard-attendance-cell="clockIn"></td>
                    <td data-dashboard-attendance-cell="clockOut"></td>
                `;

                        setCell(
                            row,
                            "date",
                            row.dataset.workDate
                        );

                        setCell(
                            row,
                            "clockIn",
                            row.dataset.clockIn
                        );

                        setCell(
                            row,
                            "clockOut",
                            row.dataset.clockOut
                        );

                        refs.tableBody.appendChild(row);
                    }
                );

                rows = Array.from(
                    refs.tableBody.querySelectorAll(
                        "[data-dashboard-attendance-row]"
                    )
                );

                state.page = 1;
                renderTable();
            } catch (error) {
                showToast(
                    error.message ||
                    "取得打卡紀錄失敗。"
                );
            }
        }

    function getSortValue(row, key) {
      const data = getData(row);
      if (key === "date") return parseDateKey(data.date);
      if (key === "clockIn") return parseMinutes(data.clockIn);
      if (key === "clockOut") return parseMinutes(data.clockOut);
      return data[key] || "";
    }

    function getSortedRows() {
      const dir = state.sortDir === "asc" ? 1 : -1;
      return rows.slice().sort((rowA, rowB) => {
        const valueA = getSortValue(rowA, state.sortKey);
        const valueB = getSortValue(rowB, state.sortKey);
        return (Number(valueA) - Number(valueB)) * dir;
      });
    }

    function updateStatus() {
      const today = getNowParts();
      const todayRow = rows.find((row) => row.dataset.dateKey === today.dateKey);
      const data = todayRow ? getData(todayRow) : null;

      if (!data) {
        refs.status?.classList.remove("is-active");
        if (refs.status) refs.status.innerHTML = '<i class="bi bi-person-dash"></i>今日狀態：未打卡';
        if (refs.clockInStatus) refs.clockInStatus.innerHTML = '<i class="bi bi-clock"></i>上班 尚未打卡';
        if (refs.clockOutStatus) refs.clockOutStatus.innerHTML = '<i class="bi bi-box-arrow-right"></i>下班 尚未打卡';
        return;
      }

      if (refs.status) {
        refs.status.classList.add("is-active");
        refs.status.innerHTML = data.clockOut
          ? '<i class="bi bi-person-check"></i>今日狀態：已完成打卡'
          : '<i class="bi bi-person-check"></i>今日狀態：已上班';
      }
      if (refs.clockInStatus) refs.clockInStatus.innerHTML = '<i class="bi bi-clock"></i>上班 ' + (data.clockIn || "尚未打卡");
      if (refs.clockOutStatus) refs.clockOutStatus.innerHTML = '<i class="bi bi-box-arrow-right"></i>下班 ' + (data.clockOut || "尚未打卡");
    }

    function renderTable() {
      refs.tableBody.querySelector("[data-attendance-empty]")?.remove();
      const sortedRows = getSortedRows();
      const totalPages = Math.max(Math.ceil(sortedRows.length / pageSize), 1);
      state.page = Math.min(state.page, totalPages);
      const startIndex = (state.page - 1) * pageSize;
      const pageRows = sortedRows.slice(startIndex, startIndex + pageSize);
      const endIndex = startIndex + pageRows.length;

      rows.forEach((row) => row.classList.add("d-none"));
      if (!pageRows.length) {
        refs.tableBody.appendChild(getEmptyRow("目前沒有打卡紀錄", 3));
      } else {
        pageRows.forEach((row) => {
          row.classList.remove("d-none");
          refs.tableBody.appendChild(row);
        });
      }

      if (refs.resultCount) refs.resultCount.textContent = "共 " + sortedRows.length + " 筆";
      if (refs.pageInfo) {
        refs.pageInfo.textContent = sortedRows.length
          ? "第 " + state.page + " / " + totalPages + " 頁・顯示 " + (startIndex + 1) + "-" + endIndex + " 筆"
          : "目前沒有打卡紀錄";
      }
      renderPagination(refs.pagination, totalPages, state, renderTable);
      updateSortIcons("[data-dashboard-attendance-sort]", state.sortKey, state.sortDir);
      updateStatus();
    }

    function setCell(row, cellName, value) {
      const cell = row.querySelector('[data-dashboard-attendance-cell="' + cellName + '"]');
      if (cell) cell.textContent = value || "尚未打卡";
    }

    function createTodayRow(today) {
      const row = document.createElement("tr");
      row.dataset.dashboardAttendanceRow = "";
      row.dataset.dateKey = today.dateKey;
      row.dataset.workDate = today.workDate;
      row.dataset.clockIn = today.time;
      row.dataset.clockOut = "";
      row.innerHTML = '<td data-dashboard-attendance-cell="date"></td><td data-dashboard-attendance-cell="clockIn"></td><td data-dashboard-attendance-cell="clockOut"></td>';
      setCell(row, "date", today.workDate);
      setCell(row, "clockIn", today.time);
      setCell(row, "clockOut", "");
      refs.tableBody.prepend(row);
      rows = Array.from(refs.tableBody.querySelectorAll("[data-dashboard-attendance-row]"));
      return row;
    }


        refs.clockIn?.addEventListener(
            "click",
            async () => {
                if (!clockInUrl) {
                    showToast(
                        "找不到上班打卡 API。"
                    );

                    return;
                }

                refs.clockIn.disabled = true;

                try {
                    const response = await fetch(
                        clockInUrl,
                        {
                            method: "POST",
                            headers: {
                                "RequestVerificationToken":
                                    token || ""
                            }
                        }
                    );

                    const result = await response
                        .json()
                        .catch(() => ({}));

                    if (!response.ok) {
                        throw new Error(
                            result.message ||
                            "上班打卡失敗。"
                        );
                    }

                    showToast(
                        result.message ||
                        "上班打卡成功。"
                    );

                    await loadClockRecords();
                } catch (error) {
                    showToast(
                        error.message ||
                        "上班打卡失敗。"
                    );
                } finally {
                    refs.clockIn.disabled = false;
                }
            }
        );



        refs.clockOut?.addEventListener(
            "click",
            async () => {
                if (!clockOutUrl) {
                    showToast(
                        "找不到下班打卡 API。"
                    );

                    return;
                }

                refs.clockOut.disabled = true;

                try {
                    const response = await fetch(
                        clockOutUrl,
                        {
                            method: "POST",
                            headers: {
                                "RequestVerificationToken":
                                    token || ""
                            }
                        }
                    );

                    const result = await response
                        .json()
                        .catch(() => ({}));

                    if (!response.ok) {
                        throw new Error(
                            result.message ||
                            "下班打卡失敗。"
                        );
                    }

                    showToast(
                        result.message ||
                        "下班打卡成功。"
                    );

                    await loadClockRecords();
                } catch (error) {
                    showToast(
                        error.message ||
                        "下班打卡失敗。"
                    );
                } finally {
                    refs.clockOut.disabled = false;
                }
            }
        );








    document.querySelectorAll("[data-dashboard-attendance-sort]").forEach((button) => {
      button.addEventListener("click", () => {
        const sortKey = button.dataset.dashboardAttendanceSort;
        if (state.sortKey === sortKey) state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
        else {
          state.sortKey = sortKey;
          state.sortDir = sortKey === "date" ? "desc" : "asc";
        }
        state.page = 1;
        renderTable();
      });
    });

        loadClockRecords();
  }

  function initAllAttendanceRecords() {
    const tableBody = document.getElementById("attendanceRecordsTableBody");
    if (!tableBody) return;

    const refs = {
      tableBody,
      searchForm: document.getElementById("attendanceRecordsSearchForm"),
      reset: document.getElementById("attendanceRecordsFilterReset"),
      pagination: document.getElementById("attendanceRecordsPagination"),
      pageInfo: document.getElementById("attendanceRecordsPageInfo"),
      resultCount: document.getElementById("attendanceRecordsResultCount")
    };
    const state = {
      page: 1,
      sortKey: "date",
      sortDir: "desc",
      filters: { admin: "", date: "" }
    };
    const rows = Array.from(refs.tableBody.querySelectorAll("[data-attendance-record-row]"));

    function getData(row) {
      return {
        admin: row.dataset.admin || "",
        date: row.dataset.dateKey || "",
        workDate: row.dataset.workDate || "",
        clockIn: row.dataset.clockIn || "",
        clockOut: row.dataset.clockOut || ""
      };
      }


      async function loadClockRecords() {
          if (!recordsUrl) {
              showToast("找不到打卡紀錄 API。");
              return;
          }

          try {
              const response = await fetch(
                  recordsUrl,
                  {
                      method: "GET",
                      headers: {
                          "Accept": "application/json"
                      }
                  }
              );

              const result = await response
                  .json()
                  .catch(() => ({}));

              if (!response.ok) {
                  throw new Error(
                      result.message ||
                      "取得打卡紀錄失敗。"
                  );
              }

              refs.tableBody.innerHTML = "";

              (result.records || []).forEach(
                  record => {
                      const row =
                          document.createElement("tr");

                      row.dataset
                          .dashboardAttendanceRow = "";

                      row.dataset.dateKey =
                          record.workDate;

                      row.dataset.workDate =
                          record.workDate.replaceAll(
                              "-",
                              "/"
                          );

                      row.dataset.clockIn =
                          record.clockIn || "";

                      row.dataset.clockOut =
                          record.clockOut || "";

                      row.innerHTML = `
                    <td data-dashboard-attendance-cell="date"></td>
                    <td data-dashboard-attendance-cell="clockIn"></td>
                    <td data-dashboard-attendance-cell="clockOut"></td>
                `;

                      setCell(
                          row,
                          "date",
                          row.dataset.workDate
                      );

                      setCell(
                          row,
                          "clockIn",
                          row.dataset.clockIn
                      );

                      setCell(
                          row,
                          "clockOut",
                          row.dataset.clockOut
                      );

                      refs.tableBody.appendChild(row);
                  }
              );

              rows = Array.from(
                  refs.tableBody.querySelectorAll(
                      "[data-dashboard-attendance-row]"
                  )
              );

              state.page = 1;
              renderTable();
          } catch (error) {
              showToast(
                  error.message ||
                  "取得打卡紀錄失敗。"
              );
          }
      }



    function matchesFilters(row) {
      const data = getData(row);
      return (!state.filters.admin || normalize(data.admin).includes(normalize(state.filters.admin)))
        && (!state.filters.date || data.date === state.filters.date);
    }

    function getSortValue(row, key) {
      const data = getData(row);
      if (key === "date") return parseDateKey(data.date);
      if (key === "clockIn") return parseMinutes(data.clockIn);
      if (key === "clockOut") return parseMinutes(data.clockOut);
      return data[key] || "";
    }

    function getFilteredRows() {
      const dir = state.sortDir === "asc" ? 1 : -1;
      return rows.filter(matchesFilters).sort((rowA, rowB) => {
        const valueA = getSortValue(rowA, state.sortKey);
        const valueB = getSortValue(rowB, state.sortKey);

        if (typeof valueA === "number" || typeof valueB === "number") {
          const result = ((Number(valueA) || 0) - (Number(valueB) || 0)) * dir;
          if (result !== 0) return result;
        } else {
          const result = String(valueA).localeCompare(String(valueB), "zh-Hant") * dir;
          if (result !== 0) return result;
        }

        return String(rowA.dataset.admin || "").localeCompare(String(rowB.dataset.admin || ""), "zh-Hant");
      });
    }

    function renderTable() {
      refs.tableBody.querySelector("[data-attendance-empty]")?.remove();
      const filteredRows = getFilteredRows();
      const totalPages = Math.max(Math.ceil(filteredRows.length / pageSize), 1);
      state.page = Math.min(state.page, totalPages);
      const startIndex = (state.page - 1) * pageSize;
      const pageRows = filteredRows.slice(startIndex, startIndex + pageSize);
      const endIndex = startIndex + pageRows.length;

      rows.forEach((row) => row.classList.add("d-none"));
      if (!pageRows.length) {
        refs.tableBody.appendChild(getEmptyRow("查無符合條件的打卡紀錄", 4));
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
          : "沒有符合條件的打卡紀錄";
      }
      renderPagination(refs.pagination, totalPages, state, renderTable);
      updateSortIcons("[data-attendance-record-sort]", state.sortKey, state.sortDir);
    }

    document.querySelectorAll("[data-attendance-record-filter]").forEach((input) => {
      const update = () => {
        state.filters[input.dataset.attendanceRecordFilter] = input.value.trim();
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
      document.querySelectorAll("[data-attendance-record-filter]").forEach((input) => {
        input.value = "";
        state.filters[input.dataset.attendanceRecordFilter] = "";
      });
      state.page = 1;
      renderTable();
    });

    document.querySelectorAll("[data-attendance-record-sort]").forEach((button) => {
      button.addEventListener("click", () => {
        const sortKey = button.dataset.attendanceRecordSort;
        if (state.sortKey === sortKey) state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
        else {
          state.sortKey = sortKey;
          state.sortDir = sortKey === "date" ? "desc" : "asc";
        }
        state.page = 1;
        renderTable();
      });
    });

    renderTable();
  }

  function init() {
    initDashboardAttendance();
    initAllAttendanceRecords();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
