/* tslint:disable */
/* eslint-disable */

export class FitsTexture {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    pixels(): Float32Array;
    rgba(): Uint8Array;
    detector: number;
    height: number;
    high: number;
    low: number;
    width: number;
}

export function compare_flux(a: Float32Array | number[], b: Float32Array | number[], va: Float32Array | number[], vb: Float32Array | number[], valid: Uint8Array | number[], offset: number): Float32Array;

export function fits_to_texture(bytes: Uint8Array | number[], zscale: boolean): FitsTexture;

export function float_plane_to_texture(bytes: Uint8Array | number[], width: number, height: number, scale: number, zero: number, zscale: boolean): FitsTexture;

export function hips_vertices(order: number, pixel: number, steps: number, radius: number): Float32Array;

export function sky_tiles(clip: Float64Array | number[], height: number, fov: number, max_order: number, origin: Float64Array | number[]): Uint32Array;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_fitstexture_free: (a: number, b: number) => void;
    readonly __wbg_get_fitstexture_detector: (a: number) => number;
    readonly __wbg_get_fitstexture_height: (a: number) => number;
    readonly __wbg_get_fitstexture_high: (a: number) => number;
    readonly __wbg_get_fitstexture_low: (a: number) => number;
    readonly __wbg_get_fitstexture_width: (a: number) => number;
    readonly __wbg_set_fitstexture_detector: (a: number, b: number) => void;
    readonly __wbg_set_fitstexture_height: (a: number, b: number) => void;
    readonly __wbg_set_fitstexture_high: (a: number, b: number) => void;
    readonly __wbg_set_fitstexture_low: (a: number, b: number) => void;
    readonly __wbg_set_fitstexture_width: (a: number, b: number) => void;
    readonly compare_flux: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number) => [number, number];
    readonly fits_to_texture: (a: number, b: number, c: number) => [number, number, number];
    readonly fitstexture_pixels: (a: number) => [number, number];
    readonly fitstexture_rgba: (a: number) => [number, number];
    readonly float_plane_to_texture: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => [number, number, number];
    readonly hips_vertices: (a: number, b: number, c: number, d: number) => [number, number];
    readonly sky_tiles: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => [number, number];
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
