# Session Handoff — Laboratory of Fields & Resonance

**For the next Claude session picking this up.**

This document gives full context on what was built, how it connects to the museum, and what to do next.

---

## What this repo is

`sturdy-system` is the **Laboratory of Fields & Resonance** — a standalone public Greene Hall for the Greene Paleogenomic Museum VR.

Greene Halls are **public-facing, standalone deployments** of specific sections of the private museum (`Greene-Paleogenomic-Museum-VR`). They:
- Are hosted independently (GitHub Pages, etc.)
- Register themselves with the museum host via `window.museum.registerHall()`
- Can be iframed into the full museum environment
- Have their own repo, URL, and release cycle

---

## What was built in this session

### Version 0.2 — complete

A browser-based WebXR physics lab. No build step. Three.js r165 via CDN importmap.

**Live at (after PR merge + Pages enabled):**
```
https://atxgreene.github.io/sturdy-system/
```

**PR:** https://github.com/atxgreene/sturdy-system/pull/1

### File structure

```
fields-resonance-lab/
├── index.html                          Entry point, importmap
├── styles.css                          Full UI stylesheet (dark stone aesthetic)
├── app.js                              Main orchestrator + animation loop
├── core/
│   ├── scene.js                        Chamber geometry, lighting, wing archways, wing data export
│   ├── controls.js                     WASD + pointer lock + charge grab/drag
│   ├── state.js                        Application state singleton
│   ├── vr.js                           WebXR / VRButton
│   └── registry.js                     Museum hall registration hook
├── simulations/
│   ├── electrostatics/
│   │   ├── pointCharges.js             Coulomb physics, RK4 field line tracing, contours
│   │   ├── fieldVisualizer.js          Three.js geometry — uses Web Worker, falls back to sync
│   │   ├── flowParticles.js            350 animated particles following E field
│   │   └── potentialHeatmap.js         Canvas texture voltage map
│   ├── boundaries/
│   │   ├── laplaceSolver.js            60×60 SOR grid solver (Dirichlet/Neumann/grounded)
│   │   └── boundaryViz.js              Visualization + async iteration loop
│   └── vibration/
│       └── standingWaves.js            Driven damped 1D wave, analytical solution
├── workers/
│   └── fieldWorker.js                  Web Worker (self-contained, no module imports)
└── ui/
    ├── hud.js                          HUD overlay, controls reference, click-to-start
    ├── modeSwitcher.js                 Mode switching (museum/student/expert/sandbox)
    ├── expertPanel.js                  Expert controls panel with live sliders
    └── presets.js                      7 charge presets + save/load to localStorage
```

### All keyboard shortcuts

| Key | Action |
|-----|--------|
| WASD | Move |
| Mouse | Look (requires pointer lock) |
| Shift | Sprint |
| Esc | Unlock |
| C | Place + charge |
| N | Place − charge |
| G | Grab / drop charge (drag to reposition) |
| F | Toggle field lines |
| P | Toggle equipotentials |
| O | Toggle force vectors |
| L | Toggle flow particles |
| K | Toggle potential heatmap |
| T | Toggle field probe |
| B | Toggle boundary conditions panel |
| Q | Toggle standing wave |
| R | Reset simulation |
| 1–7 | Load preset (dipole, capacitor, Faraday cage, etc.) |
| F5 | Save to localStorage |
| F9 | Load from localStorage |
| M/I/X/Z | Mode (museum/student/expert/sandbox) — unlock first |
| H | Toggle controls reference |
| V | Enter VR |
| Space | Pause/resume |

### What's working

- Walkable 3D stone chamber with 5 wing archways and central Boundary Loom table
- Wing approach detection (archways glow when you walk toward them)
- Electrostatics: RK4 field line integration, bilinear contour equipotentials
- Web Worker offloads heavy computation; sync fallback if Worker unavailable
- Flow particles following E field in real time
- Potential heatmap (canvas texture)
- Force vectors (Coulomb forces on charges)
- Charge grab and drag (G key)
- Laplace/Poisson boundary solver (60×60, SOR, async)
- Standing wave with fixed/free ends, mode/frequency controls
- 7 charge presets
- Save/load (localStorage)
- Museum registration hook fires on load
- WebXR VR button (requires HTTPS — GitHub Pages provides this)
- 4 simulation modes (museum/student/expert/sandbox) with fidelity scaling
- Expert panel with live sliders for solver parameters
- GitHub Actions Pages deployment (`.github/workflows/deploy-pages.yml`)

---

## Museum integration — what's already wired

### Registration hook (`core/registry.js`)

```js
// This fires when the lab loads:
window.museum.registerHall({
  id: "fields-boundaries-resonance-lab",
  title: "Laboratory of Fields & Resonance",
  subtitle: "Electrostatics · Boundary Conditions · Magnetic Resonance · Frequency · Vibration",
  type: "hosted-public-hall",
  parent: "the-lyceum",
  linkedHalls: ["temple-of-resonance", "resonance-archive", "main-museum"],
  entranceLabel: "Enter the Laboratory of Fields & Resonance",
  route: "/greene-halls/fields-boundaries-resonance-lab/",
  privacy: "public",
  status: "active",
  version: "0.2.0",
});
```

The museum host just needs to expose `window.museum = { registerHall(config) { ... } }` and this hall self-announces.

### Iframe embed pattern

```html
<iframe
  src="https://atxgreene.github.io/sturdy-system/"
  allow="xr-spatial-tracking; fullscreen"
  style="width:100%; height:100%; border:none">
</iframe>
```

### Museum placement

```
The Lyceum
   ↓
Laboratory of Fields & Resonance  ← this hall
   ↙                ↘
Temple of Resonance  Resonance Archive
```

---

## What needs to happen in the next session

### 1. Read the museum repo

Access `Greene-Paleogenomic-Museum-VR` and read:
- The main README / roadmap
- Existing hall registry and routing conventions
- The Lyceum structure (this lab's parent)
- Blueprints for how halls connect
- Any existing `window.museum` API definition

### 2. Align this lab's registry with the museum conventions

The `registry.js` in this repo uses a placeholder registration pattern. Once the museum's actual API is known, update it to match exactly (field names, hall IDs, route format, status values, etc.).

### 3. Continue build phases

The lab has a clear roadmap. Remaining phases:

| Phase | Content | Key files to create |
|-------|---------|---------------------|
| V0.3 | Boundary conditions interactive editor | `simulations/boundaries/boundaryEditor.js` — draw on grid, set types via UI |
| V0.4 | Frequency/vibration wing — oscillator, resonance curve, coupled oscillators, Fourier | `simulations/vibration/oscillator.js`, `coupledOscillators.js`, `fourierExplorer.js` |
| V0.5 | Magnetism wing — bar magnet, solenoid, Lorentz force, LC resonance | `simulations/magnetism/*.js` |
| V0.6 | Magnetic resonance concept — Larmor precession, RF excitation, T1/T2 | `simulations/magnetism/magneticResonance.js` |
| V1.0 | Museum-ready polish, all 12 core simulations, README, embed support | Full review pass |

### 4. The 12 must-have simulations (V1.0 target)

| # | Simulation | Status |
|---|-----------|--------|
| 1 | Point-charge electrostatic field | ✅ Done |
| 2 | Dipole / multipole field | ✅ Done (via presets) |
| 3 | Parallel-plate capacitor | ✅ Done (preset) |
| 4 | Faraday cage | ✅ Done (preset) |
| 5 | Laplace / Poisson boundary solver | ✅ Done |
| 6 | Standing wave with boundary controls | ✅ Done |
| 7 | Driven damped oscillator | Partial (standing wave has damping) |
| 8 | Resonance curve visualizer | Not started |
| 9 | Magnetic dipole / solenoid field | Not started |
| 10 | Lorentz force particle motion | Not started |
| 11 | LC resonance / coupled resonators | Not started |
| 12 | Magnetic resonance concept visualizer | Not started |

### 5. GitHub Pages

- PR #1 is open: https://github.com/atxgreene/sturdy-system/pull/1
- After merge: go to **Settings → Pages → Source: GitHub Actions**
- Actions workflow is at `.github/workflows/deploy-pages.yml`

---

## Architecture notes for the new session

- **No build step.** All JS is ES modules loaded directly by the browser. Three.js via CDN importmap. Do not introduce a bundler unless the project explicitly needs one.
- **Web Worker** for heavy physics computation (`workers/fieldWorker.js`). It is self-contained (no module imports) — keep it that way.
- **State** lives in `core/state.js` as a plain mutable object. It's imported directly, not through a framework.
- **Three.js r165** pinned in the importmap. Don't update without checking breaking changes.
- **Simulation scale**: 1 sim unit = 0.55 world units. Simulation bounds: ±5 sim units. Table center: y=0.55 world.
- **Scientific integrity**: Every simulation has a "what is real / simplified / conceptual / cannot prove" overlay. Don't remove this.
- The safety layer in Wing 5 (Harnessing) must avoid: free-energy claims, healing-frequency claims, directed-energy weapon concepts, dangerous HV construction.

---

## Questions to answer from the museum repo

1. What is the exact hall registry API the museum uses?
2. What routing convention do Greene Halls follow? (`/greene-halls/...`? subdomain? iframe?)
3. Does The Lyceum exist yet as a built hall? What's its status?
4. What other Greene Halls exist or are in progress?
5. Is there a shared `museum.js` host file that all halls import or connect to?
6. What is the museum's visual language — does the dark stone / teal aesthetic match, or does the museum use a different palette?
7. Are there shared component libraries (UI panels, navigation, etc.) across halls?

---

*Handoff written at end of session `01PSxzzZZ1sLq9qgjhMgGf5J`, 2026-06-16.*
*Next session: add both `sturdy-system` and `Greene-Paleogenomic-Museum-VR` to scope.*
