/* LEVERA — 3D hero: depth-parallax photo of the square + corridor of brand names (three.js) */
import * as THREE from 'three';

/* LEVERA hero: the square photo as a depth-mapped 3D scene (mouse parallax + a camera push into the palace),
   then a corridor of brand names in space that the camera flies through as you scroll. */
const LV = window.LV;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const stage = document.getElementById('stage');
const hero = document.getElementById('hero');
const canvas = document.getElementById('gl');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setClearColor(0x000000, 0);
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.autoClear = false;

/* ---------- background: depth-parallax photo ---------- */
const bgScene = new THREE.Scene();
const bgCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const U = {
  tPhoto: { value: null }, tDepth: { value: null },
  uMouse: { value: new THREE.Vector2() }, uPush: { value: 0 }, uFade: { value: 0 },
  uScreen: { value: new THREE.Vector2(1, 1) }, uImg: { value: 2262 / 1524 }, uTime: { value: 0 },
  uPearl: { value: new THREE.Color('#EFEDE8') }
};
const bgMat = new THREE.ShaderMaterial({
  uniforms: U, depthTest: false, depthWrite: false,
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
  fragmentShader: `
    precision highp float;
    uniform sampler2D tPhoto, tDepth;
    uniform vec2 uMouse, uScreen;
    uniform float uPush, uFade, uImg, uTime;
    uniform vec3 uPearl;
    varying vec2 vUv;
    void main(){
      float sa = uScreen.x / uScreen.y;
      vec2 uv = vUv;
      if (sa > uImg) uv.y = (uv.y - 0.5) * (uImg / sa) + 0.5; else uv.x = (uv.x - 0.5) * (sa / uImg) + 0.5;
      vec2 focus = vec2(0.5, 0.30);                       // the palace entrance
      uv = (uv - focus) * (0.93 / (1.0 + uPush * 0.6)) + focus;
      float d = texture2D(tDepth, uv).r;
      uv += uMouse * 0.02 * (d - 0.2);                     // near layers move more than the sky
      uv += (uv - focus) * (-d * uPush * 0.12);            // and swell as the camera pushes in
      uv.x += (1.0 - smoothstep(0.1, 0.3, d)) * sin(uTime * 0.07) * 0.004;  // slow cloud drift
      vec3 col = texture2D(tPhoto, uv).rgb;
      vec2 q = vUv - 0.5; col *= 1.0 - dot(q, q) * 0.5;
      col = mix(col, uPearl, uFade);
      gl_FragColor = vec4(col, 1.0);
      #include <colorspace_fragment>
    }`
});
bgScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bgMat));

const tl = new THREE.TextureLoader();
let photoReady = false;
Promise.all([
  new Promise(r => tl.load('assets/square.jpg', r)),
  new Promise(r => tl.load('assets/depth.png', r))
]).then(([photo, depth]) => {
  photo.colorSpace = THREE.SRGBColorSpace; photo.minFilter = THREE.LinearFilter; photo.generateMipmaps = false;
  depth.minFilter = THREE.LinearFilter; depth.generateMipmaps = false;
  U.tPhoto.value = photo; U.tDepth.value = depth; U.uImg.value = photo.image.width / photo.image.height;
  photoReady = true; stage.classList.add('live');
});

/* ---------- foreground: corridor of brand names ---------- */
const fgScene = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
const GAP = 7, START = 12;
const planes = [];
const ink = new THREE.Color('#16171A'), white = new THREE.Color('#ffffff');

function brandTexture(name, cap) {
  const c = document.createElement('canvas'); c.width = 2048; c.height = 520;
  const g = c.getContext('2d');
  g.textAlign = 'center'; g.fillStyle = '#fff';
  g.shadowColor = 'rgba(0,0,0,.28)'; g.shadowBlur = 26;
  const label = name.toUpperCase();
  if ('letterSpacing' in g) g.letterSpacing = '22px';
  let fs = 210; g.font = '600 ' + fs + 'px "Cinzel", "Bodoni Moda", Georgia, serif';
  while (g.measureText(label).width > 1860 && fs > 70) { fs -= 6; g.font = '600 ' + fs + 'px "Cinzel", "Bodoni Moda", Georgia, serif'; }
  g.fillText(label, 1024, 315);
  g.shadowBlur = 0; g.lineJoin = 'round'; g.lineWidth = Math.max(2, fs * .014); g.strokeStyle = '#fff';
  g.strokeText(label, 1024, 315);
  g.shadowBlur = 12;
  g.font = '500 40px "JetBrains Mono", monospace';
  if ('letterSpacing' in g) g.letterSpacing = '12px';
  g.fillText(cap.toUpperCase(), 1024, 440);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
function buildCorridor() {
  planes.forEach(p => { fgScene.remove(p.mesh); p.mesh.material.map.dispose(); p.mesh.material.dispose(); });
  planes.length = 0;
  const n = LV.corridor.length;
  LV.corridor.forEach((b, i) => {
    const cap = String(i + 1).padStart(2, '0') + ' / ' + String(n).padStart(2, '0') + '   ·   ' + b.en;
    const mat = new THREE.MeshBasicMaterial({ map: brandTexture(b.name, cap), transparent: true, depthWrite: false, toneMapped: false, opacity: 0 });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 520 / 2048), mat);
    const side = i % 2 ? 1 : -1;
    const lane = [0.0, 1.0, 0.45, 1.25, 0.2, 0.85][i % 6];
    planes.push({ mesh, z: -START - i * GAP, side, lane, y: side > 0 ? -0.45 - lane * 0.35 : 0.55 + lane * 0.35 });
    fgScene.add(mesh);
  });
  layout();
}
window.LV_onLang = () => buildCorridor();

/* ---------- layout ---------- */
let W = 1, H = 1, narrow = false;
function layout() {
  W = stage.clientWidth; H = stage.clientHeight;
  renderer.setSize(W, H, false);
  U.uScreen.value.set(W, H);
  cam.aspect = W / H; narrow = cam.aspect < .9; cam.fov = narrow ? 62 : 50; cam.updateProjectionMatrix();
  const width = narrow ? 3.3 : 5.0;
  planes.forEach(p => {
    p.mesh.scale.set(width, width, 1);
    p.x = p.side * (narrow ? 0.3 + p.lane * .3 : 1.75 + p.lane * 1.15);
    p.mesh.position.set(p.x, p.y * (narrow ? 1.4 : 1), p.z);
    p.mesh.rotation.y = -p.side * (narrow ? .1 : .22);
  });
}
new ResizeObserver(layout).observe(stage);

/* ---------- interaction + loop ---------- */
const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
stage.addEventListener('pointermove', e => {
  const r = stage.getBoundingClientRect();
  mouse.tx = (e.clientX - r.left) / r.width - .5; mouse.ty = (e.clientY - r.top) / r.height - .5;
});
stage.addEventListener('pointerleave', () => { mouse.tx = mouse.ty = 0; });

let visible = true;
new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(stage);
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
let pS = 0, time = 0, last = performance.now();
const tmp = new THREE.Color();

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  if (!visible) return;
  time += dt;
  const r = hero.getBoundingClientRect();
  const span = Math.max(1, hero.offsetHeight - stage.offsetHeight);
  pS += (clamp(-r.top / span) - pS) * Math.min(1, dt * 6);
  stage.style.setProperty('--p', pS.toFixed(4));
  const k = Math.min(1, dt * 3.5);
  mouse.x += (mouse.tx - mouse.x) * k; mouse.y += (mouse.ty - mouse.y) * k;

  const push = smooth(0, .42, pS);
  const fade = smooth(.36, .7, pS);
  const fly = smooth(.12, .92, pS);
  stage.style.setProperty('--fade', fade.toFixed(4));
  U.uPush.value = push; U.uFade.value = fade; U.uTime.value = reduce ? 0 : time;
  U.uMouse.value.set(reduce ? 0 : -mouse.x, reduce ? 0 : mouse.y);

  // camera flies down the corridor
  const n = planes.length;
  const endZ = -(START + (n - 1) * GAP + 6);
  cam.position.set(mouse.x * .5, -mouse.y * .3, 2 + fly * (endZ - 2));
  cam.rotation.set(-mouse.y * .04, -mouse.x * .06, 0);
  tmp.copy(white).lerp(ink, fade);
  for (const p of planes) {
    const ahead = cam.position.z - p.z;           // > 0 while the name is in front of us
    p.mesh.material.opacity = smooth(36, 15, ahead) * smooth(-.5, 3.5, ahead) * smooth(.06, .16, pS);
    p.mesh.material.color.copy(tmp);
    p.mesh.position.y = p.y * (narrow ? 1.4 : 1) + Math.sin(time * .6 + p.z) * (reduce ? 0 : .04);
  }

  renderer.clear();
  if (photoReady) renderer.render(bgScene, bgCam);
  renderer.render(fgScene, cam);
}

(document.fonts && document.fonts.load ? Promise.all([
  document.fonts.load('400 120px "Bodoni Moda"'), document.fonts.load('600 120px "Cinzel"'), document.fonts.load('500 40px "JetBrains Mono"')
]).catch(() => {}) : Promise.resolve()).then(async () => { await useShopBrands(); buildCorridor(); requestAnimationFrame(frame); });
// every brand that has pieces in the shop flies past, the hand-picked houses first
async function useShopBrands() {
  try {
    await LV.ready; const list = (LV.brands || []).filter(b => b.count > 0); if (!list.length) return;
    const first = LV.corridor.map(c => c.name.toLowerCase());
    list.sort((a, b) => ((first.indexOf(a.name.toLowerCase()) + 1 || 999) - (first.indexOf(b.name.toLowerCase()) + 1 || 999)) || b.count - a.count);
    LV.corridor = list.map(b => ({ name: b.name, en: (b.city_en || '') + ' · ' + b.count + (b.count === 1 ? ' piece' : ' pieces'), mn: (b.city_mn || '') + ' · ' + b.count + ' бараа' }));
  } catch (e) {}
}
