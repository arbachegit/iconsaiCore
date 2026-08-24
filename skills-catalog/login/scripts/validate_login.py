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
    ignored = {
        "node_modules",
        ".next",
        ".git",
        "scripts",
        "tests",
        "e2e",
        "harness",
        "supabase",
        "playwright-report",
        "test-results",
    }
    for suffix in ("*.ts", "*.tsx", "*.js", "*.mjs", "*.sql"):
        paths.extend(
            p
            for p in root.rglob(suffix)
            if not ignored & set(p.relative_to(root).parts)
        )
    return paths


def strip_comments(source: str) -> str:
    without_blocks = re.sub(r"/\*.*?\*/", "", source, flags=re.S)
    return re.sub(r"(^|\s)//.*", r"\1", without_blocks)


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
    relevant_pattern = re.compile(
        r"auth|login|identity|session|middleware|access|otp|guard|flow|superadmin|client|config|db",
        re.I,
    )
    relevant_files = [p for p in files if relevant_pattern.search(str(p.relative_to(root)))]
    if "fixtures" in root.parts:
        relevant_files = files
    text = "\n".join(p.read_text(encoding="utf-8", errors="ignore") for p in relevant_files)
    executable_text = strip_comments(text)
    identity_class = contract.get("identityClass")
    database = DATABASES.get(identity_class)
    required_env, central_ref = database if database else ("", "")
    required_session = "opaque_db_session" if identity_class in DATABASES else None
    expected = (("cnpj", "cpf", "canais", "otp", "conteudo") if args.flow == "cnpj" else ("cpf", "canais", "otp", "conteudo"))
    checks = {
        f"fluxo declarado {' -> '.join(expected)}": tuple(contract.get("steps", ())) == expected,
        "classe de identidade declarada": database is not None,
        f"env {required_env or 'inválida'}": bool(required_env) and contract.get("databaseEnv") == required_env and required_env in text,
        "banco canônico declarado": bool(central_ref) and contract.get("databaseRef") == central_ref,
        "cadastro local bloqueado": contract.get("localRegistration") == "central_only",
        f"sessão canônica {required_session or 'inválida'}": bool(required_session) and contract.get("session") == required_session,
        "transporte bearer somente em memória": contract.get("transport") == "authorization_bearer_memory",
        "sem Math.random": "Math.random(" not in text,
        "OTP server-side": bool(re.search(r"otp|one.time", text, re.I)) and bool(re.search(r"route\.ts|server-only", text)),
        "sessão confirmada no banco": bool(re.search(r"session|sessao", text, re.I)) and bool(re.search(r"token_hash|sha256|createHash", text, re.I)),
        "Authorization bearer": bool(re.search(r"authorization", text, re.I)) and bool(re.search(r"bearer", text, re.I)),
        "resposta não armazenável": bool(re.search(r"cache-control", text, re.I)) and bool(re.search(r"no-store", text, re.I)),
    }
    forbidden = {
        "cookies do framework": r"\bcookies\s*\(",
        "Set-Cookie": r"set-cookie|\.cookies\.set\s*\(",
        "document.cookie": r"document\.cookie",
        "localStorage": r"localStorage",
        "sessionStorage": r"sessionStorage",
        "IndexedDB": r"indexedDB",
        "Cache API": r"caches\.(?:open|match|put|delete)\s*\(",
    }
    for label, pattern in forbidden.items():
        checks[f"sem {label}"] = not bool(re.search(pattern, executable_text, re.I))
    hardcoded_refs = set(re.findall(r"https://([a-z]{20})\.supabase\.co", text))
    checks["somente refs de identidade canônicas"] = hardcoded_refs <= {value[1] for value in DATABASES.values()}
    failures = 0
    for label, ok in checks.items():
        print(f"{'PASS' if ok else 'FALHA'}  {label}")
        failures += not ok
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
