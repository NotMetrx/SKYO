/** Guardado explicito en almacenamiento privado del origen; no usa red. */
async function directory(){
  if(!navigator.storage?.getDirectory)throw Error('OPFS no disponible en este navegador/contexto');
  const root=await navigator.storage.getDirectory();
  return root.getDirectoryHandle('skyo-local-lab',{create:true});
}
export async function saveLocal(files,metadata){
  if(!files?.A||!files?.B)throw Error('Faltan ambas observaciones (A y B) para guardar');
  const [bufA,bufB]=await Promise.all([files.A.arrayBuffer(),files.B.arrayBuffer()]);
  const dir=await directory();
  for(const [side,buffer] of [['A',bufA],['B',bufB]]){
    const name=`epoca_${side}.fits`;
    const handle=await dir.getFileHandle(name,{create:true});
    const writer=await handle.createWritable();
    try{
      await writer.write(buffer);
      await writer.close();
    }catch(err){
      await writer.abort?.().catch(()=>{});
      throw err;
    }
  }
  const h=await dir.getFileHandle('state.json',{create:true});
  const writer=await h.createWritable();
  try{
    await writer.write(JSON.stringify({saved_utc:new Date().toISOString(),metadata}));
    await writer.close();
  }catch(err){
    await writer.abort?.().catch(()=>{});
    throw err;
  }
}
export async function clearLocal(){
  const dir=await directory();
  for(const name of ['epoca_A.fits','epoca_B.fits','state.json']){
    await dir.removeEntry(name).catch(()=>{});
  }
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
