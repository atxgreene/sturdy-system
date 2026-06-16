// Web Worker: computes field lines and contours off the main thread
// Self-contained (no ES module imports — workers use classic scripts)

function electricField2D(charges, x, z) {
  let Ex = 0, Ez = 0;
  for (const c of charges) {
    const dx = x - c.x, dz = z - c.z;
    const r2 = dx * dx + dz * dz;
    if (r2 < 0.004) continue;
    const r3 = r2 * Math.sqrt(r2);
    Ex += c.q * dx / r3;
    Ez += c.q * dz / r3;
  }
  return [Ex, Ez];
}

function electricPotential2D(charges, x, z) {
  let phi = 0;
  for (const c of charges) {
    const dx = x - c.x, dz = z - c.z;
    const r = Math.sqrt(dx * dx + dz * dz);
    if (r < 0.05) continue;
    phi += c.q / r;
  }
  return phi;
}

function nearCharge(charges, x, z, threshold = 0.14) {
  for (const c of charges) {
    if ((x - c.x) ** 2 + (z - c.z) ** 2 < threshold * threshold) return true;
  }
  return false;
}

function traceFieldLine2D(charges, sx, sz, forward, stepSize, maxSteps, bounds) {
  if (!charges.length) return [];
  const pts = [[sx, sz]];
  let x = sx, z = sz;
  const dir = forward ? 1 : -1;

  for (let i = 0; i < maxSteps; i++) {
    const f = (px, pz) => {
      const [ex, ez] = electricField2D(charges, px, pz);
      const mag = Math.sqrt(ex * ex + ez * ez);
      if (mag < 1e-12) return [0, 0];
      return [dir * ex / mag, dir * ez / mag];
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

function fieldLineSeeds(charge, n, r = 0.18) {
  return Array.from({ length: n }, (_, i) => {
    const a = (2 * Math.PI * i) / n;
    return [charge.x + Math.cos(a) * r, charge.z + Math.sin(a) * r];
  });
}

function computeContourLines(charges, gridN, bounds, numLevels) {
  if (!charges.length) return [];
  const N = gridN;
  const step = (2 * bounds) / N;
  const grid = new Float32Array((N + 1) * (N + 1));
  let minPhi = Infinity, maxPhi = -Infinity;

  for (let i = 0; i <= N; i++) {
    for (let j = 0; j <= N; j++) {
      const x = -bounds + i * step;
      const z = -bounds + j * step;
      const phi = Math.max(-12, Math.min(12, electricPotential2D(charges, x, z)));
      grid[i * (N + 1) + j] = phi;
      if (phi < minPhi) minPhi = phi;
      if (phi > maxPhi) maxPhi = phi;
    }
  }

  const span = maxPhi - minPhi;
  if (span < 0.01) return [];
  const levels = Array.from({ length: numLevels }, (_, l) => minPhi + ((l + 0.5) / numLevels) * span);

  const g = (i, j) => grid[i * (N + 1) + j];
  const allSegs = [];

  for (const level of levels) {
    const segs = [];
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const v00 = g(i, j), v10 = g(i + 1, j), v01 = g(i, j + 1), v11 = g(i + 1, j + 1);
        const x0 = -bounds + i * step, z0 = -bounds + j * step;
        const x1 = x0 + step, z1 = z0 + step;
        const crossings = [];
        const t = (a, b) => (level - a) / (b - a);

        if ((v00 > level) !== (v10 > level)) crossings.push([x0 + t(v00, v10) * step, z0]);
        if ((v10 > level) !== (v11 > level)) crossings.push([x1, z0 + t(v10, v11) * step]);
        if ((v01 > level) !== (v11 > level)) crossings.push([x0 + t(v01, v11) * step, z1]);
        if ((v00 > level) !== (v01 > level)) crossings.push([x0, z0 + t(v00, v01) * step]);

        if (crossings.length >= 2) segs.push(crossings[0], crossings[1]);
      }
    }
    allSegs.push({ level, segs });
  }
  return allSegs;
}

self.onmessage = function({ data }) {
  const { charges, config, id } = data;
  const {
    lineSeeds = 16, stepSize = 0.05, maxSteps = 250,
    gridN = 60, equipotentialLevels = 10, bounds = 5.5,
  } = config;

  const fieldLines = [];
  const hasPositive = charges.some(c => c.q > 0);

  for (const charge of charges) {
    if (charge.q > 0) {
      const seeds = fieldLineSeeds(charge, lineSeeds);
      for (const [sx, sz] of seeds) {
        const pts = traceFieldLine2D(charges, sx, sz, true, stepSize, maxSteps, bounds);
        if (pts.length >= 2) fieldLines.push(pts);
      }
    } else if (!hasPositive) {
      const seeds = fieldLineSeeds(charge, lineSeeds, 1.8);
      for (const [sx, sz] of seeds) {
        const pts = traceFieldLine2D(charges, sx, sz, false, stepSize, 80, bounds);
        if (pts.length >= 2) fieldLines.push(pts);
      }
    }
  }

  const contours = computeContourLines(charges, gridN, 5.0, equipotentialLevels);

  self.postMessage({ fieldLines, contours, id });
};
