"""Shared helpers for Family Intercom."""

from __future__ import annotations

import json
from typing import Any

from .const import DEFAULT_REPLY_PHRASES, DEFAULT_STATIONS_JSON


def parse_reply_phrases(value: str | None = None) -> list[str]:
    """Parse configured reply phrases."""
    raw = value if value is not None else DEFAULT_REPLY_PHRASES
    if not str(raw).strip():
        raw = DEFAULT_REPLY_PHRASES
    phrases = [item.strip() for item in str(raw).replace("\n", "|").split("|") if item.strip()]
    return phrases[:12] or [item.strip() for item in DEFAULT_REPLY_PHRASES.split("|") if item.strip()]


def slugify(value: str) -> str:
    """Return a HA-friendly slug."""
    slug = "".join(char.lower() if char.isalnum() else "_" for char in value)
    while "__" in slug:
        slug = slug.replace("__", "_")
    return slug.strip("_") or "reply"


def parse_stations(value: str | None = None) -> list[dict[str, Any]]:
    """Parse configured intercom stations.

    Expected JSON:
    [
      {"name": "Kitchen", "targets": ["media_player.kitchen_display"], "notify": "notify.mobile_app_phone"}
    ]
    """
    raw = value if value is not None else DEFAULT_STATIONS_JSON
    if not str(raw).strip():
        raw = DEFAULT_STATIONS_JSON
    try:
        parsed = json.loads(str(raw))
    except (TypeError, ValueError):
        return []
    if not isinstance(parsed, list):
        return []
    stations: list[dict[str, Any]] = []
    for item in parsed:
        if not isinstance(item, dict):
            continue
        name = str(item.get("name", "")).strip()
        targets = item.get("targets") or item.get("target")
        if isinstance(targets, str):
            targets = [targets]
        if not name or not isinstance(targets, list):
            continue
        clean_targets = [str(target).strip() for target in targets if str(target).strip()]
        if not clean_targets:
            continue
        stations.append(
            {
                "id": slugify(name),
                "name": name,
                "targets": clean_targets,
                "notify": str(item.get("notify", "")).strip(),
                "description": str(item.get("description", "")).strip(),
            }
        )
    return stations[:50]
