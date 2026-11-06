# Ghibli paint and the Blender reference

Reference inspected: `myassets/Rei_treeLeavesGN_samples.blend`. The original file
was opened read-only with automatic script execution disabled. Its three external
leaf masks were resolved to the existing `myassets/TreeLeaves*.png` files for a
reference render. No Blender geometry, baked texture or add-on code is shipped.

## Leaves

`LeavesSphereGN` captures the source surface's directions and samples the nearest
surface into the `LeavesNormal_GN` attribute. The leaf planes' actual facing does
not control their painted light. The leaf materials multiply this attribute by
two colour noises, at scales 2.3 and 5.9, with distortion 2.0 and 0.4.

`LeavesCol`, `LeavesCol02` and `LeavesCol03` share the same structure. Two diffuse
responses become colours through Shader to RGB. The ramps reach white at
0.27727279 and 0.28636363. Their direction offsets are (-0.16, 0, 0.06) and
(0, 0.09, 0) in Blender's coordinates. The shadows use Linear Light blue,
combined with Lighten; a second Lighten adds the hue-shifted, more saturated
highlight. The leaf image controls opacity rather than the green pigment.

The app now uses rounded clump directions for Ghibli cards, keeping the same
direction on both windings, with procedural perturbation and those two ramps in
the material. Blender's Z-up directions are mapped to the app's Y-up coordinates.
The strength and hue of the blue layer adapt to the chosen pigment so darker
green palettes keep a blue-green shadow instead of clipping to black.
Bush interiors use leaf lighting too. Authored directions are written into the
GLB, and the Godot kit repeats the same paint functions and uses vertex colours.

## Wood

`TreeBark` and `TreeBark02` are procedural. They combine two Voronoi colours
(scales 12.6 and 42.4), stretched coordinates, several Musgrave/noise masks,
colour ramps, green patches, a cool base gradient and a separate diffuse ramp.
Their ramp transitions between 0.05909092 and 0.10909095, with blue Overlay in
shade. There is no painted-bark image to extract from this file.

The app generates its own elongated Voronoi pigment picture and uses the wood
light ramp. Painted wood owns `paintedTone`, `paintedShadow`, `paintedLight`,
`paintedStrokes`, `paintedScale`, `paintedMoss` and `paintedBaseShade`. Original
bark retains its existing colours, pattern, relief, brush strength, roughness and
moss. Inactive settings remain stored when switching finishes, without entering
the other finish's geometry or picture. Tree structure, ridges, knots and hollows
remain shape controls shared by both finishes. The base gradient uses whole-tree
height, so it does not repeat up every branch.

`Match material` selects painted wood for Ghibli. Explicit `Original` retains
natural wood lighting; explicit `Painted` retains painted lighting independently
of the leaves' chosen appearance.

## Approximation boundaries

This reproduces the reference's construction rather than Blender's renderer.
The app has generated clumps instead of the reference's exact source surfaces;
the real-time value noise and periodic Voronoi picture approximate Blender's
noise, smooth Voronoi and Musgrave layers. The reference uses Eevee and Filmic;
the app uses Three.js display conversion and its own palettes. The lighting is
an authored direction matching the reference sun, as with the other painted
looks, rather than a live copy of every scene light. Exact pixels are therefore
not expected. A plain GLB retains its pigment, mask and directions; the supplied
Godot material is needed for the two painted light responses.

The Blender 5.1 reader repairs an old subdivision input link and migrates legacy
nodes when opening this 2022 file. The reference render reflects that migration;
the input `.blend` was not rewritten.
