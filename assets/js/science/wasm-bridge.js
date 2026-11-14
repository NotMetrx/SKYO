/** Carga el kernel compilado, si existe; si no, fallback JS verificable. */
import {compareJavaScript} from './pipeline.js';
let wasm=null;
let state='JavaScript (WASM pendiente de compilar)';
export async function initKernel(){
  try {
    const mod=await import('../wasm/pkg/skyo_wasm.js');
    await mod.default();
    wasm=mod;
    state='Rust / WebAssembly';
  } catch(_error) {
    // Demo utilizable sin wasm-pack instalado; mensaje visible en la UI.
    wasm=null;
  }
  return state;
}
export function processDifference(a,b,va,vb,valid,offset){
  if(wasm?.compare_flux){
    const result=wasm.compare_flux(a,b,va,vb,valid,offset);
    if(result.length===2*a.length) return result;
  }
  return compareJavaScript(a,b,va,vb,valid,offset);
}
