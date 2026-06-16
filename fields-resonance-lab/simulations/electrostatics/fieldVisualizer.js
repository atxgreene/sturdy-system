import * as THREE from 'three';
import { state } from '../../core/state.js';
import {
  fieldLineSeeds,
  traceFieldLine2D,
  computeContourLines,
  probeAt,
} from './pointCharges.js';

// All simulation objects live under this group
const simGroup = new THREE.Group();
let fieldLinesGroup = new THREE.Group();
let equipotentialGroup = new THREE.Group();
let chargeGroup = new THREE.Group();
let probeGroup = new THREE.Group();

simGroup.add(fieldLinesGroup, equipotentialGroup, chargeGroup, probeGroup);

// Materials
const positiveMat = new THREE.MeshStandardMaterial({
  color: 0xff3333,
  emissive: 0xff1100,
  emissiveIntensity: 0.7,
  roughness: 0.2,
  metalness: 0.1,
});

const negativeMat = new THREE.MeshStandardMaterial({
  color: 0x3388ff,
  emissive: 0x0044ff,
  emissiveIntensity: 0.7,
  roughness: 0.2,
  metalness: 0.1,
});

const fieldLineMat = new THREE.LineBasicMaterial({
  color: 0x00e5ff,
  transparent: true,
  opacity: 0.72,
  depthWrite: false,
});

const equipotentialMat = new THREE.LineBasicMaterial({
  color: 0xffd700,
  transparent: true,
  opacity: 0.55,
  depthWrite: false,
});

const probeMat = new THREE.MeshStandardMaterial({
  color: 0x00ff88,
  emissive: 0x00ff44,
  emissiveIntensity: 0.8,
  roughness: 0.1,
});

const probeArrowMat = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  emissive: 0xaaffdd,
  emissiveIntensity: 0.6,
});

// Convert simulation coords → world coords
function simToWorld(sx, sz) {
  return new THREE.Vector3(sx * state.SIM_SCALE, state.TABLE_Y + 0.04, sz * state.SIM_SCALE);
}

// Build charge sphere mesh
function buildChargeMesh(charge) {
  const geo = new THREE.SphereGeometry(0.1, 20, 20);
  const mat = charge.q > 0 ? positiveMat.clone() : negativeMat.clone();
  const mesh = new THREE.Mesh(geo, mat);
  const wpos = simToWorld(charge.x, charge.z);
  mesh.position.copy(wpos);
  mesh.position.y = state.TABLE_Y + 0.08;
  mesh.userData.chargeId = charge.id;

  // Glow ring
  const ringGeo = new THREE.TorusGeometry(0.14, 0.012, 8, 32);
  const ringMat = new THREE.MeshStandardMaterial({
    color: charge.q > 0 ? 0xff4444 : 0x4488ff,
    emissive: charge.q > 0 ? 0xff2200 : 0x0033ff,
    emissiveIntensity: 1.0,
    transparent: true,
    opacity: 0.8,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = Math.PI / 2;
  mesh.add(ring);

  // Label sprite
  const label = makeLabel(charge.q > 0 ? '+' : '−', charge.q > 0 ? '#ff6666' : '#6699ff');
  label.position.set(0, 0.22, 0);
  mesh.add(label);

  return mesh;
}

function makeLabel(text, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = color;
  ctx.font = 'bold 48px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 32, 32);
  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(0.2, 0.2, 1);
  return sprite;
}

// Build field line geometry from traced points
function buildFieldLine(points) {
  if (points.length < 2) return null;
  const verts = [];
  for (const [sx, sz] of points) {
    const w = simToWorld(sx, sz);
    verts.push(w.x, w.y, w.z);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  return new THREE.Line(geo, fieldLineMat);
}

// Build equipotential line geometry from contour segments
function buildEquipotentials(contours) {
  const verts = [];
  for (const { segs } of contours) {
    for (let i = 0; i < segs.length; i += 2) {
      const a = simToWorld(segs[i][0], segs[i][1]);
      const b = simToWorld(segs[i + 1][0], segs[i + 1][1]);
      verts.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
  }
  if (verts.length === 0) return null;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  return new THREE.LineSegments(geo, equipotentialMat);
}

// Rebuild all field line geometry
function rebuildFieldLines(charges, config) {
  while (fieldLinesGroup.children.length) {
    fieldLinesGroup.children[0].geometry?.dispose();
    fieldLinesGroup.remove(fieldLinesGroup.children[0]);
  }

  if (!state.vis.fieldLines || charges.length === 0) return;

  const { lineSeeds, stepSize, maxSteps } = config;
  const BOUNDS = 5.5;

  const hasPositive = charges.some(c => c.q > 0);

  for (const charge of charges) {
    if (charge.q > 0) {
      // Positive charge: trace outward in +E direction
      const seeds = fieldLineSeeds(charge, lineSeeds);
      for (const [sx, sz] of seeds) {
        const pts = traceFieldLine2D(charges, sx, sz, true, stepSize, maxSteps, BOUNDS);
        if (pts.length >= 2) {
          const line = buildFieldLine(pts);
          if (line) fieldLinesGroup.add(line);
        }
      }
    } else if (!hasPositive) {
      // Standalone negative charge: seed from r=1.8 and trace inward (−E direction, short)
      const farSeeds = fieldLineSeeds(charge, lineSeeds, 1.8);
      for (const [sx, sz] of farSeeds) {
        const pts = traceFieldLine2D(charges, sx, sz, false, stepSize, 80, BOUNDS);
        if (pts.length >= 2) {
          const line = buildFieldLine(pts);
          if (line) fieldLinesGroup.add(line);
        }
      }
    }
    // Negative charges with positive counterparts: appear as natural sinks
    // (lines from positive charges terminate there — no extra geometry needed)
  }
}

// Rebuild equipotential geometry
function rebuildEquipotentials(charges, config) {
  while (equipotentialGroup.children.length) {
    equipotentialGroup.children[0].geometry?.dispose();
    equipotentialGroup.remove(equipotentialGroup.children[0]);
  }

  if (!state.vis.equipotentials || charges.length === 0) return;

  const contours = computeContourLines(
    charges,
    config.gridN,
    5.0,
    config.equipotentialLevels,
  );

  const mesh = buildEquipotentials(contours);
  if (mesh) equipotentialGroup.add(mesh);
}

// Rebuild charge spheres
function rebuildCharges(charges) {
  while (chargeGroup.children.length) {
    chargeGroup.remove(chargeGroup.children[0]);
  }

  for (const charge of charges) {
    const mesh = buildChargeMesh(charge);
    charge.mesh = mesh;
    chargeGroup.add(mesh);
  }
}

// Full rebuild triggered when charges change
export function rebuildSimulation() {
  const charges = state.charges;
  const config = state.expert;

  rebuildCharges(charges);
  rebuildFieldLines(charges, config);
  rebuildEquipotentials(charges, config);

  state.needsRebuild = false;
}

// Update probe sphere position and readout
export function updateProbe(worldPos) {
  while (probeGroup.children.length) probeGroup.remove(probeGroup.children[0]);

  if (!state.probeActive || !worldPos || state.charges.length === 0) return;

  const sx = worldPos.x / state.SIM_SCALE;
  const sz = worldPos.z / state.SIM_SCALE;

  const { Ex, Ez, E_mag, phi } = probeAt(state.charges, sx, sz);

  state.probeField = E_mag;
  state.probeVoltage = phi;

  // Probe sphere
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.05, 12, 12),
    probeMat,
  );
  sphere.position.copy(worldPos);
  sphere.position.y = state.TABLE_Y + 0.04;
  probeGroup.add(sphere);

  // Arrow showing field direction
  if (E_mag > 0.01) {
    const origin = sphere.position.clone();
    const dir = new THREE.Vector3(Ex, 0, Ez).normalize();
    const length = Math.min(0.5, 0.08 + E_mag * 0.1);
    const arrow = new THREE.ArrowHelper(dir, origin, length, 0x00ff88, 0.08, 0.05);
    probeGroup.add(arrow);
  }
}

// Animate charge pulsing
export function animateCharges(t) {
  for (const child of chargeGroup.children) {
    const pulse = 0.9 + 0.1 * Math.sin(t * 3 + child.position.x);
    child.scale.setScalar(pulse);
  }
}

export function getSimGroup() {
  return simGroup;
}

export function setFieldLinesVisible(v) {
  fieldLinesGroup.visible = v;
}

export function setEquipotentialsVisible(v) {
  equipotentialGroup.visible = v;
}
