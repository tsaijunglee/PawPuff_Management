(() => {
  const memberState = {
    page: 1,
    pageSize: 10,
    sortKey: "id",
    sortDir: "asc",
    filters: {
      id: "",
      account: "",
      nickname: "",
      phone: "",
      email: ""
    }
  };

  const refs = {};
  const helpers = {};

  let initialized = false;
  let memberRowElements = [];
  let pendingStatusChange = null;
  let statusModal = null;
  let createModal = null;

  function getCellText(row, key) {
    return row.querySelector('[data-member-cell="' + key + '"]')?.textContent.trim() || "";
  }

  function getEntityConfig() {
    return {
      screen: refs.memberManagementView?.dataset.screen || "member-management",
      entityType: refs.memberManagementView?.dataset.entityType || "member",
      detailTitle: refs.memberManagementView?.dataset.detailTitle || "會員詳情",
      detailDescriptionTemplate: refs.memberManagementView?.dataset.detailDescriptionTemplate || "查看「{nickname}」的完整資料與帳號狀態。",
      createSuccessMessage: refs.memberManagementView?.dataset.createSuccessMessage || "已新增資料",
      actorAdminAccount: refs.memberManagementView?.dataset.actorAdminAccount || "admin01",
      actorAdminId: refs.memberManagementView?.dataset.actorAdminId || "1"
    };
  }

  function getTableColumns() {
    const columns = refs.memberTableBody?.dataset.tableColumns;
    return columns
      ? columns.split(",").map((column) => column.trim()).filter(Boolean)
      : ["id", "account", "nickname", "phone", "email", "points"];
  }

  function normalizeNullable(value) {
    return value && value !== "NULL" ? value : "NULL";
  }

  function maskPasswordHash(value) {
    return value && value !== "NULL" ? "••••••••••••••••" : "NULL";
  }

  function formatStatusUpdatedAt(date = new Date()) {
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

  async function hashPassword(password) {
    if (window.crypto?.subtle && window.TextEncoder) {
      try {
        const encoder = new TextEncoder();
        const hashBuffer = await window.crypto.subtle.digest("SHA-256", encoder.encode(password));
        return Array.from(new Uint8Array(hashBuffer))
          .map((byte) => byte.toString(16).padStart(2, "0"))
          .join("");
      } catch {
        return "pending_backend_hash";
      }
    }

    return "pending_backend_hash";
  }

  function setCreateFieldInvalid(input, message = "") {
    if (!input) return;

    const feedback = input.parentElement?.querySelector(".invalid-feedback");
    if (feedback && !feedback.dataset.defaultMessage) feedback.dataset.defaultMessage = feedback.textContent;
    input.classList.toggle("is-invalid", Boolean(message));
    if (feedback) feedback.textContent = message || feedback.dataset.defaultMessage;
  }

  function clearCreateValidation() {
    [
      refs.memberCreateAccount,
      refs.memberCreatePassword,
      refs.memberCreatePasswordConfirm,
      refs.memberCreateNickname,
      refs.memberCreatePhone,
      refs.memberCreateEmail
    ].forEach((input) => setCreateFieldInvalid(input));
  }

  function resetCreateForm() {
    refs.memberCreateForm?.reset();
    clearCreateValidation();
  }

  function getCreateFormValues() {
    return {
      account: refs.memberCreateAccount?.value.trim() || "",
      password: refs.memberCreatePassword?.value || "",
      passwordConfirm: refs.memberCreatePasswordConfirm?.value || "",
      nickname: refs.memberCreateNickname?.value.trim() || "",
      phone: refs.memberCreatePhone?.value.trim() || "",
      email: refs.memberCreateEmail?.value.trim() || ""
    };
  }

  function accountExists(account) {
    if (!memberRowElements.length) collectRows();
    return memberRowElements.some((row) => (row.dataset.account || "").toLowerCase() === account.toLowerCase());
  }

  function validateCreateForm(values) {
    clearCreateValidation();
    let valid = true;

      const accountPattern = /^[A-Za-z0-9_]+$/;
      const nicknamePattern = /^[\p{L}\p{N}]+$/u;
      const nicknameLength = Array.from(values.nickname).length;

      //帳號驗證
      if (!values.account) {
          setCreateFieldInvalid(
              refs.memberCreateAccount,
              "請輸入帳號。"
          );
          valid = false;
      } else if (
          values.account.length < 4 ||
          values.account.length > 50
      ) {
          setCreateFieldInvalid(
              refs.memberCreateAccount,
              "帳號長度必須為4～50字。"
          );
          valid = false;
      } else if (!accountPattern.test(values.account)) {
          setCreateFieldInvalid(
              refs.memberCreateAccount,
              "帳號只能使用英文字母、數字或底線。"
          );
          valid = false;
      } else if (accountExists(values.account)) {
          setCreateFieldInvalid(
              refs.memberCreateAccount,
              "此帳號已存在。"
          );
          valid = false;
      }



      //密碼驗證
      if (!values.password) {
          setCreateFieldInvalid(
              refs.memberCreatePassword,
              "請輸入密碼。"
          );
          valid = false;
      } else if (
          values.password.length < 6 ||
          values.password.length > 20
      ) {
          setCreateFieldInvalid(
              refs.memberCreatePassword,
              "密碼長度必須為6～20個字。"
          );
          valid = false;
      }

      if (!values.passwordConfirm) {
          setCreateFieldInvalid(
              refs.memberCreatePasswordConfirm,
              "請再次輸入密碼。"
          );
          valid = false;
      } else if (values.password !== values.passwordConfirm) {
          setCreateFieldInvalid(
              refs.memberCreatePasswordConfirm,
              "確認密碼需與密碼相同。"
          );
          valid = false;
      }


      //暱稱驗證
      if (!values.nickname) {
          setCreateFieldInvalid(
              refs.memberCreateNickname,
              "請輸入暱稱。"
          );
          valid = false;
      } else if (Array.from(values.nickname).length > 10) {
          setCreateFieldInvalid(
              refs.memberCreateNickname,
              "暱稱不能超過10個字。"
          );
          valid = false;
      } else if (!nicknamePattern.test(values.nickname)) {
          setCreateFieldInvalid(
              refs.memberCreateNickname,
              "暱稱只能使用中文、英文字母或數字，不能包含空格及特殊符號。"
          );
          valid = false;
      }


    if (refs.memberCreatePhone && !values.phone) {
      setCreateFieldInvalid(refs.memberCreatePhone, "請輸入電話。");
      valid = false;
    }


      //電子信箱驗證
      if (!values.email) {
          setCreateFieldInvalid(
              refs.memberCreateEmail,
              "請輸入電子信箱。"
          );
          valid = false;
      } else if (
          values.email.length > 100 ||
          !refs.memberCreateEmail.checkValidity()
      ) {
          setCreateFieldInvalid(
              refs.memberCreateEmail,
              "請輸入有效的電子信箱，長度不能超過100字。"
          );
          valid = false;
      }

    return valid;
    }


  function getNextMemberId() {
    if (!memberRowElements.length) collectRows();
    return Math.max(0, ...memberRowElements.map((row) => Number(row.dataset.id) || 0)) + 1;
  }

  function appendMemberCell(row, key, value, className = "") {
    const cell = document.createElement("td");
    cell.dataset.memberCell = key;
    cell.textContent = value;
    if (className) cell.className = className;
    row.appendChild(cell);
    return cell;
  }

  function getTableCellValue(member, key) {
    const valueMap = {
      id: String(member.id),
      account: member.account,
      nickname: member.nickname,
      phone: member.phone || "",
      email: member.email,
      points: "0"
    };

    return valueMap[key] ?? "";
  }

  function buildMemberRow(member) {
    const config = getEntityConfig();
    const row = document.createElement("tr");
    row.dataset.memberRow = "";
    row.dataset.id = String(member.id);
    row.dataset.account = member.account;
    row.dataset.passwordHash = member.passwordHash;
    row.dataset.nickname = member.nickname;
    row.dataset.email = member.email;
    row.dataset.phone = member.phone || "";
    row.dataset.activeDollConfigsId = "NULL";
    row.dataset.activeDollFrameId = "NULL";
    row.dataset.pointBalance = "0";
    row.dataset.points = "0";
    row.dataset.isActive = "1";
    row.dataset.enabled = "true";
    row.dataset.createdAt = member.createdAt;
    row.dataset.adminComment = "NULL";
    row.dataset.adminUpdatedAt = config.entityType === "admin" ? member.createdAt : "NULL";
    row.dataset.modifiedByAdmin = config.entityType === "admin" ? config.actorAdminAccount : "NULL";
    row.dataset.modifiedByAdminId = config.entityType === "admin" ? config.actorAdminId : "NULL";

    getTableColumns().forEach((column) => {
      appendMemberCell(row, column, getTableCellValue(member, column), column === "points" ? "text-nowrap" : "");
    });

    const detailCell = document.createElement("td");
    const detailButton = document.createElement("button");
    const detailIcon = document.createElement("i");
    detailButton.className = "member-detail-btn";
    detailButton.type = "button";
    detailButton.dataset.memberDetail = String(member.id);
    detailButton.append("查看 ");
    detailIcon.className = "bi bi-chevron-right";
    detailButton.appendChild(detailIcon);
    detailCell.appendChild(detailButton);
    row.appendChild(detailCell);

    const statusCell = document.createElement("td");
    const switchWrap = document.createElement("div");
    const statusInput = document.createElement("input");
    const statusLabel = document.createElement("label");
    const statusId = "memberStatus" + member.id;

    switchWrap.className = "form-check form-switch member-status-switch";
    statusInput.className = "form-check-input";
    statusInput.id = statusId;
    statusInput.type = "checkbox";
    statusInput.role = "switch";
    statusInput.dataset.memberStatus = String(member.id);
    statusInput.checked = true;
    statusLabel.className = "member-status-text";
    statusLabel.htmlFor = statusId;
    statusLabel.textContent = "啟用";

    switchWrap.append(statusInput, statusLabel);
    statusCell.appendChild(switchWrap);
    row.appendChild(statusCell);

    return row;
  }

  function showMemberToast(message) {
    if (refs.toastMessage) refs.toastMessage.textContent = message;
    const toastElement = document.getElementById("actionToast");
    const toast = toastElement && window.bootstrap?.Toast ? window.bootstrap.Toast.getOrCreateInstance(toastElement, { delay: 1800 }) : null;
    toast?.show();
  }

  //async function handleCreateSubmit(event) {
  //  event.preventDefault();

  //  const values = getCreateFormValues();
  //  if (!validateCreateForm(values)) return;

  //  const member = {
  //    id: getNextMemberId(),
  //    account: values.account,
  //    passwordHash: await hashPassword(values.password),
  //    nickname: values.nickname,
  //    phone: values.phone,
  //    email: values.email,
  //    createdAt: formatStatusUpdatedAt()
  //  };

    //  refs.memberTableBody?.appendChild(buildMemberRow(member));

//    collectRows();
//    memberState.sortKey = "id";
//    memberState.sortDir = "asc";
//    memberState.page = Math.max(Math.ceil(getFilteredRows().length / memberState.pageSize), 1);
//    renderTable();
//    createModal?.hide();
//    resetCreateForm();
//    showMemberToast(getEntityConfig().createSuccessMessage);
//}

    //async function handleCreateSubmit(event) {
    //    event.preventDefault();

    //    const values = getCreateFormValues();
    //    if (!validateCreateForm(values)) return;

    //    const form = refs.memberCreateForm;
    //    const createUrl = form?.dataset.createUrl;
    //    const token = form?.querySelector(
    //        'input[name="__RequestVerificationToken"]'
    //    )?.value;

    //    if (!createUrl) {
    //        showMemberToast("找不到新增管理員 API。");
    //        return;
    //    }

    //    const submitButton = document.getElementById(
    //        "memberCreateSubmit"
    //    );

    //    if (submitButton) submitButton.disabled = true;

    //    try {
    //        const response = await fetch(createUrl, {
    //            method: "POST",
    //            headers: {
    //                "Content-Type": "application/json",
    //                "RequestVerificationToken": token || ""
    //            },

    //            //body: JSON.stringify({
    //            //    account: values.account,
    //            //    password: values.password,
    //            //    passwordConfirm: values.passwordConfirm,
    //            //    nickname: values.nickname,
    //            //    email: values.email
    //            //})

    //            const entityType =getEntityConfig().entityType;

    //            const requestBody = {
    //                account: values.account,
    //                password: values.password,
    //                passwordConfirm: values.passwordConfirm,
    //                nickname: values.nickname,
    //                email: values.email
    //            };

    //            if(entityType === "member") {requestBody.phone = values.phone;}

    //             const response = await fetch(createUrl, {
    //                   method: "POST",
    //             headers: {
    //            "Content-Type": "application/json",
    //            "RequestVerificationToken":
    //                token || ""
    //        },
    //        body: JSON.stringify(requestBody)
    //    });



    //});


    async function handleCreateSubmit(event) {
        event.preventDefault();

        const values = getCreateFormValues();

        if (!validateCreateForm(values)) {
            return;
        }

        const form = refs.memberCreateForm;
        const createUrl = form?.dataset.createUrl;

        const token = form?.querySelector(
            'input[name="__RequestVerificationToken"]'
        )?.value;

        if (!createUrl) {
            showMemberToast("找不到新增資料 API。");
            return;
        }

        const submitButton =
            refs.memberCreateSubmit ||
            document.getElementById(
                "memberCreateSubmit"
            );

        const entityType =
            getEntityConfig().entityType;

        const requestBody = {
            account: values.account,
            password: values.password,
            passwordConfirm:
                values.passwordConfirm,
            nickname: values.nickname,
            email: values.email
        };

        // 只有會員需要電話
        if (entityType === "member") {
            requestBody.phone = values.phone;
        }

        if (submitButton) {
            submitButton.disabled = true;
        }

        try {
            const response = await fetch(
                createUrl,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",

                        "RequestVerificationToken":
                            token || ""
                    },

                    body: JSON.stringify(
                        requestBody
                    )
                }
            );

            const result = await response
                .json()
                .catch(() => ({}));

            if (!response.ok) {
                throw new Error(
                    result.message ||
                    "新增資料失敗。"
                );
            }

            const createdEntity =
                entityType === "member"
                    ? result.user
                    : result.admin;

            if (!createdEntity) {
                throw new Error(
                    "新增成功，但回傳資料不完整。"
                );
            }

            const pointBalance =
                createdEntity.pointBalance ?? 0;

            const member = {
                id: createdEntity.id,
                account: createdEntity.account,
                passwordHash: "********",
                nickname:
                    createdEntity.nickname,
                phone:
                    createdEntity.phone || "",
                email: createdEntity.email,

                pointBalance,
                points: pointBalance,

                enabled:
                    createdEntity.isActive ?? true,
                isActive:
                    createdEntity.isActive ?? true,

                createdAt:
                    createdEntity.createdAt,

                adminComment: "NULL",
                adminUpdatedAt: "NULL",
                modifiedByAdmin: "NULL",
                modifiedByAdminId: "NULL"
            };

            refs.memberTableBody?.appendChild(
                buildMemberRow(member)
            );

            collectRows();

            memberState.sortKey = "id";
            memberState.sortDir = "asc";

            memberState.page = Math.max(
                Math.ceil(
                    getFilteredRows().length /
                    memberState.pageSize
                ),
                1
            );

            renderTable();
            createModal?.hide();
            resetCreateForm();

            showMemberToast(
                result.message ||
                getEntityConfig()
                    .createSuccessMessage
            );
        } catch (error) {
            showMemberToast(
                error.message ||
                "新增資料失敗。"
            );
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
            }
        }
    }

            //const result = await response.json().catch(() => ({}));

            //if (!response.ok) {
            //    throw new Error(
            //        result.message || "新增管理員失敗。"
            //    );
            //}

            //const member = {
            //    id: result.admin.id,
            //    account: result.admin.account,
            //    passwordHash: "********",
            //    nickname: result.admin.nickname,
            //    email: result.admin.email,
            //    createdAt: result.admin.createdAt
    //};



    //const createdEntity =
    //    entityType === "member"
    //        ? result.user
    //        : result.admin;

    //if (!createdEntity) {
    //    throw new Error(
    //        "新增成功，但回傳資料不完整。"
    //    );
    //}

    //const member = {
    //    id: createdEntity.id,
    //    account: createdEntity.account,
    //    passwordHash: "********",
    //    nickname: createdEntity.nickname,
    //    phone: createdEntity.phone || "",
    //    email: createdEntity.email,
    //    pointBalance:
    //        createdEntity.pointBalance || 0,
    //    points:
    //        createdEntity.pointBalance || 0,
    //    enabled:
    //        createdEntity.isActive ?? true,
    //    isActive:
    //        createdEntity.isActive ?? true,
    //    createdAt: createdEntity.createdAt,
    //    adminComment: "NULL",
    //    adminUpdatedAt: "NULL",
    //    modifiedByAdmin: "NULL"
    //};





    //        refs.memberTableBody?.appendChild(
    //            buildMemberRow(member)
    //        );

    //        collectRows();

    //        memberState.sortKey = "id";
    //        memberState.sortDir = "asc";
    //        memberState.page = Math.max(
    //            Math.ceil(
    //                getFilteredRows().length / memberState.pageSize
    //            ),
    //            1
    //        );

    //        renderTable();
    //        createModal?.hide();
    //        resetCreateForm();

    //        showMemberToast(
    //            result.message || "管理員新增成功。"
    //        );
    //    } catch (error) {
    //        showMemberToast(
    //            error.message || "新增管理員失敗。"
    //        );



   

  function getMemberData(row) {
    const enabled = row.dataset.enabled === "true";
    const pointBalance = Number(row.dataset.pointBalance || row.dataset.points || getCellText(row, "points").replace(/[^\d.-]/g, "")) || 0;

    return {
      id: row.dataset.id || "",
      account: row.dataset.account || getCellText(row, "account"),
      passwordHash: row.dataset.passwordHash || "",
      passwordMasked: maskPasswordHash(row.dataset.passwordHash),
      nickname: row.dataset.nickname || getCellText(row, "nickname"),
      phone: row.dataset.phone || getCellText(row, "phone"),
      email: row.dataset.email || getCellText(row, "email"),
      activeDollConfigsId: normalizeNullable(row.dataset.activeDollConfigsId),
      activeDollFrameId: normalizeNullable(row.dataset.activeDollFrameId),
      points: pointBalance,
      pointBalance,
      pointsFormatted: getCellText(row, "points") || row.dataset.pointBalance || row.dataset.points || "0",
      enabled,
      enabledText: enabled ? "啟用" : "停用",
      isActive: enabled ? "1" : "0",
      createdAt: row.dataset.createdAt || "",
      adminComment: normalizeNullable(row.dataset.adminComment),
      adminUpdatedAt: normalizeNullable(row.dataset.adminUpdatedAt),
      modifiedByAdmin: normalizeNullable(row.dataset.modifiedByAdmin),
      modifiedByAdminId: normalizeNullable(row.dataset.modifiedByAdminId)
    };
  }

  function syncStatusLabel(row) {
    const input = row.querySelector("[data-member-status]");
    if (!input) return;

    row.dataset.enabled = String(input.checked);
    row.dataset.isActive = input.checked ? "1" : "0";
    const label = input.closest(".member-status-switch")?.querySelector(".member-status-text");
    if (label) label.textContent = input.checked ? "啟用" : "停用";
  }

  function setReasonError(visible) {
    refs.memberStatusReason?.classList.toggle("is-invalid", visible);
    refs.memberStatusReasonError?.classList.toggle("d-none", !visible);
  }

  //function openStatusModal(row, nextEnabled) {
  //  const data = getMemberData(row);
  //  pendingStatusChange = { row, nextEnabled };

  //  if (refs.memberStatusModalTitle) refs.memberStatusModalTitle.textContent = nextEnabled ? "啟用說明" : "停用說明";
  //  if (refs.memberStatusModalDescription) {
  //    refs.memberStatusModalDescription.textContent = "請輸入「" + data.nickname + "｜" + data.account + "」的" + (nextEnabled ? "啟用" : "停用") + "說明。";
  //  }
  //  if (refs.memberStatusReason) refs.memberStatusReason.value = "";
  //  setReasonError(false);

  //  if (statusModal) {
  //    statusModal.show();
  //    setTimeout(() => refs.memberStatusReason?.focus(), 180);
  //    return;
  //  }

  //  const reason = window.prompt("請輸入啟用/停用說明");
  //  if (reason?.trim()) applyStatusChange(row, nextEnabled, reason.trim());
  //  pendingStatusChange = null;
  //}

  //function applyStatusChange(row, nextEnabled, reason) {
  //  const input = row.querySelector("[data-member-status]");
  //  if (input) input.checked = nextEnabled;

  //  row.dataset.adminComment = reason;
  //  row.dataset.adminUpdatedAt = formatStatusUpdatedAt();
  //  row.dataset.modifiedByAdmin = getEntityConfig().actorAdminAccount;
  //  row.dataset.modifiedByAdminId = getEntityConfig().actorAdminId;
  //  syncStatusLabel(row);

  //  if (!refs.memberDetailView?.classList.contains("d-none")) renderMemberDetailFields(row);
  //  if (memberState.sortKey === "enabled") renderTable();
  //  }






  ////function confirmStatusChange() {
  ////  if (!pendingStatusChange) return;

  ////  const reason = refs.memberStatusReason?.value.trim() || "";
  ////  if (!reason) {
  ////    setReasonError(true);
  ////    refs.memberStatusReason?.focus();
  ////    return;
  ////  }

  ////  applyStatusChange(pendingStatusChange.row, pendingStatusChange.nextEnabled, reason);
  ////  pendingStatusChange = null;
  ////  statusModal?.hide();
  ////}     
  //  async function confirmStatusChange() { //啟用時直接送出
  //      if (!pendingStatusChange) return;

  //      const reason =
  //          refs.memberStatusReason?.value.trim() || "";

  //      // 停用一定要填寫原因。
  //      if (!reason) {
  //          setReasonError(true);
  //          refs.memberStatusReason?.focus();
  //          return;
  //      }
  //      const row = pendingStatusChange.row;

  //      const success = await updateAdminStatus(
  //          pendingStatusChange.row,
  //          false,
  //          reason
  //      );
  //      // API 失敗時保留視窗，讓使用者重試。
  //      if (!success) return;

  //      pendingStatusChange = null;
  //      statusModal?.hide();
        
  //  }
    async function updateAdminStatus(
        row,
        nextEnabled,
        reason = null
    ) {
        const adminId = Number(row.dataset.id);

        const confirmButton =
            refs.memberStatusConfirm;

        const updateUrl =
            confirmButton?.dataset.updateStatusUrl;

        const token = document.querySelector(
            'input[name="__RequestVerificationToken"]'
        )?.value;

        if (!updateUrl) {
            showMemberToast(
                "找不到管理員狀態更新 API。"
            );

            return false;
        }

        if (!adminId) {
            showMemberToast(
                "管理員編號不正確。"
            );

            return false;
        }

        if (confirmButton) {
            confirmButton.disabled = true;
        }

        try {
            const response = await fetch(
                updateUrl,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "RequestVerificationToken":
                            token || ""
                    },
                    body: JSON.stringify({
                        adminId: adminId,
                        isActive: nextEnabled,
                        adminComment: nextEnabled
                            ? null
                            : reason
                    })
                }
            );

            const result = await response
                .json()
                .catch(() => ({}));

            if (!response.ok) {
                throw new Error(
                    result.message ||
                    "管理員狀態更新失敗。"
                );
            }

            // 資料庫更新成功後才更新畫面。
            applyStatusChange(
                row,
                result.isActive,
                nextEnabled ? "NULL" : reason
            );

            showMemberToast(
                result.message ||
                "管理員狀態已更新。"
            );

            return true;
        } catch (error) {
            showMemberToast(
                error.message ||
                "管理員狀態更新失敗。"
            );

            return false;
        } finally {
            if (confirmButton) {
                confirmButton.disabled = false;
            }
        }
    }


    async function updateUserStatus(
        row,
        nextEnabled,
        reason = null
    ) {
        const userId = Number(row.dataset.id);

        const confirmButton =
            refs.memberStatusConfirm;

        const updateUrl =
            confirmButton?.dataset.updateStatusUrl;

        const token = document.querySelector(
            'input[name="__RequestVerificationToken"]'
        )?.value;

        if (!updateUrl) {
            showMemberToast(
                "找不到會員狀態更新 API。"
            );

            return false;
        }

        if (!userId) {
            showMemberToast(
                "會員編號不正確。"
            );

            return false;
        }

        if (confirmButton) {
            confirmButton.disabled = true;
        }

        try {
            const response = await fetch(
                updateUrl,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "RequestVerificationToken":
                            token || ""
                    },
                    body: JSON.stringify({
                        userId: userId,
                        isActive: nextEnabled,
                        adminComment: nextEnabled
                            ? null
                            : reason
                    })
                }
            );

            const result = await response
                .json()
                .catch(() => ({}));

            if (!response.ok) {
                throw new Error(
                    result.message ||
                    "會員狀態更新失敗。"
                );
            }

            // 資料庫更新成功後才更新畫面。
            applyStatusChange(
                row,
                result.isActive,
                nextEnabled ? "NULL" : reason
            );

            showMemberToast(
                result.message ||
                "會員狀態已更新。"
            );

            return true;
        } catch (error) {
            showMemberToast(
                error.message ||
                "會員狀態更新失敗。"
            );

            return false;
        } finally {
            if (confirmButton) {
                confirmButton.disabled = false;
            }
        }
    }


    // 根據目前頁面判斷要更新管理員或會員
    async function updateEntityStatus(
        row,
        nextEnabled,
        reason = null
    ) {
        const entityType =
            getEntityConfig().entityType;

        if (entityType === "admin") {
            return await updateAdminStatus(
                row,
                nextEnabled,
                reason
            );
        }

        return await updateUserStatus(
            row,
            nextEnabled,
            reason
        );
    }




    async function openStatusModal(
        row,
        nextEnabled
    ) {
        // 啟用不需要填寫原因，直接呼叫 API。
        if (nextEnabled) {
            await updateEntityStatus(
                row,
                true,
                null
            );

            return;
        }

        // 停用才顯示原因視窗。
        const data = getMemberData(row);

        pendingStatusChange = {
            row,
            nextEnabled: false
        };

        if (refs.memberStatusModalTitle) {
            refs.memberStatusModalTitle.textContent =
                "停用說明";
        }

        if (refs.memberStatusModalDescription) {
            refs.memberStatusModalDescription.textContent =
                "請輸入「" +
                data.nickname +
                "｜" +
                data.account +
                "」的停用原因。";
        }

        if (refs.memberStatusReason) {
            refs.memberStatusReason.value = "";
        }

        setReasonError(false);
        statusModal?.show();
    }


    function applyStatusChange(
        row,
        nextEnabled,
        reason
    ) {
        const input = row.querySelector(
            "[data-member-status]"
        );

        if (input) {
            input.checked = nextEnabled;
        }

        row.dataset.adminComment =
            reason || "NULL";

        row.dataset.adminUpdatedAt =
            formatStatusUpdatedAt();

        row.dataset.modifiedByAdmin =
            getEntityConfig().actorAdminAccount;

        row.dataset.modifiedByAdminId =
            getEntityConfig().actorAdminId;

        syncStatusLabel(row);

        if (
            !refs.memberDetailView?.classList.contains(
                "d-none"
            )
        ) {
            renderMemberDetailFields(row);
        }

        if (memberState.sortKey === "enabled") {
            renderTable();
        }
    }


    async function confirmStatusChange() {
        if (!pendingStatusChange) return;

        const reason =
            refs.memberStatusReason?.value.trim() || "";

        if (!reason) {
            setReasonError(true);
            refs.memberStatusReason?.focus();
            return;
        }

        const success = await updateEntityStatus(
            pendingStatusChange.row,
            false,
            reason
        );

        if (!success) return;

        pendingStatusChange = null;
        statusModal?.hide();
    }



  function collectRows() {
    if (!refs.memberTableBody) {
      memberRowElements = [];
      return;
    }

    memberRowElements = Array.from(refs.memberTableBody.querySelectorAll("[data-member-row]"));
    memberRowElements.forEach(syncStatusLabel);
  }

  function getFilterText(row, key) {
    const data = getMemberData(row);
    const rawValue = data[key] ?? "";
    const cellText = getCellText(row, key);
    return (String(rawValue) + " " + cellText).toLowerCase();
  }

  function getFilteredRows() {
    if (!memberRowElements.length) collectRows();

    return memberRowElements.filter((row) => {
      return Object.entries(memberState.filters).every(([key, value]) => {
        if (!value) return true;
        return getFilterText(row, key).includes(value.toLowerCase());
      });
    });
  }

  function getSortValue(row, key) {
    const data = getMemberData(row);
    const resolvedKey = key === "detail" ? "account" : key;
    if (resolvedKey === "id") return Number(data.id) || 0;
    return data[resolvedKey];
  }

  function sortRows(rows) {
    const dir = memberState.sortDir === "asc" ? 1 : -1;

    return [...rows].sort((a, b) => {
      const valueA = getSortValue(a, memberState.sortKey);
      const valueB = getSortValue(b, memberState.sortKey);

      if (typeof valueA === "number" || typeof valueB === "number") {
        return ((Number(valueA) || 0) - (Number(valueB) || 0)) * dir;
      }

      if (typeof valueA === "boolean" || typeof valueB === "boolean") {
        return (valueA === valueB ? 0 : valueA ? 1 : -1) * dir;
      }

      return String(valueA).localeCompare(String(valueB), "zh-Hant") * dir;
    });
  }

  function updateMemberSortIcons() {
    document.querySelectorAll("[data-member-sort]").forEach((button) => {
      const icon = button.querySelector("i");
      const isActive = button.dataset.memberSort === memberState.sortKey;
      const iconName = isActive
        ? memberState.sortDir === "asc" ? "bi-sort-up" : "bi-sort-down"
        : "bi-arrow-down-up";

      if (icon) icon.className = "bi " + iconName;
    });
  }

  function renderMemberPagination(totalPages) {
    if (!refs.memberPagination) return;

    const currentPage = memberState.page;
    const pageButton = (label, page, disabled = false, active = false) => [
      '<li class="page-item' + (disabled ? ' disabled' : '') + (active ? ' active' : '') + '">',
      '<button class="page-link" type="button" data-member-page="' + page + '" ' + (disabled ? 'disabled' : '') + '>' + label + '</button>',
      '</li>'
    ].join("");

    let html = pageButton('<i class="bi bi-chevron-left"></i>', "prev", currentPage === 1);
    for (let page = 1; page <= totalPages; page += 1) {
      html += pageButton(page, page, false, page === currentPage);
    }
    html += pageButton('<i class="bi bi-chevron-right"></i>', "next", currentPage === totalPages);

    refs.memberPagination.innerHTML = html;
  }

  function getEmptyRow() {
    let row = refs.memberTableBody?.querySelector("[data-member-empty]");
    if (row) return row;

    row = document.createElement("tr");
    row.className = "member-empty-row";
    row.dataset.memberEmpty = "true";

    const cell = document.createElement("td");
    cell.colSpan = getTableColumns().length + 2;
    cell.textContent = "查無符合條件的會員資料";
    row.appendChild(cell);

    return row;
  }

  function renderVisibleRows(rows) {
    if (!refs.memberTableBody) return;

    refs.memberTableBody.querySelector("[data-member-empty]")?.remove();
    memberRowElements.forEach((row) => row.classList.add("d-none"));

    if (!rows.length) {
      refs.memberTableBody.appendChild(getEmptyRow());
      return;
    }

    rows.forEach((row) => {
      row.classList.remove("d-none");
      refs.memberTableBody.appendChild(row);
    });
  }

  function renderTable() {
    if (!refs.memberManagementView || !refs.memberTableBody) return;

    const filteredRows = sortRows(getFilteredRows());
    const totalPages = Math.max(Math.ceil(filteredRows.length / memberState.pageSize), 1);
    memberState.page = Math.min(memberState.page, totalPages);

    const startIndex = (memberState.page - 1) * memberState.pageSize;
    const pageRows = filteredRows.slice(startIndex, startIndex + memberState.pageSize);
    const endIndex = startIndex + pageRows.length;

    renderVisibleRows(pageRows);
    renderMemberPagination(totalPages);
    updateMemberSortIcons();

    if (refs.memberResultCount) refs.memberResultCount.textContent = "共 " + filteredRows.length + " 筆";
    if (refs.memberPageInfo) {
      refs.memberPageInfo.textContent = filteredRows.length
        ? "第 " + memberState.page + " / " + totalPages + " 頁・顯示 " + (startIndex + 1) + "-" + endIndex + " 筆"
        : "沒有符合條件的會員";
    }
  }

  function renderMemberDetailFields(row) {
    if (!refs.memberDetailGrid) return;

    const data = getMemberData(row);
    if (refs.memberDetailView) refs.memberDetailView.dataset.memberId = data.id;

    refs.memberDetailGrid.querySelectorAll("[data-member-detail-value]").forEach((node) => {
      node.textContent = data[node.dataset.memberDetailValue] ?? "";
    });

    if (refs.memberDetailStatus) refs.memberDetailStatus.checked = data.enabled;
    if (refs.memberDetailStatusLabel) refs.memberDetailStatusLabel.textContent = data.enabledText;

    const avatarPreview = refs.memberDetailGrid.querySelector("[data-member-avatar-preview]");
    if (avatarPreview) {
      avatarPreview.dataset.activeDollConfigsId = data.activeDollConfigsId;
      avatarPreview.dataset.activeDollFrameId = data.activeDollFrameId;
    }
  }

  function findMemberRow(memberId) {
    if (!memberRowElements.length) collectRows();
    return memberRowElements.find((row) => (row.dataset.id || "") === String(memberId));
  }

  function showDetail(memberId, updateHash = true) {
    const row = findMemberRow(memberId);
    if (!row) return;

    const data = getMemberData(row);
    refs.dashboardScreen?.classList.add("d-none");
    refs.dashboardFooter?.classList.add("d-none");
    refs.managementScreen?.classList.remove("d-none");
    refs.genericManagementActions?.classList.add("d-none");
    refs.shopManagementActions?.classList.add("d-none");
    refs.memberManagementView?.classList.add("d-none");
    refs.memberDetailView?.classList.remove("d-none");
    refs.pageTitleWrap?.classList.remove("d-none");
    if (refs.pageTitleText) refs.pageTitleText.textContent = "管理平台";
    const config = getEntityConfig();
    if (refs.managementTitle) refs.managementTitle.textContent = config.detailTitle;
    if (refs.managementDescription) {
      refs.managementDescription.textContent = config.detailDescriptionTemplate
        .replace("{nickname}", data.nickname)
        .replace("{account}", data.account)
        .replace("{id}", data.id);
    }
    if (refs.memberDetailTitle) refs.memberDetailTitle.textContent = data.nickname + "｜" + data.account + "｜#" + data.id;
    renderMemberDetailFields(row);

    const memberLink = document.querySelector('[data-screen="' + config.screen + '"]');
    document.querySelectorAll("[data-screen]").forEach((item) => item.classList.remove("active"));
    memberLink?.classList.add("active");
    if (memberLink) helpers.syncSidebarParent?.(memberLink);
    if (updateHash) history.replaceState(null, "", "#member-detail-" + encodeURIComponent(data.id));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function getDetailAccountFromHash(hash = window.location.hash) {
    const match = hash.match(/^#member-detail-(.+)$/);
    return match ? decodeURIComponent(match[1]) : null;
  }

  function bindEvents() {
    if (initialized) return;
    initialized = true;
    statusModal = refs.memberStatusModal && window.bootstrap?.Modal
      ? window.bootstrap.Modal.getOrCreateInstance(refs.memberStatusModal)
      : null;
    createModal = refs.memberCreateModal && window.bootstrap?.Modal
      ? window.bootstrap.Modal.getOrCreateInstance(refs.memberCreateModal)
      : null;

    document.querySelectorAll("[data-member-filter]").forEach((input) => {
      input.addEventListener("input", () => {
        memberState.filters[input.dataset.memberFilter] = input.value.trim();
        memberState.page = 1;
        renderTable();
      });
    });

    refs.memberSearchForm?.addEventListener("submit", (event) => {
      event.preventDefault();
      memberState.page = 1;
      renderTable();
    });

    refs.memberCreateForm?.addEventListener("submit", handleCreateSubmit);

    refs.memberCreateModal?.addEventListener("shown.bs.modal", () => {
      refs.memberCreateAccount?.focus();
    });

    refs.memberCreateModal?.addEventListener("hidden.bs.modal", resetCreateForm);

    refs.memberFilterReset?.addEventListener("click", () => {
      document.querySelectorAll("[data-member-filter]").forEach((input) => {
        input.value = "";
        memberState.filters[input.dataset.memberFilter] = "";
      });
      memberState.page = 1;
      renderTable();
    });

    document.querySelectorAll("[data-member-sort]").forEach((button) => {
      button.addEventListener("click", () => {
        const sortKey = button.dataset.memberSort;
        if (memberState.sortKey === sortKey) {
          memberState.sortDir = memberState.sortDir === "asc" ? "desc" : "asc";
        } else {
          memberState.sortKey = sortKey;
          memberState.sortDir = "asc";
        }
        memberState.page = 1;
        renderTable();
      });
    });

    refs.memberTableBody?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-member-detail]");
      if (!button) return;

      showDetail(button.dataset.memberDetail);
    });

    refs.memberTableBody?.addEventListener("change", (event) => {
      const input = event.target.closest("[data-member-status]");
      if (!input) return;

      const row = input.closest("[data-member-row]");
      if (!row) return;

      const previousEnabled = row.dataset.enabled === "true";
      const nextEnabled = input.checked;
      if (previousEnabled === nextEnabled) return;

      input.checked = previousEnabled;
      syncStatusLabel(row);
      openStatusModal(row, nextEnabled);
    });

    //refs.memberDetailStatus?.addEventListener("change", (event) => {
    //  const row = findMemberRow(refs.memberDetailView?.dataset.memberId);
    //  if (!row) {
    //    event.target.checked = !event.target.checked;
    //    return;
    //  }

    //  const previousEnabled = row.dataset.enabled === "true";
    //  const nextEnabled = event.target.checked;
    //  if (previousEnabled === nextEnabled) return;

    //  event.target.checked = previousEnabled;
    //  if (refs.memberDetailStatusLabel) refs.memberDetailStatusLabel.textContent = previousEnabled ? "啟用" : "停用";

    //    async function openStatusModal(row, nextEnabled)
    //    {
    //        // 啟用：不開視窗，直接寫入資料庫。
    //        if (nextEnabled) {
    //            await updateAdminStatus(row,true,null);
    //            return;
    //        }

    //        // 停用：使用 Index.cshtml 現有的 Modal。
    //        const data = getMemberData(row);

    //        pendingStatusChange = {row,nextEnabled: false};

    //        if (refs.memberStatusModalDescription) {
    //            refs.memberStatusModalDescription.textContent =
    //                "請輸入「" +
    //                data.nickname +
    //                "｜" +
    //                data.account +
    //                "」的停用原因。";
    //        }

    //        if (refs.memberStatusReason) {refs.memberStatusReason.value = "";}

    //        setReasonError(false);

    //        // 顯示 Index.cshtml 現有的 Modal。
    //        statusModal?.show();
    //    }
    //    }

      //});

      refs.memberDetailStatus?.addEventListener(
          "change",
          (event) => {
              const row = findMemberRow(
                  refs.memberDetailView?.dataset.memberId
              );

              if (!row) {
                  event.target.checked =
                      !event.target.checked;

                  return;
              }

              const previousEnabled =
                  row.dataset.enabled === "true";

              const nextEnabled =
                  event.target.checked;

              if (
                  previousEnabled === nextEnabled
              ) {
                  return;
              }

              // 等待 API 成功前，先恢復原本狀態。
              event.target.checked =
                  previousEnabled;

              if (refs.memberDetailStatusLabel) {
                  refs.memberDetailStatusLabel.textContent =
                      previousEnabled
                          ? "啟用"
                          : "停用";
              }

              openStatusModal(
                  row,
                  nextEnabled
              );
          }
      );






    refs.memberStatusConfirm?.addEventListener("click", confirmStatusChange);

    refs.memberStatusReason?.addEventListener("input", () => {
      if (refs.memberStatusReason.value.trim()) setReasonError(false);
    });

    refs.memberStatusModal?.addEventListener("hidden.bs.modal", () => {
      pendingStatusChange = null;
      if (refs.memberStatusReason) refs.memberStatusReason.value = "";
      setReasonError(false);
    });

    refs.memberPagination?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-member-page]");
      if (!button || button.disabled) return;

      const targetPage = button.dataset.memberPage;
      const totalPages = Math.max(Math.ceil(getFilteredRows().length / memberState.pageSize), 1);

      if (targetPage === "prev") memberState.page = Math.max(memberState.page - 1, 1);
      else if (targetPage === "next") memberState.page = Math.min(memberState.page + 1, totalPages);
      else memberState.page = Number(targetPage);

      renderTable();
    });

    refs.memberDetailBack?.addEventListener("click", () => {
      const memberLink = document.querySelector('[data-screen="' + getEntityConfig().screen + '"]');
      if (!memberLink) return;

      helpers.setActiveScreen?.(memberLink);
      history.replaceState(null, "", memberLink.getAttribute("href"));
    });
  }

  function init(options = {}) {
    Object.assign(refs, {
      memberSearchForm: document.getElementById("memberSearchForm"),
      memberTableBody: document.getElementById("memberTableBody"),
      memberPagination: document.getElementById("memberPagination"),
      memberPageInfo: document.getElementById("memberPageInfo"),
      memberResultCount: document.getElementById("memberResultCount"),
      memberDetailTitle: document.getElementById("memberDetailTitle"),
      memberDetailGrid: document.getElementById("memberDetailGrid"),
      memberDetailStatus: document.getElementById("memberDetailStatus"),
      memberDetailStatusLabel: document.getElementById("memberDetailStatusLabel"),
      memberDetailBack: document.getElementById("memberDetailBack"),
      memberFilterReset: document.getElementById("memberFilterReset"),
      memberCreateModal: document.getElementById("memberCreateModal"),
      memberCreateForm: document.getElementById("memberCreateForm"),
      memberCreateAccount: document.getElementById("memberCreateAccount"),
      memberCreatePassword: document.getElementById("memberCreatePassword"),
      memberCreatePasswordConfirm: document.getElementById("memberCreatePasswordConfirm"),
      memberCreateNickname: document.getElementById("memberCreateNickname"),
      memberCreatePhone: document.getElementById("memberCreatePhone"),
      memberCreateEmail: document.getElementById("memberCreateEmail"),
      memberStatusModal: document.getElementById("memberStatusModal"),
      memberStatusModalTitle: document.getElementById("memberStatusModalTitle"),
      memberStatusModalDescription: document.getElementById("memberStatusModalDescription"),
      memberStatusReason: document.getElementById("memberStatusReason"),
      memberStatusReasonError: document.getElementById("memberStatusReasonError"),
      memberStatusConfirm: document.getElementById("memberStatusConfirm"),
      toastMessage: document.getElementById("toastMessage")
    }, options);

    Object.assign(helpers, {
      syncSidebarParent: options.syncSidebarParent,
      setActiveScreen: options.setActiveScreen
    });

    collectRows();
    bindEvents();
  }

  window.PawPuffMemberManagement = {
    init,
    renderTable,
    showDetail,
    getDetailAccountFromHash
  };
})();
