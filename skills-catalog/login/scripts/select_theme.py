#!/usr/bin/env python3
"""Seleciona uma paleta estável do catálogo sem aleatoriedade de runtime."""

from __future__ import annotations

import hashlib
import json
import re
import sys

PALETTES = (
    {"id": "cyan", "accent": "#22d3ee", "accentStrong": "#0891b2"},
    {"id": "orange", "accent": "#f97316", "accentStrong": "#c2410c"},
    {"id": "violet", "accent": "#a78bfa", "accentStrong": "#7c3aed"},
    {"id": "emerald", "accent": "#34d399", "accentStrong": "#047857"},
    {"id": "rose", "accent": "#fb7185", "accentStrong": "#be123c"},
)


def main() -> int:
    if len(sys.argv) != 2:
        print("uso: select_theme.py <slug-da-empresa>", file=sys.stderr)
        return 2
    slug = re.sub(r"[^a-z0-9]+", "-", sys.argv[1].strip().lower()).strip("-")
    if not slug:
        print("slug vazio", file=sys.stderr)
        return 2
    index = int.from_bytes(hashlib.sha256(slug.encode()).digest()[:8], "big") % len(PALETTES)
    print(json.dumps({"company": slug, **PALETTES[index]}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
