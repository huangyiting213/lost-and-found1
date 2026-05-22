import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAPhyjl1zhGZ7pG1k2Suhm8d_vuJLzCGNo",
  authDomain: "ukm-lost-and-found.firebaseapp.com",
  projectId: "ukm-lost-and-found",
  storageBucket: "ukm-lost-and-found.firebasestorage.app",
  messagingSenderId: "331844567910",
  appId: "1:331844567910:web:13b748e7f07d9cb527fea7"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const GEMINI_API_KEY = "AIzaSyAX34zkZqy8r13hdWLfeu6JDIMe7w5ERas";