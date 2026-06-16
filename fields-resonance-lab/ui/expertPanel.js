import { state } from '../core/state.js';

export function initExpertPanel() {
  const panel = document.getElementById('expert-panel');

  panel.innerHTML = `
    <div class="expert-header">
      <span class="expert-title">⚙ Expert Controls</span>
      <button class="expert-close" id="expert-close">✕</button>
    </div>
    <div class="expert-section">
      <div class="expert-row">
        <label>Field Line Seeds</label>
        <input type="range" id="exp-seeds" min="8" max="32" step="4" value="${state.expert.lineSeeds}">
        <span id="exp-seeds-val">${state.expert.lineSeeds}</span>
      </div>
      <div class="expert-row">
        <label>Step Size</label>
        <input type="range" id="exp-step" min="0.02" max="0.12" step="0.01" value="${state.expert.stepSize}">
        <span id="exp-step-val">${state.expert.stepSize.toFixed(2)}</span>
      </div>
      <div class="expert-row">
        <label>Max Steps</label>
        <input type="range" id="exp-maxsteps" min="100" max="500" step="50" value="${state.expert.maxSteps}">
        <span id="exp-maxsteps-val">${state.expert.maxSteps}</span>
      </div>
      <div class="expert-row">
        <label>Equipotential Levels</label>
        <input type="range" id="exp-eqlevels" min="4" max="20" step="2" value="${state.expert.equipotentialLevels}">
        <span id="exp-eqlevels-val">${state.expert.equipotentialLevels}</span>
      </div>
      <div class="expert-row">
        <label>Grid Resolution N</label>
        <input type="range" id="exp-gridn" min="30" max="120" step="10" value="${state.expert.gridN}">
        <span id="exp-gridn-val">${state.expert.gridN}</span>
      </div>
    </div>

    <div class="expert-section">
      <div class="expert-section-title">Charge List</div>
      <div id="charge-list"></div>
    </div>

    <div class="expert-section">
      <div class="expert-section-title">Live Readout</div>
      <div class="readout" id="readout-charges">Charges: 0</div>
      <div class="readout" id="readout-probe-e">|E|: —</div>
      <div class="readout" id="readout-probe-v">φ: —</div>
    </div>

    <div class="expert-section">
      <button class="exp-btn" id="exp-rebuild">↺ Rebuild Field</button>
      <button class="exp-btn danger" id="exp-clear">✕ Clear All Charges</button>
    </div>
  `;

  // Bind sliders
  bindSlider('exp-seeds', 'exp-seeds-val', v => { state.expert.lineSeeds = v; });
  bindSlider('exp-step', 'exp-step-val', v => { state.expert.stepSize = v; }, 2);
  bindSlider('exp-maxsteps', 'exp-maxsteps-val', v => { state.expert.maxSteps = v; });
  bindSlider('exp-eqlevels', 'exp-eqlevels-val', v => { state.expert.equipotentialLevels = v; });
  bindSlider('exp-gridn', 'exp-gridn-val', v => { state.expert.gridN = v; });

  document.getElementById('expert-close').addEventListener('click', () => {
    panel.classList.remove('active');
  });

  document.getElementById('exp-rebuild').addEventListener('click', () => {
    state.needsRebuild = true;
  });

  document.getElementById('exp-clear').addEventListener('click', () => {
    if (confirm('Clear all charges?')) {
      state.charges = [];
      state.needsRebuild = true;
    }
  });
}

function bindSlider(id, valId, setter, decimals = 0) {
  const el = document.getElementById(id);
  const valEl = document.getElementById(valId);
  el.addEventListener('input', () => {
    const v = parseFloat(el.value);
    setter(v);
    valEl.textContent = decimals > 0 ? v.toFixed(decimals) : v;
    state.needsRebuild = true;
  });
}

export function updateExpertReadout() {
  const chargesEl = document.getElementById('readout-charges');
  const probeE = document.getElementById('readout-probe-e');
  const probeV = document.getElementById('readout-probe-v');

  if (chargesEl) chargesEl.textContent = `Charges: ${state.charges.length}`;

  if (probeE && state.probeField != null) {
    probeE.textContent = `|E|: ${state.probeField.toFixed(3)}`;
  }
  if (probeV && state.probeVoltage != null) {
    probeV.textContent = `φ: ${state.probeVoltage.toFixed(3)}`;
  }

  // Charge list
  const list = document.getElementById('charge-list');
  if (!list) return;
  list.innerHTML = state.charges.map((c, i) =>
    `<div class="charge-item ${c.q > 0 ? 'pos' : 'neg'}">
      ${c.q > 0 ? '+' : '−'}  (${c.x.toFixed(2)}, ${c.z.toFixed(2)})
      <button class="del-charge" data-id="${c.id}">✕</button>
    </div>`
  ).join('');

  list.querySelectorAll('.del-charge').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const idx = state.charges.findIndex(c => c.id === id);
      if (idx !== -1) {
        state.charges.splice(idx, 1);
        state.needsRebuild = true;
      }
    });
  });
}
