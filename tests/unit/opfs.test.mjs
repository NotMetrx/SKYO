import test from 'node:test';
import assert from 'node:assert/strict';
import * as opfs from '../../frontend/assets/js/science/opfs.js';
const {saveLocal,loadLocal,clearLocal}=opfs;
function storage(t){
  const state={fail:null,quota:1000000},root={children:new Map()};
  function dir(node){return {
    async getDirectoryHandle(name,{create=false}={}){if(!node.children.has(name)){if(!create)throw new DOMException('Missing','NotFoundError');node.children.set(name,{children:new Map()});}return dir(node.children.get(name));},
    async getFileHandle(name,{create=false}={}){if(!node.children.has(name)){if(!create)throw new DOMException('Missing','NotFoundError');node.children.set(name,{data:new Uint8Array()});}const file=node.children.get(name);return {
      async getFile(){return new File([file.data],name);},
      async createWritable(){let pending;return {async write(value){if(state.fail===name||(state.fail==='B.fits'&&name==='epoca_B.fits'))throw new DOMException('Quota','QuotaExceededError');pending=new Uint8Array(await new Blob([value]).arrayBuffer());},async close(){if(state.fail==='close:'+name)throw Error('Commit interrumpido');file.data=pending;},async abort(){}};}
    };},
    async removeEntry(name){if(!node.children.delete(name))throw new DOMException('Missing','NotFoundError');},
    async *keys(){yield*node.children.keys();}
  };}
  const previous=Object.getOwnPropertyDescriptor(globalThis,'navigator');
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{storage:{getDirectory:async()=>dir(root),estimate:async()=>({quota:state.quota,usage:0})}}});
  state.root=dir(root);t.after(()=>Object.defineProperty(globalThis,'navigator',previous));return state;
}
const pair=value=>({A:new File(['A'+value],'original-A.fits'),B:new File(['B'+value],'original-B.fits')});
test('OPFS: fallo de segundo archivo y commit preservan la pareja anterior',async t=>{
  const state=storage(t);await saveLocal(pair('1'),{filenames:{A:'original-A.fits',B:'original-B.fits'}});
  state.fail='B.fits';await assert.rejects(saveLocal(pair('2'),{}));state.fail=null;
  assert.equal(await (await loadLocal()).files.A.text(),'A1');assert.equal(await (await loadLocal()).files.B.text(),'B1');
  state.fail='close:state.json';await assert.rejects(saveLocal(pair('3'),{}));state.fail=null;
  assert.equal(await (await loadLocal()).files.A.text(),'A1');
});
test('OPFS: cuota insuficiente y borrado explícito son recuperables',async t=>{
  const state=storage(t);await saveLocal(pair('1'),{});state.quota=1;
  await assert.rejects(saveLocal(pair('2'),{}),/espacio|cuota/i);
  assert.equal(await (await loadLocal()).files.A.text(),'A1');
  await clearLocal();await assert.rejects(loadLocal());
});
test('OPFS: hash corrupto rechaza la pareja completa y guarda sesiones concurrentes coherentes',async t=>{
  const state=storage(t);
  await Promise.all([saveLocal(pair('1'),{}),saveLocal(pair('2'),{})]);
  const restored=await loadLocal();assert.equal(await restored.files.A.text(),'A2');assert.equal(await restored.files.B.text(),'B2');
  const dir=await state.root.getDirectoryHandle('skyo-local-lab'),record=JSON.parse(await (await (await dir.getFileHandle('state.json')).getFile()).text());
  const generation=await dir.getDirectoryHandle(record.generation),writer=await (await generation.getFileHandle('B.fits')).createWritable();
  await writer.write('xx');await writer.close();
  await assert.rejects(loadLocal(),/hash incorrecto/);
});
test('OPFS: recupera el formato anterior con nombres originales',async t=>{
  const state=storage(t),dir=await state.root.getDirectoryHandle('skyo-local-lab',{create:true});
  for(const [name,value] of Object.entries({'epoca_A.fits':'oldA','epoca_B.fits':'oldB','state.json':JSON.stringify({saved_utc:new Date().toISOString(),metadata:{filenames:{A:'real-A.fits',B:'real-B.fits'}}})})){
    const writer=await (await dir.getFileHandle(name,{create:true})).createWritable();await writer.write(value);await writer.close();
  }
  const restored=await loadLocal();assert.equal(restored.legacy,true);assert.equal(restored.files.A.name,'real-A.fits');assert.equal(await restored.files.B.text(),'oldB');
});
