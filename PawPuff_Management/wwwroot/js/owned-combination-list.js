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
    const imageCache = new Map();
    let rows = [];

    function normalize(value) {
        return String(value ?? "")
            .trim()
            .toLocaleLowerCase("zh-Hant-TW");
    }

    function nonEmptyValues(values) {
        return values
            .map((value) => String(value ?? "").trim())
            .filter(Boolean);
    }

    function isValidHex(value) {
        return /^#[0-9a-fA-F]{6}$/.test(
            String(value ?? "").trim()
        );
    }

    function getBodySortOrder() {
        const value = Number(
            document.getElementById("ownedCombinationView")
                ?.dataset.bodySortOrder
        );

        return Number.isFinite(value) ? value : 4;
    }

    function getColorData(row, prefix) {
        const name = row.dataset[prefix + "ColorName"] || "";
        const hexCode = row.dataset[prefix + "ColorHex"] || "";

        if (!name && !hexCode) return null;

        return { name, hexCode };
    }

    function getAccessoryData(row, slotNumber) {
        const prefix = "accessory" + slotNumber;
        const name = row.dataset[prefix + "Name"] || "";

        if (!name) return null;

        return {
            slot: prefix,
            slotIndex: slotNumber,
            name,
            lineName: row.dataset[prefix + "LineName"] || "",
            lineUrl: row.dataset[prefix + "LineUrl"] || "",
            maskName: row.dataset[prefix + "MaskName"] || "",
            maskUrl: row.dataset[prefix + "MaskUrl"] || "",
            sortOrder: Number(
                row.dataset[prefix + "SortOrder"]
            ) || 0,
            color: getColorData(row, prefix)
        };
    }

    function getCombinationData(row) {
        const bodyColor = getColorData(row, "body");
        const accessories = [1, 2, 3]
            .map((slotNumber) => getAccessoryData(row, slotNumber))
            .filter(Boolean);

        const accessoryNames = accessories.map(
            (accessory) => accessory.name
        );

        const colors = [
            bodyColor,
            ...accessories.map((accessory) => accessory.color)
        ].filter(Boolean);

        return {
            id: Number(row.dataset.id) || 0,
            account: row.dataset.account || "",
            body: {
                name: row.dataset.bodyName || "",
                imageName: row.dataset.bodyImageName || "",
                imageUrl: row.dataset.bodyImageUrl || "",
                color: bodyColor
            },
            accessory1: getAccessoryData(row, 1),
            accessory2: getAccessoryData(row, 2),
            accessory3: getAccessoryData(row, 3),
            accessories,
            accessorySearch: accessoryNames.join(" "),
            colorSearch: nonEmptyValues(
                colors.flatMap((color) => [
                    color.name,
                    color.hexCode
                ])
            ).join(" ")
        };
    }

    function collectRows() {
        rows = Array.from(
            refs.tableBody?.querySelectorAll(
                "[data-owned-combination-row]"
            ) || []
        );
    }

    function initializeColorChips() {
        document
            .querySelectorAll("[data-combination-color-chip]")
            .forEach((chip) => {
                const color = chip.dataset.color;

                if (isValidHex(color)) {
                    chip.style.setProperty(
                        "--combination-slot-color",
                        color
                    );
                } else {
                    chip.classList.add("is-invalid-color");
                }
            });
    }

    function matchesFilters(row) {
        const data = getCombinationData(row);

        return (
            (!state.filters.account ||
                normalize(data.account).includes(
                    normalize(state.filters.account)
                )) &&
            (!state.filters.body ||
                normalize(data.body.name).includes(
                    normalize(state.filters.body)
                )) &&
            (!state.filters.accessory ||
                normalize(data.accessorySearch).includes(
                    normalize(state.filters.accessory)
                )) &&
            (!state.filters.color ||
                normalize(data.colorSearch).includes(
                    normalize(state.filters.color)
                ))
        );
    }

    function getSlotSortText(accessory) {
        if (!accessory) return "";

        return [
            accessory.name,
            accessory.color?.name || ""
        ].join(" ");
    }

    function getSortValue(row, key) {
        const data = getCombinationData(row);

        if (key === "id") return data.id;
        if (key === "body") {
            return [
                data.body.name,
                data.body.color?.name || ""
            ].join(" ");
        }
        if (key === "accessory1") {
            return getSlotSortText(data.accessory1);
        }
        if (key === "accessory2") {
            return getSlotSortText(data.accessory2);
        }
        if (key === "accessory3") {
            return getSlotSortText(data.accessory3);
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

                if (typeof valueA === "number" ||
                    typeof valueB === "number") {
                    return (
                        ((Number(valueA) || 0) -
                            (Number(valueB) || 0)) *
                        direction
                    );
                }

                return (
                    String(valueA).localeCompare(
                        String(valueB),
                        "zh-Hant"
                    ) * direction
                );
            });
    }

    function updateSortIcons() {
        document
            .querySelectorAll("[data-owned-combination-sort]")
            .forEach((button) => {
                const icon = button.querySelector("i");
                if (!icon) return;

                icon.className =
                    button.dataset.ownedCombinationSort ===
                        state.sortKey
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
        row.dataset.ownedCombinationEmpty = "true";
        cell.colSpan = 7;
        cell.textContent = "查無符合條件的持有組合資料";
        row.appendChild(cell);

        return row;
    }

    function loadImage(imageUrl) {
        if (!imageUrl) {
            return Promise.reject(
                new Error("Image URL is empty.")
            );
        }

        if (imageCache.has(imageUrl)) {
            return imageCache.get(imageUrl);
        }

        const imagePromise = new Promise((resolve, reject) => {
            const image = new Image();

            /*
             * 不設定 crossOrigin；本頁只使用 drawImage 與合成，
             * 不會呼叫 getImageData、toDataURL 或 convertToBlob。
             */
            image.decoding = "async";

            image.addEventListener("load", () => resolve(image));
            image.addEventListener("error", () => {
                imageCache.delete(imageUrl);
                reject(
                    new Error("Image load failed: " + imageUrl)
                );
            });

            image.src = imageUrl;
        });

        imageCache.set(imageUrl, imagePromise);
        return imagePromise;
    }

    function validateCombinationColors(data) {
        const colors = [
            data.body.color,
            ...data.accessories.map(
                (accessory) => accessory.color
            )
        ].filter(Boolean);

        const invalidColor = colors.find(
            (color) => !isValidHex(color.hexCode)
        );

        if (invalidColor) {
            throw new Error(
                "Invalid color: " + invalidColor.name
            );
        }
    }

    async function loadCombinationAssets(data) {
        validateCombinationColors(data);

        const bodyImage = await loadImage(data.body.imageUrl);

        const accessories = await Promise.all(
            data.accessories.map(async (accessory) => {
                const [maskImage, lineImage] = await Promise.all([
                    loadImage(accessory.maskUrl),
                    loadImage(accessory.lineUrl)
                ]);

                return {
                    ...accessory,
                    maskImage,
                    lineImage
                };
            })
        );

        return {
            body: {
                ...data.body,
                bodyImage
            },
            accessories
        };
    }

    function prepareCanvas(canvas, bodyImage) {
        canvas.width =
            bodyImage.naturalWidth || bodyImage.width;
        canvas.height =
            bodyImage.naturalHeight || bodyImage.height;

        const context = canvas.getContext("2d");
        context.clearRect(
            0,
            0,
            canvas.width,
            canvas.height
        );

        return context;
    }

    function createColoredMask(
        maskImage,
        color,
        width,
        height
    ) {
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = width;
        tempCanvas.height = height;

        const tempContext = tempCanvas.getContext("2d");

        tempContext.drawImage(
            maskImage,
            0,
            0,
            width,
            height
        );

        // 顏色只保留在 mask 原本具有不透明像素的範圍。
        tempContext.globalCompositeOperation = "source-in";
        tempContext.fillStyle = color;
        tempContext.fillRect(0, 0, width, height);
        tempContext.globalCompositeOperation = "source-over";

        return tempCanvas;
    }

    function createOrderedLayers(loadedData) {
        const layers = [
            {
                kind: "body",
                slotIndex: 0,
                sortOrder: getBodySortOrder(),
                bodyImage: loadedData.body.bodyImage,
                color: loadedData.body.color
            },
            ...loadedData.accessories.map((accessory) => ({
                kind: "accessory",
                slotIndex: accessory.slotIndex,
                sortOrder: accessory.sortOrder,
                maskImage: accessory.maskImage,
                lineImage: accessory.lineImage,
                color: accessory.color
            }))
        ];

        return layers.sort((layerA, layerB) => {
            return (
                layerA.sortOrder - layerB.sortOrder ||
                layerA.slotIndex - layerB.slotIndex
            );
        });
    }

    function drawLayer(context, canvas, layer) {
        if (layer.kind === "body") {
            context.drawImage(
                layer.bodyImage,
                0,
                0,
                canvas.width,
                canvas.height
            );
            return;
        }

        const maskToDraw = layer.color
            ? createColoredMask(
                layer.maskImage,
                layer.color.hexCode,
                canvas.width,
                canvas.height
            )
            : layer.maskImage;

        // 配件內部固定先畫白色／染色 mask，再畫 line 線稿。
        context.drawImage(
            maskToDraw,
            0,
            0,
            canvas.width,
            canvas.height
        );
        context.drawImage(
            layer.lineImage,
            0,
            0,
            canvas.width,
            canvas.height
        );
    }

    function drawBodyBackgroundColor(
        context,
        canvas,
        bodyColor
    ) {
        if (!bodyColor?.hexCode) return;

        context.save();

        /*
         * 全部 body/accessory 畫完後再使用 destination-over，
         * 因此底圖染劑只會補在合成結果後方仍透明的位置。
         */
        context.globalCompositeOperation = "destination-over";
        context.fillStyle = bodyColor.hexCode;
        context.fillRect(0, 0, canvas.width, canvas.height);

        context.restore();
    }

    function showPreviewLoading(row) {
        const canvas = row.querySelector(
            "[data-owned-combination-canvas]"
        );
        const status = row.querySelector(
            "[data-owned-combination-status]"
        );

        canvas?.classList.add("d-none");
        if (status) {
            status.textContent = "\u7D44\u5408\u5716\u8F09\u5165\u4E2D\u2026";
            status.classList.remove("d-none", "is-error");
        }
    }

    function showPreviewSuccess(row) {
        const canvas = row.querySelector(
            "[data-owned-combination-canvas]"
        );
        const status = row.querySelector(
            "[data-owned-combination-status]"
        );

        canvas?.classList.remove("d-none");
        status?.classList.add("d-none");
    }

    function showPreviewError(row) {
        const canvas = row.querySelector(
            "[data-owned-combination-canvas]"
        );
        const status = row.querySelector(
            "[data-owned-combination-status]"
        );

        canvas?.classList.add("d-none");
        if (status) {
            // 使用 Unicode escape，避免錯誤提示因檔案編碼而變成亂碼。
            status.textContent =
                "\u7D44\u5408\u5716\u8F09\u5165\u5931\u6557";
            status.classList.remove("d-none");
            status.classList.add("is-error");
        }
    }

    async function renderCombinationPreview(row) {
        if (
            row.dataset.previewState === "loading" ||
            row.dataset.previewState === "loaded" ||
            row.dataset.previewState === "error"
        ) {
            return;
        }

        const canvas = row.querySelector(
            "[data-owned-combination-canvas]"
        );
        if (!canvas) return;

        row.dataset.previewState = "loading";
        showPreviewLoading(row);

        try {
            const data = getCombinationData(row);
            const loadedData = await loadCombinationAssets(data);
            const context = prepareCanvas(
                canvas,
                loadedData.body.bodyImage
            );
            const layers = createOrderedLayers(loadedData);

            layers.forEach((layer) => {
                drawLayer(context, canvas, layer);
            });

            drawBodyBackgroundColor(
                context,
                canvas,
                loadedData.body.color
            );

            row.dataset.previewState = "loaded";
            showPreviewSuccess(row);
        } catch (error) {
            row.dataset.previewState = "error";
            showPreviewError(row);
            console.error(error);
        }
    }

    function renderTable() {
        if (!refs.tableBody) return;

        refs.tableBody
            .querySelector("[data-owned-combination-empty]")
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

                // 只載入目前分頁可見列的組合圖。
                renderCombinationPreview(row);
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
                : "沒有符合條件的持有組合";
        }

        renderPagination(totalPages);
        updateSortIcons();
    }

    function bindEvents() {
        document
            .querySelectorAll("[data-owned-combination-filter]")
            .forEach((input) => {
                const update = () => {
                    state.filters[
                        input.dataset.ownedCombinationFilter
                    ] = input.value.trim();
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
                .querySelectorAll("[data-owned-combination-filter]")
                .forEach((input) => {
                    input.value = "";
                    state.filters[
                        input.dataset.ownedCombinationFilter
                    ] = "";
                });

            state.page = 1;
            renderTable();
        });

        document
            .querySelectorAll("[data-owned-combination-sort]")
            .forEach((button) => {
                button.addEventListener("click", () => {
                    const sortKey =
                        button.dataset.ownedCombinationSort;

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
                "ownedCombinationSearchForm"
            ),
            tableBody: document.getElementById(
                "ownedCombinationTableBody"
            ),
            pagination: document.getElementById(
                "ownedCombinationPagination"
            ),
            pageInfo: document.getElementById(
                "ownedCombinationPageInfo"
            ),
            resultCount: document.getElementById(
                "ownedCombinationResultCount"
            ),
            reset: document.getElementById(
                "ownedCombinationFilterReset"
            )
        });

        if (!refs.tableBody) return;

        collectRows();
        initializeColorChips();
        bindEvents();
        renderTable();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
