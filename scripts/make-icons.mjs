// Rasterizes the app icon (same shapes as web/public/icon.svg) to PNGs, no dependencies.
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const BG = [0x0f, 0x17, 0x2a], FG = [0x38, 0xbd, 0xf8];
// [x, y, w, h, r, color] in a 512 viewBox, painted in order.
const shapes = (bleed) => [
  [0, 0, 512, 512, bleed ? 0 : 112, BG],
  [112, 128, 288, 256, 28, FG],
  [148, 168, 104, 80, 10, BG],
  [272, 172, 96, 16, 8, BG],
  [272, 212, 96, 16, 8, BG],
  [148, 276, 220, 16, 8, BG],
  [148, 316, 160, 16, 8, BG],
];
const inRect = (px, py, [x, y, w, h, r]) => {
  if (px < x || py < y || px > x + w || py > y + h) return false;
  const cx = Math.min(Math.max(px, x + r), x + w - r), cy = Math.min(Math.max(py, y + r), y + h - r);
  return (px - cx) ** 2 + (py - cy) ** 2 <= r * r;
};

function png(size, bleed) {
  const ss = 3, scale = 512 / size, rows = [];
  for (let j = 0; j < size; j++) {
    const row = Buffer.alloc(1 + size * 4);
    for (let i = 0; i < size; i++) {
      let acc = [0, 0, 0, 0];
      for (let sy = 0; sy < ss; sy++) for (let sx = 0; sx < ss; sx++) {
        const px = (i + (sx + 0.5) / ss) * scale, py = (j + (sy + 0.5) / ss) * scale;
        let c = null;
        for (const s of shapes(bleed)) if (inRect(px, py, s)) c = s[5];
        if (c) { acc[0] += c[0]; acc[1] += c[1]; acc[2] += c[2]; acc[3] += 255; }
      }
      const n = ss * ss, a = acc[3] / n;
      const o = 1 + i * 4;
      row[o] = a ? acc[0] / (acc[3] / 255) : 0; row[o + 1] = a ? acc[1] / (acc[3] / 255) : 0;
      row[o + 2] = a ? acc[2] / (acc[3] / 255) : 0; row[o + 3] = a;
    }
    rows.push(row);
  }
  const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (b) => { let c = 0xffffffff; for (const x of b) c = crcTable[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(Buffer.concat(rows))), chunk('IEND', Buffer.alloc(0))]);
}

writeFileSync('web/public/icon-192.png', png(192, false));
writeFileSync('web/public/icon-512.png', png(512, true)); // full-bleed so it also works as maskable
writeFileSync('web/public/apple-touch-icon.png', png(180, true));
console.log('icons written');
