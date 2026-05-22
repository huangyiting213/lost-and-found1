import { db } from "./firebase-config.js";
import { setupNavbar, requireLogin } from "./auth-state.js";
import { initLangToggle, t } from "./i18n.js";
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

setupNavbar();
initLangToggle();

const currentUser = await requireLogin();

const loadingSpinner = document.getElementById("loadingSpinner");
const emptyState = document.getElementById("emptyState");
const postsContainer = document.getElementById("postsContainer");

function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

async function loadMyPosts() {
    try {
        const q = query(collection(db, "items"), where("userId", "==", currentUser.uid));
        const snapshot = await getDocs(q);

        const items = [];
        snapshot.forEach((d) => items.push({ id: d.id, ...d.data() }));

        items.sort((a, b) => {
            const ta = a.createdAt?.seconds || 0;
            const tb = b.createdAt?.seconds || 0;
            return tb - ta;
        });

        loadingSpinner.classList.add("d-none");

        if (items.length === 0) {
            emptyState.classList.remove("d-none");
            return;
        }

        items.forEach((item) => postsContainer.appendChild(createPostCard(item)));
    } catch (error) {
        console.error(error);
        loadingSpinner.classList.add("d-none");
        postsContainer.innerHTML = '<p class="text-danger">Failed to load posts.</p>';
    }
}

function createPostCard(item) {
    const col = document.createElement("div");
    col.className = "col-md-6 col-lg-4";

    const typeBadge = item.type === "lost"
        ? `<span class="badge bg-danger">${t("browse.lost")}</span>`
        : `<span class="badge bg-success">${t("browse.found")}</span>`;

    const isResolved = item.status === "resolved";
    const statusBadge = isResolved
        ? `<span class="badge bg-dark">${t("myposts.resolved")}</span>`
        : `<span class="badge bg-primary">${t("myposts.active")}</span>`;

    const photoHtml = item.photoUrl
        ? `<img src="${item.photoUrl}" class="card-img-top" style="height: 180px; object-fit: cover;" alt="">`
        : `<div class="card-img-top bg-light d-flex align-items-center justify-content-center" style="height: 180px;"><i class="bi bi-image text-muted" style="font-size: 2.5rem;"></i></div>`;

    col.innerHTML = `
        <div class="card h-100 shadow-sm ${isResolved ? "opacity-75" : ""}">
            ${photoHtml}
            <div class="card-body">
                <div class="mb-2">${typeBadge} ${statusBadge} <span class="badge bg-secondary">${escapeHtml(item.category)}</span></div>
                <h5 class="card-title">${escapeHtml(item.title)}</h5>
                <p class="card-text text-muted small mb-2"><i class="bi bi-geo-alt"></i> ${escapeHtml(item.location)} &middot; <i class="bi bi-calendar"></i> ${item.date || "—"}</p>
                <p class="card-text small">${escapeHtml((item.description || "").substring(0, 80))}${(item.description || "").length > 80 ? "..." : ""}</p>
            </div>
            <div class="card-footer bg-white border-0 d-flex gap-2">
                <a href="item.html?id=${item.id}" class="btn btn-sm btn-outline-primary flex-fill">${t("myposts.view")}</a>
                <button class="btn btn-sm btn-outline-success flex-fill toggle-resolve" data-id="${item.id}" data-status="${item.status}">
                    ${isResolved ? t("myposts.reopen") : t("myposts.markResolved")}
                </button>
                <button class="btn btn-sm btn-outline-danger delete-post" data-id="${item.id}" data-title="${escapeHtml(item.title)}">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        </div>
    `;

    col.querySelector(".toggle-resolve").addEventListener("click", async (e) => {
        const id = e.target.dataset.id;
        const current = e.target.dataset.status;
        const newStatus = current === "resolved" ? "open" : "resolved";
        try {
            await updateDoc(doc(db, "items", id), { status: newStatus });
            location.reload();
        } catch (err) {
            alert("Failed to update status: " + err.message);
        }
    });

    col.querySelector(".delete-post").addEventListener("click", async (e) => {
        const btn = e.target.closest(".delete-post");
        const id = btn.dataset.id;
        const title = btn.dataset.title;
        if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
        try {
            await deleteDoc(doc(db, "items", id));
            location.reload();
        } catch (err) {
            alert("Failed to delete: " + err.message);
        }
    });

    return col;
}

loadMyPosts();