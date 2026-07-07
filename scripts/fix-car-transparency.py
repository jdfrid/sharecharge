"""Remove checkerboard / light background from car PNG (flood-fill from edges)."""
from collections import deque
from pathlib import Path

from PIL import Image


def is_background(r: int, g: int, b: int, a: int) -> bool:
    if a < 8:
        return True
    spread = max(r, g, b) - min(r, g, b)
    if spread < 35 and min(r, g, b) > 160:
        return True
    if spread < 20 and max(r, g, b) < 28:
        return True
    return False


def flood_transparent(src: Path, dest: Path) -> None:
    img = Image.open(src).convert('RGBA')
    w, h = img.size
    px = img.load()
    visited: set[tuple[int, int]] = set()
    queue: deque[tuple[int, int]] = deque()

    for x in range(w):
        queue.append((x, 0))
        queue.append((x, h - 1))
    for y in range(h):
        queue.append((0, y))
        queue.append((w - 1, y))

    while queue:
        x, y = queue.popleft()
        if (x, y) in visited:
            continue
        visited.add((x, y))
        r, g, b, a = px[x, y]
        if not is_background(r, g, b, a):
            continue
        px[x, y] = (r, g, b, 0)
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h:
                queue.append((nx, ny))

    img.save(dest)


if __name__ == '__main__':
    root = Path(__file__).resolve().parents[1]
    src = root / 'public' / 'images' / 'service-icons' / 'car.png'
    dest = src
    flood_transparent(src, dest)
    print(f'Updated {dest}')
