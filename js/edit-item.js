import { auth, db } from "./firebase-config.js";
import { setupNavbar, requireLogin } from "./auth-state.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { initLangToggle, t } from "./i18n.js";
import { showToast } from "./modal.js";

const IMGBB_API_KEY = "b5ef66d00673c41175a802f8d7ee0f11";

setupNavbar();
initLangToggle();

const currentUser = await requireLogin();
const itemId = new URLSearchParams(window.location.search).get("id");

const loadingSpinner = document.getElementById("loadingSpinner");
const errorState = document.getElementById("errorState");
const editCard = document.getElementById("editCard");
const form = document.getElementById("editForm");
const alertBox = document.getElementById("alertBox");

const titleInput = document.getElementById("title");
const categoryInput = document.getElementById("category");
const descInput = document.getElementById("description");
const locationInput = document.getElementById("location");
const dateInput = document.getElementById("date");
const photoInput = document.getElementById("photo");
const photoPreview = document.getElementById("photoPreview");
const typeBadge = document.getElementById("typeBadge");
const saveBtn = document.getElementById("saveBtn");

let currentItem = null;

if (dateInput) dateInput.max = new Date().toISOString().split("T")[0];

function showError() {
    loadingSpinner.classList.add("d-none");
    errorState.classList.remove("d-none");
}

function showAlert(message, type) {
    alertBox.className = `alert alert-${type}`;
    alertBox.textContent = message;
    alertBox.classList.remove("d-none");
}

async function loadItem() {
    if (!itemId) { showError(); return; }
    try {
        const snap = await getDoc(doc(db, "items", itemId));
        if (!snap.exists()) { showError(); return; }
        const item = { id: snap.id, ...snap.data() };

        // 归属校验:只能编辑自己发的
        if (item.userId !== currentUser.uid) { showError(); return; }

        currentItem = item;

        titleInput.value = item.title || "";
        categoryInput.value = item.category || "";
        descInput.value = item.description || "";
        locationInput.value = item.location || "";
        dateInput.value = item.date || "";

        typeBadge.innerHTML = item.type === "lost"
            ? `<span class="badge bg-danger">${t("browse.lost")}</span>`
            : `<span class="badge bg-success">${t("browse.found")}</span>`;

        if (item.photoUrl) {
            photoPreview.src = item.photoUrl;
            photoPreview.classList.remove("d-none");
        }

        loadingSpinner.classList.add("d-none");
        editCard.classList.remove("d-none");
    } catch (err) {
        console.error(err);
        showError();
    }
}

photoInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
        showAlert(t("edit.photoTooLarge"), "warning");
        photoInput.value = "";
        return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
        photoPreview.src = ev.target.result;
        photoPreview.classList.remove("d-none");
    };
    reader.readAsDataURL(file);
});

async function uploadToImgbb(file) {
    const formData = new FormData();
    formData.append("image", file);
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
        method: "POST",
        body: formData
    });
    const data = await response.json();
    if (!data.success) throw new Error("Image upload failed");
    return data.data.url;
}

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const originalBtn = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> ' + t("edit.saving");

    try {
        let photoUrl = currentItem.photoUrl || "";
        const newPhoto = photoInput.files[0];
        if (newPhoto) {
            saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> ' + t("edit.uploading");
            photoUrl = await uploadToImgbb(newPhoto);
        }

        // 只更新这条 item 的内容字段 —— 不动 users,也不动发布者冗余信息
        await updateDoc(doc(db, "items", itemId), {
            title: titleInput.value.trim(),
            category: categoryInput.value,
            description: descInput.value.trim(),
            location: locationInput.value.trim(),
            date: dateInput.value,
            photoUrl: photoUrl
        });

        showToast(t("edit.saved"), "success");
        setTimeout(() => { window.location.href = "my-posts.html"; }, 900);
    } catch (err) {
        console.error(err);
        showToast(t("toast.error") + ": " + err.message, "danger");
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalBtn;
    }
});

loadItem();