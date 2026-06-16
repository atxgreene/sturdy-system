import * as THREE from 'three';
import { buildScene } from './core/scene.js';
import { initControls, updateMovement, setPlacing, getControls, getCameraPosition } from './core/controls.js';
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
  setForceVectorsVisible,
  syncChargeMesh,
} from './simulations/electrostatics/fieldVisualizer.js';
import { initFlowParticles, updateFlowParticles, setFlowActive, isFlowActive } from './simulations/electrostatics/flowParticles.js';
import { initHeatmap, rebuildHeatmap, setHeatmapVisible, isHeatmapVisible } from './simulations/electrostatics/potentialHeatmap.js';
import { initBoundaryViz, runSolver, setBoundaryVizVisible } from './simulations/boundaries/boundaryViz.js';
import { initStandingWaves, setWaveVisible, isWaveVisible, getWaveUpdate } from './simulations/vibration/standingWaves.js';
import { initHUD, updateHUD, toggleControlsRef } from './ui/hud.js';
import { initModeSwitcher, switchMode } from './ui/modeSwitcher.js';
import { initExpertPanel, updateExpertReadout } from './ui/expertPanel.js';
import { initPresetsPanel, loadPreset, saveToLocal, loadFromLocal } from './ui/presets.js';

// ── Expose syncChargeMesh for controls drag ───────────────────────────────────
window._labViz = { syncChargeMesh };

// ── Init ──────────────────────────────────────────────────────────────────────

const canvas = document.getElementById('lab-canvas');
const { scene, renderer, camera, motes, wings } = buildScene(canvas);
const controls = initControls(camera, scene);

initVR(renderer);
registerWithMuseum();

scene.add(getSimGroup());

// Electrostatics extras
initFlowParticles(scene);
initHeatmap(scene);

// Boundary conditions theater (Wing 2 position)
const wing2Pos = wings[1].worldPos.clone();
wing2Pos.y = 0.05;
wing2Pos.multiplyScalar(0.38); // bring it closer to center
initBoundaryViz(scene, wing2Pos);
setBoundaryVizVisible(false);

// Standing wave (Wing 4 position)
const wave = initStandingWaves(scene, wings[3].worldPos.clone().multiplyScalar(0.35));
const updateWave = getWaveUpdate();

// UI
initHUD();
initModeSwitcher();
initExpertPanel();
initPresetsPanel();

// Default charge
addCharge(0, 0, 1.0);
state.needsRebuild = true;

// ── Wing approach detection ───────────────────────────────────────────────────

const APPROACH_DIST = 7.0;
const APPROACH_RETREAT = 9.0;

function updateWingApproach() {
  const camPos = getCameraPosition();
  if (!camPos) return;

  for (const wing of wings) {
    const dist = camPos.distanceTo(wing.worldPos);
    const approaching = dist < APPROACH_DIST;

    if (approaching && !wing.wasApproaching) {
      wing.glowMat.emissiveIntensity = 2.0;
      wing.glowMat.opacity = 1.0;
      showNotification(`${wing.shortName} — ${wing.name} (${wing.version})`);
    } else if (!approaching && wing.wasApproaching) {
      wing.glowMat.emissiveIntensity = 0.8;
      wing.glowMat.opacity = 0.85;
    }
    wing.wasApproaching = approaching;
  }
}

// ── Keyboard Handler ──────────────────────────────────────────────────────────

document.addEventListener('keydown', e => {
  if (document.activeElement?.tagName === 'INPUT') return;

  const locked = getControls()?.isLocked;

  switch (e.code) {
    // Charge placement
    case 'KeyC': setPlacing('positive'); showNotification('Click table to place + charge'); break;
    case 'KeyN': setPlacing('negative'); showNotification('Click table to place − charge'); break;

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

    case 'KeyO':
      state.vis.forceVectors = !state.vis.forceVectors;
      setForceVectorsVisible(state.vis.forceVectors);
      state.needsRebuild = true;
      showNotification(`Force vectors ${state.vis.forceVectors ? 'on' : 'off'}`);
      break;

    case 'KeyT':
      state.probeActive = !state.probeActive;
      showNotification(`Field probe ${state.probeActive ? 'active — aim at table' : 'off'}`);
      break;

    // Flow particles
    case 'KeyL':
      setFlowActive(!isFlowActive());
      showNotification(`Flow particles ${isFlowActive() ? 'on' : 'off'}`);
      break;

    // Potential heatmap
    case 'KeyK':
      setHeatmapVisible(!isHeatmapVisible());
      if (isHeatmapVisible()) rebuildHeatmap(state.charges);
      showNotification(`Potential heatmap ${isHeatmapVisible() ? 'on' : 'off'}`);
      break;

    // Boundary conditions panel
    case 'KeyB':
      toggleBoundaryPanel();
      break;

    // Standing wave
    case 'KeyQ':
      setWaveVisible(!isWaveVisible());
      showNotification(`Standing wave ${isWaveVisible() ? 'on' : 'off'}`);
      break;

    // Presets (1-7)
    case 'Digit1': loadPreset('single'); break;
    case 'Digit2': loadPreset('dipole'); break;
    case 'Digit3': loadPreset('quadrupole'); break;
    case 'Digit4': loadPreset('capacitor'); break;
    case 'Digit5': loadPreset('faraday'); break;
    case 'Digit6': loadPreset('triple'); break;
    case 'Digit7': loadPreset('line'); break;

    // Save/load
    case 'F5': e.preventDefault(); saveToLocal(0); break;
    case 'F9': e.preventDefault(); loadFromLocal(0); break;

    // Reset
    case 'KeyR':
      clearCharges();
      addCharge(0, 0, 1.0);
      state.needsRebuild = true;
      showNotification('Simulation reset');
      break;

    // Modes (only when not navigating)
    case 'KeyM': if (!locked) switchMode('museum'); break;
    case 'KeyI': if (!locked) switchMode('student'); break;
    case 'KeyX': if (!locked) switchMode('expert'); break;
    case 'KeyZ': if (!locked) switchMode('sandbox'); break;

    case 'KeyH': toggleControlsRef(); break;
    case 'KeyV': document.getElementById('vr-button')?.click(); break;

    case 'Space':
      e.preventDefault();
      state.paused = !state.paused;
      showNotification(state.paused ? 'Paused' : 'Resumed');
      break;
  }
});

// ── Boundary panel toggle ─────────────────────────────────────────────────────

let boundaryPanelVisible = false;

function toggleBoundaryPanel() {
  boundaryPanelVisible = !boundaryPanelVisible;
  setBoundaryVizVisible(boundaryPanelVisible);
  if (boundaryPanelVisible) {
    runSolver();
    showNotification('Boundary Conditions Theater — [B] to close');
  } else {
    showNotification('Boundary panel hidden');
  }
}

// ── Notification ──────────────────────────────────────────────────────────────

function showNotification(msg) {
  const el = document.getElementById('notification');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._timeout);
  el._timeout = setTimeout(() => el.classList.remove('show'), 2500);
}

// ── Loading screen ────────────────────────────────────────────────────────────

const loadingScreen = document.getElementById('loading-screen');
const enterBtn = document.getElementById('enter-lab-btn');
const progress = document.getElementById('loading-progress');
const statusEl = document.getElementById('loading-status');

[
  [150, 'Calibrating field solvers...'],
  [350, 'Building chamber geometry...'],
  [550, 'Loading atmospheric effects...'],
  [750, 'Initializing flow particles...'],
  [950, 'Charging the Boundary Loom...'],
  [1100, 'Ready.'],
].forEach(([delay, msg]) => {
  setTimeout(() => {
    if (statusEl) statusEl.textContent = msg;
    if (progress) progress.style.width = `${(delay / 1100) * 100}%`;
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
}, 1200);

// ── Animation Loop ────────────────────────────────────────────────────────────

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
      if (isHeatmapVisible()) rebuildHeatmap(state.charges);
    }

    if (state.probeActive && state.probeWorldPos) updateProbe(state.probeWorldPos);
    if (isFlowActive()) updateFlowParticles(dt);
    if (isWaveVisible()) updateWave(dt);

    updateWingApproach();
    updateHUD();
    if (state.mode === 'expert') updateExpertReadout();
  }

  renderer.render(scene, camera);
});
