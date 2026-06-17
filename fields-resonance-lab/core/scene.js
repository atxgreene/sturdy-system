import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';

export function buildScene(canvas) {

  // ── Renderer ────────────────────────────────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.xr.enabled = true;

  // ── Scene ───────────────────────────────────────────────────────────────────
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x010307);
  scene.fog = new THREE.FogExp2(0x020610, 0.020);

  // ── Camera ──────────────────────────────────────────────────────────────────
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.05, 200);
  camera.position.set(0, 1.7, 8);

  // ── Post-processing ──────────────────────────────────────────────────────────
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.70,   // strength
    0.55,   // radius
    0.12,   // threshold — lower = more objects glow
  );
  composer.addPass(bloomPass);
  composer.addPass(new OutputPass());

  const fxaaPass = new ShaderPass(FXAAShader);
  fxaaPass.material.uniforms['resolution'].value.set(1 / window.innerWidth, 1 / window.innerHeight);
  composer.addPass(fxaaPass);

  // ── Procedural textures ─────────────────────────────────────────────────────
  const stoneTex = makeNoiseTexture(512, '#13131e', 16, 5, 2);
  stoneTex.repeat.set(5, 2);

  const wallTex = makeNoiseTexture(512, '#10101c', 10, 8, 2);
  wallTex.repeat.set(10, 2);

  const floorTex = makeFloorTexture(1024);
  floorTex.repeat.set(5, 5);

  // ── Lighting ─────────────────────────────────────────────────────────────────
  scene.add(new THREE.AmbientLight(0x08152a, 0.55));

  // Overhead oculus fill
  const ceilingFill = new THREE.PointLight(0x2266bb, 1.8, 40);
  ceilingFill.position.set(0, 9, 0);
  ceilingFill.castShadow = true;
  ceilingFill.shadow.mapSize.set(1024, 1024);
  ceilingFill.shadow.camera.far = 30;
  scene.add(ceilingFill);

  // Table primary glow
  const tableGlow = new THREE.PointLight(0x00e5ff, 3.0, 7);
  tableGlow.position.set(0, 1.3, 0);
  scene.add(tableGlow);

  // Table secondary — wider softer fill
  const tableFill = new THREE.PointLight(0x003d55, 1.4, 18);
  tableFill.position.set(0, 3, 0);
  scene.add(tableFill);

  // Gold uplight from floor center
  const goldFloor = new THREE.PointLight(0xffd700, 0.35, 9);
  goldFloor.position.set(0, 0.05, 0);
  scene.add(goldFloor);

  // Column halos (8 columns)
  for (let i = 0; i < 8; i++) {
    const angle = (2 * Math.PI * i) / 8;
    const pl = new THREE.PointLight(0x001533, 1.0, 7);
    pl.position.set(Math.sin(angle) * 13.5, 8.0, Math.cos(angle) * 13.5);
    scene.add(pl);
  }

  // Wing corridor spotlights
  for (let i = 0; i < 5; i++) {
    const angle = (2 * Math.PI * i) / 5 + Math.PI;
    const x = Math.sin(angle) * 16;
    const z = Math.cos(angle) * 16;
    const spot = new THREE.SpotLight(0x002a44, 2.5, 22, Math.PI / 5.5, 0.5);
    spot.position.set(x, 7, z);
    spot.target.position.set(x * 0.55, 0, z * 0.55);
    scene.add(spot, spot.target);
  }

  // ── Materials ────────────────────────────────────────────────────────────────
  const stoneMat = new THREE.MeshStandardMaterial({
    map: stoneTex, color: 0x191926, roughness: 0.93, metalness: 0.04,
  });
  const wallMat = new THREE.MeshStandardMaterial({
    map: wallTex, color: 0x101020, roughness: 0.94, metalness: 0.04,
  });
  const bronzeMat = new THREE.MeshStandardMaterial({
    color: 0x8b5a1e, emissive: 0x3a1500, emissiveIntensity: 0.3,
    roughness: 0.38, metalness: 0.88,
  });
  const floorMat = new THREE.MeshStandardMaterial({
    map: floorTex, color: 0x080812, roughness: 0.12, metalness: 0.65,
  });
  const tableMat = new THREE.MeshStandardMaterial({
    color: 0x04090f, emissive: 0x002040, emissiveIntensity: 0.6,
    roughness: 0.18, metalness: 0.85,
  });
  const tableTopMat = new THREE.MeshStandardMaterial({
    color: 0x000b14, emissive: 0x005577, emissiveIntensity: 1.4,
    transparent: true, opacity: 0.96, roughness: 0.04, metalness: 0.92,
  });
  const archGlowMatBase = new THREE.MeshStandardMaterial({
    color: 0x001528, emissive: 0x0055aa, emissiveIntensity: 1.4,
    transparent: true, opacity: 0.7, depthWrite: false,
  });

  // ── FLOOR ───────────────────────────────────────────────────────────────────
  const floor = new THREE.Mesh(new THREE.CylinderGeometry(20, 20, 0.15, 128), floorMat);
  floor.position.set(0, -0.075, 0);
  floor.receiveShadow = true;
  scene.add(floor);

  // Concentric emissive floor rings
  const ringData = [[3.0, 0x00e5ff, 1.4, 0.7], [5.5, 0x00bbdd, 0.7, 0.5],
                    [8.5, 0x003355, 0.4, 0.3], [12, 0x002233, 0.25, 0.2]];
  for (const [r, col, ei, op] of ringData) {
    const m = new THREE.MeshStandardMaterial({
      color: col, emissive: col, emissiveIntensity: ei,
      transparent: true, opacity: op, depthWrite: false,
    });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.022, 6, 128), m);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.005;
    scene.add(ring);
  }

  // ── WALLS ───────────────────────────────────────────────────────────────────
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(18.5, 18.5, 9, 128, 2, true), wallMat);
  wall.position.y = 4.5;
  wall.receiveShadow = true;
  scene.add(wall);

  // Bronze wall bands
  for (const y of [0.8, 2.5, 5.5, 8.2]) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(18.4, 0.055, 6, 128), bronzeMat);
    band.rotation.x = Math.PI / 2;
    band.position.y = y;
    scene.add(band);
  }

  // ── CEILING ─────────────────────────────────────────────────────────────────
  const ceiling = new THREE.Mesh(new THREE.CylinderGeometry(18.5, 18.5, 0.35, 128), stoneMat);
  ceiling.position.y = 9.175;
  scene.add(ceiling);

  // Ceiling coffer rings
  for (const r of [4, 8, 12, 16]) {
    const coffer = new THREE.Mesh(new THREE.TorusGeometry(r, 0.07, 6, 128), bronzeMat);
    coffer.rotation.x = Math.PI / 2;
    coffer.position.y = 9.0;
    scene.add(coffer);
  }

  // Oculus — bright emissive portal
  const oculusMat = new THREE.MeshStandardMaterial({
    color: 0x000a1a, emissive: 0x0044cc, emissiveIntensity: 3.5,
  });
  const oculus = new THREE.Mesh(new THREE.CircleGeometry(2.8, 96), oculusMat);
  oculus.rotation.x = -Math.PI / 2;
  oculus.position.y = 9.09;
  scene.add(oculus);

  // Oculus rim
  const oculusRim = new THREE.Mesh(
    new THREE.TorusGeometry(2.8, 0.2, 12, 96),
    new THREE.MeshStandardMaterial({
      color: 0xffd700, emissive: 0xcc8800, emissiveIntensity: 1.2,
      roughness: 0.15, metalness: 0.95,
    }),
  );
  oculusRim.rotation.x = Math.PI / 2;
  oculusRim.position.y = 9.08;
  scene.add(oculusRim);

  // Light shaft from oculus (volumetric cone illusion)
  const shaftMat = new THREE.MeshBasicMaterial({
    color: 0x0a2a66, transparent: true, opacity: 0.035,
    side: THREE.BackSide, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  scene.add(Object.assign(
    new THREE.Mesh(new THREE.CylinderGeometry(0.3, 2.8, 9, 48, 1, true), shaftMat),
    { position: new THREE.Vector3(0, 4.55, 0) },
  ));

  // ── COLUMNS (8) ─────────────────────────────────────────────────────────────
  const colGeo   = new THREE.CylinderGeometry(0.30, 0.42, 9.0, 14);
  const capGeo   = new THREE.CylinderGeometry(0.64, 0.30, 0.48, 10);
  const baseGeo  = new THREE.CylinderGeometry(0.52, 0.66, 0.32, 10);
  const baseRimGeo = new THREE.CylinderGeometry(0.74, 0.74, 0.06, 10);

  for (let i = 0; i < 8; i++) {
    const angle = (2 * Math.PI * i) / 8;
    const cx = Math.sin(angle) * 13.5;
    const cz = Math.cos(angle) * 13.5;

    const col = new THREE.Mesh(colGeo, stoneMat);
    col.position.set(cx, 4.5, cz);
    col.castShadow = true;
    scene.add(col);

    scene.add(Object.assign(new THREE.Mesh(capGeo, bronzeMat), { position: new THREE.Vector3(cx, 9.12, cz) }));
    scene.add(Object.assign(new THREE.Mesh(baseGeo, bronzeMat), { position: new THREE.Vector3(cx, 0.16, cz) }));
    scene.add(Object.assign(new THREE.Mesh(baseRimGeo, bronzeMat), { position: new THREE.Vector3(cx, 0.03, cz) }));

    // Trim bands at 3 m and 6 m
    for (const yOff of [3.0, 6.0]) {
      const trim = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.048, 7, 28), bronzeMat);
      trim.rotation.x = Math.PI / 2;
      trim.position.set(cx, yOff, cz);
      scene.add(trim);
    }

    // Column base glow ring
    const cgMat = new THREE.MeshStandardMaterial({
      color: 0x002244, emissive: 0x0044aa, emissiveIntensity: 1.8,
      transparent: true, opacity: 0.75, depthWrite: false,
    });
    const cg = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.022, 6, 28), cgMat);
    cg.rotation.x = Math.PI / 2;
    cg.position.set(cx, 0.33, cz);
    scene.add(cg);
  }

  // ── WING ARCHWAYS (5 × 72°) ──────────────────────────────────────────────────
  const wingNames    = [
    'Electrostatic Field Chamber',
    'Boundary Conditions Theater',
    'Magnetic Field & Resonance Hall',
    'Frequency, Vibration & Harmonics Lab',
    'Field Manipulation & Harnessing Sandbox',
  ];
  const wingShortNames = ['ELECTROSTATICS', 'BOUNDARIES', 'MAGNETISM', 'FREQUENCY', 'HARNESSING'];
  const wingColors     = [0x00ccff, 0xff8800, 0xaa00ff, 0x00ff88, 0xffcc00];
  const wingVersions   = ['v0.2', 'v0.3', 'v0.5', 'v0.4', 'v0.6'];
  const wings = [];

  for (let i = 0; i < 5; i++) {
    const angle = (2 * Math.PI * i) / 5 + Math.PI;
    const ax = Math.sin(angle) * 17.5;
    const az = Math.cos(angle) * 17.5;
    const perpAngle = angle + Math.PI / 2;

    // Pillar pair
    for (const side of [-1, 1]) {
      const px = ax + Math.sin(perpAngle) * side * 1.55;
      const pz = az + Math.cos(perpAngle) * side * 1.55;
      const center3 = new THREE.Vector3(0, 2.9, 0);

      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.56, 5.8, 0.88), stoneMat);
      pillar.position.set(px, 2.9, pz);
      pillar.lookAt(center3);
      pillar.castShadow = true;
      scene.add(pillar);

      const pBase = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.36, 1.05), bronzeMat);
      pBase.position.set(px, 0.18, pz);
      pBase.lookAt(new THREE.Vector3(0, 0.18, 0));
      scene.add(pBase);

      const pCap = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.32, 1.05), bronzeMat);
      pCap.position.set(px, 6.0, pz);
      pCap.lookAt(new THREE.Vector3(0, 6.0, 0));
      scene.add(pCap);
    }

    // Lintel
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.52, 0.88), bronzeMat);
    lintel.position.set(ax, 6.14, az);
    lintel.lookAt(new THREE.Vector3(0, 6.14, 0));
    scene.add(lintel);

    // Keystone
    const keystone = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.48, 0.92), bronzeMat);
    keystone.position.set(ax, 6.55, az);
    keystone.lookAt(new THREE.Vector3(0, 6.55, 0));
    scene.add(keystone);

    // Glow panel
    const glowMat = archGlowMatBase.clone();
    const glowPanel = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 5.4), glowMat);
    glowPanel.position.set(ax * 0.955, 2.7, az * 0.955);
    glowPanel.lookAt(new THREE.Vector3(0, 2.7, 0));
    scene.add(glowPanel);

    // Wing label sprite
    const lbl = makeWingLabel(wingShortNames[i], wingColors[i], wingNames[i]);
    lbl.position.set(ax * 0.895, 5.3, az * 0.895);
    scene.add(lbl);

    // Per-wing accent point light (starts off, brightens on approach)
    const accentColor = wingColors[i];
    const accentLight = new THREE.PointLight(accentColor, 0.0, 10);
    accentLight.position.set(ax * 0.82, 1.8, az * 0.82);
    scene.add(accentLight);

    wings.push({
      name: wingNames[i],
      shortName: wingShortNames[i],
      version: wingVersions[i],
      color: wingColors[i],
      worldPos: new THREE.Vector3(ax, 1.7, az),
      glowMat,
      lbl,
      accentLight,
      wasApproaching: false,
    });
  }

  // ── CENTRAL BOUNDARY LOOM ────────────────────────────────────────────────────
  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 2.45, 0.58, 64), tableMat);
  pedestal.position.set(0, 0.29, 0);
  pedestal.castShadow = true;
  scene.add(pedestal);

  // Pedestal bands
  for (const y of [0.08, 0.50]) {
    const pb = new THREE.Mesh(new THREE.TorusGeometry(1.88, 0.032, 6, 96), bronzeMat);
    pb.rotation.x = Math.PI / 2;
    pb.position.y = y;
    scene.add(pb);
  }

  const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(3.35, 1.55, 0.22, 96), tableTopMat);
  tableTop.position.set(0, 0.69, 0);
  scene.add(tableTop);

  // Table rim — glowing gold
  const tableRimMat = new THREE.MeshStandardMaterial({
    color: 0xffd700, emissive: 0xcc8800, emissiveIntensity: 1.1,
    roughness: 0.15, metalness: 0.95,
  });
  scene.add(Object.assign(
    new THREE.Mesh(new THREE.TorusGeometry(3.36, 0.085, 10, 128), tableRimMat),
    { rotation: new THREE.Euler(Math.PI / 2, 0, 0), position: new THREE.Vector3(0, 0.70, 0) },
  ));

  // Inner glow rings on table surface
  for (const [r, ei] of [[2.65, 2.2], [1.85, 1.5], [1.05, 1.0]]) {
    const m = new THREE.MeshStandardMaterial({
      color: 0x00e5ff, emissive: 0x00e5ff, emissiveIntensity: ei,
      transparent: true, opacity: 0.88, depthWrite: false,
    });
    const gr = new THREE.Mesh(new THREE.TorusGeometry(r, 0.024, 8, 128), m);
    gr.rotation.x = Math.PI / 2;
    gr.position.set(0, 0.81, 0);
    scene.add(gr);
  }

  // Table label
  const tableLbl = makeWingLabel('BOUNDARY LOOM', 0x00e5ff, 'Central Simulation Interface');
  tableLbl.position.set(0, 2.7, 0);
  scene.add(tableLbl);

  // ── ATMOSPHERIC MOTES ────────────────────────────────────────────────────────
  const MOTE_COUNT = 900;
  const motePos = new Float32Array(MOTE_COUNT * 3);
  const moteCol = new Float32Array(MOTE_COUNT * 3);

  // Color palette: teal, gold, purple, blue, faint white
  const palette = [
    [0.0, 0.80, 1.0], [0.9, 0.70, 0.0], [0.55, 0.05, 0.9],
    [0.0, 0.45, 1.0], [0.25, 0.55, 0.8],
  ];
  for (let i = 0; i < MOTE_COUNT; i++) {
    const r = 3.5 + Math.random() * 13.5;
    const theta = Math.random() * Math.PI * 2;
    motePos[i * 3]     = Math.sin(theta) * r;
    motePos[i * 3 + 1] = 0.5 + Math.random() * 8.0;
    motePos[i * 3 + 2] = Math.cos(theta) * r;
    const c = palette[Math.floor(Math.random() * palette.length)];
    moteCol[i * 3] = c[0]; moteCol[i * 3 + 1] = c[1]; moteCol[i * 3 + 2] = c[2];
  }
  const moteGeo = new THREE.BufferGeometry();
  moteGeo.setAttribute('position', new THREE.Float32BufferAttribute(motePos, 3));
  moteGeo.setAttribute('color',    new THREE.Float32BufferAttribute(moteCol, 3));
  const moteMat = new THREE.PointsMaterial({
    size: 0.055, vertexColors: true,
    transparent: true, opacity: 0.8,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const motes = new THREE.Points(moteGeo, moteMat);
  scene.add(motes);

  // ── RESIZE ───────────────────────────────────────────────────────────────────
  window.addEventListener('resize', () => {
    const w = window.innerWidth, h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setSize(w, h);
    bloomPass.resolution.set(w, h);
    fxaaPass.material.uniforms['resolution'].value.set(1 / w, 1 / h);
  });

  return { scene, renderer, camera, motes, wings, composer };
}

// ── Procedural texture generators ────────────────────────────────────────────

function makeNoiseTexture(size, baseColor, variance, cracks, repeat) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, size, size);

  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() * 2 - 1) * variance;
    d[i]     = Math.max(0, Math.min(255, d[i]     + n));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n + 4));
    // rare teal sparkle
    if (Math.random() < 0.0015) { d[i] = 10; d[i+1] = 55; d[i+2] = 90; d[i+3] = 60; }
  }
  ctx.putImageData(img, 0, 0);

  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 0.7;
  for (let k = 0; k < cracks; k++) {
    ctx.beginPath();
    ctx.moveTo(Math.random() * size, Math.random() * size);
    let x = Math.random() * size, y = Math.random() * size;
    for (let j = 0; j < 4; j++) {
      x = Math.max(0, Math.min(size, x + (Math.random() - 0.5) * 70));
      y = Math.max(0, Math.min(size, y + (Math.random() - 0.5) * 70));
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, 2);
  return tex;
}

function makeFloorTexture(size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#050510';
  ctx.fillRect(0, 0, size, size);

  // Subtle noise shimmer
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = Math.random() * 7;
    d[i] = n; d[i+1] = n; d[i+2] = n + 6;
  }
  ctx.putImageData(img, 0, 0);

  // Fine grid
  ctx.strokeStyle = 'rgba(0, 160, 220, 0.07)';
  ctx.lineWidth = 0.5;
  const step = size / 32;
  for (let i = 0; i <= 32; i++) {
    ctx.beginPath(); ctx.moveTo(i * step, 0); ctx.lineTo(i * step, size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i * step); ctx.lineTo(size, i * step); ctx.stroke();
  }

  // Faint rune arcs
  ctx.strokeStyle = 'rgba(0, 200, 255, 0.1)';
  ctx.lineWidth = 1.2;
  for (const r of [size * 0.15, size * 0.28, size * 0.40]) {
    ctx.beginPath(); ctx.arc(size / 2, size / 2, r, 0, Math.PI * 2); ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// ── Wing label sprite ─────────────────────────────────────────────────────────
function makeWingLabel(shortName, color, fullName) {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const hex = '#' + color.toString(16).padStart(6, '0');

  ctx.clearRect(0, 0, 512, 128);
  ctx.font = 'bold 30px monospace';
  ctx.fillStyle = hex;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // subtle glow behind text
  ctx.shadowColor = hex;
  ctx.shadowBlur = 12;
  ctx.fillText(shortName, 256, 38);
  ctx.shadowBlur = 0;
  ctx.font = '18px monospace';
  ctx.fillStyle = 'rgba(180,220,255,0.65)';
  ctx.fillText(fullName, 256, 80);

  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(2.5, 0.62, 1);
  return sprite;
}
