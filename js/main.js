import { db } from "./firebase-config.js";
import { setupNavbar } from "./auth-state.js";
import { collection, getDocs, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

setupNavbar();

async function loadRecentItems() {
    const container = document.getElementById("recentItemsContainer");
    if (!container) return;
    
    try {
       const q = query(collection(db, "items"), orderBy("createdAt", "desc"), limit(10));
        const snapshot = await getDocs(q);
        
        container.innerHTML = "";
        
        if (snapshot.empty) {
            container.innerHTML = `
                <div class="col-12 text-center py-4 text-muted">
                    <p>No items reported yet. Be the first to <a href="report-lost.html">report a lost item</a>!</p>
                </div>`;
            return;
        }
        
      let shown = 0;
        snapshot.forEach((doc) => {
            if (shown >= 3) return;
            const item = { id: doc.id, ...doc.data() };
            if (item.status === "resolved") return;
            shown++;
            const col = document.createElement("div");
            col.className = "col-md-4";
            
            const badgeClass = item.type === "lost" ? "bg-danger" : "bg-success";
            const badgeText = item.type === "lost" ? "Lost" : "Found";
            
         const photoBlock = item.photoUrl
                ? `<img src="${item.photoUrl}" class="card-img-top" style="height: 180px; object-fit: cover;" alt="">`
                : `<div class="card-img-top bg-light d-flex align-items-center justify-content-center" style="height: 180px;"><i class="bi bi-image text-muted" style="font-size: 2.5rem;"></i></div>`;

            col.innerHTML = `
                <div class="card h-100 shadow-sm" style="cursor: pointer;" onclick="window.location.href='item.html?id=${item.id}'">
                    ${photoBlock}
                    <div class="card-body">
                        <span class="badge ${badgeClass} mb-2">${badgeText}</span>
                        <h5 class="card-title">${escapeHtml(item.title)}</h5>
                        <p class="card-text text-muted small">
                            <i class="bi bi-geo-alt"></i> ${escapeHtml(item.location)} &middot;
                            <i class="bi bi-calendar"></i> ${item.date || "—"}
                        </p>
                    </div>
                </div>
            `;
            container.appendChild(col);
        });
    } catch (error) {
        console.error(error);
        container.innerHTML = '<div class="col-12 text-center text-muted">Failed to load.</div>';
    }
}

function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

loadRecentItems();
console.log("UKM Lost & Found loaded");