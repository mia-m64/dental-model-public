import * as THREE from 'three';

// Schematic lower molar in its socket. Each tissue is described by a distance-like
// function (negative inside, positive outside), sampled on a grid and turned into a
// smooth surface with surface nets. Sizes are in millimetres, roughly like a real
// molar but simplified, then scaled to metres. x is mesiodistal, y points to the
// crown and z is buccolingual; the cementoenamel junction is near y = 0.
//
// Every tissue is a closed solid wrapped around the next one (bone → PDL → cementum →
// dentin → pulp), so the cut-away view shows filled bands and hiding a layer leaves
// the real hollow (an empty socket, an empty pulp chamber).
// Mesh names match the structure ids in src/data/tooth.json.

const CELL = 0.27;
const MIN = [-12.6, -20.6, -9.6];
const MAX = [12.6, 9.6, 9.6];
const SIZE = MIN.map((min, i) => Math.ceil((MAX[i] - min) / CELL) + 1);

const CEMENTUM = 0.2; // thickness over the root dentin
const PDL = 0.55; // outer edge of the ligament, measured from the dentin
const SULCUS = 0.25; // small gap between the gum and the tooth
const CREST = -1.8; // bone starts a little below the cementoenamel junction
const HOLLOW_GAP = 0.04; // hollows sit just outside the tissue they hold, so the two surfaces never overlap

const clamp = THREE.MathUtils.clamp;
const smoothstep = THREE.MathUtils.smoothstep;
const lerp = THREE.MathUtils.lerp;

function smin(a, b, k) {
  const h = clamp(0.5 + (0.5 * (b - a)) / k, 0, 1);
  return lerp(b, a, h) - k * h * (1 - h);
}
const smax = (a, b, k) => -smin(-a, -b, k);

/** Value of a [height, value] table at y, eased between points. */
function table(points, y) {
  if (y <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i++) {
    const [y1, v1] = points[i];
    if (y <= y1) {
      const [y0, v0] = points[i - 1];
      return lerp(v0, v1, smoothstep(y, y0, y1));
    }
  }
  return points[points.length - 1][1];
}

// Crown radius at each height: narrow at the neck, widest about a third of the way up.
const CROWN_RADIUS = [[-3, 3.75], [0, 4.15], [2, 5], [3.5, 5.25], [5.5, 4.9], [8, 3.8]];
const CUSPS = [[2.7, 2.2], [-2.7, 2.2], [2.7, -2.2], [-2.7, -2.2]];

/** Rounded-rectangle "radius" of the crown: wider mesiodistally (x) than buccolingually (z). */
function crownRadius(x, z) {
  const p = 2.6;
  return (Math.abs(x / 1.1) ** p + Math.abs(z / 0.95) ** p) ** (1 / p);
}

/** Height of the chewing surface: four cusps, a central fossa and grooves between them. */
function occlusal(x, z) {
  let height = 6 - 1.1 * Math.exp(-(x * x + z * z) / 2.4);
  for (const [cx, cz] of CUSPS) height += 1.5 * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / 4.5);
  return height - 0.45 * Math.exp(-(x * x) / 0.5) - 0.45 * Math.exp(-(z * z) / 0.5);
}

/** Enamel line: dips toward the roots on the cheek and tongue sides, like a real tooth. */
const cej = (x, z) => 0.1 - 0.45 * smoothstep(Math.abs(z), 1.5, 4.5) + 0.25 * smoothstep(Math.abs(x), 2, 4.5);

const crown = (x, y, z) => smax(crownRadius(x, z) - table(CROWN_RADIUS, y), y - occlusal(x, z), 0.9);

/** Distance to a chain of points that tapers from radius to radius. Roots are wide in z. */
function taperedChain(chain, x, y, z) {
  const flatZ = z / 1.5;
  let best = 0;
  for (let i = 0; i < chain.length - 1; i++) {
    const [ax, ay, ar] = chain[i];
    const [bx, by, br] = chain[i + 1];
    const dx = bx - ax;
    const dy = by - ay;
    const t = clamp(((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy), 0, 1);
    const d = Math.hypot(x - ax - t * dx, y - ay - t * dy, flatZ) - lerp(ar, br, t);
    best = i ? smin(best, d, 0.3) : d;
  }
  return best;
}

// Mesial and distal roots mirror each other, so these use |x|: [x, y, radius],
// curving out of the furcation and back in.
const ROOT_PATH = [[2.3, -2, 2.45], [3, -7.5, 1.8], [2.7, -11, 1.15], [2.2, -13.6, 0.5]];
const CANAL_PATH = [[1.9, -0.8, 0.9], [2.9, -7.5, 0.55], [2.65, -11, 0.28], [2.2, -14.05, 0.1]];
const nearTooth = (x, y, z) => Math.abs(x) < 7.5 && Math.abs(z) < 7.5 && y > -16 && y < 8.5;
const FAR = 9; // any positive value: only the surfaces near the tooth matter

/** Dentin: follows the crown about an enamel's thickness in, then runs into the two roots. */
function dentin(x, y, z) {
  if (!nearTooth(x, y, z)) return FAR;
  const side = 1.1 * smoothstep(y, 0.2, 3);
  const top = smax(crownRadius(x, z) - table(CROWN_RADIUS, y) + side, y - occlusal(x, z) + 1.9, 0.9);
  const trunk = smax(top, -3.3 - y, 1.2);
  return smin(trunk, taperedChain(ROOT_PATH, Math.abs(x), y, z), 1.5);
}

/** Pulp chamber: its roof copies the cusps, with a small horn under each one. */
function pulpChamber(x, y, z) {
  const roof = 2.7 + 0.6 * (occlusal(x, z) - 6);
  return smax(smax(crownRadius(x, z) - 2.75, y - roof, 0.7), -1.7 - y, 0.7);
}
const rootCanals = (x, y, z) => taperedChain(CANAL_PATH, Math.abs(x), y, z);
const pulp = (x, y, z) => (nearTooth(x, y, z) ? smin(pulpChamber(x, y, z), rootCanals(x, y, z), 0.5) : FAR);

/** Section of jawbone: a rounded block, narrower at the crest, higher between the teeth. */
function bone(x, y, z) {
  const halfDepth = lerp(7.3, 5.7, smoothstep(y, -11, 0));
  const radius = 2.5;
  const qx = Math.abs(x) - 10.4 + radius;
  const qz = Math.abs(z) - halfDepth + radius;
  const walls = Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0) - radius;
  const crest = CREST + 1.1 * smoothstep(Math.abs(x), 6, 9) - 0.05 * z * z;
  const base = -18.6 + 0.07 * z * z;
  return smax(smax(walls, y - crest, 1), base - y, 2.5);
}

/** Gum: a skin over the bone that thickens into a collar around the neck of the tooth. */
function gingiva(x, y, z, boneValue = bone(x, y, z)) {
  const collar = smax(crownRadius(x, z) - 5.75, y - 0.5 - 0.6 * smoothstep(Math.abs(x), 6, 9), 1);
  const skin = boneValue - 0.9 * smoothstep(y, -8, -2); // thins out down the bone
  return smax(smin(skin, smax(collar, -4 - y, 1), 1.2), -8 - y, 0.6);
}

const enamelSolid = (x, y, z) => smax(crown(x, y, z), cej(x, z) - y, 0.05);
// These take the dentin's value at the point, so the grid only has to compute it once.
const cementumSolid = (d, x, y, z) => smax(d - CEMENTUM, y - cej(x, z), 0.05);
const pdlSolid = (d, y) => smax(d - PDL, y - CREST, 0.2);

/** Samples fn(x, y, z, gridIndex) on the grid. Inner loops run x fastest, matching surfaceNets. */
function sample(fn) {
  const [nx, ny, nz] = SIZE;
  const values = new Float32Array(nx * ny * nz);
  let n = 0;
  for (let k = 0; k < nz; k++) {
    const z = MIN[2] + k * CELL;
    for (let j = 0; j < ny; j++) {
      const y = MIN[1] + j * CELL;
      for (let i = 0; i < nx; i++, n++) values[n] = fn(MIN[0] + i * CELL, y, z, n);
    }
  }
  return values;
}

/**
 * Surface nets: one vertex in every grid cell the surface passes through, joined
 * into a quad across every grid edge it crosses. Triangles face out of the solid,
 * or into it with `flip`, and are kept only if keep(x, y, z) is true at their middle.
 */
function surfaceNets(values, { keep, flip = false }) {
  const [nx, ny, nz] = SIZE;
  const steps = [1, nx, nx * ny];
  const cellVertex = new Int32Array(values.length).fill(-1);
  const positions = [];
  const indices = [];
  const corners = [0, 1, 2, 3, 4, 5, 6, 7];
  const cornerAt = (c) => (c & 1 ? steps[0] : 0) + (c & 2 ? steps[1] : 0) + (c & 4 ? steps[2] : 0);

  for (let k = 0; k < nz - 1; k++) {
    for (let j = 0; j < ny - 1; j++) {
      for (let i = 0; i < nx - 1; i++) {
        const n = i + nx * (j + ny * k);
        let px = 0, py = 0, pz = 0, crossings = 0;
        for (const c of corners) {
          for (let axis = 0; axis < 3; axis++) {
            if (c & (1 << axis)) continue; // each of the 12 cell edges once
            const a = values[n + cornerAt(c)];
            const b = values[n + cornerAt(c | (1 << axis))];
            if (a < 0 === b < 0) continue;
            const t = a / (a - b);
            px += (c & 1 ? 1 : 0) + (axis === 0 ? t : 0);
            py += (c & 2 ? 1 : 0) + (axis === 1 ? t : 0);
            pz += (c & 4 ? 1 : 0) + (axis === 2 ? t : 0);
            crossings++;
          }
        }
        if (!crossings) continue;
        cellVertex[n] = positions.length / 3;
        positions.push(
          MIN[0] + (i + px / crossings) * CELL,
          MIN[1] + (j + py / crossings) * CELL,
          MIN[2] + (k + pz / crossings) * CELL,
        );
      }
    }
  }

  const keepTriangle = (a, b, c) => {
    if (!keep) return true;
    const middle = (axis) => (positions[a * 3 + axis] + positions[b * 3 + axis] + positions[c * 3 + axis]) / 3;
    return keep(middle(0), middle(1), middle(2));
  };
  for (let k = 1; k < nz - 1; k++) {
    for (let j = 1; j < ny - 1; j++) {
      for (let i = 1; i < nx - 1; i++) {
        const n = i + nx * (j + ny * k);
        for (let axis = 0; axis < 3; axis++) {
          const inside = values[n] < 0;
          if (inside === values[n + steps[axis]] < 0) continue;
          const u = steps[(axis + 1) % 3];
          const v = steps[(axis + 2) % 3];
          const quad = [cellVertex[n - u - v], cellVertex[n - v], cellVertex[n], cellVertex[n - u]];
          if (inside === flip) quad.reverse();
          const [a, b, c, d] = quad;
          if (keepTriangle(a, b, c)) indices.push(a, b, c);
          if (keepTriangle(a, c, d)) indices.push(a, c, d);
        }
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function mesh(name, geometry) {
  const m = new THREE.Mesh(geometry);
  m.name = name;
  return m;
}

/** A tissue with a hollow inside it: the part of `outer` beyond `inner`, and the wall of that hollow. */
function shell(name, outer, inner) {
  return [
    mesh(name, surfaceNets(outer.values, { keep: (x, y, z) => inner.at(x, y, z) > 0 })),
    mesh(name, surfaceNets(inner.values.map((v) => v - HOLLOW_GAP), { keep: (x, y, z) => outer.at(x, y, z) < 0, flip: true })),
  ];
}

export function buildTooth() {
  const solid = (at, values = sample(at)) => ({ at, values });
  const D = sample(dentin);
  const P = sample(pulp);
  const B = sample(bone);

  const dentinSolid = solid(dentin, D);
  const pulpSolid = solid(pulp, P);
  const enamel = solid(enamelSolid);
  const cementum = solid(
    (x, y, z) => cementumSolid(dentin(x, y, z), x, y, z),
    sample((x, y, z, n) => cementumSolid(D[n], x, y, z)),
  );
  const rootSurface = solid((x, y, z) => dentin(x, y, z) - CEMENTUM, D.map((d) => d - CEMENTUM));
  const pdl = solid(
    (x, y, z) => pdlSolid(dentin(x, y, z), y),
    sample((x, y, z, n) => pdlSolid(D[n], y)),
  );
  const socket = solid((x, y, z) => dentin(x, y, z) - PDL, D.map((d) => d - PDL));
  const gum = solid(gingiva, sample((x, y, z, n) => gingiva(x, y, z, B[n])));
  const underGum = solid(
    (x, y, z) => Math.min(bone(x, y, z), dentin(x, y, z) - SULCUS),
    B.map((b, n) => Math.min(b, D[n] - SULCUS)),
  );

  const tooth = new THREE.Group();
  tooth.add(
    ...shell('enamel', enamel, dentinSolid),
    ...shell('dentin', dentinSolid, pulpSolid),
    mesh('pulp_chamber', surfaceNets(P, { keep: (x, y, z) => pulpChamber(x, y, z) < rootCanals(x, y, z) })),
    mesh('root_canal', surfaceNets(P, { keep: (x, y, z) => pulpChamber(x, y, z) >= rootCanals(x, y, z) })),
    ...shell('cementum', cementum, dentinSolid),
    ...shell('pdl', pdl, rootSurface),
    ...shell('alveolar_bone', solid(bone, B), socket),
    ...shell('gingiva', gum, underGum),
  );
  for (const m of tooth.children) m.userData.roughness = m.name === 'enamel' ? 0.22 : 0.55;
  tooth.scale.setScalar(0.001); // millimetres → metres, like the head model
  return tooth;
}
