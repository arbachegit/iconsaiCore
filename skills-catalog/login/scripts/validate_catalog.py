#!/usr/bin/env python3
"""Garante que login é o único pacote descobrível que governa autenticação."""

from __future__ import annotations

import sys
from pathlib import Path

ROOTS = (
    Path.home() / ".codex/skills",
    Path.home() / ".agents/skills",
    Path.home() / ".claude/skills",
    Path(__file__).resolve().parents[2],
)
FORBIDDEN = {"auth", "authsuper", "design-login", "login-cnpj-otp", "skill_auth_fase_1_sem_role", "skill_auth_fase_2_com_role", "skill_auth_fase_3_com_role_multi_tenant", "skill-identity-onboarding", "skill-superadmin-consumer-pattern", "skill-design-login-iconsai"}


def main() -> int:
    found: list[str] = []
    login_count = 0
    existing = [root for root in ROOTS if root.is_dir()]
    for root in existing:
        for skill_file in root.glob("*/SKILL.md"):
            name = skill_file.parent.name
            if name == "login":
                login_count += 1
            if name in FORBIDDEN:
                found.append(str(skill_file.parent))
    if found:
        print("FALHA skills de login concorrentes:")
        print("\n".join(found))
        return 1
    if login_count != len(existing):
        print(f"FALHA cópias login esperadas={len(existing)} encontradas={login_count}")
        return 1
    print(f"PASS login é o único pacote de autenticação nas {login_count} raízes")
    return 0


if __name__ == "__main__":
    sys.exit(main())
