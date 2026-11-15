/**
 * Pegamento ES Module para kernel WebAssembly de SKYO.
 * Carga skyo_wasm_bg.wasm y expone compare_flux con la misma firma que Rust.
 */
let wasmInstance = null;
let memory = null;

export async function init(moduleOrPath) {
  if (wasmInstance) return wasmInstance;
  let bytes;
  if (!moduleOrPath) {
    const wasmUrl = new URL('./skyo_wasm_bg.wasm', import.meta.url);
    if (typeof fetch === 'function') {
      try {
        const response = await fetch(wasmUrl);
        bytes = await response.arrayBuffer();
      } catch (_e) {
        // En Node.js o entornos sin servidor HTTP
        if (typeof process !== 'undefined' && process.versions?.node) {
          const { readFile } = await import('fs/promises');
          const { fileURLToPath } = await import('url');
          bytes = await readFile(fileURLToPath(wasmUrl));
        }
      }
    } else if (typeof process !== 'undefined' && process.versions?.node) {
      const { readFile } = await import('fs/promises');
      const { fileURLToPath } = await import('url');
      bytes = await readFile(fileURLToPath(wasmUrl));
    }
  } else if (moduleOrPath instanceof ArrayBuffer || ArrayBuffer.isView(moduleOrPath)) {
    bytes = moduleOrPath;
  }
  if (!bytes) throw new Error('No se pudo cargar skyo_wasm_bg.wasm');

  const compiled = await WebAssembly.instantiate(bytes);
  wasmInstance = compiled.instance || compiled;
  memory = wasmInstance.exports.memory;
  return wasmInstance;
}

export default init;

export function compare_flux(a, b, va, vb, valid, offset) {
  if (!wasmInstance) throw new Error('Kernel WASM no inicializado. Llama a init() primero.');
  const n = a.length;
  if (n === 0 || b.length !== n || va.length !== n || vb.length !== n || valid.length !== n) {
    return new Float32Array(0);
  }

  // Dimensionar memoria: 4*f32 arrays + 1*u8 array + 2*f32 out array
  const bytesNeeded = (n * 4 * 4) + Math.ceil(n / 4) * 4 + (2 * n * 4);
  const curBytes = memory.buffer.byteLength;
  if (curBytes < bytesNeeded) {
    const pagesNeeded = Math.ceil(bytesNeeded / 65536);
    const curPages = curBytes / 65536;
    memory.grow(pagesNeeded - curPages);
  }

  const ptrA = 0;
  const ptrB = ptrA + n * 4;
  const ptrVa = ptrB + n * 4;
  const ptrVb = ptrVa + n * 4;
  const ptrValid = ptrVb + n * 4;
  const ptrOut = Math.ceil((ptrValid + n) / 4) * 4;

  const memU8 = new Uint8Array(memory.buffer);
  const memF32 = new Float32Array(memory.buffer);

  memU8.set(new Uint8Array(a.buffer, a.byteOffset, a.byteLength), ptrA);
  memU8.set(new Uint8Array(b.buffer, b.byteOffset, b.byteLength), ptrB);
  memU8.set(new Uint8Array(va.buffer, va.byteOffset, va.byteLength), ptrVa);
  memU8.set(new Uint8Array(vb.buffer, vb.byteOffset, vb.byteLength), ptrVb);
  memU8.set(valid, ptrValid);
  memF32.fill(NaN, ptrOut / 4, (ptrOut / 4) + 2 * n);

  wasmInstance.exports.compare_flux_wasm(ptrA, ptrB, ptrVa, ptrVb, ptrValid, n, offset, ptrOut);
  return memF32.slice(ptrOut / 4, (ptrOut / 4) + 2 * n);
}
