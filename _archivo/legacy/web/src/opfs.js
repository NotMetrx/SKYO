/** Guardado explicito en almacenamiento privado del origen; no usa red. */
async function directory(){
  if(!navigator.storage?.getDirectory)throw Error('OPFS no disponible en este navegador/contexto');
  const root=await navigator.storage.getDirectory();
  return root.getDirectoryHandle('skyo-local-lab',{create:true});
}
export async function saveLocal(files,metadata){
  const dir=await directory();
  for(const [side,file] of Object.entries(files)){
    if(!file)throw Error(`Falta archivo ${side}`);
    const name=`epoca_${side}.fits`;
    const handle=await dir.getFileHandle(name,{create:true});
    const writer=await handle.createWritable();
    await writer.write(await file.arrayBuffer());
    await writer.close();
  }
  const h=await dir.getFileHandle('state.json',{create:true});
  const writer=await h.createWritable();
  await writer.write(JSON.stringify({saved_utc:new Date().toISOString(),metadata}));
  await writer.close();
}
export async function loadLocal(){
  const dir=await directory();
  const states=JSON.parse(await (await dir.getFileHandle('state.json')).getFile().then(f=>f.text()));
  const files={};
  for(const side of ['A','B']){
    const file=await (await dir.getFileHandle(`epoca_${side}.fits`)).getFile();
    const originalName=states.metadata?.filenames?.[side] || `epoca_${side}.fits`;
    files[side]=new File([file],originalName,{type:'application/fits'});
  }
  return {files,metadata:states.metadata||{},savedUtc:states.saved_utc};
}
