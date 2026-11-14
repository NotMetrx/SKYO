/** Rust optional: Vite ignores the URL import; wasm-pack output is copied via public/. */
import {compareJavaScript} from './pipeline.js';
let wasm=null;
let state='JavaScript (fallback verificable)';
export async function initKernel(){
  try{
    // Vite replaces BASE_URL for both dev and production, including nested base paths.
    const url=new URL('../wasm/pkg/skyo_wasm.js',self.location.href).href;
    const mod=await import(/* @vite-ignore */ url);
    await mod.default();
    wasm=mod;
    state='Rust / WebAssembly';
  }catch(_error){wasm=null;}
  return state;
}
export function processDifference(a,b,va,vb,valid,offset){
  if(wasm?.compare_flux){
    const output=wasm.compare_flux(a,b,va,vb,valid,offset);
    if(output.length===2*a.length)return output;
  }
  return compareJavaScript(a,b,va,vb,valid,offset);
}
