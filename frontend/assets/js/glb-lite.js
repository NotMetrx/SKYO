/**
 * Cargador minimalista GLB (glTF 2.0 binario) para Three.js r128 sin dependencias externas.
 * Soporta mallas con POSITION, NORMAL, indices (UINT16/UINT32), transformaciones de nodo y materiales PBR/Emissive.
 */

const TYPE_COUNTS = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
const COMP_ARRAYS = {
  5120: Int8Array,
  5121: Uint8Array,
  5122: Int16Array,
  5123: Uint16Array,
  5125: Uint32Array,
  5126: Float32Array
};

function readAccessor(gltf, binBuffer, accIdx) {
  const acc = gltf.accessors[accIdx];
  const bv = gltf.bufferViews[acc.bufferView];
  const TypedArray = COMP_ARRAYS[acc.componentType];
  if (!TypedArray) throw new Error(`Unsupported componentType ${acc.componentType}`);
  const itemSize = TYPE_COUNTS[acc.type] || 1;
  const byteOffset = (bv.byteOffset || 0) + (acc.byteOffset || 0);
  const count = acc.count * itemSize;
  const stride = bv.byteStride || 0;

  if (!stride || stride === itemSize * TypedArray.BYTES_PER_ELEMENT) {
    return {
      array: new TypedArray(binBuffer, byteOffset, count),
      itemSize
    };
  }

  // De-interleave cuando byteStride difiere del tamaño empaquetado
  const out = new TypedArray(count);
  const view = new DataView(binBuffer);
  const bpe = TypedArray.BYTES_PER_ELEMENT;
  for (let i = 0; i < acc.count; i++) {
    const base = byteOffset + i * stride;
    for (let j = 0; j < itemSize; j++) {
      const off = base + j * bpe;
      if (acc.componentType === 5126) out[i * itemSize + j] = view.getFloat32(off, true);
      else if (acc.componentType === 5123) out[i * itemSize + j] = view.getUint16(off, true);
      else if (acc.componentType === 5125) out[i * itemSize + j] = view.getUint32(off, true);
    }
  }
  return { array: out, itemSize };
}

function buildMaterial(T, matDef) {
  if (!matDef) return new T.MeshStandardMaterial({ color: 0xffffff });
  const pbr = matDef.pbrMetallicRoughness || {};
  const base = pbr.baseColorFactor || [1, 1, 1, 1];
  const em = matDef.emissiveFactor || [0, 0, 0];
  const emStr = matDef.extensions?.KHR_materials_emissive_strength?.emissiveStrength ?? 1.0;

  const mat = new T.MeshStandardMaterial({
    color: new T.Color(base[0], base[1], base[2]),
    metalness: pbr.metallicFactor ?? 0.1,
    roughness: pbr.roughnessFactor ?? 0.5,
    emissive: new T.Color(em[0], em[1], em[2]),
    emissiveIntensity: emStr,
    side: matDef.doubleSided ? T.DoubleSide : T.FrontSide,
    transparent: base[3] < 1,
    opacity: base[3] ?? 1
  });
  mat.name = matDef.name || '';
  mat.userData.rawEmissiveStrength = emStr;
  return mat;
}

const INTERP_MODES = {
  LINEAR: 'InterpolateLinear',
  STEP: 'InterpolateDiscrete'
};

function toFloat32(arr, acc) {
  if (arr instanceof Float32Array) return arr;
  const out = new Float32Array(arr.length);
  let scale = 1;
  if (acc.normalized) {
    if (acc.componentType === 5120) scale = 1 / 127;
    else if (acc.componentType === 5121) scale = 1 / 255;
    else if (acc.componentType === 5122) scale = 1 / 32767;
    else if (acc.componentType === 5123) scale = 1 / 65535;
  }
  for (let i = 0; i < arr.length; i++) out[i] = arr[i] * scale;
  return out;
}

function buildAnimationClips(T, gltf, binBuffer, nodeObjs) {
  if (!gltf.animations?.length) return [];
  const clips = [];
  for (let a = 0; a < gltf.animations.length; a++) {
    const animDef = gltf.animations[a];
    const tracks = [];
    for (const ch of animDef.channels || []) {
      const targetNode = ch.target?.node;
      const path = ch.target?.path;
      const nodeObj = targetNode !== undefined ? nodeObjs[targetNode] : null;
      if (!nodeObj || !nodeObj.name || !path) continue;

      const sampler = animDef.samplers[ch.sampler];
      if (!sampler) continue;
      const inAcc = gltf.accessors[sampler.input];
      const outAcc = gltf.accessors[sampler.output];
      const times = toFloat32(readAccessor(gltf, binBuffer, sampler.input).array, inAcc);
      const values = toFloat32(readAccessor(gltf, binBuffer, sampler.output).array, outAcc);
      const interp = T[INTERP_MODES[sampler.interpolation] || 'InterpolateLinear'];

      if (path === 'translation') {
        tracks.push(new T.VectorKeyframeTrack(`${nodeObj.name}.position`, times, values, interp));
      } else if (path === 'scale') {
        tracks.push(new T.VectorKeyframeTrack(`${nodeObj.name}.scale`, times, values, interp));
      } else if (path === 'rotation') {
        tracks.push(new T.QuaternionKeyframeTrack(`${nodeObj.name}.quaternion`, times, values, interp));
      }
    }
    if (tracks.length) {
      clips.push(new T.AnimationClip(animDef.name || `Clip_${a}`, -1, tracks));
    }
  }
  return clips;
}

export async function loadGlbGroup(T, url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`No se pudo cargar GLB (${res.status}): ${url}`);
  const buffer = await res.arrayBuffer();
  const dv = new DataView(buffer);

  if (dv.getUint32(0, true) !== 0x46546c67) {
    throw new Error('Archivo GLB inválido');
  }

  let offset = 12;
  let gltf = null;
  let binBuffer = null;

  while (offset < buffer.byteLength) {
    const chunkLen = dv.getUint32(offset, true);
    const chunkType = dv.getUint32(offset + 4, true);
    const chunkStart = offset + 8;
    if (chunkType === 0x4e4f534a) {
      const text = new TextDecoder().decode(new Uint8Array(buffer, chunkStart, chunkLen));
      gltf = JSON.parse(text);
    } else if (chunkType === 0x004e4942) {
      binBuffer = buffer.slice(chunkStart, chunkStart + chunkLen);
    }
    offset = chunkStart + chunkLen;
  }

  if (!gltf || !binBuffer) throw new Error('GLB incompleto');

  const materials = (gltf.materials || []).map(m => buildMaterial(T, m));
  const root = new T.Group();
  const nodeObjs = [];
  const sceneIdx = gltf.scene ?? 0;
  const rootNodes = gltf.scenes?.[sceneIdx]?.nodes || gltf.nodes.map((_, i) => i);

  function buildNode(nodeIdx) {
    if (nodeObjs[nodeIdx]) return nodeObjs[nodeIdx];
    const def = gltf.nodes[nodeIdx];
    const obj = new T.Group();
    obj.name = def.name || `Node_${nodeIdx}`;
    nodeObjs[nodeIdx] = obj;
    if (def.translation) obj.position.fromArray(def.translation);
    if (def.rotation) obj.quaternion.fromArray(def.rotation);
    if (def.scale) obj.scale.fromArray(def.scale);

    if (def.mesh !== undefined) {
      const meshDef = gltf.meshes[def.mesh];
      for (const prim of meshDef.primitives) {
        const geom = new T.BufferGeometry();
        if (prim.attributes.POSITION !== undefined) {
          const pos = readAccessor(gltf, binBuffer, prim.attributes.POSITION);
          geom.setAttribute('position', new T.BufferAttribute(pos.array, pos.itemSize));
        }
        if (prim.attributes.NORMAL !== undefined) {
          const norm = readAccessor(gltf, binBuffer, prim.attributes.NORMAL);
          geom.setAttribute('normal', new T.BufferAttribute(norm.array, norm.itemSize));
        }
        if (prim.indices !== undefined) {
          const idx = readAccessor(gltf, binBuffer, prim.indices);
          geom.setIndex(new T.BufferAttribute(idx.array, 1));
        }
        const mat = prim.material !== undefined ? materials[prim.material] : buildMaterial(T, null);
        const mesh = new T.Mesh(geom, mat);
        mesh.name = `${obj.name}_mesh`;
        obj.add(mesh);
      }
    }

    if (def.children) {
      for (const childIdx of def.children) obj.add(buildNode(childIdx));
    }
    return obj;
  }

  for (const nIdx of rootNodes) root.add(buildNode(nIdx));
  root.userData.clips = buildAnimationClips(T, gltf, binBuffer, nodeObjs);
  return root;
}
