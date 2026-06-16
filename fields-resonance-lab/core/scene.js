import * as THREE from 'three';

export function buildScene(canvas) {
  // Renderer
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.85;
  renderer.xr.enabled = true;

  // Scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x030509);
  scene.fog = new THREE.FogExp2(0x06090f, 0.028);

  // Camera
  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 1.7, 8);

  // Lighting
  const ambient = new THREE.AmbientLight(0x0d1a2a, 0.5);
  scene.add(ambient);

  const centerLight = new THREE.PointLight(0x00ccee, 1.2, 30);
  centerLight.position.set(0, 6, 0);
  centerLight.castShadow = true;
  scene.add(centerLight);

  const tableGlow = new THREE.PointLight(0x00e5ff, 1.5, 8);
  tableGlow.position.set(0, 1.2, 0);
  scene.add(tableGlow);

  const warmAccent = new THREE.PointLight(0xffd700, 0.4, 25);
  warmAccent.position.set(0, 0.3, 0);
  scene.add(warmAccent);

  // Wing corridor lights (5 directions, 72° apart)
  for (let i = 0; i < 5; i++) {
    const angle = (2 * Math.PI * i) / 5;
    const x = Math.sin(angle) * 16;
    const z = Math.cos(angle) * 16;
    const wingLight = new THREE.PointLight(0x1a3a5c, 0.6, 10);
    wingLight.position.set(x, 1.5, z);
    scene.add(wingLight);
  }

  // Materials
  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0x141420,
    roughness: 0.92,
    metalness: 0.08,
  });

  const bronzeMat = new THREE.MeshStandardMaterial({
    color: 0x7c4e1e,
    emissive: 0x3a1a00,
    emissiveIntensity: 0.15,
    roughness: 0.55,
    metalness: 0.75,
  });

  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x0d0d1a,
    roughness: 0.88,
    metalness: 0.05,
  });

  const archGlowMat = new THREE.MeshStandardMaterial({
    color: 0x002233,
    emissive: 0x004466,
    emissiveIntensity: 0.8,
    transparent: true,
    opacity: 0.85,
  });

  const tableMat = new THREE.MeshStandardMaterial({
    color: 0x050a14,
    emissive: 0x003344,
    emissiveIntensity: 0.4,
    roughness: 0.3,
    metalness: 0.6,
  });

  const tableTopMat = new THREE.MeshStandardMaterial({
    color: 0x000d1a,
    emissive: 0x004466,
    emissiveIntensity: 0.9,
    transparent: true,
    opacity: 0.92,
    roughness: 0.1,
    metalness: 0.8,
  });

  // ── CHAMBER GEOMETRY ────────────────────────────────────────────────────

  // Floor
  const floor = new THREE.Mesh(new THREE.CylinderGeometry(20, 20, 0.15, 64), floorMat);
  floor.position.set(0, -0.075, 0);
  floor.receiveShadow = true;
  scene.add(floor);

  // Floor grid lines (etched)
  const gridHelper = new THREE.GridHelper(36, 36, 0x0a1a2a, 0x0a1a2a);
  gridHelper.position.y = 0.01;
  gridHelper.material.transparent = true;
  gridHelper.material.opacity = 0.35;
  scene.add(gridHelper);

  // Outer wall
  const wallGeo = new THREE.CylinderGeometry(18.5, 18.5, 9, 64, 1, true);
  const wall = new THREE.Mesh(wallGeo, stoneMat);
  wall.position.y = 4.5;
  wall.receiveShadow = true;
  scene.add(wall);

  // Ceiling
  const ceiling = new THREE.Mesh(new THREE.CylinderGeometry(18.5, 18.5, 0.3, 64), stoneMat);
  ceiling.position.y = 9.15;
  scene.add(ceiling);

  // Inner ceiling detail ring
  const ceilRing = new THREE.Mesh(
    new THREE.TorusGeometry(6, 0.12, 8, 64),
    bronzeMat,
  );
  ceilRing.rotation.x = Math.PI / 2;
  ceilRing.position.y = 9.0;
  scene.add(ceilRing);

  // Ceiling center oculus
  const oculusMat = new THREE.MeshStandardMaterial({
    color: 0x000511,
    emissive: 0x002233,
    emissiveIntensity: 0.6,
  });
  const oculus = new THREE.Mesh(new THREE.CircleGeometry(3, 64), oculusMat);
  oculus.rotation.x = -Math.PI / 2;
  oculus.position.y = 9.0;
  scene.add(oculus);

  // Columns (8 equally spaced at radius 13.5)
  const colGeo = new THREE.CylinderGeometry(0.35, 0.45, 9.0, 8);
  const capGeo = new THREE.CylinderGeometry(0.6, 0.35, 0.3, 8);
  const baseGeo = new THREE.CylinderGeometry(0.55, 0.65, 0.25, 8);

  for (let i = 0; i < 8; i++) {
    const angle = (2 * Math.PI * i) / 8;
    const cx = Math.sin(angle) * 13.5;
    const cz = Math.cos(angle) * 13.5;

    const col = new THREE.Mesh(colGeo, stoneMat);
    col.position.set(cx, 4.5, cz);
    col.castShadow = true;
    scene.add(col);

    const cap = new THREE.Mesh(capGeo, bronzeMat);
    cap.position.set(cx, 9.15, cz);
    scene.add(cap);

    const base = new THREE.Mesh(baseGeo, bronzeMat);
    base.position.set(cx, 0.125, cz);
    scene.add(base);

    // Column trim ring at mid height
    const trimRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.42, 0.04, 6, 24),
      bronzeMat,
    );
    trimRing.rotation.x = Math.PI / 2;
    trimRing.position.set(cx, 4.5, cz);
    scene.add(trimRing);
  }

  // ── WING ARCHWAYS (5 wings at 72° intervals) ────────────────────────────

  const wingNames = [
    'Electrostatic Field Chamber',
    'Boundary Conditions Theater',
    'Magnetic Field & Resonance Hall',
    'Frequency, Vibration & Harmonics Lab',
    'Field Manipulation & Harnessing Sandbox',
  ];

  const wingShortNames = ['ELECTROSTATICS', 'BOUNDARIES', 'MAGNETISM', 'FREQUENCY', 'HARNESSING'];
  const wingColors = [0x00ccff, 0xff8800, 0xaa00ff, 0x00ff88, 0xffcc00];

  for (let i = 0; i < 5; i++) {
    const angle = (2 * Math.PI * i) / 5 + Math.PI; // offset so main wing faces forward
    const ax = Math.sin(angle) * 17.5;
    const az = Math.cos(angle) * 17.5;

    // Arch sides
    const archSide = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 5.5, 0.8),
      stoneMat,
    );

    const leftPillar = archSide.clone();
    const rightPillar = archSide.clone();
    const perpAngle = angle + Math.PI / 2;

    leftPillar.position.set(ax + Math.sin(perpAngle) * 1.4, 2.75, az + Math.cos(perpAngle) * 1.4);
    rightPillar.position.set(ax - Math.sin(perpAngle) * 1.4, 2.75, az - Math.cos(perpAngle) * 1.4);
    leftPillar.lookAt(new THREE.Vector3(0, 2.75, 0));
    rightPillar.lookAt(new THREE.Vector3(0, 2.75, 0));
    scene.add(leftPillar, rightPillar);

    // Arch lintel
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.45, 0.8), bronzeMat);
    lintel.position.set(ax, 5.72, az);
    lintel.lookAt(new THREE.Vector3(0, 5.72, 0));
    scene.add(lintel);

    // Arch glow panel (inactive state)
    const glowPanel = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 5.0), archGlowMat);
    glowPanel.position.set(ax * 0.96, 2.5, az * 0.96);
    glowPanel.lookAt(new THREE.Vector3(0, 2.5, 0));
    scene.add(glowPanel);

    // Wing label sprite
    const lbl = makeWingLabel(wingShortNames[i], wingColors[i], wingNames[i]);
    lbl.position.set(ax * 0.9, 5.0, az * 0.9);
    scene.add(lbl);
  }

  // ── CENTRAL BOUNDARY LOOM (simulation table) ────────────────────────────

  // Pedestal
  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(1.8, 2.2, 0.5, 32),
    tableMat,
  );
  pedestal.position.set(0, 0.25, 0);
  pedestal.castShadow = true;
  scene.add(pedestal);

  // Table top
  const tableTop = new THREE.Mesh(
    new THREE.CylinderGeometry(3.2, 1.8, 0.18, 64),
    tableTopMat,
  );
  tableTop.position.set(0, 0.54, 0);
  scene.add(tableTop);

  // Table rim (bronze)
  const tableRim = new THREE.Mesh(
    new THREE.TorusGeometry(3.22, 0.07, 8, 64),
    bronzeMat,
  );
  tableRim.rotation.x = Math.PI / 2;
  tableRim.position.set(0, 0.55, 0);
  scene.add(tableRim);

  // Inner glow ring on table
  const tableGlowRing = new THREE.Mesh(
    new THREE.TorusGeometry(2.5, 0.035, 8, 64),
    new THREE.MeshStandardMaterial({
      color: 0x00e5ff,
      emissive: 0x00e5ff,
      emissiveIntensity: 1.5,
      transparent: true,
      opacity: 0.7,
    }),
  );
  tableGlowRing.rotation.x = Math.PI / 2;
  tableGlowRing.position.set(0, 0.64, 0);
  scene.add(tableGlowRing);

  // Table label
  const tableLbl = makeWingLabel('BOUNDARY LOOM', 0x00e5ff, 'Central Simulation Interface');
  tableLbl.position.set(0, 2.4, 0);
  scene.add(tableLbl);

  // ── FLOATING PARTICLES (atmospheric motes) ───────────────────────────────

  const moteCount = 400;
  const motePts = new Float32Array(moteCount * 3);
  for (let i = 0; i < moteCount; i++) {
    const r = 4 + Math.random() * 12;
    const theta = Math.random() * Math.PI * 2;
    motePts[i * 3] = Math.sin(theta) * r;
    motePts[i * 3 + 1] = 0.3 + Math.random() * 8.0;
    motePts[i * 3 + 2] = Math.cos(theta) * r;
  }
  const moteGeo = new THREE.BufferGeometry();
  moteGeo.setAttribute('position', new THREE.Float32BufferAttribute(motePts, 3));
  const moteMat = new THREE.PointsMaterial({
    color: 0x003355,
    size: 0.06,
    transparent: true,
    opacity: 0.6,
    sizeAttenuation: true,
  });
  const motes = new THREE.Points(moteGeo, moteMat);
  scene.add(motes);

  // ── RESIZE HANDLER ───────────────────────────────────────────────────────

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return { scene, renderer, camera, motes };
}

function makeWingLabel(shortName, color, fullName) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  const hex = '#' + color.toString(16).padStart(6, '0');

  ctx.fillStyle = 'rgba(0,0,0,0.0)';
  ctx.fillRect(0, 0, 512, 128);

  ctx.font = 'bold 28px monospace';
  ctx.fillStyle = hex;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(shortName, 256, 38);

  ctx.font = '18px monospace';
  ctx.fillStyle = 'rgba(180,220,255,0.6)';
  ctx.fillText(fullName, 256, 80);

  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(2.4, 0.6, 1);
  return sprite;
}
