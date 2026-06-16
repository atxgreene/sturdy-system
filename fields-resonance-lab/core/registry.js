// Museum hall registration for the Greene Paleogenomic Museum VR

export const HALL_CONFIG = {
  id: 'fields-boundaries-resonance-lab',
  title: 'Laboratory of Fields & Resonance',
  subtitle: 'Electrostatics · Boundary Conditions · Magnetic Resonance · Frequency · Vibration',
  type: 'hosted-public-hall',
  parent: 'the-lyceum',
  linkedHalls: [
    'temple-of-resonance',
    'resonance-archive',
    'main-museum',
  ],
  entranceLabel: 'Enter the Laboratory of Fields & Resonance',
  route: '/greene-halls/fields-boundaries-resonance-lab/',
  privacy: 'public',
  status: 'active',
  version: '0.2.0',
  buildPhase: 'electrostatics-mvp',
};

export function registerWithMuseum() {
  if (typeof window !== 'undefined' && window.museum?.registerHall) {
    window.museum.registerHall(HALL_CONFIG);
  }
}
