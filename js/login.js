import { auth } from "./firebase-config.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { initLangToggle } from "./i18n.js";

initLangToggle();

const form = document.getElementById("loginForm");
const alertBox = document.getElementById("alertBox");
const loginBtn = document.getElementById("loginBtn");

function showAlert(message, type) {
    alertBox.className = `alert alert-${type}`;
    alertBox.textContent = message;
    alertBox.classList.remove("d-none");
}

form.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Logging in...';
    
    try {
        await signInWithEmailAndPassword(auth, email, password);
        showAlert("Login successful! Redirecting...", "success");
        
        setTimeout(() => {
            window.location.href = "index.html";
        }, 1000);
        
    } catch (error) {
        let message = "Login failed. Please check your credentials.";
        if (error.code === "auth/invalid-credential") message = "Wrong email or password.";
        if (error.code === "auth/user-not-found") message = "No account found with this email.";
        if (error.code === "auth/too-many-requests") message = "Too many attempts. Try again later.";
        
        showAlert(message, "danger");
        loginBtn.disabled = false;
        loginBtn.textContent = "Login";
    }
});