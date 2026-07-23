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
    let rows = [];
    let createModal = null;

    function normalize(value) {
        return String(value ?? "").trim().toLocaleLowerCase("zh-Hant-TW");
    }

    function formatNumber(value) {
        const numericValue = Number(value);
        return new Intl.NumberFormat("zh-Hant-TW").format(
            Number.isFinite(numericValue) ? numericValue : 0
        );
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
            pad(date.getMinutes())
        ].join(":");
    }

    function formatServerDateTime(value) {
        const date = new Date(value);
        if (!Number.isNaN(date.getTime())) return formatDateTime(date);

        return String(value ?? "")
            .replace("T", " ")
            .slice(0, 16);
    }

    function parseDateTime(value) {
        return Date.parse(String(value ?? "").replace(" ", "T")) || 0;
    }

    function parseDateStart(value) {
        return value ? Date.parse(value + "T00:00:00") : null;
    }

    function parseDateEnd(value) {
        return value ? Date.parse(value + "T23:59:59.999") : null;
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
        rows = Array.from(
            refs.tableBody?.querySelectorAll("[data-point-row]") || []
        );
    }

    function matchesFilters(row) {
        const data = getPointData(row);
        const changedAt = parseDateTime(data.changedAt);
        const dateStart = parseDateStart(state.filters.dateStart);
        const dateEnd = parseDateEnd(state.filters.dateEnd);

        return (
            (!state.filters.account ||
                normalize(data.account).includes(normalize(state.filters.account))) &&
            (!state.filters.rule || data.rule === state.filters.rule) &&
            (dateStart === null || changedAt >= dateStart) &&
            (dateEnd === null || changedAt <= dateEnd)
        );
    }

    function getSortValue(row, key) {
        const data = getPointData(row);

        if (key === "change" || key === "balance" || key === "id") {
            return Number(data[key]) || 0;
        }

        if (key === "changedAt") return parseDateTime(data.changedAt);

        if (key === "order") {
            return data.order === "NULL"
                ? Number.MAX_SAFE_INTEGER
                : Number(data.order);
        }

        return data[key] || "";
    }

    function getFilteredRows() {
        const direction = state.sortDir === "asc" ? 1 : -1;

        return rows
            .filter(matchesFilters)
            .sort((rowA, rowB) => {
                const valueA = getSortValue(rowA, state.sortKey);
                const valueB = getSortValue(rowB, state.sortKey);

                if (typeof valueA === "number" || typeof valueB === "number") {
                    return ((Number(valueA) || 0) - (Number(valueB) || 0)) * direction;
                }

                return String(valueA)
                    .localeCompare(String(valueB), "zh-Hant") * direction;
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

        addButton(
            '<i class="bi bi-chevron-left"></i>',
            Math.max(state.page - 1, 1),
            state.page === 1
        );

        for (let page = 1; page <= totalPages; page += 1) {
            addButton(String(page), page, false, page === state.page);
        }

        addButton(
            '<i class="bi bi-chevron-right"></i>',
            Math.min(state.page + 1, totalPages),
            state.page === totalPages
        );
    }

    function getEmptyRow() {
        const row = document.createElement("tr");
        const cell = document.createElement("td");

        row.className = "member-empty-row";
        row.dataset.pointEmpty = "true";
        cell.colSpan = 8;
        cell.textContent = "查無符合條件的點數異動資料";
        row.appendChild(cell);

        return row;
    }

    function renderTable() {
        if (!refs.tableBody) return;

        refs.tableBody.querySelector("[data-point-empty]")?.remove();

        const filteredRows = getFilteredRows();
        const totalPages = Math.max(
            Math.ceil(filteredRows.length / state.pageSize),
            1
        );

        state.page = Math.min(state.page, totalPages);

        const startIndex = (state.page - 1) * state.pageSize;
        const pageRows = filteredRows.slice(
            startIndex,
            startIndex + state.pageSize
        );
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

        if (refs.resultCount) {
            refs.resultCount.textContent = "共 " + filteredRows.length + " 筆";
        }

        if (refs.pageInfo) {
            refs.pageInfo.textContent = filteredRows.length
                ? "第 " + state.page + " / " + totalPages +
                " 頁・顯示 " + (startIndex + 1) + "-" + endIndex + " 筆"
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
            ? window.bootstrap.Toast.getOrCreateInstance(toastElement, {
                delay: 2200
            })
            : null;

        toast?.show();
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
        const colorClass = change > 0
            ? "is-positive"
            : change < 0
                ? "is-negative"
                : "is-zero";

        span.className = "point-change " + colorClass;
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
        row.appendChild(
            record.admin === "NULL"
                ? createNullCell("admin")
                : createCell("admin", record.admin)
        );
        row.appendChild(
            record.order === "NULL"
                ? createNullCell("order")
                : createCell("order", record.order)
        );

        return row;
    }

    function transactionToRecord(transaction) {
        return {
            id: Number(transaction.id ?? transaction.Id),
            account: transaction.userAccount ?? transaction.UserAccount ?? "",
            rule: transaction.actionName ?? transaction.ActionName ?? "",
            change: Number(
                transaction.pointChange ?? transaction.PointChange
            ) || 0,
            balance: Number(
                transaction.balanceAfter ?? transaction.BalanceAfter
            ) || 0,
            description: transaction.description ?? transaction.Description ?? "",
            changedAt: formatServerDateTime(
                transaction.createdAt ?? transaction.CreatedAt
            ),
            admin: transaction.modifiedByAdminAccount ??
                transaction.ModifiedByAdminAccount ??
                "NULL",
            order: transaction.userProductId == null &&
                transaction.UserProductId == null
                ? "NULL"
                : String(transaction.userProductId ?? transaction.UserProductId)
        };
    }

    function resetCreateForm() {
        refs.createForm?.reset();
        refs.createForm?.classList.remove("was-validated");
        refs.createForm
            ?.querySelectorAll("input, textarea")
            .forEach((field) => field.setCustomValidity(""));
    }

    function setCreateBusy(isBusy) {
        if (refs.createSubmit) {
            refs.createSubmit.disabled = isBusy;
            refs.createSubmit.textContent = isBusy ? "寫入中…" : "新增變更";
        }

        refs.createForm
            ?.querySelectorAll("input, textarea, button")
            .forEach((element) => {
                if (element !== refs.createSubmit) element.disabled = isBusy;
            });
    }

    async function readResponse(response) {
        const contentType = response.headers.get("content-type") || "";

        if (contentType.includes("json")) return await response.json();

        const responseText = await response.text();
        return {
            message: responseText || "伺服器未回傳可辨識的內容。"
        };
    }

    function validateCreateForm() {
        const account = refs.accountInput.value.trim();
        const rawChange = refs.changeInput.value.trim();
        const change = Number(rawChange);
        const description = refs.descriptionInput.value.trim();
        const isInt32 = Number.isInteger(change) &&
            change >= -2147483648 &&
            change <= 2147483647;

        // 不檢查帳號是否存在於 datalist；使用者可直接輸入文字。
        // 真正的帳號存在性由後端 EF 查詢 User 資料表判斷。
        refs.accountInput.setCustomValidity(
            account && account.length <= 50
                ? ""
                : "請輸入 50 個字以內的會員帳號。"
        );

        refs.changeInput.setCustomValidity(
            rawChange && isInt32 && change !== 0
                ? ""
                : "請輸入不可為 0 的整數點數變化。"
        );

        refs.descriptionInput.setCustomValidity(
            description && description.length <= 100
                ? ""
                : "請輸入 100 個字以內的描述。"
        );

        refs.createForm.classList.add("was-validated");

        return {
            isValid: refs.createForm.checkValidity(),
            payload: {
                userAccount: account,
                pointChange: change,
                description
            }
        };
    }

    function updateAccountOptionBalance(account, balance) {
        const option = Array.from(
            refs.accountOptions?.querySelectorAll("option") || []
        ).find((item) => item.value === account);

        if (!option) return;

        option.dataset.balance = String(balance);
        option.label = "目前點數 " + formatNumber(balance);
    }

    async function handleCreateSubmit(event) {
        event.preventDefault();

        const validation = validateCreateForm();
        if (!validation.isValid) return;

        const createUrl = refs.createForm.dataset.createUrl;
        const antiForgeryToken = refs.createForm.querySelector(
            'input[name="__RequestVerificationToken"]'
        )?.value;

        if (!createUrl || !antiForgeryToken) {
            showToast("新增網址或防偽權杖不存在，請重新整理頁面。");
            return;
        }

        setCreateBusy(true);

        try {
            const response = await fetch(createUrl, {
                method: "POST",
                credentials: "same-origin",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    RequestVerificationToken: antiForgeryToken
                },
                body: JSON.stringify(validation.payload)
            });

            const payload = await readResponse(response);

            // 後端確實完成 SaveChangesAsync 與 CommitAsync 後才更新畫面。
            if (
                !response.ok ||
                payload.success !== true ||
                payload.persisted !== true ||
                !payload.transaction
            ) {
                throw new Error(
                    payload.message || "點數變更未成功寫入資料庫。"
                );
            }

            const record = transactionToRecord(payload.transaction);
            const row = createPointRow(record);

            refs.tableBody.appendChild(row);
            rows.push(row);
            updateAccountOptionBalance(record.account, record.balance);

            state.sortKey = "changedAt";
            state.sortDir = "desc";
            state.page = 1;
            renderTable();

            createModal?.hide();
            showToast(payload.message || "已新增點數變更紀錄。");
        } catch (error) {
            console.error(error);
            showToast(error.message || "新增點數變更失敗。");
        } finally {
            setCreateBusy(false);
        }
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

                if (state.sortKey === sortKey) {
                    state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
                } else {
                    state.sortKey = sortKey;
                    state.sortDir = sortKey === "changedAt" ? "desc" : "asc";
                }

                state.page = 1;
                renderTable();
            });
        });

        refs.createForm?.addEventListener("submit", handleCreateSubmit);

        document
            .getElementById("pointCreateModal")
            ?.addEventListener("hidden.bs.modal", resetCreateForm);

        refs.createForm
            ?.querySelectorAll("input, textarea")
            .forEach((field) => {
                field.addEventListener("input", () => {
                    // 每次輸入都清除先前留下的自訂錯誤。
                    field.setCustomValidity("");
                });
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
            createForm: document.getElementById("pointCreateForm"),
            createSubmit: document.getElementById("pointCreateSubmit"),
            accountInput: document.getElementById("pointCreateAccount"),
            accountOptions: document.getElementById("pointAccountOptions"),
            changeInput: document.getElementById("pointCreateChange"),
            descriptionInput: document.getElementById("pointCreateDescription")
        });

        if (!refs.tableBody || !refs.createForm) return;

        const modalElement = document.getElementById("pointCreateModal");
        createModal = modalElement && window.bootstrap?.Modal
            ? window.bootstrap.Modal.getOrCreateInstance(modalElement)
            : null;

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
