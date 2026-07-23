(() => {
    "use strict";

    let editModal = null;
    let activeRow = null;
    let isSubmitting = false;

    function showToast(message) {
        const toastMessage = document.getElementById("toastMessage");

        if (toastMessage) {
            toastMessage.textContent = message;
        }

        const toastElement = document.getElementById("actionToast");

        const toast = toastElement && window.bootstrap?.Toast
            ? window.bootstrap.Toast.getOrCreateInstance(
                toastElement,
                { delay: 2200 }
            )
            : null;

        toast?.show();
    }

    function getRuleName(row) {
        return row
            .querySelector('[data-point-rule-cell="name"]')
            ?.textContent
            .trim() || "此規則";
    }

    function getDefaultValueCell(row) {
        return row.querySelector(
            '[data-point-rule-cell="defaultValue"]'
        );
    }

    function getDescriptionCell(row) {
        return row.querySelector(
            '[data-point-rule-cell="description"]'
        );
    }

    function getEditForm() {
        return document.getElementById("pointRuleEditForm");
    }

    function getAntiForgeryToken(form) {
        return form.querySelector(
            'input[name="__RequestVerificationToken"]'
        )?.value || "";
    }

    function setSubmitting(submitting) {
        isSubmitting = submitting;

        const submitButton = document.getElementById(
            "pointRuleEditSubmit"
        );

        if (!submitButton) {
            return;
        }

        submitButton.disabled = submitting;
        submitButton.textContent = submitting
            ? "儲存中..."
            : "儲存修改";
    }

    function resetEditForm() {
        const form = getEditForm();

        form?.reset();
        form?.classList.remove("was-validated");

        form
            ?.querySelectorAll("input, textarea")
            .forEach(field => {
                field.setCustomValidity("");
            });

        setSubmitting(false);
        activeRow = null;
    }

    function openEditModal(row) {
        if (!row || row.dataset.fixed !== "true") {
            showToast(
                "此規則不是固定值，無法編輯預設值與描述。"
            );

            return;
        }

        activeRow = row;

        const value = String(
            row.dataset.defaultValue || ""
        ).trim();

        const description = String(
            row.dataset.description || ""
        ).trim();

        document.getElementById("pointRuleEditId").value =
            row.dataset.id || "";

        document.getElementById("pointRuleEditName").value =
            getRuleName(row);

        document.getElementById("pointRuleEditValue").value =
            value;

        document.getElementById("pointRuleEditReason").value =
            description;

        const form = getEditForm();
        form?.classList.remove("was-validated");

        form
            ?.querySelectorAll("input, textarea")
            .forEach(field => {
                field.setCustomValidity("");
            });

        editModal?.show();
    }

    function validateEditForm(
        form,
        valueInput,
        descriptionInput
    ) {
        const rawValue = valueInput.value.trim();
        const numericValue = Number(rawValue);
        const description = descriptionInput.value.trim();

        const isValidValue =
            rawValue !== "" &&
            Number.isInteger(numericValue) &&
            numericValue >= 0 &&
            numericValue <= 2147483647;

        valueInput.setCustomValidity(
            isValidValue
                ? ""
                : "請輸入大於或等於 0 的整數預設值。"
        );

        descriptionInput.setCustomValidity(
            description.length > 0 && description.length <= 100
                ? ""
                : "請填寫 100 個字以內的描述。"
        );

        form.classList.add("was-validated");

        return {
            isValid: form.checkValidity(),
            numericValue,
            description
        };
    }

    async function readJsonResponse(response) {
        try {
            return await response.json();
        } catch {
            return null;
        }
    }

    async function handleEditSubmit(event) {
        event.preventDefault();

        if (!activeRow || isSubmitting) {
            return;
        }

        if (activeRow.dataset.fixed !== "true") {
            showToast(
                "此規則不是固定值，無法編輯預設值與描述。"
            );

            return;
        }

        const form = event.currentTarget;
        const valueInput = document.getElementById(
            "pointRuleEditValue"
        );
        const descriptionInput = document.getElementById(
            "pointRuleEditReason"
        );

        const validation = validateEditForm(
            form,
            valueInput,
            descriptionInput
        );

        if (!validation.isValid) {
            return;
        }

        const id = Number(
            document.getElementById("pointRuleEditId").value
        );

        if (!Number.isInteger(id) || id <= 0) {
            showToast("規則編號不正確，請重新整理頁面。");
            return;
        }

        const originalValue = String(
            activeRow.dataset.defaultValue || ""
        ).trim();

        const originalDescription = String(
            activeRow.dataset.description || ""
        ).trim();

        if (
            String(validation.numericValue) === originalValue &&
            validation.description === originalDescription
        ) {
            showToast("預設值與描述未變更。");
            return;
        }

        const updateUrl = form.dataset.updateUrl;
        const antiForgeryToken = getAntiForgeryToken(form);

        if (!updateUrl || !antiForgeryToken) {
            showToast("缺少更新網址或防偽權杖，請重新整理頁面。");
            return;
        }

        setSubmitting(true);

        try {
            const response = await fetch(updateUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "RequestVerificationToken": antiForgeryToken
                },
                body: JSON.stringify({
                    id,
                    defaultValue: validation.numericValue,
                    description: validation.description
                })
            });

            const payload = await readJsonResponse(response);

            if (!response.ok || !payload?.success) {
                throw new Error(
                    payload?.message ||
                    `更新失敗（HTTP ${response.status}）。`
                );
            }

            const updatedRule = payload.rule;
            const nextValue = String(
                updatedRule?.defaultValue ?? validation.numericValue
            );
            const nextDescription = String(
                updatedRule?.description ?? validation.description
            );

            activeRow.dataset.defaultValue = nextValue;
            activeRow.dataset.description = nextDescription;

            const valueCell = getDefaultValueCell(activeRow);
            const descriptionCell = getDescriptionCell(activeRow);

            if (valueCell) {
                valueCell.textContent = nextValue;
            }

            if (descriptionCell) {
                descriptionCell.textContent = nextDescription;
            }

            showToast(
                payload.message || `${getRuleName(activeRow)}已更新。`
            );

            editModal?.hide();
        } catch (error) {
            showToast(
                error instanceof Error
                    ? error.message
                    : "更新點數規則時發生錯誤。"
            );
        } finally {
            setSubmitting(false);
        }
    }

    function bindEvents() {
        const tableBody = document.getElementById(
            "pointRuleTableBody"
        );

        if (!tableBody) {
            return;
        }

        tableBody.addEventListener("click", event => {
            const button = event.target.closest(
                "[data-point-rule-edit]"
            );

            if (!button) {
                return;
            }

            openEditModal(
                button.closest("[data-point-rule-row]")
            );
        });

        getEditForm()?.addEventListener(
            "submit",
            handleEditSubmit
        );

        document
            .getElementById("pointRuleEditModal")
            ?.addEventListener(
                "hidden.bs.modal",
                resetEditForm
            );

        document
            .getElementById("pointRuleEditValue")
            ?.addEventListener("input", event => {
                event.target.setCustomValidity("");
            });

        document
            .getElementById("pointRuleEditReason")
            ?.addEventListener("input", event => {
                event.target.setCustomValidity("");
            });
    }

    function init() {
        if (!document.getElementById("pointRuleView")) {
            return;
        }

        const modalElement = document.getElementById(
            "pointRuleEditModal"
        );

        editModal = modalElement && window.bootstrap?.Modal
            ? window.bootstrap.Modal.getOrCreateInstance(modalElement)
            : null;

        bindEvents();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();