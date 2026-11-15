/** Runtime boundary shared by the UI and Worker; manifests assert integrity, not authenticity. */
import {curatedObservation,curatedRegion} from './datasets.js';
export const SOFTWARE_VERSION='2.1.0-dev';
export const PARAMETERS=Object.freeze({background:'robust-plane',resampling:'bilinear',zodiPolicy:'both-maps-or-none'});
export const DEMO_HASHES=Object.freeze({A:'4c9904a170bd0d6b8e619679357bff7be315c78f8b15651436bef6bad9896c42',B:'089752b8a34586068e0f820288b6e3016fc9dec114300add8a80525ba4faadb1'});
const kinds=['NASA-ORIGINAL','NASA-DERIVED','USER-LOCAL','SYNTHETIC'];
const statuses=['exploratory','candidate-unverified','catalog-matched','discarded'];
const hashPattern=/^[a-f0-9]{64}$/i;
function check(condition,message){if(!condition)throw Error(message);}
function text(value,name){check(typeof value==='string'&&value.length>0&&value.length<=2048,`${name} inválido`);return value;}
function optional(value,validate){return value==null?null:validate(value);}
function number(value,name,min=-Infinity,max=Infinity){check(typeof value==='number'&&Number.isFinite(value)&&value>=min&&value<=max,`${name} inválido`);return value;}
function hash(value){check(typeof value==='string'&&hashPattern.test(value),'SHA-256 inválido');return value.toLowerCase();}
function url(value){const parsed=new URL(text(value,'URL'));check(parsed.protocol==='https:'&&!parsed.username&&!parsed.password,'La procedencia requiere URL HTTPS sin credenciales');return parsed.href;}
function date(value){text(value,'Fecha');check(/^\d{4}-\d\d-\d\dT/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value.slice(0,10)+'T00:00:00Z').toISOString().slice(0,10)===value.slice(0,10),'Fecha inválida');return value;}
export function validateMetadata(value){
  check(value&&typeof value==='object'&&!Array.isArray(value),'Metadatos inválidos');
  const out={};
  for(const key of ['local_file','original_file','filename','observation_id','plane_id','obsid','dataset_id','collection','processing_version','metadata_processing_version','curator_version','provenance_note','wavelength_quality','bandpass','units','time_scale']) if(value[key]!=null) out[key]=text(value[key],key);
  for(const key of ['sha256','source_sha256','parent_sha256']) if(value[key]!=null)out[key]=hash(value[key]);
  for(const key of ['source_url','parent_mef_url']) if(value[key]!=null)out[key]=url(value[key]);
  for(const key of ['observation_utc','retrieved_utc']) if(value[key]!=null)out[key]=date(value[key]);
  if(value.source_release!=null){check(['DR1','QR3'].includes(value.source_release),'Release no soportado');out.source_release=value.source_release;}
  if(value.sourceKind!=null){check(kinds.includes(value.sourceKind),'sourceKind inválido');out.sourceKind=value.sourceKind;}
  for(const [key,min,max] of [['detector',1,6],['bytes',1,130*1024*1024],['finast',0,Infinity],['ra_deg',0,360],['dec_deg',-90,90],['wavelength_um',Number.MIN_VALUE,Infinity],['bandwidth_um',Number.MIN_VALUE,Infinity],['mjd',0,Infinity],['mjd_start',0,Infinity],['mjd_mid',0,Infinity],['mjd_end',0,Infinity],['size_deg',Number.MIN_VALUE,180],['psf_fwhm_arcsec',Number.MIN_VALUE,Infinity]]) {
    if(value[key]!=null)out[key]=number(value[key],key,min,max);
  }
  if(out.detector!=null)check(Number.isInteger(out.detector),'Detector no entero');
  for(const key of ['has_variance','has_uncompressed_flags']) if(value[key]!=null){check(typeof value[key]==='boolean',`${key} inválido`);out[key]=value[key];}
  for(const key of ['available_hdus','omitted_hdus'])if(value[key]!=null){check(Array.isArray(value[key])&&value[key].length<=64,`${key} inválido`);out[key]=value[key].map(item=>text(item,key));}
  for(const key of ['native_time_cards','metadata_time_bounds','missing_reasons'])if(value[key]!=null){
    check(typeof value[key]==='object'&&!Array.isArray(value[key])&&Object.keys(value[key]).length<=64,`${key} inválido`);
    out[key]=Object.fromEntries(Object.entries(value[key]).map(([name,item])=>[text(name,key),item===null?null:typeof item==='number'?number(item,name):text(item,name)]));
  }
  if(value.epsf!=null){check(Number.isSafeInteger(value.epsf.rows)&&value.epsf.rows>0&&Array.isArray(value.epsf.columns),'EPSF inválida');out.epsf={rows:value.epsf.rows,columns:value.epsf.columns.map(item=>text(item,'Columna EPSF'))};}
  if(value.transforms!=null){check(Array.isArray(value.transforms)&&value.transforms.length<=64,'Transformaciones inválidas');out.transforms=value.transforms.map(item=>({software:text(item.software,'Software'),operation:text(item.operation,'Transformación')}));}
  return out;
}
export function readManifest(value){
  check(value&&typeof value==='object'&&value.schema_version==='skyo-curated-0.1'&&Array.isArray(value.items)&&value.items.length<=1000,'Se esperaba manifiesto skyo-curated-0.1 con items[]');
  const items=value.items.map(validateMetadata),names=new Set();
  for(const item of items){const name=item.local_file||item.filename;text(name,'Nombre de archivo');check(!names.has(name),'Nombre de archivo duplicado en manifiesto');names.add(name);}
  return {schema_version:'skyo-curated-0.1',items};
}
export async function sha256(buffer){
  check(buffer instanceof ArrayBuffer,'Se esperaba ArrayBuffer FITS');
  check(globalThis.crypto?.subtle,'SHA-256 no disponible; usa HTTPS o localhost');
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',buffer)),b=>b.toString(16).padStart(2,'0')).join('');
}
export function makeSnapshot(versions,observations){return {versions:{...versions},hashes:{A:observations.A?.sha256??null,B:observations.B?.sha256??null},parameters:{...PARAMETERS}};}
export function sameSnapshot(a,b){return !!a&&!!b&&['A','B'].every(side=>a.versions?.[side]===b.versions?.[side]&&a.hashes?.[side]===b.hashes?.[side])&&JSON.stringify(a.parameters)===JSON.stringify(b.parameters);}
export function observationFromFits(fit,{fileName,digest,bytes,meta={},mode='manual',side,datasetId=null}){
  const trusted=mode==='demo'?null:curatedObservation(datasetId,digest);
  if(trusted)check(trusted.bytes===bytes,'Tamaño distinto del paquete registrado');
  if(mode==='curated')check(trusted&&trusted.bytes===bytes&&trusted.local_file===fileName,'Archivo no incluido en el paquete curado registrado');
  const declared=validateMetadata(trusted??meta);
  if(declared.sha256)check(declared.sha256===digest,'SHA-256 no coincide con el manifiesto');
  if(declared.detector!=null&&fit.detector!=null)check(declared.detector===fit.detector,'Detector del manifiesto distinto del FITS');
  if(!trusted&&(declared.local_file||declared.filename))check((declared.local_file||declared.filename)===fileName,'Manifiesto de otro archivo');
  const synthetic=mode==='demo';
  if(synthetic)check(DEMO_HASHES[side]===digest,'La demo no coincide con sus bytes registrados');
  const warnings=['Calibraciones científicas y precisión absoluta no verificadas.'];
  if(fit.flagsCompressed)warnings.push('FLAGS comprimidas no decodificadas: usa un derivado del curador; no se consideran FLAGS=0.');
  if(fit.header.FINAST===1)warnings.push('FINAST=1: solución astrométrica parcial; no habilita ciencia de candidatos.');
  if(synthetic)warnings.push('Los tiempos de esta demostración son simulados.');
  if(trusted?.omitted_hdus?.length)warnings.push(`HDU omitidas del perfil visual: ${trusted.omitted_hdus.join(', ')}; referencias originales conservadas.`);
  if(Object.keys(declared).length&&!trusted)warnings.push('Manifiesto aportado por el usuario: integridad verificable, procedencia no autenticada.');
  const finite=value=>typeof value==='number'&&Number.isFinite(value)?value:null;
  const header=Object.fromEntries(Object.entries(fit.header).filter(([key])=>/^(CTYPE[12]|CUNIT[12]|RADESYS|EQUINOX|CRVAL[12]|CRPIX[12]|CDELT[12]|(?:CD|PC)[12]_[12]|[AB]P?_(?:ORDER|\d+_\d+))$/.test(key)));
  return {id:`sha256:${digest}`,datasetId:trusted?.dataset_id??null,fileName:text(fileName,'Archivo'),sha256:hash(digest),bytes,
    sourceKind:trusted?'NASA-DERIVED':synthetic?'SYNTHETIC':'USER-LOCAL',provenanceTrust:trusted?'verified-source':synthetic?'bundled-demo':Object.keys(declared).length?'unverified-user-manifest':'user-local',
    dataRelease:trusted?.source_release??null,collection:trusted?.collection??null,observationId:trusted?.observation_id??null,planeId:trusted?.plane_id??null,sourceUrl:trusted?.source_url??null,parentMefUrl:trusted?.parent_mef_url??null,sourceSha256:trusted?.source_sha256??null,parentSha256:trusted?.parent_sha256??null,retrievedUtc:trusted?.retrieved_utc??null,processingVersion:trusted?.processing_version??null,curatorVersion:trusted?.curator_version??null,
    observedUtc:trusted?.observation_utc??(synthetic?fit.observationTime:null),nativeObservedTime:fit.observationTime,timeScale:trusted?.time_scale??null,mjdStart:trusted?.mjd_start??null,mjdEnd:trusted?.mjd_end??null,mjdMid:trusted?.mjd_mid??null,
    detector:Number.isInteger(fit.detector)&&fit.detector>=1&&fit.detector<=6?fit.detector:null,
    width:fit.width,height:fit.height,units:fit.header.BUNIT??null,center:{raDeg:finite(fit.header.CRVAL1),decDeg:finite(fit.header.CRVAL2)},footprint:null,wcs:header,detectorTransform:null,
    lambdaCenterUm:declared.wavelength_um??finite(fit.wavelengthUm),bandwidthUm:declared.bandwidth_um??finite(fit.bandwidthUm),spectralFidelity:'visual-unverified',
    spectralCalibrationId:null,spectralCalibrationVersion:null,spectralCalibrationUrl:null,spectralCalibrationHash:null,
    quality:'visual-only',wcsSpatialVerified:false,wavelengthMapVerified:false,maskPolicyId:'skyo-mask-v2',maskPolicyVersion:2,
    nativeMetadata:{processingVersion:fit.headerPrimary.VERSION??null,origin:fit.origin,finast:fit.header.FINAST??null,timeCards:Object.fromEntries(['DATE-OBS','MJD-OBS','MJD-BEG','MJD-END','MJD-AVG','TIMESYS','TIMEUNIT','TREFPOS'].map(key=>[key,fit.header[key]??fit.headerPrimary[key]??null]))},
    flagsDefinitions:{...fit.flagNames},flagsAvailable:!!fit.flags,varianceAvailable:!!fit.variance,availableHdus:fit.hdus.map(hdu=>hdu.name),omittedHdus:trusted?.omitted_hdus??[],
    transforms:trusted?.transforms??[],manifestVersion:Object.keys(declared).length?'skyo-curated-0.1':null,
    declaredProvenance:{...declared,dataRelease:declared.source_release??null},
    missingReasons:{provenance:trusted?'Hash del MEF completo no obtenido; cadena y hash del recorte fuente conservados.':'No hay cadena autenticada del proveedor en esta carga local.',timeScale:'No verificada.',calibrations:'No cargadas ni verificadas.',footprint:'No calculado en el Worker; consultar pair-selection del paquete.',omittedHdus:trusted?.missing_reasons?.epsf??'Ninguna HDU omitida de los bytes del archivo; inventario no implica decodificación de tablas.'},warnings};
}
function jsonValues(value){
  if(typeof value==='number')check(Number.isFinite(value),'El reporte contiene un número no finito');
  else if(Array.isArray(value))value.forEach(jsonValues);
  else if(value&&typeof value==='object')Object.values(value).forEach(jsonValues);
  else check(value===null||['string','boolean'].includes(typeof value),'Valor no JSON en reporte');
}
export function validateObservation(observation){
  check(observation&&typeof observation==='object'&&!Array.isArray(observation),'Observación inválida');
  for(const key of ['id','datasetId','fileName','sha256','bytes','sourceKind','provenanceTrust','dataRelease','collection','observationId','planeId','sourceUrl','parentMefUrl','sourceSha256','parentSha256','retrievedUtc','processingVersion','curatorVersion','observedUtc','timeScale','mjdStart','mjdEnd','mjdMid','detector','width','height','units','center','footprint','wcs','detectorTransform','lambdaCenterUm','bandwidthUm','spectralCalibrationId','spectralCalibrationVersion','spectralCalibrationUrl','spectralCalibrationHash','flagsDefinitions','maskPolicyId','maskPolicyVersion','availableHdus','omittedHdus','transforms','manifestVersion','warnings','missingReasons'])check(key in observation,`Falta ${key} en observación`);
  text(observation.id,'Identidad');text(observation.fileName,'Archivo');hash(observation.sha256);
  check(kinds.includes(observation.sourceKind),'Procedencia inválida');
  check(Number.isSafeInteger(observation.bytes)&&observation.bytes>0,'Tamaño inválido');
  check(Number.isSafeInteger(observation.width)&&observation.width>0&&Number.isSafeInteger(observation.height)&&observation.height>0,'Dimensiones inválidas');
  if(observation.detector!==null)check(Number.isInteger(observation.detector)&&observation.detector>=1&&observation.detector<=6,'Detector inválido');
  for(const key of ['sourceUrl','parentMefUrl','spectralCalibrationUrl'])optional(observation[key],url);
  for(const key of ['sourceSha256','parentSha256','spectralCalibrationHash'])optional(observation[key],hash);
  for(const key of ['observedUtc','retrievedUtc'])optional(observation[key],date);
  check(observation.dataRelease===null||['DR1','QR3'].includes(observation.dataRelease),'Release inválido');
  for(const key of ['datasetId','collection','observationId','planeId','processingVersion','curatorVersion','units','timeScale','spectralCalibrationId','spectralCalibrationVersion','manifestVersion'])optional(observation[key],value=>text(value,key));
  for(const key of ['mjdStart','mjdEnd','mjdMid'])optional(observation[key],value=>number(value,key,0));
  for(const key of ['lambdaCenterUm','bandwidthUm'])optional(observation[key],value=>number(value,key,Number.MIN_VALUE));
  check(observation.center&&observation.wcs&&typeof observation.wcs==='object'&&!Array.isArray(observation.wcs),'WCS/centro inválidos');
  optional(observation.center.raDeg,value=>number(value,'RA',0,360));optional(observation.center.decDeg,value=>number(value,'Dec',-90,90));
  check(Array.isArray(observation.warnings)&&observation.warnings.every(value=>typeof value==='string')&&observation.missingReasons&&Object.values(observation.missingReasons).every(value=>typeof value==='string'&&value.length>0),'Faltan razones de nulidad');
  check(Array.isArray(observation.availableHdus)&&observation.availableHdus.every(value=>typeof value==='string')&&Array.isArray(observation.transforms),'Inventario/transformaciones inválidos');
  text(observation.maskPolicyId,'Política de máscara');number(observation.maskPolicyVersion,'Versión de máscara',1);
  if(observation.sourceKind.startsWith('NASA-'))check(observation.provenanceTrust==='verified-source'&&observation.datasetId&&observation.sourceUrl&&observation.sourceSha256&&observation.dataRelease&&observation.collection&&observation.observationId&&observation.planeId&&observation.detector,'Falta procedencia NASA verificada');
  if(observation.sourceKind==='SYNTHETIC')check(observation.provenanceTrust==='bundled-demo'&&Object.values(DEMO_HASHES).includes(observation.sha256),'Simulación sin hash conocido');
  jsonValues(observation);return observation;
}
export function validateReport(report){
  check(report&&['skyo-analysis-1','skyo-diagnostic-1'].includes(report.schemaVersion),'Schema de reporte no soportado');
  jsonValues(report);date(report.createdUtc);text(report.softwareVersion,'Versión de software');
  check(report.snapshot?.hashes&&['A','B'].every(side=>Number.isSafeInteger(report.snapshot.versions?.[side])&&report.snapshot.versions[side]>=0),'Snapshot inválido');
  check(JSON.stringify(report.snapshot.parameters)===JSON.stringify(PARAMETERS),'Parámetros de snapshot inválidos');
  check(report.observations?.length===2,'Se requieren dos posiciones A/B en el reporte');
  for(const [index,observation] of report.observations.entries()){
    if(observation===null){check(report.schemaVersion==='skyo-diagnostic-1'&&report.snapshot.hashes[index===0?'A':'B']===null,'Falta una observación del análisis');continue;}
    validateObservation(observation);
    check(report.snapshot.hashes[index===0?'A':'B']===observation.sha256,'Hash de snapshot distinto de la observación');
    check(Number.isSafeInteger(observation.width)&&observation.width>0&&Number.isSafeInteger(observation.height)&&observation.height>0,'Dimensiones inválidas');
  }
  if(report.schemaVersion==='skyo-diagnostic-1'){text(report.error?.message,'Error');text(report.error?.operation,'Operación');}
  else {
    text(report.analysisId,'ID de análisis');check(statuses.includes(report.status),'Estado de análisis inválido');
    check(Number.isSafeInteger(report.validPixels)&&report.validPixels>=0,'Cobertura inválida');
    for(const key of ['spatialRegistration','spectralCompatibility','maskPolicies','background','uncertainty','calibrations','catalogQueries','products','warnings','provenanceTrust','reproducibility'])check(report[key]!=null,`Falta ${key}`);
    text(report.kernelVersion,'Motor');
    for(const key of ['calibrations','catalogQueries','warnings'])check(Array.isArray(report[key]),`${key} debe ser lista`);
    check(['zodi-plus-residual','no-zodi-plus-residual'].includes(report.background.model)&&typeof report.background.zodiApplied==='boolean'&&['robust-plane','median-offset'].includes(report.background.method),'Modelo de fondo inválido');
    number(report.background.offset,'Fondo');
    check(report.reproducibility.inputHashes?.A===report.snapshot.hashes.A&&report.reproducibility.inputHashes?.B===report.snapshot.hashes.B,'Hashes de reproducibilidad distintos');
    for(const target of ['difference','snr'])check(report.products[target]?.format==='Float32Array'&&typeof report.products[target].workerResident==='boolean','Producto inválido');
    check(typeof report.uncertainty.significanceCalibrated==='boolean','Falta estado de incertidumbre');
  }
  return report;
}
export function analysisReport({observations,snapshot,result,kernel,maskBits}){
  const region=curatedRegion(observations.A,observations.B);
  const report={schemaVersion:'skyo-analysis-1',analysisId:crypto.randomUUID(),createdUtc:new Date().toISOString(),softwareVersion:SOFTWARE_VERSION,kernelVersion:kernel,
    observations:[observations.A,observations.B],snapshot,status:'exploratory',validPixels:result.validCount,
    spatialRegistration:{method:'TAN/SIP bilinear',absoluteAccuracyVerified:false,footprintICRS:region?.footprintICRS??null},
    temporal:{observationIds:[observations.A.observationId,observations.B.observationId],epochGroups:region?.epochGroups??null,deltaDays:region?.deltaDays??null,reason:'MJD nativo y grupos del archivo; no se verifica geometría de efemérides ni se presupone una cadencia universal.'},
    spectralCompatibility:{centerCompatible:result.spectral.verified,wavelengthMapVerified:false,reason:result.spectral.reason,visualMap:region?{method:'Astropy WCS-WAVE visual',compatibleFractionOfOverlap:region.compatibleFractionOfOverlap,map:`datasets/${observations.A.datasetId}/${region.spectralMap}`,scientificCalibrationVerified:false}:null},
    maskPolicies:{id:'skyo-mask-v2',version:2,purpose:'analysis',unsafeBits:maskBits,complete:true,reason:'SOURCE conservada en análisis; bits desconocidos enmascarados.',flagsReady:result.flagsReady},
    background:result.background,
    control:{identicalInputs:!!result.controlIdentical,reason:result.controlIdentical?'Control negativo: mismos bytes de entrada; no es cambio temporal.':'Entradas diferentes; la independencia temporal debe verificarse con procedencia.'},
    uncertainty:{varianceMapsAvailable:result.varianceReady,significanceCalibrated:false,included:['Varianza de A y de B con pesos bilineales cuadrados cuando están disponibles.'],omitted:['Covarianza de remuestreo','PSF','Calibración espectral','Incertidumbre de fondo']},
    calibrations:[],catalogQueries:[],products:{difference:{workerResident:true,format:'Float32Array',id:'difference'},snr:{workerResident:true,format:'Float32Array',id:'snr'}},
    warnings:[...result.notes,...observations.A.warnings,...observations.B.warnings,...(result.controlIdentical?['Control negativo idéntico, no representa dos épocas.']:[]),'Comparación exploratoria: no es una detección validada.'],
    provenanceTrust:{A:observations.A.provenanceTrust,B:observations.B.provenanceTrust},
    reproducibility:{inputHashes:snapshot.hashes,parameters:snapshot.parameters,inputFilesBundled:false,reason:'Se requieren los archivos originales con estos hashes para recalcular.'}};
  return validateReport(report);
}
export function diagnosticReport(operation,error,observations,snapshot){return validateReport({schemaVersion:'skyo-diagnostic-1',createdUtc:new Date().toISOString(),softwareVersion:SOFTWARE_VERSION,
  observations:[observations.A??null,observations.B??null],snapshot,error:{operation,message:String(error.message||error)}});}
