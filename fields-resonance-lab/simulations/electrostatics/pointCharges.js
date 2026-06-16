// Electrostatic field physics — 2D slice (XZ plane) with Y fixed
// Uses normalized units where k = 1 for visual clarity

export function electricField2D(charges, x, z) {
  let Ex = 0, Ez = 0;
  for (const c of charges) {
    const dx = x - c.x;
    const dz = z - c.z;
    const r2 = dx * dx + dz * dz;
    if (r2 < 0.004) continue;
    const r3 = r2 * Math.sqrt(r2);
    Ex += c.q * dx / r3;
    Ez += c.q * dz / r3;
  }
  return [Ex, Ez];
}

export function electricPotential2D(charges, x, z) {
  let phi = 0;
  for (const c of charges) {
    const dx = x - c.x;
    const dz = z - c.z;
    const r = Math.sqrt(dx * dx + dz * dz);
    if (r < 0.05) continue;
    phi += c.q / r;
  }
  return phi;
}

function normalize2D(ex, ez) {
  const mag = Math.sqrt(ex * ex + ez * ez);
  if (mag < 1e-12) return [0, 0];
  return [ex / mag, ez / mag];
}

function nearCharge(charges, x, z, threshold = 0.14) {
  for (const c of charges) {
    const d2 = (x - c.x) ** 2 + (z - c.z) ** 2;
    if (d2 < threshold * threshold) return true;
  }
  return false;
}

// RK4 field line integration in 2D (XZ plane)
export function traceFieldLine2D(charges, startX, startZ, forward, stepSize, maxSteps, bounds) {
  if (charges.length === 0) return [];

  const pts = [[startX, startZ]];
  let x = startX, z = startZ;
  const dir = forward ? 1 : -1;

  for (let i = 0; i < maxSteps; i++) {
    const f = (px, pz) => {
      const [ex, ez] = electricField2D(charges, px, pz);
      const [nx, nz] = normalize2D(ex, ez);
      return [dir * nx, dir * nz];
    };

    const [k1x, k1z] = f(x, z);
    const [k2x, k2z] = f(x + stepSize * 0.5 * k1x, z + stepSize * 0.5 * k1z);
    const [k3x, k3z] = f(x + stepSize * 0.5 * k2x, z + stepSize * 0.5 * k2z);
    const [k4x, k4z] = f(x + stepSize * k3x, z + stepSize * k3z);

    x += stepSize / 6 * (k1x + 2 * k2x + 2 * k3x + k4x);
    z += stepSize / 6 * (k1z + 2 * k2z + 2 * k3z + k4z);

    if (Math.abs(x) > bounds || Math.abs(z) > bounds) break;
    if (nearCharge(charges, x, z)) break;

    pts.push([x, z]);
  }

  return pts;
}

// Generate field line seeds from a charge (evenly distributed angles)
export function fieldLineSeeds(charge, numLines, seedRadius = 0.18) {
  const seeds = [];
  for (let i = 0; i < numLines; i++) {
    const angle = (2 * Math.PI * i) / numLines;
    seeds.push([
      charge.x + seedRadius * Math.cos(angle),
      charge.z + seedRadius * Math.sin(angle),
    ]);
  }
  return seeds;
}

// Compute potential on a grid, return contour line segments for given levels
export function computeContourLines(charges, gridN, bounds, numLevels) {
  if (charges.length === 0) return [];

  const N = gridN;
  const step = (2 * bounds) / N;
  const grid = new Float32Array((N + 1) * (N + 1));

  let minPhi = Infinity, maxPhi = -Infinity;

  for (let i = 0; i <= N; i++) {
    for (let j = 0; j <= N; j++) {
      const x = -bounds + i * step;
      const z = -bounds + j * step;
      const phi = electricPotential2D(charges, x, z);
      const clamped = Math.max(-12, Math.min(12, phi));
      grid[i * (N + 1) + j] = clamped;
      if (clamped < minPhi) minPhi = clamped;
      if (clamped > maxPhi) maxPhi = clamped;
    }
  }

  const span = maxPhi - minPhi;
  if (span < 0.01) return [];

  const levels = [];
  for (let l = 1; l <= numLevels; l++) {
    levels.push(minPhi + (l / (numLevels + 1)) * span);
  }

  const allSegments = [];

  const g = (i, j) => grid[i * (N + 1) + j];

  for (const level of levels) {
    const segs = [];
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const v00 = g(i, j);
        const v10 = g(i + 1, j);
        const v01 = g(i, j + 1);
        const v11 = g(i + 1, j + 1);

        const x0 = -bounds + i * step;
        const z0 = -bounds + j * step;
        const x1 = x0 + step;
        const z1 = z0 + step;

        const crossings = [];
        const t = (a, b) => (level - a) / (b - a);

        if ((v00 > level) !== (v10 > level))
          crossings.push([x0 + t(v00, v10) * step, z0]);
        if ((v10 > level) !== (v11 > level))
          crossings.push([x1, z0 + t(v10, v11) * step]);
        if ((v01 > level) !== (v11 > level))
          crossings.push([x0 + t(v01, v11) * step, z1]);
        if ((v00 > level) !== (v01 > level))
          crossings.push([x0, z0 + t(v00, v01) * step]);

        if (crossings.length >= 2) {
          segs.push(crossings[0], crossings[1]);
        }
      }
    }
    allSegments.push({ level, segs });
  }

  return allSegments;
}

// Probe: field vector and potential at a point
export function probeAt(charges, x, z) {
  const [Ex, Ez] = electricField2D(charges, x, z);
  const phi = electricPotential2D(charges, x, z);
  const E_mag = Math.sqrt(Ex * Ex + Ez * Ez);
  return { Ex, Ez, E_mag, phi };
}
