/**
 * NexaClash Viewport Standard — layout verification harness (dev-only).
 * Drives headless Edge over the running dev server and measures, per screen
 * and per viewport: body scroll, screen-fit, and bottom-nav clearance.
 *
 * Usage: node verify-viewport.mjs [screenIds...]   (default: all)
 */
import puppeteer from 'puppeteer-core';

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const URL = 'http://localhost:3000';

const VIEWPORTS = [
  { name: 'Desktop 1920x1080', width: 1920, height: 1080 },
  { name: 'Laptop  1366x768',  width: 1366, height: 768 },
  { name: 'Tablet   820x1180', width: 820,  height: 1180 },
  { name: 'Mobile   390x844',  width: 390,  height: 844 },
];

// no-scroll = the screen container itself must not overflow
const SCREENS = [
  { id: 'sLobby',       noScroll: true },
  { id: 'sGame',        noScroll: true },
  { id: 'sProfile',     noScroll: true },
  { id: 'sSettings',    noScroll: true },
  { id: 'sShop',        noScroll: false },
  { id: 'sLeaderboard', noScroll: false },
];

const only = process.argv.slice(2);
const screens = only.length ? SCREENS.filter(s => only.includes(s.id)) : SCREENS;

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: 'new',
  args: ['--no-first-run', '--disable-extensions'],
});

let failures = 0;
try {
  for (const vp of VIEWPORTS) {
    const page = await browser.newPage();
    await page.setViewport({ width: vp.width, height: vp.height });

    // Seed auth token + named player BEFORE app scripts run
    await page.evaluateOnNewDocument(() => {
      localStorage.setItem('nexa_token', 'verification-token');
      localStorage.setItem('nc_player', JSON.stringify({
        name: 'Verifier', avatar: '🎮', level: 3, xp: 240, coins: 500,
        wins: 12, games: 30, draws: 3, bestStreak: 4,
        settings: { sfx: false, music: false, confetti: true, soundTheme: 'classic' },
        activeTheme: 'dark', unlockedThemes: ['dark'], unlockedAvatars: ['🎮'],
        achievements: [],
      }));
    });

    await page.goto(URL, { waitUntil: 'networkidle2' });
    // Wait for the fake loading screen to finish and the app to show
    await page.waitForFunction(
      () => document.getElementById('app')?.style.display === 'block',
      { timeout: 15000 }
    );

    console.log(`\n=== ${vp.name} ===`);
    for (const s of screens) {
      const r = await page.evaluate((id) => {
        // Populate the game board when measuring the game screen
        if (id === 'sGame' && typeof _buildBoard === 'function') {
          _buildBoard();
          const cells = document.querySelectorAll('#board .cell');
          ['X','O','X','','O','','','',''].forEach((v, i) => {
            if (v && cells[i]) { cells[i].textContent = v; cells[i].classList.add(v === 'X' ? 'xc' : 'oc', 'taken'); }
          });
        }
        if (typeof showScreen === 'function') showScreen(id);
        else if (typeof navTo === 'function') navTo(id);

        const el = document.getElementById(id);
        const nav = document.getElementById('bottom-nav');
        const navTop = nav.getBoundingClientRect().top;
        const box = el.getBoundingClientRect();

        // deepest visible content bottom inside the screen
        let contentBottom = 0;
        el.querySelectorAll('*').forEach(n => {
          const st = getComputedStyle(n);
          if (st.display === 'none' || st.position === 'fixed') return;
          contentBottom = Math.max(contentBottom, n.getBoundingClientRect().bottom);
        });

        return {
          bodyScroll: document.documentElement.scrollHeight - window.innerHeight,
          screenOverflow: el.scrollHeight - el.clientHeight,
          screenBottom: Math.round(box.bottom),
          contentBottom: Math.round(contentBottom),
          navTop: Math.round(navTop),
          boardW: document.querySelector('.board-wrap')?.getBoundingClientRect().width ?? null,
        };
      }, s.id);

      const bodyOK   = r.bodyScroll <= 1;
      const fitOK    = s.noScroll ? r.screenOverflow <= 1 : true;
      const navOK    = r.screenBottom <= r.navTop + 1;
      const pass     = bodyOK && fitOK && navOK;
      if (!pass) failures++;

      const extra = s.id === 'sGame' && r.boardW ? ` board=${Math.round(r.boardW)}px` : '';
      console.log(
        `${pass ? 'PASS' : 'FAIL'}  ${s.id.padEnd(13)} bodyScroll=${r.bodyScroll}px ` +
        `screenOverflow=${r.screenOverflow}px navGap=${r.navTop - r.screenBottom}px${extra}` +
        (!fitOK ? '  << CONTENT DOES NOT FIT' : '') +
        (!navOK ? '  << OVERLAPS NAV' : '')
      );
    }
    await page.close();
  }
} finally {
  await browser.close();
}
console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
