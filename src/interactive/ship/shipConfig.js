/**
 * SHIP CONFIG — every proportion and colour in one place.
 *
 * The point of this file is that the ship can be re-proportioned by editing
 * numbers here, without touching geometry or component code. Wing sweep, engine
 * spacing, hull taper and the whole palette are all tunable from one screen.
 */

/**
 * PALETTE.
 *
 * Graphite primary, metallic grey secondary, near-black canopy, tightly
 * rationed copper, cyan drives, red/green navigation.
 *
 * The discipline that matters: the copper appears on FOUR small parts and
 * nowhere else. An accent stops reading as intentional the moment it is
 * sprinkled everywhere — that is the difference between "designed" and "AI
 * slop", and it is decided here rather than in the markup.
 */
export const PALETTE = {
  /* Lifted from the original graphite values. Against a black void with a
   * single hard key, 0x1c1f24 rendered as a near-silhouette — all the panel
   * work was invisible. These read as dark graphite while still letting the
   * form catch light. */
  graphite: 0x363c45, // primary hull
  graphiteDark: 0x22262d, // shadowed panels, undercarriage mass
  steel: 0x646c76, // secondary metallic, machined parts
  steelLight: 0x8b939c, // exposed mechanism, bright edges
  canopy: 0x07090c, // cockpit glass — almost black
  copper: 0xb4622a, // accent, rationed
  copperDark: 0x6e3a19, // accent in shadow
  cyan: 0x4fd6ff, // drive emissive
  cyanDeep: 0x1d7fb8, // drive falloff
  navRed: 0xff2e2e,
  navGreen: 0x2effa0,
}

/**
 * MATERIAL RECIPES.
 *
 * Roughness carries most of the realism. Nothing here goes below 0.18 — a
 * mirror finish is what makes CG spacecraft look like plastic toys. This is
 * working hardware: scuffed, anodised, thermally cycled.
 */
export const MATERIALS = {
  hull: { color: PALETTE.graphite, metalness: 0.78, roughness: 0.44 },
  hullDark: { color: PALETTE.graphiteDark, metalness: 0.7, roughness: 0.56 },
  panel: { color: PALETTE.steel, metalness: 0.86, roughness: 0.32 },
  mechanism: { color: PALETTE.steelLight, metalness: 0.92, roughness: 0.24 },
  canopy: {
    color: PALETTE.canopy,
    metalness: 0.25,
    roughness: 0.08,
    // Physical material: a canopy needs a clear-coat to read as glass rather
    // than as a dark painted panel.
    clearcoat: 1,
    clearcoatRoughness: 0.06,
  },
  copper: { color: PALETTE.copper, metalness: 0.82, roughness: 0.38 },
  copperDark: { color: PALETTE.copperDark, metalness: 0.75, roughness: 0.5 },
  // Thermal blanket — the one genuinely non-metallic surface.
  blanket: { color: 0x5c5344, metalness: 0.04, roughness: 0.95 },
}

/**
 * PROPORTIONS.
 *
 * Reference silhouette: 8.6 long x 6.4 wide x 3.2 tall, scaled down to the
 * ~3-unit hull the flight camera is framed for.
 */
export const PROPORTIONS = {
  /** Overall scale applied to the whole ship group. */
  scale: 0.42,

  hull: {
    /** Cross-sections from nose (-Z) to tail (+Z). Edit to reshape the body. */
    sections: [
      { z: -4.6, w: 0.30, h: 0.20, y: -0.06, taper: 0.55 }, // nose tip
      { z: -3.6, w: 0.95, h: 0.46, y: -0.04, taper: 0.52 }, // wedge
      { z: -2.4, w: 1.55, h: 0.72, y: 0.00, taper: 0.58 },
      { z: -1.0, w: 2.05, h: 0.98, y: 0.02, taper: 0.66 }, // widest
      { z: 0.4, w: 2.00, h: 1.02, y: 0.00, taper: 0.72 },
      { z: 1.8, w: 1.68, h: 0.92, y: -0.04, taper: 0.78 },
      { z: 2.9, w: 1.30, h: 0.74, y: -0.08, taper: 0.84 }, // tail
    ],
  },

  wing: {
    rootChord: 3.0,
    tipChord: 0.85,
    span: 2.35,
    sweep: 1.85, // strong rearward sweep
    thickness: 0.19,
    dihedral: -0.05, // slight anhedral — reads as aggressive
    /** Attachment on the hull. */
    x: 0.86,
    y: -0.06,
    z: 0.35,
    roll: 0.05,
  },

  winglet: {
    height: 0.78,
    chord: 0.62,
    thickness: 0.09,
    cant: 0.24,
  },

  engine: {
    /** Lateral separation from centreline. */
    x: 0.82,
    y: -0.12,
    z: 2.35,
    radius: 0.62,
    length: 1.5,
  },
}
