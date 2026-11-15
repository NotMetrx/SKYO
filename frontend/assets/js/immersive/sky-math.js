/** Right-handed ICRS: RA0=-Z, RA90=-X, north=+Y; radius is visual, not distance. */
const R=Math.PI/180;
export const SKY_RADIUS=1000;
export function skyDirection(ra,dec,radius=1){
  const c=Math.cos(dec*R);
  return [-radius*c*Math.sin(ra*R),radius*Math.sin(dec*R),-radius*c*Math.cos(ra*R)];
}
export function skyCoordinates(v){
  const [x,y,z]=Array.isArray(v)?v:[v.x,v.y,v.z],r=Math.hypot(x,y,z);
  if(!r || !Number.isFinite(r))throw Error('Dirección celeste inválida');
  return {ra:((Math.atan2(-x,-z)/R)%360+360)%360,dec:Math.asin(Math.max(-1,Math.min(1,y/r)))/R};
}
export function healpixFace(face,x,y){
  if(!Number.isInteger(face)||face<0||face>11||x<0||x>1||y<0||y>1)throw Error('Coordenada HEALPix inválida');
  const row=Math.floor(face/4),ring=2+row-x-y;
  const polar=ring<1||ring>3;
  const n=ring<1?ring:ring>3?4-ring:1;
  const z=ring<1?1-n*n/3:ring>3?n*n/3-1:(2-ring)*2/3;
  const meridian=row===1?2*(face%4):2*(face%4)+1;
  const phi=(meridian+(n>1e-14?(x-y)/n:0))*Math.PI/4;
  return {ra:(phi/R+360)%360,dec:Math.asin(Math.max(-1,Math.min(1,z)))/R};
}
export function tileXY(order,pixel){
  const n=2**order,area=n*n,face=Math.floor(pixel/area);
  if(!Number.isInteger(order)||order<0||order>14||!Number.isInteger(pixel)||pixel<0||face>11)throw Error('Tesela HEALPix inválida');
  let bits=pixel%area,x=0,y=0;
  for(let i=0;i<order;i++){x+=(bits&1)*2**i;bits>>=1;y+=(bits&1)*2**i;bits>>=1;}
  return {face,x,y,n};
}
export function healpixTile(order,pixel,u,v){
  const {face,x,y,n}=tileXY(order,pixel);
  return healpixFace(face,(x+u)/n,(y+v)/n);
}
export function skyPixel(ra,dec,order){
  if(!Number.isFinite(ra)||!Number.isFinite(dec)||Math.abs(dec)>90||!Number.isInteger(order)||order<0||order>14)throw Error('Posición HEALPix inválida');
  const n=2**order,z=Math.sin(dec*R),az=Math.abs(z),t=(((ra%360)+360)%360)/90;
  let face,x,y;
  if(az<=2/3){
    const a=n*(.5+t),b=n*z*.75,p=Math.floor(a-b),m=Math.floor(a+b),fp=Math.floor(p/n),fm=Math.floor(m/n);
    face=fp===fm?(fp|4):fp<fm?fp:fm+8;
    x=((m%n)+n)%n;y=n-((p%n)+n)%n-1;
  }else{
    const sector=Math.min(3,Math.floor(t)),f=t-sector,s=n*Math.sqrt(3*(1-az));
    const a=Math.min(n-1,Math.floor(f*s)),b=Math.min(n-1,Math.floor((1-f)*s));
    face=z>=0?sector:sector+8;x=z>=0?n-b-1:a;y=z>=0?n-a-1:b;
  }
  let pixel=face*n*n;
  for(let i=0;i<order;i++)pixel+=((x>>i)&1)*2**(2*i)+((y>>i)&1)*2**(2*i+1);
  return {pixel,face,x,y};
}
export function sphereHit(origin,direction,radius=SKY_RADIUS){
  const dot=origin.x*direction.x+origin.y*direction.y+origin.z*direction.z;
  const q=dot*dot+radius*radius-origin.x**2-origin.y**2-origin.z**2;
  if(q<0)return null;
  const distance=-dot+Math.sqrt(q);
  return distance<0?null:{x:origin.x+direction.x*distance,y:origin.y+direction.y*distance,z:origin.z+direction.z*distance};
}
