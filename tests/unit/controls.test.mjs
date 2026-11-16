import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {createControls} from '../../frontend/assets/js/immersive/controls.js';
test('Un pellizco no selecciona al levantar el último dedo; el clic sigue funcionando',async()=>{
  const context={};vm.runInNewContext(await fs.readFile('frontend/assets/js/vendor/three.min.js','utf8'),context);const T=context.THREE;
  const oldWindow=globalThis.window,oldDocument=globalThis.document;
  globalThis.window=new EventTarget();globalThis.document={pointerLockElement:null};
  const canvas=new EventTarget();Object.assign(canvas,{focus(){},setPointerCapture(){},getBoundingClientRect(){return {left:0,top:0,width:500,height:500};}});
  let selected=0;const controls=createControls(T,canvas,new T.PerspectiveCamera(),new T.Group(),{onSelect(){selected++;},onChange(){},isXR:()=>false});
  const pointer=(name,id,x)=>{const e=new Event(name);Object.assign(e,{pointerId:id,clientX:x,clientY:200});canvas.dispatchEvent(e);};
  try{pointer('pointerdown',1,100);pointer('pointerdown',2,300);pointer('pointermove',1,50);pointer('pointerup',1,50);pointer('pointerup',2,300);assert.equal(selected,0);pointer('pointerdown',3,200);pointer('pointerup',3,200);assert.equal(selected,1);}finally{controls.dispose();globalThis.window=oldWindow;globalThis.document=oldDocument;}
});

test('El cielo recupera una tesela base que agota el tiempo de carga',async()=>{
 const {createSky}=await import('../../frontend/assets/js/immersive/hips.js');const context={};vm.runInNewContext(await fs.readFile('frontend/assets/js/vendor/three.min.js','utf8'),context);const T=context.THREE;
 const saved={fetch:globalThis.fetch,createImageBitmap:globalThis.createImageBitmap,location:globalThis.location,setTimeout:globalThis.setTimeout};let first=true,requests=0,partial=false;
 globalThis.location={href:'https://example.org/inmersivo.html'};
 globalThis.setTimeout=(fn,ms,...args)=>{if(ms===20000&&first){first=false;queueMicrotask(fn);return 0;}return saved.setTimeout(fn,ms,...args);};
 globalThis.fetch=async(url,{signal})=>{requests++;await Promise.resolve();if(signal.aborted)throw new DOMException('Timeout','AbortError');return {ok:true,headers:new Headers(),arrayBuffer:async()=>new ArrayBuffer(8)};};
 globalThis.createImageBitmap=async()=>({width:512,height:512,close(){}});
 let sky;
 try{await new Promise((resolve,reject)=>{const deadline=saved.setTimeout(()=>reject(Error('No se recuperaron las 12 teselas')),2000);sky=createSky(T,new T.Scene(),{manifest:{channel:62,properties:{hips_order:0},items:Array.from({length:12},(_,pixel)=>({pixel,file:`${pixel}.png`}))},onStatus:s=>{if(s.ready>0&&s.ready<12&&s.displayChannel===62)partial=true;if(s.ready===12){clearTimeout(deadline);resolve();}}});});assert.equal(sky.stats.ready,12);assert.equal(requests,13);assert.equal(partial,true);}finally{sky?.dispose();Object.assign(globalThis,saved);}
});
