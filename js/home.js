/**
 * Chungee – Thapathali Edition
 * Home Page Animation
 */

import * as THREE from './lib/three.module.min.js';

const canvas = document.getElementById('home-canvas');
if (!canvas) throw new Error('No canvas');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x1a0f05, 0.06);
scene.background = new THREE.Color(0x0f0a05);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 4, 14);
camera.lookAt(0, 0, 0);

// Lighting – warm evening
const ambientLight = new THREE.AmbientLight(0x3a2010, 0.8);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xff8c3a, 2.0);
sunLight.position.set(-8, 12, -5);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 1024;
sunLight.shadow.mapSize.height = 1024;
sunLight.shadow.camera.near = 0.1;
sunLight.shadow.camera.far = 80;
sunLight.shadow.camera.left = -20;
sunLight.shadow.camera.right = 20;
sunLight.shadow.camera.top = 20;
sunLight.shadow.camera.bottom = -20;
scene.add(sunLight);

const fillLight = new THREE.PointLight(0xff6020, 0.6, 40);
fillLight.position.set(5, 5, 8);
scene.add(fillLight);

// Ground
const groundGeo = new THREE.PlaneGeometry(60, 60, 40, 40);
const gv = groundGeo.attributes.position.array;
for (let i = 0; i < gv.length; i += 3) {
  gv[i + 2] += gv[i] * 0.01;
}
groundGeo.attributes.position.needsUpdate = true;
groundGeo.computeVertexNormals();

const groundMat = new THREE.MeshStandardMaterial({ color: 0x4a4540, roughness: 0.95, metalness: 0.02 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Concrete joint lines
const lineMat = new THREE.MeshStandardMaterial({ color: 0x3a3530, roughness: 1.0 });
for (let i = -5; i <= 5; i++) {
  const h = new THREE.Mesh(new THREE.BoxGeometry(30, 0.02, 0.05), lineMat);
  h.position.set(0, 0.01, i * 2.5);
  scene.add(h);
  const v = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 30), lineMat);
  v.position.set(i * 2.5, 0.01, 0);
  scene.add(v);
}

// Buildings
addBuilding(-18, 0, 0, 8, 12, 30, 0x8a7a6a);
addBuilding(18, 0, 0, 10, 15, 35, 0x9a8a7a);
addBuilding(0, 0, -20, 22, 10, 8, 0x7a8a7a);

// Toilet building
addBuilding(-12, 0, 14, 5, 3.5, 5, 0x8a8a7a);

// Tennis court fence
const fenceMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.5, metalness: 0.7 });
for (let x = -8; x <= 8; x += 2) {
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.5, 8), fenceMat);
  post.position.set(x, 1.75, 15.5);
  post.castShadow = true;
  scene.add(post);
}

// Parked cars
const carColors = [0x8B0000, 0x1a3a6a, 0x2a4a2a, 0x5a4a2a, 0x6a2a6a, 0x2a5a5a, 0x4a4a4a, 0x8a7a3a];
[-8, -4, 0, 4, 8].forEach((z, i) => {
  addCar(-5.5, 0, z, 0, carColors[i % carColors.length]);
  addCar(5.5, 0, z, Math.PI, carColors[(i + 3) % carColors.length]);
});

// Chungee ball
const ballGroup = new THREE.Group();
scene.add(ballGroup);

const ballMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.75, metalness: 0.0 });
const ballMesh = new THREE.Mesh(new THREE.SphereGeometry(0.18, 32, 32), ballMat);
ballMesh.castShadow = true;
ballGroup.add(ballMesh);

const seamMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.9 });
for (let i = 0; i < 3; i++) {
  const seam = new THREE.Mesh(new THREE.TorusGeometry(0.185, 0.006, 8, 32), seamMat);
  seam.rotation.x = (i * Math.PI) / 3;
  seam.rotation.y = (i * Math.PI) / 4;
  ballGroup.add(seam);
}

// Physics
const ball = { x: 0, y: 2.5, z: 0, vx: 0.8, vy: 1.2, vz: 0.3, spin: 0 };
const GRAVITY = -9.8;
const BOUNCE = 0.62;

let lastTime = 0;

function animate(time) {
  requestAnimationFrame(animate);
  const dt = Math.min((time - lastTime) / 1000, 0.05);
  lastTime = time;

  // Physics
  ball.vy += GRAVITY * dt;
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;
  ball.z += ball.vz * dt;
  ball.spin += 0.05;

  const gY = ball.x * 0.01;
  if (ball.y - 0.18 <= gY) {
    ball.y = gY + 0.18;
    ball.vy *= -BOUNCE;
    ball.vx *= 0.82;
    ball.vz *= 0.82;
    if (Math.abs(ball.vy) < 0.3) {
      ball.vy = 2.5 + Math.random() * 1.5;
      ball.vx = (Math.random() - 0.5) * 1.5;
      ball.vz = (Math.random() - 0.5) * 1.5;
    }
  }
  if (ball.x > 6 || ball.x < -6) ball.vx *= -1;
  if (ball.z > 6 || ball.z < -6) ball.vz *= -1;

  ballGroup.position.set(ball.x, ball.y, ball.z);
  ballGroup.rotation.x = ball.spin;
  ballGroup.rotation.z = ball.spin * 0.7;

  // Camera slow orbit
  const angle = time * 0.0003;
  camera.position.x = Math.sin(angle) * 13;
  camera.position.z = Math.cos(angle) * 13;
  camera.position.y = 4 + Math.sin(time * 0.0005) * 0.5;
  camera.lookAt(0, 1, 0);

  renderer.render(scene, camera);
}

requestAnimationFrame(animate);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ── Helpers ────────────────────────────────────────────────────────────────

function addBuilding(x, y, z, w, h, d, color) {
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.05 });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y + h / 2, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);

  // Windows
  const winMat = new THREE.MeshStandardMaterial({
    color: 0xffcc66, roughness: 0.2, emissive: 0xffaa00, emissiveIntensity: 0.3
  });
  const rows = Math.max(1, Math.floor(h / 3.5));
  const cols = Math.max(1, Math.floor(w / 2.8));
  for (let r = 1; r <= rows; r++) {
    for (let c = 0; c < cols; c++) {
      const wx = x - w / 2 + (c + 0.5) * (w / cols);
      const wy = y + r * (h / (rows + 1));
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.2, 0.1), winMat);
      win.position.set(wx, wy, z + d / 2 + 0.01);
      scene.add(win);
    }
  }
}

function addCar(x, y, z, rot, color) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.rotation.y = rot;

  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.6 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.75, 4.2), bodyMat);
  body.position.y = 0.6;
  body.castShadow = true;
  group.add(body);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.65, 2.2), bodyMat);
  cabin.position.set(0, 1.2, -0.2);
  cabin.castShadow = true;
  group.add(cabin);

  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.3, metalness: 0.8 });
  [[-1.05, 0.35, -1.4], [1.05, 0.35, -1.4], [-1.05, 0.35, 1.4], [1.05, 0.35, 1.4]].forEach(([wx, wy, wz]) => {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.25, 16), wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(wx, wy, wz);
    wheel.castShadow = true;
    group.add(wheel);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.26, 16), rimMat);
    rim.rotation.z = Math.PI / 2;
    rim.position.set(wx, wy, wz);
    group.add(rim);
  });

  const headMat = new THREE.MeshStandardMaterial({ color: 0xffffcc, emissive: 0xffcc66, emissiveIntensity: 0.8, roughness: 0.1 });
  [-0.6, 0.6].forEach(ox => {
    const hd = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.2, 0.1), headMat);
    hd.position.set(ox, 0.65, 2.16);
    group.add(hd);
  });

  scene.add(group);
}
