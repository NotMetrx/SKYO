/** Current runtime schema: contracts.js validates these values at both boundaries. */
export type Side='A'|'B';
export type SourceKind='NASA-ORIGINAL'|'NASA-DERIVED'|'USER-LOCAL'|'SYNTHETIC';
export interface CuratedMetadata {
  local_file?:string;filename?:string;sha256?:string;source_sha256?:string;parent_sha256?:string;
  source_url?:string;parent_mef_url?:string;source_release?:'DR1'|'QR3';sourceKind?:SourceKind;
  observation_id?:string;plane_id?:string;dataset_id?:string;collection?:string;
  processing_version?:string;curator_version?:string;provenance_note?:string;wavelength_quality?:string;bandpass?:string;
  observation_utc?:string;retrieved_utc?:string;detector?:number;ra_deg?:number;dec_deg?:number;
  wavelength_um?:number;bandwidth_um?:number;mjd?:number;size_deg?:number;psf_fwhm_arcsec?:number;
  has_variance?:boolean;has_uncompressed_flags?:boolean;
  original_file?:string;obsid?:string;metadata_processing_version?:string;units?:string;time_scale?:string;
  bytes?:number;finast?:number;mjd_start?:number;mjd_mid?:number;mjd_end?:number;
  native_time_cards?:{[card:string]:string|number|null};metadata_time_bounds?:{lower:number|null;upper:number|null};
  missing_reasons?:{[field:string]:string|null};epsf?:{rows:number;columns:string[]};
  available_hdus?:string[];omitted_hdus?:string[];transforms?:{software:string;operation:string}[];
}
export interface Manifest {schema_version:'skyo-curated-0.1';items:CuratedMetadata[]}
export interface Observation {
  id:string;datasetId:string|null;fileName:string;sha256:string;bytes:number;
  sourceKind:SourceKind;provenanceTrust:'bundled-demo'|'user-local'|'unverified-user-manifest'|'verified-source';
  dataRelease:'DR1'|'QR3'|null;collection:string|null;observationId:string|null;planeId:string|null;
  sourceUrl:string|null;parentMefUrl:string|null;sourceSha256:string|null;parentSha256:string|null;
  retrievedUtc:string|null;processingVersion:string|null;curatorVersion:string|null;
  observedUtc:string|null;nativeObservedTime:string|null;timeScale:string|null;
  mjdStart:number|null;mjdEnd:number|null;mjdMid:number|null;detector:1|2|3|4|5|6|null;
  width:number;height:number;units:string|null;center:{raDeg:number|null;decDeg:number|null};footprint:null;
  wcs:{[card:string]:string|number|null};detectorTransform:null;
  lambdaCenterUm:number|null;bandwidthUm:number|null;spectralFidelity:'visual-unverified';
  spectralCalibrationId:null;spectralCalibrationVersion:null;spectralCalibrationUrl:null;spectralCalibrationHash:null;
  quality:'visual-only';wcsSpatialVerified:false;wavelengthMapVerified:false;
  maskPolicyId:'skyo-mask-v2';maskPolicyVersion:2;flagsDefinitions:{[bit:number]:string};
  flagsAvailable:boolean;varianceAvailable:boolean;availableHdus:string[];omittedHdus:string[];transforms:{software:string;operation:string}[];
  manifestVersion:'skyo-curated-0.1'|null;declaredProvenance:CuratedMetadata&{dataRelease:'DR1'|'QR3'|null};
  nativeMetadata:{processingVersion:string|number|null;origin:string;finast:string|number|null;timeCards:{[card:string]:string|number|null}};
  missingReasons:{provenance:string;timeScale:string;calibrations:string;footprint:string;omittedHdus:string};warnings:string[];
}
export interface Parameters {background:'robust-plane';resampling:'bilinear';zodiPolicy:'both-maps-or-none'}
export interface Snapshot {versions:{A:number;B:number};hashes:{A:string|null;B:string|null};parameters:Parameters}
export interface AnalysisReport {
  schemaVersion:'skyo-analysis-1';analysisId:string;createdUtc:string;softwareVersion:string;kernelVersion:string;
  observations:[Observation,Observation];snapshot:Snapshot;
  status:'exploratory'|'candidate-unverified'|'catalog-matched'|'discarded';validPixels:number;
  spatialRegistration:{method:'TAN/SIP bilinear';absoluteAccuracyVerified:false;footprintICRS:number[][]|null};
  temporal:{observationIds:[string|null,string|null];epochGroups:string[]|null;deltaDays:number|null;reason:string};
  spectralCompatibility:{centerCompatible:boolean;wavelengthMapVerified:false;reason:string;visualMap:{method:string;compatibleFractionOfOverlap:number;map:string;scientificCalibrationVerified:false}|null};
  maskPolicies:{id:string;version:number;purpose:'analysis';unsafeBits:{A:number;B:number};complete:true;reason:string;flagsReady:boolean};
  background:{model:'zodi-plus-residual'|'no-zodi-plus-residual';method:'robust-plane'|'median-offset';offset:number;zodiApplied:boolean;gradientX:number;gradientY:number};
  control:{identicalInputs:boolean;reason:string};
  uncertainty:{varianceMapsAvailable:boolean;significanceCalibrated:false;included:string[];omitted:string[]};
  calibrations:[];catalogQueries:[];
  products:{difference:{workerResident:true;format:'Float32Array';id:'difference'};snr:{workerResident:true;format:'Float32Array';id:'snr'}};
  warnings:string[];provenanceTrust:{A:Observation['provenanceTrust'];B:Observation['provenanceTrust']};
  reproducibility:{inputHashes:Snapshot['hashes'];parameters:Parameters;inputFilesBundled:false;reason:string};
}
export interface DiagnosticReport {
  schemaVersion:'skyo-diagnostic-1';createdUtc:string;softwareVersion:string;
  observations:[Observation|null,Observation|null];snapshot:Snapshot;error:{operation:string;message:string};
}
export type WorkerRequest=
  | {event:'load';jobId:number;side:Side;version:number;buffer:ArrayBuffer;observation:{fileName:string;sha256?:string};meta?:CuratedMetadata;mode?:'manual'|'demo'|'curated';datasetId?:string|null}
  | {event:'clear';jobId:number;side:Side;version:number}
  | {event:'compare';jobId:number;snapshot:Snapshot}
  | {event:'render';jobId:number;snapshot:Snapshot;target:Side|'difference'|'snr'};
