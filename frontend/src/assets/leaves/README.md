# Supplied leaf masks

`TreeLeaves01.png`, `TreeLeaves02.png` and `TreeLeaves03.png` are the user's supplied
white-on-black opacity masks, copied from `myassets` at their original resolution.
White becomes visible leaf colour; black becomes transparent. RGB and RGBA sources
are supported, including the soft edge on the second mask.

`masks.json` contains padded, filtered opacity data for immediate generation without
waiting for a browser image loader. It keeps the artwork's silhouettes. The runtime
atlas adds rotated and mirrored variants, and retains a separate flower cell.

To rebuild from the repository root:

```powershell
python frontend/tools/build-leaf-masks.py myassets
```
