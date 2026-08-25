#!/usr/bin/env python3
"""Modelo determinístico das transições que o E2E precisa observar no app."""

from dataclasses import dataclass


@dataclass
class Session:
    session_id: str
    token_hash: str
    expires_at_ms: int
    revoked: bool = False

    def active(self, now_ms: int) -> bool:
        return not self.revoked and now_ms < self.expires_at_ms

    def reload(self) -> None:
        """Reload perde o portador do documento, nunca toca na linha."""

    def rebind(self, new_hash: str, now_ms: int) -> None:
        assert self.active(now_ms)
        assert new_hash != self.token_hash
        self.token_hash = new_hash

    def logout(self) -> None:
        self.revoked = True


def main() -> int:
    session = Session("same-id", "old-hash", 3_600_000)
    original = (session.session_id, session.expires_at_ms)
    session.reload()
    assert session.active(3_599_999)
    assert (session.session_id, session.expires_at_ms) == original
    session.rebind("new-hash", 1_000)
    assert session.token_hash == "new-hash"
    assert (session.session_id, session.expires_at_ms) == original
    assert not session.active(3_600_000)
    session = Session("logout-id", "hash", 3_600_000)
    session.logout()
    assert not session.active(1_000)
    print("PASS modelo: reload preserva id/prazo, rebind gira token, prazo e logout encerram")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
