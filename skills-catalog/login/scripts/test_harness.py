#!/usr/bin/env python3
"""Executa os dois contratos imutáveis contra fixtures mínimas."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path


root = Path(__file__).resolve().parents[1]
validator = root / "scripts" / "validate_login.py"
fixtures = root / "tests" / "fixtures"

for flow in ("cpf", "cnpj"):
    result = subprocess.run(
        [sys.executable, str(validator), "--root", str(fixtures / flow), "--flow", flow],
        check=False,
    )
    if result.returncode != 0:
        sys.exit(result.returncode)

print("PASS harness login: CPF e CNPJ")
