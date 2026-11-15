import {skyDirection} from './sky-math.js';

export function createInspector(T,{getReport,wake}){
  const panel=document.getElementById('selection-panel'),list=document.getElementById('selection-data'),status=document.getElementById('selection-status'),link=document.getElementById('selection-source'),marker=document.getElementById('selection-marker');
  const point3=new T.Vector3(),projected=new T.Vector3();let point=null,report=null,loading=false;
  function render(){
    list.replaceChildren();if(!report)return;
    const s=report.source,l2=s?.type==='L2-observation';
    const rows=[['Coordenadas ICRS',`RA ${point.ra.toFixed(6)}° · Dec ${point.dec.toFixed(6)}°`],['Imagen',s?(l2?'Observación L2 original':'Mosaico HiPS · IMAGE FITS'):'Pendiente de lectura FITS'],['Canal / detector',`${report.channelIndex0+1}/102 · D${Math.floor(report.channelIndex0/17)+1}`],['Longitud de onda',`${report.wavelengthUm.toFixed(5)} µm${l2?' · real por píxel':' · nominal'}`],['Ancho de banda',l2?`${s.bandwidth.toFixed(5)} µm`:'No disponible para este mosaico'],['Flujo',report.flux==null?'Sin dato':`${report.flux.toPrecision(7)} ${report.units}`],['Píxel (base 0)',s?l2?`${s.x}, ${s.y}`:`${report.pixel.x}, ${report.pixel.y} · tesela ${report.pixel.pixel}`:'—'],['Fecha UTC',s?l2?s.date:`${s.primary['DATE-BEG']} → ${s.primary['DATE-END']} · intervalo del mosaico`:'—']];
    if(l2)rows.push(['Observación',s.observation],['Release / versión',`${s.release} · ${s.version}`]);
    if(s)rows.push(['SHA256',l2?s.sha256:s.planeSha256]);
    for(const [label,value] of rows){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;list.append(dt,dd);}
    link.hidden=!s;if(s)link.href=l2?s.sourceUrl:s.url;
    link.textContent=l2?'Abrir recorte FITS original ↗':'Abrir cubo FITS original (archivo grande) ↗';
  }
  const api={
    select(value){point={...value};report=getReport(point);loading=!report.source;panel.hidden=false;document.body.classList.add('selection-open');point3.fromArray(skyDirection(point.ra,point.dec,1000));status.textContent=report.source?'Punto fijado. Puedes mover la cámara.':'Consultando el píxel seleccionado…';render();wake();},
    refresh(){if(!point||!loading||report?.source)return;const next=getReport(point);if(next.source){report=next;loading=false;status.textContent='Punto fijado. Puedes mover la cámara.';render();}},
    error(message){if(point&&!report?.source){loading=false;status.textContent=message;}},
    clear(){point=null;report=null;loading=false;panel.hidden=true;marker.hidden=true;document.body.classList.remove('selection-open');},
    update(camera,vr){if(!point||vr){marker.hidden=true;return;}projected.copy(point3).project(camera);marker.hidden=projected.z< -1||projected.z>1||Math.abs(projected.x)>1||Math.abs(projected.y)>1;if(!marker.hidden){marker.style.left=`${(projected.x+1)*50}%`;marker.style.top=`${(1-projected.y)*50}%`;}},
    get pending(){return loading;},
    get point(){return point;}
  };
  document.getElementById('selection-close').onclick=()=>{api.clear();document.getElementById('sky').focus();wake();};
  document.getElementById('selection-copy').onclick=async()=>{if(!point)return;try{await navigator.clipboard.writeText(`${point.ra.toFixed(8)}, ${point.dec.toFixed(8)}`);status.textContent='Coordenadas copiadas.';}catch{status.textContent='No se pudo copiar; selecciona las coordenadas de la ficha.';}};
  document.getElementById('selection-save').onclick=()=>{if(!report)return;const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='skyo-punto-seleccionado.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  return api;
}
