(() => {
    "use strict";

    const layerOrder = [
        "body",
        "accessory1",
        "accessory2",
        "accessory3"
    ];

    const layerLabels = {
        body: "底圖",
        accessory1: "配件1",
        accessory2: "配件2",
        accessory3: "配件3"
    };

    const imageCache = new Map();
    let renderVersion = 0;

    function getPreviewRoot() {
        return document.getElementById("combinationPreviewView");
    }

    function getBodySortOrder() {
        const value = Number(
            getPreviewRoot()?.dataset.bodySortOrder
        );

        return Number.isFinite(value) ? value : 4;
    }

    function getItemData(select) {
        const option = select?.selectedOptions?.[0];

        if (!option || !select.value) {
            return null;
        }

        return {
            id: Number(select.value),
            name: option.dataset.name || option.textContent.trim(),
            imageName: option.dataset.imageName || "",
            imageUrl: option.dataset.imageUrl || "",
            lineName: option.dataset.lineName || "",
            lineUrl: option.dataset.lineUrl || "",
            maskName: option.dataset.maskName || "",
            maskUrl: option.dataset.maskUrl || "",
            sortOrder: Number(option.dataset.sortOrder) || 0
        };
    }

    function getColorData(select) {
        const option = select?.selectedOptions?.[0];

        if (!option || !select.value) {
            return null;
        }

        return {
            id: Number(select.value),
            name: option.dataset.name || option.textContent.trim(),
            hexCode: option.dataset.hexCode || ""
        };
    }

    function getLayerData(slot, slotIndex) {
        const itemSelect = document.querySelector(
            `[data-preview-item="${slot}"]`
        );

        const colorSelect = document.querySelector(
            `[data-preview-color="${slot}"]`
        );

        const item = getItemData(itemSelect);

        if (!item) {
            return null;
        }

        return {
            slot,
            slotIndex,
            label: layerLabels[slot],
            item,
            color: getColorData(colorSelect),
            sortOrder:
                slot === "body"
                    ? getBodySortOrder()
                    : item.sortOrder
        };
    }

    function getSelectedLayers() {
        return layerOrder
            .map((slot, slotIndex) => getLayerData(slot, slotIndex))
            .filter(Boolean)
            .sort((layerA, layerB) => {
                return (
                    layerA.sortOrder - layerB.sortOrder ||
                    layerA.slotIndex - layerB.slotIndex
                );
            });
    }

    function syncColorSelect(slot) {
        const itemSelect = document.querySelector(
            `[data-preview-item="${slot}"]`
        );

        const colorSelect = document.querySelector(
            `[data-preview-color="${slot}"]`
        );

        if (!itemSelect || !colorSelect) {
            return;
        }

        const hasItem = Boolean(itemSelect.value);
        const hasColors = colorSelect.options.length > 1;

        colorSelect.disabled = !hasItem || !hasColors;

        if (!hasItem) {
            colorSelect.value = "";
        }
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
             * 不設定 crossOrigin。
             * 這個功能只使用 drawImage 與合成，不會使用
             * getImageData、toDataURL 或 convertToBlob。
             */
            image.decoding = "async";

            image.addEventListener("load", () => {
                resolve(image);
            });

            image.addEventListener("error", () => {
                imageCache.delete(imageUrl);

                reject(
                    new Error(`Image load failed: ${imageUrl}`)
                );
            });

            image.src = imageUrl;
        });

        imageCache.set(imageUrl, imagePromise);

        return imagePromise;
    }

    async function loadLayerAssets(layer) {
        if (layer.slot === "body") {
            return {
                ...layer,
                bodyImage: await loadImage(layer.item.imageUrl)
            };
        }

        const [maskImage, lineImage] = await Promise.all([
            loadImage(layer.item.maskUrl),
            loadImage(layer.item.lineUrl)
        ]);

        return {
            ...layer,
            maskImage,
            lineImage
        };
    }

    function getReferenceImage(loadedLayers) {
        const bodyLayer = loadedLayers.find(
            layer => layer.slot === "body"
        );

        if (bodyLayer?.bodyImage) {
            return bodyLayer.bodyImage;
        }

        const accessoryLayer = loadedLayers.find(
            layer => layer.lineImage || layer.maskImage
        );

        return accessoryLayer?.lineImage ||
            accessoryLayer?.maskImage ||
            null;
    }

    function prepareCanvas(canvas, referenceImage) {
        canvas.width = referenceImage.naturalWidth || referenceImage.width;
        canvas.height = referenceImage.naturalHeight || referenceImage.height;

        canvas.style.setProperty(
            "--preview-aspect-ratio",
            `${canvas.width} / ${canvas.height}`
        );

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

        // 第一層：畫出原始白色遮罩。
        tempContext.drawImage(
            maskImage,
            0,
            0,
            width,
            height
        );

        /*
         * source-in：新畫入的顏色只保留在
         * 原始 mask 已有不透明像素的範圍內。
         */
        tempContext.globalCompositeOperation = "source-in";
        tempContext.fillStyle = color;
        tempContext.fillRect(0, 0, width, height);

        tempContext.globalCompositeOperation = "source-over";

        return tempCanvas;
    }

    function drawLayer(context, canvas, layer) {
        if (layer.slot === "body") {
            context.drawImage(
                layer.bodyImage,
                0,
                0,
                canvas.width,
                canvas.height
            );

            return;
        }

        /*
         * 配件內部順序：
         * 1. 原始白色 mask，或 source-in 產生的染色 mask。
         * 2. line 線稿。
         */
        const maskToDraw = layer.color
            ? createColoredMask(
                layer.maskImage,
                layer.color.hexCode,
                canvas.width,
                canvas.height
            )
            : layer.maskImage;

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
        bodyLayer
    ) {
        if (!bodyLayer?.color?.hexCode) {
            return;
        }

        context.save();

        /*
         * destination-over：在 body 與 accessories 全部畫完後，
         * 將底圖染劑畫到既有內容的後方。
         * 因此只有合成後仍透明的地方會顯示此顏色。
         */
        context.globalCompositeOperation = "destination-over";
        context.fillStyle = bodyLayer.color.hexCode;
        context.fillRect(0, 0, canvas.width, canvas.height);

        context.restore();
    }

    function clearCanvas(canvas) {
        const context = canvas.getContext("2d");

        context.clearRect(
            0,
            0,
            canvas.width,
            canvas.height
        );
    }

    function createLayerChip(layer) {
        const chip = document.createElement("span");
        chip.className = "combination-layer-chip";

        const dot = document.createElement("span");
        dot.className = "combination-color-dot";
        dot.style.setProperty(
            "--dot-color",
            layer.color?.hexCode || "#fffdf8"
        );

        const text = document.createElement("span");
        text.textContent =
            `${layer.label}：${layer.item.name}` +
            (layer.color ? ` / ${layer.color.name}` : "");

        chip.appendChild(dot);
        chip.appendChild(text);

        return chip;
    }

    function renderLayerList(list, layers) {
        list.replaceChildren();

        layers.forEach(layer => {
            list.appendChild(createLayerChip(layer));
        });
    }

    function hidePreviewError(errorElement) {
        errorElement.textContent = "";
        errorElement.classList.add("d-none");
    }

    function showPreviewError(errorElement) {
        /*
         * 圖片載入失敗，請確認 R2 URL 與檔名是否正確。
         * 使用 Unicode escape 避免檔案編碼造成亂碼。
         */
        errorElement.textContent =
            "\u5716\u7247\u8F09\u5165\u5931\u6557\uFF0C" +
            "\u8ACB\u78BA\u8A8D R2 URL " +
            "\u8207\u6A94\u540D\u662F\u5426\u6B63\u78BA\u3002";

        errorElement.classList.remove("d-none");
    }

    async function renderPreview() {
        const currentRenderVersion = ++renderVersion;

        const canvas = document.getElementById(
            "combinationPreviewCanvas"
        );

        const list = document.getElementById(
            "combinationLayerList"
        );

        const empty = document.getElementById(
            "combinationPreviewEmpty"
        );

        const errorElement = document.getElementById(
            "combinationPreviewError"
        );

        if (!canvas || !list || !empty || !errorElement) {
            return;
        }

        const layers = getSelectedLayers();

        renderLayerList(list, layers);
        hidePreviewError(errorElement);

        if (layers.length === 0) {
            clearCanvas(canvas);
            canvas.classList.add("d-none");
            empty.classList.remove("d-none");
            return;
        }

        empty.classList.add("d-none");
        canvas.classList.remove("d-none");

        try {
            const loadedLayers = await Promise.all(
                layers.map(loadLayerAssets)
            );

            /*
             * 使用者可能在圖片載入期間再次切換下拉選單。
             * 舊的非同步結果不可覆蓋較新的預覽。
             */
            if (currentRenderVersion !== renderVersion) {
                return;
            }

            const referenceImage = getReferenceImage(loadedLayers);

            if (!referenceImage) {
                throw new Error("No reference image was loaded.");
            }

            const context = prepareCanvas(canvas, referenceImage);

            // layers 已依 sort_order 由小到大排列。
            loadedLayers.forEach(layer => {
                drawLayer(context, canvas, layer);
            });

            const bodyLayer = loadedLayers.find(
                layer => layer.slot === "body"
            );

            drawBodyBackgroundColor(
                context,
                canvas,
                bodyLayer
            );
        } catch (error) {
            if (currentRenderVersion !== renderVersion) {
                return;
            }

            clearCanvas(canvas);
            showPreviewError(errorElement);
            console.error(error);
        }
    }

    function bindEvents() {
        document
            .querySelectorAll("[data-preview-item]")
            .forEach(select => {
                select.addEventListener("change", () => {
                    syncColorSelect(select.dataset.previewItem);
                    renderPreview();
                });
            });

        document
            .querySelectorAll("[data-preview-color]")
            .forEach(select => {
                select.addEventListener("change", renderPreview);
            });
    }

    function init() {
        if (!getPreviewRoot()) {
            return;
        }

        layerOrder.forEach(syncColorSelect);
        bindEvents();
        renderPreview();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
