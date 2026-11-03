"""Export the head/oral structures listed in src/data/structures.json from Z-Anatomy to a .glb.

Run (with scripts embedded in the .blend disabled via -Y):
  blender -b -Y --factory-startup vendor-src/z-anatomy/Startup.blend \
      --python tools/export_head.py -- src/data/structures.json public/models/head.glb

Each mesh in the .glb is named after its structure id; bilateral structures become
<id>_L and <id>_R (patient's left/right). Curves (nerves, vessels, ducts) are converted
to tube meshes. Materials are not exported — the app colors meshes by layer.

Z-Anatomy has no separate superior alveolar, infraorbital, nasopalatine or greater
palatine nerves, so build_traced_nerves() makes them in memory (the .blend is not saved):
the infraorbital nerve is split off the end of the maxillary nerve curve, and the others
follow the arteries that run with them or end at the root tips of the teeth they supply.
These paths are approximate; structures.json marks them with "traced".

There are no third molars either, so build_third_molar() makes each one from a copy of
the second molar, a little smaller and moved one tooth further back (also "traced").
"""
import bpy
import json
import sys
from mathutils import Matrix, Vector

argv = sys.argv[sys.argv.index("--") + 1:]
data_path, out_path = argv[0], argv[1]
with open(data_path, encoding="utf-8") as f:
    structures = json.load(f)["structures"]

CURVE_RESOLUTION = 3       # points per curve segment (Z-Anatomy uses 12)
CURVE_BEVEL_RESOLUTION = 1  # tube roundness: 1 gives a hexagonal cross-section

NERVE_OFFSET = Vector((0, 0, 0.0008))  # lift traced nerves 0.8 mm off the artery they follow
SPLIT_AT = 8  # maxillary nerve point where it enters the orbit and becomes the infraorbital nerve


def curve_points(name, spline=0, start=0, end=None):
    o = bpy.data.objects[name]
    pts = o.data.splines[spline].bezier_points
    return [(o.matrix_world @ p.co, p.radius) for p in list(pts)[start:end]]


def root_tip(name):
    """Highest point of an upper tooth: the tip of its root (z is up)."""
    o = bpy.data.objects[name]
    return max((o.matrix_world @ v.co for v in o.data.vertices), key=lambda v: v.z)


def make_nerve(name, points, template):
    """Smooth tube through points [(position, radius)], styled like an existing nerve curve."""
    curve = bpy.data.curves.new(name, "CURVE")
    curve.dimensions = "3D"
    curve.bevel_depth = template.data.bevel_depth
    spline = curve.splines.new("BEZIER")
    spline.bezier_points.add(len(points) - 1)
    for bp, (co, radius) in zip(spline.bezier_points, points):
        bp.co = co
        bp.radius = radius
        bp.handle_left_type = bp.handle_right_type = "AUTO"
    obj = bpy.data.objects.new(name, curve)
    bpy.context.scene.collection.objects.link(obj)
    return obj


def build_traced_nerves(side):
    v2_name = f"Maxillary nerve{side}"
    v2 = bpy.data.objects[v2_name]
    v2.data = v2.data.copy()  # left and right share one curve in Z-Anatomy; edit this side only
    v2_path = curve_points(v2_name)
    along = lambda artery, start=0, end=None: [
        (co + NERVE_OFFSET, 0.5) for co, _ in curve_points(f"{artery}{side}", 0, start, end)
    ]
    tips = lambda *teeth: [(root_tip(f"{t}{side}"), 0.3) for t in teeth]

    # Infraorbital nerve: the end of the maxillary nerve curve plus its branches at the foramen.
    infraorbital = make_nerve(f"Infra-orbital nerve{side}", v2_path[SPLIT_AT:], v2)
    for spline in list(v2.data.splines)[1:]:
        copy = infraorbital.data.splines.new("BEZIER")
        copy.bezier_points.add(len(spline.bezier_points) - 1)
        for dst, src in zip(copy.bezier_points, spline.bezier_points):
            dst.co = v2.matrix_world @ src.co
            dst.radius = src.radius
            dst.handle_left_type = dst.handle_right_type = "AUTO"
        v2.data.splines.remove(spline)
    # Shorten V2 to end at the split point (shared with the infraorbital nerve so they join).
    # Bezier points can't be removed one by one, so the spline is rebuilt.
    keep = [(p.co.copy(), p.radius) for p in list(v2.data.splines[0].bezier_points)[: SPLIT_AT + 1]]
    v2.data.splines.remove(v2.data.splines[0])
    rebuilt = v2.data.splines.new("BEZIER")
    rebuilt.bezier_points.add(len(keep) - 1)
    for bp, (co, radius) in zip(rebuilt.bezier_points, keep):
        bp.co, bp.radius = co, radius
        bp.handle_left_type = bp.handle_right_type = "AUTO"

    # Posterior superior alveolar: from V2 in the pterygopalatine fossa, down the back of
    # the maxilla with the PSA artery, to the molar roots.
    make_nerve(f"Posterior superior alveolar nerve{side}",
               v2_path[5:6] + along("Posterior superior alveolar artery", 3)
               + tips("Upper second molar tooth", "Upper first molar tooth"), v2)
    # Middle superior alveolar: leaves the infraorbital nerve mid-canal, down to the premolars.
    make_nerve(f"Middle superior alveolar nerve{side}",
               v2_path[10:11] + tips("Upper second premolar", "Upper first premolar"), v2)
    # Anterior superior alveolar: leaves just before the foramen, down to canine and incisors.
    make_nerve(f"Anterior superior alveolar nerve{side}",
               v2_path[11:12] + tips("Upper canine", "Upper lateral incisor", "Upper medial incisor"), v2)
    # Greater palatine: down the pterygopalatine canal and forward along the hard palate
    # Both artery curves run the other way in Z-Anatomy, hence reversed; the ends where the
    # arteries branch off laterally or overlap each other are skipped.
    make_nerve(f"Greater palatine nerve{side}",
               v2_path[5:6] + list(reversed(along("Descending palatine artery", 0, 9)))
               + list(reversed(along("Greater palatine artery", 0, 6))), v2)
    # Nasopalatine: across the nasal septum to the incisive canal, with the septal arteries.
    make_nerve(f"Nasopalatine nerve{side}",
               v2_path[5:6] + along("Posterior septal branches of sphenopalatine artery"), v2)


THIRD_MOLAR_SCALE = 0.9  # third molars are usually a bit smaller than second molars
THIRD_MOLAR_STEP = 0.95  # distance behind the second molar, as a share of the 1st→2nd molar spacing


def centroid(obj):
    vs = [obj.matrix_world @ v.co for v in obj.data.vertices]
    return sum(vs, Vector()) / len(vs)


def build_third_molar(jaw, side):
    first = bpy.data.objects[f"{jaw} first molar tooth{side}"]
    second = bpy.data.objects[f"{jaw} second molar tooth{side}"]
    c1, c2 = centroid(first), centroid(second)
    third = second.copy()
    third.data = second.data.copy()
    third.name = f"{jaw} third molar tooth{side}"
    # Shrink around the second molar's center, then step back along the arch.
    shrink = Matrix.Translation(c2) @ Matrix.Scale(THIRD_MOLAR_SCALE, 4) @ Matrix.Translation(-c2)
    step = (c2 - c1) * THIRD_MOLAR_STEP
    step.z = 0  # stay level with the second molar instead of following its drop or rise
    third.matrix_world = Matrix.Translation(step) @ shrink @ second.matrix_world
    bpy.context.scene.collection.objects.link(third)


for side in (".l", ".r"):
    build_traced_nerves(side)
    for jaw in ("Upper", "Lower"):
        build_third_molar(jaw, side)

wanted = []  # (blender object name, output mesh name)
for s in structures:
    if s["bilateral"]:
        wanted += [(s["blender"] + ".l", s["id"] + "_L"), (s["blender"] + ".r", s["id"] + "_R")]
    else:
        wanted.append((s["blender"], s["id"]))

missing = [src for src, _ in wanted if src not in bpy.data.objects]
if missing:
    print("EXPORT ERROR: objects not found in .blend:", *missing, sep="\n  ")
    sys.exit(1)

for src, _ in wanted:
    o = bpy.data.objects[src]
    if o.type == "CURVE":
        o.data.resolution_u = CURVE_RESOLUTION
        o.data.bevel_resolution = CURVE_BEVEL_RESOLUTION

depsgraph = bpy.context.evaluated_depsgraph_get()
meshes = []
for src, name in wanted:
    o = bpy.data.objects[src]
    mesh = bpy.data.meshes.new_from_object(o.evaluated_get(depsgraph), depsgraph=depsgraph)
    mesh.transform(o.matrix_world)
    mesh.materials.clear()
    mesh.name = name
    meshes.append(mesh)
total_tris = sum(len(p.vertices) - 2 for m in meshes for p in m.polygons)

# Drop the rest of the body, then put only our meshes in the scene.
bpy.data.batch_remove(list(bpy.data.objects))
scene = bpy.context.scene
for mesh in meshes:
    scene.collection.objects.link(bpy.data.objects.new(mesh.name, mesh))

bpy.ops.export_scene.gltf(
    filepath=out_path,
    export_format="GLB",
    export_materials="NONE",
    export_yup=True,
    export_draco_mesh_compression_enable=True,
    export_draco_mesh_compression_level=7,
)
print(f"EXPORT OK: {len(wanted)} meshes, {total_tris} triangles -> {out_path}")
