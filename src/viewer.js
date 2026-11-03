import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

const HIGHLIGHT = new THREE.Color(0x4a8cff);
const CLICK_TOLERANCE_PX = 5;

/**
 * Three.js scene: loads the head model, colors meshes by layer, handles
 * layer visibility/opacity, hover and click picking.
 */
export class Viewer {
  constructor(container, { layers, meshInfo, onSelect, onHover }) {
    this.container = container;
    this.layerColors = Object.fromEntries(layers.map((l) => [l.id, new THREE.Color(l.color)]));
    this.meshInfo = meshInfo; // mesh name -> { structure, side }
    this.onSelect = onSelect;
    this.onHover = onHover;
    this.meshesByLayer = new Map();
    this.layerState = new Map(layers.map((l) => [l.id, { visible: true, opacity: 1 }]));
    this.selected = null;
    this.frameListeners = [];
    this.placeHandler = null; // set while placing a note: (point, meshName) => void

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(35, container.clientWidth / container.clientHeight, 0.001, 10);

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x223355, 1.2));
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.6);
    keyLight.position.set(0.3, 0.5, 1);
    this.camera.add(keyLight); // light follows the camera so the front is always lit
    this.scene.add(this.camera);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this._bindEvents();
    this.renderer.setAnimationLoop(() => {
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
      for (const fn of this.frameListeners) fn();
    });
  }

  async load(url) {
    const draco = new DRACOLoader().setDecoderPath(`${import.meta.env.BASE_URL}draco/`);
    const loader = new GLTFLoader().setDRACOLoader(draco);
    const gltf = await loader.loadAsync(url);
    draco.dispose();
    this.setModel(gltf.scene);
  }

  /**
   * Shows a model (loaded or built in code). Meshes that share a name share one material.
   * With solidCut, surfaces seen from inside are drawn in plain color, so a solid
   * model opened by the clip plane looks filled in instead of hollow.
   */
  setModel(root, { solidCut = false } = {}) {
    const materials = new Map();
    root.traverse((obj) => {
      if (!obj.isMesh) return;
      const info = this.meshInfo.get(obj.name);
      if (!info) {
        obj.visible = false;
        console.warn(`No data entry for mesh "${obj.name}"`);
        return;
      }
      const layer = info.structure.layer;
      if (!materials.has(obj.name)) {
        const material = new THREE.MeshStandardMaterial({
          color: this.layerColors[layer],
          roughness: obj.userData.roughness ?? (layer === 'teeth' ? 0.35 : 0.6),
          metalness: 0,
          side: THREE.DoubleSide,
        });
        if (solidCut) {
          material.onBeforeCompile = (shader) => {
            shader.fragmentShader = shader.fragmentShader.replace(
              '#include <opaque_fragment>',
              `if (!gl_FrontFacing) outgoingLight = diffuseColor.rgb + totalEmissiveRadiance;
              #include <opaque_fragment>`,
            );
          };
        }
        materials.set(obj.name, material);
      }
      obj.material = materials.get(obj.name);
      obj.userData.layer = layer;
      if (!this.meshesByLayer.has(layer)) this.meshesByLayer.set(layer, []);
      this.meshesByLayer.get(layer).push(obj);
    });
    this.scene.add(root);
    this.model = root;
    this.resetView();
  }

  /** Hides everything on the far side of a plane (a cut-away view). Pass null to show it all. */
  setClipPlane(plane) {
    this.renderer.clippingPlanes = plane ? [plane] : [];
  }

  resetView() {
    // Front three-quarter view aimed at the mouth, far enough back to see the whole head.
    const teeth = new THREE.Box3();
    for (const m of this.meshesByLayer.get('teeth') ?? []) teeth.expandByObject(m);
    const all = new THREE.Box3().setFromObject(this.model);
    const center = all.getCenter(new THREE.Vector3());
    if (!teeth.isEmpty()) center.lerp(teeth.getCenter(new THREE.Vector3()), 0.6);
    const size = all.getSize(new THREE.Vector3()).length();
    this.controls.target.copy(center);
    this.camera.position.set(center.x - size * 0.52, center.y + size * 0.09, center.z + size * 1.5);
    this.controls.minDistance = size * 0.05;
    this.controls.maxDistance = size * 3;
    this.controls.update();
  }

  setLayerVisible(layer, visible) {
    this.layerState.get(layer).visible = visible;
    this._applyLayer(layer);
  }

  setLayerOpacity(layer, opacity) {
    this.layerState.get(layer).opacity = opacity;
    this._applyLayer(layer);
  }

  _applyLayer(layer) {
    const { visible, opacity } = this.layerState.get(layer);
    for (const mesh of this.meshesByLayer.get(layer) ?? []) {
      mesh.visible = visible && opacity > 0;
      const mat = mesh.material;
      mat.opacity = opacity;
      mat.transparent = opacity < 1;
      mat.depthWrite = opacity >= 1;
      mat.needsUpdate = true;
    }
    if (this.selected && !this.selected.visible) this.select(null);
  }

  select(mesh) {
    if (this.selected) this.selected.material.emissive.setRGB(0, 0, 0);
    this.selected = mesh;
    if (mesh) mesh.material.emissive.copy(HIGHLIGHT).multiplyScalar(0.6);
    this.onSelect(mesh ? this.meshInfo.get(mesh.name) : null);
  }

  /** Calls fn after every rendered frame (used to keep notes on their anchor points). */
  onFrame(fn) {
    this.frameListeners.push(fn);
  }

  /** Next click on the model calls handler(point, meshName) instead of selecting. Pass null to cancel. */
  setPlaceMode(handler) {
    this.placeHandler = handler;
    this.renderer.domElement.style.cursor = handler ? 'crosshair' : 'grab';
  }

  /** Screen position of a 3D point, or null if it is behind the camera. */
  toScreen(x, y, z) {
    const v = new THREE.Vector3(x, y, z).project(this.camera);
    if (v.z > 1) return null;
    const rect = this.renderer.domElement.getBoundingClientRect();
    return { x: rect.left + ((v.x + 1) / 2) * rect.width, y: rect.top + ((1 - v.y) / 2) * rect.height };
  }

  _pick(event) {
    const hit = this._pickHit(event);
    return hit ? hit.object : null;
  }

  _pickHit(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObject(this.model, true);
    const [clip] = this.renderer.clippingPlanes;
    // Skip nearly transparent layers so you can click "through" them, and parts cut away.
    return (
      hits.find(
        (h) => h.object.visible && h.object.material.opacity >= 0.15 && !(clip && clip.distanceToPoint(h.point) < 0),
      ) ?? null
    );
  }

  _bindEvents() {
    const el = this.renderer.domElement;
    let down = null;
    el.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; });
    el.addEventListener('pointerup', (e) => {
      if (!down || !this.model || e.button !== 0) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      down = null;
      if (moved > CLICK_TOLERANCE_PX) return;
      if (this.placeHandler) {
        const hit = this._pickHit(e);
        if (!hit) return;
        const handler = this.placeHandler;
        this.setPlaceMode(null);
        handler(hit.point, hit.object.name);
        return;
      }
      this.select(this._pick(e));
    });
    el.addEventListener('pointermove', (e) => {
      if (!this.model || e.buttons) return;
      const mesh = this._pick(e);
      if (!this.placeHandler) el.style.cursor = mesh ? 'pointer' : 'grab';
      this.onHover(mesh ? this.meshInfo.get(mesh.name) : null, e.clientX, e.clientY);
    });
    el.addEventListener('pointerleave', () => this.onHover(null));
    window.addEventListener('resize', () => {
      const w = this.container.clientWidth;
      const h = this.container.clientHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    });
  }
}
