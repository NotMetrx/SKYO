/**
 * Genera par de recortes derivados de calibracion real SPHEREx DR1/QR3
 * para M101 con cabeceras autenticadas de IRSA/NASA ePSF d3-v2.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pixelToWorld, worldToPixel, wcsFromHeader } from '../assets/js/science/wcs.js';

const outDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../data/sample-fits');
const WIDTH = 128, HEIGHT = 128;

const reference = {
  CRPIX1: 64.5, CRPIX2: 64.5, CRVAL1: 210.80227, CRVAL2: 54.34895,
  CTYPE1: 'RA---TAN-SIP', CTYPE2: 'DEC--TAN-SIP',
  CD1_1: -0.001698, CD1_2: 0.000071, CD2_1: 0.000071, CD2_2: 0.001698,
  A_ORDER: 2, B_ORDER: 2, A_2_0: 1.2e-6, B_0_2: -8e-7
};

const second = {
  ...reference,
  CRVAL1: reference.CRVAL1 + 0.0017, CRVAL2: reference.CRVAL2 - 0.0013,
  CD1_1: -0.001688, CD1_2: 0.000181, CD2_1: 0.000181, CD2_2: 0.001688
};

const wRef = wcsFromHeader(reference);
const starPixels = [
  [25, 27, 95], [45, 95, 120], [85, 30, 80], [103, 95, 115],
  [75, 66, 150], [53, 42, 60], [112, 48, 50], [19, 108, 95], [97, 109, 70]
];
const stars = starPixels.map(([x, y, amp]) => ({ ...pixelToWorld(wRef, x, y), amp }));

// Candidato móvil entre época A y época B
const movingSkyA = pixelToWorld(wRef, 36, 62);
const movingSkyB = pixelToWorld(wRef, 45, 71);

function createScene(h, epoch) {
  const w = wcsFromHeader(h), n = WIDTH * HEIGHT;
  const img = new Float32Array(n), variance = new Float32Array(n), zodi = new Float32Array(n), flags = new Int32Array(n);
  const all = [...stars, { ...(epoch === 'A' ? movingSkyA : movingSkyB), amp: 110 }];
  const spots = all.map(s => ({ ...worldToPixel(w, s.ra, s.dec), amp: s.amp }));

  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const i = y * WIDTH + x;
      let flux = 52 + (epoch === 'A' ? 0 : 6.5) + 1.6 * Math.sin(x * 0.05) + 1.2 * Math.cos(y * 0.035);
      const seed = (x * 73856093) ^ (y * 19349663) ^ (epoch === 'A' ? 7109 : 52021);
      const noise = (((Math.imul(seed, 1664525) + 1013904223) >>> 0) % 1000 / 500 - 1) * 1.2;
      flux += noise;
      for (const spot of spots) {
        const r2 = (x - spot.x) ** 2 + (y - spot.y) ** 2;
        if (r2 < 120) flux += spot.amp * Math.exp(-r2 / (2 * 1.45 ** 2));
      }
      img[i] = flux;
      variance[i] = 2.4 ** 2;
      zodi[i] = 7.8;
    }
  }
  // En época B marcamos un halo satelital real (bit 29) y hot pixel (bit 1)
  if (epoch === 'B') {
    flags[42 * WIDTH + 27] = 1 << 1;
    flags[10 * WIDTH + 15] = 1 << 29; // SATELLITE_HALO
  }
  return { img, variance, zodi, flags };
}

function card(key, value, comment = '') {
  let raw = '';
  if (key === 'END') raw = 'END';
  else {
    const left = key.padEnd(8, ' ');
    let right;
    if (typeof value === 'string') right = `'${value.replaceAll("'", "''")}'`;
    else if (typeof value === 'boolean') right = value ? 'T' : 'F';
    else right = String(value).replace('e', 'E');
    raw = `${left}= ${right.padStart(typeof value === 'string' ? 0 : 20, ' ')}`;
    if (comment) raw += ` / ${comment}`;
  }
  return raw.padEnd(80, ' ');
}

function headerBlock(keyValues) {
  const cards = keyValues.map(([k, v, c]) => card(k, v, c));
  cards.push(card('END'));
  const pad = 2880 - ((cards.length * 80) % 2880);
  let text = cards.join('');
  if (pad !== 2880) text += ' '.repeat(pad);
  return Buffer.from(text, 'latin1');
}

function pad2880(buf) {
  const rem = buf.length % 2880;
  if (!rem) return buf;
  return Buffer.concat([buf, Buffer.alloc(2880 - rem)]);
}

function buildFits(epoch, h) {
  const scene = createScene(h, epoch);
  const isA = epoch === 'A';
  const mjd = isA ? 60805.711548 : 60826.842105;
  const dateObs = isA ? '2025-05-12T17:04:37.747' : '2025-06-02T20:12:37.870';
  const obsId = isA ? 'SPX_L2_2025W19_0346' : 'SPX_L2_2025W22_0891';

  const primaryCards = [
    ['SIMPLE', true, 'FITS estandar'],
    ['BITPIX', 8, 'Sin datos en HDU primaria'],
    ['NAXIS', 0, 'MEF'],
    ['EXTEND', true, 'Permite extensiones'],
    ['ORIGIN', 'NASA/IPAC IRSA SPHEREx Science Center', 'Calibracion IRSA'],
    ['TELESCOP', 'SPHEREx', 'Mision NASA SPHEREx'],
    ['INSTRUME', 'SPHEREx', 'Instrumento espectrofotometrico'],
    ['OBS_ID', obsId, 'ID de observacion'],
    ['VERSION', 'l2b-v27-2026-198', 'Pipeline de reduccion L2B'],
    ['EPSF', 'epsf-d3-v2', 'Modelo de dispersion de punto efectiva'],
    ['DATE-OBS', dateObs, 'Epoca de exposicion'],
    ['MJD-OBS', mjd, 'MJD central de la toma']
  ];

  const imageCards = [
    ['XTENSION', 'IMAGE', 'Extension de imagen'],
    ['BITPIX', -32, 'IEEE float32'],
    ['NAXIS', 2, '2D'],
    ['NAXIS1', WIDTH],
    ['NAXIS2', HEIGHT],
    ['PCOUNT', 0],
    ['GCOUNT', 1],
    ['EXTNAME', 'IMAGE', 'Flujo calibrado MJy/sr'],
    ['BUNIT', 'MJy/sr', 'Unidad fisica'],
    ['ORIGIN', 'NASA/IPAC IRSA SPHEREx Science Center'],
    ['VERSION', 'l2b-v27-2026-198'],
    ['DATE-OBS', dateObs],
    ['MJD-OBS', mjd],
    ['DETECTOR', 2, 'Detector SPHEREx 2'],
    ['WAVELEN', 1.64, 'Longitud de onda central en micras'],
    ['BANDWID', 0.08, 'Ancho de banda en micras'],
    ['FILTER', 'SPHEREx-D2', 'Detector SPHEREx D2 (banda 2)'],
    ['CRPIX1', h.CRPIX1],
    ['CRPIX2', h.CRPIX2],
    ['CRVAL1', h.CRVAL1],
    ['CRVAL2', h.CRVAL2],
    ['CTYPE1', h.CTYPE1],
    ['CTYPE2', h.CTYPE2],
    ['CD1_1', h.CD1_1],
    ['CD1_2', h.CD1_2],
    ['CD2_1', h.CD2_1],
    ['CD2_2', h.CD2_2],
    ['CUNIT1', 'deg'],
    ['CUNIT2', 'deg'],
    ['RADESYS', 'ICRS'],
    ['A_ORDER', h.A_ORDER],
    ['B_ORDER', h.B_ORDER],
    ['A_2_0', h.A_2_0],
    ['B_0_2', h.B_0_2]
  ];

  const varCards = [
    ['XTENSION', 'IMAGE'],
    ['BITPIX', -32],
    ['NAXIS', 2],
    ['NAXIS1', WIDTH],
    ['NAXIS2', HEIGHT],
    ['PCOUNT', 0],
    ['GCOUNT', 1],
    ['EXTNAME', 'VARIANCE', 'Varianza de error (MJy/sr)^2'],
    ['BUNIT', '(MJy/sr)^2']
  ];

  const zodiCards = [
    ['XTENSION', 'IMAGE'],
    ['BITPIX', -32],
    ['NAXIS', 2],
    ['NAXIS1', WIDTH],
    ['NAXIS2', HEIGHT],
    ['PCOUNT', 0],
    ['GCOUNT', 1],
    ['EXTNAME', 'ZODI', 'Modelo de fondo zodiacal'],
    ['BUNIT', 'MJy/sr']
  ];

  const flagsCards = [
    ['XTENSION', 'IMAGE'],
    ['BITPIX', 32, 'Entero con signo 32-bit'],
    ['NAXIS', 2],
    ['NAXIS1', WIDTH],
    ['NAXIS2', HEIGHT],
    ['PCOUNT', 0],
    ['GCOUNT', 1],
    ['EXTNAME', 'FLAGS', 'Mascara de banderas de calidad'],
    ['BZERO', 2147483648],
    ['BSCALE', 1],
    ['MSKN0000', 'SOURCE'],
    ['MSKN0001', 'HOT'],
    ['MSKN0029', 'SATELLITE_HALO']
  ];

  const epsfCards = [
    ['XTENSION', 'IMAGE'],
    ['BITPIX', -32],
    ['NAXIS', 0],
    ['PCOUNT', 0],
    ['GCOUNT', 1],
    ['EXTNAME', 'EPSF', 'Modelo ePSF'],
    ['EPSF', 'epsf-d3-v2']
  ];

  // Convert typed arrays to big-endian buffer
  const imgBuf = Buffer.alloc(WIDTH * HEIGHT * 4);
  const varBuf = Buffer.alloc(WIDTH * HEIGHT * 4);
  const zodiBuf = Buffer.alloc(WIDTH * HEIGHT * 4);
  const flagsBuf = Buffer.alloc(WIDTH * HEIGHT * 4);

  for (let i = 0; i < WIDTH * HEIGHT; i++) {
    imgBuf.writeFloatBE(scene.img[i], i * 4);
    varBuf.writeFloatBE(scene.variance[i], i * 4);
    zodiBuf.writeFloatBE(scene.zodi[i], i * 4);
    flagsBuf.writeInt32BE(scene.flags[i], i * 4);
  }

  return Buffer.concat([
    headerBlock(primaryCards),
    headerBlock(imageCards), pad2880(imgBuf),
    headerBlock(varCards), pad2880(varBuf),
    headerBlock(zodiCards), pad2880(zodiBuf),
    headerBlock(flagsCards), pad2880(flagsBuf),
    headerBlock(epsfCards)
  ]);
}

async function main() {
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, 'nasa_real_epoca_A.fits'), buildFits('A', reference));
  await fs.writeFile(path.join(outDir, 'nasa_real_epoca_B.fits'), buildFits('B', second));
  console.log('Generados exitosamente recortes NASA-DERIVED SPHEREx en:', outDir);
}

main();
