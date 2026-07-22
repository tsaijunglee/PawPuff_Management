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
            category: "",
            title: ""
        }
    };

    const actorAdmin = "admin01";
    let rows = [];
    let createModal = null;
    let editModal = null;
    let statusModal = null;
    let reactionModal = null;
    let commentStatusModal = null;
    let pendingStatusChange = null;
    let pendingCommentStatusChange = null;
    let emptyRow = null;
    const detailImageState = {
        images: [],
        index: 0
    };
    let createImages = [];
    let editImages = [];
    let editingArticleId = "";

    function normalize(value) {
        return String(value || "").trim().toLowerCase();
    }

    function normalizeNullable(value) {
        return value && value !== "NULL" ? value : "NULL";
    }

    function getCellText(row, key) {
        return row.querySelector('[data-article-cell="' + key + '"]')?.textContent.trim() || "";
    }

    function collectRows() {
        rows = Array.from(document.querySelectorAll("[data-article-row]"));
    }

    function parsePipeList(value) {
        return String(value || "")
            .split("|")
            .map((item) => item.trim())
            .filter(Boolean);
    }

    function getArticleImages(row) {
        const names = parsePipeList(row.dataset.imageNames);
        const srcs = parsePipeList(row.dataset.imageSrcs);

        return names.map((name, index) => ({
            name,
            src: srcs[index] || ""
        }));
    }

    function getReactionRecords(type, articleId) {
        return Array.from(document.querySelectorAll('[data-article-reaction="' + type + '"][data-article-id="' + articleId + '"]'))
            .map((node) => ({
                account: node.dataset.account || "",
                createdAt: node.dataset.createdAt || ""
            }));
    }

    function getCommentData(node) {
        const active = node.dataset.active === "true";
        return {
            id: node.dataset.commentId || "",
            articleId: node.dataset.articleId || "",
            parentCommentId: normalizeNullable(node.dataset.parentCommentId),
            account: node.dataset.account || "",
            commentContent: node.dataset.commentContent || "",
            active,
            activeText: active ? "啟用" : "停用",
            createdAt: node.dataset.createdAt || "",
            updatedAt: normalizeNullable(node.dataset.updatedAt),
            adminComment: normalizeNullable(node.dataset.adminComment),
            adminUpdatedAt: normalizeNullable(node.dataset.adminUpdatedAt),
            modifiedByAdmin: normalizeNullable(node.dataset.modifiedByAdmin),
            node
        };
    }

    function getCommentRecords(articleId) {
        return Array.from(document.querySelectorAll('[data-article-comment][data-article-id="' + articleId + '"]'))
            .map(getCommentData)
            .sort((commentA, commentB) => (Number(commentA.id) || 0) - (Number(commentB.id) || 0));
    }

    function findCommentNode(commentId) {
        return document.querySelector('[data-article-comment][data-comment-id="' + commentId + '"]');
    }

    function createCommentMeta(label, value) {
        const item = document.createElement("div");
        const labelNode = document.createElement("span");
        const valueNode = document.createElement("strong");
        item.className = "article-comment-meta";
        labelNode.textContent = label;
        valueNode.textContent = normalizeNullable(value);
        item.append(labelNode, valueNode);
        return item;
    }

    function buildCommentNode(comment, childrenByParent, level = 0) {
        const item = document.createElement("article");
        const top = document.createElement("div");
        const account = document.createElement("div");
        const accountText = document.createElement("span");
        const switchWrap = document.createElement("div");
        const input = document.createElement("input");
        const label = document.createElement("label");
        const content = document.createElement("div");
        const metaGrid = document.createElement("div");
        const statusId = "articleCommentStatus" + comment.id;

        item.className = "article-comment-item";
        if (level > 0) item.classList.add("is-reply");
        if (!comment.active) item.classList.add("is-disabled");

        top.className = "article-comment-top";
        account.className = "article-comment-account";
        accountText.textContent = comment.account;
        account.appendChild(accountText);

        if (comment.parentCommentId !== "NULL") {
            const replyBadge = document.createElement("span");
            replyBadge.className = "article-comment-badge";
            replyBadge.textContent = "回覆留言";
            account.appendChild(replyBadge);
        }

        switchWrap.className = "form-check form-switch member-status-switch article-status-switch article-comment-status-switch";
        input.className = "form-check-input";
        input.id = statusId;
        input.type = "checkbox";
        input.role = "switch";
        input.checked = comment.active;
        input.dataset.commentStatus = comment.id;
        label.className = "member-status-text";
        label.htmlFor = statusId;
        label.textContent = comment.activeText;
        switchWrap.append(input, label);
        top.append(account, switchWrap);

        content.className = "article-comment-content";
        content.textContent = comment.commentContent;

        metaGrid.className = "article-comment-meta-grid";
        metaGrid.append(
            createCommentMeta("留言建立時間", comment.createdAt),
            createCommentMeta("留言者更新留言時間", comment.updatedAt),
            createCommentMeta("留言屏蔽說明", comment.adminComment),
            createCommentMeta("留言屏蔽日期", comment.adminUpdatedAt),
            createCommentMeta("操作屏蔽管理員帳號", comment.modifiedByAdmin)
        );

        item.append(top, content, metaGrid);

        const children = childrenByParent.get(comment.id) || [];
        if (children.length) {
            const childWrap = document.createElement("div");
            childWrap.className = "article-comment-children";
            children.forEach((child) => childWrap.appendChild(buildCommentNode(child, childrenByParent, level + 1)));
            item.appendChild(childWrap);
        }

        return item;
    }

    function renderComments(articleId) {
        const list = document.getElementById("articleCommentList");
        const count = document.getElementById("articleCommentCount");
        if (!list) return;

        const records = getCommentRecords(articleId);
        const knownIds = new Set(records.map((comment) => comment.id));
        const childrenByParent = new Map();
        const roots = records.filter((comment) => comment.parentCommentId === "NULL" || !knownIds.has(comment.parentCommentId));

        records.forEach((comment) => {
            if (comment.parentCommentId === "NULL" || !knownIds.has(comment.parentCommentId)) return;
            if (!childrenByParent.has(comment.parentCommentId)) childrenByParent.set(comment.parentCommentId, []);
            childrenByParent.get(comment.parentCommentId).push(comment);
        });

        if (count) count.textContent = "共 " + records.length + " 則";
        list.innerHTML = "";

        if (!records.length) {
            const empty = document.createElement("div");
            empty.className = "article-comment-empty";
            empty.textContent = "此文章目前沒有留言資料";
            list.appendChild(empty);
            return;
        }

        roots.forEach((comment) => list.appendChild(buildCommentNode(comment, childrenByParent)));
    }

    function getReactionLabel(type) {
        return type === "favorite"
            ? { title: "檢視收藏", time: "收藏時間", empty: "此文章目前沒有收藏資料" }
            : { title: "檢視按讚", time: "按讚時間", empty: "此文章目前沒有按讚資料" };
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

    function getArticleData(row) {
        const active = row.dataset.active === "true";
        return {
            id: row.dataset.id || getCellText(row, "id"),
            account: row.dataset.account || getCellText(row, "account"),
            categoryName: row.dataset.categoryName || getCellText(row, "category"),
            title: row.dataset.title || getCellText(row, "title"),
            articleContent: row.dataset.articleContent || "",
            images: getArticleImages(row),
            active,
            activeText: active ? "啟用" : "停用",
            createdAt: row.dataset.createdAt || "",
            updatedAt: normalizeNullable(row.dataset.updatedAt),
            adminComment: normalizeNullable(row.dataset.adminComment),
            adminUpdatedAt: normalizeNullable(row.dataset.adminUpdatedAt),
            modifiedByAdmin: normalizeNullable(row.dataset.modifiedByAdmin)
        };
    }

    function syncStatusLabel(row) {
        const input = row.querySelector("[data-article-status]");
        const label = row.querySelector(".member-status-text");
        if (!input) return;

        row.dataset.active = String(input.checked);
        if (label) label.textContent = input.checked ? "啟用" : "停用";
    }

    function matchesFilters(row) {
        const data = getArticleData(row);
        return (!state.filters.id || normalize(data.id).includes(normalize(state.filters.id)))
            && (!state.filters.account || normalize(data.account).includes(normalize(state.filters.account)))
            && (!state.filters.category || data.categoryName === state.filters.category)
            && (!state.filters.title || normalize(data.title).includes(normalize(state.filters.title)));
    }

    function compareRows(rowA, rowB) {
        const dataA = getArticleData(rowA);
        const dataB = getArticleData(rowB);
        let result = 0;

        if (state.sortKey === "id") {
            result = (Number(dataA.id) || 0) - (Number(dataB.id) || 0);
        } else if (state.sortKey === "active") {
            result = Number(dataA.active) - Number(dataB.active);
        } else if (state.sortKey === "account") {
            result = dataA.account.localeCompare(dataB.account, "zh-Hant");
        } else if (state.sortKey === "category") {
            result = dataA.categoryName.localeCompare(dataB.categoryName, "zh-Hant");
        } else {
            result = dataA.title.localeCompare(dataB.title, "zh-Hant");
        }

        return state.sortDir === "asc" ? result : -result;
    }

    function getFilteredRows() {
        return rows.filter(matchesFilters).sort(compareRows);
    }

    function updateSortIcons() {
        document.querySelectorAll("[data-article-sort]").forEach((button) => {
            const icon = button.querySelector("i");
            if (!icon) return;

            icon.className = button.dataset.articleSort === state.sortKey
                ? "bi " + (state.sortDir === "asc" ? "bi-sort-down" : "bi-sort-up")
                : "bi bi-arrow-down-up";
        });
    }

    function ensureEmptyRow(tableBody) {
        if (emptyRow) return emptyRow;

        emptyRow = document.createElement("tr");
        emptyRow.className = "article-empty-row d-none";
        const cell = document.createElement("td");
        cell.colSpan = 6;
        cell.textContent = "沒有符合條件的文章";
        emptyRow.appendChild(cell);
        tableBody.appendChild(emptyRow);
        return emptyRow;
    }

    function renderPagination(totalPages) {
        const pagination = document.getElementById("articlePagination");
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
        const tableBody = document.getElementById("articleTableBody");
        const resultCount = document.getElementById("articleResultCount");
        const pageInfo = document.getElementById("articlePageInfo");
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
                : "沒有符合條件的文章";
        }
        renderPagination(totalPages);
        updateSortIcons();
    }

    function findArticleRow(articleId) {
        if (!rows.length) collectRows();
        return rows.find((row) => (row.dataset.id || "") === String(articleId));
    }

    function renderDetail(row) {
        const grid = document.getElementById("articleDetailGrid");
        if (!grid) return;

        const data = getArticleData(row);
        const detailView = document.getElementById("articleDetailView");
        if (detailView) detailView.dataset.articleId = data.id;

        grid.querySelectorAll("[data-article-detail-value]").forEach((node) => {
            node.textContent = data[node.dataset.articleDetailValue] ?? "";
        });

        const detailStatus = document.getElementById("articleDetailStatus");
        const detailStatusLabel = document.getElementById("articleDetailStatusLabel");
        if (detailStatus) detailStatus.checked = data.active;
        if (detailStatusLabel) detailStatusLabel.textContent = data.activeText;

        const title = document.getElementById("articleDetailTitle");
        if (title) title.textContent = data.title + "｜#" + data.id;
        const editOpen = document.getElementById("articleEditOpen");
        if (editOpen) editOpen.classList.toggle("d-none", data.account !== "admin");
        updateReactionButtons(data.id);
        renderComments(data.id);
        detailImageState.images = data.images;
        detailImageState.index = 0;
        renderArticleImage();
    }

    function getImageSrc(item) {
        return item.src || "./assets/images/articles/" + item.name;
    }

    function renderArticleImage() {
        const viewer = document.getElementById("articleImageViewer");
        const image = document.getElementById("articleDetailImage");
        const fallback = document.getElementById("articleImageFallback");
        const meta = document.getElementById("articleImageMeta");
        const prev = document.getElementById("articleImagePrev");
        const next = document.getElementById("articleImageNext");
        const images = detailImageState.images;
        const hasImages = images.length > 0;
        if (!viewer || !image || !fallback || !meta) return;

        viewer.classList.toggle("is-empty", !hasImages);
        if (!hasImages) {
            image.removeAttribute("src");
            image.style.display = "none";
            fallback.textContent = "";
            meta.textContent = "";
            if (prev) prev.disabled = true;
            if (next) next.disabled = true;
            return;
        }

        detailImageState.index = Math.max(0, Math.min(detailImageState.index, images.length - 1));
        const item = images[detailImageState.index];
        fallback.textContent = item.name;
        image.style.display = "none";
        image.onload = () => {
            image.style.display = "block";
            fallback.textContent = "";
        };
        image.onerror = () => {
            image.style.display = "none";
            fallback.textContent = item.name;
        };
        image.src = getImageSrc(item);
        meta.textContent = images.length > 1
            ? (detailImageState.index + 1) + " / " + images.length + "・" + item.name
            : item.name;
        if (prev) prev.disabled = images.length <= 1;
        if (next) next.disabled = images.length <= 1;
    }

    function updateReactionButtons(articleId) {
        const likeCount = getReactionRecords("like", articleId).length;
        const favoriteCount = getReactionRecords("favorite", articleId).length;
        const likeCountNode = document.getElementById("articleLikeCount");
        const favoriteCountNode = document.getElementById("articleFavoriteCount");

        if (likeCountNode) likeCountNode.textContent = likeCount;
        if (favoriteCountNode) favoriteCountNode.textContent = favoriteCount;
    }

    function openReactionModal(type) {
        const detailView = document.getElementById("articleDetailView");
        const articleId = detailView?.dataset.articleId;
        const records = getReactionRecords(type, articleId);
        const label = getReactionLabel(type);
        const title = document.getElementById("articleReactionModalTitle");
        const count = document.getElementById("articleReactionModalCount");
        const timeTitle = document.getElementById("articleReactionTimeTitle");
        const tableBody = document.getElementById("articleReactionTableBody");

        if (title) title.textContent = label.title;
        if (count) count.textContent = "共 " + records.length + " 筆";
        if (timeTitle) timeTitle.textContent = label.time;
        if (!tableBody) return;

        tableBody.innerHTML = "";
        if (!records.length) {
            const row = document.createElement("tr");
            const cell = document.createElement("td");
            row.className = "article-reaction-empty";
            cell.colSpan = 2;
            cell.textContent = label.empty;
            row.appendChild(cell);
            tableBody.appendChild(row);
        } else {
            records.forEach((record) => {
                const row = document.createElement("tr");
                const accountCell = document.createElement("td");
                const timeCell = document.createElement("td");
                accountCell.textContent = record.account;
                timeCell.textContent = record.createdAt;
                row.append(accountCell, timeCell);
                tableBody.appendChild(row);
            });
        }

        reactionModal?.show();
    }

    function showDetail(articleId, updateHash = true) {
        const row = findArticleRow(articleId);
        if (!row) return;

        const data = getArticleData(row);
        document.getElementById("articleManagementView")?.classList.add("d-none");
        document.getElementById("articleDetailView")?.classList.remove("d-none");
        const title = document.getElementById("managementTitle");
        const description = document.getElementById("managementDescription");
        if (title) title.textContent = "文章詳情";
        if (description) description.textContent = "查看「" + data.title + "」的完整內容與屏蔽狀態。";
        renderDetail(row);
        if (updateHash) history.replaceState(null, "", "#article-detail-" + encodeURIComponent(data.id));
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function showList() {
        document.getElementById("articleDetailView")?.classList.add("d-none");
        document.getElementById("articleManagementView")?.classList.remove("d-none");
        const title = document.getElementById("managementTitle");
        const description = document.getElementById("managementDescription");
        if (title) title.textContent = "文章管理";
        if (description) description.textContent = "檢視、建立、編輯與上下架文章內容。";
        history.replaceState(null, "", "article-management.html");
        renderTable();
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function setFieldInvalid(input, message = "") {
        if (!input) return;
        const feedback = input.parentElement?.querySelector(".invalid-feedback");
        if (feedback && !feedback.dataset.defaultMessage) feedback.dataset.defaultMessage = feedback.textContent;
        input.classList.toggle("is-invalid", Boolean(message));
        if (feedback) feedback.textContent = message || feedback.dataset.defaultMessage;
    }

    function clearCreateValidation() {
        [
            document.getElementById("articleCreateCategory"),
            document.getElementById("articleCreateTitle"),
            document.getElementById("articleCreateContent")
        ].forEach((input) => setFieldInvalid(input));
    }

    function clearEditValidation() {
        [
            document.getElementById("articleEditCategory"),
            document.getElementById("articleEditTitle"),
            document.getElementById("articleEditContent")
        ].forEach((input) => setFieldInvalid(input));
    }

    function getNextArticleId() {
        return rows.reduce((maxId, row) => Math.max(maxId, Number(row.dataset.id) || 0), 0) + 1;
    }

    // 統一的「送表單到後端、拿 JSON 回來」小工具
    async function postForm(url, data) {
        const body = new URLSearchParams();
        Object.keys(data).forEach((key) => body.append(key, data[key]));
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
            body
        });
        if (!response.ok) throw new Error("HTTP " + response.status);
        return response.json();
    }

    function buildArticleRow(article) {
        const row = document.createElement("tr");
        const statusId = "articleStatus" + article.id;
        row.dataset.articleRow = "";
        row.dataset.id = String(article.id);
        row.dataset.account = article.account;
        row.dataset.categoryName = article.categoryName;
        row.dataset.title = article.title;
        row.dataset.articleContent = article.articleContent;
        row.dataset.imageNames = (article.images || []).map((image) => image.name).join("|");
        row.dataset.imageSrcs = (article.images || []).map((image) => image.src || "").join("|");
        row.dataset.active = "true";
        row.dataset.createdAt = article.createdAt;
        row.dataset.updatedAt = "NULL";
        row.dataset.adminComment = "NULL";
        row.dataset.adminUpdatedAt = "NULL";
        row.dataset.modifiedByAdmin = "NULL";

        row.innerHTML = [
            '<td data-article-cell="id">' + article.id + "</td>",
            '<td data-article-cell="account"></td>',
            '<td data-article-cell="category"></td>',
            '<td data-article-cell="title"></td>',
            '<td><button class="member-detail-btn" type="button" data-article-detail="' + article.id + '">查看 <i class="bi bi-chevron-right"></i></button></td>',
            '<td><div class="form-check form-switch member-status-switch article-status-switch"><input class="form-check-input" id="' + statusId + '" type="checkbox" role="switch" data-article-status="' + article.id + '" checked><label class="member-status-text" for="' + statusId + '">啟用</label></div></td>'
        ].join("");
        row.querySelector('[data-article-cell="account"]').textContent = article.account;
        row.querySelector('[data-article-cell="category"]').textContent = article.categoryName;
        row.querySelector('[data-article-cell="title"]').textContent = article.title;
        return row;
    }

    async function handleCreateSubmit(event) {
        event.preventDefault();

        // ★ 找到送出鈕,鎖起來防連點
        const submitBtn = event.target.querySelector('button[type="submit"]');
        if (submitBtn?.disabled) return;          // 已經在送出中,直接忽略後續點擊
        if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "發佈中…"; }

        try {
            const category = document.getElementById("articleCreateCategory");
            const title = document.getElementById("articleCreateTitle");
            const content = document.getElementById("articleCreateContent");
            const imageInput = document.getElementById("articleCreateImages");
            let valid = true;

            clearCreateValidation();
            if (!category?.value.trim()) { setFieldInvalid(category, "請選擇文章分類。"); valid = false; }
            if (!title?.value.trim()) { setFieldInvalid(title, "請輸入文章標題。"); valid = false; }
            if (!content?.value.trim()) { setFieldInvalid(content, "請輸入文章內容。"); valid = false; }
            if (!valid) return;

            const formData = new FormData();
            formData.append("categoryId", category.value);
            formData.append("title", title.value.trim());
            formData.append("content", content.value.trim());
            const files = imageInput?.files || [];
            for (let i = 0; i < files.length; i++) formData.append("files", files[i]);

            const response = await fetch("/Articles/CreateAjax", { method: "POST", body: formData });
            if (!response.ok) throw new Error("HTTP " + response.status);
            const result = await response.json();
            if (!result.success) { setFieldInvalid(title, result.message || "新增失敗。"); return; }

            document.getElementById("articleTableBody")?.appendChild(buildArticleRow({
                id: result.id, account: result.account, categoryName: result.categoryName,
                title: result.title, articleContent: result.articleContent,
                images: result.images || [], createdAt: result.createdAt
            }));
            collectRows();
            state.sortKey = "id"; state.sortDir = "asc";
            state.page = Math.max(Math.ceil(getFilteredRows().length / state.pageSize), 1);
            renderTable();
            createModal?.hide();
            event.target.reset();
            clearSelectedImages(false);
            showToast("已新增文章");
        } catch (error) {
            setFieldInvalid(document.getElementById("articleCreateTitle"), "連線失敗,請稍後再試。");
        } finally {
            // ★ 不論成功失敗都解鎖,讓使用者能重試
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "新增文章"; }
        }
    }

    function revokePreviewUrl(image) {
        if (image.src?.startsWith("blob:")) URL.revokeObjectURL(image.src);
    }

    function clearSelectedImages(revoke = true) {
        if (revoke) createImages.forEach(revokePreviewUrl);
        createImages = [];
        const input = document.getElementById("articleCreateImages");
        if (input) input.value = "";
        renderImagePreviewList();
    }

    function clearEditImages(revoke = true) {
        if (revoke) editImages.filter((image) => !image.persisted).forEach(revokePreviewUrl);
        editImages = [];
        editingArticleId = "";
        const input = document.getElementById("articleEditImages");
        if (input) input.value = "";
        renderEditImagePreviewList();
    }

    function renderPreviewItems(list, images, rerender) {
        if (!list) return;

        list.innerHTML = "";
        images.forEach((item, index) => {
            const wrap = document.createElement("div");
            const thumb = document.createElement("div");
            const name = document.createElement("div");
            const actions = document.createElement("div");
            const movePrev = document.createElement("button");
            const moveNext = document.createElement("button");
            const remove = document.createElement("button");
            const fallback = document.createElement("span");
            const previewSrc = item.src || (item.name ? getImageSrc(item) : "");

            wrap.className = "article-image-preview-item";
            thumb.className = "article-image-preview-thumb";
            name.className = "article-image-preview-name";
            name.textContent = (index + 1) + ". " + item.name;
            actions.className = "article-image-preview-actions";
            fallback.textContent = item.name || "圖片預覽";

            if (previewSrc) {
                const img = document.createElement("img");
                img.src = previewSrc;
                img.alt = item.name;
                img.onerror = () => {
                    img.remove();
                    if (!thumb.contains(fallback)) thumb.appendChild(fallback);
                };
                thumb.appendChild(img);
            } else {
                thumb.appendChild(fallback);
            }

            movePrev.type = "button";
            movePrev.innerHTML = '<i class="bi bi-arrow-left"></i>';
            movePrev.disabled = index === 0;
            movePrev.setAttribute("aria-label", "往前移動");
            movePrev.addEventListener("click", () => {
                [images[index - 1], images[index]] = [images[index], images[index - 1]];
                rerender();
            });

            moveNext.type = "button";
            moveNext.innerHTML = '<i class="bi bi-arrow-right"></i>';
            moveNext.disabled = index === images.length - 1;
            moveNext.setAttribute("aria-label", "往後移動");
            moveNext.addEventListener("click", () => {
                [images[index], images[index + 1]] = [images[index + 1], images[index]];
                rerender();
            });

            remove.type = "button";
            remove.innerHTML = '<i class="bi bi-x-lg"></i>';
            remove.setAttribute("aria-label", "移除圖片");
            remove.addEventListener("click", () => {
                if (!images[index].persisted) revokePreviewUrl(images[index]);
                images.splice(index, 1);
                rerender();
            });

            actions.append(movePrev, moveNext, remove);
            wrap.append(thumb, name, actions);
            list.appendChild(wrap);
        });
    }

    function renderImagePreviewList() {
        const list = document.getElementById("articleImagePreviewList");
        renderPreviewItems(list, createImages, renderImagePreviewList);
    }

    function renderEditImagePreviewList() {
        const list = document.getElementById("articleEditImagePreviewList");
        renderPreviewItems(list, editImages, renderEditImagePreviewList);
    }

    function handleImageSelection(event) {
        createImages.forEach(revokePreviewUrl);
        createImages = Array.from(event.target.files || []).map((file) => ({
            name: file.name,
            src: URL.createObjectURL(file)
        }));
        renderImagePreviewList();
    }

    function handleEditImageSelection(event) {
        editImages = editImages.concat(Array.from(event.target.files || []).map((file) => ({
            name: file.name,
            src: URL.createObjectURL(file),
            persisted: false
        })));
        event.target.value = "";
        renderEditImagePreviewList();
    }

    function updateArticleRow(row, article) {
        row.dataset.categoryName = article.categoryName;
        row.dataset.title = article.title;
        row.dataset.articleContent = article.articleContent;
        row.dataset.imageNames = (article.images || []).map((image) => image.name).join("|");
        row.dataset.imageSrcs = (article.images || []).map((image) => image.src || "").join("|");
        row.dataset.updatedAt = article.updatedAt;

        const categoryCell = row.querySelector('[data-article-cell="category"]');
        const titleCell = row.querySelector('[data-article-cell="title"]');
        if (categoryCell) categoryCell.textContent = article.categoryName;
        if (titleCell) titleCell.textContent = article.title;
    }

    function openEditModal() {
        const detailView = document.getElementById("articleDetailView");
        const row = findArticleRow(detailView?.dataset.articleId);
        if (!row) return;

        const data = getArticleData(row);
        if (data.account !== "admin") return;

        clearEditImages();
        clearEditValidation();
        editingArticleId = data.id;

        const category = document.getElementById("articleEditCategory");
        const title = document.getElementById("articleEditTitle");
        const content = document.getElementById("articleEditContent");
        if (category) category.value = data.categoryName;
        if (title) title.value = data.title;
        if (content) content.value = data.articleContent;

        editImages = data.images.map((image) => ({
            name: image.name,
            src: image.src || "",
            persisted: true
        }));
        renderEditImagePreviewList();

        editModal?.show();
        if (!editModal) document.getElementById("articleEditCategory")?.focus();
    }

    function handleEditSubmit(event) {
        event.preventDefault();
        const category = document.getElementById("articleEditCategory");
        const title = document.getElementById("articleEditTitle");
        const content = document.getElementById("articleEditContent");
        const row = findArticleRow(editingArticleId);
        let valid = true;

        clearEditValidation();
        if (!category?.value.trim()) {
            setFieldInvalid(category, "請選擇文章分類。");
            valid = false;
        }
        if (!title?.value.trim()) {
            setFieldInvalid(title, "請輸入文章標題。");
            valid = false;
        }
        if (!content?.value.trim()) {
            setFieldInvalid(content, "請輸入文章內容。");
            valid = false;
        }
        if (!row || !valid) return;

        updateArticleRow(row, {
            categoryName: category.value.trim(),
            title: title.value.trim(),
            articleContent: content.value.trim(),
            images: editImages.map((image) => ({ name: image.name, src: image.src || "" })),
            updatedAt: formatDateTime()
        });
        renderTable();
        renderDetail(row);
        const description = document.getElementById("managementDescription");
        if (description) description.textContent = "查看「" + row.dataset.title + "」的完整內容與屏蔽狀態。";

        editImages = [];
        editingArticleId = "";
        editModal?.hide();
        showToast("文章已更新");
    }

    function setReasonError(visible) {
        const reason = document.getElementById("articleStatusReason");
        const error = document.getElementById("articleStatusReasonError");
        reason?.classList.toggle("is-invalid", visible);
        error?.classList.toggle("d-none", !visible);
    }

    function openStatusModal(row, nextActive) {
        const data = getArticleData(row);
        pendingStatusChange = { row, nextActive };
        const title = document.getElementById("articleStatusModalTitle");
        const description = document.getElementById("articleStatusModalDescription");
        const reason = document.getElementById("articleStatusReason");

        if (title) title.textContent = nextActive ? "確認啟用文章" : "確認停用文章";
        if (description) description.textContent = "請輸入「" + data.title + "」的" + (nextActive ? "解除屏蔽" : "屏蔽") + "說明。";
        if (reason) reason.value = "";
        setReasonError(false);

        if (statusModal) {
            statusModal.show();
            setTimeout(() => reason?.focus(), 180);
            return;
        }

        const fallbackReason = window.prompt("請輸入文章屏蔽/解除屏蔽說明");
        if (fallbackReason?.trim()) applyStatusChange(row, nextActive, fallbackReason.trim());
        pendingStatusChange = null;
    }

    async function applyStatusChange(row, nextActive, reason) {
        const input = row.querySelector("[data-article-status]");
        const id = row.dataset.id;
        try {
            const result = await postForm("/Articles/SetActiveAjax", { id, isActive: nextActive, reason });
            if (!result.success) { showToast(result.message || "狀態更新失敗"); return; }
            if (input) input.checked = nextActive;
            row.dataset.adminComment = reason;
            row.dataset.adminUpdatedAt = formatDateTime();
            row.dataset.modifiedByAdmin = actorAdmin;
            syncStatusLabel(row);
            if (!document.getElementById("articleDetailView")?.classList.contains("d-none")) renderDetail(row);
            if (state.sortKey === "active") renderTable();
            showToast("文章狀態已更新");
        } catch (error) {
            showToast("連線失敗,狀態未變更");
        }
    }

    function confirmStatusChange() {
        const reason = document.getElementById("articleStatusReason");
        const value = reason?.value.trim() || "";
        if (!pendingStatusChange) return;
        if (!value) {
            setReasonError(true);
            reason?.focus();
            return;
        }
        applyStatusChange(pendingStatusChange.row, pendingStatusChange.nextActive, value);
        pendingStatusChange = null;
        statusModal?.hide();
    }

    function setCommentReasonError(visible) {
        const reason = document.getElementById("commentStatusReason");
        const error = document.getElementById("commentStatusReasonError");
        reason?.classList.toggle("is-invalid", visible);
        error?.classList.toggle("d-none", !visible);
    }

    function openCommentStatusModal(commentNode, nextActive) {
        const data = getCommentData(commentNode);
        pendingCommentStatusChange = { commentNode, nextActive };
        const title = document.getElementById("commentStatusModalTitle");
        const description = document.getElementById("commentStatusModalDescription");
        const reason = document.getElementById("commentStatusReason");

        if (title) title.textContent = nextActive ? "確認啟用留言" : "確認停用留言";
        if (description) {
            description.textContent = "請輸入「" + data.account + "」留言的" + (nextActive ? "解除屏蔽" : "屏蔽") + "說明。";
        }
        if (reason) reason.value = "";
        setCommentReasonError(false);

        if (commentStatusModal) {
            commentStatusModal.show();
            setTimeout(() => reason?.focus(), 180);
            return;
        }

        const fallbackReason = window.prompt("請輸入留言屏蔽/解除屏蔽說明");
        if (fallbackReason?.trim()) applyCommentStatusChange(commentNode, nextActive, fallbackReason.trim());
        pendingCommentStatusChange = null;
    }

    async function applyCommentStatusChange(commentNode, nextActive, reason) {
        const detailView = document.getElementById("articleDetailView");
        const articleId = detailView?.dataset.articleId || commentNode.dataset.articleId;
        const commentId = commentNode.dataset.commentId;
        try {
            const result = await postForm("/Articles/SetCommentActiveAjax", { commentId, isActive: nextActive, reason });
            if (!result.success) { showToast(result.message || "留言狀態更新失敗"); return; }
            commentNode.dataset.active = String(nextActive);
            commentNode.dataset.adminComment = reason;
            commentNode.dataset.adminUpdatedAt = formatDateTime();
            commentNode.dataset.modifiedByAdmin = actorAdmin;
            renderComments(articleId);
            showToast("留言狀態已更新");
        } catch (error) {
            showToast("連線失敗,狀態未變更");
        }
    }

    function confirmCommentStatusChange() {
        const reason = document.getElementById("commentStatusReason");
        const value = reason?.value.trim() || "";
        if (!pendingCommentStatusChange) return;
        if (!value) {
            setCommentReasonError(true);
            reason?.focus();
            return;
        }
        applyCommentStatusChange(
            pendingCommentStatusChange.commentNode,
            pendingCommentStatusChange.nextActive,
            value
        );
        pendingCommentStatusChange = null;
        commentStatusModal?.hide();
    }

    function bindEvents() {
        createModal = document.getElementById("articleCreateModal") && window.bootstrap?.Modal
            ? window.bootstrap.Modal.getOrCreateInstance(document.getElementById("articleCreateModal"))
            : null;
        editModal = document.getElementById("articleEditModal") && window.bootstrap?.Modal
            ? window.bootstrap.Modal.getOrCreateInstance(document.getElementById("articleEditModal"))
            : null;
        statusModal = document.getElementById("articleStatusModal") && window.bootstrap?.Modal
            ? window.bootstrap.Modal.getOrCreateInstance(document.getElementById("articleStatusModal"))
            : null;
        reactionModal = document.getElementById("articleReactionModal") && window.bootstrap?.Modal
            ? window.bootstrap.Modal.getOrCreateInstance(document.getElementById("articleReactionModal"))
            : null;
        commentStatusModal = document.getElementById("commentStatusModal") && window.bootstrap?.Modal
            ? window.bootstrap.Modal.getOrCreateInstance(document.getElementById("commentStatusModal"))
            : null;

        document.querySelectorAll("[data-article-filter]").forEach((input) => {
            const updateFilter = () => {
                state.filters[input.dataset.articleFilter] = input.value.trim();
                state.page = 1;
                renderTable();
            };
            input.addEventListener("input", updateFilter);
            input.addEventListener("change", updateFilter);
        });

        document.getElementById("articleSearchForm")?.addEventListener("submit", (event) => {
            event.preventDefault();
            state.page = 1;
            renderTable();
        });

        document.getElementById("articleFilterReset")?.addEventListener("click", () => {
            document.querySelectorAll("[data-article-filter]").forEach((input) => {
                input.value = "";
                state.filters[input.dataset.articleFilter] = "";
            });
            state.page = 1;
            renderTable();
        });

        document.querySelectorAll("[data-article-sort]").forEach((button) => {
            button.addEventListener("click", () => {
                const sortKey = button.dataset.articleSort;
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

        document.getElementById("articleTableBody")?.addEventListener("click", (event) => {
            const button = event.target.closest("[data-article-detail]");
            if (!button) return;
            showDetail(button.dataset.articleDetail);
        });

        document.getElementById("articleTableBody")?.addEventListener("change", (event) => {
            const input = event.target.closest("[data-article-status]");
            if (!input) return;
            const row = input.closest("[data-article-row]");
            const nextActive = input.checked;
            input.checked = !nextActive;
            openStatusModal(row, nextActive);
        });

        document.getElementById("articleDetailBack")?.addEventListener("click", showList);
        document.getElementById("articleDetailStatus")?.addEventListener("change", (event) => {
            const detailView = document.getElementById("articleDetailView");
            const row = findArticleRow(detailView?.dataset.articleId);
            const nextActive = event.target.checked;
            event.target.checked = !nextActive;
            if (row) openStatusModal(row, nextActive);
        });
        document.getElementById("articleEditOpen")?.addEventListener("click", openEditModal);
        document.getElementById("articleCommentList")?.addEventListener("change", (event) => {
            const input = event.target.closest("[data-comment-status]");
            if (!input) return;
            const commentNode = findCommentNode(input.dataset.commentStatus);
            const nextActive = input.checked;
            input.checked = !nextActive;
            if (commentNode) openCommentStatusModal(commentNode, nextActive);
        });
        document.querySelectorAll("[data-reaction-open]").forEach((button) => {
            button.addEventListener("click", () => openReactionModal(button.dataset.reactionOpen));
        });
        document.getElementById("articleImagePrev")?.addEventListener("click", () => {
            if (!detailImageState.images.length) return;
            detailImageState.index = (detailImageState.index - 1 + detailImageState.images.length) % detailImageState.images.length;
            renderArticleImage();
        });
        document.getElementById("articleImageNext")?.addEventListener("click", () => {
            if (!detailImageState.images.length) return;
            detailImageState.index = (detailImageState.index + 1) % detailImageState.images.length;
            renderArticleImage();
        });
        document.getElementById("articleCreateForm")?.addEventListener("submit", handleCreateSubmit);
        document.getElementById("articleCreateModal")?.addEventListener("hidden.bs.modal", () => {
            document.getElementById("articleCreateForm")?.reset();
            clearCreateValidation();
            clearSelectedImages();
        });
        document.getElementById("articleCreateModal")?.addEventListener("shown.bs.modal", () => {
            document.getElementById("articleCreateCategory")?.focus();
        });
        document.getElementById("articleCreateImages")?.addEventListener("change", handleImageSelection);
        document.querySelectorAll("#articleCreateForm input, #articleCreateForm select, #articleCreateForm textarea").forEach((input) => {
            input.addEventListener("input", () => setFieldInvalid(input));
            input.addEventListener("change", () => setFieldInvalid(input));
        });
        document.getElementById("articleEditForm")?.addEventListener("submit", handleEditSubmit);
        document.getElementById("articleEditModal")?.addEventListener("hidden.bs.modal", () => {
            document.getElementById("articleEditForm")?.reset();
            clearEditValidation();
            clearEditImages();
        });
        document.getElementById("articleEditModal")?.addEventListener("shown.bs.modal", () => {
            document.getElementById("articleEditCategory")?.focus();
        });
        document.getElementById("articleEditImages")?.addEventListener("change", handleEditImageSelection);
        document.querySelectorAll("#articleEditForm input, #articleEditForm select, #articleEditForm textarea").forEach((input) => {
            input.addEventListener("input", () => setFieldInvalid(input));
            input.addEventListener("change", () => setFieldInvalid(input));
        });

        document.getElementById("articleStatusConfirm")?.addEventListener("click", confirmStatusChange);
        document.getElementById("articleStatusReason")?.addEventListener("input", () => setReasonError(false));
        document.getElementById("articleStatusModal")?.addEventListener("hidden.bs.modal", () => {
            pendingStatusChange = null;
            setReasonError(false);
        });
        document.getElementById("commentStatusConfirm")?.addEventListener("click", confirmCommentStatusChange);
        document.getElementById("commentStatusReason")?.addEventListener("input", () => setCommentReasonError(false));
        document.getElementById("commentStatusModal")?.addEventListener("hidden.bs.modal", () => {
            pendingCommentStatusChange = null;
            setCommentReasonError(false);
        });
    }

    function init() {
        if (!document.getElementById("articleManagementView")) return;

        collectRows();
        bindEvents();
        renderTable();

        const detailMatch = window.location.hash.match(/^#article-detail-(.+)$/);
        if (detailMatch) showDetail(decodeURIComponent(detailMatch[1]), false);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();