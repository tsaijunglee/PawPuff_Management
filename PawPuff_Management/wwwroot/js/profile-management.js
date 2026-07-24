(function () {
  "use strict";

  function initProfileManagement() {
    const detailView = document.getElementById("profileDetailView");
    if (!detailView) return;

    const refs = {
      title: document.getElementById("profileDetailTitle"),
      nickname: document.getElementById("profileNickname"),
      password: document.getElementById("profilePassword"),
      passwordConfirm: document.getElementById("profilePasswordConfirm"),
      saveButton: document.getElementById("profileSaveButton"),
      resetButton: document.getElementById("profileResetButton"),
      confirmModal: document.getElementById("profileConfirmModal"),
      confirmList: document.getElementById("profileConfirmList"),
      confirmSave: document.getElementById("profileConfirmSave"),
      toastMessage: document.getElementById("toastMessage")
    };

    //const state = {
    //  account: detailView.dataset.profileAccount || "admin01",
    //  nickname: detailView.dataset.profileNickname || refs.nickname?.value || ""
      //};

      const state = {
          account:
              detailView.dataset.profileAccount ||
              "",

          nickname:
              detailView.dataset.profileNickname ||
              refs.nickname?.value ||
              ""
      };



    const confirmModal = refs.confirmModal && window.bootstrap?.Modal
      ? window.bootstrap.Modal.getOrCreateInstance(refs.confirmModal)
      : null;

    function showToast(message) {
      if (refs.toastMessage) refs.toastMessage.textContent = message;
      const toastElement = document.getElementById("actionToast");
      const toast = toastElement && window.bootstrap?.Toast
        ? window.bootstrap.Toast.getOrCreateInstance(toastElement, { delay: 1800 })
        : null;
      toast?.show();
    }

    function setInvalid(input, invalid, message) {
      input?.classList.toggle("is-invalid", invalid);
      const feedback = input?.closest(".profile-edit-field")?.querySelector(".invalid-feedback");
      if (feedback && message) feedback.textContent = message;
    }

    function getValues() {
      return {
        nickname: refs.nickname?.value.trim() || "",
        password: refs.password?.value || "",
        passwordConfirm: refs.passwordConfirm?.value || ""
      };
    }

    function getChanges(values) {
      const changes = [];
      if (values.nickname !== state.nickname) {
        changes.push({ label: "暱稱", value: values.nickname });
      }
      if (values.password || values.passwordConfirm) {
        changes.push({ label: "密碼", value: "將更新為新密碼" });
      }
      return changes;
    }

    //function validate(values) {
    //  const needsPasswordUpdate = Boolean(values.password || values.passwordConfirm);
    //  let valid = true;

    //  setInvalid(refs.nickname, false);
    //  setInvalid(refs.password, false);
    //  setInvalid(refs.passwordConfirm, false);

    //  if (!values.nickname) {
    //    setInvalid(refs.nickname, true, "請輸入暱稱。");
    //    valid = false;
    //  }

    //  if (needsPasswordUpdate && !values.password) {
    //    setInvalid(refs.password, true, "請輸入新密碼。");
    //    valid = false;
    //  }

    //  if (needsPasswordUpdate && !values.passwordConfirm) {
    //    setInvalid(refs.passwordConfirm, true, "請再次輸入新密碼。");
    //    valid = false;
    //  }

    //  if (needsPasswordUpdate && values.password && values.passwordConfirm && values.password !== values.passwordConfirm) {
    //    setInvalid(refs.passwordConfirm, true, "兩次輸入的密碼需一致。");
    //    valid = false;
    //  }

    //  return valid;
      //}

      function validate(values) {
          const needsPasswordUpdate =
              Boolean(
                  values.password ||
                  values.passwordConfirm
              );

          const nicknamePattern =
              /^[\p{L}\p{N}]+$/u;

          const nicknameLength =
              Array.from(values.nickname).length;

          let valid = true;

          // 清除上一次的驗證狀態
          setInvalid(refs.nickname, false);
          setInvalid(refs.password, false);
          setInvalid(
              refs.passwordConfirm,
              false
          );

          // 暱稱驗證
          if (!values.nickname) {
              setInvalid(
                  refs.nickname,
                  true,
                  "請輸入暱稱。"
              );

              valid = false;
          } else if (
              nicknameLength > 10
          ) {
              setInvalid(
                  refs.nickname,
                  true,
                  "暱稱長度必須為1～10字。"
              );

              valid = false;
          } else if (
              !nicknamePattern.test(
                  values.nickname
              )
          ) {
              setInvalid(
                  refs.nickname,
                  true,
                  "暱稱只能使用中文、英文字母或數字。"
              );

              valid = false;
          }

          // 新密碼驗證
          if (
              needsPasswordUpdate &&
              !values.password
          ) {
              setInvalid(
                  refs.password,
                  true,
                  "請輸入新密碼。"
              );

              valid = false;
          } else if (
              needsPasswordUpdate &&
              (
                  values.password.length < 6 ||
                  values.password.length > 20
              )
          ) {
              setInvalid(
                  refs.password,
                  true,
                  "新密碼長度必須為6～20個字元。"
              );

              valid = false;
          }

          // 確認新密碼驗證
          if (
              needsPasswordUpdate &&
              !values.passwordConfirm
          ) {
              setInvalid(
                  refs.passwordConfirm,
                  true,
                  "請再次輸入新密碼。"
              );

              valid = false;
          } else if (
              needsPasswordUpdate &&
              values.password &&
              values.passwordConfirm &&
              values.password !==
              values.passwordConfirm
          ) {
              setInvalid(
                  refs.passwordConfirm,
                  true,
                  "兩次輸入的密碼需一致。"
              );

              valid = false;
          }

          return valid;
      }
      //格式驗證




    function renderConfirmList(changes) {
      if (!refs.confirmList) return;

      refs.confirmList.innerHTML = "";
      changes.forEach((change) => {
        const item = document.createElement("li");
        const label = document.createElement("span");
        label.textContent = change.label + "：";
        item.append(label, document.createTextNode(change.value));
        refs.confirmList.appendChild(item);
      });
    }

    function renderTitle() {
      if (refs.title) refs.title.textContent = state.nickname + "｜" + state.account;
      document.querySelectorAll(".admin-name").forEach((node) => {
        node.textContent = state.nickname;
      });
    }

    function openConfirm() {
      const values = getValues();
      if (!validate(values)) return;

      const changes = getChanges(values);
      if (!changes.length) {
        showToast("沒有需要儲存的修改");
        return;
      }

      renderConfirmList(changes);
      if (confirmModal) {
        confirmModal.show();
        return;
      }

      if (window.confirm("確定要儲存個人資料修改嗎？")) applyChanges();
    }

    //function applyChanges() {
    //  const values = getValues();
    //  if (!validate(values)) return;

    //  state.nickname = values.nickname;
    //  if (refs.password) refs.password.value = "";
    //  if (refs.passwordConfirm) refs.passwordConfirm.value = "";
    //  renderTitle();
    //  confirmModal?.hide();
    //  showToast("個人資料已更新");
      //}

      async function applyChanges() {
          const values = getValues();
          if (!validate(values)) return;

          const updateUrl =
              detailView.dataset.updateUrl;

          const token = detailView
              .querySelector(
                  'input[name="__RequestVerificationToken"]'
              )
              ?.value;

          if (!updateUrl) {
              showToast("找不到個人資料更新 API。");
              return;
          }

          refs.saveButton?.setAttribute(
              "disabled",
              "disabled"
          );

          refs.confirmSave?.setAttribute(
              "disabled",
              "disabled"
          );

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
                          nickname: values.nickname,
                          password:
                              values.password || null,
                          passwordConfirm:
                              values.passwordConfirm || null
                      })
                  }
              );

              const result = await response
                  .json()
                  .catch(() => ({}));

              if (!response.ok || !result.success) {
                  throw new Error(
                      result.message ||
                      "個人資料更新失敗。"
                  );
              }

              state.nickname =
                  result.profile?.nickname ||
                  values.nickname;

              if (refs.nickname) {
                  refs.nickname.value =
                      state.nickname;
              }

              if (refs.password) {
                  refs.password.value = "";
              }

              if (refs.passwordConfirm) {
                  refs.passwordConfirm.value = "";
              }

              renderTitle();
              confirmModal?.hide();

              showToast(
                  result.message ||
                  "個人資料已更新。"
              );
          } catch (error) {
              showToast(
                  error.message ||
                  "個人資料更新失敗。"
              );
          } finally {
              refs.saveButton?.removeAttribute(
                  "disabled"
              );

              refs.confirmSave?.removeAttribute(
                  "disabled"
              );
          }
      }



    function resetForm() {
      if (refs.nickname) refs.nickname.value = state.nickname;
      if (refs.password) refs.password.value = "";
      if (refs.passwordConfirm) refs.passwordConfirm.value = "";
      setInvalid(refs.nickname, false);
      setInvalid(refs.password, false);
      setInvalid(refs.passwordConfirm, false);
      showToast("已還原未儲存修改");
    }

    renderTitle();
    refs.saveButton?.addEventListener("click", openConfirm);
    refs.confirmSave?.addEventListener("click", applyChanges);
    refs.resetButton?.addEventListener("click", resetForm);
    refs.nickname?.addEventListener("input", () => setInvalid(refs.nickname, false));
    refs.password?.addEventListener("input", () => setInvalid(refs.password, false));
    refs.passwordConfirm?.addEventListener("input", () => setInvalid(refs.passwordConfirm, false));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initProfileManagement);
  } else {
    initProfileManagement();
  }
})();
