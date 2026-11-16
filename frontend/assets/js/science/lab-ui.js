import {createLabSession} from './session.js';
import {saveLocal,loadLocal,clearLocal} from './opfs.js';
import {CURATED_DATASETS} from './datasets.js';
import {playUiCue} from '../sound.js';
import {triggerKryoGesture} from '../hera3d.js';
/** Both entries share the selection, verification and export path; only DOM IDs differ. */
export function mountLab({integrated=false,onNotify=()=>{},onAdd=()=>{}}={}){
  const ids=integrated?{demo:'lab-load-demo',compare:'lab-compare-btn',save:'lab-save-report',store:'lab-save-local',restore:'lab-load-local',manifest:'manifest-lab',manifestState:'manifest-lab-state',kernel:'lab-kernel-status',table:'lab-report-table',diff:'canvas-lab-difference',placeholder:'lab-diff-placeholder',toast:'lab-toast',add:'lab-add-bitacora'}:
    {demo:'load-demo',compare:'compare',save:'save-report',store:'save-local',restore:'load-local',manifest:'manifest',manifestState:'manifest-state',kernel:'kernel-status',table:'result-table',diff:'canvas-difference',placeholder:'difference-placeholder',toast:'toast'};
  const el=name=>document.getElementById(ids[name]);
  const realButton=document.getElementById(integrated?'lab-load-real':'load-real');
  const realRegion=document.getElementById(integrated?'lab-real-region':'real-region');
  const mapView=document.getElementById(integrated?'lab-render-view':'render-view');
  const blink=document.getElementById(integrated?'lab-blink-manual':'blink-manual');
  const timeSummary=document.getElementById(integrated?'lab-time-summary':'time-summary');
  const datasetId='m101-visual-v2',dataset=CURATED_DATASETS[datasetId];
  realRegion.replaceChildren(...dataset.regions.map(region=>{const option=document.createElement('option');option.value=region.id;option.textContent=region.label;return option;}));
  const sideEl=(name,side)=>document.getElementById(integrated?({file:`file-lab-${side}`,name:`lab-name-${side}`,canvas:`canvas-lab-${side}`,hint:`hint-lab-${side}`,meta:`meta-lab-${side}`})[name]:`${name}-${side}`);
  let timer;
  function notify(message){const toast=el('toast');toast.textContent=message;toast.hidden=false;clearTimeout(timer);timer=setTimeout(()=>{toast.hidden=true;},5000);onNotify(message);}
  function clearCanvas(canvas){canvas.getContext('2d').clearRect(0,0,canvas.width,canvas.height);}
  const kernelLabel=value=>value.replace(/ sha256:[a-f0-9]+$/,'');
  function rows(entries){el('table').replaceChildren(...entries.map(([name,value])=>{
    const row=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=name;dd.textContent=value;row.append(dt,dd);return row;
  }));}
  function render(canvas,rgba,width,height){
    canvas.width=width;canvas.height=height;const temp=document.createElement('canvas');temp.width=width;temp.height=height;
    temp.getContext('2d').putImageData(new ImageData(rgba,width,height),0,0);
    const ctx=canvas.getContext('2d');ctx.save();ctx.translate(0,height);ctx.scale(1,-1);ctx.drawImage(temp,0,0);ctx.restore();
  }
  const session=createLabSession({
    createWorker:()=>new Worker(new URL('./worker.js',import.meta.url),{type:'module'}),
    onChange(state){
      const ready=!!state.observations.A&&!!state.observations.B;
      mapView.disabled=!ready;blink.disabled=!ready;
      const analysis=state.report?.schemaVersion==='skyo-analysis-1';
      for(const option of mapView.options)if(['difference','snr'].includes(option.value))option.disabled=!analysis;
      if(!analysis&&['difference','snr'].includes(mapView.value))mapView.value='A';
      timeSummary.textContent=ready?`${state.observations.A.sourceKind==='SYNTHETIC'?'Tiempos simulados':'Tiempo nativo'} · A: ${state.observations.A.nativeObservedTime??'no registrado'} · B: ${state.observations.B.nativeObservedTime??'no registrado'} · escala no verificada`:'Tiempo · selecciona ambas observaciones';
      el('compare').disabled=!ready||state.comparing;el('store').disabled=!ready;
      el('save').disabled=!state.report;
      const diagnostic=state.report?.schemaVersion==='skyo-diagnostic-1';
      el('save').textContent=diagnostic?'Descargar diagnóstico JSON ↓':'Descargar informe JSON ↓';
      if(el('add'))el('add').disabled=!state.report||diagnostic;
      el('manifestState').textContent=ready&&['A','B'].every(side=>state.observations[side].sourceKind==='NASA-DERIVED')?'Paquete incluido: origen NASA-DERIVED y hashes verificados; ciencia no validada.':state.manifest.items.length?`${state.manifest.items.length} entradas declaradas. Integridad verificable; origen no autenticado.`:'Sin manifiesto verificado. Los archivos manuales se identifican como USER-LOCAL.';
      for(const side of ['A','B']){
        const key=side.toLowerCase(),observation=state.observations[side];
        sideEl('name',key).textContent=state.files[side]?.name??'Seleccionar .fits';
        if(!state.files[side])sideEl('file',key).value='';
        if(!observation){clearCanvas(sideEl('canvas',key));sideEl('hint',key).hidden=false;sideEl('meta',key).textContent='Pendiente de lectura e integridad';}
      }
      if(!state.report||diagnostic){
        clearCanvas(el('diff'));el('placeholder').hidden=false;
        rows(diagnostic?[['Diagnóstico',state.report.error.message],['Operación',state.report.error.operation],['Estado','No hay un análisis vigente exportable.']]:[['Estado',state.comparing?'Calculando el par vigente…':'Selecciona y compara ambas observaciones.']]);
      }
    },
    onMessage(data){
      if(data.event==='kernel'){el('kernel').textContent=kernelLabel(data.kernel);return;}
      if(data.event==='error'){notify(data.message);return;}
      if(data.event==='rendered'){
        render(el('diff'),data.rgba,data.width,data.height);el('placeholder').hidden=true;
        el('diff').setAttribute('aria-label',data.target==='snr'?'SNR aproximado sin significancia calibrada':`Vista ${data.target}`);return;
      }
      if(data.event==='loaded'){
        const observation=data.summary.observation,key=data.side.toLowerCase();
        render(sideEl('canvas',key),data.rgba,observation.width,observation.height);sideEl('hint',key).hidden=true;
        sideEl('meta',key).textContent=`${observation.width} × ${observation.height} px · ${observation.sourceKind} · ${observation.nativeObservedTime??'Fecha no verificada'} · SHA-256 ${observation.sha256.slice(0,12)}…`;
      }
      if(data.event==='compared'){
        const report=data.report;render(el('diff'),data.rgba,data.info.width,data.info.height);el('placeholder').hidden=true;mapView.value='difference';
        el('kernel').textContent=kernelLabel(report.kernelVersion);
        rows([['Estado',report.control.identicalInputs?'Control negativo: entradas idénticas':'Comparación exploratoria; no es una detección validada'],['Observaciones',report.observations.map(o=>`${o.fileName} (${o.sourceKind})`).join(' / ')],['Motor',kernelLabel(report.kernelVersion)],['Cobertura válida',`${report.validPixels} píxeles`],['Fondo',`${report.background.method}: ${report.background.offset} · ZODI ${report.background.zodiApplied?'restado':'no restado'}`],['Compatibilidad espectral',report.spectralCompatibility.reason],['Incertidumbre','Significancia no calibrada; PSF y covarianza pendientes'],['Procedencia',report.observations.map(o=>o.provenanceTrust).join(' / ')]]);
        playUiCue('mission');
        triggerKryoGesture('Found_PlanetX',{duration:1.65});
        document.dispatchEvent(new CustomEvent('skyo:hera-focus',{detail:{target:`#${ids.diff}`,preferredSide:'left',durationMs:7000}}));
        notify('Sustracción diferencial TAN-SIP completada localmente: los residuos positivos muestran posibles cambios entre épocas, sujetos a verificación de PSF y JPL.');
      }
    }
  });
  for(const side of ['A','B'])sideEl('file',side.toLowerCase()).onchange=event=>session.load(side,event.target.files[0]);
  el('manifest').onchange=event=>{const file=event.target.files[0];if(file)session.setManifest(file);};
  el('demo').onclick=()=>{
    notify('Cargando demo sintética; no son observaciones NASA.');
    return session.loadPair(async()=>{
      const files={};
      await Promise.all(['A','B'].map(async side=>{
        const response=await fetch(`./data/sample-fits/epoca_${side}.fits`);
        if(!response.ok)throw Error(`No se pudo cargar la demo ${side}`);
        files[side]=new File([await response.arrayBuffer()],`epoca_${side}.fits`,{type:'application/fits'});
      }));
      return {files};
    },{mode:'demo'});
  };
  el('compare').onclick=()=>session.compare();
  mapView.onchange=()=>session.render(mapView.value);
  blink.onclick=()=>{mapView.value=mapView.value==='A'?'B':'A';session.render(mapView.value);};
  function loadReal(){
    const region=dataset.regions.find(item=>item.id===realRegion.value);
    return session.loadPair(async()=>{
      const files={};
      await Promise.all(['A','B'].map(async side=>{
        const name=region.files[side],response=await fetch(`./datasets/${datasetId}/${name}`);
        if(!response.ok)throw Error(`No se pudo abrir la región real ${side}`);
        files[side]=new File([await response.arrayBuffer()],name,{type:'application/fits'});
      }));
      return {files,manifest:dataset};
    },{mode:'curated',datasetId});
  }
  realButton.onclick=loadReal;realRegion.onchange=loadReal;
  el('store').onclick=async()=>{
    const state=session.state;
    try{const result=await saveLocal(state.files,{items:state.manifest.items,demo:state.observations.A.sourceKind==='SYNTHETIC'&&state.observations.B.sourceKind==='SYNTHETIC',filenames:{A:state.files.A.name,B:state.files.B.name}});notify(result.warnings.length?'Pareja guardada; no se pudo limpiar una copia anterior.':'Pareja guardada localmente.');}
    catch(error){notify(`No se pudo guardar en OPFS: ${error.message}`);}
  };
  el('restore').onclick=()=>session.loadPair(async()=>{
    const cache=await loadLocal();return {files:cache.files,demo:cache.metadata.demo===true,manifest:{schema_version:'skyo-curated-0.1',items:cache.metadata.items??[]}};
  });
  document.getElementById(integrated?'lab-clear-local':'clear-local').onclick=async()=>{
    try{await clearLocal();notify('Copia guardada eliminada.');}catch(error){notify('No se pudo borrar: '+error.message);}
  };
  el('save').onclick=()=>{
    const report=session.report;if(!report)return;
    const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));
    const link=document.createElement('a');link.href=url;link.download=report.schemaVersion==='skyo-analysis-1'?'skyo_reporte_exploratorio.json':'skyo_diagnostico.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  if(el('add'))el('add').onclick=()=>{
    const report=session.report;if(report?.schemaVersion!=='skyo-analysis-1')return;
    onAdd({name:'Comparación FITS exploratoria',type:'Comparación sin validar',status:'Exploratorio',sourceKind:report.observations.every(o=>o.sourceKind==='NASA-DERIVED')?'NASA-DERIVED':report.observations.every(o=>o.sourceKind==='SYNTHETIC')?'SYNTHETIC':'USER-LOCAL',epoch:report.observations.map(o=>o.fileName).join(' / '),coords:`${report.validPixels} píxeles válidos`,motion:'Sin identificación de fuente ni significancia calibrada',date:new Date().toLocaleDateString('es-ES'),analysisId:report.analysisId,snapshot:report.snapshot});
    notify('Comparación exploratoria registrada en la bitácora.');
  };
  return session;
}
