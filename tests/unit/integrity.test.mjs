import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {Worker} from 'node:worker_threads';
import {createHash} from 'node:crypto';
import {PARAMETERS} from '../../frontend/assets/js/science/contracts.js';
import {parseFits} from '../../frontend/assets/js/science/fits.js';
import {buildComparison} from '../../frontend/assets/js/science/pipeline.js';
const fixture=async side=>new Uint8Array(await fs.readFile(new URL(`../../data/sample-fits/epoca_${side}.fits`,import.meta.url))).buffer;
async function run(messages,t){
  const worker=new Worker(new URL('./worker-test-host.mjs',import.meta.url));
  t.after(()=>worker.terminate());
  const responses=[];
  worker.on('message',message=>responses.push(message));
  await new Promise(resolve=>worker.once('message',resolve));
  const hashes={A:null,B:null},latest={A:0,B:0};
  for(const message of messages){
    if(['load','clear'].includes(message.event)&&message.version>=latest[message.side]){
      latest[message.side]=message.version;
      hashes[message.side]=message.event==='load'?createHash('sha256').update(new Uint8Array(message.buffer)).digest('hex'):null;
    }
    if(message.event==='compare')message.snapshot={versions:message.versions,hashes:{...hashes},parameters:{...PARAMETERS}};
    worker.postMessage(message);
  }
  await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(Error('Worker no respondió a la comparación')),15000);
    worker.on('message',message=>{if(message.jobId===9 || ['compared','error'].includes(message.event)){clearTimeout(timer);resolve();}});
  });
  return responses;
}
test('Worker rechaza load3→load1 y compara el par vigente',async t=>{
  const a=await fixture('A'),b=await fixture('B');
  const responses=await run([
    {event:'load',jobId:3,version:3,side:'A',buffer:a,observation:{fileName:'actual-A.fits'}},
    {event:'load',jobId:1,version:1,side:'A',buffer:b,observation:{fileName:'antiguo-A.fits'}},
    {event:'load',jobId:4,version:4,side:'B',buffer:b,observation:{fileName:'actual-B.fits'}},
    {event:'compare',jobId:9,versions:{A:3,B:4}}
  ],t);
  const compared=responses.find(r=>r.event==='compared');
  assert.ok(compared,'La comparación vigente debe estar disponible');
  assert.equal(compared.info.offset,buildComparison(parseFits(a),parseFits(b)).offset);
});
test('Worker clear invalida entradas y resultado anterior',async t=>{
  const a=await fixture('A'),b=await fixture('B');
  const responses=await run([
    {event:'load',jobId:1,version:1,side:'A',buffer:a,observation:{fileName:'A.fits'}},
    {event:'load',jobId:2,version:1,side:'B',buffer:b,observation:{fileName:'B.fits'}},
    {event:'clear',jobId:5,side:'A',version:2},
    {event:'compare',jobId:9,versions:{A:2,B:1}}
  ],t);
  assert.ok(responses.some(r=>r.event==='error'&&r.jobId===9),'No puede compararse después de vaciar A');
});
async function loadRequest(meta={},observation={fileName:'local.fits'}) {
  const worker=new Worker(new URL('./worker-test-host.mjs',import.meta.url));
  try {
    await new Promise(resolve=>worker.once('message',resolve));
    return await new Promise(async(resolve,reject)=>{
      worker.on('error',reject);worker.on('message',m=>{if(m.event!=='kernel')resolve(m);});
      worker.postMessage({event:'load',jobId:1,version:1,side:'A',buffer:await fixture('A'),meta,observation});
    });
  } finally {await worker.terminate();}
}
test('Worker rechaza hash declarado incorrecto',async()=>{
  assert.equal((await loadRequest({sha256:'0'.repeat(64)})).event,'error');
});
test('Worker rechaza metadatos corruptos en la frontera',async()=>{
  assert.equal((await loadRequest({detector:'dos',source_url:'javascript:alert(1)'})).event,'error');
});
test('Subir un FITS con ORIGIN SKYO no lo convierte en demo',async()=>{
  const loaded=await loadRequest();
  assert.equal(loaded.summary?.observation?.sourceKind,'USER-LOCAL');
});
test('Metadatos NASA declarados se preservan sin autenticar el manifiesto del usuario',async()=>{
  const loaded=await loadRequest({source_release:'DR1',source_url:'https://irsa.ipac.caltech.edu/example.fits',provenance_note:'Archivo derivado localmente'});
  assert.equal(loaded.summary?.observation?.sourceKind,'USER-LOCAL');
  assert.equal(loaded.summary?.observation?.declaredProvenance?.dataRelease,'DR1');
});
test('Reporte único conserva ambos archivos y rechaza campos incompletos o no finitos',async t=>{
  const a=await fixture('A'),b=await fixture('B');
  const responses=await run([
    {event:'load',jobId:1,version:1,side:'A',buffer:a,observation:{fileName:'original-A.fits'}},
    {event:'load',jobId:2,version:1,side:'B',buffer:b,observation:{fileName:'original-B.fits'}},
    {event:'compare',jobId:9,versions:{A:1,B:1}}
  ],t);
  const report=responses.find(r=>r.event==='compared')?.report;
  assert.equal(report?.schemaVersion,'skyo-analysis-1');
  assert.deepEqual(report.observations.map(o=>o.fileName),['original-A.fits','original-B.fits']);
  assert.equal(report.uncertainty.significanceCalibrated,false);
  assert.equal(report.background.zodiApplied,true);
  const {validateReport}=await import('../../frontend/assets/js/science/contracts.js');
  assert.deepEqual(validateReport(JSON.parse(JSON.stringify(report))),report);
  const bad=structuredClone(report);delete bad.observations[0].fileName;
  assert.throws(()=>validateReport(bad),/Archivo|fileName/);
  const nan=structuredClone(report);nan.background.offset=NaN;
  assert.throws(()=>validateReport(nan),/finito/);
});
