function showLoading() {
    document.getElementById('loading-screen').style.display = 'flex';
    document.getElementById('sAuth').style.display = 'none';
    document.getElementById('app').style.display = 'none';
}

function showAuth() {
    document.getElementById('loading-screen').style.display = 'none';
    document.getElementById('sAuth').style.display = 'flex';
    document.getElementById('app').style.display = 'none';
}

function showGame() {
    document.getElementById('loading-screen').style.display = 'none';
    document.getElementById('sAuth').style.display = 'none';
    document.getElementById('app').style.display = 'block';

    // Open the Lobby by default
    navTo('sLobby');

    // Make sure the lobby updates
    refreshLobbyView();
}
