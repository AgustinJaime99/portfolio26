import { content } from '../../i18n/content'

/**
 * PROJECT MEDIA
 *
 * Single source of truth for which screenshots belong to which project.
 *
 * Deliberately DERIVED from i18n/content.js rather than duplicated: that file
 * already carries the canonical repo/live/images mapping used by the classic
 * portfolio. Copying the list here would guarantee the two drift apart the
 * first time a screenshot is added.
 *
 * The satellites in THE WORKS are built from `projects` in data/profile.js,
 * which is keyed by NAME, while content.js keys by repo slug — so we bridge
 * the two by matching on the repo URL, the one field both structures share.
 */

/** Build repo-URL -> images from the i18n content tree. */
function buildImageIndex() {
  const index = {}
  // Either locale carries the same repos block; ES is the authored one.
  const projects = content?.es?.projects?.items ?? []
  for (const project of projects) {
    if (project.repo && Array.isArray(project.images) && project.images.length) {
      index[project.repo] = project.images
    }
  }
  return index
}

const IMAGE_INDEX = buildImageIndex()

/**
 * Screenshots for a project, or an empty array.
 * @param {{repo?: string}} project entry from data/profile.js
 */
export function imagesFor(project) {
  if (!project?.repo) return []
  return IMAGE_INDEX[project.repo] ?? []
}

/**
 * Panel layout for a satellite's deployed array.
 *
 * Screenshots are all ~1920x995 (1.93:1), so panels are built at that ratio and
 * never letterboxed — a browser capture squeezed into a square reads as broken.
 *
 * Panels fan out in a shallow arc facing the viewer rather than sitting in a
 * flat row: an arc means every panel faces roughly toward the camera, so none
 * of them is edge-on and unreadable.
 */
export const PANEL = {
  width: 7.2,
  height: 7.2 / 1.93,
  /** Gap between panel centres along the arc. */
  spacing: 8.1,
  /** Radius of the arc the panels sit on. Larger = flatter fan. */
  arcRadius: 26,
  /** Vertical offset above the satellite. */
  rise: 5.4,
}

/** Deployment timing, seconds. Staggered so panels unfold rather than pop. */
export const DEPLOY = {
  perPanelDelay: 0.11,
  duration: 0.62,
}

/**
 * THUMBNAIL CACHE
 *
 * The 3D panels load each screenshot through TextureLoader; the contact sheet
 * needs the same pixels in an <img>. Pointing both at the same URL made the
 * browser fetch every screenshot twice (verified: 6 responses for a 3-image
 * project), because a WebGL texture and an <img> do not share a decode.
 *
 * Instead, once a texture exists we downscale it into a small canvas ONCE and
 * hand the contact sheet a data URL. One network fetch, one decode, and the
 * thumbnails are 160px wide instead of 1920 — which also stops the panel from
 * decoding six full-size PNGs just to draw six 108px boxes.
 */
const thumbCache = new Map()
const thumbListeners = new Set()

const THUMB_WIDTH = 160

export function getThumb(url) {
  return thumbCache.get(url) ?? null
}

export function subscribeThumbs(fn) {
  thumbListeners.add(fn)
  return () => thumbListeners.delete(fn)
}

/** Build a small data-URL thumbnail from an already-decoded texture image. */
export function makeThumb(url, image) {
  if (thumbCache.has(url) || !image) return
  try {
    const ratio = image.height / image.width
    const canvas = document.createElement('canvas')
    canvas.width = THUMB_WIDTH
    canvas.height = Math.round(THUMB_WIDTH * ratio)
    const ctx = canvas.getContext('2d')
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
    thumbCache.set(url, canvas.toDataURL('image/jpeg', 0.72))
    thumbListeners.forEach((fn) => fn())
  } catch {
    // Canvas can taint on cross-origin images; falling back to the raw URL is
    // correct and costs only the extra fetch we were trying to avoid.
    thumbCache.set(url, url)
    thumbListeners.forEach((fn) => fn())
  }
}
