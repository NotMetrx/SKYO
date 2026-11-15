import {sha256,readManifest,makeSnapshot,sameSnapshot,validateReport,validateObservation,diagnosticReport} from './contracts.js';
/** One selection state for both laboratory UIs; original Files stay outside the Worker. */
export function createLabSession({createWorker,onChange=()=>{},onMessage=()=>{}}){
  let worker=null,job=0,compareJob=0,renderJob=0,manifestRevision=0;
  const versions={A:0,B:0},loadJobs={A:0,B:0},hashes={A:null,B:null};
  const files={A:null,B:null},observations={A:null,B:null};
  let report=null,comparing=false,manifest={schema_version:'skyo-curated-0.1',items:[]};
  const currentSnapshot=()=>makeSnapshot(versions,observations);
  const state=()=>({versions:{...versions},files:{...files},observations:{...observations},report:report?structuredClone(report):null,comparing,manifest:structuredClone(manifest)});
  const emit=()=>onChange(state());
  function fail(operation,error){report=diagnosticReport(operation,error,observations,currentSnapshot());comparing=false;emit();onMessage({event:'error',operation,message:String(error.message||error)});}
  function getWorker(){
    if(worker)return worker;
    const instance=worker=createWorker();
    worker.addEventListener('message',({data})=>{
      if(worker!==instance)return;
      try {
        if(data.event==='kernel'){onMessage(data);return;}
        if(data.event==='loaded'){
          const side=data.side;
          if(!['A','B'].includes(side)||data.version!==versions[side]||data.jobId!==loadJobs[side])return;
          if(data.summary?.observation?.sha256!==hashes[side])throw Error('Respuesta Worker con hash distinto de la selección');
          validateObservation(data.summary.observation);
          observations[side]=data.summary.observation;
          if(report&&!sameSnapshot(report.snapshot,currentSnapshot()))report=null;
          emit();onMessage(data);return;
        }
        if(data.event==='compared'){
          if(data.jobId!==compareJob||!sameSnapshot(data.snapshot,currentSnapshot()))return;
          validateReport(data.report);
          if(!sameSnapshot(data.report.snapshot,currentSnapshot()))throw Error('Reporte de otro snapshot');
          report=data.report;comparing=false;compareJob=0;emit();onMessage(data);return;
        }
        if(data.event==='rendered'){
          if(data.jobId===renderJob&&sameSnapshot(data.snapshot,currentSnapshot()))onMessage(data);
          return;
        }
        if(data.event==='error'){
          if(data.operation==='load'&&(data.version!==versions[data.side]||data.jobId!==loadJobs[data.side]))return;
          if(data.operation==='compare'&&data.jobId!==compareJob)return;
          if(data.operation==='render'&&data.jobId!==renderJob)return;
          if(data.operation==='load')observations[data.side]=null;
          fail(data.operation,Error(data.message));
        }
      }catch(error){fail('protocol',error);}
    });
    worker.addEventListener('error',event=>{
      if(worker!==instance)return;
      event.preventDefault?.();worker?.terminate();worker=null;
      for(const side of ['A','B']){versions[side]++;files[side]=null;observations[side]=null;hashes[side]=null;}
      compareJob=0;fail('worker',Error('El Worker falló. Vuelve a seleccionar los archivos.'));
    });
    return worker;
  }
  function begin(side,file=null){
    versions[side]++;files[side]=file;observations[side]=null;hashes[side]=null;report=null;comparing=false;compareJob=0;renderJob=0;
    loadJobs[side]=++job;emit();
    try {getWorker().postMessage({event:'clear',side,version:versions[side],jobId:job});}
    catch(error){fail('worker',error);}
    return versions[side];
  }
  async function ingest(side,file,version,mode,datasetId=null){
    const valid=()=>version===versions[side];
    try {
      if(!valid())return;
      if(!file||file.size>130*1024*1024)throw Error('Archivo ausente o superior a 130 MB; utiliza un recorte FITS.');
      const meta=manifest.items.find(item=>(item.local_file||item.filename)===file.name)??{};
      const buffer=await file.arrayBuffer();if(!valid())return;
      const digest=await sha256(buffer);if(!valid())return;
      if(meta.sha256&&meta.sha256!==digest)throw Error('SHA-256 no coincide con el manifiesto; archivo rechazado');
      files[side]=file;hashes[side]=digest;loadJobs[side]=++job;
      getWorker().postMessage({event:'load',side,jobId:job,version,buffer,meta,mode,datasetId,observation:{fileName:file.name,sha256:digest}},[buffer]);
    }catch(error){if(valid()){observations[side]=null;fail('load',error);}}
  }
  const api={
    get state(){return state();},
    get report(){return report&&sameSnapshot(report.snapshot,currentSnapshot())?structuredClone(validateReport(report)):null;},
    load(side,file){if(!file)return;manifestRevision++;const version=begin(side,file);return ingest(side,file,version,'manual');},
    async loadPair(loader,{mode='manual',datasetId=null}={}){
      manifestRevision++;
      if(mode==='demo')manifest={schema_version:'skyo-curated-0.1',items:[]};
      const selected={A:begin('A'),B:begin('B')};
      const valid=()=>['A','B'].every(side=>selected[side]===versions[side]);
      try {
        const pair=await loader();if(!valid())return;
        const pairMode=pair.demo===true&&mode==='manual'?'demo':mode;
        if(pairMode==='demo')manifest={schema_version:'skyo-curated-0.1',items:[]};
        else if(pair.manifest)manifest=readManifest(pair.manifest);
        await Promise.all(['A','B'].map(side=>ingest(side,pair.files[side],selected[side],pairMode,datasetId)));
      }catch(error){if(valid())fail('load-pair',error);}
    },
    async setManifest(file){
      const revision=++manifestRevision;begin('A');begin('B');manifest={schema_version:'skyo-curated-0.1',items:[]};emit();
      try {
        if(file.size>1024*1024)throw Error('Manifiesto superior a 1 MB');
        const text=await file.text();if(revision!==manifestRevision)return;
        manifest=readManifest(JSON.parse(text));emit();
      }catch(error){if(revision===manifestRevision)fail('manifest',error);}
    },
    compare(){
      if(!observations.A||!observations.B||comparing)return;
      report=null;comparing=true;compareJob=++job;renderJob=0;emit();
      try {getWorker().postMessage({event:'compare',jobId:job,snapshot:currentSnapshot()});}
      catch(error){fail('compare',error);}
    },
    render(target){
      if(['A','B'].includes(target)?!observations[target]:!['difference','snr'].includes(target)||report?.schemaVersion!=='skyo-analysis-1')return;
      renderJob=++job;
      try{getWorker().postMessage({event:'render',jobId:job,target,snapshot:currentSnapshot()});}
      catch(error){fail('render',error);}
    },
    clear(){manifestRevision++;begin('A');begin('B');},
    dispose(){worker?.terminate();worker=null;manifestRevision++;versions.A++;versions.B++;report=null;}
  };
  emit();return api;
}
