
// ----- Daily reward modal -----

function showDailyRewardModal() {
  const pendingStreak = player.dailyStreak + 1;
  const coins = getDailyRewardCoins(pendingStreak);
  const streakNum = document.getElementById("daily-streak-num");
  const coinsAmount = document.getElementById("daily-coins-amount");

  if (streakNum) streakNum.textContent = pendingStreak;
  if (coinsAmount) coinsAmount.textContent = coins;

  // Render the 7-day week dots
  const weekContainer = document.getElementById('daily-week-dots');
  if (!weekContainer) return;
  weekContainer.innerHTML = '';


  for (let i = 0; i < 7; i++) {
    const dot = document.createElement('div');
    const isDone  = i < pendingStreak - 1;
    const isToday = i === pendingStreak - 1;
    dot.className   = `day-dot${isDone ? ' done' : isToday ? ' today' : ''}`;
    dot.textContent = i + 1;
    weekContainer.appendChild(dot);
  }

  document.getElementById('daily-modal').style.display = 'flex';
}

function handleClaimDaily() {
    claimDailyReward();

    const modal = document.getElementById("daily-modal");

    if (modal) {
        modal.style.display = "none";
    }
}