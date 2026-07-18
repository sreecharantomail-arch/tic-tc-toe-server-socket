/**
 * Button audit — clicks every interactive element on every screen and
 * records console errors, CSP violations, and unresponsive buttons.
 */
import puppeteer from 'puppeteer-core';

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const URL = 'http://localhost:3000';

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: 'new',
  args: ['--no-sandbox'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1366, height: 768 });

const errors = [];
page.on('console', msg => {
  if (msg.type() === 'error') errors.push(`[console.error] ${msg.text()}`);
});
page.on('pageerror', err => errors.push(`[pageerror] ${err.message}`));
// auto-dismiss confirm()/alert() so blocking dialogs can't hang the audit
page.on('dialog', async d => {
  console.log(`[dialog] ${d.type()}: ${d.message()} (dismissed)`);
  await d.dismiss();
});

await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 });
// wait for loading screen to finish
await page.waitForFunction(
  () => {
    const ls = document.getElementById('loading-screen');
    return !ls || ls.style.display === 'none' || ls.classList.contains('hidden');
  },
  { timeout: 15000 }
).catch(() => errors.push('[boot] loading screen never finished'));
await new Promise(r => setTimeout(r, 1000));

const state = await page.evaluate(() => ({
  authVisible: getComputedStyle(document.getElementById('sAuth')).display !== 'none',
  appVisible: getComputedStyle(document.getElementById('app')).display !== 'none',
}));
console.log('BOOT STATE:', JSON.stringify(state));

// ---- Auth screen buttons ----
if (state.authVisible) {
  // show-register → register view appears
  await page.click('#show-register');
  await new Promise(r => setTimeout(r, 300));
  let regVisible = await page.evaluate(
    () => document.getElementById('register-view').style.display !== 'none'
  );
  console.log('show-register works:', regVisible);

  await page.click('#back-login');
  await new Promise(r => setTimeout(r, 300));
  let loginVisible = await page.evaluate(
    () => document.getElementById('login-view').style.display !== 'none'
  );
  console.log('back-login works:', loginVisible);

  // Skip auth by simulating token + reload so we can audit the app screens
  await page.evaluate(() => localStorage.setItem('nexa_token', 'audit-token'));
  await page.goto(URL, { waitUntil: 'networkidle2' });
  await page.waitForFunction(
    () => {
      const ls = document.getElementById('loading-screen');
      return !ls || ls.style.display === 'none' || ls.classList.contains('hidden');
    },
    { timeout: 15000 }
  ).catch(() => {});
  await new Promise(r => setTimeout(r, 1000));
}

// dismiss daily reward modal if shown
await page.evaluate(() => {
  const dm = document.getElementById('daily-modal');
  if (dm && dm.style.display !== 'none') {
    dm.querySelector('.btn-y')?.click();
  }
});
await new Promise(r => setTimeout(r, 300));

const activeScreen = () =>
  page.evaluate(() => document.querySelector('.screen.active')?.id || 'none');

// helper: click selector, report resulting active screen
async function clickAndReport(label, sel, expectScreen) {
  const el = await page.$(sel);
  if (!el) { console.log(`MISSING ELEMENT: ${label} (${sel})`); return; }
  await el.click().catch(e => console.log(`CLICK FAILED: ${label}: ${e.message}`));
  await new Promise(r => setTimeout(r, 350));
  const scr = await activeScreen();
  const ok = expectScreen ? (scr === expectScreen ? 'OK' : `FAIL (on ${scr}, wanted ${expectScreen})`) : `→ ${scr}`;
  console.log(`${label}: ${ok}`);
}

// ---- Bottom nav ----
await clickAndReport('bnav-lb', '#bnav-lb', 'sLeaderboard');
await clickAndReport('bnav-profile', '#bnav-profile', 'sProfile');
await clickAndReport('bnav-shop', '#bnav-shop', 'sShop');
await clickAndReport('bnav-home', '#bnav-home', 'sLobby');

// ---- Header nav ----
await clickAndReport('header Settings', '#game-header .nav-btn[title="Settings"]', 'sSettings');
await clickAndReport('bnav-home (return)', '#bnav-home', 'sLobby');
await clickAndReport('header Shop', '#game-header .nav-btn[title="Shop"]', 'sShop');
await clickAndReport('bnav-home (return2)', '#bnav-home', 'sLobby');

// ---- HUD avatar → profile; profile avatar → sAvatars; back ----
await clickAndReport('hud-avatar', '#hud-avatar', 'sProfile');
await clickAndReport('profile avatar → picker', '#profile-av-lg', 'sAvatars');
await clickAndReport('avatars back', '#sAvatars .btn-ghost', 'sProfile');
await clickAndReport('bnav-home (return3)', '#bnav-home', 'sLobby');

// ---- Name setup (first-visit) or mode cards ----
const lobbyState = await page.evaluate(() => ({
  nameSetup: document.getElementById('name-setup-block')?.style.display !== 'none',
  modeGrid: document.getElementById('mode-grid')?.style.display !== 'none',
}));
console.log('LOBBY STATE:', JSON.stringify(lobbyState));

if (lobbyState.nameSetup) {
  await page.type('#uname', 'AuditBot');
  await page.click('#name-setup-block .name-save-btn');
  await new Promise(r => setTimeout(r, 400));
  const gridNow = await page.evaluate(
    () => document.getElementById('mode-grid')?.style.display !== 'none'
  );
  console.log('name save → mode grid appears:', gridNow);
}

// ---- Mode: vs AI ----
await page.click('.mode-card.mc-o').catch(() => console.log('MISSING mode-card mc-o'));
await new Promise(r => setTimeout(r, 350));
console.log('mode vs AI →', await activeScreen());

// difficulty buttons
for (const d of ['easy', 'medium', 'hard']) {
  const selApplied = await page.evaluate(dd => {
    const btn = document.querySelector(`#sAI .diff-btn[data-d="${dd}"]`);
    if (!btn) return 'missing';
    btn.click();
    return btn.className.includes('sel');
  }, d);
  console.log(`diff-btn ${d} selected:`, selApplied);
}

// start AI game
await clickAndReport('start AI game', '#sAI .btn-o', 'sGame');

// ---- Board: make a move ----
const cellCount = await page.evaluate(() => document.querySelectorAll('#board .cell, #board > *').length);
console.log('board cells rendered:', cellCount);
if (cellCount > 0) {
  await page.evaluate(() => document.querySelector('#board > *')?.click());
  await new Promise(r => setTimeout(r, 400));
  const filled = await page.evaluate(() =>
    [...document.querySelectorAll('#board > *')].filter(c => c.textContent.trim()).length
  );
  console.log('cells filled after click:', filled);
}

// emoji buttons
await page.evaluate(() => document.querySelector('.emoji-bar .emoji-btn')?.click());
await new Promise(r => setTimeout(r, 200));

// chat send (type + click)
await page.type('#cin', 'hello audit').catch(() => {});
await page.evaluate(() => document.querySelector('#chatBox .chat-input-row button')?.click());
await new Promise(r => setTimeout(r, 300));
const chatMsgs = await page.evaluate(() => document.getElementById('cmsgs')?.children.length || 0);
console.log('chat messages after send:', chatMsgs);

// leave game
await clickAndReport('leave game', '#sGame .action-row .btn-ghost:last-child', 'sLobby');

// ---- Mode: private room screen ----
await page.click('.mode-card.mc-y').catch(() => {});
await new Promise(r => setTimeout(r, 350));
console.log('mode room →', await activeScreen());
await clickAndReport('room back', '#sRoom .btn-ghost', 'sLobby');

// ---- Leaderboard tabs ----
await clickAndReport('bnav-lb (tabs)', '#bnav-lb', 'sLeaderboard');
const tabResults = await page.evaluate(() => {
  const out = [];
  document.querySelectorAll('#sLeaderboard .tab-btn').forEach(btn => {
    btn.click();
    out.push(`${btn.textContent.trim()}:${btn.classList.contains('active')}`);
  });
  return out;
});
console.log('leaderboard tabs active-toggles:', tabResults.join(' '));

// ---- Shop tabs ----
await clickAndReport('bnav-shop (tabs)', '#bnav-shop', 'sShop');
await page.click('#avatar-tab');
await new Promise(r => setTimeout(r, 300));
const avatarShopVisible = await page.evaluate(
  () => document.getElementById('avatar-grid-shop')?.style.display !== 'none'
);
console.log('avatar shop tab works:', avatarShopVisible);
await page.click('#theme-tab');
await new Promise(r => setTimeout(r, 300));
const themeShopVisible = await page.evaluate(
  () => document.getElementById('shop-grid')?.style.display !== 'none'
);
console.log('theme shop tab works:', themeShopVisible);

// ---- Settings: toggles / selects / previews ----
await clickAndReport('header Settings (2)', '#game-header .nav-btn[title="Settings"]', 'sSettings');
for (const id of ['toggle-sfx', 'toggle-music', 'toggle-confetti']) {
  const flipped = await page.evaluate(tid => {
    const t = document.getElementById(tid);
    if (!t) return 'missing';
    const before = t.classList.contains('on');
    t.click();
    const after = t.classList.contains('on');
    t.click(); // restore
    return before !== after;
  }, id);
  console.log(`${id} flips:`, flipped);
}
// theme select fires
const themeChanged = await page.evaluate(() => {
  const sel = document.getElementById('theme-select');
  sel.value = 'ocean';
  sel.dispatchEvent(new Event('change'));
  const applied = document.body.getAttribute('data-theme') || document.documentElement.getAttribute('data-theme') || document.body.className;
  sel.value = 'dark';
  sel.dispatchEvent(new Event('change'));
  return applied;
});
console.log('theme-select applies:', JSON.stringify(themeChanged));

// sound preview buttons (should not throw) — only the 6 previews in panel 1,
// NOT the Reset button in panel 2 (that one opens confirm(), tested separately)
await page.evaluate(() => {
  document.querySelectorAll('#sSettings .panel:nth-of-type(1) .btn-o').forEach(b => b.click());
});
await new Promise(r => setTimeout(r, 300));

// Reset button opens a confirm() — dialog handler dismisses it
await page.evaluate(() => {
  document.querySelector('#sSettings .panel:nth-of-type(2) .btn-o')?.click();
});
await new Promise(r => setTimeout(r, 300));

// Logout button → should land on auth screen
await page.evaluate(() => document.querySelector('#sSettings > .btn-o')?.click());
await new Promise(r => setTimeout(r, 500));
const afterLogout = await page.evaluate(() => ({
  authVisible: getComputedStyle(document.getElementById('sAuth')).display !== 'none',
  tokenGone: !localStorage.getItem('nexa_token'),
}));
console.log('logout works:', JSON.stringify(afterLogout));

console.log('\n==== CONSOLE/PAGE ERRORS ====');
console.log(errors.length ? errors.join('\n') : '(none)');

await browser.close();
