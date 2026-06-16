import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { state, addCharge } from './state.js';

let controls;
let camera;
let scene;
let simPlane;
let chargeRaycaster;

const keys = { w: false, a: false, s: false, d: false, shift: false };
const MOVE_SPEED = 5.0;
const SPRINT_MULT = 2.2;

const screenCenter = new THREE.Vector2(0, 0);
const mainRaycaster = new THREE.Raycaster();

// ── Grab/drag state ───────────────────────────────────────────────────────────

let grabState = null; // null | { charge, onDrop }

export function initControls(cam, scn) {
  camera = cam;
  scene = scn;

  controls = new PointerLockControls(camera, document.body);
  scene.add(controls.getObject());

  // Invisible plane at simulation table height for raycasting
  simPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(8, 8),
    new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide }),
  );
  simPlane.rotation.x = -Math.PI / 2;
  simPlane.position.y = state.TABLE_Y;
  scene.add(simPlane);

  chargeRaycaster = new THREE.Raycaster();
  chargeRaycaster.params.Points = { threshold: 0.3 };

  document.addEventListener('click', e => {
    if (controls.isLocked) return;
    // Only block locking when clicking actual interactive controls (buttons, inputs, expert panel)
    if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    if (e.target.closest('#expert-panel')) return;
    controls.lock();
  });

  controls.addEventListener('lock', () => {
    document.getElementById('crosshair').style.display = 'block';
    const cts = document.getElementById('click-to-start');
    if (cts) cts.style.display = 'none';
  });

  controls.addEventListener('unlock', () => {
    document.getElementById('crosshair').style.display = 'none';
    state.placing = null;
    grabState = null;
    updateCrosshair();
    // Update overlay to show "resume" state
    const cts = document.getElementById('click-to-start');
    if (cts) {
      cts.style.display = 'flex';
      const p = cts.querySelector('p');
      if (p) p.textContent = 'Click anywhere to resume';
      const hint = cts.querySelector('.cts-hint');
      if (hint) hint.textContent = 'Press Esc to release mouse · Space to pause simulation';
    }
  });

  document.addEventListener('mousemove', () => {
    if (!controls.isLocked) return;
    if (grabState) updateGrabbedCharge();
    if (state.probeActive) updateProbeFromRaycast();
  });

  document.addEventListener('mousedown', e => {
    if (!controls.isLocked || e.button !== 0) return;
    if (state.placing !== null) placeChargeAtCrosshair();
  });

  document.addEventListener('keydown', e => {
    switch (e.code) {
      case 'KeyW': case 'ArrowUp':    keys.w = true; break;
      case 'KeyA': case 'ArrowLeft':  keys.a = true; break;
      case 'KeyS': case 'ArrowDown':  keys.s = true; break;
      case 'KeyD': case 'ArrowRight': keys.d = true; break;
      case 'ShiftLeft': case 'ShiftRight': keys.shift = true; break;

      case 'KeyG':
        if (controls.isLocked) {
          grabState ? releaseCharge() : tryGrabCharge();
        }
        break;
    }
  });

  document.addEventListener('keyup', e => {
    switch (e.code) {
      case 'KeyW': case 'ArrowUp':    keys.w = false; break;
      case 'KeyA': case 'ArrowLeft':  keys.a = false; break;
      case 'KeyS': case 'ArrowDown':  keys.s = false; break;
      case 'KeyD': case 'ArrowRight': keys.d = false; break;
      case 'ShiftLeft': case 'ShiftRight': keys.shift = false; break;
    }
  });

  return controls;
}

// ── Charge placement ──────────────────────────────────────────────────────────

function placeChargeAtCrosshair() {
  mainRaycaster.setFromCamera(screenCenter, camera);
  const hits = mainRaycaster.intersectObject(simPlane);
  if (!hits.length) return;

  const wp = hits[0].point;
  const sx = wp.x / state.SIM_SCALE;
  const sz = wp.z / state.SIM_SCALE;
  const bound = 4.5;
  if (Math.abs(sx) > bound || Math.abs(sz) > bound) {
    notify('Place charge within the simulation table'); return;
  }

  addCharge(sx, sz, state.placing === 'positive' ? 1 : -1);
  notify(state.placing === 'positive' ? 'Positive charge placed' : 'Negative charge placed');
  state.placing = null;
  updateCrosshair();
}

// ── Grab / drag ───────────────────────────────────────────────────────────────

function tryGrabCharge() {
  if (state.charges.length === 0) return;

  mainRaycaster.setFromCamera(screenCenter, camera);

  // Find charge closest to crosshair ray
  let bestCharge = null;
  let bestDist = 0.6; // max grab distance in world units

  for (const charge of state.charges) {
    if (!charge.mesh) continue;
    const d = mainRaycaster.ray.distanceToPoint(charge.mesh.position);
    if (d < bestDist) { bestDist = d; bestCharge = charge; }
  }

  if (!bestCharge) { notify('No charge in sight — aim crosshair at a charge'); return; }

  grabState = { charge: bestCharge };
  notify('Charge grabbed — move mouse to drag, [G] to release');
  updateCrosshair();
}

function updateGrabbedCharge() {
  if (!grabState) return;
  mainRaycaster.setFromCamera(screenCenter, camera);
  const hits = mainRaycaster.intersectObject(simPlane);
  if (!hits.length) return;

  const wp = hits[0].point;
  const sx = wp.x / state.SIM_SCALE;
  const sz = wp.z / state.SIM_SCALE;
  const bound = 4.5;

  grabState.charge.x = Math.max(-bound, Math.min(bound, sx));
  grabState.charge.z = Math.max(-bound, Math.min(bound, sz));

  // Move sphere immediately (cheap)
  const { syncChargeMesh } = window._labViz || {};
  if (syncChargeMesh) syncChargeMesh(grabState.charge);

  // Debounce field rebuild during drag
  clearTimeout(grabState._rebuildTimer);
  grabState._rebuildTimer = setTimeout(() => {
    state.needsRebuild = true;
  }, 120);
}

function releaseCharge() {
  if (!grabState) return;
  clearTimeout(grabState._rebuildTimer);
  grabState = null;
  state.needsRebuild = true;
  notify('Charge released');
  updateCrosshair();
}

export function isGrabbing() { return grabState !== null; }

// ── Probe ─────────────────────────────────────────────────────────────────────

function updateProbeFromRaycast() {
  mainRaycaster.setFromCamera(screenCenter, camera);
  const hits = mainRaycaster.intersectObject(simPlane);
  if (hits.length) state.probeWorldPos = hits[0].point;
}

// ── Movement ──────────────────────────────────────────────────────────────────

export function updateMovement(dt) {
  if (!controls.isLocked) return;
  const speed = MOVE_SPEED * (keys.shift ? SPRINT_MULT : 1.0) * dt;

  if (keys.w) controls.moveForward(speed);
  if (keys.s) controls.moveForward(-speed);
  if (keys.a) controls.moveRight(-speed);
  if (keys.d) controls.moveRight(speed);

  const pos = controls.getObject().position;
  pos.y = Math.max(1.0, Math.min(8.0, pos.y));
  const hr = Math.sqrt(pos.x ** 2 + pos.z ** 2);
  if (hr > 17) { pos.x *= 17 / hr; pos.z *= 17 / hr; }

  if (state.probeActive) updateProbeFromRaycast();
}

export function getCameraPosition() {
  return controls?.getObject()?.position ?? null;
}

export function setPlacing(type) {
  state.placing = type;
  grabState = null;
  updateCrosshair();
  if (type && !controls.isLocked) controls.lock();
}

function updateCrosshair() {
  const el = document.getElementById('crosshair');
  if (!el) return;
  if (grabState) {
    el.style.color = '#00ff88'; el.textContent = '⊙';
  } else if (state.placing === 'positive') {
    el.style.color = '#ff4444'; el.textContent = '+';
  } else if (state.placing === 'negative') {
    el.style.color = '#4488ff'; el.textContent = '−';
  } else {
    el.style.color = '#ffffff'; el.textContent = '·';
  }
}

function notify(msg) {
  const el = document.getElementById('notification');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._timeout);
  el._timeout = setTimeout(() => el.classList.remove('show'), 2500);
}

export function getControls() { return controls; }
