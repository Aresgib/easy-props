"""Prepare the supplied PNG opacity masks for synchronous, browser-free generation."""
import base64
import json
import math
from pathlib import Path
import shutil
import struct
import sys
import zlib

ROOT = Path(__file__).resolve().parents[2]
DESTINATION = ROOT / 'frontend/src/assets/leaves'
SIZE = 256
PADDING = 4


def read_png(path):
    raw = path.read_bytes()
    assert raw[:8] == b'\x89PNG\r\n\x1a\n'
    offset, compressed = 8, bytearray()
    while offset < len(raw):
        length = struct.unpack_from('>I', raw, offset)[0]
        kind = raw[offset + 4:offset + 8]
        body = raw[offset + 8:offset + 8 + length]
        if kind == b'IHDR':
            width, height, depth, colour, _, _, interlace = struct.unpack('>IIBBBBB', body)
            assert depth == 8 and colour in (2, 6) and interlace == 0
        if kind == b'IDAT':
            compressed.extend(body)
        offset += length + 12
    channels = 4 if colour == 6 else 3
    stride = width * channels
    filtered = zlib.decompress(compressed)
    assert len(filtered) == height * (stride + 1)
    previous = bytearray(stride)
    pixels = bytearray()
    for y in range(height):
        at = y * (stride + 1)
        mode = filtered[at]
        row = bytearray(filtered[at + 1:at + 1 + stride])
        for x in range(stride):
            left = row[x - channels] if x >= channels else 0
            above = previous[x]
            corner = previous[x - channels] if x >= channels else 0
            if mode == 1:
                row[x] = (row[x] + left) % 256
            elif mode == 2:
                row[x] = (row[x] + above) % 256
            elif mode == 3:
                row[x] = (row[x] + (left + above) // 2) % 256
            elif mode == 4:
                estimate = left + above - corner
                distances = [abs(estimate - v) for v in (left, above, corner)]
                predictor = (left, above, corner)[distances.index(min(distances))]
                row[x] = (row[x] + predictor) % 256
            else:
                assert mode == 0
        pixels.extend(row)
        previous = row
    alpha = bytearray(width * height)
    for i in range(width * height):
        r, g, b = pixels[i * channels:i * channels + 3]
        opacity = pixels[i * channels + 3] if channels == 4 else 255
        alpha[i] = round((r * 0.2126 + g * 0.7152 + b * 0.0722) * opacity / 255)
    return width, height, alpha


def prepare(path):
    width, height, source = read_png(path)
    data = bytearray(SIZE * SIZE)
    inner = SIZE - PADDING * 2
    for y in range(inner):
        for x in range(inner):
            total = 0
            for dy in (0.25, 0.75):
                for dx in (0.25, 0.75):
                    sx = (x + dx) / inner * width - 0.5
                    sy = (y + dy) / inner * height - 0.5
                    ix, iy = math.floor(sx), math.floor(sy)
                    fx, fy = sx - ix, sy - iy
                    for px, wx in ((ix, 1 - fx), (ix + 1, fx)):
                        for py, wy in ((iy, 1 - fy), (iy + 1, fy)):
                            total += source[min(height - 1, max(0, py)) * width + min(width - 1, max(0, px))] * wx * wy
            data[(y + PADDING) * SIZE + x + PADDING] = round(total / 4)
    # Find a deep opaque point for solid stems and fruit, without painting a dot into the mask.
    distance = [0 if v < 254 else SIZE * 2 for v in data]
    for i in range(len(distance)):
        if i % SIZE: distance[i] = min(distance[i], distance[i - 1] + 1)
        if i >= SIZE: distance[i] = min(distance[i], distance[i - SIZE] + 1)
    for i in range(len(distance) - 1, -1, -1):
        if i % SIZE < SIZE - 1: distance[i] = min(distance[i], distance[i + 1] + 1)
        if i + SIZE < len(distance): distance[i] = min(distance[i], distance[i + SIZE] + 1)
    centre = distance.index(max(distance))
    packed = bytearray()
    at = 0
    while at < len(data):
        value, count = data[at], 1
        while at + count < len(data) and data[at + count] == value and count < 65535:
            count += 1
        packed.extend((value, count & 255, count >> 8))
        at += count
    return {'alpha': base64.b64encode(packed).decode('ascii'), 'solid': [centre % SIZE, centre // SIZE]}


if __name__ == '__main__':
    source = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else DESTINATION
    DESTINATION.mkdir(parents=True, exist_ok=True)
    masks = {}
    for number in range(1, 4):
        name = f'TreeLeaves{number:02}.png'
        path = source / name
        masks[f'tree-leaves-{number:02}'] = prepare(path)
        target = DESTINATION / name
        if path != target:
            shutil.copyfile(path, target)
    (DESTINATION / 'masks.json').write_text(json.dumps({'size': SIZE, 'masks': masks}, separators=(',', ':')) + '\n', encoding='utf-8')
    print('Prepared three leaf masks; original PNG files preserved.')
