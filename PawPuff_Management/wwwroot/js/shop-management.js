(() => {
  "use strict";

  const state = {
    page: 1,
    pageSize: 10,
    sortKey: "id",
    sortDir: "asc",
    filters: {
      id: "",
      name: "",
      type: "",
      priceMin: "",
      priceMax: ""
    }
  };

  const refs = {};
  // 配件圖層可用 1-7，但 4 保留給底圖 doll_body，因此配件不可送出 4。
  const accessorySortOrders = [1, 2, 3, 5, 6, 7];
  let rows = [];
  let createModal = null;
  let statusModal = null;
  let priceModal = null;
  let currentCreateType = "底圖";
  let pendingStatusChange = null;
  let pendingPriceChange = null;

  function normalize(value) {
    return String(value || "").trim().toLowerCase();
  }

  function normalizeNullable(value) {
    return value && value !== "NULL" ? value : "NULL";
  }

  function formatNumber(value) {
    return new Intl.NumberFormat("zh-Hant-TW").format(Number(value) || 0);
  }

  function formatDateTime(date = new Date()) {
    const pad = (value) => String(value).padStart(2, "0");
    return [
      date.getFullYear(),
      "-",
      pad(date.getMonth() + 1),
      "-",
      pad(date.getDate()),
      " ",
      date.getHours(),
      ":",
      pad(date.getMinutes()),
      ":",
      pad(date.getSeconds())
    ].join("");
  }

    // 從 Razor 產生的 hidden input 取得 AntiForgeryToken。
    // Controller action 有 [ValidateAntiForgeryToken] 時，Ajax POST 必須帶這個值。
    function getAntiForgeryToken() {
        return document.querySelector('input[name="__RequestVerificationToken"]')?.value || "";
    }

    // 非同步 Ajax：送 JSON 給 Controller。
    // 適用於上下架、修改價格、修改排序。
    async function postJson(url, payload) {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "RequestVerificationToken": getAntiForgeryToken()
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok || data.success === false) {
            throw new Error(data.message || "操作失敗");
        }

        return data;
    }

    // 非同步 Ajax：送 FormData 給 Controller。
    // 適用於新增商品，因為新增會包含圖片檔案。
    async function postForm(url, formData) {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "RequestVerificationToken": getAntiForgeryToken()
            },
            body: formData
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok || data.success === false) {
            throw new Error(data.message || "新增失敗");
        }

        return data;
    }

    // 將 null / undefined / 空字串轉成 "NULL"，讓既有 dataset 格式一致。
    function nullToken(value) {
        return value === null || value === undefined || value === "" ? "NULL" : String(value);
    }

    // 依目前新增類型，將不同欄位放進 FormData。
    // 欄位名稱要對應 CreateShopProductDto 的屬性名稱。
    function buildCreateFormData() {
        const formData = new FormData();

        formData.append("ProductType", currentCreateType);
        formData.append("Name", refs.shopCreateName.value.trim());
        formData.append("Price", refs.shopCreatePrice.value);

        if (currentCreateType === "底圖") {
            formData.append("BodyImage", getSingleFile(refs.shopCreateBodyImage));
        } else if (currentCreateType === "配件") {
            formData.append("AccessoryLineImage", getSingleFile(refs.shopCreateAccessoryLineImage));
            formData.append("AccessoryMaskImage", getSingleFile(refs.shopCreateAccessoryMaskImage));
            formData.append("AccessorySortOrder", refs.shopCreateAccessorySort.value);
        } else if (currentCreateType === "頭像框") {
            formData.append("FrameImage", getSingleFile(refs.shopCreateFrameImage));
            formData.append("IsSquare", document.querySelector('[name="shopCreateFrameShape"]:checked')?.value === "1");
        } else if (currentCreateType === "染劑") {
            formData.append("HexCode", refs.shopCreateColorHex.value.trim().toUpperCase());
        }

        return formData;
    }

  function getActorAdmin() {
    return refs.shopManagementView?.dataset.actorAdminAccount || "admin01";
  }

  function showToast(message) {
    if (refs.toastMessage) refs.toastMessage.textContent = message;
    const toast = refs.actionToast && window.bootstrap?.Toast
      ? window.bootstrap.Toast.getOrCreateInstance(refs.actionToast, { delay: 1800 })
      : null;
    toast?.show();
  }

  function getProductData(row) {
    const active = row.dataset.active === "true";
    const isSquare = normalizeNullable(row.dataset.isSquare);
    return {
      id: row.dataset.id || "",
      type: row.dataset.productType || "",
      bodyId: normalizeNullable(row.dataset.bodyId),
      accessoryId: normalizeNullable(row.dataset.accessoryId),
      framesId: normalizeNullable(row.dataset.framesId),
      colorsId: normalizeNullable(row.dataset.colorsId),
      name: row.dataset.name || "",
      imageName: normalizeNullable(row.dataset.imageName),
      imageSrc: row.dataset.imageSrc || "",
      lineImageName: normalizeNullable(row.dataset.lineImageName),
      lineImageSrc: row.dataset.lineImageSrc || "",
      maskImageName: normalizeNullable(row.dataset.maskImageName),
      maskImageSrc: row.dataset.maskImageSrc || "",
      sortOrder: normalizeNullable(row.dataset.sortOrder),
      isSquare,
      frameShape: isSquare === "NULL" ? "NULL" : isSquare === "1" ? "方形" : "圓形",
      hexCode: normalizeNullable(row.dataset.hexCode),
      price: Number(row.dataset.price) || 0,
      priceFormatted: formatNumber(row.dataset.price),
      active,
      activeText: active ? "啟用" : "停用",
      adminComment: normalizeNullable(row.dataset.adminComment),
      adminUpdatedAt: normalizeNullable(row.dataset.adminUpdatedAt),
      modifiedByAdmin: normalizeNullable(row.dataset.modifiedByAdmin)
    };
  }

  function getPreviewInfo(product) {
    if (product.type === "染劑") {
      return {
        type: "color",
        label: product.hexCode === "NULL" ? "#FFFFFF" : product.hexCode,
        color: product.hexCode === "NULL" ? "#FFFFFF" : product.hexCode
      };
    }

    if (product.type === "配件") {
      return {
        type: "image",
        label: product.lineImageName,
        src: product.lineImageSrc
      };
    }

    return {
      type: "image",
      label: product.imageName,
      src: product.imageSrc
    };
  }

  //function getImagePath(name) {
  //  return name && name !== "NULL" ? "./assets/images/shop/" + name : "";
  //}
  // 圖片網址已由後端 ShopService 組好，放在 data-image-src / data-line-image-src。
  // 這裡保留函式只是避免既有 renderProductThumb 呼叫時出錯。
    function getImagePath() {
        return "";
    }

  function renderProductThumb(container, product) {
    if (!container) return;

    const preview = getPreviewInfo(product);
    container.innerHTML = "";
    container.className = "shop-product-thumb" + (preview.type === "color" ? " is-color" : "");
    container.style.removeProperty("--shop-color");

    const fallback = document.createElement("span");
    fallback.textContent = preview.label === "NULL" ? "圖片預留" : preview.label;

    if (preview.type === "color") {
      container.style.setProperty("--shop-color", preview.color);
      container.appendChild(fallback);
      return;
    }

    const src = preview.src || getImagePath(preview.label);
    if (!src) {
      container.appendChild(fallback);
      return;
    }

    const image = document.createElement("img");
    image.src = src;
    image.alt = product.name + "商品圖";
    image.onerror = () => {
      image.remove();
      if (!container.contains(fallback)) container.appendChild(fallback);
    };
    container.appendChild(image);
  }

  function syncStatusLabel(row) {
    const input = row.querySelector("[data-shop-status]");
    const label = row.querySelector(".member-status-text");
    if (!input) return;

    row.dataset.active = String(input.checked);
    if (label) label.textContent = input.checked ? "啟用" : "停用";
  }

  function collectRows() {
    rows = Array.from(refs.shopTableBody?.querySelectorAll("[data-shop-row]") || []);
    rows.forEach((row) => {
      const input = row.querySelector("[data-shop-status]");
      if (input) input.checked = row.dataset.active === "true";
      syncStatusLabel(row);
      renderProductThumb(row.querySelector("[data-shop-thumb]"), getProductData(row));
    });
  }

  function matchesFilters(row) {
    const data = getProductData(row);
    const min = state.filters.priceMin === "" ? null : Number(state.filters.priceMin);
    const max = state.filters.priceMax === "" ? null : Number(state.filters.priceMax);

    return (!state.filters.id || normalize(data.id).includes(normalize(state.filters.id)))
      && (!state.filters.name || normalize(data.name).includes(normalize(state.filters.name)))
      && (!state.filters.type || data.type === state.filters.type)
      && (min === null || data.price >= min)
      && (max === null || data.price <= max);
  }

  function getSortValue(row, key) {
    const data = getProductData(row);
    if (key === "id" || key === "price") return Number(data[key]) || 0;
    if (key === "active") return data.active ? 1 : 0;
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
    document.querySelectorAll("[data-shop-sort]").forEach((button) => {
      const icon = button.querySelector("i");
      if (!icon) return;

      icon.className = button.dataset.shopSort === state.sortKey
        ? "bi " + (state.sortDir === "asc" ? "bi-sort-up" : "bi-sort-down")
        : "bi bi-arrow-down-up";
    });
  }

  function renderPagination(totalPages) {
    if (!refs.shopPagination) return;

    refs.shopPagination.innerHTML = "";
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
      refs.shopPagination.appendChild(item);
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
    row.dataset.shopEmpty = "true";
    const cell = document.createElement("td");
    cell.colSpan = 7;
    cell.textContent = "查無符合條件的商品資料";
    row.appendChild(cell);
    return row;
  }

  function renderTable() {
    if (!refs.shopTableBody) return;

    refs.shopTableBody.querySelector("[data-shop-empty]")?.remove();
    const filteredRows = getFilteredRows();
    const totalPages = Math.max(Math.ceil(filteredRows.length / state.pageSize), 1);
    state.page = Math.min(state.page, totalPages);
    const startIndex = (state.page - 1) * state.pageSize;
    const pageRows = filteredRows.slice(startIndex, startIndex + state.pageSize);
    const endIndex = startIndex + pageRows.length;

    rows.forEach((row) => row.classList.add("d-none"));
    if (!pageRows.length) {
      refs.shopTableBody.appendChild(getEmptyRow());
    } else {
      pageRows.forEach((row) => {
        row.classList.remove("d-none");
        refs.shopTableBody.appendChild(row);
      });
    }

    if (refs.shopResultCount) refs.shopResultCount.textContent = "共 " + filteredRows.length + " 筆";
    if (refs.shopPageInfo) {
      refs.shopPageInfo.textContent = filteredRows.length
        ? "第 " + state.page + " / " + totalPages + " 頁・顯示 " + (startIndex + 1) + "-" + endIndex + " 筆"
        : "沒有符合條件的商品";
    }
    renderPagination(totalPages);
    updateSortIcons();
  }

  function findRow(id) {
    if (!rows.length) collectRows();
    return rows.find((row) => (row.dataset.id || "") === String(id));
  }

  function renderDetail(row) {
    const data = getProductData(row);
    if (refs.shopDetailView) refs.shopDetailView.dataset.shopId = data.id;
    if (refs.shopDetailTitle) refs.shopDetailTitle.textContent = data.name + "｜#" + data.id;

    refs.shopDetailGrid?.querySelectorAll("[data-shop-detail-value]").forEach((node) => {
      node.textContent = data[node.dataset.shopDetailValue] ?? "";
    });

    if (refs.shopDetailStatus) refs.shopDetailStatus.checked = data.active;
    if (refs.shopDetailStatusLabel) refs.shopDetailStatusLabel.textContent = data.activeText;
    refs.shopSortOrderField?.classList.toggle("d-none", data.type !== "配件");
    refs.shopFrameShapeField?.classList.toggle("d-none", data.type !== "頭像框");
    if (refs.shopDetailSortOrder) {
      refs.shopDetailSortOrder.value = isValidAccessorySortOrder(data.sortOrder) ? data.sortOrder : "1";
    }

    refs.shopDetailVisual.innerHTML = "";
    const visual = document.createElement("div");
    renderProductThumb(visual, data, true);
    refs.shopDetailVisual.appendChild(visual);
  }

  function showDetail(id, updateHash = true) {
    const row = findRow(id);
    if (!row) return;

    const data = getProductData(row);
    refs.shopManagementView?.classList.add("d-none");
    refs.shopDetailView?.classList.remove("d-none");
    refs.shopManagementActions?.classList.add("d-none");
    if (refs.managementTitle) refs.managementTitle.textContent = "商品詳情";
    if (refs.managementDescription) refs.managementDescription.textContent = "查看「" + data.name + "」的完整商品資料與上下架狀態。";
    renderDetail(row);
    if (updateHash) history.replaceState(null, "", "#shop-detail-" + encodeURIComponent(data.id));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function showList() {
    refs.shopDetailView?.classList.add("d-none");
    refs.shopManagementView?.classList.remove("d-none");
    refs.shopManagementActions?.classList.remove("d-none");
    if (refs.managementTitle) refs.managementTitle.textContent = "商城管理";
    if (refs.managementDescription) refs.managementDescription.textContent = "管理商城商品清單、上架狀態與新增商品素材。";
    //history.replaceState(null, "", "shop-management.html");
    //目前是 MVC /Shop/Index 頁面，不是 shop-management.html 靜態頁。
    history.replaceState(null, "", location.pathname);
    renderTable();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function setInvalid(input, message = "") {
    if (!input) return;
    const feedback = input.parentElement?.querySelector(".invalid-feedback");
    if (feedback && !feedback.dataset.defaultMessage) feedback.dataset.defaultMessage = feedback.textContent;
    input.classList.toggle("is-invalid", Boolean(message));
    if (feedback) feedback.textContent = message || feedback.dataset.defaultMessage;
  }

  function setStandaloneInvalid(input, error, visible, message = "") {
    input?.classList.toggle("is-invalid", visible);
    if (!error) return;

    if (!error.dataset.defaultMessage) error.dataset.defaultMessage = error.textContent;
    error.textContent = visible && message ? message : error.dataset.defaultMessage;
    error.classList.toggle("d-none", !visible);
    error.classList.toggle("d-block", visible);
  }

  function clearCreateValidation() {
    [
      refs.shopCreateName,
      refs.shopCreatePrice,
      refs.shopCreateBodyImage,
      refs.shopCreateAccessoryLineImage,
      refs.shopCreateAccessoryMaskImage,
      refs.shopCreateAccessorySort,
      refs.shopCreateFrameImage
    ].forEach((input) => setInvalid(input));
    setStandaloneInvalid(refs.shopCreateColorHex, refs.shopCreateColorError, false);
  }

  function isValidHex(value) {
    return /^#[0-9a-fA-F]{6}$/.test(String(value || "").trim());
  }

  function isValidAccessorySortOrder(value) {
    return accessorySortOrders.includes(Number(value));
  }

  function getSingleFile(input) {
    return input?.files?.[0] || null;
  }

  function fileAsset(file) {
    return file
      ? { name: file.name, src: URL.createObjectURL(file) }
      : { name: "NULL", src: "" };
  }

  function nextId(key) {
    return Math.max(0, ...rows.map((row) => Number(row.dataset[key]) || 0)) + 1;
  }

  function getNextProductId() {
    return Math.max(0, ...rows.map((row) => Number(row.dataset.id) || 0)) + 1;
  }

  function getNextTypeId(type) {
    const keyMap = {
      "底圖": "bodyId",
      "配件": "accessoryId",
      "頭像框": "framesId",
      "染劑": "colorsId"
    };
    return nextId(keyMap[type]);
  }

  function setCreateMode(type) {
    currentCreateType = type;
    if (refs.shopCreateModalTitle) refs.shopCreateModalTitle.textContent = "新增" + type;
    document.querySelectorAll("[data-shop-create-panel]").forEach((panel) => {
      panel.classList.toggle("d-none", panel.dataset.shopCreatePanel !== type);
    });
  }

  function resetCreateForm() {
    refs.shopCreateForm?.reset();
    if (refs.shopCreateColorPicker) refs.shopCreateColorPicker.value = "#ff44aa";
    if (refs.shopCreateColorHex) refs.shopCreateColorHex.value = "#FF44AA";
    clearCreateValidation();
  }

  function openCreateModal(type) {
    resetCreateForm();
    setCreateMode(type);
    createModal?.show();
    if (!createModal) refs.shopCreateName?.focus();
  }

  function validateCreateForm() {
    clearCreateValidation();
    let valid = true;
    const price = Number(refs.shopCreatePrice?.value);

    if (!refs.shopCreateName?.value.trim()) {
      setInvalid(refs.shopCreateName, "請輸入商品名稱。");
      valid = false;
    }
    if (!Number.isFinite(price) || price < 0 || refs.shopCreatePrice?.value === "") {
      setInvalid(refs.shopCreatePrice, "請輸入有效價格。");
      valid = false;
    }

    if (currentCreateType === "底圖" && !getSingleFile(refs.shopCreateBodyImage)) {
      setInvalid(refs.shopCreateBodyImage, "請上傳一張圖片。");
      valid = false;
    }
    if (currentCreateType === "配件") {
      if (!getSingleFile(refs.shopCreateAccessoryLineImage)) {
        setInvalid(refs.shopCreateAccessoryLineImage, "請上傳一張線稿圖片。");
        valid = false;
      }
      if (!getSingleFile(refs.shopCreateAccessoryMaskImage)) {
        setInvalid(refs.shopCreateAccessoryMaskImage, "請上傳一張遮罩圖片。");
        valid = false;
      }
      if (!isValidAccessorySortOrder(refs.shopCreateAccessorySort?.value)) {
        setInvalid(refs.shopCreateAccessorySort, "請選擇圖層排序。");
        valid = false;
      }
    }
    if (currentCreateType === "頭像框" && !getSingleFile(refs.shopCreateFrameImage)) {
      setInvalid(refs.shopCreateFrameImage, "請上傳一張圖片。");
      valid = false;
    }
    if (currentCreateType === "染劑" && !isValidHex(refs.shopCreateColorHex?.value)) {
      setStandaloneInvalid(refs.shopCreateColorHex, refs.shopCreateColorError, true);
      valid = false;
    }

    return valid;
  }

  function buildProductFromCreate() {
    const typeId = getNextTypeId(currentCreateType);
    const product = {
      id: getNextProductId(),
      type: currentCreateType,
      bodyId: "NULL",
      accessoryId: "NULL",
      framesId: "NULL",
      colorsId: "NULL",
      name: refs.shopCreateName.value.trim(),
      imageName: "NULL",
      imageSrc: "",
      lineImageName: "NULL",
      lineImageSrc: "",
      maskImageName: "NULL",
      maskImageSrc: "",
      sortOrder: "NULL",
      isSquare: "NULL",
      hexCode: "NULL",
      price: Number(refs.shopCreatePrice.value) || 0,
      active: false,
      adminComment: "NULL",
      adminUpdatedAt: "NULL",
      modifiedByAdmin: "NULL"
    };

    if (currentCreateType === "底圖") {
      const image = fileAsset(getSingleFile(refs.shopCreateBodyImage));
      product.bodyId = String(typeId);
      product.imageName = image.name;
      product.imageSrc = image.src;
    } else if (currentCreateType === "配件") {
      const line = fileAsset(getSingleFile(refs.shopCreateAccessoryLineImage));
      const mask = fileAsset(getSingleFile(refs.shopCreateAccessoryMaskImage));
      product.accessoryId = String(typeId);
      product.lineImageName = line.name;
      product.lineImageSrc = line.src;
      product.maskImageName = mask.name;
      product.maskImageSrc = mask.src;
      product.sortOrder = refs.shopCreateAccessorySort.value;
    } else if (currentCreateType === "頭像框") {
      const image = fileAsset(getSingleFile(refs.shopCreateFrameImage));
      product.framesId = String(typeId);
      product.imageName = image.name;
      product.imageSrc = image.src;
      product.isSquare = document.querySelector('[name="shopCreateFrameShape"]:checked')?.value || "1";
    } else {
      product.colorsId = String(typeId);
      product.hexCode = refs.shopCreateColorHex.value.trim().toUpperCase();
    }

    return product;
  }

  function appendCell(row, key, value) {
    const cell = document.createElement("td");
    if (key) cell.dataset.shopCell = key;
    cell.textContent = value;
    row.appendChild(cell);
    return cell;
  }

  function buildRowFromData(product) {
    const row = document.createElement("tr");
    const statusId = "shopStatus" + product.id;
    row.dataset.shopRow = "";
    row.dataset.id = String(product.id);
    row.dataset.productType = product.type;
    row.dataset.bodyId = product.bodyId;
    row.dataset.accessoryId = product.accessoryId;
    row.dataset.framesId = product.framesId;
    row.dataset.colorsId = product.colorsId;
    row.dataset.name = product.name;
    row.dataset.imageName = product.imageName;
    row.dataset.imageSrc = product.imageSrc || "";
    row.dataset.lineImageName = product.lineImageName;
    row.dataset.lineImageSrc = product.lineImageSrc || "";
    row.dataset.maskImageName = product.maskImageName;
    row.dataset.maskImageSrc = product.maskImageSrc || "";
    row.dataset.sortOrder = product.sortOrder;
    row.dataset.isSquare = product.isSquare;
    row.dataset.hexCode = product.hexCode;
    row.dataset.price = String(product.price);
    row.dataset.active = String(product.active);
    row.dataset.adminComment = product.adminComment;
    row.dataset.adminUpdatedAt = product.adminUpdatedAt;
    row.dataset.modifiedByAdmin = product.modifiedByAdmin;

    appendCell(row, "id", product.id);

    const thumbCell = document.createElement("td");
    const thumb = document.createElement("div");
    thumb.dataset.shopThumb = "";
    thumbCell.appendChild(thumb);
    row.appendChild(thumbCell);

    appendCell(row, "name", product.name);
    appendCell(row, "type", product.type);
    appendCell(row, "price", formatNumber(product.price));

    const detailCell = document.createElement("td");
    const detailButton = document.createElement("button");
    detailButton.className = "member-detail-btn";
    detailButton.type = "button";
    detailButton.dataset.shopDetail = String(product.id);
    detailButton.innerHTML = '查看 <i class="bi bi-chevron-right"></i>';
    detailCell.appendChild(detailButton);
    row.appendChild(detailCell);

    const statusCell = document.createElement("td");
    const switchWrap = document.createElement("div");
    const input = document.createElement("input");
    const label = document.createElement("label");
    switchWrap.className = "form-check form-switch member-status-switch shop-status-switch";
    input.className = "form-check-input";
    input.id = statusId;
    input.type = "checkbox";
    input.role = "switch";
    input.dataset.shopStatus = String(product.id);
    input.checked = product.active;
    label.className = "member-status-text";
    label.htmlFor = statusId;
    label.textContent = product.active ? "啟用" : "停用";
    switchWrap.append(input, label);
    statusCell.appendChild(switchWrap);
    row.appendChild(statusCell);

    renderProductThumb(thumb, getProductData(row));
    return row;
  }

    // 後端 Ajax 回傳的 product 欄位是 camelCase JSON。
    // 這裡將 DTO 轉成既有 buildRowFromData 需要的 dataset 格式。
    function buildRow(product) {
        return buildRowFromData({
            id: product.id,
            type: product.productType,
            bodyId: nullToken(product.bodyId),
            accessoryId: nullToken(product.accessoryId),
            framesId: nullToken(product.framesId),
            colorsId: nullToken(product.colorsId),
            name: product.name,
            imageName: nullToken(product.imageName),
            imageSrc: product.imageSrc || "",
            lineImageName: nullToken(product.lineImageName),
            lineImageSrc: product.lineImageSrc || "",
            maskImageName: nullToken(product.maskImageName),
            maskImageSrc: product.maskImageSrc || "",
            sortOrder: nullToken(product.sortOrder),
            isSquare: product.isSquare === null || product.isSquare === undefined ? "NULL" : product.isSquare ? "1" : "0",
            hexCode: nullToken(product.hexCode),
            price: product.price,
            active: Boolean(product.isActive),
            adminComment: nullToken(product.adminComment),
            adminUpdatedAt: nullToken(product.adminUpdatedAtText),
            modifiedByAdmin: nullToken(product.modifiedByAdminAccount)
        });
    }

    // 修改狀態、價格、排序成功後，不重新整理整頁。
    // 直接用後端回傳的最新 product 更新目前 row 的 dataset 與畫面文字。
    function applyProductDto(row, product) {
        row.dataset.price = String(product.price);
        row.dataset.active = String(product.isActive);
        row.dataset.adminComment = nullToken(product.adminComment);
        row.dataset.adminUpdatedAt = nullToken(product.adminUpdatedAtText);
        row.dataset.modifiedByAdmin = nullToken(product.modifiedByAdminAccount);
        row.dataset.sortOrder = nullToken(product.sortOrder);

        const priceCell = row.querySelector('[data-shop-cell="price"]');
        if (priceCell) priceCell.textContent = product.priceFormatted;

        const input = row.querySelector("[data-shop-status]");
        if (input) input.checked = Boolean(product.isActive);

        syncStatusLabel(row);
        renderProductThumb(row.querySelector("[data-shop-thumb]"), getProductData(row));

        // 如果目前停在詳情畫面，也同步重畫詳情欄位與預覽圖片。
        if (!refs.shopDetailView?.classList.contains("d-none")) {
            renderDetail(row);
        }
    }

    // 新增商品的後端錯誤處理。
    // 商品名稱或染劑色號重複時，錯誤要像前端必填驗證一樣顯示在對應欄位下方。
    function showCreateError(error) {
        const message = error?.message || "新增商品失敗";

        if (message === "商品名稱不可重複。") {
            setInvalid(refs.shopCreateName, message);
            refs.shopCreateName?.focus();
            return;
        }

        if (message === "顏色色號不可重複。") {
            setStandaloneInvalid(refs.shopCreateColorHex, refs.shopCreateColorError, true, message);
            refs.shopCreateColorHex?.focus();
            return;
        }

        showToast(message);
    }


  //function handleCreateSubmit(event) {
  //  event.preventDefault();
  //  if (!validateCreateForm()) return;

  //  refs.shopTableBody.appendChild(buildRowFromData(buildProductFromCreate()));
  //  collectRows();
  //  state.sortKey = "id";
  //  state.sortDir = "asc";
  //  state.page = Math.max(Math.ceil(getFilteredRows().length / state.pageSize), 1);
  //  renderTable();
  //  createModal?.hide();
  //  resetCreateForm();
  //  showToast("已新增" + currentCreateType);
    //}
    // 新增商品 Ajax：
    // 1. 前端驗證欄位。
    // 2. FormData 送到 Shop/Create。
    // 3. 後端新增 DB 與上傳 R2。
    // 4. 回傳最新 DTO。
    // 5. 前端新增表格列並渲染縮圖，不重新整理頁面。
    async function handleCreateSubmit(event) {
        event.preventDefault();
        if (!validateCreateForm()) return;

        const submitButton = refs.shopCreateSubmit;
        const originalSubmitText = submitButton?.textContent || "新增商品";
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = "新增中...";
        }

        try {
            const result = await postForm(
                refs.shopManagementView.dataset.createUrl,
                buildCreateFormData()
            );

            refs.shopTableBody.appendChild(buildRow(result.product));
            collectRows();

            state.sortKey = "id";
            state.sortDir = "asc";
            state.page = Math.max(Math.ceil(getFilteredRows().length / state.pageSize), 1);

            renderTable();
            createModal?.hide();
            resetCreateForm();
            showToast("已新增" + result.product.productType);
        } catch (error) {
            showCreateError(error);
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = originalSubmitText;
            }
        }
    }

  function setStatusError(visible) {
    refs.shopStatusReason?.classList.toggle("is-invalid", visible);
    refs.shopStatusReasonError?.classList.toggle("d-none", !visible);
  }

  function openStatusModal(row, nextActive) {
    const data = getProductData(row);
    pendingStatusChange = { row, nextActive };
    if (refs.shopStatusModalTitle) refs.shopStatusModalTitle.textContent = nextActive ? "確認上架商品" : "確認下架商品";
    if (refs.shopStatusModalDescription) {
      refs.shopStatusModalDescription.textContent = "請輸入「" + data.name + "」的" + (nextActive ? "上架" : "下架") + "說明。";
    }
    if (refs.shopStatusReason) refs.shopStatusReason.value = "";
    setStatusError(false);
    statusModal?.show();
    if (!statusModal) {
      const reason = window.prompt("請輸入上下架說明");
      if (reason?.trim()) applyStatusChange(row, nextActive, reason.trim());
      pendingStatusChange = null;
    }
  }

  function applyStatusChange(row, nextActive, reason) {
    const input = row.querySelector("[data-shop-status]");
    if (input) input.checked = nextActive;
    row.dataset.adminComment = reason;
    row.dataset.adminUpdatedAt = formatDateTime();
    row.dataset.modifiedByAdmin = getActorAdmin();
    syncStatusLabel(row);
    if (!refs.shopDetailView?.classList.contains("d-none")) renderDetail(row);
    if (state.sortKey === "active") renderTable();
    showToast("商品狀態已更新");
  }

  //function confirmStatusChange() {
  //  const reason = refs.shopStatusReason?.value.trim() || "";
  //  if (!pendingStatusChange) return;
  //  if (!reason) {
  //    setStatusError(true);
  //    refs.shopStatusReason?.focus();
  //    return;
  //  }
  //  applyStatusChange(pendingStatusChange.row, pendingStatusChange.nextActive, reason);
  //  pendingStatusChange = null;
  //  statusModal?.hide();
    //}

    // 上下架 Ajax：
    // switch 被點擊時先還原畫面，等管理員輸入原因並確認後才送後端。
    async function confirmStatusChange() {
        const reason = refs.shopStatusReason?.value.trim() || "";
        if (!pendingStatusChange) return;

        if (!reason) {
            setStatusError(true);
            refs.shopStatusReason?.focus();
            return;
        }

        try {
            const result = await postJson(
                refs.shopManagementView.dataset.updateStatusUrl,
                {
                    productId: Number(pendingStatusChange.row.dataset.id),
                    isActive: pendingStatusChange.nextActive,
                    reason
                }
            );

            applyProductDto(pendingStatusChange.row, result.product);
            pendingStatusChange = null;
            statusModal?.hide();

            if (state.sortKey === "active") renderTable();
            showToast("商品狀態已更新");
        } catch (error) {
            showToast(error.message || "商品狀態更新失敗");
        }
    }

  function setPriceErrors(priceVisible, reasonVisible) {
    refs.shopPriceValue?.classList.toggle("is-invalid", priceVisible);
    refs.shopPriceValueError?.classList.toggle("d-none", !priceVisible);
    refs.shopPriceReason?.classList.toggle("is-invalid", reasonVisible);
    refs.shopPriceReasonError?.classList.toggle("d-none", !reasonVisible);
  }

  function openPriceModal() {
    const row = findRow(refs.shopDetailView?.dataset.shopId);
    if (!row) return;
    const data = getProductData(row);
    pendingPriceChange = { row };
    if (refs.shopPriceModalDescription) refs.shopPriceModalDescription.textContent = "請輸入「" + data.name + "」的新價格與修改說明。";
    if (refs.shopPriceValue) refs.shopPriceValue.value = data.price;
    if (refs.shopPriceReason) refs.shopPriceReason.value = "";
    setPriceErrors(false, false);
    priceModal?.show();
  }

  //function confirmPriceChange() {
  //  if (!pendingPriceChange) return;

  //  const value = Number(refs.shopPriceValue?.value);
  //  const reason = refs.shopPriceReason?.value.trim() || "";
  //  const invalidPrice = !Number.isFinite(value) || value < 0 || refs.shopPriceValue?.value === "";
  //  const invalidReason = !reason;
  //  if (invalidPrice || invalidReason) {
  //    setPriceErrors(invalidPrice, invalidReason);
  //    (invalidPrice ? refs.shopPriceValue : refs.shopPriceReason)?.focus();
  //    return;
  //  }

  //  const row = pendingPriceChange.row;
  //  row.dataset.price = String(value);
  //  row.dataset.adminComment = reason;
  //  row.dataset.adminUpdatedAt = formatDateTime();
  //  row.dataset.modifiedByAdmin = getActorAdmin();
  //  const priceCell = row.querySelector('[data-shop-cell="price"]');
  //  if (priceCell) priceCell.textContent = formatNumber(value);
  //  renderDetail(row);
  //  if (state.sortKey === "price") renderTable();
  //  pendingPriceChange = null;
  //  priceModal?.hide();
  //  showToast("商品價格已更新");
    //}

    // 修改價格 Ajax：
    // 成功後用回傳 DTO 更新價格欄位、管理員說明與詳情畫面。
    async function confirmPriceChange() {
        if (!pendingPriceChange) return;

        const value = Number(refs.shopPriceValue?.value);
        const reason = refs.shopPriceReason?.value.trim() || "";
        const invalidPrice = !Number.isFinite(value) || value < 0 || refs.shopPriceValue?.value === "";
        const invalidReason = !reason;

        if (invalidPrice || invalidReason) {
            setPriceErrors(invalidPrice, invalidReason);
            (invalidPrice ? refs.shopPriceValue : refs.shopPriceReason)?.focus();
            return;
        }

        try {
            const row = pendingPriceChange.row;
            const result = await postJson(
                refs.shopManagementView.dataset.updatePriceUrl,
                {
                    productId: Number(row.dataset.id),
                    price: value,
                    reason
                }
            );

            applyProductDto(row, result.product);

            if (state.sortKey === "price") renderTable();
            pendingPriceChange = null;
            priceModal?.hide();
            showToast("商品價格已更新");
        } catch (error) {
            showToast(error.message || "商品價格更新失敗");
        }
    }

  //function handleSortOrderChange() {
  //  const row = findRow(refs.shopDetailView?.dataset.shopId);
  //  if (!row || getProductData(row).type !== "配件") return;

  //  row.dataset.sortOrder = refs.shopDetailSortOrder.value;
  //  row.dataset.adminComment = "修改圖層排序為 " + refs.shopDetailSortOrder.value;
  //  row.dataset.adminUpdatedAt = formatDateTime();
  //  row.dataset.modifiedByAdmin = getActorAdmin();
  //  renderDetail(row);
  //  showToast("圖層排序已更新");
    //}

    // 修改配件圖層排序 Ajax：
    // 只有商品類型是「配件」時才允許送出。
    async function handleSortOrderChange() {
        const row = findRow(refs.shopDetailView?.dataset.shopId);
        if (!row || getProductData(row).type !== "配件") return;

        const previousSortOrder = refs.shopDetailSortOrder?.value || "1";
        const nextSortOrder = Number(refs.shopDetailSortOrder.value);

        if (!isValidAccessorySortOrder(nextSortOrder)) {
            refs.shopDetailSortOrder.value = previousSortOrder;
            showToast("圖層排序不合法。");
            return;
        }

        try {
            const result = await postJson(
                refs.shopManagementView.dataset.updateSortUrl,
                {
                    productId: Number(row.dataset.id),
                    sortOrder: nextSortOrder,
                    reason: "修改圖層排序為 " + nextSortOrder
                }
            );

            applyProductDto(row, result.product);
            showToast("圖層排序已更新");
        } catch (error) {
            refs.shopDetailSortOrder.value = previousSortOrder;
            showToast(error.message || "圖層排序更新失敗");
        }
    }

  function bindEvents() {
    createModal = refs.shopCreateModal && window.bootstrap?.Modal
      ? window.bootstrap.Modal.getOrCreateInstance(refs.shopCreateModal)
      : null;
    statusModal = refs.shopStatusModal && window.bootstrap?.Modal
      ? window.bootstrap.Modal.getOrCreateInstance(refs.shopStatusModal)
      : null;
    priceModal = refs.shopPriceModal && window.bootstrap?.Modal
      ? window.bootstrap.Modal.getOrCreateInstance(refs.shopPriceModal)
      : null;

    document.querySelectorAll("[data-shop-filter]").forEach((input) => {
      const update = () => {
        state.filters[input.dataset.shopFilter] = input.value.trim();
        state.page = 1;
        renderTable();
      };
      input.addEventListener("input", update);
      input.addEventListener("change", update);
    });

    refs.shopSearchForm?.addEventListener("submit", (event) => {
      event.preventDefault();
      state.page = 1;
      renderTable();
    });

    refs.shopFilterReset?.addEventListener("click", () => {
      document.querySelectorAll("[data-shop-filter]").forEach((input) => {
        input.value = "";
        state.filters[input.dataset.shopFilter] = "";
      });
      state.page = 1;
      renderTable();
    });

    document.querySelectorAll("[data-shop-sort]").forEach((button) => {
      button.addEventListener("click", () => {
        const sortKey = button.dataset.shopSort;
        if (state.sortKey === sortKey) state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
        else {
          state.sortKey = sortKey;
          state.sortDir = "asc";
        }
        state.page = 1;
        renderTable();
      });
    });

    document.querySelectorAll("[data-shop-create-open]").forEach((button) => {
      button.addEventListener("click", () => openCreateModal(button.dataset.shopCreateOpen));
    });

    refs.shopTableBody?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-shop-detail]");
      if (button) showDetail(button.dataset.shopDetail);
    });

    refs.shopTableBody?.addEventListener("change", (event) => {
      const input = event.target.closest("[data-shop-status]");
      if (!input) return;
      const row = input.closest("[data-shop-row]");
      const nextActive = input.checked;
      input.checked = !nextActive;
      syncStatusLabel(row);
      openStatusModal(row, nextActive);
    });

    refs.shopDetailBack?.addEventListener("click", showList);
    refs.shopDetailStatus?.addEventListener("change", (event) => {
      const row = findRow(refs.shopDetailView?.dataset.shopId);
      const nextActive = event.target.checked;
      event.target.checked = !nextActive;
      if (refs.shopDetailStatusLabel) refs.shopDetailStatusLabel.textContent = event.target.checked ? "啟用" : "停用";
      if (row) openStatusModal(row, nextActive);
    });

    refs.shopPriceEditOpen?.addEventListener("click", openPriceModal);
    refs.shopDetailSortOrder?.addEventListener("change", handleSortOrderChange);
    refs.shopCreateForm?.addEventListener("submit", handleCreateSubmit);
    refs.shopCreateName?.addEventListener("input", () => setInvalid(refs.shopCreateName));
    refs.shopCreateModal?.addEventListener("hidden.bs.modal", resetCreateForm);
    refs.shopCreateModal?.addEventListener("shown.bs.modal", () => refs.shopCreateName?.focus());

    refs.shopStatusConfirm?.addEventListener("click", confirmStatusChange);
    refs.shopStatusReason?.addEventListener("input", () => setStatusError(false));
    refs.shopStatusModal?.addEventListener("hidden.bs.modal", () => {
      pendingStatusChange = null;
      setStatusError(false);
    });

    refs.shopPriceConfirm?.addEventListener("click", confirmPriceChange);
    refs.shopPriceValue?.addEventListener("input", () => setPriceErrors(false, false));
    refs.shopPriceReason?.addEventListener("input", () => setPriceErrors(false, false));
    refs.shopPriceModal?.addEventListener("hidden.bs.modal", () => {
      pendingPriceChange = null;
      setPriceErrors(false, false);
    });

    refs.shopCreateColorPicker?.addEventListener("input", () => {
      refs.shopCreateColorHex.value = refs.shopCreateColorPicker.value.toUpperCase();
      setStandaloneInvalid(refs.shopCreateColorHex, refs.shopCreateColorError, false);
    });
    refs.shopCreateColorHex?.addEventListener("input", () => {
      const value = refs.shopCreateColorHex.value.trim();
      if (isValidHex(value)) {
        refs.shopCreateColorPicker.value = value;
        setStandaloneInvalid(refs.shopCreateColorHex, refs.shopCreateColorError, false);
      }
    });
  }

  function init() {
    Object.assign(refs, {
      shopManagementView: document.getElementById("shopManagementView"),
      shopDetailView: document.getElementById("shopDetailView"),
      shopManagementActions: document.getElementById("shopManagementActions"),
      shopSearchForm: document.getElementById("shopSearchForm"),
      shopFilterReset: document.getElementById("shopFilterReset"),
      shopTableBody: document.getElementById("shopTableBody"),
      shopPagination: document.getElementById("shopPagination"),
      shopPageInfo: document.getElementById("shopPageInfo"),
      shopResultCount: document.getElementById("shopResultCount"),
      shopDetailTitle: document.getElementById("shopDetailTitle"),
      shopDetailGrid: document.getElementById("shopDetailGrid"),
      shopDetailVisual: document.getElementById("shopDetailVisual"),
      shopDetailBack: document.getElementById("shopDetailBack"),
      shopDetailStatus: document.getElementById("shopDetailStatus"),
      shopDetailStatusLabel: document.getElementById("shopDetailStatusLabel"),
      shopSortOrderField: document.getElementById("shopSortOrderField"),
      shopDetailSortOrder: document.getElementById("shopDetailSortOrder"),
      shopFrameShapeField: document.getElementById("shopFrameShapeField"),
      shopPriceEditOpen: document.getElementById("shopPriceEditOpen"),
      managementTitle: document.getElementById("managementTitle"),
      managementDescription: document.getElementById("managementDescription"),
      shopCreateModal: document.getElementById("shopCreateModal"),
      shopCreateForm: document.getElementById("shopCreateForm"),
      shopCreateModalTitle: document.getElementById("shopCreateModalTitle"),
      shopCreateName: document.getElementById("shopCreateName"),
      shopCreatePrice: document.getElementById("shopCreatePrice"),
      shopCreateBodyImage: document.getElementById("shopCreateBodyImage"),
      shopCreateAccessoryLineImage: document.getElementById("shopCreateAccessoryLineImage"),
      shopCreateAccessoryMaskImage: document.getElementById("shopCreateAccessoryMaskImage"),
      shopCreateAccessorySort: document.getElementById("shopCreateAccessorySort"),
      shopCreateFrameImage: document.getElementById("shopCreateFrameImage"),
      shopCreateColorPicker: document.getElementById("shopCreateColorPicker"),
      shopCreateColorHex: document.getElementById("shopCreateColorHex"),
      shopCreateColorError: document.getElementById("shopCreateColorError"),
      shopCreateSubmit: document.getElementById("shopCreateSubmit"),
      shopStatusModal: document.getElementById("shopStatusModal"),
      shopStatusModalTitle: document.getElementById("shopStatusModalTitle"),
      shopStatusModalDescription: document.getElementById("shopStatusModalDescription"),
      shopStatusReason: document.getElementById("shopStatusReason"),
      shopStatusReasonError: document.getElementById("shopStatusReasonError"),
      shopStatusConfirm: document.getElementById("shopStatusConfirm"),
      shopPriceModal: document.getElementById("shopPriceModal"),
      shopPriceModalDescription: document.getElementById("shopPriceModalDescription"),
      shopPriceValue: document.getElementById("shopPriceValue"),
      shopPriceValueError: document.getElementById("shopPriceValueError"),
      shopPriceReason: document.getElementById("shopPriceReason"),
      shopPriceReasonError: document.getElementById("shopPriceReasonError"),
      shopPriceConfirm: document.getElementById("shopPriceConfirm"),
      actionToast: document.getElementById("actionToast"),
      toastMessage: document.getElementById("toastMessage")
    });

    if (!refs.shopManagementView) return;
    collectRows();
    bindEvents();
    renderTable();
    const detailMatch = window.location.hash.match(/^#shop-detail-(.+)$/);
    if (detailMatch) showDetail(decodeURIComponent(detailMatch[1]), false);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
