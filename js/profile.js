import { auth, db } from "./firebase-config.js";
import { setupNavbar, requireLogin } from "./auth-state.js";
import { initLangToggle, t } from "./i18n.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { showToast } from "./modal.js";

setupNavbar();
initLangToggle();

const currentUser = await requireLogin();

const loadingSpinner = document.getElementById("loadingSpinner");
const profileCard = document.getElementById("profileCard");
const form = document.getElementById("profileForm");

const fullNameInput = document.getElementById("fullName");
const phoneInput = document.getElementById("phone");
const emailInput = document.getElementById("email");     // 只读
const matricInput = document.getElementById("matricId"); // 只读
const saveBtn = document.getElementById("saveBtn");

async function loadProfile() {
    try {
        const snap = await getDoc(doc(db, "users", currentUser.uid));
        if (!snap.exists()) {
            showToast(t("toast.error"), "danger");
            return;
        }
        const data = snap.data();

        fullNameInput.value = data.fullName || "";
        phoneInput.value = data.phone || "";
        emailInput.value = data.email || currentUser.email || "";
        matricInput.value = data.matricId || "";

        loadingSpinner.classList.add("d-none");
        profileCard.classList.remove("d-none");
    } catch (err) {
        console.error(err);
        loadingSpinner.classList.add("d-none");
        showToast(t("toast.error") + ": " + err.message, "danger");
    }
}

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const fullName = fullNameInput.value.trim();
    const phone = phoneInput.value.trim();

    if (!fullName) {
        showToast(t("profile.nameRequired"), "danger");
        return;
    }

    const originalBtn = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> ' + t("profile.saving");

    try {
        await updateDoc(doc(db, "users", currentUser.uid), {
            fullName: fullName,
            phone: phone
        });

        // ✅ 成功:绿色提示,稍等一下跳回首页
        showToast(t("profile.saved"), "success");
        setTimeout(() => { window.location.href = "index.html"; }, 900);
        // 注意:成功后不恢复按钮,保持禁用,避免在跳转前被重复点击

    } catch (err) {
        // ❌ 失败:红色提示(带具体错误),并恢复按钮让用户重试
        console.error(err);
        showToast(t("toast.error") + ": " + err.message, "danger");
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalBtn;
    }
});

loadProfile();