/**
 * @file art.js
 * @description Deterministic placeholder artwork + colour helpers.
 *
 * When a title has no poster (TMDB sometimes has none, or the demo catalogue is
 * serving a stub), the UI still needs something worth looking at. Rather than a
 * grey box we generate a stable gradient from the title id: same title, same
 * artwork, on every device and every reload.
 */

/** @type {Array<[string, string]>} Curated gradients — earthy and filmic. */
const GRADIENTS = [
  ["#1b2735", "#f41b3b"],
  ["#2d1b2e", "#e0a458"],
  ["#12232e", "#4ea8de"],
  ["#241b2f", "#9b7ede"],
  ["#1d2b1f", "#3ddc97"],
  ["#2b1b1b", "#ff6b57"],
  ["#1a1a24", "#7aa2ff"],
];

/**
 * Stable hash for a string.
 * @param {string} value
 */
export function hashString(value) {
  let hash = 5381;
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) + hash + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/**
 * @param {string} seed
 * @returns {{ from: string, to: string, angle: number }}
 */
export function gradientFor(seed) {
  const index = hashString(seed) % GRADIENTS.length;
  const [from, to] = GRADIENTS[index];
  return { from, to, angle: 90 + (hashString(seed) % 5) * 20 };
}

/**
 * Inline SVG placeholder poster, served through /api/art/:seed.svg.
 * Rendered server-side so it costs no client JS and no extra bytes of CSS.
 *
 * @param {string} seed
 * @param {{ width?: number, height?: number, label?: string }} [options]
 * @returns {string}
 */
export function placeholderPosterSvg(seed, options = {}) {
  const { width = 600, height = 900, label = "" } = options;
  const { from, to, angle } = gradientFor(seed);
  const safeLabel = label
    .slice(0, 40)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Radial highlight + grain dots so the image reads as film, not as a CSS demo.
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${safeLabel || "Artwork"}">
  <defs>
    <linearGradient id="g" gradientTransform="rotate(${angle})">
      <stop offset="0%" stop-color="${from}"/>
      <stop offset="100%" stop-color="${to}" stop-opacity="0.85"/>
    </linearGradient>
    <radialGradient id="r" cx="30%" cy="25%" r="75%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.55"/>
    </radialGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#g)"/>
  <rect width="${width}" height="${height}" fill="url(#r)"/>
  <g fill="#ffffff" opacity="0.06">
    ${Array.from({ length: 24 }, (_, i) => {
      const x = (hashString(`${seed}-x-${i}`) % width).toFixed(0);
      const y = (hashString(`${seed}-y-${i}`) % height).toFixed(0);
      const r = ((hashString(`${seed}-r-${i}`) % 3) + 1).toFixed(1);
      return `<circle cx="${x}" cy="${y}" r="${r}"/>`;
    }).join("")}
  </g>
  <text x="50%" y="92%" text-anchor="middle" font-family="system-ui, sans-serif" font-size="${Math.round(width / 16)}" fill="#ffffff" fill-opacity="0.72" letter-spacing="2">${safeLabel}</text>
</svg>`;
}
