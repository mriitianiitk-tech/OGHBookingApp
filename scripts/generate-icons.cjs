const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Ensure public/icons directory exists
const iconsDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// 1. Create scalable SVG icon
const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0284c7" />
      <stop offset="50%" stop-color="#0369a1" />
      <stop offset="100%" stop-color="#0f172a" />
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a" />
      <stop offset="100%" stop-color="#f59e0b" />
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.35"/>
    </filter>
  </defs>

  <!-- Background rounded card -->
  <rect width="512" height="512" rx="110" fill="url(#bgGrad)" />

  <!-- Subtle inner border ring -->
  <rect x="16" y="16" width="480" height="480" rx="96" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="4" />

  <!-- Building / Crown Icon Group with Drop Shadow -->
  <g filter="url(#shadow)" transform="translate(0, -10)">
    <!-- Hotel / Guest House Silhouette -->
    <!-- Base building -->
    <rect x="156" y="170" width="200" height="230" rx="14" fill="#ffffff" />
    
    <!-- Building Roof / Top Pediment -->
    <polygon points="130,174 256,90 382,174" fill="url(#goldGrad)" />

    <!-- Entrance Arch Door -->
    <path d="M226 400 V320 Q256 295 286 320 V400 Z" fill="#0369a1" />

    <!-- Windows Rows -->
    <g fill="#0284c7">
      <!-- 3rd Floor Windows -->
      <rect x="180" y="196" width="34" height="34" rx="6" />
      <rect x="239" y="196" width="34" height="34" rx="6" />
      <rect x="298" y="196" width="34" height="34" rx="6" />

      <!-- 2nd Floor Windows -->
      <rect x="180" y="250" width="34" height="34" rx="6" />
      <rect x="239" y="250" width="34" height="34" rx="6" />
      <rect x="298" y="250" width="34" height="34" rx="6" />
    </g>

    <!-- Side Wings -->
    <rect x="110" y="230" width="46" height="170" rx="10" fill="rgba(255,255,255,0.85)" />
    <rect x="356" y="230" width="46" height="170" rx="10" fill="rgba(255,255,255,0.85)" />

    <!-- Side Windows -->
    <rect x="122" y="256" width="22" height="30" rx="4" fill="#0369a1" />
    <rect x="122" y="306" width="22" height="30" rx="4" fill="#0369a1" />
    <rect x="122" y="356" width="22" height="30" rx="4" fill="#0369a1" />

    <rect x="368" y="256" width="22" height="30" rx="4" fill="#0369a1" />
    <rect x="368" y="306" width="22" height="30" rx="4" fill="#0369a1" />
    <rect x="368" y="356" width="22" height="30" rx="4" fill="#0369a1" />

    <!-- Stars above building -->
    <polygon points="256,60 261,72 274,72 263,80 267,92 256,84 245,92 249,80 238,72 251,72" fill="url(#goldGrad)" />
    <polygon points="210,75 214,84 224,84 216,90 219,99 210,93 201,99 204,90 196,84 206,84" fill="url(#goldGrad)" transform="scale(0.85) translate(38,15)" />
    <polygon points="302,75 306,84 316,84 308,90 311,99 302,93 293,99 296,90 288,84 298,84" fill="url(#goldGrad)" transform="scale(0.85) translate(46,15)" />
  </g>

  <!-- BLW Text at bottom -->
  <text x="256" y="452" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="34" font-weight="800" fill="#ffffff" letter-spacing="4" text-anchor="middle">BLW • OGH</text>
</svg>`;

fs.writeFileSync(path.join(iconsDir, 'icon.svg'), svgIcon);
console.log('Created icon.svg');

// 2. Pure Node.js PNG Generator
function createPng(width, height, drawFn) {
  const rowSize = width * 4 + 1;
  const raw = Buffer.alloc(height * rowSize);
  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    raw[rowOffset] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = drawFn(x, y, width, height);
      const pixelOffset = rowOffset + 1 + x * 4;
      raw[pixelOffset] = r;
      raw[pixelOffset + 1] = g;
      raw[pixelOffset + 2] = b;
      raw[pixelOffset + 3] = a;
    }
  }
  const compressed = zlib.deflateSync(raw);

  function crc32(buf) {
    let table = [];
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[i] = c;
    }
    let c = 0 ^ (-1);
    for (let i = 0; i < buf.length; i++) {
      c = (c >>> 8) ^ table[(c ^ buf[i]) & 0xff];
    }
    return (c ^ (-1)) >>> 0;
  }

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    const crc = crc32(Buffer.concat([typeBuf, data]));
    crcBuf.writeUInt32BE(crc >>> 0, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

// Function to draw BLW OGH App Icon
function drawAppIcon(isMaskable) {
  return function (x, y, w, h) {
    const nx = x / w;
    const ny = y / h;

    // Corner radius if not maskable
    if (!isMaskable) {
      const radius = 0.22;
      const dx = Math.max(0, Math.abs(nx - 0.5) - (0.5 - radius));
      const dy = Math.max(0, Math.abs(ny - 0.5) - (0.5 - radius));
      if (dx * dx + dy * dy > radius * radius) {
        return [0, 0, 0, 0]; // Transparent outside rounded corner
      }
    }

    // Gradient background: #0284c7 to #0f172a
    const t = (nx * 0.4 + ny * 0.6);
    let r = Math.round(2 * (1 - t) + 15 * t);
    let g = Math.round(132 * (1 - t) + 23 * t);
    let b = Math.round(199 * (1 - t) + 42 * t);

    // Coordinate mapping relative to center (0..1)
    const cx = nx - 0.5;
    const cy = ny - 0.5;

    // Main building body: width ~ 0.4, height ~ 0.45, centered
    const inMainBuilding = (Math.abs(cx) <= 0.20 && cy >= -0.15 && cy <= 0.28);
    const inLeftWing = (cx >= -0.30 && cx < -0.20 && cy >= -0.05 && cy <= 0.28);
    const inRightWing = (cx > 0.20 && cx <= 0.30 && cy >= -0.05 && cy <= 0.28);

    // Roof triangle: from cy = -0.32 at cx=0 down to cy = -0.15 at cx = +-0.25
    const roofSlope = 0.17 / 0.25;
    const inRoof = (cy >= -0.32 && cy < -0.15 && Math.abs(cx) <= (cy + 0.32) / roofSlope);

    // Entrance arch door
    const inDoor = (Math.abs(cx) <= 0.06 && cy >= 0.14 && cy <= 0.28);

    if (inDoor) {
      return [2, 132, 199, 255]; // Doorway blue
    }

    if (inRoof) {
      // Golden roof
      return [245, 158, 11, 255];
    }

    if (inMainBuilding) {
      // Check for windows grid
      // Window columns around cx = -0.13, 0, 0.13
      // Window rows around cy = -0.08, 0.02
      const isWindowCol = Math.abs(cx - (-0.13)) < 0.035 || Math.abs(cx) < 0.035 || Math.abs(cx - 0.13) < 0.035;
      const isWindowRow = Math.abs(cy - (-0.08)) < 0.035 || Math.abs(cy - 0.02) < 0.035;
      if (isWindowCol && isWindowRow) {
        return [2, 132, 199, 255]; // Blue window
      }
      return [255, 255, 255, 255]; // White facade
    }

    if (inLeftWing || inRightWing) {
      // Side windows
      const isSideWindowRow = Math.abs(cy - (-0.01)) < 0.025 || Math.abs(cy - 0.09) < 0.025 || Math.abs(cy - 0.19) < 0.025;
      const isSideWindowCol = Math.abs(Math.abs(cx) - 0.25) < 0.025;
      if (isSideWindowRow && isSideWindowCol) {
        return [3, 105, 161, 255];
      }
      return [235, 240, 248, 255]; // Slightly tinted white
    }

    // Top gold star (small diamond)
    const starDist = Math.abs(cx) + Math.abs(cy - (-0.36));
    if (starDist < 0.035) {
      return [254, 240, 138, 255];
    }

    return [r, g, b, 255];
  };
}

// Generate sizes
const sizes = [
  { file: 'icon-192.png', size: 192, maskable: false },
  { file: 'icon-512.png', size: 512, maskable: false },
  { file: 'icon-maskable-192.png', size: 192, maskable: true },
  { file: 'icon-maskable-512.png', size: 512, maskable: true },
  { file: 'apple-touch-icon.png', size: 180, maskable: false }
];

for (const item of sizes) {
  const buf = createPng(item.size, item.size, drawAppIcon(item.maskable));
  fs.writeFileSync(path.join(iconsDir, item.file), buf);
  console.log(`Generated ${item.file} (${item.size}x${item.size})`);
}
console.log('All PWA icons generated successfully!');
