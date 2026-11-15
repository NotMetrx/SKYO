import {inspectFits,readFitsPlane,buildQualityMask} from './fits.js';
import {wcsFromHeader,worldToPixel} from './wcs.js';
import {imageRgba} from './render.js';

export function angularDistance(a,b){
  const rad=Math.PI/180,d=(b.dec-a.dec)*rad,r=(b.ra-a.ra)*rad;
  const h=Math.sin(d/2)**2+Math.cos(a.dec*rad)*Math.cos(b.dec*rad)*Math.sin(r/2)**2;
  return 2*Math.asin(Math.sqrt(Math.max(0,Math.min(1,h))))/rad;
}

export function parseFootprint(text){
  if(typeof text!=='string'||text.length>16000)return null;
  const match=/^POLYGON\s+(?:ICRS\s+)?([\d.eE+\-\s]+)$/i.exec(text.trim());
  if(!match)return null;
  const values=match[1].trim().split(/\s+/).map(Number);
  if(values.length<6||values.length>512||values.length%2||!values.every(Number.isFinite))return null;
  const points=[];
  for(let i=0;i<values.length;i+=2){
    if(values[i]<0||values[i]>=360||Math.abs(values[i+1])>90)return null;
    points.push({ra:values[i],dec:values[i+1]});
  }
  return points;
}

export function coveragePaths(rows,center){
  const wcs=wcsFromHeader({CTYPE1:'RA---TAN',CTYPE2:'DEC--TAN',RADESYS:'ICRS',CRVAL1:center.ra,CRVAL2:center.dec,CRPIX1:1,CRPIX2:1,CDELT1:-1,CDELT2:-1});
  const polygons=rows.map(row=>parseFootprint(row.footprint)?.map(p=>worldToPixel(wcs,p.ra,p.dec))??null).map(p=>p?.every(v=>Number.isFinite(v.x)&&Number.isFinite(v.y))?p:null);
  const points=polygons.filter(Boolean).flat(),xs=[0,...points.map(p=>p.x)],ys=[0,...points.map(p=>p.y)];
  const xmin=Math.min(...xs),xmax=Math.max(...xs),ymin=Math.min(...ys),ymax=Math.max(...ys);
  const scale=Math.min(300/Math.max(.001,xmax-xmin),210/Math.max(.001,ymax-ymin));
  const project=p=>({x:180+(p.x-(xmin+xmax)/2)*scale,y:130+(p.y-(ymin+ymax)/2)*scale});
  return {paths:polygons.map(p=>p?p.map((v,i)=>{const at=project(v);return `${i?'L':'M'}${at.x.toFixed(3)},${at.y.toFixed(3)}`;}).join(' ')+' Z':null),target:project({x:0,y:0})};
}

export function inspectorFrame(buffer,hdu,plane,contrast=1){
  if(![.65,1,1.6].includes(contrast))throw Error('Contraste inválido');
  const hdus=inspectFits(buffer),frame=readFitsPlane(buffer,hdu,plane),entry=hdus[hdu];
  let quality=null,qualityNote='Este archivo no contiene una máscara FLAGS compatible.';
  const flags=hdus.filter(h=>h.name==='FLAGS');
  if(['IMAGE','PRIMARY'].includes(entry.name)&&flags.length===1){
    const flagsHdu=flags[0],dims=flagsHdu.dims;
    if(!flagsHdu.compressed&&dims[0]===frame.width&&dims[1]===frame.height&&(dims.length===2||dims.length===3&&dims[2]===frame.planes)){
      try{
        const flagNames={};
        for(const [key,value] of Object.entries(flagsHdu.header))if(/^MSKN\d{4}$/.test(key))flagNames[Number(key.slice(4))]=String(value).trim().toUpperCase();
        const flags=readFitsPlane(buffer,hdus.indexOf(flagsHdu),dims.length===3?plane:0).image;
        quality=buildQualityMask({...frame,flags,flagNames},{purpose:'display'});
        qualityNote=`${quality.maskedCount} píxeles señalados. No se cambian los valores originales.`;
      }catch(error){qualityNote=`Máscara no disponible: ${error.message}`;}
    }else qualityNote='FLAGS comprimidos o con dimensiones incompatibles; no se aplicó máscara.';
  }
  const rgba=imageRgba(frame.image,frame.width,frame.height,null,{contrast});
  return {...frame,rgba,quality:quality?.mask??null,qualityNote};
}
