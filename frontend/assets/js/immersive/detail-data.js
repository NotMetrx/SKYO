import {parseFits,buildQualityMask} from '../science/fits.js';
import {wcsFromHeader,worldToPixel,pixelToWorld} from '../science/wcs.js';
import {spectralTable,wavelengthAt} from './spectral.js';
import {skyDirection} from './sky-math.js';

export function cutoutUrl(uri,ra,dec){
  if(!/^ibe\/data\/spherex\/(dr1|qr3)\/level2\/[\w./-]+\.fits$/.test(uri)||uri.includes('..')||!Number.isFinite(ra)||ra<0||ra>=360||!Number.isFinite(dec)||Math.abs(dec)>90)throw Error('Recorte IRSA inválido');
  const url=new URL(uri,'https://irsa.ipac.caltech.edu/');url.search=new URLSearchParams({center:`${ra},${dec}d`,size:'.25'});return url.href;
}
export function observationIdentity(fits,row,url){
  const observation=fits.header.OBSID??fits.headerPrimary.OBSID;
  if(!observation||row.observationid!==observation||row.collection!==`spherex_${new URL(url).pathname.split('/')[4]}`)throw Error('Identidad o colección de observación incompatible');return observation;
}
export function inspectCutout(buffer,point,detector,bounds){
  const fits=parseFits(buffer,{maxAxis:256,maxPixels:256*256}),wcs=wcsFromHeader(fits.header),spectral=spectralTable(buffer,fits.header),at=worldToPixel(wcs,point.ra,point.dec);
  const date=fits.header['DATE-OBS']??fits.headerPrimary['DATE-OBS'];
  if(fits.detector!==detector||!date||!Number.isFinite(Date.parse(date))||(fits.header.TIMESYS??fits.headerPrimary.TIMESYS)!=='UTC'||!(fits.header.VERSION??fits.headerPrimary.VERSION)||!['MJy/sr','MJy / sr'].includes(fits.header.BUNIT?.trim())||fits.flagsCompressed||!fits.flags)throw Error('Procedencia o calidad L2 incompatible');
  if(!Number.isFinite(at.x)||!Number.isFinite(at.y)||at.x<0||at.y<0||at.x>fits.width-1||at.y>fits.height-1)throw Error('La observación no contiene el punto');
  const wave=wavelengthAt(spectral,at.x,at.y);
  if(!wave||wave.wavelength<bounds[0]||wave.wavelength>=bounds[1])throw Error('Observación fuera del canal solicitado');
  const {mask}=buildQualityMask(fits,{purpose:'display'}),valid=new Uint8Array(mask.length);let count=0;
  for(let y=0;y<fits.height;y++)for(let x=0;x<fits.width;x++){
    const i=y*fits.width+x,w=wavelengthAt(spectral,x,y);
    if(mask[i]&&w&&w.wavelength>=bounds[0]&&w.wavelength<bounds[1]){valid[i]=1;count++;}
  }
  if(!count)throw Error('Sin píxeles L2 válidos en el canal');
  return {fits,wcs,spectral,valid,date,wave};
}
export function cutoutVertices(wcs,width,height){
  const steps=16,positions=[],uv=[],indices=[];
  for(let j=0;j<=steps;j++)for(let i=0;i<=steps;i++){
    const u=i/steps,v=j/steps,p=pixelToWorld(wcs,u*width-.5,v*height-.5);positions.push(...skyDirection(p.ra,p.dec,1000));uv.push(u,v);
  }
  for(let j=0;j<steps;j++)for(let i=0;i<steps;i++){const a=j*(steps+1)+i,b=a+steps+1;indices.push(a,b,a+1,b,b+1,a+1);}
  return {positions:new Float32Array(positions),uv:new Float32Array(uv),indices:new Uint16Array(indices)};
}
