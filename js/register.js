import { auth, db } from "./firebase-config.js";
import { createUserWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const form = document.getElementById("registerForm");
const alertBox = document.getElementById("alertBox");
const registerBtn = document.getElementById("registerBtn");

function showAlert(message, type) {
    alertBox.className = `alert alert-${type}`;
    alertBox.textContent = message;
    alertBox.classList.remove("d-none");
}

form.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const fullName = document.getElementById("fullName").value.trim();
    const matricId = document.getElementById("matricId").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const phone = document.getElementById("phone").value.trim();
    
    registerBtn.disabled = true;
    registerBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Creating...';
    
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        await updateProfile(user, { displayName: fullName });
        
        await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            fullName: fullName,
            matricId: matricId,
            email: email,
            phone: phone,
            role: "student",
            createdAt: serverTimestamp()
        });
        
        showAlert("Account created successfully! Redirecting...", "success");
        
        setTimeout(() => {
            window.location.href = "index.html";
        }, 1500);
        
    } catch (error) {
        let message = "Registration failed. Please try again.";
        if (error.code === "auth/email-already-in-use") message = "This email is already registered.";
        if (error.code === "auth/weak-password") message = "Password is too weak.";
        if (error.code === "auth/invalid-email") message = "Invalid email format.";
        
        showAlert(message, "danger");
        registerBtn.disabled = false;
        registerBtn.textContent = "Sign Up";
    }
});