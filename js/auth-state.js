import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export function setupNavbar() {
    onAuthStateChanged(auth, async (user) => {
        const guestMenu = document.getElementById("guestMenu");
        const userMenu = document.getElementById("userMenu");
        const userNameDisplay = document.getElementById("userNameDisplay");

        if (user) {
            if (guestMenu) guestMenu.classList.add("d-none");
            if (userMenu) userMenu.classList.remove("d-none");

           const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                if (userNameDisplay) {
                    userNameDisplay.textContent = userData.fullName || user.email;
                }
                const adminLink = document.getElementById("adminLink");
                if (adminLink && userData.role === "admin") {
                    adminLink.classList.remove("d-none");
                }
            }
        } else {
            if (guestMenu) guestMenu.classList.remove("d-none");
            if (userMenu) userMenu.classList.add("d-none");
        }
    });

    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            await signOut(auth);
            window.location.href = "index.html";
        });
    }
}

export function requireLogin() {
    return new Promise((resolve) => {
        onAuthStateChanged(auth, (user) => {
            if (!user) {
                window.location.href = "login.html";
            } else {
                resolve(user);
            }
        });
    });
}