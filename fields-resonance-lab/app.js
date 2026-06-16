import * as THREE from 'three';
import { buildScene } from './core/scene.js';
import { initControls, updateMovement, setPlacing, getControls } from './core/controls.js';
import { state, clearCharges, addCharge } from './core/state.js';
import { initVR } from './core/vr.js';
import { registerWithMuseum } from './core/registry.js';
import {
  getSimGroup,
  rebuildSimulation,
  updateProbe,
  animateCharges,
  setFieldLinesVisible,
  setEquipotentialsVisible,
} from './simulations/electrostatics/fieldVisualizer.js';
import { initHUD, updateHUD, toggleControlsRef } from './ui/hud.js';
import { initModeSwitcher, switchMode } from './ui/modeSwitcher.js';
import { initExpertPanel, updateExpertReadout } from './ui/expertPanel.js';

// ── Init ────────────────────────────────────────────────────────────────────

const canvas = document.getElementById('lab-canvas');
const { scene, renderer, camera, motes } = buildScene(canvas);
const controls = initControls(camera, scene);

initVR(renderer);
registerWithMuseum();

scene.add(getSimGroup());

initHUD();
initModeSwitcher();
initExpertPanel();

// Seed a default positive charge to greet the user
addCharge(0, 0, 1.0);
state.needsRebuild = true;

// ── Mode buttons (always clickable, pointer-lock-safe) ───────────────────────

function buildModeBtns() {
  const container = document.createElement('div');
  container.id = 'mode-btns';
  container.innerHTML = `
    <button class="mbtn" data-mode="museum" title="Museum Mode [M]">M</button>
    <button class="mbtn" data-mode="student" title="Student Mode [I]">S</button>
    <button class="mbtn" data-mode="expert" title="Expert Mode [X]">X</button>
    <button class="mbtn" data-mode="sandbox" title="Sandbox Mode [Z]">∞</button>
  `;
  document.getElementById('ui-root').appendChild(container);
  container.querySelectorAll('.mbtn').forEach(btn => {
    btn.addEventListener('click', () => switchMode(btn.dataset.mode));
  });
}

buildModeBtns();

// ── Keyboard Handler ────────────────────────────────────────────────────────

document.addEventListener('keydown', e => {
  if (document.activeElement?.tagName === 'INPUT') return;

  const locked = getControls()?.isLocked;

  switch (e.code) {
    // Charge placement (works while locked)
    case 'KeyC':
      setPlacing('positive');
      showNotification('Click table to place + charge');
      break;

    case 'KeyN':
      setPlacing('negative');
      showNotification('Click table to place − charge');
      break;

    // Visualization toggles
    case 'KeyF':
      state.vis.fieldLines = !state.vis.fieldLines;
      setFieldLinesVisible(state.vis.fieldLines);
      showNotification(`Field lines ${state.vis.fieldLines ? 'on' : 'off'}`);
      break;

    case 'KeyP':
      state.vis.equipotentials = !state.vis.equipotentials;
      setEquipotentialsVisible(state.vis.equipotentials);
      showNotification(`Equipotentials ${state.vis.equipotentials ? 'on' : 'off'}`);
      break;

    case 'KeyT':
      state.probeActive = !state.probeActive;
      showNotification(`Field probe ${state.probeActive ? 'active — aim at table' : 'off'}`);
      break;

    case 'KeyR':
      clearCharges();
      addCharge(0, 0, 1.0);
      state.needsRebuild = true;
      showNotification('Simulation reset');
      break;

    // Mode switching — only when NOT navigating (pointer not locked)
    // Use M, I (not S to avoid WASD conflict), X, Z
    case 'KeyM': if (!locked) switchMode('museum'); break;
    case 'KeyI': if (!locked) switchMode('student'); break;
    case 'KeyX': if (!locked) switchMode('expert'); break;
    case 'KeyZ': if (!locked) switchMode('sandbox'); break;

    case 'KeyH': toggleControlsRef(); break;

    case 'KeyV':
      document.getElementById('vr-button')?.click();
      break;

    case 'Space':
      e.preventDefault();
      state.paused = !state.paused;
      showNotification(state.paused ? 'Paused' : 'Resumed');
      break;
  }
});

// ── Notification Helper ─────────────────────────────────────────────────────

function showNotification(msg) {
  const el = document.getElementById('notification');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._timeout);
  el._timeout = setTimeout(() => el.classList.remove('show'), 2500);
}

// ── Loading Screen ──────────────────────────────────────────────────────────

const loadingScreen = document.getElementById('loading-screen');
const enterBtn = document.getElementById('enter-lab-btn');
const progress = document.getElementById('loading-progress');
const status = document.getElementById('loading-status');

const steps = [
  [200, 'Calibrating field solvers...'],
  [450, 'Building chamber geometry...'],
  [650, 'Loading atmospheric effects...'],
  [850, 'Charging the Boundary Loom...'],
  [1050, 'Ready.'],
];

steps.forEach(([delay, msg]) => {
  setTimeout(() => {
    if (status) status.textContent = msg;
    if (progress) progress.style.width = `${(delay / 1050) * 100}%`;
  }, delay);
});

setTimeout(() => {
  if (enterBtn) {
    enterBtn.style.display = 'block';
    enterBtn.addEventListener('click', () => {
      loadingScreen.classList.add('fade-out');
      setTimeout(() => loadingScreen.remove(), 600);
    });
  }
}, 1150);

// ── Animation Loop ──────────────────────────────────────────────────────────

const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.getElapsedTime();

  if (!state.paused) {
    updateMovement(dt);

    if (motes) motes.rotation.y = t * 0.015;

    animateCharges(t);

    if (state.needsRebuild) {
      rebuildSimulation();
    }

    if (state.probeActive && state.probeWorldPos) {
      updateProbe(state.probeWorldPos);
    }

    updateHUD();
    if (state.mode === 'expert') updateExpertReadout();
  }

  renderer.render(scene, camera);
});
