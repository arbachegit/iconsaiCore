#!/usr/bin/env python3
"""Prova que violações conhecidas deixam o gate vermelho."""

from __future__ import annotations

import shutil
import subprocess
import sys
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
VALIDATOR = ROOT / "scripts" / "validate_login.py"
FIXTURE = ROOT / "tests" / "fixtures" / "superadmin"
EXPECTED = (
    "sem cookies do framework",
    "sem sessionStorage",
    "sem IndexedDB",
    "sem Cache API",
    "sem Service Worker",
    "sem credencial implícita",
    "reload não chama logout/revogação",
)


def main() -> int:
    with tempfile.TemporaryDirectory(prefix="login-red-") as temporary:
        target = Path(temporary)
        shutil.copytree(FIXTURE, target, dirs_exist_ok=True)
        (target / "session-danger.ts").write_text(
            """
const cookie = cookies();
sessionStorage.setItem("session", "bearer");
indexedDB.open("auth");
caches.open("auth");
navigator.serviceWorker.register("/session-bridge.js");
fetch("/api/session", { credentials: "same-origin" });
window.addEventListener("beforeunload", () => logout());
""".strip(),
            encoding="utf-8",
        )
        result = subprocess.run(
            [sys.executable, str(VALIDATOR), "--root", str(target), "--flow", "cpf"],
            check=False,
            capture_output=True,
            text=True,
        )
    output = result.stdout + result.stderr
    missing = [label for label in EXPECTED if f"FALHA  {label}" not in output]
    if result.returncode != 1 or missing:
        print(f"FALHA autoteste vermelho: exit={result.returncode} ausentes={missing}")
        print(output)
        return 1
    print(f"PASS autoteste vermelho: {len(EXPECTED)} violações bloquearam o release")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
