import {saveLocal,loadLocal} from './opfs.js';
import {renderState,clearState,showToast} from '../ui-states.js';
const worker=new Worker(new URL('./worker.js',import.meta.url),{type:'module'});
const $=s=>document.querySelector(s);
const loaded={A:false,B:false};
const loadingSide={A:false,B:false};
const loadJobIds={A:0,B:0};
let compareJobId=0;
let isComparing=false;
let manifest=[],lastReport=null;
const selectedFiles={A:null,B:null};
function toast(message,state='ok'){showToast($('#toast'),message,state,5000);}
async function sha256Hex(buffer){
  if(!globalThis.crypto?.subtle)return null;
  const digest=await globalThis.crypto.subtle.digest('SHA-256',buffer);
  return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
}
function showEmptySlot(side){
  renderState($(`#hint-${side.toLowerCase()}`),{
    state:'empty',
    title:`Sin datos FITS · Época ${side}`,
    detail:'Selecciona un .fits o carga la simulación.',
    actionLabel:'Elegir archivo',
    onAction:()=>$('#file-'+side.toLowerCase())?.click()
  });
}
function showEmptyDiff(){
  renderState($('#difference-placeholder'),{
    state:'empty',
    title:'Sin comparación WCS',
    detail:'Carga dos épocas para alinear por WCS TAN-SIP y restar imágenes.',
    actionLabel:'Cargar simulación',
    onAction:()=>$('#load-demo')?.click()
  });
}
function resetReportTable(){
  const table=$('#result-table');
  if(!table)return;
  table.replaceChildren();
  const rows=[
    ['Estado','Sin análisis'],
    ['Calidad','No evaluada'],
    ['Comparación espectral','No evaluada']
  ];
  for(const [name,value] of rows){
    const row=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');
    dt.textContent=name;dd.textContent=value;row.append(dt,dd);table.append(row);
  }
}
function invalidateComparison(){
  compareJobId++;
  isComparing=false;
  lastReport=null;
  $('#save-report').disabled=true;
  const diffCanvas=$('#canvas-difference');
  if(diffCanvas){diffCanvas.getContext('2d')?.clearRect(0,0,diffCanvas.width,diffCanvas.height);}
  showEmptyDiff();
  resetReportTable();
}
showEmptySlot('A');showEmptySlot('B');showEmptyDiff();
$('#kernel-status').dataset.state='loading';
function render(canvas,rgba,width,height){
  canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d',{alpha:false});
  // FITS x=0,y=0 comienza en la parte inferior para vistas astronomicas.
  const flipped=new Uint8ClampedArray(width*height*4);
  const rowBytes=width*4;
  for(let y=0;y<height;y++)flipped.set(rgba.subarray(y*rowBytes,(y+1)*rowBytes),(height-1-y)*rowBytes);
  ctx.putImageData(new ImageData(flipped,width,height),0,0);
}
function sendFile(side,file){
  if(!file)return;
  if(file.size>130*1024*1024){toast('Archivo grande. Usa recortes pequenos de IRSA, no un FITS completo.','error');return;}
  const jobId=++loadJobIds[side];
  selectedFiles[side]=file;
  loaded[side]=false;loadingSide[side]=true;$('#compare').disabled=true;invalidateComparison();
  $('#save-local').disabled=!(selectedFiles.A&&selectedFiles.B);
  $(`#name-${side.toLowerCase()}`).textContent=file.name;
  renderState($(`#hint-${side.toLowerCase()}`),{
    state:'loading',
    title:`Cargando Época ${side}…`,
    detail:`Decodificando ${file.name}`
  });
  file.arrayBuffer().then(async buffer=>{
    if(jobId!==loadJobIds[side])return;
    const rawMeta=manifest.find(item=>item.local_file===file.name||item.filename===file.name)||null;
    const hash=await sha256Hex(buffer);
    if(rawMeta?.sha256){
      if(!hash)throw Error('SHA-256 no disponible: abre SKYO en HTTPS o localhost');
      if(hash.toLowerCase()!==String(rawMeta.sha256).toLowerCase())
        throw Error('SHA-256 no coincide con el manifiesto; archivo rechazado');
    }
    if(jobId!==loadJobIds[side])return;
    const meta={...(rawMeta||{}),local_file:rawMeta?.local_file||file.name,...(hash?{sha256:hash}:{})};
    worker.postMessage({event:'load',side,jobId,buffer,meta},[buffer]);
  }).catch(error=>{
    if(jobId!==loadJobIds[side])return;
    loadingSide[side]=false;
    renderState($(`#hint-${side.toLowerCase()}`),{state:'error',title:`Error en Época ${side}`,detail:error.message});
    toast(`Error al leer ${file.name}: ${error.message}`,'error');
  });
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
  const jobA=++loadJobIds.A,jobB=++loadJobIds.B;
  try{
    loaded.A=false;loaded.B=false;$('#compare').disabled=true;
    selectedFiles.A=null;selectedFiles.B=null;$('#save-local').disabled=true;
    invalidateComparison();
    loadingSide.A=true;loadingSide.B=true;
    for(const s of ['A','B'])renderState($(`#hint-${s.toLowerCase()}`),{state:'loading',title:`Cargando simulación ${s}…`,detail:'Preparando FITS sintético SPHEREx'});
    const resources=await Promise.all(['A','B'].map(async side=>{
      const file=`./data/sample-fits/epoca_${side}.fits`;
      const response=await fetch(file);
      if(!response.ok)throw Error(`Falta ${file}: ejecuta npm run demo:generate`);
      const buffer=await response.arrayBuffer();
      const hash=await sha256Hex(buffer);
      return [side,buffer,hash];
    }));
    for(const [side,buffer,hash] of resources){
      const jobId=side==='A'?jobA:jobB;
      if(jobId!==loadJobIds[side])continue;
      $(`#name-${side.toLowerCase()}`).textContent=`Simulacion ${side} (no NASA)`;
      worker.postMessage({event:'load',side,jobId,buffer,meta:{local_file:`epoca_${side}.fits`,...(hash?{sha256:hash}:{})}},[buffer]);
    }
  }catch(error){
    if(jobA===loadJobIds.A)loadingSide.A=false;
    if(jobB===loadJobIds.B)loadingSide.B=false;
    for(const s of ['A','B'])renderState($(`#hint-${s.toLowerCase()}`),{state:'error',title:'Error cargando simulación',detail:error.message,actionLabel:'Reintentar',onAction:()=>$('#load-demo').click()});
    toast(error.message,'error');
  }
});
$('#save-local').addEventListener('click',async()=>{
  try{await saveLocal(selectedFiles,{items:manifest,filenames:{A:selectedFiles.A.name,B:selectedFiles.B.name}});toast('Dos observaciones guardadas en OPFS, solo en este navegador.','ok');}
  catch(err){toast('No se pudo guardar en OPFS: '+err.message,'error');}
});
$('#load-local').addEventListener('click',async()=>{
  try{const cache=await loadLocal();manifest=cache.metadata.items||[];
    for(const side of ['A','B'])sendFile(side,cache.files[side]);
    toast('Se recuperaron observaciones guardadas localmente.','ok');}
  catch(err){toast('No hay una pareja guardada o OPFS no esta disponible: '+err.message,'empty');}
});
$('#compare').addEventListener('click',()=>{
  if(loaded.A&&loaded.B){
    const jobId=++compareJobId;
    isComparing=true;$('#compare').disabled=true;
    renderState($('#difference-placeholder'),{state:'loading',title:'Alineando WCS TAN-SIP…',detail:'Restando imágenes en Web Worker'});
    worker.postMessage({event:'compare',jobId});
  }
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
  if(data.version)parts.push(`VERSION ${data.version}`);
  if(data.hasEpsf)parts.push('EPSF');
  if(data.flagsCompressed)parts.push('FLAGS comprimidas, sin máscara científica');
  else parts.push(data.flagsAvailable?'FLAGS disponibles':'FLAGS ausentes');
  if(data.provenanceLabel)parts.push(data.provenanceLabel);
  if(data.note)parts.push(data.note);
  return parts.join(' · ');
}
function showReport(info){
  const table=$('#result-table');table.replaceChildren();
  const entries=[
    ['Estado','Comparación exploratoria, NO detección confirmada'],
    ['Motor de cálculo',info.kernel],
    ['Cobertura válida',`${info.validCount} píxeles`],
    ['Fondo diferencial',`${Number(info.offset).toPrecision(5)} MJy/sr (si BUNIT corresponde)`],
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
  if(data.event==='kernel'){$('#kernel-status').textContent=data.kernel;$('#kernel-status').dataset.state='ok';return;}
  if(data.event==='error'){
    if(data.eventType==='compare'&&data.jobId!==compareJobId)return;
    if(data.eventType==='load'&&data.side&&data.jobId!==loadJobIds[data.side])return;
    $('#compare').disabled=!(loaded.A&&loaded.B);
    if(isComparing&&data.eventType==='compare'){isComparing=false;renderState($('#difference-placeholder'),{state:'error',title:'Error en comparación',detail:data.message});}
    else{const sides=data.side?[data.side]:['A','B'];for(const s of sides){if(loadingSide[s]){loadingSide[s]=false;renderState($(`#hint-${s.toLowerCase()}`),{state:'error',title:`Error Época ${s}`,detail:data.message});}}}
    toast(data.message,'error');return;
  }
  if(data.event==='loaded'){
    const side=data.summary.side;
    if(data.jobId!==loadJobIds[side])return;
    loadingSide[side]=false;loaded[side]=true;
    render($(`#canvas-${side.toLowerCase()}`),data.rgba,data.summary.width,data.summary.height);
    clearState($(`#hint-${side.toLowerCase()}`));
    $(`#meta-${side.toLowerCase()}`).textContent=summaryText(data.summary);
    $('#compare').disabled=!(loaded.A&&loaded.B);return;
  }
  if(data.event==='compared'){
    if(data.jobId!==compareJobId)return;
    const snap=data.info?.snapshot;
    if(snap&&(snap.jobA!==loadJobIds.A||snap.jobB!==loadJobIds.B))return;
    isComparing=false;
    render($('#canvas-difference'),data.rgba,data.info.width,data.info.height);
    clearState($('#difference-placeholder'));
    showReport(data.info);$('#compare').disabled=false;
  }
});

if("serviceWorker" in navigator && location.protocol!=="file:"){
  navigator.serviceWorker.register("./sw.js").catch(()=>{});
}
