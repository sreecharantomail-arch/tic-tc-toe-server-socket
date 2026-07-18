// ----- Theme shop -----

function renderShop() {
    const grid = document.getElementById('shop-grid');
    if (!grid) {
        return;
    }

    grid.innerHTML = '';

    const coinsEl = document.getElementById('shop-coins');
    if (coinsEl) {
        coinsEl.textContent = player.coins;
    }

    for (const theme of THEMES) {
        const owned = player.unlockedThemes.includes(theme.id);
        const active = player.activeTheme === theme.id;

        const el = document.createElement('div');
        el.className = `shop-item${active ? ' active-theme' : ''}${!owned ? ' locked-item' : ''}`;

        el.innerHTML = `
      <div class="theme-preview" style="background:${theme.bg}">
        <div class="tp-dot" style="background:${theme.accent1}"></div>
        <div class="tp-dot" style="background:${theme.accent2}"></div>
        <div class="tp-dot" style="background:#ffe066"></div>
      </div>

      <div class="shop-name">${theme.label}</div>

      ${
          active
              ? '<div class="shop-owned">✓ Active</div>'
              : owned
                ? '<div class="shop-owned">Owned</div>'
                : `<div class="shop-price"><span>🪙</span>${theme.cost}</div>`
      }

      ${!owned ? '<div class="shop-lock-badge">LOCKED</div>' : ''}
    `;

        el.addEventListener('click', () => _onThemeClick(theme));

        grid.appendChild(el);
    }
}

function _onThemeClick(theme) {
    const owned = player.unlockedThemes.includes(theme.id);

    // Buy theme
    if (!owned) {
        if (player.coins < theme.cost) {
            showXpNotification(`Need ${theme.cost} 🪙`);
            return;
        }

        player.coins -= theme.cost;

        if (!player.unlockedThemes.includes(theme.id)) {
            player.unlockedThemes.push(theme.id);
        }

        updateHud();
        applyTheme(theme.id);
        renderShop();
        saveGameData();

        return;
    }

    // Already active
    if (player.activeTheme === theme.id) {
        return;
    }

    applyTheme(theme.id);
    renderShop();
}

//------- Shop Tabs----------

// ----- Shop Tabs -----

function showShopTab(tab) {
    const themeGrid = document.getElementById('shop-grid');
    const avatarGrid = document.getElementById('avatar-grid-shop');

    const themeTab = document.getElementById('theme-tab');
    const avatarTab = document.getElementById('avatar-tab');

    if (tab === 'themes') {
        themeGrid.style.display = 'grid';
        avatarGrid.style.display = 'none';

        themeTab.classList.add('active');
        avatarTab.classList.remove('active');

        renderShop();
    } else {
        themeGrid.style.display = 'none';
        avatarGrid.style.display = 'grid';

        themeTab.classList.remove('active');
        avatarTab.classList.add('active');

        renderAvatarShop();
    }
}
// ----- Avatar Shop -----

function renderAvatarShop() {
    const grid = document.getElementById('avatar-grid-shop');

    if (!grid) {
        return;
    }

    grid.innerHTML = '';

    for (const av of AVATARS) {
        const owned = player.unlockedAvatars.includes(av.id);
        const selected = player.avatar === av.id;

        const card = document.createElement('div');

        card.className = `shop-item ${selected ? 'active-theme' : ''}`;

        card.innerHTML = `
      <div style="font-size:48px;margin-bottom:10px;">
        ${av.emoji}
      </div>

      <div class="shop-name">
        ${av.label}
      </div>

      ${
          selected
              ? '<div class="shop-owned">✓ Selected</div>'
              : owned
                ? '<div class="shop-owned">Owned</div>'
                : `<div class="shop-price">🪙 ${av.cost}</div>`
      }
    `;

        card.onclick = () => _onAvatarClick(av);

        grid.appendChild(card);
    }
}
