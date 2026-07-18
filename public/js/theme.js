// ----- Theme engine -----

function applyTheme(id, silent = false) {
    player.activeTheme = id;

    document.body.className = id === 'dark' ? '' : `theme-${id}`;

    const selectEl = document.getElementById('theme-select');
    if (selectEl) {
        selectEl.value = id;
    }

    if (!silent) {
        saveGameData();
    }
}
