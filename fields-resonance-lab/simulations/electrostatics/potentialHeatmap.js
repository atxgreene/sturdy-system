import * as THREE from 'three';
import { state } from '../../core/state.js';
import { electricPotential2D } from './pointCharges.js';

const SIM_BOUNDS = 5.0;
const N = 64;

let mesh = null;
let canvas = null;
let ctx = null;
let tex = null;
let visible = false;

export function initHeatmap(scene) {
  canvas = document.createElement('canvas');
  canvas.width = N;
  canvas.height = N;
  ctx = canvas.getContext('2d');

  tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;

  const side = SIM_BOUNDS * 2 * state.SIM_SCALE;
  const geo = new THREE.PlaneGeometry(side, side);

  mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    opacity: 0.62,
    depthWrite: false,
    side: THREE.DoubleSide,
  }));

  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = state.TABLE_Y + 0.012;
  mesh.visible = false;
  scene.add(mesh);
  return mesh;
}

export function rebuildHeatmap(charges) {
  if (!mesh || !visible || charges.length === 0) {
    if (mesh && visible) clearCanvas();
    return;
  }

  const step = (2 * SIM_BOUNDS) / N;
  const imgData = ctx.createImageData(N, N);
  const d = imgData.data;

  const phis = new Float32Array(N * N);
  let absMax = 0.01;

  for (let py = 0; py < N; py++) {
    for (let px = 0; px < N; px++) {
      // Canvas x → sim x; canvas y top=0 → world z near (canvas flipY handled by Three)
      const x = -SIM_BOUNDS + (px + 0.5) * step;
      const z = -SIM_BOUNDS + (py + 0.5) * step;
      const phi = Math.max(-10, Math.min(10, electricPotential2D(charges, x, z)));
      phis[py * N + px] = phi;
      if (Math.abs(phi) > absMax) absMax = Math.abs(phi);
    }
  }

  for (let i = 0; i < N * N; i++) {
    const t = phis[i] / absMax; // −1 to +1
    const idx = i * 4;

    if (t > 0) {
      d[idx]     = Math.round(t * 200);
      d[idx + 1] = Math.round(t * 28);
      d[idx + 2] = 0;
      d[idx + 3] = Math.round(t * 210 + 18);
    } else {
      const nt = -t;
      d[idx]     = 0;
      d[idx + 1] = Math.round(nt * 12);
      d[idx + 2] = Math.round(nt * 210);
      d[idx + 3] = Math.round(nt * 210 + 18);
    }
  }

  ctx.putImageData(imgData, 0, 0);
  tex.needsUpdate = true;
}

function clearCanvas() {
  ctx.clearRect(0, 0, N, N);
  tex.needsUpdate = true;
}

export function setHeatmapVisible(v) {
  visible = v;
  if (mesh) {
    mesh.visible = v;
    if (!v) clearCanvas();
  }
}

export function isHeatmapVisible() { return visible; }
