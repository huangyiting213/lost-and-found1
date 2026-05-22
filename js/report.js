import { auth, db } from "./firebase-config.js";
import { setupNavbar, requireLogin } from "./auth-state.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { initLangToggle } from "./i18n.js";

const IMGBB_API_KEY = "b5ef66d00673c41175a802f8d7ee0f11";

setupNavbar();
initLangToggle();

const currentUser = await requireLogin();

const isLostPage = window.location.pathname.includes("report-lost");
const itemType = isLostPage ? "lost" : "found";

const form = document.getElementById("reportForm");
const alertBox = document.getElementById("alertBox");
const submitBtn = document.getElementById("submitBtn");
const photoInput = document.getElementById("photo");
const photoPreview = document.getElementById("photoPreview");

const dateInput = document.getElementById("date");
dateInput.max = new Date().toISOString().split("T")[0];

photoInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) {
        photoPreview.classList.add("d-none");
        return;
    }
    if (file.size > 5 * 1024 * 1024) {
        showAlert("Photo is too large. Please choose a file under 5 MB.", "warning");
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

function showAlert(message, type) {
    alertBox.className = `alert alert-${type}`;
    alertBox.textContent = message;
    alertBox.classList.remove("d-none");
    window.scrollTo({ top: 0, behavior: "smooth" });
}

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
    
    const title = document.getElementById("title").value.trim();
    const category = document.getElementById("category").value;
    const description = document.getElementById("description").value.trim();
    const location = document.getElementById("location").value.trim();
    const date = document.getElementById("date").value;
    const photoFile = photoInput.files[0];
    
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Submitting...';
    
    try {
        let photoUrl = "";
        if (photoFile) {
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Uploading photo...';
            photoUrl = await uploadToImgbb(photoFile);
        }
        
        const userDocSnap = await getDoc(doc(db, "users", currentUser.uid));
        const userData = userDocSnap.exists() ? userDocSnap.data() : {};
        
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Saving...';
        
        await addDoc(collection(db, "items"), {
            type: itemType,
            title: title,
            category: category,
            description: description,
            location: location,
            date: date,
            photoUrl: photoUrl,
            status: "open",
            userId: currentUser.uid,
            userName: userData.fullName || "Unknown",
            userEmail: currentUser.email,
            userPhone: userData.phone || "",
            createdAt: serverTimestamp()
        });
        
        showAlert("✅ Report submitted successfully! Redirecting...", "success");
        setTimeout(() => {
            window.location.href = "browse.html";
        }, 1500);
        
    } catch (error) {
        console.error(error);
        showAlert("Submission failed: " + error.message, "danger");
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="bi bi-send"></i> Submit Report';
    }
});