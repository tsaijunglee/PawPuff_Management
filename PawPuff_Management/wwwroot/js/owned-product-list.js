(() => {
    "use strict";

    const state = {
        page: 1,
        pageSize: 10,
        sortKey: "id",
        sortDir: "asc",
        filters: {
            id: "",
            account: "",
            name: "",
            type: ""
        }
    };

    const refs = {};
    let rows = [];

    function normalize(value) {
        return String(value ?? "")
            .trim()
            .toLocaleLowerCase("zh-Hant-TW");
    }

    function formatNumber(value) {
        const numericValue = Number(value);
        return new Intl.NumberFormat("zh-Hant-TW").format(
            Number.isFinite(numericValue) ? numericValue : 0
        );
    }

    function parseDateTime(value) {
        return Date.parse(String(value ?? "").replace(" ", "T")) || 0;
    }

    function isValidHex(value) {
        return /^#[0-9a-fA-F]{6}$/.test(String(value ?? "").trim());
    }

    function getProductData(row) {
        return {
            id: row.dataset.id || "",
            account: row.dataset.account || "",
            name: row.dataset.name || "",
            type: row.dataset.type || "",
            purchasedAt: row.dataset.purchasedAt || "",
            price: Number(row.dataset.price) || 0,
            previewKind: row.dataset.previewKind || "none",
            imageUrl: row.dataset.imageUrl || "",
            hexCode: row.dataset.hexCode || "",
            assetLabel: row.dataset.assetLabel || ""
        };
    }

    function renderThumb(row) {
        const data = getProductData(row);
        const thumb = row.querySelector("[data-owned-product-thumb]");
        if (!thumb) return;

        thumb.innerHTML = "";
        thumb.className = "shop-product-thumb";
        thumb.style.removeProperty("--shop-color");

        const fallback = document.createElement("span");
        fallback.className = "owned-product-thumb-fallback";
        fallback.textContent = data.assetLabel || "無可用素材";

        if (
            data.previewKind === "color" &&
            isValidHex(data.hexCode)
        ) {
            thumb.classList.add("is-color");
            thumb.style.setProperty("--shop-color", data.hexCode);
            fallback.textContent = data.hexCode.toUpperCase();
            thumb.appendChild(fallback);
            return;
        }

        if (data.previewKind !== "image" || !data.imageUrl) {
            fallback.textContent = "素材資料異常";
            thumb.appendChild(fallback);
            return;
        }

        const image = document.createElement("img");
        image.src = data.imageUrl;
        image.alt = data.name + "商品圖";
        image.loading = "lazy";
        image.decoding = "async";
        image.addEventListener("error", () => {
            image.remove();
            fallback.textContent =
                (data.assetLabel || "商品圖") + " 載入失敗";
            if (!thumb.contains(fallback)) thumb.appendChild(fallback);
        });

        thumb.appendChild(image);
    }

    function collectRows() {
        rows = Array.from(
            refs.tableBody?.querySelectorAll("[data-owned-product-row]") || []
        );
        rows.forEach(renderThumb);
    }

    function matchesFilters(row) {
        const data = getProductData(row);

        return (
            (!state.filters.id ||
                normalize(data.id).includes(normalize(state.filters.id))) &&
            (!state.filters.account ||
                normalize(data.account).includes(
                    normalize(state.filters.account)
                )) &&
            (!state.filters.name ||
                normalize(data.name).includes(normalize(state.filters.name))) &&
            (!state.filters.type || data.type === state.filters.type)
        );
    }

    function getSortValue(row, key) {
        const data = getProductData(row);

        if (key === "id" || key === "price") {
            return Number(data[key]) || 0;
        }

        if (key === "purchasedAt") {
            return parseDateTime(data.purchasedAt);
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
                    return (
                        ((Number(valueA) || 0) - (Number(valueB) || 0)) *
                        direction
                    );
                }

                return (
                    String(valueA).localeCompare(String(valueB), "zh-Hant") *
                    direction
                );
            });
    }

    function updateSortIcons() {
        document
            .querySelectorAll("[data-owned-product-sort]")
            .forEach((button) => {
                const icon = button.querySelector("i");
                if (!icon) return;

                icon.className =
                    button.dataset.ownedProductSort === state.sortKey
                        ? "bi " +
                        (state.sortDir === "asc"
                            ? "bi-sort-up"
                            : "bi-sort-down")
                        : "bi bi-arrow-down-up";
            });
    }

    function renderPagination(totalPages) {
        if (!refs.pagination) return;

        refs.pagination.innerHTML = "";

        const addButton = (
            label,
            page,
            disabled = false,
            active = false
        ) => {
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
        row.dataset.ownedProductEmpty = "true";
        cell.colSpan = 7;
        cell.textContent = "查無符合條件的持有商品資料";
        row.appendChild(cell);

        return row;
    }

    function renderTable() {
        if (!refs.tableBody) return;

        refs.tableBody
            .querySelector("[data-owned-product-empty]")
            ?.remove();

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
            refs.resultCount.textContent =
                "共 " + filteredRows.length + " 筆";
        }

        if (refs.pageInfo) {
            refs.pageInfo.textContent = filteredRows.length
                ? "第 " +
                state.page +
                " / " +
                totalPages +
                " 頁・顯示 " +
                (startIndex + 1) +
                "-" +
                endIndex +
                " 筆"
                : "沒有符合條件的持有商品";
        }

        renderPagination(totalPages);
        updateSortIcons();
    }

    function bindEvents() {
        document
            .querySelectorAll("[data-owned-product-filter]")
            .forEach((input) => {
                const update = () => {
                    state.filters[input.dataset.ownedProductFilter] =
                        input.value.trim();
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
            document
                .querySelectorAll("[data-owned-product-filter]")
                .forEach((input) => {
                    input.value = "";
                    state.filters[input.dataset.ownedProductFilter] = "";
                });

            state.page = 1;
            renderTable();
        });

        document
            .querySelectorAll("[data-owned-product-sort]")
            .forEach((button) => {
                button.addEventListener("click", () => {
                    const sortKey = button.dataset.ownedProductSort;

                    if (state.sortKey === sortKey) {
                        state.sortDir =
                            state.sortDir === "asc" ? "desc" : "asc";
                    } else {
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
            searchForm: document.getElementById(
                "ownedProductSearchForm"
            ),
            tableBody: document.getElementById(
                "ownedProductTableBody"
            ),
            pagination: document.getElementById(
                "ownedProductPagination"
            ),
            pageInfo: document.getElementById(
                "ownedProductPageInfo"
            ),
            resultCount: document.getElementById(
                "ownedProductResultCount"
            ),
            reset: document.getElementById(
                "ownedProductFilterReset"
            )
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
