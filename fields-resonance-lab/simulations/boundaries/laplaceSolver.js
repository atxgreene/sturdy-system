// Grid-based Laplace/Poisson solver using Gauss-Seidel with SOR
// Solves ∇²φ = ρ on a 2D grid with mixed boundary conditions

export const BoundaryType = {
  INTERIOR: 0,
  DIRICHLET: 1,   // fixed value
  NEUMANN: 2,     // zero normal derivative (no-flux)
  GROUNDED: 3,    // Dirichlet with value = 0
  ABSORBING: 4,   // approximated as weakly damped boundary
};

export class LaplaceGrid {
  constructor(N = 60) {
    this.N = N;
    this.phi = new Float32Array(N * N);         // current potential
    this.rho = new Float32Array(N * N);         // source term (0 = Laplace)
    this.btype = new Uint8Array(N * N);         // boundary type
    this.bvalue = new Float32Array(N * N);      // boundary value (Dirichlet)
    this.omega = 1.85;                          // SOR relaxation factor
    this.converged = false;
    this.residual = Infinity;
    this.iteration = 0;

    this._initDefaults();
  }

  _initDefaults() {
    // Default: all interior, outer wall grounded
    const { N, btype, bvalue, phi } = this;
    btype.fill(BoundaryType.INTERIOR);
    phi.fill(0);

    // Outer wall = Dirichlet 0 (grounded conductor)
    for (let i = 0; i < N; i++) {
      const setBound = (r, c) => {
        btype[r * N + c] = BoundaryType.DIRICHLET;
        bvalue[r * N + c] = 0;
      };
      setBound(0, i);
      setBound(N - 1, i);
      setBound(i, 0);
      setBound(i, N - 1);
    }
  }

  reset() {
    this.phi.fill(0);
    this.iteration = 0;
    this.converged = false;
    this.residual = Infinity;
  }

  fullReset() {
    this.phi.fill(0);
    this.rho.fill(0);
    this.btype.fill(BoundaryType.INTERIOR);
    this.bvalue.fill(0);
    this.iteration = 0;
    this.converged = false;
    this._initDefaults();
  }

  // Set a rectangular region to a boundary type
  setRect(r0, c0, r1, c1, type, value = 0) {
    const { N, btype, bvalue } = this;
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        if (r < 0 || r >= N || c < 0 || c >= N) continue;
        btype[r * N + c] = type;
        bvalue[r * N + c] = value;
      }
    }
    this.converged = false;
  }

  // Set a single cell
  setCell(r, c, type, value = 0) {
    if (r < 0 || r >= this.N || c < 0 || c >= this.N) return;
    this.btype[r * this.N + c] = type;
    this.bvalue[r * this.N + c] = value;
    this.converged = false;
  }

  // Run n SOR iterations, return residual
  iterate(n = 20) {
    if (this.converged) return this.residual;

    const { N, phi, rho, btype, bvalue, omega } = this;
    let maxResidual = 0;

    for (let iter = 0; iter < n; iter++) {
      maxResidual = 0;

      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
          const idx = r * N + c;
          const t = btype[idx];

          if (t === BoundaryType.DIRICHLET || t === BoundaryType.GROUNDED) {
            phi[idx] = bvalue[idx];
            continue;
          }

          if (t === BoundaryType.NEUMANN) {
            // Zero-flux: mirror neighbor values
            const top    = r > 0     ? phi[(r - 1) * N + c] : phi[idx];
            const bottom = r < N - 1 ? phi[(r + 1) * N + c] : phi[idx];
            const left   = c > 0     ? phi[r * N + c - 1] : phi[idx];
            const right  = c < N - 1 ? phi[r * N + c + 1] : phi[idx];
            phi[idx] = (top + bottom + left + right) / 4 + rho[idx] * 0.25;
            continue;
          }

          // Interior: standard GS update
          if (r === 0 || r === N - 1 || c === 0 || c === N - 1) continue;

          const top    = phi[(r - 1) * N + c];
          const bottom = phi[(r + 1) * N + c];
          const left   = phi[r * N + c - 1];
          const right  = phi[r * N + c + 1];

          const phi_gs = (top + bottom + left + right + rho[idx]) / 4;
          const phi_new = (1 - omega) * phi[idx] + omega * phi_gs;
          const res = Math.abs(phi_new - phi[idx]);
          if (res > maxResidual) maxResidual = res;
          phi[idx] = phi_new;
        }
      }
    }

    this.iteration += n;
    this.residual = maxResidual;
    if (maxResidual < 1e-5) this.converged = true;
    return maxResidual;
  }

  // Sample potential at normalized coords (u,v ∈ [0,1])
  sampleAt(u, v) {
    const { N, phi } = this;
    const r = Math.max(0, Math.min(N - 1, Math.floor(v * N)));
    const c = Math.max(0, Math.min(N - 1, Math.floor(u * N)));
    return phi[r * N + c];
  }

  // Compute gradient (field) at grid cell (r,c)
  fieldAt(r, c) {
    const { N, phi } = this;
    const r1 = Math.max(0, Math.min(N - 1, r));
    const c1 = Math.max(0, Math.min(N - 1, c));
    const top    = r1 > 0     ? phi[(r1 - 1) * N + c1] : phi[r1 * N + c1];
    const bottom = r1 < N - 1 ? phi[(r1 + 1) * N + c1] : phi[r1 * N + c1];
    const left   = c1 > 0     ? phi[r1 * N + c1 - 1] : phi[r1 * N + c1];
    const right  = c1 < N - 1 ? phi[r1 * N + c1 + 1] : phi[r1 * N + c1];
    return [-(right - left) / 2, -(bottom - top) / 2]; // [Ex, Ez]
  }
}
