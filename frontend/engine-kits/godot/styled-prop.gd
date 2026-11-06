@tool
extends Node3D

@export_file("*.json") var material_manifest: String

func _ready() -> void:
    var folder: String = get_script().resource_path.get_base_dir()
    var manifest_path: String = folder.path_join(material_manifest)
    if not FileAccess.file_exists(manifest_path):
        push_warning("The prop's material description could not be found: " + manifest_path)
        return
    var manifest = JSON.parse_string(FileAccess.get_file_as_string(manifest_path))
    if not manifest is Dictionary:
        return
    var levels: Dictionary = manifest.get("levels", {})
    for child in get_children():
        if levels.has(str(child.name)):
            var level: Dictionary = levels[str(child.name)]
            _dress(child, level, folder)

func _dress(node: Node, level: Dictionary, folder: String) -> void:
    if node is MeshInstance3D and node.mesh != null:
        # These plants already have authored detail levels. Automatic triangle
        # reduction can collapse disconnected leaf cards into an almost bare tree.
        node.lod_bias = 128.0
        var surfaces: Array = level["meshes"].get(str(node.name), [])
        # A one-object GLB may import its mesh as the scene root, renamed to LOD0.
        if surfaces.is_empty() and level["meshes"].size() == 1:
            surfaces = level["meshes"].values()[0]
        for surface in range(min(surfaces.size(), node.mesh.get_surface_count())):
            if surfaces[surface] != "":
                var material = load(folder.path_join(surfaces[surface]))
                if material is Material:
                    node.set_surface_override_material(surface, material)
        node.visibility_range_begin = float(level["begin"])
        node.visibility_range_end = float(level["end"])
    for child in node.get_children():
        _dress(child, level, folder)
