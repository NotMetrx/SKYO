import {sha256} from './contracts.js';
/** Commit a complete generation, then atomically switch the pointer; never mix A/B. */
let queue=Promise.resolve();
function lock(fn){const run=()=>navigator.locks?.request?navigator.locks.request('skyo-local-lab',fn):fn();const result=queue.then(run,run);queue=result.catch(()=>{});return result;}
async function directory(create=true){
  if(!navigator.storage?.getDirectory)throw Error('OPFS no disponible en este navegador/contexto');
  return (await navigator.storage.getDirectory()).getDirectoryHandle('skyo-local-lab',{create});
}
async function write(dir,name,value){
  const writer=await (await dir.getFileHandle(name,{create:true})).createWritable();
  try{await writer.write(value);await writer.close();}
  catch(error){await writer.abort().catch(()=>{});throw error;}
}
async function readState(dir){const file=await (await dir.getFileHandle('state.json')).getFile();if(file.size>2*1024*1024)throw Error('Estado local demasiado grande');return JSON.parse(await file.text());}
export async function saveLocal(files,metadata){return lock(async()=>{
  for(const side of ['A','B'])if(!files[side]||files[side].size<1||files[side].size>130*1024*1024)throw Error(`Falta archivo válido ${side}`);
  const encoded=JSON.stringify(metadata);if(encoded.length>1024*1024)throw Error('Metadatos de guardado demasiado grandes');
  const estimate=await navigator.storage.estimate?.();
  if(estimate&&Number.isFinite(estimate.quota)&&Number.isFinite(estimate.usage)&&estimate.quota-estimate.usage<files.A.size+files.B.size+encoded.length+4096)throw Error('No hay espacio/cuota suficiente para guardar una copia completa');
  const dir=await directory(),generation='pair-'+crypto.randomUUID();
  const previous=await readState(dir).catch(()=>null);
  const pending=await dir.getDirectoryHandle(generation,{create:true});
  try{
    const records={};
    for(const side of ['A','B']){
      const buffer=await files[side].arrayBuffer();
      if(buffer.byteLength!==files[side].size)throw Error('El archivo cambió durante el guardado');
      records[side]={fileName:files[side].name,size:buffer.byteLength,sha256:await sha256(buffer)};
      await write(pending,side+'.fits',buffer);
    }
    const state={schemaVersion:'skyo-local-pair-1',generation,saved_utc:new Date().toISOString(),files:records,metadata};
    await write(dir,'state.json',JSON.stringify(state));
    const warnings=[];
    // shortcut: without Web Locks, cross-tab saves may leave an unused generation; explicit erase reclaims it.
    const oldNames=previous?.schemaVersion==='skyo-local-pair-1'&&/^pair-[a-f0-9-]{36}$/.test(previous.generation)?[previous.generation]:previous?['epoca_A.fits','epoca_B.fits']:[];
    for(const name of oldNames){
      try{await dir.removeEntry(name,{recursive:true});}catch(error){if(error.name!=='NotFoundError')warnings.push('No se pudo limpiar una copia anterior: '+error.message);}
    }
    return {warnings};
  }catch(error){
    const active=await readState(dir).catch(()=>null);
    if(active?.generation!==generation)await dir.removeEntry(generation,{recursive:true}).catch(()=>{});
    throw error;
  }
});}
export async function loadLocal(){return lock(async()=>{
  const dir=await directory(false),state=await readState(dir),legacy=state.schemaVersion!== 'skyo-local-pair-1';
  if(legacy&&(!state.metadata||!state.saved_utc))throw Error('Guardado local no reconocido');
  if(!legacy&&!/^pair-[a-f0-9-]{36}$/.test(state.generation))throw Error('Identidad de guardado inválida');
  const source=legacy?dir:await dir.getDirectoryHandle(state.generation),files={};
  for(const side of ['A','B']){
    const file=await (await source.getFileHandle(legacy?`epoca_${side}.fits`:side+'.fits')).getFile();
    if(file.size<1||file.size>130*1024*1024)throw Error('Archivo local fuera de límite');
    const buffer=await file.arrayBuffer(),record=state.files?.[side];
    if(!legacy&&(!record||record.size!==buffer.byteLength||record.sha256!==await sha256(buffer)||typeof record.fileName!=='string'))throw Error('Pareja local incompleta o hash incorrecto; conserva los originales y vuelve a guardar');
    files[side]=new File([buffer],legacy?(state.metadata.filenames?.[side]||`epoca_${side}.fits`):record.fileName,{type:'application/fits'});
  }
  return {files,metadata:state.metadata??{},savedUtc:state.saved_utc,legacy};
});}
export async function clearLocal(){return lock(async()=>{
  if(!navigator.storage?.getDirectory)throw Error('OPFS no disponible en este navegador/contexto');
  const root=await navigator.storage.getDirectory();
  try{await root.removeEntry('skyo-local-lab',{recursive:true});}catch(error){if(error.name!=='NotFoundError')throw error;}
});}
