import {wcsFromHeader,pixelToWorld} from './science/wcs.js';
import {angularDistance} from './science/archive-data.js';

export function mountFitsInspector(send){
  const $=id=>document.getElementById(id),dialog=$('fits-inspector'),canvas=$('fits-image'),ctx=canvas.getContext('2d');
  const temp=document.createElement('canvas');
  let token=0,fileId=0,hdus=[],frame=null,wcs=null,points=[],measuring=false,pointer={x:0,y:0};
  function clear(){frame=null;wcs=null;points=[];canvas.hidden=true;canvas.width=temp.width=1;canvas.height=temp.height=1;$('fits-mask').disabled=true;$('fits-measure').disabled=true;$('fits-readout').textContent='';$('fits-measurement').textContent='';}
  function fit(){if(frame){const stage=canvas.parentElement,scale=Math.min(stage.clientWidth/frame.width,stage.clientHeight/frame.height);canvas.style.width=`${frame.width*scale}px`;canvas.style.height=`${frame.height*scale}px`;}}
  new ResizeObserver(fit).observe(canvas.parentElement);
  function paint(){
    if(!frame)return;
    const {width,height,rgba,quality}=frame;
    canvas.width=temp.width=width;canvas.height=temp.height=height;
    const pixels=new Uint8ClampedArray(rgba);
    if($('fits-mask').checked&&quality)for(let i=0;i<quality.length;i++)if(!quality[i]){pixels[i*4]=225;pixels[i*4+1]=29;pixels[i*4+2]=72;pixels[i*4+3]=255;}
    temp.getContext('2d').putImageData(new ImageData(pixels,width,height),0,0);
    ctx.save();ctx.translate(0,height);ctx.scale(1,-1);ctx.drawImage(temp,0,0);ctx.restore();
    ctx.strokeStyle='#7cc8ff';ctx.fillStyle='#7cc8ff';ctx.lineWidth=Math.max(1,width/350);
    if(points.length){ctx.beginPath();points.forEach((p,i)=>{const y=height-.5-p.y;if(i)ctx.lineTo(p.x+.5,y);else ctx.moveTo(p.x+.5,y);});ctx.stroke();}
    for(const p of points){ctx.beginPath();ctx.arc(p.x+.5,height-.5-p.y,Math.max(2,width/150),0,Math.PI*2);ctx.fill();}
    fit();
  }
  function header(index){
    const h=hdus[index];
    $('fits-header').textContent=h?.cards??'';
  }
  function render(){
    token=0;
    const hdu=Number($('fits-hdu').value),h=hdus[hdu];header(hdu);clear();
    if(!h||!['PRIMARY','IMAGE'].includes(h.xtension)||![2,3].includes(h.dims.length)||h.compressed){
      $('fits-status').textContent='Esta extensión no es una imagen compatible. Puedes consultar su cabecera.';return;
    }
    $('fits-status').textContent='Preparando imagen…';
    token=send({event:'inspect-render',fileId,hdu,plane:Number($('fits-plane').value)-1,contrast:Number($('fits-contrast').value)});
  }
  function planes(){
    const h=hdus[Number($('fits-hdu').value)],count=h?.dims.length===3?h.dims[2]:1;
    $('fits-plane-label').hidden=count<=1;$('fits-plane').max=count;$('fits-plane').value=1;$('fits-plane-count').textContent=`de ${count}`;
  }
  function probe(p,select=false){
    if(!frame)return;pointer=p;
    const value=frame.image[p.y*frame.width+p.x],at=wcs?pixelToWorld(wcs,p.x,p.y):null;
    $('fits-readout').textContent=`Píxel ${p.x+1}, ${p.y+1} (FITS) · ${Number.isFinite(value)?value.toPrecision(7):'sin dato'} ${frame.header.BUNIT??''}${at?` · ICRS ${at.ra.toFixed(6)}°, ${at.dec.toFixed(6)}°`:''}`;
    if(select&&measuring&&at){
      if(points.length===2)points=[];
      points.push({...p,...at});
      if(points.length===2){const deg=angularDistance(...points);$('fits-measurement').textContent=`Separación: ${deg.toFixed(6)}° · ${(deg*60).toFixed(3)}′ · ${(deg*3600).toFixed(2)}″`;}
      else $('fits-measurement').textContent='Ahora elige el segundo punto.';
      paint();
    }
  }
  function eventPixel(e){const r=canvas.getBoundingClientRect();return {x:Math.max(0,Math.min(frame.width-1,Math.floor((e.clientX-r.left)/r.width*frame.width))),y:Math.max(0,Math.min(frame.height-1,frame.height-1-Math.floor((e.clientY-r.top)/r.height*frame.height)))};}
  canvas.onpointermove=e=>{if(frame)probe(eventPixel(e));};
  canvas.onclick=e=>{if(frame)probe(eventPixel(e),true);};
  canvas.onkeydown=e=>{
    if(!frame)return;
    const step={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,1],ArrowDown:[0,-1]}[e.key];
    if(step){e.preventDefault();probe({x:Math.max(0,Math.min(frame.width-1,pointer.x+step[0])),y:Math.max(0,Math.min(frame.height-1,pointer.y+step[1]))});}
    if(e.key==='Enter'||e.key===' '){e.preventDefault();probe(pointer,true);}
  };
  $('fits-measure').onclick=()=>{measuring=!measuring;points=[];$('fits-measure').setAttribute('aria-pressed',String(measuring));$('fits-measurement').textContent=measuring?'Elige dos puntos en la imagen. También puedes usar flechas y Enter.':'';paint();if(measuring)canvas.focus();};
  $('fits-mask').onchange=paint;$('fits-contrast').onchange=render;
  $('fits-hdu').onchange=()=>{planes();render();};$('fits-plane').onchange=render;
  $('fits-close').onclick=()=>dialog.close();
  dialog.addEventListener('close',()=>{token=send({event:'inspect-close'});fileId=0;hdus=[];clear();});
  return {
    open(meta,bytes){
      clear();hdus=[];fileId=0;measuring=false;$('fits-measure').setAttribute('aria-pressed','false');$('fits-mask').checked=false;$('fits-details').open=false;
      $('fits-hdu').replaceChildren();$('fits-header').textContent='';$('fits-plane-label').hidden=true;$('fits-quality').textContent='';$('fits-coordinates').textContent='';
      $('fits-hash').textContent='';
      $('fits-title').textContent=meta.observation_id?`D${meta.detector} · ${meta.observation_id}`:meta.file??'Imagen FITS';
      $('fits-origin').textContent=`${meta.sourceKind??'USER-LOCAL'} · ${meta.release??'archivo local'} · ${meta.transform??'Lectura local sin modificar el FITS'}`;
      $('fits-status').textContent='Abriendo FITS…';$('fits-source').hidden=!meta.source_url;
      if(meta.source_url)$('fits-source').href=meta.source_url;
      if(!dialog.open)dialog.showModal();
      $('fits-contrast').disabled=true;
      token=send({event:'inspect-open',url:meta.url,sha256:meta.sha256,detector:meta.detector,observation:meta.sourceKind==='NASA-ORIGINAL'?meta.observation_id:undefined,bytes,contrast:Number($('fits-contrast').value)},bytes?[bytes]:[]);
    },
    receive(data){
      if(data.id!==token||!dialog.open)return;
      $('fits-contrast').disabled=false;
      if(data.error){clear();$('fits-status').textContent=`No se pudo abrir la imagen: ${data.error}. Vuelve a seleccionarla para reintentar.`;return;}
      fileId=data.fileId;frame=data;canvas.hidden=false;
      if(data.hdus){hdus=data.hdus;$('fits-hdu').replaceChildren(...hdus.map((h,i)=>{const option=document.createElement('option');option.value=i;option.textContent=`${i}: ${h.name||h.xtension} · ${h.dims.join(' × ')||'cabecera'}`;return option;}));$('fits-hdu').value=data.hdu;planes();}
      header(data.hdu);$('fits-plane').value=data.plane+1;
      try{wcs=wcsFromHeader(data.header);$('fits-coordinates').textContent='Coordenadas ICRS de la cabecera. La regla mide separación angular, no distancia física.';}catch{wcs=null;$('fits-coordinates').textContent='Sin WCS compatible: lectura por píxel; regla angular no disponible.';}
      $('fits-measure').disabled=!wcs;$('fits-mask').disabled=!data.quality;$('fits-quality').textContent=data.qualityNote;
      $('fits-status').textContent=`${data.width} × ${data.height} · ${hdus[data.hdu].name} · plano ${data.plane+1}/${data.planes}`;
      $('fits-hash').textContent=`SHA256 ${data.sha256}`;
      pointer={x:Math.floor(data.width/2),y:Math.floor(data.height/2)};paint();probe(pointer);
    },
    error(message){if(dialog.open){clear();$('fits-status').textContent=message;}}
  };
}
