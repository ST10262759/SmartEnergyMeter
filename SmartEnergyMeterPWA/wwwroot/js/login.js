const apiBase = localStorage.getItem("apiUrl")
    ?.replace("/EnergyMeter", "")
    || "https://smartenergymeterapi20251028114041-b0cthrd5cdh2egh3.southafricanorth-01.azurewebsites.net/api";

const loginBtn = document.getElementById("loginBtn");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const rememberMe = document.getElementById("rememberMe");
const errorBox = document.getElementById("errorBox");

window.addEventListener('DOMContentLoaded', () => {
    const rememberedEmail = localStorage.getItem("rememberedEmail");
    if (rememberedEmail) {
        emailInput.value = rememberedEmail;
        rememberMe.checked = true;
    }

    const token = localStorage.getItem("token");
    if (token) {
        // Optionally validate token with API here before redirect
        window.location.href = "index.html";
    }
});

loginBtn.addEventListener("click", async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    errorBox.style.display = "none";

    if (!email || !password) {
        errorBox.textContent = "Email and password are required.";
        errorBox.style.display = "block";
        return;
    }

    try {
        const res = await fetch(`${apiBase}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (!res.ok) {
            errorBox.textContent = data.message || "Login failed.";
            errorBox.style.display = "block";
            return;
        }

        // Save session data
        sessionStorage.setItem("isLoggedIn", "true");
        sessionStorage.setItem("username", email);
        sessionStorage.setItem("token", data.token);

        if (data.user) {
            sessionStorage.setItem("userId", data.user.id);
            sessionStorage.setItem("fullName", data.user.fullName);
            sessionStorage.setItem("deviceId", data.user.deviceId);
        }

        if (rememberMe.checked) {
            localStorage.setItem("rememberedEmail", email);
            localStorage.setItem("token", data.token);
        } else {
            localStorage.removeItem("rememberedEmail");
            localStorage.removeItem("token");
        }

        window.location.href = "index.html";

    } catch (err) {
        console.error(err);
        errorBox.textContent = "Server unreachable.";
        errorBox.style.display = "block";
    }
});
