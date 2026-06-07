import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { collection, getDocs, doc, getDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { initLangToggle, t } from "./i18n.js";
import { showConfirm, showToast } from "./modal.js";

initLangToggle();

const accessChecking = document.getElementById("accessChecking");
const accessDenied = document.getElementById("accessDenied");
const adminContent = document.getElementById("adminContent");

function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

document.getElementById("logoutBtn").addEventListener("click", async (e) => {
    e.preventDefault();
    await signOut(auth);
    window.location.href = "index.html";
});

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "login.html";
        return;
    }

    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (!userDoc.exists() || userDoc.data().role !== "admin") {
        accessChecking.classList.add("d-none");
        accessDenied.classList.remove("d-none");
        return;
    }

    accessChecking.classList.add("d-none");
    adminContent.classList.remove("d-none");
    loadDashboard();
});

async function loadDashboard() {
    await loadItems();
    await loadUsers();
}

async function loadItems() {
    const snapshot = await getDocs(collection(db, "items"));
    const items = [];
    snapshot.forEach((d) => items.push({ id: d.id, ...d.data() }));

    let lost = 0, found = 0;
    items.forEach((i) => { if (i.type === "lost") lost++; else found++; });

    document.getElementById("statTotal").textContent = items.length;
    document.getElementById("statLost").textContent = lost;
    document.getElementById("statFound").textContent = found;

    const tbody = document.getElementById("itemsTableBody");
    tbody.innerHTML = "";

    items.forEach((item) => {
        const tr = document.createElement("tr");
       const typeBadge = item.type === "lost"
            ? `<span class="badge bg-danger">${t("browse.lost")}</span>`
            : `<span class="badge bg-success">${t("browse.found")}</span>`;
        const statusBadge = item.status === "resolved"
            ? `<span class="badge bg-dark">${t("myposts.resolved")}</span>`
            : `<span class="badge bg-primary">${t("myposts.active")}</span>`;

        tr.innerHTML = `
            <td>${typeBadge}</td>
            <td><a href="item.html?id=${item.id}" target="_blank">${escapeHtml(item.title)}</a></td>
            <td>${escapeHtml(item.category)}</td>
            <td>${escapeHtml(item.location)}</td>
            <td>${escapeHtml(item.userName || "—")}</td>
            <td>${statusBadge}</td>
            <td><button class="btn btn-sm btn-outline-danger del-item" data-id="${item.id}" data-title="${escapeHtml(item.title)}"><i class="bi bi-trash"></i></button></td>
        `;
        tbody.appendChild(tr);
    });

   tbody.querySelectorAll(".del-item").forEach((btn) => {
        btn.addEventListener("click", async () => {
            const id = btn.dataset.id;
            const title = btn.dataset.title;
            
            const ok = await showConfirm({
                icon: "🗑️",
                iconType: "danger",
                title: t("modal.deleteTitle"),
                detail: t("modal.deleteDetail"),
                itemName: title,
                hint: t("modal.deleteHint"),
                confirmText: t("modal.delete"),
                confirmClass: "btn-danger",
                cancelText: t("modal.cancel")
            });
            if (!ok) return;
            
            try {
                await deleteDoc(doc(db, "items", id));
                showToast(t("toast.deleted"), "success");
                loadItems();
            } catch (err) {
                showToast(t("toast.error") + ": " + err.message, "danger");
            }
        });
    });

async function loadUsers() {
    const snapshot = await getDocs(collection(db, "users"));
    const users = [];
    snapshot.forEach((d) => users.push({ id: d.id, ...d.data() }));

    document.getElementById("statUsers").textContent = users.length;

    const tbody = document.getElementById("usersTableBody");
    tbody.innerHTML = "";

    users.forEach((u) => {
        const tr = document.createElement("tr");
        const roleBadge = u.role === "admin"
            ? '<span class="badge bg-warning text-dark">Admin</span>'
            : '<span class="badge bg-secondary">Student</span>';
        tr.innerHTML = `
            <td>${escapeHtml(u.fullName || "—")}</td>
            <td>${escapeHtml(u.matricId || "—")}</td>
            <td>${escapeHtml(u.email || "—")}</td>
            <td>${escapeHtml(u.phone || "—")}</td>
            <td>${roleBadge}</td>
        `;
        tbody.appendChild(tr);
    });
}
}
