// Global application state for the Laboratory of Fields & Resonance

export const state = {
  mode: 'museum',          // museum | student | expert | sandbox
  simulation: 'electrostatics',
  charges: [],             // array of { x, z, q, id, mesh }
  placing: null,           // null | 'positive' | 'negative'
  selectedChargeId: null,
  probeActive: false,
  probeWorldPos: null,
  probeField: null,
  probeVoltage: null,
  paused: false,
  needsRebuild: false,     // set true when charges change

  vis: {
    fieldLines: true,
    equipotentials: true,
    forceVectors: false,
    grid: false,
  },

  expert: {
    lineSeeds: 16,
    stepSize: 0.05,
    maxSteps: 250,
    equipotentialLevels: 10,
    gridN: 60,
    chargeScale: 1.0,
  },

  // simulation coordinate system
  // sim units: ±5.0 range
  // world mapping: sim * SIM_SCALE + tableCenter
  SIM_SCALE: 0.55,
  TABLE_Y: 0.55,           // world-space y of simulation plane

  debugOverlay: false,
};

export function addCharge(x, z, q) {
  const charge = {
    x, z, q,
    id: Math.random().toString(36).slice(2, 8),
    mesh: null,
  };
  state.charges.push(charge);
  state.needsRebuild = true;
  return charge;
}

export function removeCharge(id) {
  const idx = state.charges.findIndex(c => c.id === id);
  if (idx !== -1) {
    state.charges.splice(idx, 1);
    state.needsRebuild = true;
  }
}

export function clearCharges() {
  state.charges = [];
  state.needsRebuild = true;
}

export function setMode(mode) {
  state.mode = mode;
}
