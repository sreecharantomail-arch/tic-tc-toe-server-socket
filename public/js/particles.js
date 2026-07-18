/**
 * particles.js
 * Canvas-based confetti and fireworks for win celebrations.
 *
 * The canvas sits at z-index 9999, fixed over the whole viewport.
 * All rendering is done in a single rAF loop that runs continuously
 * but is essentially free when the particle array is empty.
 */

const PARTICLE_COLOURS = ['#00f5ff', '#ff2d78', '#ffe066', '#9955ff', '#00cc66', '#ff6600'];

// Particle shape types
const SHAPE_RECT = 0;
const SHAPE_TRIANGLE = 1;
const SHAPE_CIRCLE = 2; // used for firework sparks
const SHAPE_DOT = 3; // small round confetti

let particleCanvas = null;
let particleCtx = null;
let particles = [];

/** Must be called once on page load to set up the canvas element. */
function initParticles(canvasEl) {
    particleCanvas = canvasEl;
    particleCtx = canvasEl.getContext('2d');

    function resize() {
        particleCanvas.width = window.innerWidth;
        particleCanvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    requestAnimationFrame(_tick);
}

/** Spawn a burst of falling confetti from the top of the screen. */
function spawnConfetti() {
    if (!player?.settings?.confetti) {
        return;
    }
    const shapes = [SHAPE_RECT, SHAPE_TRIANGLE, SHAPE_DOT];

    for (let i = 0; i < 120; i++) {
        particles.push({
            x: Math.random() * particleCanvas.width,
            y: -10,
            vx: (Math.random() - 0.5) * 6,
            vy: Math.random() * 4 + 2,
            rotation: Math.random() * 360,
            rotationSpeed: (Math.random() - 0.5) * 8,
            width: Math.random() * 10 + 5,
            height: Math.random() * 5 + 3,
            colour: PARTICLE_COLOURS[Math.floor(Math.random() * PARTICLE_COLOURS.length)],
            opacity: 1,
            decay: Math.random() * 0.008 + 0.005,

            shape: shapes[Math.floor(Math.random() * shapes.length)],
        });
    }
}

/**
 * Spawn an outward burst of sparks from a screen-space point.
 * @param {number} x  screen x
 * @param {number} y  screen y
 */
function spawnFireworks(x, y) {
    if (!player?.settings?.confetti) {
        return;
    }

    const cx = x ?? particleCanvas.width / 2;
    const cy = y ?? particleCanvas.height / 3;

    for (let i = 0; i < 60; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 6 + 2;
        particles.push({
            x: cx,
            y: cy,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            rotation: 0,
            rotationSpeed: 0,
            width: 4,
            height: 4,
            colour: PARTICLE_COLOURS[Math.floor(Math.random() * PARTICLE_COLOURS.length)],
            opacity: 1,
            decay: Math.random() * 0.02 + 0.01,
            shape: SHAPE_CIRCLE,
        });
    }
}

// ----- Private render loop -----

function _tick() {
    requestAnimationFrame(_tick);
    if (!particleCanvas || !particleCtx) {
        return;
    }
    particleCtx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
    if (particles.length === 0) {
        return;
    }

    // Filter dead particles first (avoids looping twice)
    particles = particles.filter(p => p.opacity > 0);

    for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;

        // Confetti falls; sparks don't get gravity
        if (p.shape !== SHAPE_CIRCLE) {
            p.vy += 0.1;
        }

        p.opacity -= p.decay;

        particleCtx.save();
        particleCtx.translate(p.x, p.y);
        particleCtx.rotate((p.rotation * Math.PI) / 180);
        particleCtx.globalAlpha = Math.max(0, p.opacity);
        particleCtx.fillStyle = p.colour;

        switch (p.shape) {
            case SHAPE_CIRCLE:
                particleCtx.beginPath();
                particleCtx.arc(0, 0, p.width / 2, 0, Math.PI * 2);
                particleCtx.fill();
                break;
            case SHAPE_TRIANGLE:
                particleCtx.beginPath();
                particleCtx.moveTo(0, -p.height);
                particleCtx.lineTo(p.width / 2, p.height);
                particleCtx.lineTo(-p.width / 2, p.height);
                particleCtx.fill();
                break;
            default: // RECT and DOT
                particleCtx.fillRect(-p.width / 2, -p.height / 2, p.width, p.height);
        }

        particleCtx.restore();
    }
}
// ==========================================================
// ROYAL GOLD WIN EFFECT
// ==========================================================

function _triggerRoyalGoldWinEffects(combo) {
    _spawnRoyalGoldCoins();

    if (combo && Array.isArray(combo)) {
        _spawnRoyalGoldSparkles(combo);
    }
}

function _spawnRoyalGoldSparkles(combo) {
    combo.forEach(index => {
        const cell = boardCells[index];

        const rect = cell.getBoundingClientRect();

        for (let i = 0; i < 14; i++) {
            const sparkle = document.createElement('div');

            sparkle.className = 'rg-sparkle';

            sparkle.style.left = `${rect.left + rect.width / 2}px`;
            sparkle.style.top = `${rect.top + rect.height / 2}px`;

            sparkle.style.setProperty('--dx', `${Math.random() * 140 - 70}px`);
            sparkle.style.setProperty('--dy', `${Math.random() * -140}px`);

            document.body.appendChild(sparkle);

            setTimeout(() => sparkle.remove(), 1200);
        }
    });
}

function _spawnRoyalGoldCoins() {
    for (let i = 0; i < 70; i++) {
        const coin = document.createElement('div');

        coin.className = 'rg-coin';

        coin.textContent = '🪙';

        coin.style.left = `${Math.random() * window.innerWidth}px`;

        coin.style.animationDelay = `${Math.random() * 0.8}s`;

        coin.style.animationDuration = `${2 + Math.random() * 1.5}s`;

        document.body.appendChild(coin);

        setTimeout(() => {
            coin.remove();
        }, 4000);
    }
}

function _spawnRoyalGoldTrail(x, y) {
    const p = document.createElement('div');

    p.className = 'rg-trail';

    p.style.left = `${x}px`;
    p.style.top = `${y}px`;

    document.body.appendChild(p);

    setTimeout(() => p.remove(), 700);
}
