/** Carga el kernel compilado, si existe; si no, fallback JS verificable. */
import {compareJavaScript} from './pipeline.js';
import {sha256} from './contracts.js';
let wasm=null;
let state='JavaScript (WASM pendiente de compilar)';
export async function initKernel(){
  let timer;
  try {
    const loading=(async()=>{
    const url = new URL('assets/js/science/wasm/pkg/skyo_wasm.js', new URL(import.meta.env.PROD ? '../' : '../../../', import.meta.url)).href;
    const mod=await import(/* @vite-ignore */ url);
    if(!mod.SKYO_BUILD?.wasmSha256)throw Error('Falta identidad del kernel compilado');
    const response=await fetch(new URL('skyo_wasm_bg.wasm',url));
    if(!response.ok)throw Error('No se pudo recuperar el binario WASM');
    const bytes=await response.arrayBuffer();
    if(await sha256(bytes)!==mod.SKYO_BUILD.wasmSha256)throw Error('Hash del kernel WASM incorrecto');
    await mod.default({module_or_path:bytes});
    return mod;
    })();
    const mod=await Promise.race([loading,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Presupuesto de carga WASM agotado')),3000);})]);
    wasm=mod;
    state=`Rust / WebAssembly ${mod.SKYO_BUILD.crateVersion} sha256:${mod.SKYO_BUILD.wasmSha256}`;
  } catch(_error) {
    // Demo utilizable sin wasm-pack instalado; mensaje visible en la UI.
    wasm=null;
    state='JavaScript (WASM no disponible)';
  }finally{clearTimeout(timer);}
  return state;
}
export function processDifference(a,b,va,vb,valid,offset){
  if(wasm?.compare_flux){
    try{
      const result=wasm.compare_flux(a,b,va,vb,valid,offset);
      if(!(result instanceof Float32Array)||result.length!==2*a.length)throw Error('Salida WASM incompatible');
      return result;
    }catch(error){wasm=null;state='JavaScript (fallback por fallo de WASM)';}
  }
  return compareJavaScript(a,b,va,vb,valid,offset);
}
export function kernelStatus(){return state;}
export function planSky(clip,height,fov,maxOrder,origin){return wasm?.sky_tiles?.(clip,height,fov,maxOrder,origin)??null;}
export function skyVertices(order,pixel,steps,radius){return wasm?.hips_vertices?.(order,pixel,steps,radius)??null;}
export function processFitsTexture(bytes,zscale=true){
  if(!wasm?.fits_to_texture)throw Error('El visor FITS requiere el kernel Rust/WASM actualizado. Reintenta la carga.');
  const texture=wasm.fits_to_texture(bytes,zscale);
  try{return {width:texture.width,height:texture.height,detector:texture.detector,low:texture.low,high:texture.high,rgba:texture.rgba()};}
  finally{texture.free();}
}
export function processFloatPlane(bytes,width,height,scale=1,zero=0){
  if(!wasm?.float_plane_to_texture)throw Error('Kernel Rust de planos no disponible');
  const t=wasm.float_plane_to_texture(bytes,width,height,scale,zero,true);
  try{return {width:t.width,height:t.height,rgba:t.rgba(),pixels:t.pixels(),low:t.low,high:t.high};}
  finally{t.free();}
}
