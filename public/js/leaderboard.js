// ----- Global leaderboard -----

function renderGlobalLeaderboard(sortKey = 'wins') {
  // Update current player's latest stats
  syncToGlobalLeaderboard();

  const sorted = [...globalLeaderboard].sort((a, b) => {
    if (sortKey === 'xp') {
      return (b.xp - a.xp) || (b.wins - a.wins);
    }

    if (sortKey === 'games') {
      return (b.games - a.games) || (b.wins - a.wins);
    }

    return (b.wins - a.wins) || (b.xp - a.xp);
  });

  const container = document.getElementById('global-lbody');
  if (!container) return;

  container.innerHTML = '';

  if (!sorted.length) {
    container.innerHTML =
      '<div class="lb-empty">No players yet. Play some games!</div>';
    return;
  }

  sorted.slice(0, 20).forEach((entry, index) => {
    const avatar = _findAvatar(entry.avatar) || { emoji: '🙂' };

    const row = document.createElement('div');

    const medals = ['gold', 'silver', 'bronze'];
    row.className = `lb-row ${medals[index] || ''}`.trim();

    const rankLabel = index < 3
      ? ['🥇', '🥈', '🥉'][index]
      : index + 1;

    const isSelf = player && entry.name === player.name;

    row.innerHTML = `
      <div class="lb-rank">${rankLabel}</div>

      <div class="lb-name">
        <span class="lb-av">${avatar.emoji}</span>
        ${entry.name}${isSelf ? ' ★' : ''}
      </div>

      <div class="lb-stat wins">${entry.wins}</div>
      <div class="lb-stat draws">${entry.games}</div>
      <div class="lb-stat xp">${entry.xp}</div>
    `;

    container.appendChild(row);
  });
}

function switchLeaderboardTab(sortKey, buttonEl) {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });

  buttonEl.classList.add('active');
  renderGlobalLeaderboard(sortKey);
}