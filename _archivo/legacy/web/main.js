import {saveLocal,loadLocal} from './src/opfs.js';
const worker=new Worker(new URL('./worker.js',import.meta.url),{type:'module'});
const $=s=>document.querySelector(s);
const loaded={A:false,B:false};
let jobCounter=0;
const lastLoadJob={A:0,B:0};
let lastCompareJob=0;
const newJob=()=>++jobCounter;
let manifest=[],lastReport=null;
const selectedFiles={A:null,B:null};
function toast(message){const t=$('#toast');t.textContent=message;t.hidden=false;setTimeout(()=>{t.hidden=true;},5000);}
function render(canvas,rgba,width,height){
  canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d',{alpha:false});
  // FITS x=0,y=0 comienza en la parte inferior para vistas astronomicas.
  const img=new ImageData(rgba,width,height);
  const temp=document.createElement('canvas');temp.width=width;temp.height=height;
  temp.getContext('2d').putImageData(img,0,0);
  ctx.save();ctx.translate(0,height);ctx.scale(1,-1);ctx.drawImage(temp,0,0);ctx.restore();
}
function sendFile(side,file){
  if(!file)return;
  if(file.size>130*1024*1024){toast('Archivo grande. Usa recortes pequenos de IRSA, no un FITS completo.');return;}
  selectedFiles[side]=file;
  loaded[side]=false;lastCompareJob=0;$('#compare').disabled=true;lastReport=null;
  const jobId=newJob();lastLoadJob[side]=jobId;
  $('#save-local').disabled=!(selectedFiles.A&&selectedFiles.B);
  $(`#name-${side.toLowerCase()}`).textContent=file.name;
  file.arrayBuffer().then(async buffer=>{
    const meta=manifest.find(item=>item.local_file===file.name||item.filename===file.name)||null;
    if(meta?.sha256){
      if(!globalThis.crypto?.subtle)throw Error('SHA-256 requiere HTTPS o localhost para un contexto seguro');
      const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',buffer)),
        b=>b.toString(16).padStart(2,'0')).join('');
      if(hash.toLowerCase()!==String(meta.sha256).toLowerCase())
        throw Error('SHA-256 no coincide con el manifiesto; archivo rechazado');
    }
    worker.postMessage({event:'load',jobId,side,buffer,meta},[buffer]);
  }).catch(error=>toast(`Error al leer ${file.name}: ${error.message}`));
}
$('#file-a').addEventListener('change',e=>sendFile('A',e.target.files[0]));
$('#file-b').addEventListener('change',e=>sendFile('B',e.target.files[0]));
$('#manifest').addEventListener('change',async e=>{
  const file=e.target.files[0];if(!file)return;
  try{
    const parsed=JSON.parse(await file.text());
    if(!Array.isArray(parsed.items))throw Error('Se esperaba items: []');
    manifest=parsed.items;
    $('#manifest-state').textContent=`${manifest.length} observaciones registradas. Vuelve a cargar los FITS para aplicar metadatos.`;
  }catch(error){toast(`Manifiesto invalido: ${error.message}`);}
});
$('#load-demo').addEventListener('click',async()=>{
  try{
    const resources=await Promise.all(['A','B'].map(async side=>{
      const file=`./demo/epoca_${side}.fits`;
      const response=await fetch(file);
      if(!response.ok)throw Error(`Falta ${file}: ejecuta npm run demo:generate`);
      return [side,await response.arrayBuffer()];
    }));
    loaded.A=false;loaded.B=false;$('#compare').disabled=true;
    selectedFiles.A=null;selectedFiles.B=null;$('#save-local').disabled=true;
    for(const [side,buffer] of resources){
      $(`#name-${side.toLowerCase()}`).textContent=`Simulacion ${side} (no NASA)`;
      const jobId=newJob();lastLoadJob[side]=jobId;
      worker.postMessage({event:'load',jobId,side,buffer},[buffer]);
    }
  }catch(error){toast(error.message);}
});
$('#save-local').addEventListener('click',async()=>{
  try{await saveLocal(selectedFiles,{items:manifest,filenames:{A:selectedFiles.A.name,B:selectedFiles.B.name}});toast('Dos observaciones guardadas en OPFS, solo en este navegador.');}
  catch(err){toast('No se pudo guardar en OPFS: '+err.message);}
});
$('#load-local').addEventListener('click',async()=>{
  try{const cache=await loadLocal();manifest=cache.metadata.items||[];
    for(const side of ['A','B'])sendFile(side,cache.files[side]);
    toast('Se recuperaron observaciones guardadas localmente.');}
  catch(err){toast('No hay una pareja guardada o OPFS no esta disponible: '+err.message);}
});
$('#compare').addEventListener('click',()=>{
  if(loaded.A&&loaded.B){$('#compare').disabled=true;lastCompareJob=newJob();worker.postMessage({event:'compare',jobId:lastCompareJob});}
});
$('#save-report').addEventListener('click',()=>{
  if(!lastReport)return;
  const content=JSON.stringify(lastReport,null,2);
  const url=URL.createObjectURL(new Blob([content],{type:'application/json'}));
  const link=document.createElement('a');link.href=url;link.download='skyo_reporte_exploratorio.json';link.click();
  URL.revokeObjectURL(url);
});
function summaryText(data){
  const parts=[`${data.width} × ${data.height} px`,data.detector?`Detector D${data.detector}`:'Detector desconocido',
    `Fecha observada: ${data.observationTime}`];
  if(data.flagsCompressed)parts.push('FLAGS comprimidas, sin máscara científica');
  else parts.push(data.flagsAvailable?'FLAGS disponibles':'FLAGS ausentes');
  if(data.note)parts.push(data.note);
  if(String(data.origin).toUpperCase().includes('SKYO'))parts.push('DATOS SINTÉTICOS');
  return parts.join(' · ');
}
function showReport(info){
  const table=$('#result-table');table.replaceChildren();
  const entries=[
    ['Estado','Comparación exploratoria, NO detección confirmada'],
    ['Motor de cálculo',info.kernel],
    ['Cobertura válida',`${info.validCount} píxeles`],
    ['Fondo residual',`${Number(info.offset).toPrecision(5)} MJy/sr (si BUNIT corresponde)`],
    ['Modelo de fondo',`${info.background?.model||'No indicado'}; ${info.background?.method||'Sin metodo'}`],
    ['Calidad de píxeles',info.flagsReady?'Máscaras disponibles':'INCOMPLETA: falta FLAGS o mapa de bits'],
    ['Varianza',info.varianceReady?'Dos mapas presentes; propagación aproximada':'INCOMPLETA: faltan varianzas'],
    ['Compatibilidad espectral',info.spectral.reason],
    ['Resultado','No afirmar Planeta X, cometa o asteroide sin verificación']
  ];
  for(const [name,value] of entries){
    const row=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');
    dt.textContent=name;dd.textContent=value;row.append(dt,dd);table.append(row);
  }
  lastReport={schema_version:'0.1-prototype',created_utc:new Date().toISOString(),
    scientific_status:'exploratory_not_validated',...info,
    disclaimer:'Requiere validacion espectral WCS-WAVE por pixel, PSF, correlacion de ruido y catalogos externos.'};
  $('#save-report').disabled=false;
}
worker.addEventListener('message',({data})=>{
  if(data.event==='kernel'){$('#kernel-status').textContent=data.kernel;return;}
  if(data.event==='error'){
    if(data.operation==='load'&&data.jobId!==lastLoadJob[data.side])return;
    if(data.operation==='compare'&&data.jobId!==lastCompareJob)return;
    $('#compare').disabled=!(loaded.A&&loaded.B);toast(data.message);return;
  }
  if(data.event==='loaded'){
    const side=data.summary.side;
    if(data.jobId!==lastLoadJob[side])return;
    loaded[side]=true;
    render($(`#canvas-${side.toLowerCase()}`),data.rgba,data.summary.width,data.summary.height);
    $(`#hint-${side.toLowerCase()}`).hidden=true;
    $(`#meta-${side.toLowerCase()}`).textContent=summaryText(data.summary);
    $('#compare').disabled=!(loaded.A&&loaded.B);return;
  }
  if(data.event==='compared'){
    if(data.jobId!==lastCompareJob)return;
    render($('#canvas-difference'),data.rgba,data.info.width,data.info.height);
    $('#difference-placeholder').hidden=true;
    showReport(data.info);$('#compare').disabled=false;
  }
});

if(!import.meta.env?.DEV && "serviceWorker" in navigator && location.protocol!=="file:"){
  navigator.serviceWorker.register("./sw.js").catch(()=>{});
}
