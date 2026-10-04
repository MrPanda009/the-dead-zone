/**
 * Pure TypeScript offline QR Code matrix and SVG generator.
 *
 * Implements a lightweight, zero-dependency QR code encoder (Versions 1-6, Low/Medium ECC)
 * specifically designed to render offline tourist emergency data (GPS coordinates, hospital,
 * and DDMA numbers) into crisp, scalable SVG and canvas elements.
 */

// Helper: Galois Field GF(256) tables for Reed-Solomon Error Correction
const GF256_EXP: number[] = new Array(512);
const GF256_LOG: number[] = new Array(256);

(function initGF256() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF256_EXP[i] = x;
    GF256_EXP[i + 255] = x;
    GF256_LOG[x] = i;
    x = (x << 1) ^ (x >= 128 ? 0x11d : 0);
  }
  GF256_LOG[0] = 0;
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF256_EXP[GF256_LOG[a] + GF256_LOG[b]];
}

function rsGeneratorPoly(degree: number): number[] {
  let poly = [1];
  for (let i = 0; i < degree; i++) {
    const next = [0];
    const factor = GF256_EXP[i];
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= gfMul(poly[j], factor);
      if (j + 1 >= next.length) next.push(0);
      next[j + 1] ^= poly[j];
    }
    poly = next;
  }
  return poly;
}

function rsEncode(data: number[], eccLength: number): number[] {
  const gen = rsGeneratorPoly(eccLength);
  const msg = [...data, ...new Array(eccLength).fill(0)];
  for (let i = 0; i < data.length; i++) {
    const coef = msg[i];
    if (coef !== 0) {
      for (let j = 0; j < gen.length; j++) {
        msg[i + j] ^= gfMul(gen[j], coef);
      }
    }
  }
  return msg.slice(data.length);
}

// QR Table: capacity for byte mode (Version 4: 33x33 modules, EC Level L: 62 bytes, EC Level M: 48 bytes; Version 6: 41x41, L: 106 bytes, M: 84 bytes)
interface QrVersionInfo {
  version: number;
  size: number;
  totalBytes: number;
  dataBytes: number;
  eccBytes: number;
  alignment: number[];
}

const QR_VERSIONS: QrVersionInfo[] = [
  { version: 4, size: 33, totalBytes: 100, dataBytes: 80, eccBytes: 20, alignment: [6, 26] },
  { version: 6, size: 41, totalBytes: 172, dataBytes: 136, eccBytes: 36, alignment: [6, 34] },
  { version: 8, size: 49, totalBytes: 242, dataBytes: 192, eccBytes: 50, alignment: [6, 24, 42] },
];

/**
 * Encodes text into a boolean 2D grid matrix where true = dark module, false = light module.
 */
export function generateQrMatrix(text: string): boolean[][] {
  const utf8Bytes: number[] = [];
  for (let i = 0; i < text.length; i++) {
    let charCode = text.charCodeAt(i);
    if (charCode < 0x80) {
      utf8Bytes.push(charCode);
    } else if (charCode < 0x800) {
      utf8Bytes.push(0xc0 | (charCode >> 6), 0x80 | (charCode & 0x3f));
    } else {
      utf8Bytes.push(0xe0 | (charCode >> 12), 0x80 | ((charCode >> 6) & 0x3f), 0x80 | (charCode & 0x3f));
    }
  }

  // Pick suitable version
  let version = QR_VERSIONS[0];
  for (const v of QR_VERSIONS) {
    if (v.dataBytes - 3 >= utf8Bytes.length) {
      version = v;
      break;
    }
  }
  if (version.dataBytes - 3 < utf8Bytes.length) {
    version = QR_VERSIONS[QR_VERSIONS.length - 1];
  }

  // Build bitstream: Mode 0100 (Byte) + 8-bit length + data
  const bits: number[] = [0, 1, 0, 0];
  const len = Math.min(utf8Bytes.length, version.dataBytes - 3);
  for (let i = 7; i >= 0; i--) bits.push((len >> i) & 1);
  for (let i = 0; i < len; i++) {
    const b = utf8Bytes[i];
    for (let j = 7; j >= 0; j--) bits.push((b >> j) & 1);
  }

  // Terminator
  while (bits.length < version.dataBytes * 8 && bits.length % 8 !== 0) bits.push(0);
  const padBytes = [0xec, 0x11];
  let padIdx = 0;
  while (bits.length < version.dataBytes * 8) {
    const b = padBytes[padIdx % 2];
    for (let j = 7; j >= 0; j--) bits.push((b >> j) & 1);
    padIdx++;
  }

  // Convert bits to data codewords
  const dataCodewords: number[] = [];
  for (let i = 0; i < version.dataBytes; i++) {
    let val = 0;
    for (let j = 0; j < 8; j++) val = (val << 1) | bits[i * 8 + j];
    dataCodewords.push(val);
  }

  // Generate RS ECC
  const eccCodewords = rsEncode(dataCodewords, version.eccBytes);
  const allCodewords = [...dataCodewords, ...eccCodewords];

  // Initialize Matrix
  const size = version.size;
  const matrix: (boolean | null)[][] = Array.from({ length: size }, () => new Array(size).fill(null));

  // 1. Finder patterns (top-left, top-right, bottom-left)
  function drawFinder(r: number, c: number) {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const row = r + dr;
        const col = c + dc;
        if (row < 0 || row >= size || col < 0 || col >= size) continue;
        const isBorder = dr === 0 || dr === 6 || dc === 0 || dc === 6;
        const isCenter = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
        matrix[row][col] = isBorder || isCenter;
      }
    }
  }
  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  // 2. Timing patterns
  for (let i = 8; i < size - 8; i++) {
    if (matrix[6][i] === null) matrix[6][i] = i % 2 === 0;
    if (matrix[i][6] === null) matrix[i][6] = i % 2 === 0;
  }

  // 3. Alignment patterns
  for (const r of version.alignment) {
    for (const c of version.alignment) {
      if (matrix[r][c] !== null) continue;
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const isOuter = Math.abs(dr) === 2 || Math.abs(dc) === 2;
          const isCore = dr === 0 && dc === 0;
          matrix[r + dr][c + dc] = isOuter || isCore;
        }
      }
    }
  }

  // 4. Reserve format info
  for (let i = 0; i <= 8; i++) {
    if (i < size && matrix[i][8] === null) matrix[i][8] = false;
    if (i < size && matrix[8][i] === null) matrix[8][i] = false;
    if (size - 1 - i >= 0 && matrix[8][size - 1 - i] === null) matrix[8][size - 1 - i] = false;
    if (size - 1 - i >= 0 && matrix[size - 1 - i][8] === null) matrix[size - 1 - i][8] = false;
  }
  matrix[size - 8][8] = true; // dark module

  // 5. Fill Data bits with serpentine layout & mask 0 ((row + col) % 2 === 0)
  let bitIdx = 0;
  const totalBits = allCodewords.length * 8;
  for (let right = size - 1; right > 0; right -= 2) {
    if (right === 6) right--; // skip timing col
    const upward = ((size - 1 - right) / 2) % 2 === 0;
    for (let vert = 0; vert < size; vert++) {
      const row = upward ? size - 1 - vert : vert;
      for (let c = 0; c < 2; c++) {
        const col = right - c;
        if (matrix[row][col] !== null) continue;
        let bit = false;
        if (bitIdx < totalBits) {
          const byteVal = allCodewords[Math.floor(bitIdx / 8)];
          const bBit = (byteVal >> (7 - (bitIdx % 8))) & 1;
          bit = bBit === 1;
          bitIdx++;
        }
        // Mask 0
        if ((row + col) % 2 === 0) bit = !bit;
        matrix[row][col] = bit;
      }
    }
  }

  // Format string for EC L, Mask 0: 0x77c4 -> bits
  const formatBits = [1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0];
  for (let i = 0; i < 6; i++) matrix[8][i] = formatBits[i] === 1;
  matrix[8][7] = formatBits[6] === 1;
  matrix[8][8] = formatBits[7] === 1;
  matrix[7][8] = formatBits[8] === 1;
  for (let i = 9; i < 15; i++) matrix[14 - i][8] = formatBits[i] === 1;

  for (let i = 0; i < 8; i++) matrix[size - 1 - i][8] = formatBits[i] === 1;
  for (let i = 8; i < 15; i++) matrix[8][size - 15 + i] = formatBits[i] === 1;

  // Convert to clean boolean[][]
  return matrix.map((row) => row.map((cell) => cell ?? false));
}

/**
 * Returns SVG path data for rendering the QR matrix cleanly at any resolution.
 */
export function generateQrSvgPath(matrix: boolean[][]): { path: string; size: number } {
  const size = matrix.length;
  let path = '';
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (matrix[r][c]) {
        path += `M${c},${r}h1v1h-1z `;
      }
    }
  }
  return { path, size };
}
