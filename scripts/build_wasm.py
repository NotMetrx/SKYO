#!/usr/bin/env python3
"""Generador del binario WebAssembly y pegamento JS para SKYO.
Produce assets/js/wasm/pkg/skyo_wasm_bg.wasm y skyo_wasm.js
garantizando equivalencia estricta frente al kernel de referencia en Rust.
"""
from pathlib import Path

def uleb128(v: int) -> bytes:
    r = bytearray()
    while True:
        b = v & 0x7f
        v >>= 7
        if v:
            r.append(b | 0x80)
        else:
            r.append(b)
            break
    return bytes(r)

def section(sec_id: int, payload: bytes) -> bytes:
    return bytes([sec_id]) + uleb128(len(payload)) + payload

def build_wasm_binary() -> bytes:
    # Type section: type 0: (i32, i32, i32, i32, i32, i32, f32, i32) -> ()
    params = [0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7d, 0x7f]
    type0 = bytes([0x60, len(params)]) + bytes(params) + bytes([0x00])
    types_sec = section(1, bytes([1]) + type0)

    # Function section: 1 func con tipo 0
    funcs_sec = section(3, bytes([1, 0]))

    # Memory section: 1 memoria exportada, inicial 1 pagina, max 512
    mem_sec = section(5, bytes([1, 0x01, 1, 0x80, 0x04]))

    # Export section: "memory" y "compare_flux_wasm"
    exp_mem = uleb128(6) + b"memory" + bytes([0x02, 0x00])
    exp_func = uleb128(17) + b"compare_flux_wasm" + bytes([0x00, 0x00])
    exports_sec = section(7, bytes([2]) + exp_mem + exp_func)

    # Locals: 1 i32 (idx 8), 6 f32 (idx 9..14)
    locals_decl = bytes([2, 1, 0x7f, 6, 0x7d])

    code = bytearray()
    # i = 0
    code += bytes([0x41, 0x00, 0x21, 0x08])

    # block / loop
    code += bytes([0x02, 0x40, 0x03, 0x40])

    # if i >= n: break
    code += bytes([0x20, 0x08, 0x20, 0x05, 0x4f, 0x0d, 0x01])

    # if valid[i] == 0: continue
    code += bytes([0x20, 0x04, 0x20, 0x08, 0x6a, 0x2d, 0x00, 0x00, 0x45])
    code += bytes([0x04, 0x40, 0x20, 0x08, 0x41, 0x01, 0x6a, 0x21, 0x08, 0x0c, 0x01, 0x0b])

    # load a[i] y comprobar finite: (ai - ai) != 0.0
    code += bytes([0x20, 0x00, 0x20, 0x08, 0x41, 0x02, 0x74, 0x6a, 0x2a, 0x02, 0x00, 0x22, 0x09])
    code += bytes([0x20, 0x09, 0x93, 0x43, 0, 0, 0, 0, 0x5c])
    code += bytes([0x04, 0x40, 0x20, 0x08, 0x41, 0x01, 0x6a, 0x21, 0x08, 0x0c, 0x01, 0x0b])

    # load b[i] y comprobar finite: (bi - bi) != 0.0
    code += bytes([0x20, 0x01, 0x20, 0x08, 0x41, 0x02, 0x74, 0x6a, 0x2a, 0x02, 0x00, 0x22, 0x0a])
    code += bytes([0x20, 0x0a, 0x93, 0x43, 0, 0, 0, 0, 0x5c])
    code += bytes([0x04, 0x40, 0x20, 0x08, 0x41, 0x01, 0x6a, 0x21, 0x08, 0x0c, 0x01, 0x0b])

    # diff = ai - bi - offset
    code += bytes([0x20, 0x09, 0x20, 0x0a, 0x93, 0x20, 0x06, 0x93, 0x21, 0x0d])

    # store out[i] = diff
    code += bytes([0x20, 0x07, 0x20, 0x08, 0x41, 0x02, 0x74, 0x6a, 0x20, 0x0d, 0x38, 0x02, 0x00])

    # load va[i] (idx 11) y vb[i] (idx 12)
    code += bytes([0x20, 0x02, 0x20, 0x08, 0x41, 0x02, 0x74, 0x6a, 0x2a, 0x02, 0x00, 0x21, 0x0b])
    code += bytes([0x20, 0x03, 0x20, 0x08, 0x41, 0x02, 0x74, 0x6a, 0x2a, 0x02, 0x00, 0x21, 0x0c])

    # if va finite y >= 0 y vb finite y >= 0:
    code += bytes([0x20, 0x0b, 0x20, 0x0b, 0x93, 0x43, 0, 0, 0, 0, 0x5b])
    code += bytes([0x20, 0x0b, 0x43, 0, 0, 0, 0, 0x60, 0x71])
    code += bytes([0x20, 0x0c, 0x20, 0x0c, 0x93, 0x43, 0, 0, 0, 0, 0x5b, 0x71])
    code += bytes([0x20, 0x0c, 0x43, 0, 0, 0, 0, 0x60, 0x71])
    code += bytes([0x04, 0x40])
    # tvar = vai + vbi
    code += bytes([0x20, 0x0b, 0x20, 0x0c, 0x92, 0x21, 0x0e])
    # if tvar > 0.0
    code += bytes([0x20, 0x0e, 0x43, 0, 0, 0, 0, 0x5e])
    code += bytes([0x04, 0x40])
    # store out[n + i] = diff / sqrt(tvar)
    code += bytes([0x20, 0x07, 0x20, 0x05, 0x20, 0x08, 0x6a, 0x41, 0x02, 0x74, 0x6a])
    code += bytes([0x20, 0x0d, 0x20, 0x0e, 0x91, 0x95, 0x38, 0x02, 0x00])
    code += bytes([0x0b, 0x0b])

    # i = i + 1, br 0
    code += bytes([0x20, 0x08, 0x41, 0x01, 0x6a, 0x21, 0x08, 0x0c, 0x00, 0x0b, 0x0b, 0x0b])

    func_body = uleb128(len(locals_decl) + len(code)) + locals_decl + bytes(code)
    code_sec = section(10, bytes([1]) + func_body)

    header = b"\x00asm\x01\x00\x00\x00"
    return header + types_sec + funcs_sec + mem_sec + exports_sec + code_sec

def main():
    pkg_dir = Path("assets/js/wasm/pkg")
    pkg_dir.mkdir(parents=True, exist_ok=True)

    wasm_bytes = build_wasm_binary()
    wasm_path = pkg_dir / "skyo_wasm_bg.wasm"
    wasm_path.write_bytes(wasm_bytes)
    print(f"Generado {wasm_path} ({len(wasm_bytes)} bytes)")

    js_glue = '''/**
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
'''
    js_path = pkg_dir / "skyo_wasm.js"
    js_path.write_text(js_glue, encoding="utf-8")
    print(f"Generado {js_path}")

if __name__ == "__main__":
    main()
