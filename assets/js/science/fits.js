/**
 * Lector FITS minimalista para imagenes de 2D en el navegador.
 * No intenta descomprimir extension BINTABLE ZIMAGE: reporta limite
 * explicitamente para evitar una falsa afirmacion de calidad cientifica.
 * FITS: cabecera ASCII 80 bytes/tarjeta, bloques de 2880 bytes,
 * datos big-endian y extension IMAGE/VARIANCE/ZODI/FLAGS.
 */
const BLOCK = 2880;
const CARD = 80;
const decoder = new TextDecoder('ascii');
const padBlock = n => Math.ceil(n / BLOCK) * BLOCK;
const interested = new Set(['IMAGE','VARIANCE','ZODI','FLAGS']);

function decodeValue(text) {
  const value = text.trimStart();
  if (value.startsWith("'")) {
    let result = '';
    for (let i = 1; i < value.length; i++) {
      if (value[i] === "'") {
        if (value[i + 1] === "'") { result += "'"; i++; }
        else break;
      } else result += value[i];
    }
    return result.trimEnd();
  }
  const token = value.split('/')[0].trim();
  if (token === 'T') return true;
  if (token === 'F') return false;
  if (/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[DE][+-]?\d+)?$/i.test(token)) {
    return Number(token.replace(/[dD]/, 'E'));
  }
  return token;
}

function readHeader(buffer, offset, { allowTruncated = false } = {}) {
  const header = {};
  let foundEnd = false;
  const start = offset;
  while (offset + CARD <= buffer.byteLength) {
    const card = decoder.decode(new Uint8Array(buffer, offset, CARD));
    offset += CARD;
    if (card.slice(0, 8).trim() === 'END') { foundEnd = true; break; }
    if (card[8] === '=') {
      const key = card.slice(0, 8).trim();
      if (key) header[key] = decodeValue(card.slice(10));
    } else if (card.startsWith('HIERARCH ')) {
      const eq = card.indexOf('=');
      if (eq > 9) {
        const key = card.slice(0, eq).trim();
        if (key) header[key] = decodeValue(card.slice(eq + 1));
      }
    }
    if (offset - start > 2880 * 64) throw new Error('Cabecera FITS demasiado grande');
  }
  if (!foundEnd && !allowTruncated) throw new Error('No se encontro END en la cabecera FITS');
  return { header, end: padBlock(offset), foundEnd };
}

/** Decodifica bitmaps FLAGS FITS de 32 bits sin pasar por Float32. */
export function decodeFlags32(view, offset, count, bzero = 0, bscale = 1) {
  if (bscale !== 1 || ![0, 2147483648].includes(bzero)) {
    throw new Error('FLAGS requiere BSCALE=1 y BZERO=0 o 2147483648');
  }
  const out = new Uint32Array(count);
  for (let i = 0; i < count; i++) out[i] = (view.getInt32(offset + i * 4, false) + bzero) >>> 0;
  return out;
}

function decodeImage(view, offset, n, bitpix, header, isFlags) {
  const bytes = Math.abs(bitpix) / 8;
  if (![8, 16, 32, 64, -32, -64].includes(bitpix) || !Number.isInteger(bytes)) {
    throw new Error(`BITPIX no admitido: ${bitpix}`);
  }
  const bzero = Number(header.BZERO ?? 0), bscale = Number(header.BSCALE ?? 1);
  const blank = header.BLANK;
  if (isFlags) {
    if (bitpix !== 32) throw new Error('FLAGS requiere BITPIX=32');
    return decodeFlags32(view, offset, n, bzero, bscale);
  }
  const output = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const pos = offset + i * bytes;
    let value;
    if (bitpix === -32) value = view.getFloat32(pos, false);
    else if (bitpix === -64) value = view.getFloat64(pos, false);
    else if (bitpix === 32) value = view.getInt32(pos, false);
    else if (bitpix === 16) value = view.getInt16(pos, false);
    else if (bitpix === 8) value = view.getUint8(pos);
    else value = Number(view.getBigInt64(pos, false));
    output[i] = (bitpix > 0 && blank !== undefined && Number(blank) === value)
      ? Number.NaN : value * bscale + bzero;
  }
  return output;
}

/** Lee bloques de cabeceras FITS, incluso en prefijos descargados por HTTP Range. */
export function readFitsHeaders(buffer) {
  if (!(buffer instanceof ArrayBuffer)) throw new TypeError('Se esperaba ArrayBuffer');
  const hdus = [];
  let offset = 0;
  for (let iter = 0; offset + CARD <= buffer.byteLength && iter < 64; iter++) {
    const { header, end, foundEnd } = readHeader(buffer, offset, { allowTruncated: true });
    const axes = Number(header.NAXIS ?? 0);
    const dims = [];
    if (Number.isInteger(axes) && axes > 0 && axes <= 6) {
      for (let i = 1; i <= axes; i++) dims.push(Number(header[`NAXIS${i}`] || 0));
    }
    const xtension = String(header.XTENSION || 'PRIMARY').trim().toUpperCase();
    const name = String(header.EXTNAME || (xtension === 'PRIMARY' ? 'PRIMARY' : '')).trim().toUpperCase();
    const bitpix = Number(header.BITPIX || 8);
    const nPixels = axes > 0 ? dims.reduce((a, b) => a * b, 1) : 0;
    const pcount = Number(header.PCOUNT || 0);
    const gcount = Number(header.GCOUNT || 1);
    const dataBytes = (nPixels * Math.abs(bitpix) / 8 + pcount) * gcount;
    hdus.push({ index: iter, name, xtension, header, dims, truncatedHeader: !foundEnd });
    if (!foundEnd) break;
    const nextOffset = end + padBlock(dataBytes);
    if (nextOffset <= buffer.byteLength) {
      offset = nextOffset;
    } else if (end + CARD <= buffer.byteLength && decoder.decode(new Uint8Array(buffer, end, 9)) === 'XTENSION=') {
      offset = end;
    } else {
      break;
    }
  }
  return hdus;
}

export function parseFits(buffer, { maxPixels = 4_500_000, maxAxis = 4096 } = {}) {
  if (!(buffer instanceof ArrayBuffer)) throw new TypeError('Se esperaba ArrayBuffer');
  const view = new DataView(buffer), hdus = [];
  let offset = 0;
  for (let iter = 0; offset + CARD <= buffer.byteLength && iter < 64; iter++) {
    const { header, end } = readHeader(buffer, offset);
    const dims = [];
    const axes = Number(header.NAXIS ?? 0);
    if (!Number.isInteger(axes) || axes < 0 || axes > 6) throw new Error('NAXIS invalido');
    for (let i = 1; i <= axes; i++) dims.push(Number(header[`NAXIS${i}`] || 0));
    if (axes > 0 && dims.some(d => !Number.isInteger(d) || d <= 0)) {
      throw new Error('Dimensiones de eje FITS invalidas');
    }
    const xtension = String(header.XTENSION || 'PRIMARY').trim().toUpperCase();
    const extension = String(header.EXTNAME || (xtension === 'PRIMARY' ? 'PRIMARY' : '')).trim().toUpperCase();
    const bitpix = Number(header.BITPIX || 8);
    const nPixels = axes > 0 ? dims.reduce((a, b) => a * b, 1) : 0;
    const pcount = Number(header.PCOUNT || 0);
    const gcount = Number(header.GCOUNT || 1);
    const dataBytes = (nPixels * Math.abs(bitpix) / 8 + pcount) * gcount;
    if (!Number.isSafeInteger(dataBytes) || dataBytes < 0 || end + dataBytes > buffer.byteLength) {
      throw new Error(`Archivo FITS incompleto o dimensiones invalidas: ${extension}`);
    }
    let data = null;
    const is2dImage = xtension !== 'BINTABLE' && axes === 2 && nPixels > 0;
    if (interested.has(extension) && is2dImage) {
      if (dims[0] > maxAxis || dims[1] > maxAxis) {
        throw new Error('Dimensiones por eje exceden el presupuesto permitido');
      }
      if (nPixels > maxPixels) throw new Error('Imagen demasiado grande; solicita un recorte FITS');
      data = decodeImage(view, end, nPixels, bitpix, header, extension === 'FLAGS');
    }
    const compressed = xtension === 'BINTABLE' && header.ZIMAGE === true;
    hdus.push({ name: extension, header, dims, data, compressed });
    offset = end + padBlock(dataBytes);
    if (offset === 0) break;
    if (offset === buffer.byteLength) break;
  }
  if (offset < buffer.byteLength && offset + CARD > buffer.byteLength) {
    throw new Error('Archivo FITS incompleto o cabecera truncada');
  }
  const image = hdus.find(h => h.name === 'IMAGE' && h.data)
    || hdus.find(h => h.name === 'PRIMARY' && h.data);
  if (!image || image.dims.length !== 2) throw new Error('El FITS no contiene IMAGE 2D legible');
  const [width, height] = image.dims;
  const variance = hdus.find(h => h.name === 'VARIANCE' && h.data);
  const flagsHdu = hdus.find(h => h.name === 'FLAGS');
  const zodi = hdus.find(h => h.name === 'ZODI' && h.data);
  const epsfHdu = hdus.find(h => h.name === 'EPSF');
  for (const layer of [variance, zodi, flagsHdu?.data ? flagsHdu : null]) {
    if (layer && layer.data && (layer.dims[0] !== width || layer.dims[1] !== height)) {
      throw new Error(`Dimensiones no coinciden para extension ${layer.name}`);
    }
  }
  const flagNames = {};
  if (flagsHdu) for (const [key, value] of Object.entries(flagsHdu.header)) {
    if (/^MSKN\d{4}$/.test(key)) flagNames[Number(key.slice(4))] = String(value).trim().toUpperCase();
  }
  const origin = String(image.header.ORIGIN || hdus[0]?.header.ORIGIN || 'desconocido').trim();
  const originUpper = origin.toUpperCase();
  let provenanceKind = 'local_fits';
  let sourceKind = 'USER-LOCAL';
  let provenanceLabel = 'FITS LOCAL (ORIGEN NO VERIFICADO)';
  if (
    originUpper.includes('IRSA') ||
    originUpper.includes('NASA') ||
    originUpper.includes('SPHEREX') ||
    originUpper.includes('IPAC')
  ) {
    provenanceKind = 'nasa_derived';
    sourceKind = 'NASA-DERIVED';
    provenanceLabel = 'MUESTRA DERIVADA NASA/IRSA';
  } else if (
    originUpper.includes('SYNTHETIC') ||
    originUpper.includes('SIMUL') ||
    originUpper === 'SKYO'
  ) {
    provenanceKind = 'synthetic';
    sourceKind = 'SYNTHETIC';
    provenanceLabel = 'DATOS SINTÉTICOS (SKYO)';
  }
  const version = String(image.header.VERSION || hdus[0]?.header.VERSION || '').trim() || null;
  const hasEpsf = Boolean(epsfHdu);
  return {
    width, height, image: image.data, variance: variance?.data ?? null,
    flags: flagsHdu?.data ?? null, flagNames,
    flagsCompressed: !!flagsHdu?.compressed,
    zodi: zodi?.data ?? null, header: image.header,
    headerPrimary: hdus[0]?.header ?? {},
    // FITS DATE es frecuentemente la FECHA DE PROCESAMIENTO, no de observacion.
    observationTime: image.header['DATE-OBS'] || null,
    mjdObs: Number.isFinite(Number(image.header['MJD-OBS'])) ? Number(image.header['MJD-OBS']) : null,
    mjdAvg: Number.isFinite(Number(image.header['MJD-AVG'])) ? Number(image.header['MJD-AVG']) : null,
    finast: image.header.FINAST !== undefined ? Number(image.header.FINAST) : null,
    bunit: String(image.header.BUNIT || '').trim() || null,
    spectralStatus: image.header.WAVELEN ? 'synthetic-keyword-or-custom' : 'unverified',
    wavelengthUm: Number(image.header.WAVELEN) || null,
    bandwidthUm: Number(image.header.BANDWID) || null,
    detector: Number(image.header.DETECTOR) || null,
    origin,
    sourceKind,
    provenanceKind,
    provenanceLabel,
    version,
    hasEpsf,
    epsfDims: epsfHdu ? epsfHdu.dims : null
  };
}

const BAD_NAMES = new Set([
  'TRANSIENT', 'OVERFLOW', 'NONLINEAR', 'PERSIST', 'HOT', 'COLD', 'XTALK', 'GHOST',
  'GHOST_FPA', 'GHOST_EXT', 'OUTLIER', 'SUR_ERROR', 'NONFUNC', 'DICHROIC',
  'MISSING', 'MISSING_DATA', 'PHANMISS', 'SNOWBALL', 'BLOOM', 'HALO', 'SAT_HALO',
  'SATELLITE_HALO', 'CROSSTALK', 'STREAK'
]);
export function buildQualityMask(fits) {
  const n = fits.width * fits.height;
  const mask = new Uint8Array(n);
  let total = 0;
  let unsafeBits = 0;
  for (const [bitString, name] of Object.entries(fits.flagNames)) {
    const bit = Number(bitString);
    if (Number.isInteger(bit) && bit >= 0 && bit < 32 && BAD_NAMES.has(name)) {
      unsafeBits = (unsafeBits | ((1 << bit) >>> 0)) >>> 0;
    }
  }
  for (let i = 0; i < n; i++) {
    const v = fits.image[i];
    const f = fits.flags ? fits.flags[i] >>> 0 : 0;
    const invalid = !Number.isFinite(v) || (!!fits.flags && ((f & unsafeBits) !== 0));
    mask[i] = invalid ? 0 : 1;
    if (invalid) total++;
  }
  return {
    mask, maskedCount: total,
    flagsAvailable: !!fits.flags,
    flagDefinitionsAvailable: Object.keys(fits.flagNames).length > 0,
    unsafeBits,
    policyVersion: 'skyo-mask-1.1'
  };
}
