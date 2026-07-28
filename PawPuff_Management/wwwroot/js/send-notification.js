(() => {
    "use strict";

    const refs = {};
    let confirmModal = null;
    let pendingPayload = null;

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

    function getSelectedAudienceOption() {
        return refs.audience?.selectedOptions?.[0] || null;
    }

    function getAudienceLabel() {
        return getSelectedAudienceOption()?.dataset.label || "";
    }

    function getCurrentAccountListId() {
        return getSelectedAudienceOption()?.dataset.list || "";
    }

    function getCurrentAccounts() {
        const listId = getCurrentAccountListId();
        if (!listId) return [];

        return Array.from(
            document.querySelectorAll("#" + CSS.escape(listId) + " option")
        )
            .map((option) => option.value.trim())
            .filter(Boolean);
    }

    function syncAccountField() {
        const listId = getCurrentAccountListId();
        const hasAudience = Boolean(listId);

        refs.accountField?.classList.toggle("is-hidden", !hasAudience);
        refs.account.disabled = !hasAudience;
        refs.account.value = "";

        if (hasAudience) {
            refs.account.setAttribute("list", listId);
        } else {
            refs.account.removeAttribute("list");
        }

        refs.account.placeholder = hasAudience
            ? "輸入" + getAudienceLabel() + "帳號"
            : "請先選擇傳送對象";

        refs.account.setCustomValidity("");
    }

    function updateMessageCounter() {
        if (!refs.messageCounter) return;
        refs.messageCounter.textContent = refs.message.value.length + " / 100";
    }

    function validateForm() {
        const account = refs.account.value.trim();
        const message = refs.message.value.trim();
        const accounts = getCurrentAccounts();

        refs.audience.setCustomValidity(
            refs.audience.value
                ? ""
                : "請選擇訊息傳送對象。"
        );

        refs.account.setCustomValidity(
            account && accounts.includes(account)
                ? ""
                : "請選擇清單中可發送的" + getAudienceLabel() + "帳號。"
        );

        refs.message.setCustomValidity(
            message.length >= 1 && message.length <= 100
                ? ""
                : "請輸入 1 至 100 字的通知內容。"
        );

        if (refs.account.validationMessage && refs.accountFeedback) {
            refs.accountFeedback.textContent = refs.account.validationMessage;
        }

        refs.form.classList.add("was-validated");

        return refs.form.checkValidity();
    }

    function openConfirmModal() {
        pendingPayload = {
            recipientType: refs.audience.value,
            recipientAccount: refs.account.value.trim(),
            notificationContent: refs.message.value.trim()
        };

        refs.confirmTarget.textContent =
            getAudienceLabel() + "「" + pendingPayload.recipientAccount + "」";
        refs.confirmMessage.textContent = pendingPayload.notificationContent;

        confirmModal?.show();
    }

    function resetForm() {
        refs.form.reset();
        refs.form.classList.remove("was-validated");

        refs.form
            .querySelectorAll("select, input, textarea")
            .forEach((field) => field.setCustomValidity(""));

        pendingPayload = null;
        syncAccountField();
        updateMessageCounter();
    }

    function setSendBusy(isBusy) {
        refs.confirmButton.disabled = isBusy;
        refs.submitButton.disabled = isBusy;
        refs.confirmButton
            .querySelector("[data-send-idle]")
            ?.classList.toggle("is-hidden", isBusy);
        refs.confirmButton
            .querySelector("[data-send-busy]")
            ?.classList.toggle("is-hidden", !isBusy);
    }

    async function readResponse(response) {
        const contentType = response.headers.get("content-type") || "";

        if (contentType.includes("json")) {
            return await response.json();
        }

        const responseText = await response.text();

        return {
            message: responseText || "伺服器回傳了無法辨識的結果。"
        };
    }

    async function sendNotification() {
        if (!pendingPayload) return;

        const sendUrl = refs.form.dataset.sendUrl;
        const antiForgeryToken = refs.form.querySelector(
            'input[name="__RequestVerificationToken"]'
        )?.value;

        if (!sendUrl || !antiForgeryToken) {
            showToast("缺少發送網址或防偽權杖，請重新整理頁面。");
            return;
        }

        setSendBusy(true);

        try {
            const response = await fetch(sendUrl, {
                method: "POST",
                credentials: "same-origin",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    RequestVerificationToken: antiForgeryToken
                },
                body: JSON.stringify(pendingPayload)
            });

            const payload = await readResponse(response);

            if (
                !response.ok ||
                payload.success !== true ||
                payload.persisted !== true ||
                !payload.notification
            ) {
                throw new Error(payload.message || "通知發送失敗。");
            }

            confirmModal?.hide();
            showToast(payload.message || "通知已發送。");
            resetForm();
        } catch (error) {
            console.error(error);
            showToast(error.message || "通知發送失敗，請稍後再試。");
        } finally {
            setSendBusy(false);
        }
    }

    function bindEvents() {
        refs.audience.addEventListener("change", () => {
            syncAccountField();
            refs.audience.setCustomValidity("");
        });

        refs.account.addEventListener("input", () => {
            refs.account.setCustomValidity("");
        });

        refs.message.addEventListener("input", () => {
            refs.message.setCustomValidity("");
            updateMessageCounter();
        });

        refs.form.addEventListener("submit", (event) => {
            event.preventDefault();

            if (!validateForm()) return;

            openConfirmModal();
        });

        refs.confirmButton.addEventListener("click", sendNotification);

        refs.confirmModalElement.addEventListener("hidden.bs.modal", () => {
            if (!refs.confirmButton.disabled) {
                pendingPayload = null;
            }
        });
    }

    function init() {
        Object.assign(refs, {
            form: document.getElementById("sendNotificationForm"),
            audience: document.getElementById("notificationAudience"),
            accountField: document.getElementById("notificationAccountField"),
            account: document.getElementById("notificationAccount"),
            accountFeedback: document.getElementById(
                "notificationAccountFeedback"
            ),
            message: document.getElementById("notificationMessage"),
            messageCounter: document.getElementById(
                "notificationMessageCounter"
            ),
            submitButton: document.getElementById(
                "sendNotificationSubmitButton"
            ),
            confirmModalElement: document.getElementById(
                "sendNotificationConfirmModal"
            ),
            confirmTarget: document.getElementById("sendConfirmTarget"),
            confirmMessage: document.getElementById("sendConfirmMessage"),
            confirmButton: document.getElementById(
                "sendNotificationConfirmButton"
            )
        });

        if (!refs.form || !refs.confirmModalElement) return;

        confirmModal = window.bootstrap?.Modal
            ? window.bootstrap.Modal.getOrCreateInstance(
                refs.confirmModalElement
            )
            : null;

        syncAccountField();
        updateMessageCounter();
        bindEvents();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
