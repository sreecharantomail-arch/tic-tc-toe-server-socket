document.addEventListener("DOMContentLoaded", () => {

    const loginView = document.getElementById("login-view");
    const registerView = document.getElementById("register-view");

    const showRegister = document.getElementById("show-register");
    const backLogin = document.getElementById("back-login");

    if (showRegister) {
        showRegister.addEventListener("click", () => {
            loginView.style.display = "none";
            registerView.style.display = "block";
        });
    }

    if (backLogin) {
        backLogin.addEventListener("click", () => {
            registerView.style.display = "none";
            loginView.style.display = "block";
        });
    }

    const loginBtn = document.getElementById("login-btn");
    if (loginBtn) {
        loginBtn.addEventListener("click", loginPlayer);
    }
});

// =========================================
// LOGIN PLAYER
// =========================================

async function loginPlayer() {
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;

    if (!email || !password) {
        alert("Please enter both email and password.");
        return;
    }

    try {
        const response = await safeFetch(`${API_BASE_URL}/auth/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (!data.success) {
            showErrorNotification('Login Failed', data.message || 'Your email or password is incorrect.', 'warning', 3000);
            return;
        }

        localStorage.setItem("nexa_token", data.token);

        if (typeof player !== "undefined" && data.user) {
            player.name = data.user.username || player.name;
            player.avatar = data.user.avatar || player.avatar;
            player.activeTheme = data.user.activeTheme || player.activeTheme;
            player.coins = data.user.coins ?? player.coins;
            player.xp = data.user.xp ?? player.xp;
            player.level = data.user.level ?? player.level;
            saveGameData();
        }

        showGame();
    } catch (err) {
        logError('Login error', ERROR_LEVELS.ERROR, err);
    }
}

// =========================================
// REGISTER PLAYER
// =========================================

async function registerPlayer() {

    const username = document.getElementById("register-username").value.trim();
    const email = document.getElementById("register-email").value.trim();
    const password = document.getElementById("register-password").value;
    const confirmPassword = document.getElementById("register-confirm-password").value;

    if (!username || !email || !password || !confirmPassword) {

        alert("Please fill all fields.");
        return;

    }

    if (password !== confirmPassword) {

        alert("Passwords do not match.");
        return;

    }

    try {

        const response = await safeFetch(`${API_BASE_URL}/auth/register`, {

            method: "POST",

            headers: {

                "Content-Type": "application/json"

            },

            body: JSON.stringify({

                username,
                email,
                password

            })

        });

        const data = await response.json();

        if (data.success) {
            localStorage.setItem("nexa_token", data.token);

            if (typeof player !== "undefined" && data.user) {
                player.name = data.user.username || player.name;
                player.avatar = data.user.avatar || player.avatar;
                player.activeTheme = data.user.activeTheme || player.activeTheme;
                player.coins = data.user.coins ?? player.coins;
                player.xp = data.user.xp ?? player.xp;
                player.level = data.user.level ?? player.level;
                saveGameData();
            }

            showGame();
            return;
        } else {

            showErrorNotification('Registration Failed', data.message || 'Unable to create account.', 'warning', 3000);

        }

    } catch (err) {

        logError('Registration error', ERROR_LEVELS.ERROR, err);

    }

}

function logoutPlayer() {

    localStorage.removeItem("nexa_token");

    player = structuredClone(DEFAULT_PLAYER);

    saveGameData();

    showAuth();

}