#!/usr/bin/env python3
"""Harness determinístico do contrato de login. Saídas: 0 ok, 1 violação, 2 uso inválido."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

DATABASES = {
    "user": ("SCRAPING_SUPABASE_URL", "redivrmeajmktenwshmn"),
    "superadmin": ("SUPERADMIN_SUPABASE_URL", "rzgkwuqvhpvqmjegckih"),
}


def source_files(root: Path) -> list[Path]:
    paths: list[Path] = []
    for suffix in ("*.ts", "*.tsx", "*.js", "*.mjs", "*.sql"):
        paths.extend(p for p in root.rglob(suffix) if not {"node_modules", ".next", ".git"} & set(p.parts))
    return paths


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--flow", choices=("cpf", "cnpj"), required=True)
    args = parser.parse_args()
    root = args.root.resolve()
    if not root.is_dir():
        print(f"ERRO ambiente: raiz inexistente: {root}")
        return 2
    files = source_files(root)
    if not files:
        print("ERRO ambiente: nenhum fonte encontrado")
        return 2
    contract_file = root / "login-contract.json"
    if not contract_file.is_file():
        print("FALHA contrato: login-contract.json ausente")
        return 1
    try:
        contract = json.loads(contract_file.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        print("ERRO ambiente: login-contract.json inválido")
        return 2
    text = "\n".join(p.read_text(encoding="utf-8", errors="ignore") for p in files)
    identity_class = contract.get("identityClass")
    database = DATABASES.get(identity_class)
    required_env, central_ref = database if database else ("", "")
    required_session = {
        "user": "self_contained_jwt",
        "superadmin": "stateful_custom_jwt",
    }.get(identity_class)
    expected = (("cnpj", "cpf", "canais", "otp", "conteudo") if args.flow == "cnpj" else ("cpf", "canais", "otp", "conteudo"))
    checks = {
        f"fluxo declarado {' -> '.join(expected)}": tuple(contract.get("steps", ())) == expected,
        "classe de identidade declarada": database is not None,
        f"env {required_env or 'inválida'}": bool(required_env) and contract.get("databaseEnv") == required_env and required_env in text,
        "banco canônico declarado": bool(central_ref) and contract.get("databaseRef") == central_ref,
        "cadastro local bloqueado": contract.get("localRegistration") == "central_only",
        f"sessão canônica {required_session or 'inválida'}": bool(required_session) and contract.get("session") == required_session,
        "sem Math.random": "Math.random(" not in text,
        "OTP server-side": bool(re.search(r"otp|one.time", text, re.I)) and bool(re.search(r"route\.ts|server-only", text)),
        "sessão protegida": bool(re.search(r"httpOnly|httponly", text)) and bool(re.search(r"secure", text, re.I)),
    }
    hardcoded_refs = set(re.findall(r"https://([a-z]{20})\.supabase\.co", text))
    checks["somente refs de identidade canônicas"] = hardcoded_refs <= {value[1] for value in DATABASES.values()}
    failures = 0
    for label, ok in checks.items():
        print(f"{'PASS' if ok else 'FALHA'}  {label}")
        failures += not ok
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
