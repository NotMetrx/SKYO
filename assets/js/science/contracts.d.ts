/** SKYO 2.1. Formal data and Worker protocol; no claim of NASA provenance for demos. */
export type Side = 'A' | 'B';
export type ImageSourceKind = 'NASA-ORIGINAL' | 'NASA-DERIVED' | 'USER-LOCAL' | 'SYNTHETIC';
export type QualityLevel = 'raw' | 'visual-only' | 'comparative' | 'validated';

interface ObservationBase {
  id:string;
  fileName:string;
  sha256:string;                    // hash of currently loaded file
  detector:1|2|3|4|5|6|null;
  raDeg:number|null;
  decDeg:number|null;
  wavelengthCenterUm:number|null; // ROI center, not per-pixel WCS-WAVE
  bandwidthUm:number|null;
  quality:QualityLevel;
  flagsAvailable:boolean;
  varianceAvailable:boolean;
  wcsSpatialVerified:boolean;
  wavelengthMapVerified:boolean;
}
type NasaProvenance = {
  dataRelease:'DR1'|'QR3';
  mjd:number;
  observedUtc:string;
  sourceUrl:string;
  sourceSha256?:string;
};
export type SkyoObservation =
  | (ObservationBase & {sourceKind:'NASA-ORIGINAL'|'NASA-DERIVED'} & NasaProvenance)
  | (ObservationBase & {sourceKind:'USER-LOCAL'|'SYNTHETIC'; dataRelease:null;
      mjd:number|null; observedUtc:string|null; sourceUrl:null});

export interface ComparisonReport {
  observationA:string;
  observationB:string;
  status:'exploratory'|'candidate-unverified'|'catalog-matched'|'discarded';
  validPixels:number;
  wavelengthMapVerified:boolean;
  significanceCalibrated:boolean;
  background:{model:string;offset:number;gradientX:number;gradientY:number;zodiApplied:boolean};
  warnings:string[];
}
export type WorkerRequest =
  | {event:'load';jobId:number;side:Side;buffer:ArrayBuffer;meta?:Record<string,unknown>}
  | {event:'compare';jobId:number}
  | {event:'render';jobId:number;target:Side|'difference'|'snr'}
  | {event:'clear';jobId:number};
export type WorkerResponse =
  | {event:'loaded';jobId:number;summary:Record<string,unknown>;rgba:Uint8ClampedArray}
  | {event:'compared';jobId:number;info:Record<string,unknown>;
      rgba:Uint8ClampedArray;products:{differenceId:'difference';snrId:'snr';workerResident:true}}
  | {event:'rendered';jobId:number;target:Side|'difference'|'snr';width:number;height:number;rgba:Uint8ClampedArray}
  | {event:'kernel';jobId:0;kernel:string}
  | {event:'cleared';jobId:number}
  | {event:'error';jobId:number;side?:Side;operation:string;message:string};
