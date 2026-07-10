function showToastNotification(ach) {
  const popup = document.createElement('div');
  popup.className = 'ach-popup';

  const iconDiv = document.createElement('div');
  iconDiv.className = 'ach-popup-icon';
  iconDiv.textContent = ach.icon;
  
  const titleDiv = document.createElement('div');
  titleDiv.className = 'ach-popup-title';
  titleDiv.textContent = ach.label;
  
  const descDiv = document.createElement('div');
  descDiv.style.color = 'var(--text2)';
  descDiv.style.fontSize = '.72rem';
  descDiv.textContent = ach.description;
  
  const textDiv = document.createElement('div');
  textDiv.className = 'ach-popup-text';
  textDiv.appendChild(titleDiv);
  textDiv.appendChild(descDiv);
  
  popup.appendChild(iconDiv);
  popup.appendChild(textDiv);

  document.getElementById('ach-popup-container').appendChild(popup);

  setTimeout(() => {
    popup.classList.add('fade-out');
  }, 3000);

  setTimeout(() => {
    popup.remove();
  }, 3400);
}

function showXpNotification(text) {
  const el = document.createElement('div');
  el.className = 'xp-notif';
  el.textContent = text;

  document.body.appendChild(el);

  setTimeout(() => {
    el.classList.add('fade-out');
  }, 900);

  setTimeout(() => {
    el.remove();
  }, 1200);
}