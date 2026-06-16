import * as THREE from 'three';
import { state } from '../../core/state.js';
import { electricField2D, probeAt } from './pointCharges.js';

// ── Groups ────────────────────────────────────────────────────────────────────

const simGroup     = new THREE.Group();
const fieldLinesGroup  = new THREE.Group();
const equipotGroup = new THREE.Group();
const chargeGroup  = new THREE.Group();
const probeGroup   = new THREE.Group();
const forceGroup   = new THREE.Group();

simGroup.add(fieldLinesGroup, equipotGroup, chargeGroup, probeGroup, forceGroup);

// ── Materials (shared) ────────────────────────────────────────────────────────

const positiveMat = new THREE.MeshStandardMaterial({
  color: 0xff3333, emissive: 0xff1100, emissiveIntensity: 0.75,
  roughness: 0.2, metalness: 0.1,
});

const negativeMat = new THREE.MeshStandardMaterial({
  color: 0x3388ff, emissive: 0x0044ff, emissiveIntensity: 0.75,
  roughness: 0.2, metalness: 0.1,
});

const fieldLineMat = new THREE.LineBasicMaterial({
  color: 0x00e5ff, transparent: true, opacity: 0.72, depthWrite: false,
});

const equipotMat = new THREE.LineBasicMaterial({
  color: 0xffd700, transparent: true, opacity: 0.55, depthWrite: false,
});

// ── Web Worker ────────────────────────────────────────────────────────────────

let worker = null;
let pendingJob = null;
let workerBusy = false;
let workerJobId = 0;

function getWorker() {
  if (!worker) {
    try {
      worker = new Worker(new URL('../../workers/fieldWorker.js', import.meta.url));
      worker.onmessage = onWorkerResult;
      worker.onerror = () => { worker = null; workerBusy = false; };
    } catch {
      worker = null;
    }
  }
  return worker;
}

function onWorkerResult({ data }) {
  const { fieldLines, contours, id } = data;
  workerBusy = false;

  if (id !== workerJobId) return; // stale result

  applyFieldLines(fieldLines);
  applyContours(contours);
  applyForceVectors();

  // If another job was queued while we were busy, run it now
  if (pendingJob) {
    const job = pendingJob;
    pendingJob = null;
    dispatchWorker(job.charges, job.config);
  }
}

function dispatchWorker(charges, config) {
  const w = getWorker();
  if (!w) {
    // Worker unavailable: fall back to sync computation on main thread
    rebuildSync(charges, config);
    return;
  }

  const id = ++workerJobId;

  if (workerBusy) {
    pendingJob = { charges, config };
    return;
  }

  workerBusy = true;
  w.postMessage({
    charges: charges.map(c => ({ x: c.x, z: c.z, q: c.q })),
    config,
    id,
  });
}

// ── Sync fallback (used when worker unavailable) ─────────────────────────────

import {
  fieldLineSeeds,
  traceFieldLine2D,
  computeContourLines,
} from './pointCharges.js';

function rebuildSync(charges, config) {
  const { lineSeeds, stepSize, maxSteps, gridN, equipotentialLevels } = config;
  const BOUNDS = 5.5;
  const hasPositive = charges.some(c => c.q > 0);
  const fieldLines = [];

  for (const charge of charges) {
    if (charge.q > 0) {
      for (const [sx, sz] of fieldLineSeeds(charge, lineSeeds)) {
        const pts = traceFieldLine2D(charges, sx, sz, true, stepSize, maxSteps, BOUNDS);
        if (pts.length >= 2) fieldLines.push(pts);
      }
    } else if (!hasPositive) {
      for (const [sx, sz] of fieldLineSeeds(charge, lineSeeds, 1.8)) {
        const pts = traceFieldLine2D(charges, sx, sz, false, stepSize, 80, BOUNDS);
        if (pts.length >= 2) fieldLines.push(pts);
      }
    }
  }

  const contours = computeContourLines(charges, gridN, 5.0, equipotentialLevels);
  applyFieldLines(fieldLines);
  applyContours(contours);
  applyForceVectors();
}

// ── Geometry builders ─────────────────────────────────────────────────────────

function simToWorld(sx, sz) {
  return new THREE.Vector3(sx * state.SIM_SCALE, state.TABLE_Y + 0.04, sz * state.SIM_SCALE);
}

function clearGroup(g) {
  while (g.children.length) {
    g.children[0].geometry?.dispose();
    g.remove(g.children[0]);
  }
}

function applyFieldLines(lines) {
  clearGroup(fieldLinesGroup);
  if (!state.vis.fieldLines) return;

  for (const pts of lines) {
    if (pts.length < 2) continue;
    const verts = pts.flatMap(([sx, sz]) => {
      const w = simToWorld(sx, sz);
      return [w.x, w.y, w.z];
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    fieldLinesGroup.add(new THREE.Line(geo, fieldLineMat));
  }
}

function applyContours(contours) {
  clearGroup(equipotGroup);
  if (!state.vis.equipotentials) return;

  const verts = [];
  for (const { segs } of contours) {
    for (let i = 0; i < segs.length; i += 2) {
      const a = simToWorld(segs[i][0], segs[i][1]);
      const b = simToWorld(segs[i + 1][0], segs[i + 1][1]);
      verts.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
  }
  if (verts.length === 0) return;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  equipotGroup.add(new THREE.LineSegments(geo, equipotMat));
}

function applyForceVectors() {
  clearGroup(forceGroup);
  if (!state.vis.forceVectors || state.charges.length < 2) return;

  for (const charge of state.charges) {
    let Fx = 0, Fz = 0;
    for (const other of state.charges) {
      if (other.id === charge.id) continue;
      const dx = charge.x - other.x;
      const dz = charge.z - other.z;
      const r2 = dx * dx + dz * dz;
      if (r2 < 0.01) continue;
      const r3 = r2 * Math.sqrt(r2);
      Fx += charge.q * other.q * dx / r3;
      Fz += charge.q * other.q * dz / r3;
    }
    const mag = Math.sqrt(Fx * Fx + Fz * Fz);
    if (mag < 0.01) continue;

    const origin = simToWorld(charge.x, charge.z);
    origin.y = state.TABLE_Y + 0.12;
    const dir = new THREE.Vector3(Fx / mag, 0, Fz / mag);
    const len = Math.min(0.7, 0.12 + Math.log1p(mag) * 0.15);
    const color = charge.q > 0 ? 0xff4444 : 0x4488ff;
    forceGroup.add(new THREE.ArrowHelper(dir, origin, len, color, 0.1, 0.06));
  }
}

// ── Charge sphere builder ─────────────────────────────────────────────────────

function buildChargeMesh(charge) {
  const geo = new THREE.SphereGeometry(0.1, 20, 20);
  const mat = charge.q > 0 ? positiveMat.clone() : negativeMat.clone();
  const mesh = new THREE.Mesh(geo, mat);
  const wpos = simToWorld(charge.x, charge.z);
  mesh.position.copy(wpos);
  mesh.position.y = state.TABLE_Y + 0.1;
  mesh.userData.chargeId = charge.id;

  const ringGeo = new THREE.TorusGeometry(0.14, 0.012, 8, 32);
  const ringMat = new THREE.MeshStandardMaterial({
    color: charge.q > 0 ? 0xff4444 : 0x4488ff,
    emissive: charge.q > 0 ? 0xff2200 : 0x0033ff,
    emissiveIntensity: 1.0, transparent: true, opacity: 0.8,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = Math.PI / 2;
  mesh.add(ring);

  mesh.add(makeLabel(charge.q > 0 ? '+' : '−', charge.q > 0 ? '#ff6666' : '#6699ff'));
  return mesh;
}

function makeLabel(text, color) {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const cx = c.getContext('2d');
  cx.fillStyle = color;
  cx.font = 'bold 48px monospace';
  cx.textAlign = 'center';
  cx.textBaseline = 'middle';
  cx.fillText(text, 32, 32);
  const mat = new THREE.SpriteMaterial({
    map: new THREE.CanvasTexture(c), transparent: true, depthTest: false,
  });
  const s = new THREE.Sprite(mat);
  s.scale.set(0.2, 0.2, 1);
  s.position.y = 0.22;
  return s;
}

// ── Public API ────────────────────────────────────────────────────────────────

export function rebuildSimulation() {
  // Rebuild charge spheres immediately (cheap)
  clearGroup(chargeGroup);
  for (const charge of state.charges) {
    const mesh = buildChargeMesh(charge);
    charge.mesh = mesh;
    chargeGroup.add(mesh);
  }

  // Dispatch heavy work to worker (or sync fallback)
  clearGroup(fieldLinesGroup);
  clearGroup(equipotGroup);
  clearGroup(forceGroup);

  if (state.charges.length === 0) {
    state.needsRebuild = false;
    return;
  }

  dispatchWorker(state.charges, state.expert);
  state.needsRebuild = false;
}

export function updateProbe(worldPos) {
  clearGroup(probeGroup);
  if (!state.probeActive || !worldPos || state.charges.length === 0) return;

  const sx = worldPos.x / state.SIM_SCALE;
  const sz = worldPos.z / state.SIM_SCALE;
  const { Ex, Ez, E_mag, phi } = probeAt(state.charges, sx, sz);
  state.probeField = E_mag;
  state.probeVoltage = phi;

  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.05, 12, 12),
    new THREE.MeshStandardMaterial({ color: 0x00ff88, emissive: 0x00ff44, emissiveIntensity: 0.9 }),
  );
  sphere.position.copy(worldPos);
  sphere.position.y = state.TABLE_Y + 0.06;
  probeGroup.add(sphere);

  if (E_mag > 0.01) {
    const dir = new THREE.Vector3(Ex, 0, Ez).normalize();
    const len = Math.min(0.55, 0.08 + E_mag * 0.1);
    probeGroup.add(new THREE.ArrowHelper(dir, sphere.position.clone(), len, 0x00ff88, 0.08, 0.05));
  }
}

export function animateCharges(t) {
  for (const child of chargeGroup.children) {
    child.scale.setScalar(0.9 + 0.1 * Math.sin(t * 3 + child.position.x));
  }
}

// Update a single charge's sphere position (for drag)
export function syncChargeMesh(charge) {
  if (!charge.mesh) return;
  const wpos = simToWorld(charge.x, charge.z);
  charge.mesh.position.x = wpos.x;
  charge.mesh.position.z = wpos.z;
}

export function getSimGroup() { return simGroup; }
export function setFieldLinesVisible(v) { fieldLinesGroup.visible = v; }
export function setEquipotentialsVisible(v) { equipotGroup.visible = v; }
export function setForceVectorsVisible(v) { forceGroup.visible = v; }
