"""
Generador procedural del Plano Focal Infrarrojo SPHEREx (FPA 2x3 H2RG + LVF) en Blender.
Produce assets/models/focal_plane.glb optimizado para Three.js (glb-lite / GLTFLoader).

Dimensiones en Blender (eje X ancho, eje Z alto, frente mirando hacia -Y):
- Ventana óptica activa: X in [-3.0, +3.0], Z in [-2.0, +2.0] (escala 1:10 respecto a Three.js fw=30, fh=20)
- Chasis exterior criogénico: X in [-3.58, +3.58], Z in [-2.52, +2.52]
"""

import math
import os
import bpy
import bmesh
from mathutils import Vector, Matrix


OUTPUT_GLB = "/home/emi/Documentos/SKYO/frontend/assets/models/focal_plane.glb"


def clear_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for block in (bpy.data.meshes, bpy.data.materials, bpy.data.collections):
        for item in list(block):
            if item.users == 0:
                block.remove(item)


def reset_world(scene):
    world = scene.world
    if not world:
        world = bpy.data.worlds.new("World")
        scene.world = world
    world.use_nodes = True
    nodes = world.node_tree.nodes
    nodes.clear()
    out = nodes.new("ShaderNodeOutputWorld")
    bg = nodes.new("ShaderNodeBackground")
    bg.inputs["Color"].default_value = (0.015, 0.022, 0.036, 1.0)
    bg.inputs["Strength"].default_value = 0.6
    world.node_tree.links.new(bg.outputs["Background"], out.inputs["Surface"])


def make_pbr_mat(name, base_rgba, metallic=0.5, roughness=0.35, emissive_rgb=(0.0, 0.0, 0.0), emissive_strength=0.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()

    out = nodes.new("ShaderNodeOutputMaterial")
    bsdf = nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Base Color"].default_value = base_rgba
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    if "Alpha" in bsdf.inputs:
        bsdf.inputs["Alpha"].default_value = base_rgba[3]
    if "Emission Color" in bsdf.inputs:
        bsdf.inputs["Emission Color"].default_value = (*emissive_rgb, 1.0)
    if "Emission Strength" in bsdf.inputs:
        bsdf.inputs["Emission Strength"].default_value = emissive_strength

    links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return mat


def create_mesh_obj(name, bm, mat, collection):
    mesh = bpy.data.meshes.new(name)
    bm.normal_update()
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    if mat:
        obj.data.materials.append(mat)
    collection.objects.link(obj)
    return obj


def add_box(bm, cx, cy, cz, sx, sy, sz, bevel_width=0.0):
    mat = Matrix.Translation((cx, cy, cz)) @ Matrix.Diagonal((sx, sy, sz, 1.0))
    ret = bmesh.ops.create_cube(bm, size=1.0, matrix=mat)
    if bevel_width > 0:
        verts = ret["verts"]
        edges = list({e for v in verts for e in v.link_edges})
        bmesh.ops.bevel(bm, geom=edges, offset=bevel_width, segments=2, affect='EDGES', clamp_overlap=True)
    return ret["verts"]


def add_frame_rect(bm, cx, cy, cz, outer_w, outer_h, inner_w, inner_h, depth, bevel=0.015):
    """Construye un marco rectangular hueco mediante 4 barras biseladas."""
    side_w = (outer_w - inner_w) * 0.5
    top_h = (outer_h - inner_h) * 0.5
    # Barra superior e inferior (ancho completo)
    add_box(bm, cx, cy, cz + (inner_h + top_h) * 0.5, outer_w, depth, top_h, bevel)
    add_box(bm, cx, cy, cz - (inner_h + top_h) * 0.5, outer_w, depth, top_h, bevel)
    # Barras izquierda y derecha
    add_box(bm, cx - (inner_w + side_w) * 0.5, cy, cz, side_w, depth, inner_h, bevel)
    add_box(bm, cx + (inner_w + side_w) * 0.5, cy, cz, side_w, depth, inner_h, bevel)


def build_focal_plane():
    clear_scene()
    scene = bpy.context.scene
    reset_world(scene)

    col = bpy.data.collections.new("SPHEREx_FPA")
    scene.collection.children.link(col)

    # Materiales PBR
    mat_titanium = make_pbr_mat(
        "FPA_Titanium_Anodized",
        (0.055, 0.082, 0.125, 1.0),
        metallic=0.88,
        roughness=0.28,
        emissive_rgb=(0.02, 0.05, 0.09),
        emissive_strength=0.15,
    )
    mat_bezel = make_pbr_mat(
        "FPA_ColdShield_Gunmetal",
        (0.11, 0.15, 0.21, 1.0),
        metallic=0.92,
        roughness=0.22,
        emissive_rgb=(0.04, 0.10, 0.18),
        emissive_strength=0.18,
    )
    mat_ceramic = make_pbr_mat(
        "FPA_Ceramic_Carrier",
        (0.72, 0.75, 0.80, 1.0),
        metallic=0.15,
        roughness=0.35,
    )
    mat_gold = make_pbr_mat(
        "FPA_Gold_WireBond",
        (1.0, 0.78, 0.28, 1.0),
        metallic=1.0,
        roughness=0.18,
    )
    mat_copper = make_pbr_mat(
        "FPA_Cryo_Copper",
        (0.92, 0.48, 0.28, 1.0),
        metallic=1.0,
        roughness=0.25,
    )
    mat_fiducial = make_pbr_mat(
        "FPA_Laser_Fiducial",
        (0.36, 0.76, 1.0, 1.0),
        metallic=0.1,
        roughness=0.2,
        emissive_rgb=(0.36, 0.76, 1.0),
        emissive_strength=1.35,
    )
    mat_fiducial_cyan = make_pbr_mat(
        "FPA_Laser_Fiducial_Cyan",
        (0.0, 0.90, 0.82, 1.0),
        metallic=0.1,
        roughness=0.2,
        emissive_rgb=(0.0, 0.90, 0.82),
        emissive_strength=1.55,
    )

    # 1. Chasis Criogénico Principal (Cold Plate + Orejetas de montaje)
    bm_chassis = bmesh.new()
    add_frame_rect(bm_chassis, 0.0, 0.12, 0.0, 6.96, 4.92, 6.02, 4.02, 0.24, bevel=0.025)

    # Orejetas laterales de flexión criogénica
    for sx in (-1, 1):
        for sz in (-1, 1):
            # Orejeta principal en esquinas exteriores
            add_box(bm_chassis, sx * 3.55, 0.14, sz * 1.95, 0.42, 0.20, 0.56, bevel_width=0.018)
        # Disipadores laterales centrales
        add_box(bm_chassis, sx * 3.56, 0.12, 0.0, 0.34, 0.24, 1.65, bevel_width=0.015)

    # Costillas internas del mosaico 2x3 (delgadas para dejar visibilidad estelar)
    add_box(bm_chassis, 0.0, 0.06, 0.0, 6.04, 0.12, 0.065, bevel_width=0.008)
    for rx in (-1.0, 1.0):
        add_box(bm_chassis, rx, 0.06, 0.0, 0.065, 0.12, 4.04, bevel_width=0.008)

    create_mesh_obj("FPA_ColdPlate_Chassis", bm_chassis, mat_titanium, col)

    # 2. Bisel Escalonado del Escudo Frío (Cold Shield Bezel)
    bm_bezel = bmesh.new()
    add_frame_rect(bm_bezel, 0.0, -0.02, 0.0, 6.56, 4.52, 6.06, 4.06, 0.11, bevel=0.018)
    # Pestañas biseladas de refuerzo en esquinas (Corner brackets 3D)
    for sx in (-1, 1):
        for sz in (-1, 1):
            add_box(bm_bezel, sx * 3.22, -0.08, sz * 2.18, 0.58, 0.08, 0.12, bevel_width=0.01)
            add_box(bm_bezel, sx * 3.22, -0.08, sz * 1.96, 0.12, 0.08, 0.54, bevel_width=0.01)

    create_mesh_obj("FPA_ColdShield_Bezel", bm_bezel, mat_bezel, col)

    # 3. Portachips Cerámicos, Micro-Pads de Oro y Tornillería Hexagonal
    bm_ceramic = bmesh.new()
    bm_gold = bmesh.new()
    bm_copper = bmesh.new()

    # Tornillos de montaje y cintas térmicas criogénicas
    for sx in (-1, 1):
        for sz in (-1, 1):
            mat_cyl = Matrix.Translation((sx * 3.60, 0.02, sz * 1.95)) @ Matrix.Rotation(math.pi / 2, 4, 'X')
            bmesh.ops.create_cone(
                bm_gold,
                cap_ends=True,
                cap_tris=False,
                segments=6,
                radius1=0.085,
                radius2=0.085,
                depth=0.10,
                matrix=mat_cyl,
            )
        # Cintas de cobre criogénicas en laterales (3 láminas por lado)
        for k in (-0.42, 0.0, 0.42):
            add_box(bm_copper, sx * 3.70, 0.12, k, 0.16, 0.14, 0.28, bevel_width=0.008)

    # Sub-marcos cerámicos + pines de oro para los 6 detectores (D1..D6)
    bay_centers = [
        (-2.0, 1.0), (0.0, 1.0), (2.0, 1.0),
        (-2.0, -1.0), (0.0, -1.0), (2.0, -1.0),
    ]
    for (bx, bz) in bay_centers:
        # Rieles cerámicos superior e inferior dentro de la bahía
        for sz in (-1, 1):
            add_box(bm_ceramic, bx, 0.03, bz + sz * 0.90, 1.78, 0.07, 0.07, bevel_width=0.006)
            # 8 micro-pads de oro por borde
            for p in range(8):
                px = bx - 0.72 + p * (1.44 / 7.0)
                add_box(bm_gold, px, -0.01, bz + sz * 0.895, 0.055, 0.03, 0.04, bevel_width=0.003)

    create_mesh_obj("FPA_Ceramic_Carriers", bm_ceramic, mat_ceramic, col)
    create_mesh_obj("FPA_Gold_WireBonds", bm_gold, mat_gold, col)
    create_mesh_obj("FPA_Cryo_ThermalStraps", bm_copper, mat_copper, col)

    # 4. Marcas Fiduciales Láser (Vernier + Cruces de alineación óptica)
    bm_fid = bmesh.new()
    bm_fid_cyan = bmesh.new()

    # Ticks Vernier horizontales (arriba y abajo del bisel)
    for i in range(-15, 16):
        x = i * 0.20
        is_major = (i % 5 == 0)
        tick_h = 0.09 if is_major else 0.045
        target_bm = bm_fid_cyan if is_major else bm_fid
        for sz in (-1, 1):
            add_box(target_bm, x, -0.085, sz * 2.18, 0.016, 0.012, tick_h)

    # Ticks Vernier verticales (izquierda y derecha del bisel)
    for j in range(-10, 11):
        z = j * 0.20
        is_major = (j % 5 == 0)
        tick_w = 0.09 if is_major else 0.045
        target_bm = bm_fid_cyan if is_major else bm_fid
        for sx in (-1, 1):
            add_box(target_bm, sx * 3.18, -0.085, z, tick_w, 0.012, 0.016)

    create_mesh_obj("FPA_Vernier_Ticks", bm_fid, mat_fiducial, col)
    create_mesh_obj("FPA_Vernier_Majors", bm_fid_cyan, mat_fiducial_cyan, col)

    # 5. Los 6 Detectores Individuales H2RG + Filtros Ópticos LVF (D1..D6)
    #    D1-D3: IR Corto (0.75 - 2.41 um) -> azules/cianes
    #    D4-D6: IR Largo (2.42 - 5.01 um) -> violetas/ámbar/rubí
    detector_specs = [
        # (name, cx, cz, rgba_glass, emissive_rgb)
        ("Detector_D1", -2.0,  1.0, (0.28, 0.56, 1.00, 0.16), (0.22, 0.55, 1.00)),
        ("Detector_D2",  0.0,  1.0, (0.18, 0.78, 1.00, 0.16), (0.12, 0.80, 1.00)),
        ("Detector_D3",  2.0,  1.0, (0.06, 0.90, 0.82, 0.16), (0.00, 0.90, 0.82)),
        ("Detector_D4", -2.0, -1.0, (0.62, 0.44, 1.00, 0.16), (0.68, 0.45, 1.00)),
        ("Detector_D5",  0.0, -1.0, (0.85, 0.48, 0.96, 0.16), (0.82, 0.42, 0.96)),
        ("Detector_D6",  2.0, -1.0, (1.00, 0.62, 0.32, 0.16), (1.00, 0.58, 0.28)),
    ]

    for det_name, dx, dz, rgba_glass, em_rgb in detector_specs:
        # Pane óptico translúcido LVF (permite ver el campo de estrellas ICRS detrás)
        mat_lvf = make_pbr_mat(
            f"Mat_{det_name}_LVF",
            rgba_glass,
            metallic=0.22,
            roughness=0.09,
            emissive_rgb=em_rgb,
            emissive_strength=0.28,
        )
        bm_pane = bmesh.new()
        add_box(bm_pane, dx, 0.04, dz, 1.84, 0.016, 1.72, bevel_width=0.0)
        create_mesh_obj(det_name, bm_pane, mat_lvf, col)

        # Aro perimetral fino luminoso de calibración alrededor del detector
        mat_rim = make_pbr_mat(
            f"Mat_{det_name}_Rim",
            (*em_rgb, 1.0),
            metallic=0.45,
            roughness=0.2,
            emissive_rgb=em_rgb,
            emissive_strength=0.95,
        )
        bm_rim = bmesh.new()
        add_frame_rect(bm_rim, dx, 0.015, dz, 1.88, 1.76, 1.84, 1.72, 0.025, bevel=0.004)
        create_mesh_obj(f"{det_name}_Rim", bm_rim, mat_rim, col)

    # Exportar a GLB binario optimizado (glTF 2.0 estándar, Y-up)
    os.makedirs(os.path.dirname(OUTPUT_GLB), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=OUTPUT_GLB,
        export_format='GLB',
        export_yup=True,
        export_apply=True,
        export_materials='EXPORT',
        export_lights=False,
        export_cameras=False,
    )

    total_verts = sum(len(o.data.vertices) for o in col.objects if o.type == 'MESH')
    total_faces = sum(len(o.data.polygons) for o in col.objects if o.type == 'MESH')
    size_kb = os.path.getsize(OUTPUT_GLB) / 1024.0
    print(f"FPA exportado: {OUTPUT_GLB} ({size_kb:.1f} KB) | Objetos: {len(col.objects)} | Verts: {total_verts} | Caras: {total_faces}")


if __name__ == "__main__":
    build_focal_plane()
