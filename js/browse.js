import { db } from "./firebase-config.js";
import { setupNavbar } from "./auth-state.js";
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

setupNavbar();

const itemsContainer = document.getElementById("itemsContainer");
const loadingSpinner = document.getElementById("loadingSpinner");
const emptyState = document.getElementById("emptyState");
const resultsCount = document.getElementById("resultsCount");
const searchInput = document.getElementById("searchInput");
const filterType = document.getElementById("filterType");
const filterCategory = document.getElementById("filterCategory");
const filterSort = document.getElementById("filterSort");

let allItems = [];

async function loadItems() {
    try {
        const q = query(collection(db, "items"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        
        allItems = [];
        snapshot.forEach((doc) => {
            allItems.push({ id: doc.id, ...doc.data() });
        });
        
        loadingSpinner.classList.add("d-none");
        applyFilters();
    } catch (error) {
        console.error("Error loading items:", error);
        loadingSpinner.classList.add("d-none");
        resultsCount.textContent = "Error loading items. Check your connection.";
    }
}

function applyFilters() {
    const keyword = searchInput.value.trim().toLowerCase();
    const typeVal = filterType.value;
    const categoryVal = filterCategory.value;
    const sortVal = filterSort.value;
    
 let filtered = allItems.filter((item) => {
        if (item.status === "resolved") return false;
        if (typeVal !== "all" && item.type !== typeVal) return false;
        if (categoryVal !== "all" && item.category !== categoryVal) return false;
        if (keyword) {
            const haystack = `${item.title} ${item.description} ${item.location}`.toLowerCase();
            if (!haystack.includes(keyword)) return false;
        }
        return true;
    });
    
    if (sortVal === "oldest") filtered.reverse();
    
    renderItems(filtered);
}

function renderItems(items) {
    itemsContainer.innerHTML = "";
    
    if (items.length === 0) {
        emptyState.classList.remove("d-none");
        resultsCount.textContent = "0 items";
        return;
    }
    
    emptyState.classList.add("d-none");
    resultsCount.textContent = `${items.length} item${items.length > 1 ? "s" : ""} found`;
    
    items.forEach((item) => {
        const card = createCard(item);
        itemsContainer.appendChild(card);
    });
}

function createCard(item) {
    const col = document.createElement("div");
    col.className = "col-md-6 col-lg-4";
    
    const badgeClass = item.type === "lost" ? "bg-danger" : "bg-success";
    const badgeText = item.type === "lost" ? "Lost" : "Found";
    
    const photoHtml = item.photoUrl
        ? `<img src="${item.photoUrl}" class="card-img-top" style="height: 200px; object-fit: cover;" alt="${escapeHtml(item.title)}">`
        : `<div class="card-img-top bg-light d-flex align-items-center justify-content-center" style="height: 200px;">
             <i class="bi bi-image text-muted" style="font-size: 3rem;"></i>
           </div>`;
    
    const dateText = item.date || "—";
    
    col.innerHTML = `
        <div class="card h-100 shadow-sm item-card" data-id="${item.id}" style="cursor: pointer;">
            ${photoHtml}
            <div class="card-body">
                <span class="badge ${badgeClass} mb-2">${badgeText}</span>
                <span class="badge bg-secondary mb-2">${escapeHtml(item.category)}</span>
                <h5 class="card-title">${escapeHtml(item.title)}</h5>
                <p class="card-text text-muted small mb-2">
                    <i class="bi bi-geo-alt"></i> ${escapeHtml(item.location)} &middot;
                    <i class="bi bi-calendar"></i> ${dateText}
                </p>
                <p class="card-text">${escapeHtml(truncate(item.description, 100))}</p>
            </div>
            <div class="card-footer bg-white border-0 pt-0">
                <small class="text-muted">
                    <i class="bi bi-person"></i> Posted by ${escapeHtml(item.userName || "User")}
                </small>
            </div>
        </div>
    `;
    
    col.querySelector(".item-card").addEventListener("click", () => {
        window.location.href = `item.html?id=${item.id}`;
    });
    
    return col;
}

function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

function truncate(text, max) {
    if (!text) return "";
    return text.length > max ? text.substring(0, max) + "..." : text;
}

let searchTimeout;
searchInput.addEventListener("input", () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(applyFilters, 300);
});

filterType.addEventListener("change", applyFilters);
filterCategory.addEventListener("change", applyFilters);
filterSort.addEventListener("change", applyFilters);

loadItems();