// 1D Standing Wave visualization — driven damped oscillator on a string
// Rendered as a 3D ribbon above the simulation table

import * as THREE from 'three';

const N_POINTS = 120;
const WAVE_LEN = 8.0;    // world units
const WAVE_HEIGHT = 1.2; // max amplitude in world units

let group = null;
let lineMesh = null;
let envelope = null;
let params = {
  mode: 1,         // harmonic mode (n)
  amplitude: 1.0,
  frequency: 1.0,  // driving frequency (relative to natural)
  damping: 0.05,
  endCondition: 'fixed', // 'fixed' | 'free'
};
let time = 0;

// Analytical driven damped response amplitude
function responseAmplitude(driveFreq, naturalFreq, damping) {
  const x = driveFreq / naturalFreq;
  const denom = Math.sqrt((1 - x * x) ** 2 + (2 * damping * x) ** 2);
  return 1 / Math.max(denom, 0.01);
}

export function initStandingWaves(scene, worldPos) {
  group = new THREE.Group();
  group.position.copy(worldPos);

  // Wave line
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(N_POINTS * 3);
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const mat = new THREE.LineBasicMaterial({
    color: 0x88ffcc,
    transparent: true,
    opacity: 0.9,
  });
  lineMesh = new THREE.Line(geo, mat);
  group.add(lineMesh);

  // Node/antinode marker dots
  const dotsGeo = new THREE.BufferGeometry();
  const dotPositions = new Float32Array(20 * 3);
  dotsGeo.setAttribute('position', new THREE.BufferAttribute(dotPositions, 3));
  const dots = new THREE.Points(dotsGeo, new THREE.PointsMaterial({
    color: 0x00ffaa,
    size: 0.08,
    sizeAttenuation: true,
  }));
  group.add(dots);
  group.userData.dots = dots;

  // Axis line
  const axisGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-WAVE_LEN / 2, 0, 0),
    new THREE.Vector3(WAVE_LEN / 2, 0, 0),
  ]);
  const axis = new THREE.Line(axisGeo, new THREE.LineBasicMaterial({
    color: 0x224433,
    transparent: true,
    opacity: 0.4,
  }));
  group.add(axis);

  // Mode label
  const lbl = makeModeLabel();
  lbl.position.set(0, 1.6, 0);
  group.add(lbl);
  group.userData.lbl = lbl;

  group.visible = false;
  scene.add(group);

  return { group, update: updateWave, setParams: updateParams };
}

function updateWave(dt) {
  if (!group || !group.visible) return;
  time += dt;

  const { mode, amplitude, frequency, damping, endCondition } = params;
  const naturalFreq = mode; // natural freq of mode n is proportional to n
  const A = amplitude * responseAmplitude(frequency, naturalFreq, damping);

  const positions = lineMesh.geometry.attributes.position.array;
  const L = WAVE_LEN;

  for (let i = 0; i < N_POINTS; i++) {
    const t = i / (N_POINTS - 1);
    const x = (t - 0.5) * L;

    // Spatial part: fixed ends → sin(nπx/L), free ends → cos(nπx/L)
    const kx = (mode * Math.PI * t);
    const spatial = endCondition === 'fixed'
      ? Math.sin(kx)
      : Math.cos(kx);

    // Temporal part
    const temporal = Math.cos(2 * Math.PI * frequency * time);

    // Decay envelope for damping visualization
    const y = Math.min(2, A) * spatial * temporal * WAVE_HEIGHT;

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = 0;
  }

  lineMesh.geometry.attributes.position.needsUpdate = true;

  // Update node markers
  updateNodeMarkers(mode, endCondition, A);
  updateModeLabel(mode, frequency, A);
}

function updateNodeMarkers(n, cond, amp) {
  const dots = group.userData.dots;
  if (!dots) return;
  const L = WAVE_LEN;
  const dotPos = dots.geometry.attributes.position.array;
  let k = 0;

  // Nodes for fixed-end: at x = i*L/n for i=0..n
  // Antinodes at x = (2i+1)*L/(2n)
  for (let i = 0; i <= n && k < 20; i++) {
    const t = cond === 'fixed' ? i / n : (i + 0.5) / n;
    const x = (t - 0.5) * L;
    dotPos[k * 3] = x;
    dotPos[k * 3 + 1] = 0;
    dotPos[k * 3 + 2] = 0;
    k++;
  }
  // Fill remaining
  for (; k < 20; k++) {
    dotPos[k * 3] = 0; dotPos[k * 3 + 1] = 999; dotPos[k * 3 + 2] = 0;
  }
  dots.geometry.attributes.position.needsUpdate = true;
}

function makeModeLabel() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 96;
  const cx = c.getContext('2d');
  const t = new THREE.CanvasTexture(c);
  const mat = new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false });
  const s = new THREE.Sprite(mat);
  s.scale.set(4, 0.75, 1);
  s.userData = { canvas: c, ctx: cx, tex: t };
  return s;
}

function updateModeLabel(mode, freq, amp) {
  const lbl = group.userData.lbl;
  if (!lbl) return;
  const { canvas: c, ctx: cx, tex: t } = lbl.userData;
  cx.clearRect(0, 0, 512, 96);
  cx.fillStyle = '#88ffcc';
  cx.font = 'bold 22px monospace';
  cx.textAlign = 'center';
  cx.fillText(`Standing Wave — Mode n=${mode}`, 256, 32);
  cx.font = '16px monospace';
  cx.fillStyle = '#4499aa';
  cx.fillText(`f/f₀ = ${freq.toFixed(2)} | A = ${amp.toFixed(2)}`, 256, 62);
  t.needsUpdate = true;
}

export function updateParams(newParams) {
  Object.assign(params, newParams);
}

export function getParams() { return { ...params }; }

export function setWaveVisible(v) {
  if (group) group.visible = v;
}

export function isWaveVisible() { return group?.visible ?? false; }

export function getWaveUpdate() {
  return (dt) => updateWave(dt);
}
