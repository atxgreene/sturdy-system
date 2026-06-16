import * as THREE from 'three';
import { state } from '../../core/state.js';
import { electricField2D } from './pointCharges.js';

const COUNT = 350;
const BOUNDS = 4.8;
const SPEED = 2.2;
const LIFE_MIN = 1.5;
const LIFE_MAX = 5.5;
const NEAR_CHARGE_R2 = 0.05 * 0.05;

const pos = new Float32Array(COUNT * 3);
const ages = new Float32Array(COUNT);
const maxAges = new Float32Array(COUNT);

let mesh = null;
let active = false;

function spawn(i) {
  const positives = state.charges.filter(c => c.q > 0);
  let sx, sz;

  if (positives.length > 0 && Math.random() < 0.55) {
    const c = positives[Math.floor(Math.random() * positives.length)];
    const angle = Math.random() * Math.PI * 2;
    const r = 0.28 + Math.random() * 0.9;
    sx = c.x + Math.cos(angle) * r;
    sz = c.z + Math.sin(angle) * r;
  } else {
    sx = (Math.random() * 2 - 1) * BOUNDS;
    sz = (Math.random() * 2 - 1) * BOUNDS;
  }

  pos[i * 3] = sx * state.SIM_SCALE;
  pos[i * 3 + 1] = state.TABLE_Y + 0.07;
  pos[i * 3 + 2] = sz * state.SIM_SCALE;
  ages[i] = 0;
  maxAges[i] = LIFE_MIN + Math.random() * (LIFE_MAX - LIFE_MIN);
}

export function initFlowParticles(scene) {
  for (let i = 0; i < COUNT; i++) {
    const sx = (Math.random() * 2 - 1) * BOUNDS;
    const sz = (Math.random() * 2 - 1) * BOUNDS;
    pos[i * 3] = sx * state.SIM_SCALE;
    pos[i * 3 + 1] = state.TABLE_Y + 0.07;
    pos[i * 3 + 2] = sz * state.SIM_SCALE;
    ages[i] = Math.random() * LIFE_MAX;
    maxAges[i] = LIFE_MIN + Math.random() * (LIFE_MAX - LIFE_MIN);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

  const mat = new THREE.PointsMaterial({
    color: 0x22ffee,
    size: 0.042,
    transparent: true,
    opacity: 0.72,
    sizeAttenuation: true,
    depthWrite: false,
  });

  mesh = new THREE.Points(geo, mat);
  mesh.visible = false;
  scene.add(mesh);
  return mesh;
}

export function updateFlowParticles(dt) {
  if (!mesh || !active || state.charges.length === 0) {
    if (mesh) mesh.visible = false;
    return;
  }

  mesh.visible = true;

  for (let i = 0; i < COUNT; i++) {
    ages[i] += dt;

    const sx = pos[i * 3] / state.SIM_SCALE;
    const sz = pos[i * 3 + 2] / state.SIM_SCALE;

    let dead = ages[i] >= maxAges[i]
      || Math.abs(sx) > BOUNDS
      || Math.abs(sz) > BOUNDS;

    if (!dead) {
      for (const c of state.charges) {
        if ((sx - c.x) ** 2 + (sz - c.z) ** 2 < NEAR_CHARGE_R2) {
          dead = true;
          break;
        }
      }
    }

    if (dead) { spawn(i); continue; }

    const [Ex, Ez] = electricField2D(state.charges, sx, sz);
    const mag = Math.sqrt(Ex * Ex + Ez * Ez);
    if (mag < 1e-9) { spawn(i); continue; }

    const spd = SPEED * Math.min(1.0, 0.15 + mag * 0.18) * dt * state.SIM_SCALE;
    pos[i * 3] += (Ex / mag) * spd;
    pos[i * 3 + 2] += (Ez / mag) * spd;
  }

  mesh.geometry.attributes.position.needsUpdate = true;
}

export function setFlowActive(v) {
  active = v;
  if (mesh) mesh.visible = v;
}

export function isFlowActive() { return active; }
