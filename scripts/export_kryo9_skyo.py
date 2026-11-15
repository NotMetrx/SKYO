"""
Genera /home/jhoaolopez/Documentos/SKYO/assets/models/kryo9.glb a partir de
/home/jhoaolopez/Documentos/Agentia/kryo9/kryo9.blend añadiendo la pista NLA
Takeoff_Launch (despegue espacial para la transición #inicio -> #explorar de SKYO).

Uso:
  blender -b /home/jhoaolopez/Documentos/Agentia/kryo9/kryo9.blend \
    --python /home/jhoaolopez/Documentos/SKYO/scripts/export_kryo9_skyo.py
"""
import math
import sys
from pathlib import Path
import bpy
from mathutils import Euler, Vector

SKYO_ROOT = Path(__file__).resolve().parent.parent
OUT_GLB = SKYO_ROOT / "assets" / "models" / "kryo9.glb"


def ease_in_out_cubic(t: float) -> float:
    return 4.0 * t * t * t if t < 0.5 else 1.0 - ((-2.0 * t + 2.0) ** 3) / 2.0


def ease_out_back(t: float) -> float:
    c1 = 1.70158
    c3 = c1 + 1.0
    return 1.0 + c3 * ((t - 1.0) ** 3) + c1 * ((t - 1.0) ** 2)


def pose_reset(arm_obj):
    for pb in arm_obj.pose.bones:
        pb.rotation_mode = "QUATERNION"
        pb.location = (0.0, 0.0, 0.0)
        pb.rotation_quaternion = (1.0, 0.0, 0.0, 0.0)
        pb.scale = (1.0, 1.0, 1.0)


def set_pb_euler_deg(pb, rx: float, ry: float, rz: float):
    pb.rotation_mode = "QUATERNION"
    pb.rotation_quaternion = Euler(
        (math.radians(rx), math.radians(ry), math.radians(rz)), "XYZ"
    ).to_quaternion()


def anim_takeoff_launch(bones, t: float):
    """
    Coreografía 0 -> 1 en 1.83s @ 24fps (44 frames), centrada en masa para
    que Three.js guíe la trayectoria curva orbital sin deriva del pivote:
      0.00 - 0.18: Ignición (compresión elástica en órbita, alas atrás)
      0.18 - 0.72: Crucero supersónico orbital (brazos/alas perfil delta, botas atrás, visor al frente)
      0.72 - 1.00: Frenado retro-orbital (despliega alas y botas para aterrizaje suave en #explorar)
    """
    if t < 0.18:
        k = ease_in_out_cubic(t / 0.18)
        root_y = -0.095 * k
        root_pitch = 6.0 * k
        root_bank = 0.0
        torso_pitch = 6.0 * k
        head_pitch = -8.0 * k
        wing_sweep = -18.0 * k
        foot_drop = -0.04 * k
        foot_angle = -18.0 * k
        hand_r_y = 0.03 * k
        hand_r_z = -0.02 * k
        hand_r_pitch = 8.0 * k
        planet_in = 0.04 * k
        flare = 0.0
    elif t < 0.72:
        u = (t - 0.18) / 0.54
        ramp = min(1.0, u / 0.22)
        k = ease_out_back(ramp) if u < 0.22 else 1.0
        cruise = math.sin(u * math.pi)
        root_y = -0.095 * (1.0 - ramp) + 0.03 * cruise
        root_pitch = 6.0 * (1.0 - ramp) - 18.0 * min(1.0, k)
        root_bank = -5.0 * math.sin(u * math.pi * 2.0)
        torso_pitch = 6.0 * (1.0 - ramp) - 14.0 * min(1.0, k)
        head_pitch = -8.0 * (1.0 - ramp) - 18.0 * min(1.0, k)  # mira al frente durante el picado
        wing_sweep = -18.0 - 24.0 * ease_in_out_cubic(min(1.0, u * 1.4))
        foot_drop = -0.04 - 0.05 * min(1.0, k)
        foot_angle = -18.0 + 62.0 * ease_in_out_cubic(min(1.0, u * 1.6))  # botas propulsoras hacia atrás
        hand_r_y = 0.03 - 0.15 * min(1.0, k)
        hand_r_z = -0.02 - 0.07 * min(1.0, k)
        hand_r_pitch = -32.0 * min(1.0, k)
        planet_in = 0.045
        flare = cruise
    else:
        u = ease_in_out_cubic((t - 0.72) / 0.28)
        root_y = 0.04 * (1.0 - u)
        root_pitch = -18.0 * (1.0 - u) + 8.0 * u
        root_bank = 3.5 * math.sin(u * math.pi)
        torso_pitch = -14.0 * (1.0 - u) + 5.0 * u
        head_pitch = -18.0 * (1.0 - u) + 4.0 * u
        wing_sweep = -42.0 * (1.0 - u) + 10.0 * math.sin(u * math.pi)
        foot_drop = -0.09 * (1.0 - u)
        foot_angle = 44.0 * (1.0 - u) - 10.0 * u
        hand_r_y = -0.12 * (1.0 - u)
        hand_r_z = -0.09 * (1.0 - u)
        hand_r_pitch = -32.0 * (1.0 - u)
        planet_in = 0.045 * (1.0 - u)
        flare = 1.0 - u

    bones["Root"].location.y = root_y
    set_pb_euler_deg(bones["Root"], root_pitch, 0.0, root_bank)

    bones["Torso"].location.y = 0.02 * (1.0 if t >= 0.18 else -0.6)
    set_pb_euler_deg(bones["Torso"], torso_pitch, 0.0, 0.0)

    set_pb_euler_deg(bones["Head"], head_pitch, -5.0 * math.sin(t * math.pi * 2.0), 0.0)
    set_pb_euler_deg(bones["Eye_Reticle"], 0.0, 1440.0 * t, 0.0)

    # Alas solares hexagonales: perfil delta en vuelo supersónico, abiertas al frenar
    set_pb_euler_deg(bones["Wing_R"], 0.0, -wing_sweep * 0.72, -wing_sweep * 0.45)
    set_pb_euler_deg(bones["Wing_L"], 0.0, wing_sweep * 0.72, wing_sweep * 0.45)

    # Mano derecha aerodinámica atrás; izquierda protege el marcador Planet X
    bones["Hand_R"].location = Vector((0.03 * flare, hand_r_y, hand_r_z))
    set_pb_euler_deg(bones["Hand_R"], hand_r_pitch, 10.0 * flare, -18.0 * flare)

    bones["Hand_L"].location = Vector((-planet_in, -0.05 * flare, 0.03 * flare))
    set_pb_euler_deg(bones["Hand_L"], -14.0 * flare, 0.0, 8.0 * flare)

    # Botas propulsoras orientadas hacia atrás con zancada orbital escalonada
    bones["Foot_R"].location = Vector((0.0, 0.05 * flare, foot_drop + 0.03 * flare))
    bones["Foot_L"].location = Vector((0.0, -0.03 * flare, foot_drop))
    set_pb_euler_deg(bones["Foot_R"], foot_angle + 8.0 * flare, 0.0, 0.0)
    set_pb_euler_deg(bones["Foot_L"], foot_angle - 6.0 * flare, 0.0, 0.0)

    # Planet X gira veloz en órbita cercana
    bones["PlanetX_Pivot"].location = Vector((-planet_in * 0.65, 0.03 + 0.05 * flare, 0.0))
    set_pb_euler_deg(bones["PlanetX_Globe"], 0.0, 1440.0 * t, 0.0)
    set_pb_euler_deg(bones["PlanetX_Rings"], 14.0, -720.0 * t, 8.0)


def build_takeoff_track(arm_obj, total_frames=44, sample_step=2):
    arm_obj.animation_data_create()
    existing = [tr for tr in arm_obj.animation_data.nla_tracks if tr.name == "Takeoff_Launch"]
    for tr in existing:
        arm_obj.animation_data.nla_tracks.remove(tr)

    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.object.mode_set(mode="POSE")

    act = bpy.data.actions.get("Takeoff_Launch")
    if act:
        bpy.data.actions.remove(act)
    act = bpy.data.actions.new(name="Takeoff_Launch")
    arm_obj.animation_data.action = act
    pose_reset(arm_obj)

    frames = list(range(1, total_frames + 1, sample_step))
    if frames[-1] != total_frames + 1:
        frames.append(total_frames + 1)

    for f in frames:
        t_norm = min(1.0, (f - 1) / float(total_frames))
        pose_reset(arm_obj)
        anim_takeoff_launch(arm_obj.pose.bones, t_norm)
        for pb in arm_obj.pose.bones:
            pb.keyframe_insert("location", frame=f)
            pb.keyframe_insert("rotation_quaternion", frame=f)
            pb.keyframe_insert("scale", frame=f)

    track = arm_obj.animation_data.nla_tracks.new()
    track.name = "Takeoff_Launch"
    strip = track.strips.new("Takeoff_Launch", 1, act)
    if hasattr(arm_obj.animation_data, "action_slot") and arm_obj.animation_data.action_slot:
        strip.action_slot = arm_obj.animation_data.action_slot
    arm_obj.animation_data.action = None
    pose_reset(arm_obj)
    bpy.ops.object.mode_set(mode="OBJECT")

    for tr in arm_obj.animation_data.nla_tracks:
        tr.mute = False


def main():
    arm_obj = bpy.data.objects.get("KRYO9_Rig")
    if arm_obj is None:
        raise RuntimeError("No se encontró KRYO9_Rig en kryo9.blend")

    build_takeoff_track(arm_obj)

    # Preview frame opcional si se pasa --render-preview <path>
    if "--render-preview" in sys.argv:
        idx = sys.argv.index("--render-preview")
        preview_path = sys.argv[idx + 1]
        for tr in arm_obj.animation_data.nla_tracks:
            tr.mute = tr.name != "Takeoff_Launch"
        bpy.context.scene.frame_set(16)
        bpy.context.scene.render.filepath = preview_path
        bpy.ops.render.render(write_still=True)
        for tr in arm_obj.animation_data.nla_tracks:
            tr.mute = False

    col_char = bpy.data.collections.get("KRYO9_Character")
    if col_char is None:
        raise RuntimeError("No se encontró colección KRYO9_Character")

    bpy.ops.object.select_all(action="DESELECT")
    for obj in col_char.all_objects:
        obj.select_set(True)

    OUT_GLB.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(OUT_GLB),
        export_format="GLB",
        use_selection=True,
        export_yup=True,
        export_apply=True,
        export_draco_mesh_compression_enable=True,
        export_draco_mesh_compression_level=6,
        export_animations=True,
        export_animation_mode="NLA_TRACKS",
        export_bake_animation=True,
        export_nla_strips=True,
        export_image_format="AUTO",
        export_materials="EXPORT",
    )
    print(f"Exported KRYO-9 for SKYO: {OUT_GLB} ({OUT_GLB.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
