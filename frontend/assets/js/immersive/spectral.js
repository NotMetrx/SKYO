import {readFitsHeader} from '../science/fits.js';

export function channelBounds(waves,channel){
  if(!Number.isInteger(channel)||channel<0||channel>=102||waves.length!==102||[50,51].includes(channel))throw Error('Canal sin datos');
  const at=waves[channel],lo=channel%17? (waves[channel-1]+at)/2:at-(waves[channel+1]-at)/2;
  const hi=channel%17<16?(at+waves[channel+1])/2:at+(at-waves[channel-1])/2;
  if(![lo,hi].every(Number.isFinite)||lo<=0||hi<=lo)throw Error('Intervalo espectral inválido');return [lo,hi];
}
export function spectralTable(buffer,h){
  for(const k of [1,2])if(h[`CTYPE${k}W`]!=='WAVE-TAB'||h[`CUNIT${k}W`]!=='um'||h[`PS${k}_0W`]!=='WCS-WAVE'||h[`PS${k}_1W`]!=='VALUES'||h[`PS${k}_2W`]!==(k===1?'X':'Y')||h[`PV${k}_3W`]!==k||![h[`CRPIX${k}W`],h[`CRVAL${k}W`],h[`CDELT${k}W`]].every(Number.isFinite)||h[`CDELT${k}W`]===0)throw Error('WCS-WAVE no compatible');
  for(const k of ['PC1_2W','PC2_1W'])if(h[k]!=null&&h[k]!==0)throw Error('Matriz espectral cruzada no compatible');
  for(const k of ['PC1_1W','PC2_2W'])if(h[k]!=null&&h[k]!==1)throw Error('Matriz espectral no compatible');
  let offset=0;const view=new DataView(buffer);
  while(offset<buffer.byteLength){
    const {header:t,end}=readFitsHeader(buffer,offset);let n=t.NAXIS?1:0;for(let i=1;i<=t.NAXIS;i++)n*=t[`NAXIS${i}`];
    const size=(n+(t.PCOUNT??0))*Math.abs(t.BITPIX)/8;
    if(!Number.isSafeInteger(size)||size<0||end+size>buffer.byteLength)throw Error('Tabla espectral truncada');
    if(t.EXTNAME==='WCS-WAVE'){
      if(t.XTENSION!=='BINTABLE'||t.NAXIS2!==1||t.PCOUNT!==0||t.TFIELDS!==3||t.TTYPE1!=='X'||t.TTYPE2!=='Y'||t.TTYPE3!=='VALUES')throw Error('Tabla espectral incompatible');
      const nx=Number(t.TFORM1?.match(/^(\d+)J$/)?.[1]),ny=Number(t.TFORM2?.match(/^(\d+)J$/)?.[1]),nv=Number(t.TFORM3?.match(/^(\d+)E$/)?.[1]);
      if(nx<2||ny<2||nx>128||ny>128||nv!==2*nx*ny||t.TDIM3!==`(2,${nx},${ny})`||size!==(nx+ny+nv)*4)throw Error('Dimensiones espectrales incompatibles');
      let at=end;const read=(count,int)=>Array.from({length:count},()=>{const v=int?view.getInt32(at,false):view.getFloat32(at,false);at+=4;return v;});
      const x=read(nx,true),y=read(ny,true),values=read(nv,false);
      if(!values.every(Number.isFinite)||[x,y].some(a=>a.some((v,i)=>i&&v<=a[i-1])))throw Error('Tabla espectral inválida');
      return {x,y,values,crpix:[h.CRPIX1W,h.CRPIX2W],crval:[h.CRVAL1W,h.CRVAL2W],cdelt:[h.CDELT1W,h.CDELT2W]};
    }
    offset=end+Math.ceil(size/2880)*2880;
  }throw Error('Falta WCS-WAVE');
}
export function wavelengthAt(t,x,y){
  const p=[x,y].map((v,i)=>(v+1-t.crpix[i])*t.cdelt[i]+t.crval[i]);
  const index=(a,v)=>{if(v<a[0]||v>a.at(-1))return -1;let i=0;while(i<a.length-2&&v>a[i+1])i++;return i;};
  const i=index(t.x,p[0]),j=index(t.y,p[1]);if(i<0||j<0)return null;
  const u=(p[0]-t.x[i])/(t.x[i+1]-t.x[i]),v=(p[1]-t.y[j])/(t.y[j+1]-t.y[j]),n=t.x.length;
  const sample=k=>t.values[(j*n+i)*2+k]*(1-u)*(1-v)+t.values[(j*n+i+1)*2+k]*u*(1-v)+t.values[((j+1)*n+i)*2+k]*(1-u)*v+t.values[((j+1)*n+i+1)*2+k]*u*v;
  return {wavelength:sample(0),bandwidth:sample(1)};
}
