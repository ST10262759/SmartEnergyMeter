const apiBase = localStorage.getItem("apiUrl")
    ?.replace("/EnergyMeter", "")
    || "https://smartenergymeterapi20251028114041-b0cthrd5cdh2egh3.southafricanorth-01.azurewebsites.net/api";

document.getElementById("registerBtn").addEventListener("click", async () => {
    const fullName = document.getElementById("fullName").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const deviceId = document.getElementById("deviceId").value.trim();

    const errorBox = document.getElementById("errorBox");
    const successBox = document.getElementById("successBox");

    errorBox.style.display = "none";
    successBox.style.display = "none";

    if (!fullName || !email || !password || !deviceId) {
        errorBox.textContent = "All fields are required.";
        errorBox.style.display = "block";
        return;
    }

    try {
        const res = await fetch(`${apiBase}/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fullName, email, password, deviceId })
        });

        const data = await res.json();

        if (!res.ok) {
            errorBox.textContent = data.message || "Registration failed.";
            errorBox.style.display = "block";
            return;
        }

        // Save device ID
        localStorage.setItem("deviceId", deviceId);

        successBox.textContent = "Registration successful. Redirecting to login...";
        successBox.style.display = "block";

        setTimeout(() => {
            // Redirect to login with pre-filled email
            window.location.href = `login.html?email=${encodeURIComponent(email)}`;
        }, 2000);

    } catch (err) {
        console.error(err);
        errorBox.textContent = "Server unreachable.";
        errorBox.style.display = "block";
    }
});

