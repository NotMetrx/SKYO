import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {CURATED_DATASETS} from '../assets/js/science/datasets.js';
import {parseFits} from '../assets/js/science/fits.js';
import {sha256,observationFromFits,makeSnapshot,analysisReport} from '../assets/js/science/contracts.js';
import {buildComparison,compareJavaScript} from '../assets/js/science/pipeline.js';
const datasetId='m101-visual-v2',dataset=CURATED_DATASETS[datasetId];
for(const region of dataset.regions)test(`Par NASA real ${region.id}: cadena, cobertura espectral, comparación y control`,async()=>{
  const images={},observations={};
  for(const side of ['A','B']){
    const name=region.files[side],bytes=await fs.readFile(new URL(`../public/datasets/${datasetId}/${name}`,import.meta.url));
    const buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),digest=await sha256(buffer);
    images[side]=parseFits(buffer);images[side].sha256=digest;
    observations[side]=observationFromFits(images[side],{fileName:name,digest,bytes:buffer.byteLength,mode:'curated',datasetId,meta:{source_url:'https://evil.example/fake'}});
    images[side].meta=observations[side].declaredProvenance;
    assert.equal(observations[side].sourceKind,'NASA-DERIVED');assert.match(observations[side].sourceUrl,/^https:\/\/irsa\.ipac\.caltech\.edu\//);
    assert.equal(observations[side].processingVersion,'7.0.5');assert.deepEqual(observations[side].omittedHdus,['EPSF']);
    assert.equal(observationFromFits(images[side],{fileName:'renombrado.fits',digest,bytes:buffer.byteLength}).sourceKind,'NASA-DERIVED');
  }
  assert.notEqual(observations.A.observationId,observations.B.observationId);assert.notEqual(observations.A.mjdMid,observations.B.mjdMid);
  assert.notEqual(region.epochGroups[0],region.epochGroups[1]);assert.ok(region.compatibleFractionOfOverlap>.9);
  const result=buildComparison(images.A,images.B);assert.ok(result.validCount>60);assert.ok(result.background.used>=3);
  const report=analysisReport({observations,snapshot:makeSnapshot({A:1,B:1},observations),result,kernel:'JavaScript',maskBits:{A:0,B:0}});
  assert.equal(report.status,'exploratory');assert.equal(report.uncertainty.significanceCalibrated,false);assert.ok(report.spectralCompatibility.visualMap);
  const control=buildComparison(images.A,images.A),difference=compareJavaScript(control.a,control.b,control.va,control.vb,control.valid,control.offset);
  assert.equal(control.controlIdentical,true);
  for(let i=0;i<control.valid.length;i++)if(control.valid[i])assert.ok(Math.abs(difference[i])<1e-5);
});

test('La copia importable del manifiesto coincide con el paquete publicado',async()=>{
  const published=JSON.parse(await fs.readFile(new URL('../public/datasets/m101-visual-v2/manifest.json',import.meta.url),'utf8'));
  const imported=JSON.parse(await fs.readFile(new URL('../data/published/m101-visual-v2/manifest.json',import.meta.url),'utf8'));
  assert.deepEqual(imported,published,'Ejecuta npm run sync:curated: la copia quedó desfasada');
  assert.deepEqual(dataset,published);
});
