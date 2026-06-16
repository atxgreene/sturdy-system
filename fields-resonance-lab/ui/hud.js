import { state } from '../core/state.js';

const STUDENT_INFO = {
  electrostatics: `
    <div class="eq-block">
      <div class="eq-title">Coulomb's Law (point charges)</div>
      <div class="eq">E = kq/r²</div>
      <div class="eq-sub">k = 8.99 × 10⁹ N·m²/C²</div>
    </div>
    <div class="eq-block">
      <div class="eq-title">Electric Potential</div>
      <div class="eq">φ = kq/r</div>
    </div>
    <div class="eq-block">
      <div class="eq-title">Superposition</div>
      <div class="eq">E_total = Σ Eᵢ</div>
      <div class="eq-sub">Fields add as vectors</div>
    </div>
  `,
};

const SAFETY_TEXT = `
  <div class="safety-title">Scientific Integrity</div>
  <div class="safety-row"><span class="si-label">Real:</span> Coulomb's law, field line topology, potential theory</div>
  <div class="safety-row"><span class="si-label">Simplified:</span> 2D cross-section, normalized units, no relativistic effects</div>
  <div class="safety-row"><span class="si-label">Conceptual:</span> Field line "density" as a proxy for field strength</div>
  <div class="safety-row"><span class="si-label">Cannot prove:</span> Quantum behavior, field quantization</div>
`;

export function initHUD() {
  const hud = document.getElementById('hud');

  hud.innerHTML = `
    <div id="lab-title">
      <span class="lab-name">Laboratory of Fields &amp; Resonance</span>
      <span class="lab-sub">Greene Paleogenomic Museum VR · v0.2</span>
    </div>

    <div id="controls-ref">
      <div class="ctrl-group">
        <div class="ctrl-header">NAVIGATION</div>
        <div class="ctrl-row"><kbd>WASD</kbd> Move</div>
        <div class="ctrl-row"><kbd>Mouse</kbd> Look</div>
        <div class="ctrl-row"><kbd>Shift</kbd> Sprint</div>
        <div class="ctrl-row"><kbd>Esc</kbd> Unlock</div>
      </div>
      <div class="ctrl-group">
        <div class="ctrl-header">ELECTROSTATICS</div>
        <div class="ctrl-row"><kbd>C</kbd> Place + Charge</div>
        <div class="ctrl-row"><kbd>N</kbd> Place − Charge</div>
        <div class="ctrl-row"><kbd>F</kbd> Toggle Field Lines</div>
        <div class="ctrl-row"><kbd>P</kbd> Toggle Equipotentials</div>
        <div class="ctrl-row"><kbd>T</kbd> Field Probe</div>
        <div class="ctrl-row"><kbd>R</kbd> Reset Simulation</div>
      </div>
      <div class="ctrl-group">
        <div class="ctrl-header">MODES</div>
        <div class="ctrl-row"><kbd>M</kbd> Museum Mode</div>
        <div class="ctrl-row"><kbd>S</kbd> Student Mode</div>
        <div class="ctrl-row"><kbd>X</kbd> Expert Mode</div>
        <div class="ctrl-row"><kbd>Z</kbd> Sandbox Mode</div>
        <div class="ctrl-row"><kbd>V</kbd> Enter VR</div>
      </div>
    </div>

    <div id="sim-status">
      <span id="sim-name">Electrostatic Field Chamber</span>
      <span id="charge-count">Charges: 0</span>
    </div>
  `;

  // Info panel (student/expert)
  const infoPanel = document.getElementById('info-panel');
  infoPanel.innerHTML = `
    <div class="info-header">Student Reference</div>
    ${STUDENT_INFO.electrostatics}
  `;

  // Safety panel
  const safetyPanel = document.getElementById('safety-panel');
  safetyPanel.innerHTML = SAFETY_TEXT;

  // Click to start overlay
  const overlay = document.createElement('div');
  overlay.id = 'click-to-start';
  overlay.innerHTML = `
    <div class="cts-inner">
      <div class="lab-sigil">⊕</div>
      <h2>Laboratory of Fields &amp; Resonance</h2>
      <p>Click anywhere to enter the laboratory</p>
      <div class="cts-hint">WASD to move · Mouse to look · Press <kbd>H</kbd> to toggle controls</div>
    </div>
  `;
  document.body.appendChild(overlay);
}

export function updateHUD() {
  const cc = document.getElementById('charge-count');
  if (cc) cc.textContent = `Charges: ${state.charges.length}`;

  const safetyPanel = document.getElementById('safety-panel');
  if (safetyPanel) {
    safetyPanel.classList.toggle('active', state.mode === 'expert');
  }
}

export function toggleControlsRef() {
  const ref = document.getElementById('controls-ref');
  if (ref) ref.classList.toggle('hidden');
}
