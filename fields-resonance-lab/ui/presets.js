import { state, clearCharges, addCharge } from '../core/state.js';

function ring(cx, cz, r, n, q) {
  return Array.from({ length: n }, (_, i) => {
    const a = (2 * Math.PI * i) / n;
    return { x: cx + Math.cos(a) * r, z: cz + Math.sin(a) * r, q };
  });
}

function row(z, xs, q) {
  return xs.map(x => ({ x, z, q }));
}

export const PRESETS = {
  single: {
    label: '⊕',
    title: 'Single Positive Charge',
    charges: [{ x: 0, z: 0, q: 1 }],
  },
  dipole: {
    label: '⊕⊖',
    title: 'Electric Dipole',
    charges: [{ x: -2, z: 0, q: 1 }, { x: 2, z: 0, q: -1 }],
  },
  quadrupole: {
    label: '⊕⊖⊕⊖',
    title: 'Quadrupole',
    charges: [
      { x: -2, z: 0, q: 1 }, { x: 2, z: 0, q: 1 },
      { x: 0, z: -2, q: -1 }, { x: 0, z: 2, q: -1 },
    ],
  },
  capacitor: {
    label: '▤ Capacitor',
    title: 'Parallel Plate Capacitor',
    charges: [
      ...row(-2.2, [-3, -1.5, 0, 1.5, 3], 1),
      ...row(2.2, [-3, -1.5, 0, 1.5, 3], -1),
    ],
  },
  faraday: {
    label: '○ Faraday',
    title: 'Faraday Cage (approximate)',
    charges: [
      ...ring(0, 0, 3.4, 12, 1),
      { x: 0, z: 0, q: -1 }, // inner test charge
    ],
  },
  triple: {
    label: '⊕⊕⊕',
    title: 'Three Positive Charges',
    charges: ring(0, 0, 2.2, 3, 1),
  },
  line: {
    label: '— Line',
    title: 'Line of Charges',
    charges: [-3, -1.5, 0, 1.5, 3].map(x => ({ x, z: 0, q: x < 0 ? -1 : 1 })),
  },
};

function notify(msg) {
  const el = document.getElementById('notification');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._timeout);
  el._timeout = setTimeout(() => el.classList.remove('show'), 2000);
}

export function loadPreset(key) {
  const p = PRESETS[key];
  if (!p) return;
  clearCharges();
  p.charges.forEach(({ x, z, q }) => addCharge(x, z, q));
  state.needsRebuild = true;
  notify(p.title);
}

export function initPresetsPanel() {
  const panel = document.createElement('div');
  panel.id = 'presets-panel';
  panel.innerHTML = `
    <div class="presets-title">PRESETS</div>
    ${Object.entries(PRESETS).map(([k, p]) =>
      `<button class="preset-btn" data-key="${k}" title="${p.title}">${p.label}</button>`
    ).join('')}
  `;
  document.getElementById('ui-root').appendChild(panel);
  panel.querySelectorAll('.preset-btn').forEach(btn =>
    btn.addEventListener('click', () => loadPreset(btn.dataset.key))
  );
}

// Save current charge configuration to localStorage
export function saveToLocal(slot = 0) {
  const data = {
    charges: state.charges.map(c => ({ x: c.x, z: c.z, q: c.q })),
    mode: state.mode,
  };
  localStorage.setItem(`lab-save-${slot}`, JSON.stringify(data));
  notify(`Saved to slot ${slot}`);
}

// Load charge configuration from localStorage
export function loadFromLocal(slot = 0) {
  try {
    const raw = localStorage.getItem(`lab-save-${slot}`);
    if (!raw) { notify('No save in that slot'); return; }
    const data = JSON.parse(raw);
    clearCharges();
    data.charges.forEach(({ x, z, q }) => addCharge(x, z, q));
    state.needsRebuild = true;
    notify(`Loaded slot ${slot}`);
  } catch (e) {
    notify('Load failed');
  }
}
