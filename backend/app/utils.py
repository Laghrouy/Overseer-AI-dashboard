def build_command_repr(command: str, args: list[str] | None = None) -> str:
    base = (command or "").strip()
    extras = [a.strip() for a in (args or []) if a.strip()]
    if extras:
        return " ".join([base, *extras]).strip()
    return base
