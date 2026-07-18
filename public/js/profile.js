// ----- Achievements list (within Profile) -----

function renderAchievementList() {
    const list = document.getElementById('profile-ach-list');
    if (!list) {
        return;
    }

    list.innerHTML = '';

    const countEl = document.getElementById('ach-count');
    const totalEl = document.getElementById('ach-total');

    if (countEl) {
        countEl.textContent = player.unlockedAchievements.length;
    }
    if (totalEl) {
        totalEl.textContent = ACHIEVEMENTS.length;
    }

    for (const ach of ACHIEVEMENTS) {
        const unlocked = player.unlockedAchievements.includes(ach.id);

        const rewardText = unlocked ? `+${ach.reward} coins earned` : `+${ach.reward} coins reward`;

        const item = document.createElement('div');
        item.className = `ach-item${unlocked ? ' unlocked' : ''}`;

        item.innerHTML = `
      <div class="ach-icon">${ach.icon}</div>

      <div class="ach-info">
        <div class="ach-name">
          ${unlocked ? '' : '🔒 '}${ach.label}
        </div>

        <div class="ach-desc">
          ${ach.description}
        </div>

        ${ach.reward ? `<div class="ach-reward">🪙 ${rewardText}</div>` : ''}
      </div>

      ${unlocked ? '<div style="color:var(--green);font-size:1rem;">✓</div>' : ''}
    `;

        list.appendChild(item);
    }
}

// ----- Profile screen (simpler version) -----

function renderProfileScreen() {
    const avatar = _findAvatar(player.avatar) || { emoji: '🙂' };

    const winRate =
        player.stats.games > 0 ? Math.round((player.stats.wins / player.stats.games) * 100) : 0;

    const profileAvatar = document.getElementById('profile-av-lg');
    if (profileAvatar) {
        profileAvatar.textContent = avatar.emoji;
    }

    document.getElementById('profile-name-display').textContent = player.name || 'Guest';

    document.getElementById('profile-level-badge').textContent = `LEVEL ${player.level}`;

    document.getElementById('stat-wins').textContent = player.stats.wins;

    document.getElementById('stat-games').textContent = player.stats.games;

    document.getElementById('stat-rate').textContent = `${winRate}%`;

    document.getElementById('stat-draws').textContent = player.stats.draws;

    document.getElementById('stat-streak').textContent = player.stats.bestStreak;

    document.getElementById('stat-coins').textContent = player.coins;

    renderAchievementList();
}
