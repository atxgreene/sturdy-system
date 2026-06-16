# Laboratory of Fields & Resonance

**Version 0.2 — Walkable Lab + Electrostatics MVP**
*A public hall of the Greene Paleogenomic Museum VR*

---

## What this is

A browser-based WebXR physics laboratory built for the Greene Paleogenomic Museum VR.
Users enter a hyperreal stone-and-bronze chamber and manipulate invisible electromagnetic systems in real time.

This version covers the **Walkable Lab** (V0.1) and **Electrostatics MVP** (V0.2) phases of the build plan.

---

## How to run

Serve this directory over HTTP (ES modules require a server):

```bash
npx serve .
# or
python3 -m http.server 8080
```

Open `http://localhost:8080/fields-resonance-lab/` in a modern browser.

Works in Chrome, Firefox, Edge. WebXR requires a compatible headset (Meta Quest, etc.).

---

## Controls

| Key | Action |
|-----|--------|
| **WASD** | Move through chamber |
| **Mouse** | Look (requires pointer lock — click to enter) |
| **Shift** | Sprint |
| **Esc** | Unlock mouse |
| **C** | Place positive charge (click table) |
| **N** | Place negative charge (click table) |
| **F** | Toggle field lines |
| **P** | Toggle equipotentials |
| **T** | Toggle field probe |
| **R** | Reset simulation |
| **M** | Museum mode |
| **I** | Student mode |
| **X** | Expert mode |
| **Z** | Sandbox mode |
| **H** | Toggle controls reference |
| **V** | Enter VR |
| **Space** | Pause / resume |

Mode buttons (M / S / X / ∞) are always visible on the left side and clickable without pointer lock.

---

## Simulation physics

- **Engine:** Analytical Coulomb's law in 2D (XZ slice through the chamber)
- **Field lines:** 4th-order Runge-Kutta integration along the normalized E field
- **Equipotentials:** Bilinear contour algorithm on a sampled potential grid
- **Units:** Normalized (k = 1) for visual clarity

### Accuracy note

| What is real | Coulomb's law, field line topology, equipotential geometry |
|---|---|
| What is simplified | 2D cross-section, normalized units, no relativistic or quantum effects |
| What is conceptual | Field "density" as visual proxy for field strength |
| What this cannot prove | Quantum field behavior, field quantization, radiation |

---

## Build phases

| Phase | Status | Description |
|-------|--------|-------------|
| V0.1 | ✅ Complete | Walkable chamber, camera controls, simulation menu, mode switcher |
| V0.2 | ✅ Complete | Electrostatics: point charges, field lines, equipotentials, field probe |
| V0.3 | Planned | Boundary conditions editor + Laplace solver |
| V0.4 | Planned | Frequency, vibration, standing waves, resonance curve |
| V0.5 | Planned | Magnetic field lines, solenoid, Lorentz force, LC resonance |
| V0.6 | Planned | Magnetic resonance concept visualizer |
| V1.0 | Planned | Museum-ready release with all 12 core simulations |

---

## Museum integration

```js
museum.registerHall({
  id: "fields-boundaries-resonance-lab",
  title: "Laboratory of Fields & Resonance",
  subtitle: "Electrostatics · Boundary Conditions · Magnetic Resonance · Frequency · Vibration",
  type: "hosted-public-hall",
  parent: "the-lyceum",
  linkedHalls: ["temple-of-resonance", "resonance-archive", "main-museum"],
  entranceLabel: "Enter the Laboratory of Fields & Resonance",
  route: "/greene-halls/fields-boundaries-resonance-lab/",
  privacy: "public",
  status: "active"
});
```

---

## File structure

```
fields-resonance-lab/
├── index.html                          Entry point
├── styles.css                          UI stylesheet
├── app.js                              Main application + animation loop
├── core/
│   ├── scene.js                        Three.js scene, chamber geometry, lighting
│   ├── controls.js                     WASD + pointer lock + raycasting
│   ├── state.js                        Application state
│   ├── vr.js                           WebXR / VRButton
│   └── registry.js                     Museum hall registration
├── simulations/
│   └── electrostatics/
│       ├── pointCharges.js             Physics: field, potential, RK4 tracing, contours
│       └── fieldVisualizer.js          Three.js geometry: field lines, equipotentials, spheres
└── ui/
    ├── hud.js                          HUD overlay + keyboard reference
    ├── modeSwitcher.js                 Mode switching (museum/student/expert/sandbox)
    └── expertPanel.js                  Expert controls panel
```

---

## Dependencies

- [Three.js r165](https://threejs.org/) — loaded via CDN importmap (no build step required)

---

*Greene Paleogenomic Museum VR · Laboratory of Fields & Resonance · v0.2*
