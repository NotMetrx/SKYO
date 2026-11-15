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

function readHeader(buffer, offset) {
  const header = {};
  let foundEnd = false;
  const start = offset;
  while (offset + CARD <= buffer.byteLength) {
    const card = decoder.decode(new Uint8Array(buffer, offset, CARD));
    offset += CARD;
    if (card.slice(0,8).trim() === 'END') {foundEnd=true; break;}
    if (card[8] === '=') {
      const key = card.slice(0,8).trim();
      if (key) header[key] = decodeValue(card.slice(10));
    }
    if (offset - start > 2880 * 64) throw new Error('Cabecera FITS demasiado grande');
  }
  if (!foundEnd) throw new Error('No se encontro END en la cabecera FITS');
  return {header, end: padBlock(offset)};
}

function decodeImage(view, offset, n, bitpix, header, isFlags) {
  const bytes = Math.abs(bitpix) / 8;
  if (![8,16,32,64,-32,-64].includes(bitpix) || !Number.isInteger(bytes)) {
    throw new Error(`BITPIX no admitido: ${bitpix}`);
  }
  const output = isFlags ? new Int32Array(n) : new Float32Array(n);
  const bzero = Number(header.BZERO ?? 0), bscale = Number(header.BSCALE ?? 1);
  const blank = header.BLANK;
  for (let i=0; i<n; i++) {
    const pos = offset + i*bytes;
    let value;
    if (bitpix===-32) value=view.getFloat32(pos,false);
    else if (bitpix===-64) value=view.getFloat64(pos,false);
    else if (bitpix===32) value=view.getInt32(pos,false);
    else if (bitpix===16) value=view.getInt16(pos,false);
    else if (bitpix===8) value=view.getUint8(pos);
    else value=Number(view.getBigInt64(pos,false));
    output[i] = (!isFlags && blank !== undefined && Number(blank) === value)
      ? Number.NaN : value*bscale+bzero;
  }
  return output;
}

export function parseFits(buffer,{maxPixels=4_500_000}={}) {
  if (!(buffer instanceof ArrayBuffer)) throw new TypeError('Se esperaba ArrayBuffer');
  const view = new DataView(buffer), hdus = [];
  let offset = 0;
  for (let iter=0; offset + CARD <= buffer.byteLength && iter<64; iter++) {
    const {header,end} = readHeader(buffer, offset);
    const dims = [];
    const axes = Number(header.NAXIS ?? 0);
    if (!Number.isInteger(axes) || axes < 0 || axes > 6) throw new Error('NAXIS invalido');
    for (let i=1; i<=axes; i++) dims.push(Number(header[`NAXIS${i}`] || 0));
    const xtension = String(header.XTENSION || 'PRIMARY').trim().toUpperCase();
    const extension = String(header.EXTNAME || (xtension === 'PRIMARY' ? 'PRIMARY' : '')).trim().toUpperCase();
    const bitpix = Number(header.BITPIX || 8);
    const nPixels = axes>0 ? dims.reduce((a,b)=>a*b, 1) : 0;
    const pcount = Number(header.PCOUNT || 0);
    const gcount = Number(header.GCOUNT || 1);
    const dataBytes = (nPixels*Math.abs(bitpix)/8 + pcount) * gcount;
    if (!Number.isSafeInteger(dataBytes) || dataBytes<0 || end+dataBytes>buffer.byteLength) {
      throw new Error(`Archivo FITS incompleto o dimensiones invalidas: ${extension}`);
    }
    let data=null;
    const is2dImage=xtension!=='BINTABLE' && axes===2 && nPixels>0;
    if (interested.has(extension) && is2dImage) {
      if (nPixels>maxPixels) throw new Error('Imagen demasiado grande; solicita un recorte FITS');
      data=decodeImage(view,end,nPixels,bitpix,header,extension==='FLAGS');
    }
    const compressed = xtension==='BINTABLE' && header.ZIMAGE===true;
    hdus.push({name:extension,header,dims,data,compressed});
    offset=end+padBlock(dataBytes);
    if (offset===0) break;
    if (offset===buffer.byteLength) break;
  }
  const image=hdus.find(h=>h.name==='IMAGE' && h.data)
    ||hdus.find(h=>h.name==='PRIMARY' && h.data);
  if (!image || image.dims.length!==2) throw new Error('El FITS no contiene IMAGE 2D legible');
  const [width,height]=image.dims;
  const variance=hdus.find(h=>h.name==='VARIANCE' && h.data);
  const flagsHdu=hdus.find(h=>h.name==='FLAGS');
  const zodi=hdus.find(h=>h.name==='ZODI' && h.data);
  for (const layer of [variance,zodi,flagsHdu?.data ? flagsHdu:null]) {
    if (layer && layer.data && (layer.dims[0]!==width || layer.dims[1]!==height)) {
      throw new Error(`Dimensiones no coinciden para extension ${layer.name}`);
    }
  }
  const flagNames={};
  if (flagsHdu) for(const [key,value] of Object.entries(flagsHdu.header)) {
    if (/^MSKN\d{4}$/.test(key)) flagNames[Number(key.slice(4))]=String(value).trim().toUpperCase();
  }
  return {
    width,height, image:image.data, variance:variance?.data??null,
    flags:flagsHdu?.data??null, flagNames,
    flagsCompressed:!!flagsHdu?.compressed,
    zodi:zodi?.data??null, header:image.header,
    headerPrimary:hdus[0]?.header??{},
    // FITS DATE es frecuentemente la FECHA DE PROCESAMIENTO, no de observacion.
    observationTime:image.header['DATE-OBS'] || null,
    spectralStatus: image.header.WAVELEN ? 'synthetic-keyword-or-custom' : 'unverified',
    wavelengthUm:Number(image.header.WAVELEN)||null,
    bandwidthUm:Number(image.header.BANDWID)||null,
    detector:Number(image.header.DETECTOR)||null,
    origin:String(image.header.ORIGIN || hdus[0]?.header.ORIGIN || 'desconocido')
  };
}

const BAD_NAMES=new Set([
  'TRANSIENT','OVERFLOW','NONLINEAR','PERSIST','HOT','COLD','XTALK','GHOST',
  'GHOST_FPA','GHOST_EXT','OUTLIER','SUR_ERROR','NONFUNC','DICHROIC',
  'MISSING','PHANMISS','SNOWBALL','BLOOM','HALO','SAT_HALO'
]);
export function buildQualityMask(fits) {
  const n=fits.width*fits.height;
  const mask=new Uint8Array(n);
  let total=0;
  let unsafeBits=0;
  for (const [bitString,name] of Object.entries(fits.flagNames)) {
    if (BAD_NAMES.has(name)) unsafeBits=(unsafeBits|(1<<Number(bitString)))>>>0;
  }
  for(let i=0;i<n;i++) {
    const v=fits.image[i];
    const f= fits.flags ? fits.flags[i]>>>0 : 0;
    const invalid= !Number.isFinite(v) || (!!fits.flags && ((f & unsafeBits)!==0));
    mask[i]=invalid?0:1;
    if (invalid) total++;
  }
  return {
    mask, maskedCount:total,
    flagsAvailable:!!fits.flags,
    flagDefinitionsAvailable:Object.keys(fits.flagNames).length>0,
    unsafeBits
  };
}
