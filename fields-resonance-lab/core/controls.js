import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { state, addCharge } from './state.js';

let controls;
let camera;
let scene;
let simPlane;    // invisible raycasting plane at TABLE_Y

const keys = { w: false, a: false, s: false, d: false, shift: false };
const MOVE_SPEED = 5.0;
const SPRINT_MULT = 2.2;

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

export function initControls(cam, scn) {
  camera = cam;
  scene = scn;

  controls = new PointerLockControls(camera, document.body);
  scene.add(controls.getObject());

  // Invisible plane at table height for raycasting charge placement
  simPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(7, 7),
    new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide }),
  );
  simPlane.rotation.x = -Math.PI / 2;
  simPlane.position.y = state.TABLE_Y;
  scene.add(simPlane);

  // Lock on click — skip if click landed on a UI element
  document.addEventListener('click', e => {
    if (controls.isLocked) return;
    if (e.target.closest('#ui-root') || e.target.closest('#expert-panel')) return;
    controls.lock();
  });

  controls.addEventListener('lock', () => {
    document.getElementById('crosshair').style.display = 'block';
    document.getElementById('click-to-start').style.display = 'none';
  });

  controls.addEventListener('unlock', () => {
    document.getElementById('crosshair').style.display = 'none';
    document.getElementById('click-to-start').style.display = 'flex';
    state.placing = null;
  });

  // Mouse move for probe
  document.addEventListener('mousemove', onMouseMove);

  // Click for charge placement
  document.addEventListener('mousedown', onMouseDown);

  // Keyboard movement
  document.addEventListener('keydown', e => {
    switch (e.code) {
      case 'KeyW': case 'ArrowUp': keys.w = true; break;
      case 'KeyA': case 'ArrowLeft': keys.a = true; break;
      case 'KeyS': case 'ArrowDown': keys.s = true; break;
      case 'KeyD': case 'ArrowRight': keys.d = true; break;
      case 'ShiftLeft': case 'ShiftRight': keys.shift = true; break;
    }
  });

  document.addEventListener('keyup', e => {
    switch (e.code) {
      case 'KeyW': case 'ArrowUp': keys.w = false; break;
      case 'KeyA': case 'ArrowLeft': keys.a = false; break;
      case 'KeyS': case 'ArrowDown': keys.s = false; break;
      case 'KeyD': case 'ArrowRight': keys.d = false; break;
      case 'ShiftLeft': case 'ShiftRight': keys.shift = false; break;
    }
  });

  return controls;
}

function onMouseMove(e) {
  if (!controls.isLocked) return;
  mouse.set(0, 0); // use crosshair center when locked
  updateProbeFromRaycast();
}

function onMouseDown(e) {
  if (!controls.isLocked) return;
  if (e.button !== 0) return;

  if (state.placing !== null) {
    placeChargeAtCrosshair();
  }
}

function placeChargeAtCrosshair() {
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const hits = raycaster.intersectObject(simPlane);
  if (hits.length === 0) return;

  const worldPt = hits[0].point;
  const sx = worldPt.x / state.SIM_SCALE;
  const sz = worldPt.z / state.SIM_SCALE;

  // Clamp to simulation bounds
  const bound = 4.5;
  if (Math.abs(sx) > bound || Math.abs(sz) > bound) return;

  const q = state.placing === 'positive' ? 1.0 : -1.0;
  addCharge(sx, sz, q);

  notify(state.placing === 'positive' ? 'Positive charge placed' : 'Negative charge placed');
  state.placing = null;
  updatePlacingCursor();
}

function updateProbeFromRaycast() {
  if (!state.probeActive) return;
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const hits = raycaster.intersectObject(simPlane);
  if (hits.length > 0) {
    state.probeWorldPos = hits[0].point;
  }
}

export function updateMovement(dt) {
  if (!controls.isLocked) return;

  const speed = MOVE_SPEED * (keys.shift ? SPRINT_MULT : 1.0) * dt;

  if (keys.w) controls.moveForward(speed);
  if (keys.s) controls.moveForward(-speed);
  if (keys.a) controls.moveRight(-speed);
  if (keys.d) controls.moveRight(speed);

  // Clamp vertical position
  const pos = controls.getObject().position;
  pos.y = Math.max(1.0, Math.min(8.0, pos.y));

  // Clamp to chamber radius
  const hr = Math.sqrt(pos.x ** 2 + pos.z ** 2);
  if (hr > 17) {
    pos.x *= 17 / hr;
    pos.z *= 17 / hr;
  }

  updateProbeFromRaycast();
}

export function setPlacing(type) {
  state.placing = type;
  updatePlacingCursor();
  if (type && !controls.isLocked) controls.lock();
}

function updatePlacingCursor() {
  const crosshair = document.getElementById('crosshair');
  if (!crosshair) return;
  if (state.placing === 'positive') {
    crosshair.style.color = '#ff4444';
    crosshair.textContent = '+';
  } else if (state.placing === 'negative') {
    crosshair.style.color = '#4488ff';
    crosshair.textContent = '−';
  } else {
    crosshair.style.color = '#ffffff';
    crosshair.textContent = '·';
  }
}

function notify(msg) {
  const el = document.getElementById('notification');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._timeout);
  el._timeout = setTimeout(() => el.classList.remove('show'), 2200);
}

export function getControls() { return controls; }
