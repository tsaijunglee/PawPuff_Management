(() => {
    "use strict"; //啟用 JavaScript 嚴格模式

  //state 用來保存目前頁面的狀態
  const state = {
      sortKey: "id", //代表目前按照管理員編號排序
      sortDir: "asc", //升幕

      //搜尋條件:一開始都是空字串,表示沒有篩選
    filters: {
      id: "",
      account: "",
      nickname: "",
      permission: ""
    }
    };



    let rows = []; //儲存權限表格裡所有管理員的 <tr>
    let originalPermissions = new Map(); //用來記住每位管理員「一開始的權限」
    let emptyRow = null; //搜尋不到資料時，畫面要顯示：沒有符合條件的權限資料


    //統一搜尋文字格式
    //(value || "")  => EX: value: hello => return hello 或者 EX: value: 0/false/null/undefined/"" => return 右側的""
    //轉成小寫且去除前後空白
  function normalize(value) { 
    return String(value || "").trim().toLowerCase();
  }

    //取得某一欄文字
    //用來取得某一列的： 管理員編號 or 帳號 or 暱稱
    //
    //
    //function getCellText(row,account)
    //{
    // return row.querySelector('[data-permission-cell="' + account + '"]')?.textContent.trim() || row.dataset[key] || "";
    //}
    //
    //尋找
    //<td data-permission-cell="account">
    //admin001
    //</td >
    //
    // =>
    //
    //

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

      // Razor 已產生資料，不再從管理員表格複製
      if (tableBody.querySelector("[data-permission-row]")) {
          return;
      }

   

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


//重新檢查目前的權限 Checkbox，有沒有和原本資料不同，然後決定「儲存」按鈕要不要啟用
//找到儲存按鈕:
//<button id="permissionSaveButton">
//儲存權限
//</button >
//
//
//
//
//
//
//
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


//負責排序、搜尋、分頁顯示
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


      //事件監聽(Event Listener) => 當使用者勾選或取消勾選權限 Checkbox 時，通知 JavaScript：「資料變了」
      //如果找得到 permissionTableBody，就執行 addEventListener()
      //如果找不到：const tableBody = null;直接停止
      //
      //    addEventListener:監聽事件
      //
      //    元素.addEventListener("事件名稱", function () {
      //    ...
      //    });
      //
      //
      //  Ex:
      //     button.addEventListener("click", function () {
      //        alert("按到了");
      //     });
      //
      //  Ex:
      //     input.addEventListener("input", function () {
      //        console.log("文字改變");
      //    });
      //
      //
      //  Ex:
      //    checkbox.addEventListener("change", function () {
      //        console.log("勾選改變");
      //   });
      //
      //
      // 如果有10 位管理員 ×   8 個權限  = 80 個 Checkbox =>80 個 EventListener ??
      // => Event Delegation（事件委派） 解決 => 它只監聽一次 => 監聽整個 <tbody>
      //

 //     tbody
 //├── tr
 //│    ├── checkbox
 //│    ├── checkbox
 //│    └── checkbox
 //├── tr
 //│    ├── checkbox
 //│    ├── checkbox
 //│    └── checkbox
      // tbody.addEventListener(...) => 裡面哪個 Checkbox 被點了
      //
      //
      //(event) => {
      //=>這一次事件的資訊
      //
      //if (!event.target.matches("[data-permission-check]")) return;
      //這次操作的target，是不是「不具有」data-permission-check？
      //
      //matches() 用來檢查某個元素是否符合指定的 CSS 選擇器 = "[data-permission-check]"
      //假設你點的是 < label >  => ture => return
      //假設你點的是 < checkbox >  => false => updateSaveState()
      //



    document.getElementById("permissionTableBody")?.addEventListener("change", (event) => {
      if (!event.target.matches("[data-permission-check]")) return;
      updateSaveState();
    });

      //先在 HTML 裡找：
      //<button id="permissionSaveButton">
      //儲存
      //</button >
      //
      //?.addEventListener("click", () => {    } =>如果按鈕存在，就監聽它的點擊事件
      //
      //點下按鈕後,
      //rows.forEach((row) => { } => 更新每一列的「原始權限」
      //
      //
      //originalPermissions.set(row.dataset.id, serializePermissions(getCheckedPermissions(row)))
      //把目前勾選的權限，存成新的原始狀態
      //
      //
      //例如管理員 1 現在勾選：Dashboard / Account /  Articles => 存進originalPermissions
      //
      //  originalPermissions.set(
      //   "1",
      //   "Account,Articles,Dashboard"
      //  );
      //
      //
      //
      //但是要存進資料庫
      //     |
      //     V
      //
      //   點擊儲存
      //→ JavaScript 收集所有勾選權限
      //→ fetch() POST 到 Controller
      //→ Controller 更新 Admins_Permissions
      //→ SaveChanges()
      //→ 回傳成功
      //
      

      document.getElementById("permissionSaveButton") ?.addEventListener("click", async (event) => {
              const saveButton = event.currentTarget;
              const dirtyRows = rows.filter(isRowDirty);

              if (dirtyRows.length === 0) return;

              const token = document.querySelector(
                  '#permissionManagementView input[name="__RequestVerificationToken"]'
              )?.value;

              saveButton.disabled = true;

              try {
                  const response = await fetch(saveButton.dataset.saveUrl, {
                      method: "POST",
                      headers: {
                          "Content-Type": "application/json",
                          "RequestVerificationToken": token || ""
                      },
                      body: JSON.stringify({
                          admins: dirtyRows.map((row) => ({
                              adminId: Number(row.dataset.id),
                              permissions: getCheckedPermissions(row)
                          }))
                      })
                  });

                  const result = await response.json().catch(() => ({}));

                  if (!response.ok) {
                      throw new Error(
                          result.message || "權限儲存失敗，請稍後再試。"
                      );
                  }

                  // 後端成功寫入資料庫後，才更新前端原始狀態
                  dirtyRows.forEach((row) => {
                      originalPermissions.set(
                          row.dataset.id,
                          serializePermissions(getCheckedPermissions(row))
                      );
                  });

                  showToast(result.message || "權限設定已儲存");
              } catch (error) {
                  showToast(
                      error.message || "權限儲存失敗，請稍後再試。"
                  );
              } finally {
                  updateSaveState();
              }
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
