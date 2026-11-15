/* @ts-self-types="./skyo_wasm.d.ts" */

export class FitsTexture {
    static __wrap(ptr) {
        const obj = Object.create(FitsTexture.prototype);
        obj.__wbg_ptr = ptr;
        FitsTextureFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        FitsTextureFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_fitstexture_free(ptr, 0);
    }
    /**
     * @returns {Float32Array}
     */
    pixels() {
        const ret = wasm.fitstexture_pixels(this.__wbg_ptr);
        var v1 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * @returns {Uint8Array}
     */
    rgba() {
        const ret = wasm.fitstexture_rgba(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * @returns {number}
     */
    get detector() {
        const ret = wasm.__wbg_get_fitstexture_detector(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get height() {
        const ret = wasm.__wbg_get_fitstexture_height(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get high() {
        const ret = wasm.__wbg_get_fitstexture_high(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get low() {
        const ret = wasm.__wbg_get_fitstexture_low(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get width() {
        const ret = wasm.__wbg_get_fitstexture_width(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @param {number} arg0
     */
    set detector(arg0) {
        wasm.__wbg_set_fitstexture_detector(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set height(arg0) {
        wasm.__wbg_set_fitstexture_height(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set high(arg0) {
        wasm.__wbg_set_fitstexture_high(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set low(arg0) {
        wasm.__wbg_set_fitstexture_low(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set width(arg0) {
        wasm.__wbg_set_fitstexture_width(this.__wbg_ptr, arg0);
    }
}
if (Symbol.dispose) FitsTexture.prototype[Symbol.dispose] = FitsTexture.prototype.free;

/**
 * @param {Float32Array | number[]} a
 * @param {Float32Array | number[]} b
 * @param {Float32Array | number[]} va
 * @param {Float32Array | number[]} vb
 * @param {Uint8Array | number[]} valid
 * @param {number} offset
 * @returns {Float32Array}
 */
export function compare_flux(a, b, va, vb, valid, offset) {
    const val6 = +offset;
    let ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3, ptr4, len4;
    try {
        ptr0 = passArrayF32ToWasm0(a, wasm.__wbindgen_malloc);
        len0 = WASM_VECTOR_LEN;
        ptr1 = passArrayF32ToWasm0(b, wasm.__wbindgen_malloc);
        len1 = WASM_VECTOR_LEN;
        ptr2 = passArrayF32ToWasm0(va, wasm.__wbindgen_malloc);
        len2 = WASM_VECTOR_LEN;
        ptr3 = passArrayF32ToWasm0(vb, wasm.__wbindgen_malloc);
        len3 = WASM_VECTOR_LEN;
        ptr4 = passArray8ToWasm0(valid, wasm.__wbindgen_malloc);
        len4 = WASM_VECTOR_LEN;
    } catch (e) {
        if (ptr4) { wasm.__wbindgen_free(ptr4, len4 * 1, 1); }
        if (ptr3) { wasm.__wbindgen_free(ptr3, len3 * 4, 4); }
        if (ptr2) { wasm.__wbindgen_free(ptr2, len2 * 4, 4); }
        if (ptr1) { wasm.__wbindgen_free(ptr1, len1 * 4, 4); }
        if (ptr0) { wasm.__wbindgen_free(ptr0, len0 * 4, 4); }
        throw e;
    }
    const ret = wasm.compare_flux(ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3, ptr4, len4, val6);
    var v7 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v7;
}

/**
 * @param {Uint8Array | number[]} bytes
 * @param {boolean} zscale
 * @returns {FitsTexture}
 */
export function fits_to_texture(bytes, zscale) {
    const val2 = +zscale;
    const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.fits_to_texture(ptr0, len0, val2);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return FitsTexture.__wrap(ret[0]);
}

/**
 * @param {Uint8Array | number[]} bytes
 * @param {number} width
 * @param {number} height
 * @param {number} scale
 * @param {number} zero
 * @param {boolean} zscale
 * @returns {FitsTexture}
 */
export function float_plane_to_texture(bytes, width, height, scale, zero, zscale) {
    const val2 = +width;
    const val3 = +height;
    const val4 = +scale;
    const val5 = +zero;
    const val6 = +zscale;
    const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.float_plane_to_texture(ptr0, len0, val2, val3, val4, val5, val6);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return FitsTexture.__wrap(ret[0]);
}

/**
 * @param {number} order
 * @param {number} pixel
 * @param {number} steps
 * @param {number} radius
 * @returns {Float32Array}
 */
export function hips_vertices(order, pixel, steps, radius) {
    const ret = wasm.hips_vertices(order, pixel, steps, radius);
    var v1 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v1;
}

/**
 * @param {Float64Array | number[]} clip
 * @param {number} height
 * @param {number} fov
 * @param {number} max_order
 * @param {Float64Array | number[]} origin
 * @returns {Uint32Array}
 */
export function sky_tiles(clip, height, fov, max_order, origin) {
    const val3 = +height;
    const val4 = +fov;
    const val5 = +max_order;
    let ptr0, len0, ptr1, len1;
    try {
        ptr0 = passArrayF64ToWasm0(clip, wasm.__wbindgen_malloc);
        len0 = WASM_VECTOR_LEN;
        ptr1 = passArrayF64ToWasm0(origin, wasm.__wbindgen_malloc);
        len1 = WASM_VECTOR_LEN;
    } catch (e) {
        if (ptr1) { wasm.__wbindgen_free(ptr1, len1 * 8, 8); }
        if (ptr0) { wasm.__wbindgen_free(ptr0, len0 * 8, 8); }
        throw e;
    }
    const ret = wasm.sky_tiles(ptr0, len0, val3, val4, val5, ptr1, len1);
    var v6 = getArrayU32FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v6;
}
function __wbg_get_imports() {
    const import0 = {
        __proto__: null,
        __wbg_Error_208446807d0d1e30: function(arg0, arg1) {
            const ret = Error(getStringFromWasm0(arg0, arg1));
            return ret;
        },
        __wbg___wbindgen_throw_4c88d8bf264fd984: function(arg0, arg1) {
            throw new Error(getStringFromWasm0(arg0, arg1));
        },
        __wbindgen_init_externref_table: function() {
            const table = wasm.__wbindgen_externrefs;
            table.set(0, undefined);
            table.set(1024, undefined);
            table.set(1025, null);
            table.set(1026, true);
            table.set(1027, false);
        },
    };
    return {
        __proto__: null,
        "./skyo_wasm_bg.js": import0,
    };
}

const FitsTextureFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_fitstexture_free(ptr, 1));

function getArrayF32FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getFloat32ArrayMemory0().subarray(ptr / 4, ptr / 4 + len);
}

function getArrayU32FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint32ArrayMemory0().subarray(ptr / 4, ptr / 4 + len);
}

function getArrayU8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

let cachedFloat32ArrayMemory0 = null;
function getFloat32ArrayMemory0() {
    if (cachedFloat32ArrayMemory0 === null || cachedFloat32ArrayMemory0.byteLength === 0) {
        cachedFloat32ArrayMemory0 = new Float32Array(wasm.memory.buffer);
    }
    return cachedFloat32ArrayMemory0;
}

let cachedFloat64ArrayMemory0 = null;
function getFloat64ArrayMemory0() {
    if (cachedFloat64ArrayMemory0 === null || cachedFloat64ArrayMemory0.byteLength === 0) {
        cachedFloat64ArrayMemory0 = new Float64Array(wasm.memory.buffer);
    }
    return cachedFloat64ArrayMemory0;
}

function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return decodeText(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

let cachedUint32ArrayMemory0 = null;
function getUint32ArrayMemory0() {
    if (cachedUint32ArrayMemory0 === null || cachedUint32ArrayMemory0.byteLength === 0) {
        cachedUint32ArrayMemory0 = new Uint32Array(wasm.memory.buffer);
    }
    return cachedUint32ArrayMemory0;
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1, 1) >>> 0;
    getUint8ArrayMemory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function passArrayF32ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 4, 4) >>> 0;
    getFloat32ArrayMemory0().set(arg, ptr / 4);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function passArrayF64ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 8, 8) >>> 0;
    getFloat64ArrayMemory0().set(arg, ptr / 8);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function takeFromExternrefTable0(idx) {
    const value = wasm.__wbindgen_externrefs.get(idx);
    wasm.__externref_table_dealloc(idx);
    return value;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true });
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(bytes) {
    numBytesDecoded += bytes.length;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true });
        cachedTextDecoder.decode();
        numBytesDecoded = bytes.length;
    }
    return cachedTextDecoder.decode(bytes);
}

let WASM_VECTOR_LEN = 0;

let wasmModule, wasmInstance, wasm;
function __wbg_finalize_init(instance, module) {
    wasmInstance = instance;
    wasm = instance.exports;
    wasmModule = module;
    cachedFloat32ArrayMemory0 = null;
    cachedFloat64ArrayMemory0 = null;
    cachedUint32ArrayMemory0 = null;
    cachedUint8ArrayMemory0 = null;
    wasm.__wbindgen_start();
    return wasm;
}

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (!module.ok) {
            throw new Error(`failed to fetch Wasm: ${module.status} ${module.statusText} fetching '${module.url}'`);
        }

        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            } catch (e) {
                const validResponse = expectedResponseType(module.type);

                if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else { throw e; }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);
    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };
        } else {
            return instance;
        }
    }

    function expectedResponseType(type) {
        switch (type) {
            case 'basic': case 'cors': case 'default': return true;
        }
        return false;
    }
}

function initSync(module) {
    if (wasm !== undefined) return wasm;


    if (module !== undefined) {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports();
    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }
    const instance = new WebAssembly.Instance(module, imports);
    return __wbg_finalize_init(instance, module);
}

let __wbg_init_promise;
async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;
    if (__wbg_init_promise === undefined) {
        __wbg_init_promise = __wbg_init_once(module_or_path);
        __wbg_init_promise.catch(() => { __wbg_init_promise = undefined; });
    }
    return __wbg_init_promise;
}

async function __wbg_init_once(module_or_path) {

    if (module_or_path !== undefined) {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (module_or_path === undefined) {
        module_or_path = new URL('skyo_wasm_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync, __wbg_init as default };

export const SKYO_BUILD=Object.freeze({"crateVersion":"0.1.0","generator":"wasm-bindgen 0.2.130","wasmSha256":"c61e0668dea746c4ddaacbbc9e7923c7faa1f7411994c6054d4c89ee3bf2cac2","cargoLockSha256":"cf21147e33938a9917caad44916d39505587d45e31c9e9c52f8034ccbd947d30"});
