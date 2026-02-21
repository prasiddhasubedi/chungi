/**
 * Chungee – Thapathali Edition
 * Main Game Engine (ES Module)
 */

import * as THREE from './lib/three.module.min.js';

// ═══════════════════════════════════════════════════════
// CHARACTER DATA
// ═══════════════════════════════════════════════════════
const CHARACTERS = [
  { id: 'prasiddha', name: 'Prasiddha', desc: '',
    color: 0xe8a87c, accentColor: 0xffffff, height: 1.68,
    power: 75, agility: 85, spin: 80, stamina: 75, avatar: 'P' },
  { id: 'lakshya',   name: 'Lakshya',   desc: '',
    color: 0x1a3a8a, accentColor: 0x3355cc, height: 1.83,
    power: 95, agility: 65, spin: 70, stamina: 85, avatar: 'L' },
  { id: 'mandip',    name: 'Mandip',    desc: '',
    color: 0x333333, accentColor: 0x444444, height: 1.68,
    power: 78, agility: 88, spin: 85, stamina: 80, avatar: 'M' },
  { id: 'resham',    name: 'Resham',    desc: '',
    color: 0x666680, accentColor: 0x8888a0, height: 1.80,
    power: 80, agility: 82, spin: 88, stamina: 78, avatar: 'R' },
  { id: 'hitesh',    name: 'Hitesh',    desc: '',
    color: 0x8B4513, accentColor: 0xD2691E, height: 1.71,
    power: 82, agility: 80, spin: 75, stamina: 82, avatar: 'H' },
  { id: 'prabesh',   name: 'Prabesh',   desc: '',
    color: 0xc8a800, accentColor: 0xffd700, height: 1.71,
    power: 78, agility: 87, spin: 82, stamina: 78, avatar: 'Pb' },
  { id: 'manish',    name: 'Manish',    desc: '',
    color: 0xc8b060, accentColor: 0xe8d080, height: 1.74,
    power: 80, agility: 83, spin: 80, stamina: 80, avatar: 'Mn' },
  { id: 'jd',        name: 'JD',        desc: '',
    color: 0x1a4a8a, accentColor: 0x2255aa, height: 1.65,
    power: 72, agility: 90, spin: 90, stamina: 75, avatar: 'JD' },
];

// ═══════════════════════════════════════════════════════
// MOVE DEFINITIONS
// ═══════════════════════════════════════════════════════
const MOVES = [
  { id: 'tap',   name: 'Basic Tap',   key: '1', score: 10, force: 3.5, angle: 75, spin: 0.5,  spread: 0.1  },
  { id: 'flick', name: 'Side Flick',  key: '2', score: 20, force: 4.5, angle: 60, spin: 1.2,  spread: 0.25 },
  { id: 'heel',  name: 'Back Heel',   key: '3', score: 30, force: 4.0, angle: 65, spin: 1.5,  spread: 0.3  },
  { id: 'jump',  name: 'Jump Pass',   key: '4', score: 40, force: 5.5, angle: 80, spin: 0.8,  spread: 0.2  },
  { id: 'spin',  name: 'Spin Trick',  key: '5', score: 50, force: 5.0, angle: 70, spin: 2.5,  spread: 0.35 },
  { id: 'power', name: 'Power Kick',  key: '6', score: 60, force: 7.0, angle: 55, spin: 0.6,  spread: 0.4  },
];

// ═══════════════════════════════════════════════════════
// GAME MODES
// ═══════════════════════════════════════════════════════
const MODES = {
  classic:  { name: 'Classic',  friction: 0.82, gravity: -9.8,  speedMult: 1.0, rain: false, night: false },
  rain:     { name: 'Rain',     friction: 0.60, gravity: -9.8,  speedMult: 1.0, rain: true,  night: false },
  night:    { name: 'Night',    friction: 0.80, gravity: -9.8,  speedMult: 1.1, rain: false, night: true  },
  hardcore: { name: 'Hardcore', friction: 0.75, gravity: -11.0, speedMult: 1.4, rain: false, night: false },
};

// ═══════════════════════════════════════════════════════
// MUTABLE GAME STATE
// ═══════════════════════════════════════════════════════
let selectedCharacter = CHARACTERS[0];
let selectedCharIndex = 0;
let selectedMode = MODES.classic;
let gameStarted = false;
let gamePaused = false;
let gameEnded = false;
let score = 0;
let combo = 0;
let maxCombo = 0;
let kicks = 0;
let lastKickTime = 0;
let totalGroundTime = 0;

// ─── Player movement ────────────────────────────────────────────────────────
const keys       = {};                   // keyboard state
const playerPos  = { x: 0, z: 5 };      // main player world position
const joystick   = { dx: 0, dz: 0 };    // virtual joystick (mobile)
const PLAYER_SPEED    = 5.0;            // m/s
const KICK_RANGE      = 2.0;            // ball must be within this to kick
const BOT_KICK_RANGE  = 1.8;            // ball proximity for bot auto-kick
const BOT_KICK_HEIGHT = 2.8;            // max ball height for bot to kick

// ─── Bot AI state ────────────────────────────────────────────────────────────
let botCooldowns      = {};             // per-bot kick cooldown seconds
let botPassCount      = 0;             // passes since last send-to-player
let botPassTarget     = 3;             // passes before sending to player
let ballGoingToPlayer = false;         // true when ball is aimed at player

// ═══════════════════════════════════════════════════════
// THREE.JS SETUP
// ═══════════════════════════════════════════════════════
const canvas = document.getElementById('game-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);       // daytime sky blue
scene.fog = new THREE.FogExp2(0x87ceeb, 0.015);     // light haze

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 300);
camera.position.set(0, 6, 10);
camera.lookAt(0, 0, 0);

// ═══════════════════════════════════════════════════════
// LIGHTS  (daytime setup)
// ═══════════════════════════════════════════════════════
const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0xd8c8a8, 0.9);
scene.add(hemiLight);

const ambientLight = new THREE.AmbientLight(0xfff5e0, 1.6);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xfff8e8, 3.0);
sunLight.position.set(-10, 18, -8);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
sunLight.shadow.camera.near = 0.1;
sunLight.shadow.camera.far = 100;
sunLight.shadow.camera.left = -25;
sunLight.shadow.camera.right = 25;
sunLight.shadow.camera.top = 25;
sunLight.shadow.camera.bottom = -25;
sunLight.shadow.bias = -0.001;
scene.add(sunLight);

const fillLight = new THREE.PointLight(0xb0c8ff, 0.4, 50);
fillLight.position.set(6, 6, 8);
scene.add(fillLight);

// ═══════════════════════════════════════════════════════
// GROUND
// ═══════════════════════════════════════════════════════
const groundGeo = new THREE.PlaneGeometry(80, 80, 60, 60);
const gvArr = groundGeo.attributes.position.array;
for (let i = 0; i < gvArr.length; i += 3) {
  // 1% drainage slope along X axis – present for realism only.
  // It does NOT create directional gameplay bias; friction dominates motion.
  gvArr[i + 2] += gvArr[i] * 0.01;
}
groundGeo.attributes.position.needsUpdate = true;
groundGeo.computeVertexNormals();

const groundMat = new THREE.MeshStandardMaterial({ color: 0xc4bdb0, roughness: 0.92, metalness: 0.02 });
const groundMesh = new THREE.Mesh(groundGeo, groundMat);
groundMesh.rotation.x = -Math.PI / 2;
groundMesh.receiveShadow = true;
scene.add(groundMesh);

// Concrete expansion joints
const jointMat = new THREE.MeshStandardMaterial({ color: 0xa8a298, roughness: 1.0 });
for (let i = -8; i <= 8; i++) {
  const h = new THREE.Mesh(new THREE.BoxGeometry(40, 0.02, 0.06), jointMat);
  h.position.set(0, 0.005, i * 2);
  scene.add(h);
  const v = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 40), jointMat);
  v.position.set(i * 2, 0.005, 0);
  scene.add(v);
}

// ═══════════════════════════════════════════════════════
// BUILDINGS & ENVIRONMENT
// ═══════════════════════════════════════════════════════
buildEnvironment();

// ═══════════════════════════════════════════════════════
// CHUNGEE BALL
// ═══════════════════════════════════════════════════════
const ballGroup = new THREE.Group();
scene.add(ballGroup);

const ballMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.75 });
const ballMesh = new THREE.Mesh(new THREE.SphereGeometry(0.1, 32, 32), ballMat);
ballMesh.castShadow = true;
ballGroup.add(ballMesh);

const seamMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.9 });
for (let i = 0; i < 3; i++) {
  const seam = new THREE.Mesh(new THREE.TorusGeometry(0.102, 0.004, 8, 32), seamMat);
  seam.rotation.x = (i * Math.PI) / 3;
  seam.rotation.y = (i * Math.PI) / 4;
  ballGroup.add(seam);
}

// Shadow blob
const shadowBlobMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.4, depthWrite: false });
const shadowBlob = new THREE.Mesh(new THREE.CircleGeometry(0.15, 16), shadowBlobMat);
shadowBlob.rotation.x = -Math.PI / 2;
shadowBlob.position.y = 0.005;
scene.add(shadowBlob);

// Landing indicator – shows where ball will land
const landingRingMat = new THREE.MeshBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false });
const landingRing = new THREE.Mesh(new THREE.RingGeometry(0.25, 0.42, 32), landingRingMat);
landingRing.rotation.x = -Math.PI / 2;
landingRing.position.y = 0.01;
landingRing.visible = false;
scene.add(landingRing);

// Kick-range ring – glows when ball is close enough for player to kick
const kickRingMat = new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
const kickRing = new THREE.Mesh(new THREE.RingGeometry(KICK_RANGE - 0.12, KICK_RANGE, 48), kickRingMat);
kickRing.rotation.x = -Math.PI / 2;
kickRing.position.y = 0.02;
scene.add(kickRing);

// ═══════════════════════════════════════════════════════
// CHARACTERS (3D figures)
// ═══════════════════════════════════════════════════════
const charMeshes = [];
const CIRCLE_RADIUS = 3.0;

CHARACTERS.forEach((char, i) => {
  const angle = (i / CHARACTERS.length) * Math.PI * 2;
  const cx = Math.sin(angle) * CIRCLE_RADIUS;
  const cz = Math.cos(angle) * CIRCLE_RADIUS;
  const mesh = createCharMesh(char, cx, 0, cz, angle + Math.PI);
  mesh.userData = { char, angle, idx: i };
  charMeshes.push(mesh);
  scene.add(mesh);
});

// ═══════════════════════════════════════════════════════
// PHYSICS STATE
// ═══════════════════════════════════════════════════════
const ball = { x: 0, y: 1.5, z: 0, vx: 0.5, vy: 3.5, vz: 0.3, rx: 0, ry: 0, rz: 0, vrx: 0, vry: 0, vrz: 0 };
const BALL_RADIUS = 0.1;
const BOUNCE_COEFF = 0.58;
const AIR_DRAG = 0.008;

function groundY(x) { return x * 0.01; } // 1% slope

let gameGravity = -9.8;
let gameFriction = 0.82;

// ═══════════════════════════════════════════════════════
// UI ELEMENT REFERENCES
// ═══════════════════════════════════════════════════════
const elScore      = document.getElementById('score-val');
const elCombo      = document.getElementById('combo-val');
const elModeName   = document.getElementById('mode-name');
const elCharName   = document.getElementById('char-name');
const elGameOver   = document.getElementById('overlay-gameover');
const elFinalScore = document.getElementById('final-score');
const elFinalCombo = document.getElementById('final-combo');
const elFinalKicks = document.getElementById('final-kicks');
const elPauseMenu  = document.getElementById('overlay-pause');
const elSelMenu    = document.getElementById('overlay-select');
const elModeMenu   = document.getElementById('overlay-mode');
const elToast      = document.getElementById('toast');
const elHint       = document.getElementById('controls-hint');
const elPauseBtn   = document.getElementById('btn-pause');

// ═══════════════════════════════════════════════════════
// BUILD CHARACTER SELECT UI
// ═══════════════════════════════════════════════════════
const charGrid = document.getElementById('char-grid');
CHARACTERS.forEach((char, i) => {
  const hexColor = '#' + char.color.toString(16).padStart(6, '0');
  const card = document.createElement('div');
  card.className = 'char-card' + (i === 0 ? ' selected' : '');
  card.innerHTML = `
    <div class="char-avatar" style="background:${hexColor}">${char.avatar}</div>
    <div class="char-name">${char.name}</div>
  `;
  card.addEventListener('click', () => {
    document.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    selectedCharacter = char;
    selectedCharIndex = i;
  });
  charGrid.appendChild(card);
});

// Build mode select UI
const modeGrid = document.getElementById('mode-grid');
const modeIcons = { classic: '☀️', rain: '🌧️', night: '🌙', hardcore: '🔥' };
const modeDescs = {
  classic:  'Standard physics, warm evening light.',
  rain:     'Reduced friction, wet concrete.',
  night:    'Darker environment, faster gameplay.',
  hardcore: 'Stronger gravity, higher speed.',
};
Object.entries(MODES).forEach(([key, mode]) => {
  const card = document.createElement('div');
  card.className = 'mode-card' + (key === 'classic' ? ' selected' : '');
  card.innerHTML = `
    <div class="mode-icon">${modeIcons[key]}</div>
    <div class="mode-name">${mode.name}</div>
    <div class="mode-desc">${modeDescs[key]}</div>
  `;
  card.addEventListener('click', () => {
    document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    selectedMode = mode;
  });
  modeGrid.appendChild(card);
});

// ═══════════════════════════════════════════════════════
// LOADING → SHOW SELECT SCREEN
// ═══════════════════════════════════════════════════════
let loadProgress = 0;
const loadBarEl = document.querySelector('.loading-bar');
const loadInterval = setInterval(() => {
  loadProgress = Math.min(loadProgress + Math.random() * 25, 95);
  if (loadBarEl) loadBarEl.style.width = loadProgress + '%';
  if (loadProgress >= 95) clearInterval(loadInterval);
}, 80);

setTimeout(() => {
  if (loadBarEl) loadBarEl.style.width = '100%';
  const ls = document.getElementById('loading-screen');
  if (ls) {
    ls.classList.add('fade-out');
    setTimeout(() => {
      ls.style.display = 'none';
      elSelMenu.classList.remove('hidden');
    }, 600);
  }
}, 1400);

// ═══════════════════════════════════════════════════════
// MOVE BUTTONS
// ═══════════════════════════════════════════════════════
document.querySelectorAll('.move-btn').forEach((btn, i) => {
  btn.addEventListener('click', () => {
    if (!gameStarted || gamePaused || gameEnded) return;
    doKick(MOVES[i]);
  });
});

// ═══════════════════════════════════════════════════════
// KEYBOARD
// ═══════════════════════════════════════════════════════
document.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (!gameStarted || gamePaused || gameEnded) return;
  const idx = parseInt(e.key) - 1;
  if (idx >= 0 && idx < MOVES.length) doKick(MOVES[idx]);
  if (e.code === 'Space') { e.preventDefault(); doKick(MOVES[0]); }
  if (e.code === 'Escape') onBtnPause();
});
document.addEventListener('keyup',  (e) => { keys[e.code] = false; });

// ═══════════════════════════════════════════════════════
// CANVAS CLICK (tap on characters)
// ═══════════════════════════════════════════════════════
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

canvas.addEventListener('click', (e) => {
  if (!gameStarted || gamePaused || gameEnded) return;
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const allCharChildren = charMeshes.flatMap(m => [m, ...m.children]);
  const hits = raycaster.intersectObjects(allCharChildren, true);
  if (hits.length > 0) doKick(MOVES[0]);
});

// ═══════════════════════════════════════════════════════
// HELPER: Bot position on circle
// ═══════════════════════════════════════════════════════
function getBotPosition(i) {
  const angle = (i / CHARACTERS.length) * Math.PI * 2;
  return { x: Math.sin(angle) * CIRCLE_RADIUS, z: Math.cos(angle) * CIRCLE_RADIUS };
}

// ═══════════════════════════════════════════════════════
// HELPER: Aim ball toward a world-space target
// ═══════════════════════════════════════════════════════
function kickToward(toX, toZ, elevDeg, spread) {
  const elev = (elevDeg || 65) * Math.PI / 180;
  const dx   = toX - ball.x;
  const dz   = toZ - ball.z;
  const d    = Math.max(0.5, Math.hypot(dx, dz));
  const dir  = Math.atan2(dx, dz);
  const g    = Math.abs(gameGravity);
  const sin2 = Math.max(0.01, Math.sin(2 * elev));
  const vTotal = Math.min(12, Math.sqrt(d * g / sin2)) * selectedMode.speedMult;
  const kickDir = dir + (Math.random() - 0.5) * (spread || 0.3);
  ball.y  = Math.max(ball.y, BALL_RADIUS + 0.1);
  ball.vx = Math.sin(kickDir) * vTotal * Math.cos(elev);
  ball.vz = Math.cos(kickDir) * vTotal * Math.cos(elev);
  ball.vy = Math.max(2.5, vTotal * Math.sin(elev));
  ball.vrx = (Math.random() - 0.5) * 6;
  ball.vry = (Math.random() - 0.5) * 6;
  ball.vrz = (Math.random() - 0.5) * 6;
}

// ═══════════════════════════════════════════════════════
// HELPER: Predict landing position
// ═══════════════════════════════════════════════════════
function predictLandingPos() {
  let px = ball.x, py = ball.y, pz = ball.z;
  let pvx = ball.vx, pvy = ball.vy, pvz = ball.vz;
  const simDt = 0.04;
  for (let i = 0; i < 250; i++) {
    pvy += gameGravity * simDt;
    pvx *= (1 - AIR_DRAG);
    pvz *= (1 - AIR_DRAG);
    px += pvx * simDt;
    py += pvy * simDt;
    pz += pvz * simDt;
    if (py - BALL_RADIUS <= groundY(px)) return { x: px, z: pz };
  }
  return { x: ball.x, z: ball.z };
}

// ═══════════════════════════════════════════════════════
// PLAYER MOVEMENT (WASD + joystick)
// ═══════════════════════════════════════════════════════
function updatePlayerMovement(dt) {
  if (!gameStarted || gamePaused || gameEnded) return;
  const speed = PLAYER_SPEED * dt;
  let dx = 0, dz = 0;
  if (keys['KeyW'] || keys['ArrowUp'])    dz -= 1;
  if (keys['KeyS'] || keys['ArrowDown'])  dz += 1;
  if (keys['KeyA'] || keys['ArrowLeft'])  dx -= 1;
  if (keys['KeyD'] || keys['ArrowRight']) dx += 1;
  dx += joystick.dx;
  dz += joystick.dz;

  const mag = Math.hypot(dx, dz);
  if (mag > 0) {
    const nx = (dx / Math.max(1, mag)) * speed;
    const nz = (dz / Math.max(1, mag)) * speed;
    playerPos.x = Math.max(-9, Math.min(9, playerPos.x + nx));
    playerPos.z = Math.max(-9, Math.min(13, playerPos.z + nz));
    charMeshes[selectedCharIndex].rotation.y = Math.atan2(nx, -nz) + Math.PI;
  }
  charMeshes[selectedCharIndex].position.x = playerPos.x;
  charMeshes[selectedCharIndex].position.z = playerPos.z;
}

// ═══════════════════════════════════════════════════════
// BOT AI – auto-pass ball between bots, occasionally to player
// ═══════════════════════════════════════════════════════
function updateBotAI(dt) {
  if (!gameStarted || gamePaused || gameEnded) return;
  CHARACTERS.forEach((_, i) => {
    if (i === selectedCharIndex) return;
    if ((botCooldowns[i] || 0) > 0) { botCooldowns[i] -= dt; return; }
    const bp   = getBotPosition(i);
    const dist = Math.hypot(ball.x - bp.x, ball.z - bp.z);
    const ballLow = (ball.y - BALL_RADIUS) <= BOT_KICK_HEIGHT;
    if (dist < BOT_KICK_RANGE && ballLow && ball.vy <= 0.8) {
      botCooldowns[i] = 1.4 + Math.random() * 1.2;
      botPassCount++;

      let toX, toZ;
      if (botPassCount >= botPassTarget || Math.random() < 0.28) {
        // Send to player
        toX = playerPos.x + (Math.random() - 0.5) * 2.5;
        toZ = playerPos.z + (Math.random() - 0.5) * 2.5;
        botPassCount = 0;
        botPassTarget = 2 + Math.floor(Math.random() * 4);
        ballGoingToPlayer = true;
        showToast('Ball coming!', '#00ff88');
      } else {
        // Send to another bot
        const others = CHARACTERS.map((__, j) => j).filter(j => j !== i && j !== selectedCharIndex);
        const tp = getBotPosition(others[Math.floor(Math.random() * others.length)]);
        toX = tp.x + (Math.random() - 0.5);
        toZ = tp.z + (Math.random() - 0.5);
        ballGoingToPlayer = false;
      }

      ball.x = bp.x; ball.z = bp.z;
      kickToward(toX, toZ, 58 + Math.random() * 16, 0.35);
      triggerKickAnim((i / CHARACTERS.length) * Math.PI * 2);
    }
  });
}

// ═══════════════════════════════════════════════════════
// KICK / GAME LOGIC  (player only; proximity required)
// ═══════════════════════════════════════════════════════
const kickAnims = {};

function doKick(move) {
  const now = performance.now();
  if (now - lastKickTime < 150) return;

  // Player must be close enough to the ball
  const distToBall = Math.hypot(ball.x - playerPos.x, ball.z - playerPos.z);
  if (distToBall > KICK_RANGE) {
    showToast('Too far!', '#ff4444');
    return;
  }

  lastKickTime = now;
  ballGoingToPlayer = false;

  const powMult = selectedCharacter.power  / 100;
  const agiMult = selectedCharacter.agility / 100;
  const spnMult = selectedCharacter.spin   / 100;

  // Aim toward a random bot
  const botIndices = CHARACTERS.map((_, i) => i).filter(i => i !== selectedCharIndex);
  const tIdx = botIndices[Math.floor(Math.random() * botIndices.length)];
  const tp   = getBotPosition(tIdx);
  const toX  = tp.x + (Math.random() - 0.5) * 1.5;
  const toZ  = tp.z + (Math.random() - 0.5) * 1.5;

  const elev    = (move.angle + (Math.random() - 0.5) * 10) * Math.PI / 180;
  const dx      = toX - ball.x;
  const dz      = toZ - ball.z;
  const d       = Math.max(0.5, Math.hypot(dx, dz));
  const dir     = Math.atan2(dx, dz);
  const g       = Math.abs(gameGravity);
  const vTotal  = Math.min(12, Math.sqrt(d * g / Math.max(0.01, Math.sin(2 * elev))))
                  * selectedMode.speedMult * (move.force / 5.0) * powMult;
  const spread  = move.spread * (1 - agiMult * 0.3);
  const kickDir = dir + (Math.random() - 0.5) * spread;

  ball.y  = Math.max(ball.y, BALL_RADIUS + 0.1);
  ball.vx = Math.sin(kickDir) * vTotal * Math.cos(elev);
  ball.vz = Math.cos(kickDir) * vTotal * Math.cos(elev);
  ball.vy = Math.max(3, vTotal * Math.sin(elev));

  ball.vrx = (Math.random() - 0.5) * move.spin * spnMult * 10;
  ball.vry = (Math.random() - 0.5) * move.spin * spnMult * 10;
  ball.vrz = (Math.random() - 0.5) * move.spin * spnMult * 10;

  combo++;
  kicks++;
  if (combo > maxCombo) maxCombo = combo;
  const pts = move.score * Math.max(1, Math.floor(combo / 3));
  score += pts;

  updateHUD();
  showToast(combo > 5 ? `🔥 x${combo}` : move.name, combo > 10 ? '#ffd700' : '#fbbf24');
  kickAnims[selectedCharIndex] = { t: 1.0 };
}

function triggerKickAnim(angle) {
  let nearest = 0, minDiff = Infinity;
  CHARACTERS.forEach((_, i) => {
    const a = (i / CHARACTERS.length) * Math.PI * 2;
    const diff = Math.min(Math.abs(a - angle), Math.PI * 2 - Math.abs(a - angle));
    if (diff < minDiff) { minDiff = diff; nearest = i; }
  });
  kickAnims[nearest] = { t: 1.0 };
}

function endGame() {
  if (gameEnded) return;
  gameEnded = true;
  gameStarted = false;
  saveScore({ name: selectedCharacter.name, score, combo: maxCombo, kicks, mode: selectedMode.name, date: new Date().toLocaleDateString() });
  if (elFinalScore) elFinalScore.textContent = score;
  if (elFinalCombo) elFinalCombo.textContent = maxCombo;
  if (elFinalKicks) elFinalKicks.textContent = kicks;
  if (elGameOver) elGameOver.classList.remove('hidden');
}

function startGame() {
  score = 0; combo = 0; maxCombo = 0; kicks = 0;
  gameEnded = false; gamePaused = false; gameStarted = true;
  totalGroundTime = 0;

  gameGravity = selectedMode.gravity;
  gameFriction = selectedMode.friction;

  // Place player at their circle position and allow free movement
  const selAngle = (selectedCharIndex / CHARACTERS.length) * Math.PI * 2;
  playerPos.x = Math.sin(selAngle) * CIRCLE_RADIUS;
  playerPos.z = Math.cos(selAngle) * CIRCLE_RADIUS;
  charMeshes[selectedCharIndex].position.x = playerPos.x;
  charMeshes[selectedCharIndex].position.z = playerPos.z;

  // Reset bot AI state
  botCooldowns    = {};
  botPassCount    = 0;
  botPassTarget   = 2 + Math.floor(Math.random() * 3);
  ballGoingToPlayer = false;

  // Ball starts near a random bot; that bot kicks off immediately
  const botPool = CHARACTERS.map((_, i) => i).filter(i => i !== selectedCharIndex);
  const startBot = botPool[Math.floor(Math.random() * botPool.length)];
  const sp = getBotPosition(startBot);
  ball.x = sp.x; ball.y = 1.2; ball.z = sp.z;
  ball.vx = 0; ball.vy = 0; ball.vz = 0;
  ball.vrx = 0; ball.vry = 0; ball.vrz = 0;
  botCooldowns[startBot] = 0;   // kick on very next frame

  applyModeEnvironment(selectedMode);
  updateHUD();

  elGameOver.classList.add('hidden');
  elPauseMenu.classList.add('hidden');
  elSelMenu.classList.add('hidden');
  elModeMenu.classList.add('hidden');

  if (elHint) { elHint.style.opacity = '1'; setTimeout(() => { elHint.style.opacity = '0'; }, 4000); }
  if (elPauseBtn) elPauseBtn.textContent = '⏸ Pause';
}

function applyModeEnvironment(mode) {
  if (mode.night) {
    scene.background.setHex(0x030508);
    scene.fog.color.setHex(0x030508);
    hemiLight.intensity     = 0.05;
    ambientLight.color.setHex(0x101520);
    ambientLight.intensity  = 0.4;
    sunLight.color.setHex(0x3040a0);
    sunLight.intensity      = 0.3;
  } else if (mode.rain) {
    scene.background.setHex(0x8090a8);
    scene.fog.color.setHex(0x8090a8);
    hemiLight.intensity     = 0.4;
    ambientLight.color.setHex(0xb0bcc8);
    ambientLight.intensity  = 1.1;
    sunLight.color.setHex(0xc0ccd8);
    sunLight.intensity      = 1.5;
  } else {
    // Classic / Hardcore – bright daytime
    scene.background.setHex(0x87ceeb);
    scene.fog.color.setHex(0x87ceeb);
    hemiLight.intensity     = 0.9;
    ambientLight.color.setHex(0xfff5e0);
    ambientLight.intensity  = 1.6;
    sunLight.color.setHex(0xfff8e8);
    sunLight.intensity      = 3.0;
  }
  if (elModeName) elModeName.textContent = mode.name;
  if (elCharName) elCharName.textContent = selectedCharacter.name;
}

function updateHUD() {
  if (elScore) elScore.textContent = score;
  if (elCombo) {
    elCombo.textContent = combo > 1 ? `x${combo}` : '';
    elCombo.classList.remove('pop');
    void elCombo.offsetWidth; // reflow to restart animation
    elCombo.classList.add('pop');
  }
}

function showToast(text, color) {
  if (!elToast) return;
  elToast.textContent = text;
  elToast.style.color = color || '#fbbf24';
  elToast.classList.remove('show');
  void elToast.offsetWidth;
  elToast.classList.add('show');
  setTimeout(() => elToast.classList.remove('show'), 700);
}

function saveScore(entry) {
  try {
    const data = JSON.parse(localStorage.getItem('chungee_scores') || '[]');
    data.push(entry);
    data.sort((a, b) => b.score - a.score);
    localStorage.setItem('chungee_scores', JSON.stringify(data.slice(0, 50)));
  } catch (e) {
    console.error('chungee: saveScore failed', e);
  }
}

// ═══════════════════════════════════════════════════════
// GAME LOOP
// ═══════════════════════════════════════════════════════
let lastTime = 0;

function animate(time) {
  requestAnimationFrame(animate);
  const dt = Math.min((time - lastTime) / 1000, 0.05);
  lastTime = time;

  if (gameStarted && !gamePaused && !gameEnded) {
    // Player movement & bot AI
    updatePlayerMovement(dt);
    updateBotAI(dt);

    // Physics
    ball.vy += gameGravity * dt;
    ball.vx *= (1 - AIR_DRAG);
    ball.vz *= (1 - AIR_DRAG);
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    ball.z += ball.vz * dt;

    // Spin decay
    ball.vrx *= 0.98; ball.vry *= 0.98; ball.vrz *= 0.98;
    ball.rx += ball.vrx * dt; ball.ry += ball.vry * dt; ball.rz += ball.vrz * dt;

    // Ground collision
    const gY = groundY(ball.x);
    if (ball.y - BALL_RADIUS <= gY) {
      ball.y = gY + BALL_RADIUS;
      ball.vy *= -BOUNCE_COEFF;
      ball.vx *= gameFriction;
      ball.vz *= gameFriction;
      ball.vrx += ball.vx * 0.15;
      ball.vrz += ball.vz * 0.15;

      if (Math.abs(ball.vy) < 0.4) {
        totalGroundTime += dt;
        // Tiny nudge from the 1% slope – visual realism only; too small to
        // create directional advantage or affect skill-based gameplay.
        ball.vx += 0.002;
        if (totalGroundTime > 1.5) { endGame(); return; }
      } else {
        totalGroundTime = 0;
        if (combo > 0) { combo = 0; updateHUD(); }
      }
    } else {
      totalGroundTime = 0;
    }

    // Boundary walls (between car rows)
    const bX = 4.8, bZ = 13;
    if (ball.x > bX)  { ball.x = bX;  ball.vx *= -0.5; }
    if (ball.x < -bX) { ball.x = -bX; ball.vx *= -0.5; }
    if (ball.z > bZ)  { ball.z = bZ;  ball.vz *= -0.5; }
    if (ball.z < -bZ) { ball.z = -bZ; ball.vz *= -0.5; }

    // Update ball mesh
    ballGroup.position.set(ball.x, ball.y, ball.z);
    ballGroup.rotation.set(ball.rx, ball.ry, ball.rz);

    // Shadow blob
    const sh = Math.max(0, ball.y - gY);
    const ss = Math.max(0.2, 1 - sh * 0.25);
    shadowBlob.position.set(ball.x, gY + 0.005, ball.z);
    shadowBlob.scale.setScalar(ss);
    shadowBlobMat.opacity = Math.max(0.05, 0.4 * ss);

    // Landing indicator – always visible so player knows where to run
    const landing = predictLandingPos();
    landingRing.visible = true;
    landingRing.position.set(landing.x, groundY(landing.x) + 0.01, landing.z);
    const distToLanding = Math.hypot(landing.x - playerPos.x, landing.z - playerPos.z);
    landingRingMat.color.setHex(distToLanding < KICK_RANGE * 1.5 ? 0x00ff44 : 0xff4400);
    // Pulse faster and brighter while descending
    const pulse = ball.vy < 0
      ? 0.5 + Math.sin(time * 0.01) * 0.3
      : 0.2 + Math.sin(time * 0.004) * 0.1;
    landingRingMat.opacity = pulse;

    // Kick-range ring around player
    kickRing.position.set(playerPos.x, groundY(playerPos.x) + 0.02, playerPos.z);
    const ballDist = Math.hypot(ball.x - playerPos.x, ball.z - playerPos.z);
    kickRingMat.opacity = ballDist < KICK_RANGE
      ? 0.35 + Math.sin(time * 0.012) * 0.2
      : 0;

    // Camera: follow player, keep ball in view
    const camTX = playerPos.x * 0.7 + ball.x * 0.3;
    const camTY = Math.max(5, ball.y * 0.4 + 6);
    const camTZ = playerPos.z + 7;
    camera.position.x += (camTX - camera.position.x) * 0.05;
    camera.position.y += (camTY - camera.position.y) * 0.04;
    camera.position.z += (camTZ - camera.position.z) * 0.05;
    camera.lookAt(
      (playerPos.x + ball.x) * 0.45,
      ball.y * 0.25,
      (playerPos.z + ball.z) * 0.45
    );

  } else if (!gameStarted && !gameEnded) {
    // Idle orbit + auto-bounce
    const ang = time * 0.0003;
    camera.position.x = Math.sin(ang) * 12;
    camera.position.z = Math.cos(ang) * 12;
    camera.position.y = 5 + Math.sin(time * 0.0005) * 0.5;
    camera.lookAt(0, 1, 0);

    const gY = groundY(ball.x);
    ball.vy += MODES.classic.gravity * dt;
    ball.x += ball.vx * dt; ball.y += ball.vy * dt; ball.z += ball.vz * dt;
    if (ball.y - BALL_RADIUS <= gY) {
      ball.y = gY + BALL_RADIUS;
      ball.vy *= -BOUNCE_COEFF;
      ball.vx *= 0.82; ball.vz *= 0.82;
      if (Math.abs(ball.vy) < 0.3) { ball.vy = 2.5; ball.vx = (Math.random()-0.5); ball.vz = (Math.random()-0.5); }
    }
    if (ball.x > 3 || ball.x < -3) ball.vx *= -1;
    if (ball.z > 3 || ball.z < -3) ball.vz *= -1;

    ballGroup.position.set(ball.x, ball.y, ball.z);
    ballGroup.rotation.x += 0.03;
    shadowBlob.position.set(ball.x, gY + 0.005, ball.z);
    landingRing.visible  = false;
    kickRingMat.opacity  = 0;
  }

  // Animate characters
  animateChars(time);

  renderer.render(scene, camera);
}

requestAnimationFrame(animate);

function animateChars(time) {
  charMeshes.forEach((mesh, i) => {
    // Bots stay at their fixed circle positions; player mesh follows playerPos
    if (i !== selectedCharIndex) {
      const bp = getBotPosition(i);
      mesh.position.x = bp.x;
      mesh.position.z = bp.z;
    }
    mesh.scale.y = 1 + Math.sin(time * 0.002 + i) * 0.008;
    if (kickAnims[i]) {
      kickAnims[i].t -= 0.05;
      if (kickAnims[i].t <= 0) {
        delete kickAnims[i];
        mesh.rotation.x = 0;
      } else {
        mesh.rotation.x = -Math.sin(kickAnims[i].t * Math.PI) * 0.4;
      }
    }
    if (i === selectedCharIndex && gameStarted) {
      const hl = (Math.sin(time * 0.005) * 0.5 + 0.5) * 0.2;
      if (mesh.children[0] && mesh.children[0].material) {
        mesh.children[0].material.emissiveIntensity = hl;
      }
    }
  });
}

// ═══════════════════════════════════════════════════════
// 3D ENVIRONMENT
// ═══════════════════════════════════════════════════════
function buildEnvironment() {
  // Library building (left) – warm sandstone
  addBuilding(-20, 0, 0, 10, 14, 40, 0xd4c4a8);
  // D Block (right) – light gray-beige
  addBuilding(20, 0, 0, 12, 16, 45, 0xccc0b0);
  // Material Lab (behind, negative Z) – light green-gray
  addBuilding(0, 0, -22, 25, 11, 10, 0xb8c8b0);
  // Toilet building (far corner) – plain light gray
  addBuilding(-14, 0, 16, 6, 4, 6, 0xd4d4c4);

  // Tennis court fence (positive Z)
  const fenceMat = new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.5, metalness: 0.7 });
  const wireMat  = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.4, metalness: 0.8 });
  for (let x = -9; x <= 9; x += 2) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 4, 8), fenceMat);
    post.position.set(x, 2, 18);
    post.castShadow = true;
    scene.add(post);
  }
  for (let h = 0.5; h <= 3.5; h += 0.75) {
    const wire = new THREE.Mesh(new THREE.BoxGeometry(18, 0.03, 0.03), wireMat);
    wire.position.set(0, h, 18);
    scene.add(wire);
  }

  // Parked cars (two rows of 6)
  const carColors = [0x8B0000, 0x1a3a6a, 0x2a4a2a, 0x5a4a2a, 0x6a2a6a, 0x2a5a5a, 0x4a4a4a, 0x8a7a3a, 0x3a5a3a, 0x6a3a2a];
  [-7, -4, -1, 2, 5, 8].forEach((z, i) => {
    addCar(-6.5, 0, z, 0, carColors[i % carColors.length]);
    addCar(6.5, 0, z, Math.PI, carColors[(i + 3) % carColors.length]);
  });

  // Streetlights
  addStreetLights();

  // ── Building signs ──────────────────────────────────────────────────────────
  // Library (right face at x=-15, normal faces +X toward parking lot)
  addBuildingSign(-14.9, 5,  0,   Math.PI / 2,  4.5, 1.4,
    ['LIBRARY', 'Thapathali Campus']);

  // D Block (left face at x=14, normal faces -X toward parking lot)
  addBuildingSign(14.1,  5,  0,  -Math.PI / 2,  5.5, 1.6,
    ['D BLOCK', 'Thapathali Engineering Campus']);

  // Material Testing Lab (front face at z=-17, normal faces +Z toward parking lot)
  addBuildingSign(0, 4.5, -16.9,  0,           9.0, 2.2,
    ['THAPATHALI', 'MATERIAL TESTING LAB', 'Civil Engineering Dept.']);

  // Ground label in the parking area
  addBuildingSign(0, 0.05, 7,  0,             7.0, 1.6,
    ['THAPATHALI ENGINEERING CAMPUS', 'PARKING AREA'],
    { bg: '#ffffff', border: '#cc3300', color: '#cc3300' });
}

// ─── Building sign helpers ───────────────────────────────────────────────────
function makeSignTex(lines, opts = {}) {
  const W  = 512;
  const H  = Math.max(80, lines.length * 80);
  const cvs = document.createElement('canvas');
  cvs.width = W; cvs.height = H;
  const ctx = cvs.getContext('2d');

  ctx.fillStyle = opts.bg || '#fff9e8';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = opts.border || '#1a3a8a';
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, W - 8, H - 8);

  const step   = H / (lines.length + 1);
  const maxFs  = Math.floor(step * 0.72);
  ctx.fillStyle  = opts.color || '#1a2a6a';
  ctx.textAlign  = 'center';
  ctx.textBaseline = 'middle';

  lines.forEach((text, i) => {
    // Auto-shrink font so long text fits
    let fs = maxFs;
    ctx.font = `bold ${fs}px Arial, sans-serif`;
    while (ctx.measureText(text).width > W - 24 && fs > 10) {
      fs -= 2;
      ctx.font = `bold ${fs}px Arial, sans-serif`;
    }
    ctx.fillText(text, W / 2, (i + 1) * step);
  });

  return new THREE.CanvasTexture(cvs);
}

function addBuildingSign(x, y, z, rotY, w, h, lines, opts = {}) {
  const mat  = new THREE.MeshBasicMaterial({
    map: makeSignTex(lines, opts),
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.position.set(x, y, z);
  mesh.rotation.y = rotY;
  // Lay flat on ground when y ≈ 0 (ground label)
  if (y < 0.1) mesh.rotation.x = -Math.PI / 2;
  scene.add(mesh);
}

function addBuilding(x, y, z, w, h, d, color) {
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.05 });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y + h / 2, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);

  const winMat = new THREE.MeshStandardMaterial({ color: 0x99bbdd, roughness: 0.1, emissive: 0x4488bb, emissiveIntensity: 0.08, metalness: 0.25, transparent: true, opacity: 0.85 });
  const rows = Math.max(1, Math.floor(h / 3.5));
  const cols = Math.max(1, Math.floor(w / 2.8));
  for (let r = 1; r <= rows; r++) {
    for (let c = 0; c < cols; c++) {
      const wx = x - w / 2 + (c + 0.5) * (w / cols);
      const wy = y + r * (h / (rows + 1));
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.3, 0.12), winMat);
      win.position.set(wx, wy, z + d / 2 + 0.01);
      scene.add(win);
    }
  }
}

function addCar(x, y, z, rot, color) {
  const grp = new THREE.Group();
  grp.position.set(x, y, z);
  grp.rotation.y = rot;

  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.6 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.7, 4.1), bodyMat);
  body.position.y = 0.55;
  body.castShadow = true;
  grp.add(body);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.6, 2.1), bodyMat);
  cabin.position.set(0, 1.15, -0.15);
  cabin.castShadow = true;
  grp.add(cabin);

  const winMat = new THREE.MeshStandardMaterial({ color: 0x334466, roughness: 0.1, metalness: 0.5, transparent: true, opacity: 0.75 });
  const fw = new THREE.Mesh(new THREE.PlaneGeometry(1.35, 0.45), winMat);
  fw.position.set(0, 1.2, 0.88);
  fw.rotation.x = -0.25;
  grp.add(fw);

  const wMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });
  const rMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.3, metalness: 0.8 });
  [[-1.0, 0.35, -1.35], [1.0, 0.35, -1.35], [-1.0, 0.35, 1.35], [1.0, 0.35, 1.35]].forEach(([wx, wy, wz]) => {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.22, 16), wMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, wy, wz);
    w.castShadow = true;
    grp.add(w);
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.23, 16), rMat);
    r.rotation.z = Math.PI / 2;
    r.position.set(wx, wy, wz);
    grp.add(r);
  });

  const hMat = new THREE.MeshStandardMaterial({ color: 0xffffcc, emissive: 0xffcc66, emissiveIntensity: 0.7, roughness: 0.1 });
  [-0.55, 0.55].forEach(ox => {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 0.08), hMat);
    hl.position.set(ox, 0.62, 2.1);
    grp.add(hl);
  });

  scene.add(grp);
}

function addStreetLights() {
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.5, metalness: 0.8 });
  const lampMat = new THREE.MeshStandardMaterial({ color: 0xffffcc, emissive: 0xffcc66, emissiveIntensity: 0.8, roughness: 0.2 });
  [-8, -3, 3, 8].forEach(z => {
    [-7.5, 7.5].forEach(side => {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 7, 8), poleMat);
      pole.position.set(side, 3.5, z);
      pole.castShadow = true;
      scene.add(pole);

      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 16), lampMat);
      lamp.position.set(side + Math.sign(side) * -0.5, 7, z);
      scene.add(lamp);

      const pl = new THREE.PointLight(0xffdd88, 0.8, 12);
      pl.position.copy(lamp.position);
      scene.add(pl);
    });
  });
}

// ═══════════════════════════════════════════════════════
// CHARACTER MESH BUILDER
// ═══════════════════════════════════════════════════════
function createCharMesh(char, x, y, z, faceAngle) {
  const grp = new THREE.Group();
  grp.position.set(x, y, z);
  grp.rotation.y = faceAngle;

  const s = char.height / 1.75;

  const torsoMat = new THREE.MeshStandardMaterial({ color: char.color, roughness: 0.8, emissive: char.color, emissiveIntensity: 0.0 });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.38 * s, 0.5 * s, 0.28 * s), torsoMat);
  torso.position.set(0, 0.5 * s, 0);
  torso.rotation.x = -0.25;
  torso.castShadow = true;
  grp.add(torso);

  const headMat = new THREE.MeshStandardMaterial({ color: 0xd4a077, roughness: 0.7 });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.15 * s, 16, 16), headMat);
  head.position.set(0, 0.92 * s, 0);
  head.castShadow = true;
  grp.add(head);

  const hairMat = new THREE.MeshStandardMaterial({ color: 0x1a0a00, roughness: 0.9 });
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.155 * s, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), hairMat);
  hair.position.set(0, 0.92 * s, 0);
  grp.add(hair);

  // Accessory
  addAccessory(grp, char, s);

  const legMat = new THREE.MeshStandardMaterial({ color: 0x2a2a4a, roughness: 0.8 });
  [-0.14 * s, 0.14 * s].forEach(lx => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14 * s, 0.38 * s, 0.14 * s), legMat);
    leg.position.set(lx, 0.22 * s, 0.15 * s);
    leg.rotation.x = 1.2;
    leg.castShadow = true;
    grp.add(leg);
  });

  const shoeMat = new THREE.MeshStandardMaterial({ color: char.accentColor, roughness: 0.7 });
  [-0.14 * s, 0.14 * s].forEach(sx => {
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.15 * s, 0.08 * s, 0.25 * s), shoeMat);
    shoe.position.set(sx, 0.04, 0.38 * s);
    grp.add(shoe);
  });

  const armMat = new THREE.MeshStandardMaterial({ color: char.color, roughness: 0.8 });
  [-0.27 * s, 0.27 * s].forEach((ax, i) => {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.12 * s, 0.35 * s, 0.12 * s), armMat);
    arm.position.set(ax, 0.5 * s, 0.05 * s);
    arm.rotation.z = (i === 0 ? 0.3 : -0.3);
    arm.castShadow = true;
    grp.add(arm);
  });

  return grp;
}

function addAccessory(grp, char, s) {
  if (char.id === 'mandip') {
    const capMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.16 * s, 0.16 * s, 0.1 * s, 16), capMat);
    cap.position.set(0, 1.04 * s, 0);
    grp.add(cap);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.21 * s, 0.21 * s, 0.03 * s, 16), capMat);
    brim.position.set(0, 0.98 * s, 0.04 * s);
    grp.add(brim);
  } else if (char.id === 'hitesh') {
    const topiMat = new THREE.MeshStandardMaterial({ color: 0xc0804a, roughness: 0.9 });
    const topi = new THREE.Mesh(new THREE.CylinderGeometry(0.17 * s, 0.16 * s, 0.12 * s, 16), topiMat);
    topi.position.set(0, 1.04 * s, 0);
    grp.add(topi);
  } else if (char.id === 'resham') {
    const gMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.3, metalness: 0.9 });
    [-0.06 * s, 0.06 * s].forEach(gx => {
      const frame = new THREE.Mesh(new THREE.TorusGeometry(0.05 * s, 0.008 * s, 8, 16), gMat);
      frame.position.set(gx, 0.93 * s, 0.14 * s);
      frame.rotation.y = Math.PI / 2;
      grp.add(frame);
    });
  }
}

// ═══════════════════════════════════════════════════════
// BUTTON HANDLERS (exposed globally)
// ═══════════════════════════════════════════════════════
window.onBtnStart = function () {
  elSelMenu.classList.add('hidden');
  elModeMenu.classList.remove('hidden');
};

window.onBtnConfirmMode = function () {
  startGame();
};

window.onBtnPause = function () {
  if (!gameStarted && !gamePaused) return;
  gamePaused = !gamePaused;
  if (gamePaused) {
    elPauseMenu.classList.remove('hidden');
    if (elPauseBtn) elPauseBtn.textContent = '▶ Resume';
  } else {
    elPauseMenu.classList.add('hidden');
    if (elPauseBtn) elPauseBtn.textContent = '⏸ Pause';
  }
};

window.onBtnResume = function () {
  gamePaused = false;
  elPauseMenu.classList.add('hidden');
  if (elPauseBtn) elPauseBtn.textContent = '⏸ Pause';
};

window.onBtnRestart = function () {
  elGameOver.classList.add('hidden');
  elPauseMenu.classList.add('hidden');
  elSelMenu.classList.remove('hidden');
};

window.onBtnQuit = function () {
  window.location.href = 'index.html';
};

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ═══════════════════════════════════════════════════════
// MOBILE JOYSTICK
// ═══════════════════════════════════════════════════════
(function initJoystick() {
  const base  = document.getElementById('joystick-base');
  const knob  = document.getElementById('joystick-knob');
  if (!base || !knob) return;

  const JRADIUS = 38;
  let touchId = null;

  function updateKnob(touch) {
    const rect = base.getBoundingClientRect();
    const cx = rect.left + rect.width  / 2;
    const cy = rect.top  + rect.height / 2;
    let dx = touch.clientX - cx;
    let dy = touch.clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > JRADIUS) { dx = dx / dist * JRADIUS; dy = dy / dist * JRADIUS; }
    joystick.dx = dx / JRADIUS;
    joystick.dz = dy / JRADIUS;
    knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  }

  function resetKnob() {
    joystick.dx = 0; joystick.dz = 0;
    knob.style.transform = 'translate(-50%, -50%)';
  }

  base.addEventListener('touchstart', (e) => {
    e.preventDefault();
    touchId = e.changedTouches[0].identifier;
    updateKnob(e.changedTouches[0]);
  }, { passive: false });

  document.addEventListener('touchmove', (e) => {
    if (touchId === null) return;
    for (const t of e.changedTouches) {
      if (t.identifier === touchId) { e.preventDefault(); updateKnob(t); break; }
    }
  }, { passive: false });

  document.addEventListener('touchend', (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier === touchId) { touchId = null; resetKnob(); break; }
    }
  });
})();
