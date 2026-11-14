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
function evalSip(coeff,u,v) {
  let out=0;
  for(const [i,j,c] of coeff) out+=c*u**i*v**j;
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
  const ctype1=String(h.CTYPE1??''), ctype2=String(h.CTYPE2??'');
  const nums=[crval1,crval2,crpix1,crpix2,cd11,cd12,cd21,cd22];
  const det=cd11*cd22-cd12*cd21;
  if (!nums.every(finite)||Math.abs(det)<1e-15 || !ctype1.includes('TAN') || !ctype2.includes('TAN')) {
    throw new Error('WCS TAN/TAN-SIP no compatible: hace falta registro astrometrico validado');
  }
  // Si el header indica SIP, debe haber terminos A/B. No ignorar distorsion.
  const a=sipCoeff(h,'A'),b=sipCoeff(h,'B');
  if ((ctype1.includes('SIP')||ctype2.includes('SIP')) && (!a.length||!b.length)) {
    throw new Error('WCS indica SIP pero faltan coeficientes A/B');
  }
  return {crval1,crval2,crpix1,crpix2,cd11,cd12,cd21,cd22,det,a,b};
}
export function pixelToWorld(w,x,y) {
  let u=x+1-w.crpix1, v=y+1-w.crpix2;
  const du=evalSip(w.a,u,v),dv=evalSip(w.b,u,v);
  u+=du;v+=dv;
  const xi=(w.cd11*u+w.cd12*v)*D2R;
  const eta=(w.cd21*u+w.cd22*v)*D2R;
  const dec0=w.crval2*D2R;
  const denom=Math.cos(dec0)-eta*Math.sin(dec0);
  const ra=w.crval1*D2R+Math.atan2(xi,denom);
  const dec=Math.atan2(Math.sin(dec0)+eta*Math.cos(dec0),Math.hypot(denom,xi));
  return {ra:deg360(ra*R2D),dec:dec*R2D};
}
export function worldToPixel(w,ra,dec) {
  const d0=w.crval2*D2R,delta=dec*D2R;
  let dra=(ra-w.crval1)*D2R;
  dra=Math.atan2(Math.sin(dra),Math.cos(dra));
  const denom=Math.sin(d0)*Math.sin(delta)+Math.cos(d0)*Math.cos(delta)*Math.cos(dra);
  if (!(denom>0)) return {x:NaN,y:NaN};
  const xi=(Math.cos(delta)*Math.sin(dra)/denom)*R2D;
  const eta=((Math.cos(d0)*Math.sin(delta)-Math.sin(d0)*Math.cos(delta)*Math.cos(dra))/denom)*R2D;
  const distortU=(w.cd22*xi-w.cd12*eta)/w.det;
  const distortV=(-w.cd21*xi+w.cd11*eta)/w.det;
  let u=distortU,v=distortV;
  for(let iter=0;iter<12;iter++) {
    const nextU=distortU-evalSip(w.a,u,v),nextV=distortV-evalSip(w.b,u,v);
    if(Math.abs(nextU-u)+Math.abs(nextV-v)<1e-9) {u=nextU;v=nextV;break;}
    u=nextU;v=nextV;
  }
  return {x:u+w.crpix1-1,y:v+w.crpix2-1};
}

/** Devuelve B proyectada a la cuadricula de A; varianza propagada aprox. */
export function reprojectToReference(ref,other,refMask,otherMask,{maxPixels=512*512}={}) {
  const n=ref.width*ref.height;
  if(n>maxPixels || other.width*other.height>maxPixels) {
    throw new Error('Recorte mayor de 512x512; reduce el tamano para ahorrar memoria y bateria');
  }
  const refW=wcsFromHeader(ref.header),otherW=wcsFromHeader(other.header);
  const values=new Float32Array(n);values.fill(NaN);
  const variance=new Float32Array(n);variance.fill(NaN);
  const valid=new Uint8Array(n);
  for(let y=0;y<ref.height;y++) for(let x=0;x<ref.width;x++) {
    const i=y*ref.width+x;
    if (!refMask[i]) continue;
    const point=pixelToWorld(refW,x,y);
    const p=worldToPixel(otherW,point.ra,point.dec);
    if (!finite(p.x)||!finite(p.y)) continue;
    const x0=Math.floor(p.x),y0=Math.floor(p.y);
    if(x0<0||y0<0||x0+1>=other.width||y0+1>=other.height) continue;
    const tx=p.x-x0,ty=p.y-y0;
    const neighbors=[
      [y0*other.width+x0,(1-tx)*(1-ty)],
      [y0*other.width+x0+1,tx*(1-ty)],
      [(y0+1)*other.width+x0,(1-tx)*ty],
      [(y0+1)*other.width+x0+1,tx*ty]
    ];
    let value=0,varSum=0,okay=true;
    for(const [j,weight] of neighbors) {
      if(weight<1e-8) continue;
      const v=other.image[j];
      if(!otherMask[j]||!finite(v)) {okay=false;break;}
      value+=weight*v;
      if(other.variance) {
        const vv=other.variance[j];
        if(!finite(vv)||vv<0) {okay=false;break;}
        varSum+=weight*weight*vv;
      }
    }
    if(okay) {
      values[i]=value;
      variance[i]=other.variance ? varSum : NaN;
      valid[i]=1;
    }
  }
  return {image:values,variance,mask:valid};
}
