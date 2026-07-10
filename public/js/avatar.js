// ----- Avatar grid -----

function renderAvatarGrid() {
    const grid = document.getElementById("avatar-grid");
    if (!grid) return;

    grid.innerHTML = "";

    for (const av of AVATARS) {
        const owned = player.unlockedAvatars.includes(av.id);
        const selected = player.avatar === av.id;

        const el = document.createElement("div");
        el.className = `av-option${selected ? " selected" : ""}${!owned && av.cost > 0 ? " locked" : ""}`;
        el.title = owned ? av.label : `${av.label} — 🪙 ${av.cost}`;
        el.textContent = av.emoji;

        el.addEventListener("click", () => _onAvatarClick(av));

        grid.appendChild(el);
    }
}

function _onAvatarClick(av) {
    const owned = player.unlockedAvatars.includes(av.id);
    const profileAv = document.getElementById("profile-av-lg");

    // Buy avatar if not owned
    if (!owned && av.cost > 0) {

        if (player.coins < av.cost) {
            showXpNotification(`You need ${av.cost} 🪙 to unlock this avatar.`);
            return;
        }

        player.coins -= av.cost;

        if (!player.unlockedAvatars.includes(av.id)) {
            player.unlockedAvatars.push(av.id);
        }

        player.avatar = av.id;

        sfxCoin();
        saveGameData();
        updateHud();

        renderAvatarGrid();

        if (typeof renderAvatarShop === "function") {
            renderAvatarShop();
        }

        if (profileAv) {
            profileAv.textContent = av.emoji;
        }

        return;
    }

    // Avatar already owned → select it
    player.avatar = av.id;

    sfxClick();
    saveGameData();
    updateHud();

    renderAvatarGrid();

    if (typeof renderAvatarShop === "function") {
        renderAvatarShop();
    }

    if (profileAv) {
        profileAv.textContent = av.emoji;
    }
}