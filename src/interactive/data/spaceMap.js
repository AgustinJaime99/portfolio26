import { projects } from '../../data/profile'

/**
 * THE SPACE MAP
 *
 * Four destinations arranged in a cross on the XZ plane. The pilot starts at
 * the origin facing -Z. No destination is fully visible from spawn — each one
 * announces itself with a single distant light. Nobody needs to be told to
 * fly toward a light in the dark.
 *
 *                    ARCHIVES (-Z)
 *                         |
 *      THE WORKS (-X) — ORIGIN — SIGNAL (+X)
 *                         |
 *                  LAUNCH COMPLEX (+Z)
 */

export const DESTINATIONS = [
  {
    id: 'works',
    label: 'THE WORKS',
    designation: 'SITE 01',
    subtitle: 'Constructed systems in orbit',
    position: [-420, 0, -120],
    /** Distance at which the HUD locks on and telemetry appears. */
    detectRadius: 190,
    /**
     * Distance at which orbital capture triggers. Must clear the debris belt
     * (outer edge ~150) so the ship settles outside it looking in, rather than
     * inside the belt where the planet reads as a distant dot.
     */
    captureRadius: 62,
    beaconColor: 'ion',
  },
  {
    id: 'signal',
    label: 'SIGNAL',
    designation: 'SITE 02',
    subtitle: 'Deep space transmission',
    position: [430, 18, 90],
    detectRadius: 200,
    /**
     * The antenna is ~15 units across the dish and drops ~33 down the mast, so
     * its bounding sphere is roughly 35. At the old 70 the ship orbited at 54 —
     * close enough to clip the structure and to frame it as an unreadable slab
     * filling the viewport.
     */
    captureRadius: 104,
    beaconColor: 'ion',
  },
  {
    id: 'archives',
    label: 'ARCHIVES',
    designation: 'SITE 03',
    subtitle: 'Recovered mission record',
    position: [40, -22, -560],
    detectRadius: 200,
    /**
     * The monolith is only ~12 units across. At 78 the ship orbited at 61 and
     * the camera sat at 73 — INSIDE the debris field, which extends to 70 — so
     * the structure was a distant sliver behind a screen of rubble.
     */
    captureRadius: 34,
    beaconColor: 'dust',
  },
  {
    id: 'launch',
    label: 'LAUNCH COMPLEX',
    designation: 'SITE 04',
    subtitle: 'Deployment ring — active',
    position: [-60, 10, 520],
    detectRadius: 210,
    captureRadius: 82,
    beaconColor: 'amber',
  },
]

export const DESTINATION_BY_ID = Object.fromEntries(
  DESTINATIONS.map((d) => [d.id, d]),
)

/**
 * Projects become artificial satellites orbiting a dark basalt planet.
 * Orbits are deliberately non-uniform — evenly spaced rings read as generated.
 * Each satellite gets a distinct radius, inclination, phase and speed.
 */
const ORBITS = [
  { radius: 46, inclination: 0.14, phase: 0.0, speed: 0.055, scale: 1.15 },
  { radius: 62, inclination: -0.26, phase: 2.1, speed: 0.041, scale: 1.0 },
  { radius: 38, inclination: 0.38, phase: 4.0, speed: 0.072, scale: 0.92 },
  { radius: 78, inclination: -0.11, phase: 1.2, speed: 0.033, scale: 0.85 },
  { radius: 55, inclination: 0.47, phase: 5.3, speed: 0.048, scale: 0.8 },
  { radius: 88, inclination: 0.05, phase: 3.4, speed: 0.028, scale: 0.75 },
]

/** Satellite archetypes — different silhouettes so the fleet never reads as clones. */
const ARCHETYPES = ['array', 'module', 'panel', 'module', 'array', 'panel']

export const SATELLITES = projects.map((project, i) => ({
  id: project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  project,
  archetype: ARCHETYPES[i % ARCHETYPES.length],
  ...ORBITS[i % ORBITS.length],
}))

/**
 * MISSION ARCHIVES — structure only, no real content yet (per brief).
 * The monolith's vertical layers ARE the index: one layer per mission.
 */
export const MISSION_SECTIONS = [
  'CHALLENGE',
  'ARCHITECTURE',
  'DECISIONS',
  'DEVELOPMENT',
  'IMPACT',
]

export const MISSIONS = [
  { id: 'mission-004', code: 'MISSION 004', status: 'COMPLETED', title: null },
  { id: 'mission-003', code: 'MISSION 003', status: 'COMPLETED', title: null },
  { id: 'mission-002', code: 'MISSION 002', status: 'COMPLETED', title: null },
  { id: 'mission-001', code: 'MISSION 001', status: 'ARCHIVED', title: null },
]

/**
 * SHIP SYSTEMS — the technology section.
 * Your stack is not a place you fly to. It is the vessel you have been flying.
 * Each system maps to a physical part of the hull.
 */
export const SHIP_SYSTEMS = [
  {
    id: 'reactor',
    part: 'REACTOR',
    anchor: [0, -0.1, 1.5],
    items: ['Node.js', 'NestJS', 'Express'],
    note: 'Primary power — request handling and services',
  },
  {
    id: 'hull',
    part: 'HULL INTEGRITY',
    anchor: [0, 0.55, -0.2],
    items: ['TypeScript', 'Clean Architecture', 'SOLID', 'DDD'],
    note: 'Structural tolerance under load',
  },
  {
    id: 'navigation',
    part: 'NAVIGATION',
    anchor: [0, 0.1, -1.7],
    items: ['React', 'Next.js', 'Tailwind CSS'],
    note: 'Guidance and interface layer',
  },
  {
    id: 'tanks',
    part: 'STORAGE',
    anchor: [1.5, -0.15, 0.2],
    items: ['PostgreSQL', 'MySQL', 'MongoDB', 'Prisma'],
    note: 'Persistence reserves',
  },
  {
    id: 'comms',
    part: 'COMMS ARRAY',
    anchor: [-1.5, -0.15, 0.2],
    items: ['WebSockets', 'Kafka', 'REST APIs'],
    note: 'Real-time channels and event streams',
  },
]

/** World bounds. The universe is a disc — you can drift, but never get lost. */
export const WORLD = {
  radius: 900,
  verticalLimit: 40,
}
