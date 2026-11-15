import {readFitsHeader} from '../science/fits.js';
import {skyPixel} from './sky-math.js';
export const CUBE_ROOT='https://nasa-irsa-spherex.s3.us-east-1.amazonaws.com/dr1/hips5_cube/hips_20261026';
export function cubePixel(ra,dec){
  const fine=skyPixel(ra,dec,14),pixel=Math.floor(fine.pixel/512**2);
  return {pixel,x:fine.y%512,y:511-fine.x%512};
}
export function cubeHeader(buffer,pixel){
  const p=readFitsHeader(buffer),h=readFitsHeader(buffer,p.end);
  const v=h.header;
  if(p.header.SIMPLE!==true||p.header.NAXIS!==0||v.EXTNAME!=='IMAGE'||v.NAXIS!==3||v.BITPIX!==-32||v.NAXIS1!==512||v.NAXIS2!==512||v.NAXIS3!==102||v.ORDER!==5||v.NPIX!==pixel||v.RADESYS!=='ICRS'||v.CTYPE1!=='RA---HPX'||v.CTYPE2!=='DEC--HPX'||v.PCOUNT!==0||v.GCOUNT!==1||v.PC1_1!==v.PC1_2||v.PC2_1!==-v.PC2_2||v.PC1_1!==-v.PC2_1||v.PC1_1!==-0.00274658203125||v.CRVAL1!==0||v.CRVAL2!==0||v.LONPOLE!==0)throw Error('Cubo HPX no compatible; no se inventa una posición de píxel');
  return {offset:h.end,width:512,height:512,channels:102,header:v,primary:p.header};
}
export async function fetchRange(url,start,end,signal){
  const expected=end-start+1;
  if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||expected<1||expected>1048576)throw Error('Rango FITS fuera de presupuesto');
  const response=await fetch(url,{headers:{Range:`bytes=${start}-${end}`},signal});
  if(response.status!==206){await response.body?.cancel();throw Error(`Range FITS requiere206; HTTP${response.status}`);}
  const content=response.headers.get('Content-Range');
  if(content&&!content.startsWith(`bytes ${start}-${end}/`)){await response.body?.cancel();throw Error('Rango FITS incorrecto');}
  const declared=Number(response.headers.get('Content-Length'));
  if(declared&&declared!==expected){await response.body?.cancel();throw Error('Tamaño de rango FITS incorrecto');}
  if(!response.body)throw Error('Rango FITS vacío');
  const reader=response.body.getReader(),output=new Uint8Array(expected);let offset=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;if(offset+value.length>expected)throw Error('Rango FITS fuera de presupuesto');output.set(value,offset);offset+=value.length;}}
  finally{await reader.cancel();}
  if(offset!==expected)throw Error('Rango FITS truncado');return output.buffer;
}
