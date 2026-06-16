// Visualization of the Laplace solver grid
// Renders potential as a canvas heatmap + field arrows + boundary indicators

import * as THREE from 'three';
import { BoundaryType, LaplaceGrid } from './laplaceSolver.js';

const PANEL_SIZE = 5.6; // world units
let group = null;
let canvas = null;
let ctx = null;
let tex = null;
let planeMesh = null;
let arrowGroup = null;
let statusSprite = null;

export let grid = null;
let solverTimer = null;

export function initBoundaryViz(scene, worldPos) {
  grid = new LaplaceGrid(60);
  group = new THREE.Group();
  group.position.copy(worldPos);
  scene.add(group);

  // Backing canvas for potential heatmap
  canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  ctx = canvas.getContext('2d');

  tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;

  const geo = new THREE.PlaneGeometry(PANEL_SIZE, PANEL_SIZE);
  planeMesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    side: THREE.DoubleSide,
  }));
  planeMesh.rotation.x = -Math.PI / 2;
  group.add(planeMesh);

  // Border rim
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(PANEL_SIZE / 2 + 0.08, 0.04, 6, 64),
    new THREE.MeshStandardMaterial({ color: 0x00e5ff, emissive: 0x00e5ff, emissiveIntensity: 0.8 }),
  );
  rim.rotation.x = Math.PI / 2;
  group.add(rim);

  arrowGroup = new THREE.Group();
  group.add(arrowGroup);

  // Status label
  statusSprite = makeStatusLabel('LAPLACE SOLVER — IDLE');
  statusSprite.position.set(0, 0.5, -PANEL_SIZE / 2 - 0.3);
  group.add(statusSprite);

  // Default boundary setup: center high plate, outer grounded
  setupDefaultBoundaries();
  redrawCanvas();

  return group;
}

function setupDefaultBoundaries() {
  if (!grid) return;
  const N = grid.N;
  // Top conductor: φ = +5
  grid.setRect(Math.floor(N * 0.2), Math.floor(N * 0.35), Math.floor(N * 0.22), Math.floor(N * 0.65), BoundaryType.DIRICHLET, 5);
  // Bottom conductor: φ = -5
  grid.setRect(Math.floor(N * 0.78), Math.floor(N * 0.35), Math.floor(N * 0.80), Math.floor(N * 0.65), BoundaryType.DIRICHLET, -5);
}

export function runSolver(iterPerFrame = 30) {
  if (!grid) return;
  clearTimeout(solverTimer);

  function tick() {
    const res = grid.iterate(iterPerFrame);
    redrawCanvas();
    updateArrows();
    updateStatusLabel(`iter ${grid.iteration} | Δ ${res.toExponential(2)}`);

    if (!grid.converged && grid.iteration < 5000) {
      solverTimer = setTimeout(tick, 0);
    } else {
      updateStatusLabel(grid.converged
        ? `CONVERGED at iter ${grid.iteration}`
        : `STOPPED at iter ${grid.iteration}`
      );
    }
  }

  grid.reset();
  tick();
}

function redrawCanvas() {
  if (!grid || !ctx) return;
  const N = grid.N;
  const { phi, btype } = grid;

  let minPhi = Infinity, maxPhi = -Infinity;
  for (let i = 0; i < N * N; i++) {
    if (phi[i] < minPhi) minPhi = phi[i];
    if (phi[i] > maxPhi) maxPhi = phi[i];
  }
  const range = Math.max(Math.abs(minPhi), Math.abs(maxPhi), 0.1);

  const imgData = ctx.createImageData(256, 256);
  const d = imgData.data;
  const scale = 256 / N;

  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const t = phi[r * N + c] / range;
      const bt = btype[r * N + c];

      let R, G, B;
      if (bt === BoundaryType.DIRICHLET || bt === BoundaryType.GROUNDED) {
        R = 180; G = 140; B = 50; // gold for boundaries
      } else if (t > 0) {
        R = Math.round(t * 200); G = Math.round(t * 25); B = 0;
      } else {
        const nt = -t;
        R = 0; G = Math.round(nt * 12); B = Math.round(nt * 200);
      }

      // Fill the scaled pixel block
      const px0 = Math.floor(c * scale);
      const py0 = Math.floor(r * scale);
      const px1 = Math.floor((c + 1) * scale);
      const py1 = Math.floor((r + 1) * scale);

      for (let py = py0; py < py1; py++) {
        for (let px = px0; px < px1; px++) {
          const idx = (py * 256 + px) * 4;
          d[idx] = R; d[idx + 1] = G; d[idx + 2] = B;
          d[idx + 3] = bt === BoundaryType.INTERIOR ? 220 : 255;
        }
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
  tex.needsUpdate = true;
}

function updateArrows() {
  while (arrowGroup.children.length) arrowGroup.remove(arrowGroup.children[0]);

  if (!grid) return;
  const N = grid.N;
  const step = 8; // sample every 8 cells

  for (let r = step; r < N - step; r += step) {
    for (let c = step; c < N - step; c += step) {
      const [ex, ez] = grid.fieldAt(r, c);
      const mag = Math.sqrt(ex * ex + ez * ez);
      if (mag < 0.01) continue;

      const wx = (c / N - 0.5) * PANEL_SIZE;
      const wz = (r / N - 0.5) * PANEL_SIZE;
      const origin = new THREE.Vector3(wx, 0.05, wz);
      const dir = new THREE.Vector3(ex / mag, 0, ez / mag);
      const len = Math.min(0.35, mag * 0.08 + 0.05);

      const arrow = new THREE.ArrowHelper(dir, origin, len, 0x00e5ff, 0.08, 0.05);
      arrowGroup.add(arrow);
    }
  }
}

function makeStatusLabel(text) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 64;
  const cx = c.getContext('2d');
  cx.fillStyle = '#00e5ff';
  cx.font = '20px monospace';
  cx.textAlign = 'center';
  cx.textBaseline = 'middle';
  cx.fillText(text, 256, 32);
  const t = new THREE.CanvasTexture(c);
  const mat = new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false });
  const s = new THREE.Sprite(mat);
  s.scale.set(3, 0.4, 1);
  s.userData.canvas = c;
  s.userData.ctx = cx;
  s.userData.tex = t;
  return s;
}

function updateStatusLabel(text) {
  if (!statusSprite) return;
  const { canvas: c, ctx: cx, tex: t } = statusSprite.userData;
  cx.clearRect(0, 0, 512, 64);
  cx.fillStyle = '#00e5ff';
  cx.font = '20px monospace';
  cx.textAlign = 'center';
  cx.textBaseline = 'middle';
  cx.fillText(text, 256, 32);
  t.needsUpdate = true;
}

export function setBoundaryVizVisible(v) {
  if (group) group.visible = v;
}

export function getBoundaryGroup() { return group; }

// Interactive: set cell at normalized (u,v) to type/value
export function paintCell(u, v, type, value = 0) {
  if (!grid) return;
  const r = Math.floor(v * grid.N);
  const c = Math.floor(u * grid.N);
  grid.setCell(r, c, type, value);
  redrawCanvas();
}
