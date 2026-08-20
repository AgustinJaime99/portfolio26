import * as THREE from 'three'

/**
 * SHIP GEOMETRY — custom BufferGeometry builders.
 *
 * Box primitives cannot produce the shapes this design needs: a wedge nose, a
 * tapering fuselage, swept trapezoidal wings. Stacking boxes to fake them is
 * exactly what makes procedural ships look like procedural ships.
 *
 * These builders take explicit cross-sections and loft between them, so a
 * silhouette can be tuned by editing numbers rather than by nudging meshes.
 */

/**
 * Loft a hull through a series of rectangular cross-sections along -Z.
 *
 * Each section is { z, w, h, y, taper } where taper narrows the TOP edge
 * relative to the bottom — that single parameter is what gives the fuselage its
 * angular, machined look instead of a rounded tube.
 *
 * @param {Array<{z:number,w:number,h:number,y?:number,taper?:number}>} sections
 */
export function loftHull(sections) {
  const positions = []
  const normals = []
  const indices = []

  const ringVerts = []

  for (const s of sections) {
    const y = s.y ?? 0
    const taper = s.taper ?? 1
    const hw = s.w / 2
    const hh = s.h / 2
    const topHw = hw * taper

    // Six-sided cross-section: flat bottom, angled chines, narrower flat top.
    // A chine — the hard crease along the side — is the single most effective
    // detail for making a hull read as fabricated metal.
    const ring = [
      [-topHw, y + hh, s.z], // top left
      [topHw, y + hh, s.z], // top right
      [hw, y, s.z], // mid right (chine)
      [hw * 0.82, y - hh, s.z], // bottom right
      [-hw * 0.82, y - hh, s.z], // bottom left
      [-hw, y, s.z], // mid left (chine)
    ]
    ringVerts.push(ring)
  }

  const ringSize = 6
  for (let r = 0; r < ringVerts.length; r++) {
    for (const v of ringVerts[r]) {
      positions.push(v[0], v[1], v[2])
      normals.push(0, 0, 0)
    }
  }

  for (let r = 0; r < ringVerts.length - 1; r++) {
    const a = r * ringSize
    const b = (r + 1) * ringSize
    for (let i = 0; i < ringSize; i++) {
      const j = (i + 1) % ringSize
      indices.push(a + i, b + i, a + j)
      indices.push(a + j, b + i, b + j)
    }
  }

  // Cap the ends so the hull is a closed solid.
  const first = 0
  const last = (ringVerts.length - 1) * ringSize
  for (let i = 1; i < ringSize - 1; i++) {
    indices.push(first, first + i + 1, first + i)
    indices.push(last, last + i, last + i + 1)
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

/**
 * Swept trapezoidal wing with thickness and a tapered tip.
 *
 * Built as an explicit 8-vertex solid rather than a scaled box so root chord,
 * tip chord, sweep and dihedral are all independent — which is what lets the
 * planform be tuned without distorting the thickness.
 *
 * Built for the RIGHT side (+X). Mirror for the left.
 */
export function buildWing({
  rootChord = 2.4,
  tipChord = 0.9,
  span = 2.6,
  sweep = 1.5,
  thickness = 0.16,
  dihedral = -0.06,
} = {}) {
  const t = thickness / 2
  const tipY = span * dihedral

  // Root leading edge at z = -rootChord/2, trailing at +rootChord/2.
  const rLE = -rootChord / 2
  const rTE = rootChord / 2
  const tLE = rLE + sweep
  const tTE = tLE + tipChord

  const v = [
    // root, top
    [0, t, rLE],
    [0, t, rTE],
    // tip, top
    [span, tipY + t * 0.6, tTE],
    [span, tipY + t * 0.6, tLE],
    // root, bottom
    [0, -t, rLE],
    [0, -t, rTE],
    // tip, bottom
    [span, tipY - t * 0.6, tTE],
    [span, tipY - t * 0.6, tLE],
  ]

  const faces = [
    [0, 1, 2], [0, 2, 3], // top
    [4, 6, 5], [4, 7, 6], // bottom
    [0, 3, 7], [0, 7, 4], // leading edge
    [1, 5, 6], [1, 6, 2], // trailing edge
    [3, 2, 6], [3, 6, 7], // tip
    [0, 4, 5], [0, 5, 1], // root
  ]

  const positions = []
  const indices = []
  v.forEach((p) => positions.push(p[0], p[1], p[2]))
  faces.forEach((f) => indices.push(f[0], f[1], f[2]))

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

/**
 * Angular wedge — a box with an independently sized front face.
 *
 * Used for greebles, intakes and armour plates. A wedge reads as a designed
 * part; a cube reads as a placeholder.
 */
export function buildWedge({
  width = 1,
  height = 1,
  depth = 1,
  frontScaleX = 0.5,
  frontScaleY = 0.5,
  frontOffsetY = 0,
} = {}) {
  const hw = width / 2
  const hh = height / 2
  const hd = depth / 2
  const fw = hw * frontScaleX
  const fh = hh * frontScaleY

  const v = [
    [-hw, -hh, hd], [hw, -hh, hd], [hw, hh, hd], [-hw, hh, hd],
    [-fw, -fh + frontOffsetY, -hd], [fw, -fh + frontOffsetY, -hd],
    [fw, fh + frontOffsetY, -hd], [-fw, fh + frontOffsetY, -hd],
  ]

  const faces = [
    [0, 1, 2], [0, 2, 3],
    [5, 4, 7], [5, 7, 6],
    [4, 0, 3], [4, 3, 7],
    [1, 5, 6], [1, 6, 2],
    [3, 2, 6], [3, 6, 7],
    [4, 5, 1], [4, 1, 0],
  ]

  const positions = []
  const indices = []
  v.forEach((p) => positions.push(p[0], p[1], p[2]))
  faces.forEach((f) => indices.push(f[0], f[1], f[2]))

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}
