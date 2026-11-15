/** WCS FITS RA---TAN-SIP/DEC--TAN-SIP. Convencion: entrada indices JS 0-based. */
const D2R=Math.PI/180;
const R2D=180/Math.PI;
const deg360 = ra => ((ra%360)+360)%360;
const finite = x => Number.isFinite(x);

function sipCoeff(header,prefix) {
  const coeff=[];
  for (const [key,val] of Object.entries(header)) {
    const m=key.match(new RegExp(`^${prefix}_(\\d+)_(\\d+)$`));
    if (m && finite(Number(val))) coeff.push([+m[1],+m[2],Number(val)]);
  }
  return coeff;
}
function fastPow(x, e) {
  if (e === 0) return 1;
  if (e === 1) return x;
  if (e === 2) return x * x;
  if (e === 3) return x * x * x;
  return x ** e;
}
function evalSip(coeff, u, v) {
  let out = 0;
  for (let k = 0; k < coeff.length; k++) {
    const [i, j, c] = coeff[k];
    out += c * fastPow(u, i) * fastPow(v, j);
  }
  return out;
}
export function wcsFromHeader(h) {
  const crval1=Number(h.CRVAL1), crval2=Number(h.CRVAL2);
  const crpix1=Number(h.CRPIX1), crpix2=Number(h.CRPIX2);
  const cdelt1=Number(h.CDELT1 ?? 1), cdelt2=Number(h.CDELT2 ?? 1);
  const cd11= h.CD1_1!=null ? +h.CD1_1 : cdelt1*Number(h.PC1_1??1);
  const cd12= h.CD1_2!=null ? +h.CD1_2 : cdelt1*Number(h.PC1_2??0);
  const cd21= h.CD2_1!=null ? +h.CD2_1 : cdelt2*Number(h.PC2_1??0);
  const cd22= h.CD2_2!=null ? +h.CD2_2 : cdelt2*Number(h.PC2_2??1);
  const ctype1=String(h.CTYPE1??'').trim(), ctype2=String(h.CTYPE2??'').trim();
  const nums=[crval1,crval2,crpix1,crpix2,cd11,cd12,cd21,cd22];
  const det=cd11*cd22-cd12*cd21;
  if (!nums.every(finite)||Math.abs(det)<1e-15 || !/^RA---TAN(?:-SIP)?$/.test(ctype1) || !/^DEC--TAN(?:-SIP)?$/.test(ctype2)) {
    throw new Error('WCS TAN/TAN-SIP no compatible: hace falta registro astrometrico validado');
  }
  const cunit1=String(h.CUNIT1??'').trim().toLowerCase(), cunit2=String(h.CUNIT2??'').trim().toLowerCase();
  if ((cunit1 && cunit1!=='deg') || (cunit2 && cunit2!=='deg')) {
    throw new Error('WCS CUNIT no soportada: se requieren grados (deg)');
  }
  const radesys=String(h.RADESYS??h.RADECSYS??'').trim().toUpperCase();
  if (radesys && radesys!=='ICRS') {
    throw new Error('Marco astrometrico RADESYS no soportado: se requiere ICRS');
  }
  if (h.EQUINOX!=null && String(h.EQUINOX).trim()!=='' && Number(h.EQUINOX)!==2000) {
    throw new Error('EQUINOX no soportado: se requiere ICRS / J2000');
  }
  // Si el header indica SIP, debe haber terminos A/B. No ignorar distorsion.
  const a=sipCoeff(h,'A'),b=sipCoeff(h,'B');
  if ((ctype1.includes('SIP')||ctype2.includes('SIP')) && (!a.length||!b.length)) {
    throw new Error('WCS indica SIP pero faltan coeficientes A/B');
  }
  const dec0Rad=crval2*D2R;
  return {crval1,crval2,crpix1,crpix2,cd11,cd12,cd21,cd22,det,a,b,sinDec0:Math.sin(dec0Rad),cosDec0:Math.cos(dec0Rad)};
}
export function pixelToWorld(w,x,y) {
  let u=x+1-w.crpix1, v=y+1-w.crpix2;
  const du=w.a.length?evalSip(w.a,u,v):0;
  const dv=w.b.length?evalSip(w.b,u,v):0;
  u+=du;v+=dv;
  const xi=(w.cd11*u+w.cd12*v)*D2R;
  const eta=(w.cd21*u+w.cd22*v)*D2R;
  const denom=w.cosDec0-eta*w.sinDec0;
  const ra=w.crval1*D2R+Math.atan2(xi,denom);
  const dec=Math.atan2(w.sinDec0+eta*w.cosDec0,Math.hypot(denom,xi));
  return {ra:deg360(ra*R2D),dec:dec*R2D};
}
export function worldToPixel(w,ra,dec) {
  const delta=dec*D2R;
  let dra=(ra-w.crval1)*D2R;
  dra=Math.atan2(Math.sin(dra),Math.cos(dra));
  const cosDelta=Math.cos(delta),sinDelta=Math.sin(delta);
  const denom=w.sinDec0*sinDelta+w.cosDec0*cosDelta*Math.cos(dra);
  if (!(denom>0)) return {x:NaN,y:NaN};
  const xi=(cosDelta*Math.sin(dra)/denom)*R2D;
  const eta=((w.cosDec0*sinDelta-w.sinDec0*cosDelta*Math.cos(dra))/denom)*R2D;
  const distortU=(w.cd22*xi-w.cd12*eta)/w.det;
  const distortV=(-w.cd21*xi+w.cd11*eta)/w.det;
  // Inversión TAN-SIP por Newton-Raphson con jacobiano analítico.
  let u=distortU, v=distortV, converged=false;
  const hasSip = w.a.length || w.b.length;
  if (!hasSip) return {x:u+w.crpix1-1,y:v+w.crpix2-1};
  for(let iter=0; iter<20; iter++) {
    const f1=u+evalSip(w.a,u,v)-distortU;
    const f2=v+evalSip(w.b,u,v)-distortV;
    if(Math.max(Math.abs(f1),Math.abs(f2))<1e-9) { converged=true; break; }
    let j11=1, j12=0, j21=0, j22=1;
    for(let k=0;k<w.a.length;k++) {
      const [i,j,c]=w.a[k];
      if(i) j11+=c*i*fastPow(u,i-1)*fastPow(v,j);
      if(j) j12+=c*j*fastPow(u,i)*fastPow(v,j-1);
    }
    for(let k=0;k<w.b.length;k++) {
      const [i,j,c]=w.b[k];
      if(i) j21+=c*i*fastPow(u,i-1)*fastPow(v,j);
      if(j) j22+=c*j*fastPow(u,i)*fastPow(v,j-1);
    }
    const detJ=j11*j22-j12*j21;
    if(!finite(detJ)||Math.abs(detJ)<1e-12) break;
    u-=(j22*f1-j12*f2)/detJ;
    v-=(-j21*f1+j11*f2)/detJ;
    if(!finite(u)||!finite(v)) break;
  }
  if(!converged) return {x:NaN,y:NaN};
  return {x:u+w.crpix1-1,y:v+w.crpix2-1};
}

/** Devuelve B proyectada a la cuadricula de A; varianza, ZODI y mascara SOURCE opcional en una sola pasada. */
export function reprojectToReference(ref,other,refMask,otherMask,{maxPixels=512*512,maxAxis=512,bSourceBit=null}={}) {
  const n=ref.width*ref.height;
  if(n>maxPixels || other.width*other.height>maxPixels || ref.width>maxAxis || ref.height>maxAxis || other.width>maxAxis || other.height>maxAxis) {
    throw new Error('Recorte mayor de 512x512; reduce el tamano para ahorrar memoria y bateria');
  }
  const refW=wcsFromHeader(ref.header),otherW=wcsFromHeader(other.header);
  const values=new Float32Array(n);values.fill(NaN);
  const variance=new Float32Array(n);variance.fill(NaN);
  const zodi=new Float32Array(n);zodi.fill(NaN);
  const valid=new Uint8Array(n);
  const srcBitMask=(bSourceBit!=null&&other.flags)?((1<<Number(bSourceBit))>>>0):0;
  const sourceMask=srcBitMask?new Uint8Array(n):null;
  const oW=other.width,oH=other.height,oImg=other.image,oZodi=other.zodi,oVar=other.variance,oFlags=other.flags;
  const refWpx=ref.width,refHpx=ref.height;
  for(let y=0;y<refHpx;y++) for(let x=0;x<refWpx;x++) {
    const i=y*refWpx+x;
    if (!refMask[i]) continue;
    const point=pixelToWorld(refW,x,y);
    const p=worldToPixel(otherW,point.ra,point.dec);
    if (!finite(p.x)||!finite(p.y)) continue;
    const x0=Math.floor(p.x),y0=Math.floor(p.y);
    if(x0<0||y0<0||x0+1>=oW||y0+1>=oH) continue;
    const tx=p.x-x0,ty=p.y-y0;
    const omTx=1-tx,omTy=1-ty;
    const j00=y0*oW+x0, j10=j00+1, j01=j00+oW, j11=j01+1;
    const w00=omTx*omTy, w10=tx*omTy, w01=omTx*ty, w11=tx*ty;
    let value=0,varSum=0,zodiSum=0,zodiValid=!!oZodi,okay=true,hasSource=0;
    for(let c=0;c<4;c++){
      const j=c===0?j00:(c===1?j10:(c===2?j01:j11));
      const weight=c===0?w00:(c===1?w10:(c===2?w01:w11));
      if(weight<1e-8) continue;
      const v=oImg[j];
      if(!otherMask[j]||!finite(v)){okay=false;break;}
      value+=weight*v;
      if(oZodi){const zz=oZodi[j];if(finite(zz))zodiSum+=weight*zz;else zodiValid=false;}
      if(oVar){const vv=oVar[j];if(!finite(vv)||vv<0){okay=false;break;}varSum+=weight*weight*vv;}
      if(srcBitMask&&(((oFlags[j]>>>0)&srcBitMask)!==0)) hasSource=1;
    }

    if(okay) {
      values[i]=value;
      variance[i]=oVar ? varSum : NaN;
      valid[i]=1;
      if(zodiValid) zodi[i]=zodiSum;
      if(sourceMask&&hasSource) sourceMask[i]=1;
    }
  }
  return {image:values,variance,zodi,mask:valid,sourceMask};
}
