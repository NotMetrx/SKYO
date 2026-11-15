import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createLabSession} from '../../frontend/assets/js/science/session.js';
import {parseFits} from '../../frontend/assets/js/science/fits.js';
import {observationFromFits,analysisReport,sha256} from '../../frontend/assets/js/science/contracts.js';

const buffers=Object.fromEntries(await Promise.all(['A','B'].map(async side=>[side,new Uint8Array(await fs.readFile(new URL(`../../data/sample-fits/epoca_${side}.fits`,import.meta.url))).buffer])));
const observations={};
for(const side of ['A','B'])observations[side]=observationFromFits(parseFits(buffers[side]),{fileName:`epoca_${side}.fits`,digest:await sha256(buffers[side]),bytes:buffers[side].byteLength});
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
const file=side=>new File([buffers[side]],`epoca_${side}.fits`);
class WorkerDouble {
  messages=[];listeners={};terminated=false;
  addEventListener(event,callback){this.listeners[event]=callback;}
  postMessage(message){this.messages.push(message);}
  terminate(){this.terminated=true;}
  emit(data){this.listeners.message({data});}
  loaded(message){this.emit({event:'loaded',side:message.side,version:message.version,jobId:message.jobId,summary:{observation:{...observations[message.observation.fileName.includes('_B')?'B':'A'],fileName:message.observation.fileName}}});}
}
function setup(t){
  const workers=[],events=[];
  const session=createLabSession({createWorker:()=>{const w=new WorkerDouble();workers.push(w);return w;},onMessage:data=>events.push(data)});
  t.after(()=>session.dispose());return {session,workers,events};
}
async function ready(session,worker){
  for(const side of ['A','B']){await session.load(side,file(side));worker.loaded(worker.messages.at(-1));}
}
function reportFor(request){return analysisReport({observations,snapshot:request.snapshot,kernel:'test JavaScript',maskBits:{A:0,B:0},result:{validCount:40,spectral:{verified:false,reason:'Prueba sintética'},flagsReady:true,varianceReady:true,background:{model:'no-zodi-plus-residual',method:'robust-plane',offset:0,zodiApplied:false,gradientX:0,gradientY:0},notes:[]}});}

for(const side of ['A','B'])test(`Selección ${side}: lectura 3→1 y hash tardío no sustituyen el archivo vigente`,async t=>{
  const {session,workers}=setup(t),slow=deferred();
  const first=session.load(side,{name:'viejo.fits',size:1,arrayBuffer:()=>slow.promise});
  await session.load(side,file('B'));
  slow.resolve(buffers.A.slice(0));await first;
  assert.deepEqual(workers[0].messages.filter(m=>m.event==='load').map(m=>m.observation.fileName),['epoca_B.fits']);
  const entered=deferred(),release=deferred(),digest=crypto.subtle.digest.bind(crypto.subtle);
  let delay=true;
  t.mock.method(crypto.subtle,'digest',async(...args)=>{const result=await digest(...args);if(delay){delay=false;entered.resolve();await release.promise;}return result;});
  const old=session.load(side,file('A'));await entered.promise;
  await session.load(side,file('B'));release.resolve();await old;
  assert.equal(workers[0].messages.filter(m=>m.event==='load').length,2);
  assert.equal(session.state.files[side].name,'epoca_B.fits');
});
test('Resultados viejos, incluso con jobId actual, no llegan a la vista ni al export',async t=>{
  const {session,workers,events}=setup(t);
  session.clear();const worker=workers[0];await ready(session,worker);
  session.compare();const first=worker.messages.at(-1),report=reportFor(first);
  worker.emit({event:'compared',jobId:first.jobId,snapshot:first.snapshot,report});
  assert.equal(session.report.analysisId,report.analysisId);
  const original=session.state.files.A;
  assert.equal((await original.arrayBuffer()).byteLength,buffers.A.byteLength);
  const pending=deferred();const load=session.load('A',{name:'epoca_A.fits',size:buffers.A.byteLength,arrayBuffer:()=>pending.promise});
  assert.equal(session.report,null);
  worker.emit({event:'compared',jobId:first.jobId,snapshot:first.snapshot,report});
  assert.equal(session.report,null);
  pending.resolve(buffers.A.slice(0));await load;worker.loaded(worker.messages.at(-1));
  session.compare();const current=worker.messages.at(-1);
  worker.emit({event:'compared',jobId:current.jobId,snapshot:first.snapshot,report});
  assert.equal(session.report,null);
  assert.equal(events.filter(e=>e.event==='compared').length,1);
  const valid=reportFor(current);worker.emit({event:'compared',jobId:current.jobId,snapshot:current.snapshot,report:valid});
  assert.equal(session.report.analysisId,valid.analysisId);
});
test('Un fallo de entrada exporta diagnóstico con B null y nunca el análisis anterior',async t=>{
  const {session,workers}=setup(t);session.clear();await session.load('A',file('A'));
  workers[0].loaded(workers[0].messages.at(-1));
  await session.load('B',{name:'roto.fits',size:1,arrayBuffer:async()=>{throw Error('Lectura interrumpida');}});
  assert.equal(session.report.schemaVersion,'skyo-diagnostic-1');
  assert.equal(session.report.observations[0].fileName,'epoca_A.fits');
  assert.equal(session.report.observations[1],null);
  assert.equal(session.report.snapshot.hashes.B,null);
});
test('Demo ignora manifiesto manual previo y una pareja tardía se descarta',async t=>{
  const {session,workers}=setup(t);
  await session.setManifest(new File([JSON.stringify({schema_version:'skyo-curated-0.1',items:[{local_file:'epoca_A.fits',sha256:'0'.repeat(64)}]})],'manifest.json'));
  const pending=deferred(),old=session.loadPair(()=>pending.promise,{mode:'demo'});
  await session.load('A',file('B'));pending.resolve({files:{A:file('A'),B:file('B')}});await old;
  assert.equal(workers[0].messages.filter(m=>m.event==='load').length,1);
  await session.loadPair(async()=>({files:{A:file('A'),B:file('B')}}),{mode:'demo'});
  assert.equal(workers[0].messages.filter(m=>m.event==='load').length,3);
  assert.deepEqual(session.state.manifest.items,[]);
});
test('Worker terminado no modifica la sesión nueva y comparar maneja fallo de envío',async t=>{
  const {session,workers}=setup(t);session.clear();const old=workers[0];await ready(session,old);
  old.listeners.error({preventDefault(){}});assert.equal(old.terminated,true);
  assert.equal(session.report.error.operation,'worker');
  await session.load('A',file('A'));const current=workers[1];current.loaded(current.messages.at(-1));
  await session.load('B',file('B'));current.loaded(current.messages.at(-1));
  old.emit({event:'error',operation:'protocol',message:'Error de instancia antigua'});
  assert.equal(session.report,null);
  current.postMessage=()=>{throw Error('Canal cerrado');};
  assert.doesNotThrow(()=>session.compare());
  assert.equal(session.report.schemaVersion,'skyo-diagnostic-1');
  assert.equal(session.state.comparing,false);
});
test('Render de otro snapshot no modifica la vista ni su informe',async t=>{
  const {session,workers,events}=setup(t);session.clear();const worker=workers[0];await ready(session,worker);
  session.render('A');const request=worker.messages.at(-1);
  assert.equal(request.event,'render');
  worker.emit({event:'rendered',jobId:request.jobId,snapshot:request.snapshot,target:'A'});
  assert.equal(events.at(-1).event,'rendered');
  await session.load('A',file('B'));
  worker.emit({event:'rendered',jobId:request.jobId,snapshot:request.snapshot,target:'A'});
  worker.emit({event:'error',operation:'render',jobId:request.jobId,message:'Render viejo'});
  assert.equal(events.filter(e=>e.event==='rendered').length,1);assert.equal(session.report,null);
});
