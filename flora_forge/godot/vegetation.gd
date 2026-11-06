@tool
extends Node3D
## Generated Flora Forge asset. Assigns leaf surfaces and GPU visibility ranges.
@export var foliage_material: ShaderMaterial
@export var bark_material: ShaderMaterial
@export var lod_distances := Vector3(18.0, 40.0, 90.0)
@export var enable_lod := true

func _ready() -> void:
    for level in range(3):
        var branch := get_node_or_null("LOD%d" % level)
        if branch:
            _configure(branch, level)

func _configure(node: Node, level: int) -> void:
    if node is MeshInstance3D:
        var mesh_node := node as MeshInstance3D
        for surface in range(mesh_node.mesh.get_surface_count()):
            var original := mesh_node.mesh.surface_get_material(surface)
            if original and original.resource_name.begins_with("FF_Leaves"):
                mesh_node.set_surface_override_material(surface, foliage_material)
            elif original and original.resource_name.begins_with("FF_Bark") and bark_material:
                mesh_node.set_surface_override_material(surface, bark_material)
        if enable_lod:
            mesh_node.visibility_range_begin = 0.0 if level == 0 else lod_distances[level - 1]
            mesh_node.visibility_range_end = lod_distances[level]
            mesh_node.visibility_range_begin_margin = 0.0
            mesh_node.visibility_range_end_margin = 0.0
        else:
            mesh_node.visible = level == 0
        # Wind extends beyond the static imported mesh AABB.
        mesh_node.extra_cull_margin = 1.0
    for child in node.get_children():
        _configure(child, level)
