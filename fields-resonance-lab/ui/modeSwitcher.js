import { state, setMode } from '../core/state.js';

const MODE_LABELS = {
  museum: { label: 'Museum Mode', color: '#00ccee', desc: 'Guided — Beautiful visuals, low math' },
  student: { label: 'Student Mode', color: '#88ff88', desc: 'Equations and sliders enabled' },
  expert: { label: 'Expert Mode', color: '#ffaa00', desc: 'Full solver controls and graphs' },
  sandbox: { label: 'Sandbox Mode', color: '#cc88ff', desc: 'Free exploration — save presets' },
};

export function initModeSwitcher() {
  const panel = document.getElementById('mode-panel');
  panel.innerHTML = `
    <div class="mode-label" id="mode-label">Museum Mode</div>
    <div class="mode-desc" id="mode-desc">Guided — Beautiful visuals, low math</div>
  `;
  updateModeUI();
}

export function switchMode(mode) {
  setMode(mode);
  updateModeUI();

  const expertPanel = document.getElementById('expert-panel');
  if (mode === 'expert') {
    expertPanel.classList.add('active');
  } else {
    expertPanel.classList.remove('active');
  }

  const infoPanel = document.getElementById('info-panel');
  if (mode === 'student' || mode === 'expert') {
    infoPanel.classList.add('active');
  } else {
    infoPanel.classList.remove('active');
  }

  // Adjust simulation fidelity by mode
  if (mode === 'museum') {
    state.expert.lineSeeds = 12;
    state.expert.maxSteps = 180;
    state.expert.gridN = 48;
    state.expert.equipotentialLevels = 8;
  } else if (mode === 'student') {
    state.expert.lineSeeds = 16;
    state.expert.maxSteps = 220;
    state.expert.gridN = 60;
    state.expert.equipotentialLevels = 10;
  } else if (mode === 'expert') {
    state.expert.lineSeeds = 24;
    state.expert.maxSteps = 300;
    state.expert.gridN = 80;
    state.expert.equipotentialLevels = 14;
  } else if (mode === 'sandbox') {
    state.expert.lineSeeds = 20;
    state.expert.maxSteps = 250;
    state.expert.gridN = 64;
    state.expert.equipotentialLevels = 12;
  }

  state.needsRebuild = true;
  showNotification(`Switched to ${MODE_LABELS[mode].label}`);
}

function updateModeUI() {
  const cfg = MODE_LABELS[state.mode];
  const label = document.getElementById('mode-label');
  const desc = document.getElementById('mode-desc');
  if (label) {
    label.textContent = cfg.label;
    label.style.color = cfg.color;
  }
  if (desc) desc.textContent = cfg.desc;
}

function showNotification(msg) {
  const el = document.getElementById('notification');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._timeout);
  el._timeout = setTimeout(() => el.classList.remove('show'), 2200);
}
