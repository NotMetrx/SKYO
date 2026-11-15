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
const interested = new Set(['PRIMARY','IMAGE','VARIANCE','ZODI','FLAGS']);

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
export function readFitsHeader(buffer,offset=0){
  if(!(buffer instanceof ArrayBuffer)||!Number.isInteger(offset)||offset<0)throw Error('Cabecera FITS inválida');
  return readHeader(buffer,offset);
}

export function decodeFlags32(view,offset,n,bzero=0,bscale=1){
  if(bscale!==1)throw Error('FLAGS requiere BSCALE=1');
  if(![0,2147483648].includes(bzero))throw Error('FLAGS BZERO no admitido');
  const flags=new Uint32Array(n);
  for(let i=0;i<n;i++)flags[i]=(view.getInt32(offset+i*4,false)+bzero)>>>0;
  return flags;
}
function decodeImage(view, offset, n, bitpix, header, isFlags) {
  const bytes = Math.abs(bitpix) / 8;
  if (![8,16,32,64,-32,-64].includes(bitpix) || !Number.isInteger(bytes)) {
    throw new Error(`BITPIX no admitido: ${bitpix}`);
  }
  const bzero = header.BZERO ?? 0, bscale = header.BSCALE ?? 1;
  if(!Number.isFinite(bzero)||!Number.isFinite(bscale)||bscale===0)throw Error('BZERO/BSCALE inválidos');
  if(isFlags){
    if(bitpix!==32||header.BLANK!==undefined)throw Error('FLAGS requiere BITPIX32 sin BLANK');
    return decodeFlags32(view,offset,n,bzero,bscale);
  }
  const output = new Float32Array(n);
  const blank = header.BLANK;
  for (let i=0; i<n; i++) {
    const pos = offset + i*bytes;
    let value;
    if (bitpix===-32) value=view.getFloat32(pos,false);
    else if (bitpix===-64) value=view.getFloat64(pos,false);
    else if (bitpix===32) value=view.getInt32(pos,false);
    else if (bitpix===16) value=view.getInt16(pos,false);
    else if (bitpix===8) value=view.getUint8(pos);
    else {const raw=view.getBigInt64(pos,false);if(raw>BigInt(Number.MAX_SAFE_INTEGER)||raw<BigInt(Number.MIN_SAFE_INTEGER))throw Error('BITPIX64 fuera de precisión numérica soportada');value=Number(raw);}
    output[i] = (!isFlags && blank !== undefined && Number(blank) === value)
      ? Number.NaN : value*bscale+bzero;
  }
  return output;
}

/** Inventory only: large cubes are never decoded in full. */
export function inspectFits(buffer) {
  if (!(buffer instanceof ArrayBuffer)) throw new TypeError('Se esperaba ArrayBuffer');
  if(!buffer.byteLength||buffer.byteLength%BLOCK)throw Error('Archivo FITS incompleto: bloque truncado');
  const hdus = [];
  let offset = 0;
  for (let iter=0; offset + CARD <= buffer.byteLength && iter<64; iter++) {
    const {header,end} = readHeader(buffer, offset);
    if(end>buffer.byteLength)throw Error('Cabecera FITS incompleta');
    if(iter===0&&header.SIMPLE!==true)throw Error('Falta cabecera SIMPLE FITS');
    const dims = [];
    const axes = header.NAXIS;
    if (!Number.isInteger(axes) || axes < 0 || axes > 6) throw new Error('NAXIS invalido');
    for (let i=1; i<=axes; i++) {
      const dimension=header[`NAXIS${i}`];
      if(!Number.isSafeInteger(dimension)||dimension<0)throw Error('Dimensiones NAXIS inválidas');
      dims.push(dimension);
    }
    const xtension = String(header.XTENSION || 'PRIMARY').trim().toUpperCase();
    if(!['PRIMARY','IMAGE','BINTABLE','TABLE'].includes(xtension))throw Error('XTENSION no admitida');
    const extension = String(header.EXTNAME || (xtension === 'PRIMARY' ? 'PRIMARY' : '')).trim().toUpperCase();
    const bitpix = header.BITPIX;
    if(![8,16,32,64,-32,-64].includes(bitpix))throw Error('BITPIX no admitido');
    const nPixels = axes>0 ? dims.reduce((a,b)=>a*b, 1) : 0;
    const pcount = header.PCOUNT ?? 0;
    const gcount = header.GCOUNT ?? 1;
    if(!Number.isSafeInteger(pcount)||pcount<0||gcount!==1||(!['BINTABLE','TABLE'].includes(xtension)&&pcount!==0))throw Error('PCOUNT/GCOUNT no admitidos');
    const dataBytes = (nPixels+pcount)*Math.abs(bitpix)/8;
    if (!Number.isSafeInteger(dataBytes) || dataBytes<0 || end+padBlock(dataBytes)>buffer.byteLength) {
      throw new Error(`Archivo FITS incompleto o dimensiones invalidas: ${extension}`);
    }
    const compressed = xtension==='BINTABLE' && header.ZIMAGE===true;
    hdus.push({name:extension,header,dims,compressed,xtension,headerOffset:offset,dataOffset:end});
    offset=end+padBlock(dataBytes);
    if (offset===buffer.byteLength) break;
  }
  if(offset!==buffer.byteLength)throw Error('Archivo FITS contiene demasiadas HDU o datos sin procesar');
  return hdus;
}

export function readFitsPlane(buffer,hduIndex,plane=0) {
  const hdu=inspectFits(buffer)[hduIndex];
  if(!Number.isInteger(hduIndex)||!hdu||!['PRIMARY','IMAGE'].includes(hdu.xtension)||![2,3].includes(hdu.dims.length)||hdu.compressed)throw Error('HDU sin imagen 2D o cubo compatible');
  const [width,height,planes=1]=hdu.dims;
  if(width<1||height<1||width>2048||height>2048)throw Error('Inspector: máximo 2048 por eje; utiliza un recorte FITS');
  if(!Number.isInteger(plane)||plane<0||plane>=planes)throw Error('Plano FITS fuera de rango');
  const size=width*height,offset=hdu.dataOffset+plane*size*Math.abs(hdu.header.BITPIX)/8;
  const image=decodeImage(new DataView(buffer),offset,size,hdu.header.BITPIX,hdu.header,hdu.name==='FLAGS');
  return {width,height,image,header:hdu.header,plane,planes};
}

export function parseFits(buffer,{maxPixels=512*512,maxAxis=512}={}) {
  const hdus=inspectFits(buffer),view=new DataView(buffer);
  for(const hdu of hdus) {
    const {name:extension,header,dims,xtension,dataOffset}=hdu;
    const axes=dims.length,nPixels=axes?dims.reduce((a,b)=>a*b,1):0;
    let data=null;
    const is2dImage=['PRIMARY','IMAGE'].includes(xtension) && axes===2 && nPixels>0;
    if(interested.has(extension)&&xtension!=='BINTABLE'&&axes!==2&&!(extension==='PRIMARY'&&axes===0))throw Error(`${extension} requiere imagen 2D`);
    if (interested.has(extension) && is2dImage) {
      if (nPixels>maxPixels||dims.some(axis=>axis>maxAxis)) throw new Error('Imagen demasiado grande; máximo 512 por eje, solicita un recorte FITS');
      if(hdus.some(other=>other!==hdu&&other.name===extension))throw Error(`HDU duplicada: ${extension}`);
      data=decodeImage(view,dataOffset,nPixels,header.BITPIX,header,extension==='FLAGS');
    }
    hdu.data=data;
  }
  const image=hdus.find(h=>h.name==='IMAGE' && h.data)
    ||hdus.find(h=>h.name==='PRIMARY' && h.data);
  if (!image || image.dims.length!==2) throw new Error('El FITS no contiene IMAGE 2D legible');
  const [width,height]=image.dims;
  if(image.header.BUNIT!=null&&typeof image.header.BUNIT!=='string')throw Error('BUNIT no admitido');
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
    if (/^MSKN\d{4}$/.test(key)) {
      const bit=Number(key.slice(4));if(bit>31)throw Error('Bit FLAGS fuera del rango 0–31');
      flagNames[bit]=String(value).trim().toUpperCase();
    }
  }
  return {
    width,height, image:image.data, variance:variance?.data??null,
    flags:flagsHdu?.data??null, flagNames,
    flagsCompressed:!!flagsHdu?.compressed,
    zodi:zodi?.data??null, header:image.header,
    headerPrimary:hdus[0]?.header??{},
    hdus:hdus.map(({name,dims,compressed,data})=>({name,dims,compressed,decoded:!!data})),
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
  'MISSING','MISSING_DATA','PHANMISS','SNOWBALL','BLOOM','HALO','SAT_HALO','SATELLITE_HALO','CROSSTALK','STREAK'
]);
export function buildQualityMask(fits,{purpose='analysis'}={}) {
  if(!['display','analysis','background'].includes(purpose))throw Error('Propósito de máscara inválido');
  const n=fits.width*fits.height;
  const mask=new Uint8Array(n);
  let total=0;
  let unsafeBits=0;
  let definedBits=0;
  for (const [bitString,name] of Object.entries(fits.flagNames)) {
    const bit=Number(bitString);if(!Number.isInteger(bit)||bit<0||bit>31)throw Error('Bit FLAGS fuera del rango 0–31');
    definedBits=(definedBits|(1<<bit))>>>0;
    if (BAD_NAMES.has(name)||(purpose==='background'&&name==='SOURCE')||(!BAD_NAMES.has(name)&&!['SOURCE','FULLSAMPLE'].includes(name))) unsafeBits=(unsafeBits|(1<<bit))>>>0;
  }
  for(let i=0;i<n;i++) {
    const v=fits.image[i];
    const f= fits.flags ? fits.flags[i]>>>0 : 0;
    const invalid= !Number.isFinite(v) || (!!fits.flags && ((f & unsafeBits)!==0 || (f & ~definedBits)!==0));
    mask[i]=invalid?0:1;
    if (invalid) total++;
  }
  return {
    mask, maskedCount:total,
    flagsAvailable:!!fits.flags,
    flagDefinitionsAvailable:Object.keys(fits.flagNames).length>0,
    unsafeBits,policyId:'skyo-mask-v2',policyVersion:2,purpose
  };
}
