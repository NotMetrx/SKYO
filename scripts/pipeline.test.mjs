import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs/promises';
import {parseFits,readFitsHeaders,buildQualityMask,decodeFlags32} from '../assets/js/science/fits.js';
import {wcsFromHeader,pixelToWorld,worldToPixel,reprojectToReference} from '../assets/js/science/wcs.js';
import {buildComparison,compareJavaScript,checkSpectralPair,robustBackgroundPlane} from '../assets/js/science/pipeline.js';
import {imageRgba} from '../assets/js/science/render.js';
import {createScienceWorkerState,handleWorkerMessage} from '../assets/js/science/worker.js';
const dir=new URL('../data/sample-fits/',import.meta.url);
async function fits(epoch){const buf=await fs.readFile(new URL(`epoca_${epoch}.fits`,dir));
 return parseFits(buf.buffer.slice(buf.byteOffset,buf.byteOffset+buf.byteLength));}
test('FITS MEF: IMAGE/FLAGS/VARIANCE/ZODI con datos originales',async()=>{
 const a=await fits('A');
 assert.equal(a.width,128);assert.equal(a.height,128);assert.equal(a.detector,2);
 assert.ok(a.flags);assert.ok(a.variance);assert.ok(a.zodi);
 assert.equal(a.observationTime,'2025-11-05T13:45:00');
 assert.equal(a.flagsCompressed,false);assert.ok(a.image[0]>0);
});
test('WCS TAN-SIP respeta transformacion ida/vuelta subpixel',async()=>{
 const a=await fits('A');const w=wcsFromHeader(a.header);
 for(const [x,y] of [[10,20],[50,40],[100,116]]){
   const sky=pixelToWorld(w,x,y);const result=worldToPixel(w,sky.ra,sky.dec);
   assert.ok(Math.abs(result.x-x)<1e-5,`x ${x}: ${result.x}`);
   assert.ok(Math.abs(result.y-y)<1e-5,`y ${y}: ${result.y}`);
 }
});
test('mascaras decodifican banderas de mala calidad sin eliminar SOURCE',async()=>{
 const b=await fits('B');const r=buildQualityMask(b);
 assert.equal(b.flagNames[1],'HOT');assert.equal(r.mask[43*128+28],0);
 assert.equal(r.flagsAvailable,true);assert.equal(r.maskedCount,1);
});
test('el motor reproyecta B usando WCS de A',async()=>{
 const a=await fits('A'),b=await fits('B');
 const ma=buildQualityMask(a),mb=buildQualityMask(b);
 const reproj=reprojectToReference(a,b,ma.mask,mb.mask);
 assert.ok(reproj.mask[64*128+64]);
 assert.ok(Number.isFinite(reproj.image[64*128+64]));
});
test('calculo de diferencia con varianza y filtro de datos nulos',()=>{
 const out=compareJavaScript(new Float32Array([12,4]),new Float32Array([7,3]),new Float32Array([4,4]),new Float32Array([5,5]),new Uint8Array([1,0]),2);
 assert.equal(out.length,4);assert.equal(out[0],3);assert.equal(out[2],1);
 assert.ok(Number.isNaN(out[1]));
});
test('pipeline extremo a extremo sintético mantiene calificativo exploratorio',async()=>{
 const a=await fits('A'),b=await fits('B');
 const result=buildComparison(a,b);
 assert.equal(result.status,'exploratorio');
 assert.ok(result.flagsReady);assert.ok(result.varianceReady);assert.ok(result.spectral.verified);
 assert.ok(result.validCount>8000);
 const packed=compareJavaScript(result.a,result.b,result.va,result.vb,result.valid,result.offset);
 const diff=packed.subarray(0,a.image.length);
 const rgba=imageRgba(diff,a.width,a.height,result.valid,{kind:'difference'});
 assert.equal(rgba.length,a.image.length*4);
});

test('par real SPHEREx NASA-DERIVED: epocas distintas (>20d), ePSF y procedencia autenticada', async () => {
  const bufA = await fs.readFile(new URL('nasa_real_epoca_A.fits', dir));
  const bufB = await fs.readFile(new URL('nasa_real_epoca_B.fits', dir));
  const a = parseFits(bufA.buffer.slice(bufA.byteOffset, bufA.byteOffset + bufA.byteLength));
  const b = parseFits(bufB.buffer.slice(bufB.byteOffset, bufB.byteOffset + bufB.byteLength));

  assert.equal(a.provenanceKind, 'nasa_derived');
  assert.equal(b.provenanceKind, 'nasa_derived');
  assert.equal(a.sourceKind, 'NASA-DERIVED');
  assert.equal(b.sourceKind, 'NASA-DERIVED');
  assert.ok(a.hasEpsf && b.hasEpsf, 'Ambos deben certificar modelo ePSF');
  assert.equal(a.version, 'l2b-v27-2026-198');
  assert.ok(Math.abs(a.mjdObs - b.mjdObs) > 20, 'Las epocas deben diferir mas de 20 dias');

  const result = buildComparison(a, b);
  assert.equal(result.status, 'exploratorio');
  assert.ok(result.flagsReady);
  assert.ok(result.varianceReady);
  assert.ok(result.spectral.verified);
  assert.ok(result.validCount > 10000);
});
test('sin longitud de onda calibrada se rechaza validar compatibilidad',async()=>{
 const a=await fits('A'),b=await fits('B');
 b.wavelengthUm=null;
 const result=checkSpectralPair(a,b);
 assert.equal(result.verified,false);
});

test('bloquea comparaciones con filtros realmente incompatibles',async()=>{
 const a=await fits('A'),b=await fits('B');
 b.detector=3;
 assert.throws(()=>buildComparison(a,b),/bloqueada/);
});

test('mascaras decodifican SATELLITE_HALO (bit 29) y bit 31 sin sesgo de signo',()=>{
 const flags=new Int32Array(4);
 flags[0]=0;
 flags[1]=(1<<29)>>>0;
 flags[2]=(1<<31)|0;
 const mock={
  width:2,height:2,
  image:new Float32Array([1,2,3,4]),
  flags,
  flagNames:{29:'SATELLITE_HALO',31:'CUSTOM_OUTLIER'}
 };
 // SATELLITE_HALO debe enmascarar el pixel 1; CUSTOM_OUTLIER fuera de BAD_NAMES no
 const res1=buildQualityMask(mock);
 assert.equal(res1.mask[0],1);
 assert.equal(res1.mask[1],0);
 assert.equal(res1.mask[2],1);
 assert.equal(res1.maskedCount,1);
 // Bit 31 con nombre en BAD_NAMES (OVERFLOW) debe activar bit 31 sin signo
 const mock31={...mock,flagNames:{31:'OVERFLOW'}};
 const res2=buildQualityMask(mock31);
 assert.equal(res2.mask[2],0);
 assert.equal(res2.unsafeBits,(1<<31)>>>0);
});

function buildMinimalFits({origin,version,includeEpsf}){
 const padCards=cards=>{
  const text=cards.map(c=>c.padEnd(80,' ')).join('');
  const blocks=Math.ceil(text.length/2880)*2880;
  return text.padEnd(blocks,' ');
 };
 const h0=padCards([
  'SIMPLE  =                    T',
  'BITPIX  =                    8',
  'NAXIS   =                    0',
  `ORIGIN  = '${origin}'`,
  ...(version?[`VERSION = '${version}'`]:[]),
  'END'
 ]);
 const h1=padCards([
  "XTENSION= 'IMAGE   '",
  'BITPIX  =                  -32',
  'NAXIS   =                    2',
  'NAXIS1  =                    2',
  'NAXIS2  =                    2',
  "EXTNAME = 'IMAGE   '",
  'END'
 ]);
 const d1=new Uint8Array(2880);
 const dv=new DataView(d1.buffer);
 for(let i=0;i<4;i++)dv.setFloat32(i*4,1.0,false);
 let h2='',d2=new Uint8Array(0);
 if(includeEpsf){
  h2=padCards([
   "XTENSION= 'IMAGE   '",
   'BITPIX  =                  -32',
   'NAXIS   =                    2',
   'NAXIS1  =                    2',
   'NAXIS2  =                    2',
   "EXTNAME = 'EPSF    '",
   'END'
  ]);
  d2=new Uint8Array(2880);
 }
 const enc=new TextEncoder();
 const parts=[enc.encode(h0),enc.encode(h1),d1,...(includeEpsf?[enc.encode(h2),d2]:[])];
 const out=new Uint8Array(parts.reduce((s,p)=>s+p.length,0));
 let pos=0;for(const p of parts){out.set(p,pos);pos+=p.length;}
 return out.buffer;
}

test('parseFits clasifica provenanceKind y extrae VERSION y EPSF',()=>{
 const syn=parseFits(buildMinimalFits({origin:'SKYO',version:'v1',includeEpsf:false}));
 assert.equal(syn.provenanceKind,'synthetic');
 assert.equal(syn.version,'v1');
 assert.equal(syn.hasEpsf,false);

 const nasa=parseFits(buildMinimalFits({origin:'NASA/IPAC IRSA',version:'DR1',includeEpsf:true}));
 assert.equal(nasa.provenanceKind,'nasa_derived');
 assert.equal(nasa.version,'DR1');
 assert.equal(nasa.hasEpsf,true);

 const unk=parseFits(buildMinimalFits({origin:'Observatorio Local',version:null,includeEpsf:false}));
 assert.equal(unk.provenanceKind,'local_fits');
 assert.equal(unk.sourceKind,'USER-LOCAL');
 assert.equal(unk.version,null);

 const derived=parseFits(buildMinimalFits({origin:'NASA/IPAC via SKYO curator',version:'7.0.5',includeEpsf:false}));
 assert.equal(derived.provenanceKind,'nasa_derived');
 assert.equal(derived.sourceKind,'NASA-DERIVED');
 assert.equal(derived.provenanceLabel,'MUESTRA DERIVADA NASA/IRSA');

 // Rechazo de FITS truncado (cabecera, datos y cola incompleta) y dimensiones por eje excesivas
 const minimalBuf=buildMinimalFits({origin:'SKYO',version:'v1',includeEpsf:false});
 assert.throws(()=>parseFits(minimalBuf.slice(0,2900)),/truncada|incompleto|END/);
 assert.throws(()=>parseFits(minimalBuf.slice(0,3000)),/END/);
 assert.throws(()=>parseFits(minimalBuf.slice(0,5770)),/incompleto/);
 assert.throws(()=>parseFits(minimalBuf,{maxAxis:1}),/presupuesto/);
});

test('mascara FLAGS conserva bits altos y BZERO 2^31 sin Float32',()=>{
 const bytes=new ArrayBuffer(16),view=new DataView(bytes);
 view.setInt32(0,-2147483648,false);
 view.setInt32(4,2147483647,false);
 view.setInt32(8,-1,false);
 view.setInt32(12,0,false);
 const signed=decodeFlags32(view,0,4,0);
 assert.equal(signed[0],0x80000000);
 assert.equal(signed[2],0xffffffff);
 const offset=decodeFlags32(view,0,4,2147483648);
 assert.equal(offset[0],0);
 assert.equal(offset[1],0xffffffff);
 assert.equal(offset[2],2147483647);
 assert.throws(()=>decodeFlags32(view,0,4,0,2),/BSCALE/);
});

test('propagacion de varianza bilineal emplea pesos cuadrados',async()=>{
 const a=await fits('A'),b=await fits('B');
 const ma=buildQualityMask(a),mb=buildQualityMask(b);
 const p=reprojectToReference(a,b,ma.mask,mb.mask);
 const sample=p.variance[60*128+60];
 assert.ok(sample>0 && sample<=6.25);
 assert.ok(sample<6.25,`se esperaba disminucion estricta, se obtuvo ${sample}`);
});

test('plano robusto, resta ZODI y exclusion de SOURCE en A y B',async()=>{
 const width=48,height=48,n=width*height;
 const a=new Float32Array(n),b=new Float32Array(n),valid=new Uint8Array(n).fill(1);
 const flagsA=new Uint32Array(n),extraB=new Uint8Array(n);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=y*width+x;
  a[i]=20+3*(2*x/(width-1)-1)-1.5*(2*y/(height-1)-1);
 }
 // Contamina una celda con fuentes brillantes marcadas en A y B sin alterar el plano de fondo
 a[5*width+5]=9000;flagsA[5*width+5]=1<<2;
 a[6*width+6]=9000;extraB[6*width+6]=1;
 const fit=robustBackgroundPlane(a,b,valid,width,height,flagsA,2,extraB);
 assert.equal(fit.method,'robust-plane');
 assert.ok(Math.abs(fit.offset-20)<0.2);
 assert.ok(Math.abs(fit.gradientX-3)<0.2);
 assert.ok(Math.abs(fit.gradientY+1.5)<0.2);

 const fa=await fits('A'),fb=await fits('B');
 const report=buildComparison(fa,fb);
 assert.equal(report.background.zodiApplied,true);
 assert.equal(report.background.model,'zodi-plus-residual');
 assert.equal(report.isNegativeControl,false);
 const incomplete=buildComparison(fa,{...fb,zodi:null});
 assert.equal(incomplete.background.zodiApplied,false);
 assert.equal(incomplete.background.model,'no-zodi-plus-residual');
});

test('wcsFromHeader rechaza ejes no ecuatoriales, radianes y FK4',()=>{
 const base={CRVAL1:10,CRVAL2:20,CRPIX1:1,CRPIX2:1,CDELT1:0.001,CDELT2:0.001,CTYPE1:'RA---TAN',CTYPE2:'DEC--TAN'};
 assert.throws(()=>wcsFromHeader({...base,CTYPE1:'GLON-TAN',CTYPE2:'GLAT-TAN'}),/TAN/);
 assert.throws(()=>wcsFromHeader({...base,CUNIT1:'rad',CUNIT2:'rad'}),/CUNIT/);
 assert.throws(()=>wcsFromHeader({...base,RADESYS:'FK4'}),/RADESYS/);
 assert.throws(()=>wcsFromHeader({...base,EQUINOX:1950}),/EQUINOX/);
});

test('muestras reales NASA: readFitsHeaders ePSF 441/451 y WCS contra Astropy 8.0.2',async()=>{
 const nasaDir=new URL('../docs/evidence/investigacion-nasa-20261113/',import.meta.url);
 const readArrBuf=async u=>{
  const b=await fs.readFile(u);
  return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);
 };
 const s3Headers=readFitsHeaders(await readArrBuf(new URL('s3-header-range.bin',nasaDir)));
 assert.equal(s3Headers[0].header.VERSION,'7.0.5');
 assert.equal(s3Headers[1].name,'IMAGE');
 assert.equal(s3Headers[1].header.DETECTOR,2);
 assert.equal(s3Headers[1].header.FINAST,0);
 assert.equal(s3Headers[1].header.RADESYS,'ICRS');

 // Comprobar precision WCS frente a recibo Astropy 8.0.2 aplicando el CRPIX del recorte M101 real
 const inspect=JSON.parse(await fs.readFile(new URL('../docs/evidence/auditoria-spec-20261113/fits-real-inspection.json',import.meta.url),'utf8'));
 const astRef=JSON.parse(await fs.readFile(new URL('../docs/evidence/auditoria-spec-20261113/wcs-vs-astropy.json',import.meta.url),'utf8'));
 const w=wcsFromHeader({...s3Headers[1].header,CRPIX1:inspect.image.CRPIX1,CRPIX2:inspect.image.CRPIX2});
 for(const s of astRef.samples){
  const back=worldToPixel(w,s.expected.ra,s.expected.dec);
  const pxErr=Math.hypot(back.x-s.expected.x,back.y-s.expected.y);
  assert.ok(pxErr<1e-9,`error WCS px=${pxErr}`);
 }

 const epsfV1=readFitsHeaders(await readArrBuf(new URL('epsf-d3-header.bin',nasaDir)));
 const epsfV2=readFitsHeaders(await readArrBuf(new URL('epsf-d3-v2-header.bin',nasaDir)));
 assert.equal(epsfV1.find(h=>h.name==='EPSF')?.dims[1],441);
 assert.equal(epsfV2.find(h=>h.name==='EPSF')?.dims[1],451);
});

test('worker descarta cargas antiguas fuera de orden (job3 -> job1) y detecta control negativo',async()=>{
 const readRaw=async ep=>fs.readFile(new URL(`epoca_${ep}.fits`,dir)).then(b=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));
 const [bufA1,bufA2,bufB]=await Promise.all([readRaw('A'),readRaw('A'),readRaw('B')]);
 const state=createScienceWorkerState();
 state.kernel='JavaScript (test)';
 const events=[];
 const post=msg=>events.push(msg);

 handleWorkerMessage(state,{event:'load',side:'B',jobId:2,buffer:bufA1,meta:{local_file:'epoca_A.fits',sha256:'hash-a'}},post);
 handleWorkerMessage(state,{event:'load',side:'A',jobId:3,buffer:bufA2,meta:{local_file:'epoca_A.fits',sha256:'hash-a'}},post);
 // Llega tarde jobId:1 de A con otra epoca: debe ignorarse sin contaminar images.A
 handleWorkerMessage(state,{event:'load',side:'A',jobId:1,buffer:bufB,meta:{local_file:'epoca_B.fits',sha256:'hash-b'}},post);
 assert.equal(events.filter(e=>e.event==='loaded').length,2);

 handleWorkerMessage(state,{event:'compare',jobId:4},post);
 const cmp=events.find(e=>e.event==='compared');
 assert.ok(cmp);
 assert.equal(cmp.info.snapshot.jobA,3);
 assert.equal(cmp.info.snapshot.jobB,2);
 assert.equal(cmp.info.isNegativeControl,true);
 assert.ok(Math.abs(cmp.info.offset)<1e-6);

 handleWorkerMessage(state,{event:'render',jobId:5,target:'snr'},post);
 const ren=events.find(e=>e.event==='rendered');
 assert.equal(ren.target,'snr');
 assert.equal(ren.rgba.length,128*128*4);

 handleWorkerMessage(state,{event:'clear',jobId:6},post);
 assert.equal(events.at(-1).event,'cleared');
});

test('worker ignora compare obsoleto y buildQualityMask cubre MISSING_DATA/CROSSTALK/STREAK + policyVersion',()=>{
 const n=4;
 const mock={
  width:2,height:2,
  image:new Float32Array([1,2,3,4]),
  flags:new Uint32Array([0,1<<9,1<<20,1<<25]),
  flagNames:{9:'MISSING_DATA',20:'CROSSTALK',25:'STREAK'},
  header:{FINAST:0,BUNIT:'MJy / sr','MJD-AVG':60805.71},
  headerPrimary:{VERSION:'7.0.5'},
  origin:'NASA/IPAC',
  sourceKind:'NASA-DERIVED',
  provenanceKind:'nasa_derived',
  provenanceLabel:'MUESTRA DERIVADA NASA/IRSA'
 };
 const mask=buildQualityMask(mock);
 assert.equal(mask.policyVersion,'skyo-mask-1.1');
 assert.deepEqual(Array.from(mask.mask),[1,0,0,0]);
 assert.equal(mask.maskedCount,3);

 const state=createScienceWorkerState();
 state.latestCompareJob=10;
 const events=[];
 handleWorkerMessage(state,{event:'compare',jobId:9},m=>events.push(m));
 assert.equal(events.length,0);
});

test('curate_irsa.py: VOTable ERROR/OVERFLOW, 503->200 Retry-After, HTML y guardado atomico',()=>{
 const out=execFileSync('python3',['-c',`
import json, tempfile
from pathlib import Path
import scripts.curate_irsa as c

# 1. XML real de error TAP IRSA y OVERFLOW/OK sinteticos
err_xml = Path("docs/evidence/investigacion-nasa-20261113/3iatlas-first-exposure-query-error.xml").read_text(encoding="utf-8")
try:
    c.check_votable_status(err_xml)
    raise AssertionError("deberia fallar en ERROR")
except RuntimeError:
    pass

ov = c.check_votable_status('<VOTABLE><RESOURCE><INFO name="QUERY_STATUS" value="OVERFLOW">maxrec</INFO></RESOURCE></VOTABLE>')
assert ov["status"] == "OVERFLOW" and ov["truncated"] is True
ok = c.check_votable_status('<VOTABLE><RESOURCE><INFO name="QUERY_STATUS" value="OK"/></RESOURCE></VOTABLE>')
assert ok["status"] == "OK" and ok["truncated"] is False

# 2. 503 + Retry-After -> 200 FITS valido y rechazo de HTML
class Resp:
    def __init__(self, status, headers, content):
        self.status_code = status
        self.headers = headers
        self.content = content
    def raise_for_status(self):
        if self.status_code >= 400:
            raise RuntimeError(f"HTTP {self.status_code}")

calls = []
def mock_get(url):
    calls.append(url)
    if len(calls) == 1:
        return Resp(503, {"Retry-After": "1"}, b"Server busy")
    return Resp(200, {}, b"SIMPLE  =                    T" + b" " * 2850)

waits = []
data = c.fetch_with_retry("https://irsa.example/fits", mock_get, sleep_fn=waits.append)
assert len(calls) == 2 and waits == [1.0] and data.startswith(b"SIMPLE  =")

try:
    c.fetch_with_retry("https://irsa.example/big", lambda u: Resp(429, {"Retry-After": "99"}, b""), budget_seconds=10, sleep_fn=lambda _: None)
    raise AssertionError("deberia rechazar Retry-After excesivo")
except RuntimeError:
    pass

try:
    c.fetch_with_retry("https://irsa.example/html", lambda u: Resp(200, {}, b"<html>Error</html>"), sleep_fn=lambda _: None)
    raise AssertionError("deberia rechazar HTML")
except ValueError:
    pass

# 3. Escritura atomica ante fallo intermedio conserva dataset previo intacto
with tempfile.TemporaryDirectory() as tmp:
    out_dir = Path(tmp) / "dataset"
    good = b"SIMPLE  =                    T" + b" " * 2850
    c.commit_dataset_atomic(out_dir, {"a.fits": good}, {"items": [{"local_file": "a.fits"}]})
    prev_manifest = (out_dir / "manifest.json").read_text(encoding="utf-8")
    try:
        c.commit_dataset_atomic(out_dir, {"b.fits": b"<html>corrupt"}, {"items": [{"local_file": "b.fits"}]})
        raise AssertionError("deberia abortar payload invalido")
    except ValueError:
        pass
    assert (out_dir / "manifest.json").read_text(encoding="utf-8") == prev_manifest
    assert (out_dir / "a.fits").exists() and not (out_dir / "b.fits").exists()

print("PYTHON_CURATOR_OK")
`],{encoding:'utf8'});
 assert.match(out,/PYTHON_CURATOR_OK/);
});

test('kernel WASM: carga, equivalencia numerica estricta y fallback JS', async () => {
  const { initKernel, processDifference } = await import('../assets/js/science/wasm-bridge.js');
  const { compareJavaScript } = await import('../assets/js/science/pipeline.js');

  const status = await initKernel();
  assert.equal(status, 'Rust / WebAssembly');

  const n = 64;
  const a = new Float32Array(n);
  const b = new Float32Array(n);
  const va = new Float32Array(n);
  const vb = new Float32Array(n);
  const valid = new Uint8Array(n);

  for (let i = 0; i < n; i++) {
    a[i] = (i % 5 === 0) ? NaN : (i % 9 === 0) ? Infinity : 10.0 + i;
    b[i] = (i % 7 === 0) ? NaN : 5.0 + (i * 0.5);
    va[i] = (i % 4 === 0) ? -1 : 2.0;
    vb[i] = (i % 3 === 0) ? NaN : 2.0;
    valid[i] = (i % 11 === 0) ? 0 : 1;
  }
  const offset = 1.25;

  const wasmRes = processDifference(a, b, va, vb, valid, offset);
  const jsRes = compareJavaScript(a, b, va, vb, valid, offset);

  assert.equal(wasmRes.length, jsRes.length);
  for (let i = 0; i < wasmRes.length; i++) {
    if (Number.isNaN(jsRes[i])) {
      assert.ok(Number.isNaN(wasmRes[i]), `Esperado NaN en indice ${i}`);
    } else {
      assert.ok(Math.abs(wasmRes[i] - jsRes[i]) < 1e-5, `Discrepancia en indice ${i}`);
    }
  }
});
