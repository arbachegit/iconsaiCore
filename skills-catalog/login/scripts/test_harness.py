#!/usr/bin/env python3
"""Executa os dois contratos imutáveis contra fixtures mínimas."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path


root = Path(__file__).resolve().parents[1]
validator = root / "scripts" / "validate_login.py"
fixtures = root / "tests" / "fixtures"

cases = (("cpf", "cpf"), ("cnpj", "cnpj"), ("superadmin", "cpf"))
for fixture, flow in cases:
    result = subprocess.run(
        [sys.executable, str(validator), "--root", str(fixtures / fixture), "--flow", flow],
        check=False,
    )
    if result.returncode != 0:
        sys.exit(result.returncode)

model = subprocess.run([sys.executable, str(root / "scripts" / "test_session_model.py")], check=False)
if model.returncode != 0:
    sys.exit(model.returncode)

red_gate = subprocess.run([sys.executable, str(root / "scripts" / "test_validator_red.py")], check=False)
if red_gate.returncode != 0:
    sys.exit(red_gate.returncode)

print("PASS harness login: CPF, CNPJ, superadmin e continuidade de sessão")
