import { db } from "./firebase-config.js";
import { setupNavbar } from "./auth-state.js";
import { doc, getDoc, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { initLangToggle, t } from "./i18n.js";

setupNavbar();
initLangToggle();

const params = new URLSearchParams(window.location.search);
const itemId = params.get("id");

const loadingSpinner = document.getElementById("loadingSpinner");
const notFound = document.getElementById("notFound");
const itemDetail = document.getElementById("itemDetail");

function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

async function loadItem() {
    if (!itemId) {
        showNotFound();
        return;
    }
    try {
        const itemSnap = await getDoc(doc(db, "items", itemId));
        if (!itemSnap.exists()) {
            showNotFound();
            return;
        }
        const item = { id: itemSnap.id, ...itemSnap.data() };
        renderItem(item);
        loadingSpinner.classList.add("d-none");
        itemDetail.classList.remove("d-none");
        runAiMatching(item);
    } catch (error) {
        console.error(error);
        showNotFound();
    }
}

function showNotFound() {
    loadingSpinner.classList.add("d-none");
    notFound.classList.remove("d-none");
}

function renderItem(item) {
    const imageContainer = document.getElementById("imageContainer");
    if (item.photoUrl) {
        imageContainer.innerHTML = `<img src="${item.photoUrl}" class="img-fluid w-100" style="max-height: 500px; object-fit: contain;" alt="${escapeHtml(item.title)}">`;
    } else {
        imageContainer.innerHTML = `<div class="d-flex align-items-center justify-content-center" style="height: 350px;">
            <div class="text-center text-muted"><i class="bi bi-image" style="font-size: 4rem;"></i><p>No photo provided</p></div>
        </div>`;
    }

    const typeBadge = document.getElementById("typeBadge");
    if (item.type === "lost") {
        typeBadge.className = "badge bg-danger fs-6";
        typeBadge.textContent = t("browse.lost");
    } else {
        typeBadge.className = "badge bg-success fs-6";
        typeBadge.textContent = t("browse.found");
    }

    document.getElementById("categoryBadge").textContent = item.category;

    const statusBadge = document.getElementById("statusBadge");
    if (item.status === "resolved") {
        statusBadge.className = "badge bg-dark fs-6";
       statusBadge.textContent = t("item.resolved");
    } else {
        statusBadge.classList.add("d-none");
    }

    document.getElementById("itemTitle").textContent = item.title;
    document.getElementById("itemLocation").textContent = item.location;
    document.getElementById("itemDate").textContent = item.date || "—";
    document.getElementById("itemPoster").textContent = item.userName || "Anonymous";
    document.getElementById("itemDescription").textContent = item.description;

    const contactBtn = document.getElementById("contactBtn");
    const contactInfo = document.getElementById("contactInfo");
    contactBtn.addEventListener("click", () => {
        document.getElementById("contactEmail").textContent = item.userEmail || "Not provided";
        document.getElementById("contactPhone").textContent = item.userPhone || "Not provided";
        const emailLink = document.getElementById("emailLink");
        emailLink.href = `mailto:${item.userEmail}?subject=Regarding your ${item.type} item: ${encodeURIComponent(item.title)}`;
        contactInfo.classList.remove("d-none");
        contactBtn.classList.add("d-none");
    });
}

async function runAiMatching(item) {
    const aiSection = document.getElementById("aiMatchSection");
    const aiLoading = document.getElementById("aiLoading");
    const aiResults = document.getElementById("aiResults");
    const aiNoMatch = document.getElementById("aiNoMatch");

    aiSection.classList.remove("d-none");

    const oppositeType = item.type === "lost" ? "found" : "lost";
    console.log("🔎 [Match] This item type:", item.type, "→ looking for:", oppositeType);

    try {
        console.log("🔎 [Match] Querying Firestore...");
        const q = query(collection(db, "items"), where("type", "==", oppositeType));
        const snapshot = await getDocs(q);
        console.log("🔎 [Match] Got", snapshot.size, "candidates from Firestore");

        const candidates = [];
        snapshot.forEach((d) => {
            const docData = d.data();
            if (docData.status !== "resolved") {
                candidates.push({ id: d.id, ...docData });
            }
        });
        console.log("🔎 [Match] After filtering resolved:", candidates.length, "candidates");

        if (candidates.length === 0) {
            aiLoading.classList.add("d-none");
            aiNoMatch.classList.remove("d-none");
            return;
        }

        const matches = await askGemini(item, candidates);
        aiLoading.classList.add("d-none");

        if (!matches || matches.length === 0) {
            aiNoMatch.classList.remove("d-none");
            return;
        }

        matches.forEach((match) => {
            const candidate = candidates.find((c) => c.id === match.id);
            if (!candidate) return;
            aiResults.appendChild(createMatchCard(candidate, match.score, match.reason));
        });

        if (aiResults.children.length === 0) {
            aiNoMatch.classList.remove("d-none");
        }
    } catch (error) {
        console.error("AI matching error:", error);
        aiLoading.classList.add("d-none");
        aiNoMatch.classList.remove("d-none");
    }
}

async function askGemini(targetItem, candidates) {
    const candidateList = candidates.map((c, i) =>
        `${i + 1}. ID: ${c.id}\n   Title: ${c.title}\n   Category: ${c.category}\n   Description: ${c.description}\n   Location: ${c.location}`
    ).join("\n\n");

    const prompt = `You are a lost-and-found matching assistant. A user has a ${targetItem.type} item:
Title: ${targetItem.title}
Category: ${targetItem.category}
Description: ${targetItem.description}
Location: ${targetItem.location}

Here are ${candidates.length} ${candidates[0].type} items that might match:

${candidateList}

Analyze which items are likely to be the same physical object. Consider category, description details (color, brand, features), and location proximity.

Return ONLY a valid JSON array (no markdown, no code fences) of matches with a similarity score (0-100) and a short reason. Only include items with score >= 40. Format:
[{"id": "abc123", "score": 85, "reason": "Same category and matching brand/color"}]

If no good matches, return [].`;

 console.log("🤖 [AI] Sending request to backend proxy...");

    const response = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt })
    });

    console.log("🤖 [AI] Response status:", response.status);

    const result = await response.json();
    console.log("🤖 [AI] Full response:", result);

    if (!result.candidates || !result.candidates[0]) {
        console.error("Gemini returned no candidates:", result);
        return [];
    }

    let text = result.candidates[0].content.parts[0].text.trim();
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    try {
        const parsed = JSON.parse(text);
        return parsed.sort((a, b) => b.score - a.score).slice(0, 3);
    } catch (e) {
        console.error("Failed to parse Gemini JSON:", text);
        return [];
    }
}

function createMatchCard(item, score, reason) {
    const col = document.createElement("div");
    col.className = "col-md-4";

    const scoreColor = score >= 75 ? "success" : score >= 55 ? "warning" : "secondary";

    col.innerHTML = `
        <div class="card h-100 border-${scoreColor}" style="cursor: pointer;" onclick="window.location.href='item.html?id=${item.id}'">
            ${item.photoUrl ? `<img src="${item.photoUrl}" class="card-img-top" style="height: 150px; object-fit: cover;" alt="">` : ""}
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <span class="badge bg-${scoreColor}">${score}% ${t("item.match")}</span>
                    <span class="badge bg-secondary">${escapeHtml(item.category)}</span>
                </div>
                <h6 class="card-title">${escapeHtml(item.title)}</h6>
                <p class="card-text small text-muted mb-2"><i class="bi bi-geo-alt"></i> ${escapeHtml(item.location)}</p>
                <p class="card-text small fst-italic">"${escapeHtml(reason)}"</p>
            </div>
        </div>
    `;
    return col;
}

loadItem();