"""Family Intercom integration."""

from __future__ import annotations

import asyncio
import base64
from dataclasses import dataclass
from datetime import datetime, time
import logging
from pathlib import Path
import secrets
import tempfile
from typing import Any

import voluptuous as vol

from homeassistant.components import frontend
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import CONF_ENTITY_ID
from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.network import get_url
from homeassistant.helpers.typing import ConfigType

from .const import (
    DEFAULT_CHIME_ENABLED,
    DEFAULT_CLEANUP_SECONDS,
    DEFAULT_QUIET_END,
    DEFAULT_QUIET_HOURS_ENABLED,
    DEFAULT_QUIET_START,
    DEFAULT_RESTORE_SECONDS,
    DEFAULT_SHOW_SIDEBAR,
    DEFAULT_TTS_ENTITY,
    DEFAULT_VOLUME_ENABLED,
    DEFAULT_VOLUME_LEVEL,
    DOMAIN,
    PANEL_URL_PATH,
    STATIC_URL,
)
from .media import FamilyIntercomChimeView, FamilyIntercomMediaView

_LOGGER = logging.getLogger(__name__)

PLATFORMS: list[str] = []

SERVICE_SPEAK_TEXT = "speak_text"
SERVICE_PLAY_RECORDING = "play_recording"
SERVICE_DELETE_TEMP = "delete_temp_files"


@dataclass
class TempRecording:
    """Temporary recording metadata."""

    path: Path
    content_type: str


def _data(hass: HomeAssistant) -> dict[str, Any]:
    """Return domain data."""
    return hass.data.setdefault(DOMAIN, {"recordings": {}, "cleanup_tasks": set()})


def _temp_dir(hass: HomeAssistant) -> Path:
    """Return and create temp recording dir."""
    root = Path(tempfile.gettempdir()) / "homeassistant_family_intercom"
    root.mkdir(parents=True, exist_ok=True)
    return root


def _extension_for_content_type(content_type: str, filename: str | None = None) -> str:
    """Choose a safe extension."""
    if filename:
        suffix = Path(filename).suffix.lower()
        if suffix in {".webm", ".ogg", ".oga", ".m4a", ".mp4", ".aac", ".wav", ".mp3"}:
            return suffix
    mapping = {
        "audio/webm": ".webm",
        "audio/ogg": ".ogg",
        "audio/mp4": ".m4a",
        "audio/m4a": ".m4a",
        "audio/aac": ".aac",
        "audio/wav": ".wav",
        "audio/mpeg": ".mp3",
        "audio/mp3": ".mp3",
    }
    return mapping.get(content_type.lower().split(";")[0].strip(), ".webm")


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Set up from YAML; config entries do the real setup."""
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Family Intercom from a config entry."""
    hass.http.register_view(FamilyIntercomMediaView())
    hass.http.register_view(FamilyIntercomChimeView())
    entry.async_on_unload(entry.add_update_listener(_async_update_listener))
    entry.async_on_unload(_register_services(hass, entry))
    options = _entry_options(entry)
    entry.async_on_unload(await _register_frontend(hass, options["show_sidebar"]))
    return True


async def _async_update_listener(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Reload integration when options change."""
    await hass.config_entries.async_reload(entry.entry_id)


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload Family Intercom."""
    await _delete_all_temp(hass)
    try:
        frontend.async_remove_panel(hass, PANEL_URL_PATH)
    except Exception:  # noqa: BLE001 - Home Assistant versions differ here.
        _LOGGER.debug("Could not remove Family Intercom panel during unload", exc_info=True)
    return True


def _register_services(hass: HomeAssistant, entry: ConfigEntry):
    """Register integration services."""
    options = _entry_options(entry)
    default_tts = options["tts_entity"]
    cleanup_seconds = int(options["cleanup_seconds"])

    async def speak_text(call: ServiceCall) -> None:
        targets = _as_targets(call.data["target_entity"])
        message = call.data["message"].strip()
        tts_entity = call.data.get("tts_entity") or default_tts
        emergency = bool(call.data.get("emergency", False))
        if not message:
            return
        if _quiet_blocked(options, emergency):
            _fire_history(hass, "blocked_quiet_hours", targets, message, emergency)
            return
        await _prepare_announcement(hass, options, targets)
        await hass.services.async_call(
            "tts",
            "speak",
            {
                "entity_id": tts_entity,
                "media_player_entity_id": targets[0] if len(targets) == 1 else targets,
                "message": message,
            },
            blocking=False,
        )
        _schedule_volume_restore(hass, options)
        _fire_history(hass, "text", targets, message, emergency)

    async def play_recording(call: ServiceCall) -> None:
        targets = _as_targets(call.data["target_entity"])
        content_type = call.data["content_type"].lower().split(";")[0].strip()
        filename = call.data.get("filename")
        emergency = bool(call.data.get("emergency", False))
        if _quiet_blocked(options, emergency):
            _fire_history(hass, "blocked_quiet_hours", targets, "Voice recording", emergency)
            return
        raw = base64.b64decode(call.data["data"].split(",", 1)[-1], validate=False)
        if not raw:
            return
        if len(raw) > 5 * 1024 * 1024:
            raise vol.Invalid("Recording is too large. Keep intercom clips under 5 MB.")

        recording_id = secrets.token_urlsafe(24)
        extension = _extension_for_content_type(content_type, filename)
        path = _temp_dir(hass) / f"{recording_id}{extension}"
        await hass.async_add_executor_job(path.write_bytes, raw)
        _data(hass)["recordings"][recording_id] = TempRecording(path=path, content_type=content_type)

        base_url = get_url(hass, prefer_external=False, allow_internal=True)
        media_url = f"{base_url}/api/{DOMAIN}/media/{recording_id}"
        await _prepare_announcement(hass, options, targets)
        await hass.services.async_call(
            "media_player",
            "play_media",
            {
                CONF_ENTITY_ID: targets[0] if len(targets) == 1 else targets,
                "media_content_id": media_url,
                "media_content_type": content_type,
            },
            blocking=False,
        )
        _schedule_volume_restore(hass, options)
        _fire_history(hass, "recording", targets, "Voice recording", emergency)
        _schedule_delete(hass, recording_id, cleanup_seconds)

    async def delete_temp_files(call: ServiceCall) -> None:
        await _delete_all_temp(hass)

    hass.services.async_register(
        DOMAIN,
        SERVICE_SPEAK_TEXT,
        speak_text,
        schema=vol.Schema(
            {
                vol.Required("target_entity"): vol.Any(cv.entity_id, [cv.entity_id]),
                vol.Required("message"): cv.string,
                vol.Optional("tts_entity"): cv.entity_id,
                vol.Optional("emergency", default=False): cv.boolean,
            }
        ),
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_PLAY_RECORDING,
        play_recording,
        schema=vol.Schema(
            {
                vol.Required("target_entity"): vol.Any(cv.entity_id, [cv.entity_id]),
                vol.Required("data"): cv.string,
                vol.Required("content_type"): cv.string,
                vol.Optional("filename"): cv.string,
                vol.Optional("emergency", default=False): cv.boolean,
            }
        ),
    )
    hass.services.async_register(DOMAIN, SERVICE_DELETE_TEMP, delete_temp_files)

    def unregister() -> None:
        hass.services.async_remove(DOMAIN, SERVICE_SPEAK_TEXT)
        hass.services.async_remove(DOMAIN, SERVICE_PLAY_RECORDING)
        hass.services.async_remove(DOMAIN, SERVICE_DELETE_TEMP)

    return unregister


def _entry_options(entry: ConfigEntry) -> dict[str, Any]:
    """Merge config entry data and options with defaults."""
    values = {**entry.data, **entry.options}
    return {
        "tts_entity": values.get("tts_entity", DEFAULT_TTS_ENTITY),
        "cleanup_seconds": int(values.get("cleanup_seconds", DEFAULT_CLEANUP_SECONDS)),
        "show_sidebar": bool(values.get("show_sidebar", DEFAULT_SHOW_SIDEBAR)),
        "chime_enabled": bool(values.get("chime_enabled", DEFAULT_CHIME_ENABLED)),
        "volume_enabled": bool(values.get("volume_enabled", DEFAULT_VOLUME_ENABLED)),
        "volume_level": float(values.get("volume_level", DEFAULT_VOLUME_LEVEL)),
        "restore_seconds": int(values.get("restore_seconds", DEFAULT_RESTORE_SECONDS)),
        "quiet_hours_enabled": bool(values.get("quiet_hours_enabled", DEFAULT_QUIET_HOURS_ENABLED)),
        "quiet_start": values.get("quiet_start", DEFAULT_QUIET_START),
        "quiet_end": values.get("quiet_end", DEFAULT_QUIET_END),
    }


def _as_targets(value: Any) -> list[str]:
    """Return a clean target entity list."""
    if isinstance(value, str):
        return [value]
    return [str(item) for item in value if item]


def _parse_time(value: str) -> time:
    """Parse HH:MM safely."""
    hour, minute = str(value).split(":", 1)
    return time(hour=int(hour), minute=int(minute[:2]))


def _quiet_blocked(options: dict[str, Any], emergency: bool) -> bool:
    """Return true when quiet hours should block non-emergency announcements."""
    if emergency or not options["quiet_hours_enabled"]:
        return False
    try:
        start = _parse_time(options["quiet_start"])
        end = _parse_time(options["quiet_end"])
    except (TypeError, ValueError):
        return False
    now = datetime.now().time()
    if start <= end:
        return start <= now < end
    return now >= start or now < end


async def _prepare_announcement(hass: HomeAssistant, options: dict[str, Any], targets: list[str]) -> None:
    """Apply volume and chime before an announcement."""
    data = _data(hass)
    data["restore_volumes"] = data.get("restore_volumes", {})
    if options["volume_enabled"]:
        for target in targets:
            state = hass.states.get(target)
            old_volume = state.attributes.get("volume_level") if state else None
            if old_volume is not None and target not in data["restore_volumes"]:
                data["restore_volumes"][target] = old_volume
            await hass.services.async_call(
                "media_player",
                "volume_set",
                {CONF_ENTITY_ID: target, "volume_level": options["volume_level"]},
                blocking=False,
            )
    if options["chime_enabled"]:
        base_url = get_url(hass, prefer_external=False, allow_internal=True)
        await hass.services.async_call(
            "media_player",
            "play_media",
            {
                CONF_ENTITY_ID: targets[0] if len(targets) == 1 else targets,
                "media_content_id": f"{base_url}/api/{DOMAIN}/chime",
                "media_content_type": "audio/wav",
            },
            blocking=False,
        )
        await asyncio.sleep(1.15)


def _schedule_volume_restore(hass: HomeAssistant, options: dict[str, Any]) -> None:
    """Restore target volumes after playback has had time to start."""
    if not options["volume_enabled"]:
        return
    data = _data(hass)
    restore = dict(data.get("restore_volumes", {}))
    data["restore_volumes"] = {}
    if not restore:
        return

    async def restore_later() -> None:
        await asyncio.sleep(options["restore_seconds"])
        for target, old_volume in restore.items():
            await hass.services.async_call(
                "media_player",
                "volume_set",
                {CONF_ENTITY_ID: target, "volume_level": old_volume},
                blocking=False,
            )

    hass.loop.create_task(restore_later())


def _fire_history(hass: HomeAssistant, kind: str, targets: list[str], message: str, emergency: bool) -> None:
    """Fire an event the panel can use for history if loaded."""
    hass.bus.async_fire(
        f"{DOMAIN}_sent",
        {
            "kind": kind,
            "targets": targets,
            "message": message[:240],
            "emergency": emergency,
        },
    )


async def _register_frontend(hass: HomeAssistant, show_sidebar: bool):
    """Register static JS and optionally the sidebar panel."""
    static_path = Path(__file__).parent / "www"
    await hass.http.async_register_static_paths(
        [StaticPathConfig(STATIC_URL, str(static_path), cache_headers=False)]
    )
    if not show_sidebar:
        return lambda: None
    try:
        frontend.async_register_built_in_panel(
            hass,
            component_name="custom",
            sidebar_title="Family Intercom",
            sidebar_icon="mdi:bullhorn",
            frontend_url_path=PANEL_URL_PATH,
            require_admin=False,
            config={
                "_panel_custom": {
                    "name": "family-intercom-panel",
                    "js_url": f"{STATIC_URL}/family-intercom-panel-v4.js",
                    "embed_iframe": False,
                    "trust_external_script": False,
                }
            },
        )
    except Exception:  # noqa: BLE001 - custom panel APIs vary by HA version.
        _LOGGER.exception("Could not register Family Intercom sidebar panel")

    def unregister() -> None:
        try:
            frontend.async_remove_panel(hass, PANEL_URL_PATH)
        except Exception:  # noqa: BLE001
            _LOGGER.debug("Could not remove Family Intercom panel", exc_info=True)

    return unregister


def _schedule_delete(hass: HomeAssistant, recording_id: str, delay: int) -> None:
    """Delete a temp recording later."""

    async def delete_later() -> None:
        try:
            await asyncio.sleep(delay)
            await _delete_recording(hass, recording_id)
        finally:
            _data(hass)["cleanup_tasks"].discard(task)

    task = hass.loop.create_task(delete_later())
    _data(hass)["cleanup_tasks"].add(task)


async def _delete_recording(hass: HomeAssistant, recording_id: str) -> None:
    """Delete one temp recording."""
    recording = _data(hass)["recordings"].pop(recording_id, None)
    if not recording:
        return
    await hass.async_add_executor_job(lambda: recording.path.unlink(missing_ok=True))


async def _delete_all_temp(hass: HomeAssistant) -> None:
    """Delete all temp recordings."""
    data = _data(hass)
    for task in list(data["cleanup_tasks"]):
        task.cancel()
    data["cleanup_tasks"].clear()
    for recording_id in list(data["recordings"]):
        await _delete_recording(hass, recording_id)
