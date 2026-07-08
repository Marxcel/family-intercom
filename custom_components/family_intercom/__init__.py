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
from homeassistant.helpers.storage import Store
from homeassistant.helpers.typing import ConfigType

from .const import (
    DEFAULT_AUTO_REPLY_VIEW_ENABLED,
    DEFAULT_CHIME_ENABLED,
    DEFAULT_CLEANUP_SECONDS,
    DEFAULT_QUIET_END,
    DEFAULT_QUIET_HOURS_ENABLED,
    DEFAULT_QUIET_START,
    DEFAULT_REPLY_DASHBOARD_PATH,
    DEFAULT_REPLY_CAST_DELAY_SECONDS,
    DEFAULT_REPLY_NOTIFY_SERVICE,
    DEFAULT_REPLY_VIEW_PATH,
    DEFAULT_REPLY_PHRASES,
    DEFAULT_RESTORE_SECONDS,
    DEFAULT_SHOW_SIDEBAR,
    DEFAULT_STATIONS_JSON,
    DEFAULT_TTS_ENTITY,
    DEFAULT_VOLUME_ENABLED,
    DEFAULT_VOLUME_LEVEL,
    DOMAIN,
    FRONTEND_MODULE,
    INTEGRATION_VERSION,
    NOTIFICATION_ACTION_EVENT,
    NOTIFICATION_ACTION_MAX_BUTTONS,
    NOTIFICATION_ACTION_PREFIX,
    PANEL_URL_PATH,
    STATIC_URL,
)
from .helpers import parse_reply_phrases
from .media import (
    FamilyIntercomChimeView,
    FamilyIntercomConfigView,
    FamilyIntercomInboxView,
    FamilyIntercomMediaView,
    FamilyIntercomReplyContextView,
)
from .reply import async_send_reply

_LOGGER = logging.getLogger(__name__)

PLATFORMS: list[str] = ["sensor", "switch"]

SERVICE_SPEAK_TEXT = "speak_text"
SERVICE_PLAY_RECORDING = "play_recording"
SERVICE_REPLY_RECORDING = "reply_recording"
SERVICE_REPLY_TEXT = "reply_text"
SERVICE_DELETE_TEMP = "delete_temp_files"
SERVICE_SHOW_REPLY_VIEW = "show_reply_view"

STORAGE_VERSION = 1
STORAGE_KEY = f"{DOMAIN}_reply_data"


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
    await _async_load_persisted_reply_data(hass)
    hass.http.register_view(FamilyIntercomMediaView())
    hass.http.register_view(FamilyIntercomChimeView())
    hass.http.register_view(FamilyIntercomReplyContextView())
    hass.http.register_view(FamilyIntercomConfigView())
    hass.http.register_view(FamilyIntercomInboxView())
    entry.async_on_unload(entry.add_update_listener(_async_update_listener))
    entry.async_on_unload(_register_services(hass, entry))
    options = _entry_options(entry)
    _data(hass)["options"] = options
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    entry.async_on_unload(await _register_frontend(hass, options["show_sidebar"]))
    entry.async_on_unload(_schedule_lovelace_resource_registration(hass))
    return True


async def _async_load_persisted_reply_data(hass: HomeAssistant) -> None:
    """Load reply history/sessions saved from a previous run, if any.

    Without this, a Home Assistant restart (including the kind that
    happens right after a HACS update) silently wipes reply history and
    any in-flight reply sessions, since they previously lived only in
    hass.data for the lifetime of the process.
    """
    data = _data(hass)
    if "store" in data:
        return  # Already loaded (e.g. a second config entry, or a reload).
    store = Store(hass, STORAGE_VERSION, STORAGE_KEY)
    data["store"] = store
    stored = await store.async_load() or {}
    data.setdefault("reply_history", stored.get("reply_history", []))
    data.setdefault("reply_sessions", stored.get("reply_sessions", {}))
    if stored.get("last_reply") is not None:
        data.setdefault("last_reply", stored["last_reply"])


async def _async_update_listener(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Reload integration when options change."""
    await hass.config_entries.async_reload(entry.entry_id)


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload Family Intercom."""
    await _delete_all_temp(hass)
    await _async_flush_reply_data(hass)
    try:
        frontend.async_remove_panel(hass, PANEL_URL_PATH)
    except Exception:  # noqa: BLE001 - Home Assistant versions differ here.
        _LOGGER.debug("Could not remove Family Intercom panel during unload", exc_info=True)
    return await hass.config_entries.async_unload_platforms(entry, PLATFORMS)


async def _async_flush_reply_data(hass: HomeAssistant) -> None:
    """Write reply history/sessions to disk immediately (e.g. on unload/restart)."""
    data = _data(hass)
    store: Store | None = data.get("store")
    if store is None:
        return
    await store.async_save(
        {
            "reply_history": data.get("reply_history", []),
            "reply_sessions": data.get("reply_sessions", {}),
            "last_reply": data.get("last_reply"),
        }
    )


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
        _schedule_volume_restore(hass, options, targets)
        _fire_history(hass, "text", targets, message, emergency)
        _store_reply_context(hass, call, targets, "text", message)
        await _maybe_push_actionable_reply(hass, options, call, message)
        await _maybe_show_reply_view(hass, options, targets, message)

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
        _schedule_volume_restore(hass, options, targets)
        _fire_history(hass, "recording", targets, "Voice recording", emergency)
        _store_reply_context(hass, call, targets, "recording", "Voice recording")
        await _maybe_push_actionable_reply(hass, options, call, "Sent you a voice message.")
        _schedule_delete(hass, recording_id, cleanup_seconds)
        await _maybe_show_reply_view(hass, options, targets, "Voice recording")

    async def reply_text(call: ServiceCall) -> None:
        message = call.data["message"].strip()
        if not message:
            return
        await async_send_reply(
            hass,
            message,
            kind="text",
            from_name=call.data.get("from_name", "Family Intercom"),
            notify_service=options.get("reply_notify_service"),
            session_id=call.data.get("session_id"),
        )

    async def reply_recording(call: ServiceCall) -> None:
        content_type = call.data["content_type"].lower().split(";", 1)[0].strip()
        filename = call.data.get("filename")
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
        base_url = get_url(hass, prefer_external=True, allow_internal=True)
        media_url = f"{base_url}/api/{DOMAIN}/media/{recording_id}"
        await async_send_reply(
            hass,
            "Voice reply",
            kind="recording",
            from_name=call.data.get("from_name", "Family Intercom"),
            media_url=media_url,
            content_type=content_type,
            notify_service=options.get("reply_notify_service"),
            session_id=call.data.get("session_id"),
        )
        _schedule_delete(hass, recording_id, cleanup_seconds)

    async def delete_temp_files(call: ServiceCall) -> None:
        await _delete_all_temp(hass)

    async def show_reply_view(call: ServiceCall) -> None:
        targets = _as_targets(call.data["target_entity"])
        await _show_reply_view(
            hass,
            targets,
            call.data.get("dashboard_path") or options["reply_dashboard_path"],
            call.data.get("view_path") or options["reply_view_path"],
            call.data.get("message", "Reply to intercom"),
        )

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
                vol.Optional("sender_session_id"): cv.string,
                vol.Optional("sender_name"): cv.string,
                vol.Optional("recipient_notify"): cv.string,
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
                vol.Optional("sender_session_id"): cv.string,
                vol.Optional("sender_name"): cv.string,
                vol.Optional("recipient_notify"): cv.string,
            }
        ),
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_REPLY_TEXT,
        reply_text,
        schema=vol.Schema(
            {
                vol.Required("session_id"): cv.string,
                vol.Required("message"): cv.string,
                vol.Optional("from_name"): cv.string,
            }
        ),
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_REPLY_RECORDING,
        reply_recording,
        schema=vol.Schema(
            {
                vol.Required("session_id"): cv.string,
                vol.Required("data"): cv.string,
                vol.Required("content_type"): cv.string,
                vol.Optional("filename"): cv.string,
                vol.Optional("from_name"): cv.string,
            }
        ),
    )
    hass.services.async_register(DOMAIN, SERVICE_DELETE_TEMP, delete_temp_files)
    hass.services.async_register(
        DOMAIN,
        SERVICE_SHOW_REPLY_VIEW,
        show_reply_view,
        schema=vol.Schema(
            {
                vol.Required("target_entity"): vol.Any(cv.entity_id, [cv.entity_id]),
                vol.Optional("dashboard_path"): cv.string,
                vol.Optional("view_path"): cv.string,
                vol.Optional("message"): cv.string,
            }
        ),
    )

    async def handle_notification_action(event) -> None:
        """Handle a tap on an actionable quick-reply push notification button."""
        action = str(event.data.get("action", ""))
        prefix = f"{NOTIFICATION_ACTION_PREFIX}::"
        if not action.startswith(prefix):
            return
        session_id, _, index_raw = action[len(prefix):].partition("::")
        if not session_id:
            return
        session = _data(hass).get("reply_sessions", {}).get(session_id)
        if not session:
            return
        phrases = session.get("reply_phrases_snapshot") or parse_reply_phrases(options.get("reply_phrases"))
        try:
            index = int(index_raw)
        except ValueError:
            return
        if not 0 <= index < len(phrases):
            return
        await async_send_reply(
            hass,
            phrases[index],
            kind="text",
            from_name="Push notification",
            notify_service=options.get("reply_notify_service"),
            session_id=session_id,
        )

    remove_notification_listener = hass.bus.async_listen(
        NOTIFICATION_ACTION_EVENT, handle_notification_action
    )

    def unregister() -> None:
        hass.services.async_remove(DOMAIN, SERVICE_SPEAK_TEXT)
        hass.services.async_remove(DOMAIN, SERVICE_PLAY_RECORDING)
        hass.services.async_remove(DOMAIN, SERVICE_REPLY_TEXT)
        hass.services.async_remove(DOMAIN, SERVICE_REPLY_RECORDING)
        hass.services.async_remove(DOMAIN, SERVICE_DELETE_TEMP)
        hass.services.async_remove(DOMAIN, SERVICE_SHOW_REPLY_VIEW)
        remove_notification_listener()

    return unregister


REPLY_SESSION_MAX_AGE_SECONDS = 1800
REPLY_SESSION_MAX_COUNT = 20


def _persist_reply_data(hass: HomeAssistant) -> None:
    """Schedule a debounced save of reply history/sessions to disk."""
    data = _data(hass)
    store: Store | None = data.get("store")
    if store is None:
        return
    store.async_delay_save(
        lambda: {
            "reply_history": data.get("reply_history", []),
            "reply_sessions": data.get("reply_sessions", {}),
            "last_reply": data.get("last_reply"),
        },
        2,
    )


def _store_reply_context(
    hass: HomeAssistant,
    call: ServiceCall,
    targets: list[str],
    kind: str,
    message: str,
) -> None:
    """Store reply context, keyed by session, for casted reply dashboards.

    Both a per-session record and a single 'latest' pointer are kept.
    The per-session record lets reply_text/reply_recording route a reply
    to the exact sender it was meant for, even if a newer message has
    since gone out to someone else. The 'latest' pointer is kept only for
    the voice-assistant reply switches, which have no way to know a
    session id and are intentionally best-effort ("reply to whoever most
    recently sent something").
    """
    session_id = call.data.get("sender_session_id")
    if not session_id:
        return
    context = {
        "session_id": session_id,
        "sender_name": call.data.get("sender_name", "Original sender"),
        "targets": targets,
        "kind": kind,
        "message": message[:240],
        "time": datetime.now().isoformat(),
    }
    data = _data(hass)
    data["reply_context"] = context
    sessions = data.setdefault("reply_sessions", {})
    sessions[session_id] = context
    _prune_reply_sessions(sessions)
    _persist_reply_data(hass)


def _prune_reply_sessions(
    sessions: dict[str, Any],
    max_age_seconds: int = REPLY_SESSION_MAX_AGE_SECONDS,
    max_sessions: int = REPLY_SESSION_MAX_COUNT,
) -> None:
    """Drop expired or excess reply sessions so this dict can't grow forever."""
    now = datetime.now()
    for session_id in list(sessions):
        stored_time_raw = sessions[session_id].get("time")
        try:
            stored_time = datetime.fromisoformat(stored_time_raw)
        except (TypeError, ValueError):
            sessions.pop(session_id, None)
            continue
        if (now - stored_time).total_seconds() > max_age_seconds:
            sessions.pop(session_id, None)
    if len(sessions) > max_sessions:
        oldest_first = sorted(sessions.items(), key=lambda kv: kv[1].get("time", ""))
        for session_id, _ in oldest_first[: len(sessions) - max_sessions]:
            sessions.pop(session_id, None)


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
        "auto_reply_view_enabled": bool(values.get("auto_reply_view_enabled", DEFAULT_AUTO_REPLY_VIEW_ENABLED)),
        "reply_dashboard_path": values.get("reply_dashboard_path", DEFAULT_REPLY_DASHBOARD_PATH),
        "reply_view_path": values.get("reply_view_path", DEFAULT_REPLY_VIEW_PATH),
        "reply_cast_delay_seconds": int(values.get("reply_cast_delay_seconds", DEFAULT_REPLY_CAST_DELAY_SECONDS)),
        "reply_notify_service": values.get("reply_notify_service", DEFAULT_REPLY_NOTIFY_SERVICE),
        "reply_phrases": values.get("reply_phrases", DEFAULT_REPLY_PHRASES),
        "stations_json": values.get("stations_json", DEFAULT_STATIONS_JSON),
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
    """Apply volume and chime before an announcement.

    Volume restore uses a per-target reference count (data["volume_refcounts"]).
    The true original volume for a target is only captured the first time we
    touch it while its refcount is 0; if a second message comes in for the
    same target before the first one's restore has fired, we increment the
    count instead of re-capturing, so we never mistake our own temporary
    "announcement volume" for the device's real original volume.
    """
    data = _data(hass)
    data.setdefault("restore_volumes", {})
    data.setdefault("volume_refcounts", {})
    if options["volume_enabled"]:
        for target in targets:
            refcounts = data["volume_refcounts"]
            if refcounts.get(target, 0) == 0:
                state = hass.states.get(target)
                old_volume = state.attributes.get("volume_level") if state else None
                if old_volume is not None:
                    data["restore_volumes"][target] = old_volume
            refcounts[target] = refcounts.get(target, 0) + 1
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


def _schedule_volume_restore(hass: HomeAssistant, options: dict[str, Any], targets: list[str]) -> None:
    """Restore target volumes after playback has had time to start.

    Only actually restores a target's volume once its reference count
    reaches zero, i.e. once every in-flight announcement that touched it
    has finished waiting. This prevents an overlapping second message from
    causing the first message's restore to fire early (or the second
    message's restore to fire against a target it never should have
    touched).
    """
    if not options["volume_enabled"]:
        return
    data = _data(hass)

    async def restore_later() -> None:
        await asyncio.sleep(options["restore_seconds"])
        refcounts = data.setdefault("volume_refcounts", {})
        restore_volumes = data.setdefault("restore_volumes", {})
        for target in targets:
            refcounts[target] = max(0, refcounts.get(target, 1) - 1)
            if refcounts[target] == 0:
                old_volume = restore_volumes.pop(target, None)
                if old_volume is not None:
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


async def _maybe_push_actionable_reply(
    hass: HomeAssistant, options: dict[str, Any], call: ServiceCall, message: str
) -> None:
    """Push an actionable notification so the recipient can quick-reply without walking to a display or using voice.

    Only fires when the send request included a recipient_notify target
    (the frontend sets this from the selected station's configured notify
    service) and a sender_session_id. Buttons are built from the same
    configured reply phrases used elsewhere, capped to a small number since
    most notification UIs only render a handful of actions well. The exact
    phrases used are snapshotted onto the session so a delayed button tap
    still resolves correctly even if reply_phrases gets reconfigured
    in the meantime.
    """
    service_name = str(call.data.get("recipient_notify") or "").strip()
    session_id = call.data.get("sender_session_id")
    if not service_name or not session_id:
        return
    if "." in service_name:
        domain, service = service_name.split(".", 1)
    else:
        domain, service = "notify", service_name
    if domain != "notify" or not service or not hass.services.has_service(domain, service):
        return
    phrases = parse_reply_phrases(options.get("reply_phrases"))[:NOTIFICATION_ACTION_MAX_BUTTONS]
    if not phrases:
        return
    session = _data(hass).get("reply_sessions", {}).get(session_id)
    if session is not None:
        session["reply_phrases_snapshot"] = phrases
    actions = [
        {"action": f"{NOTIFICATION_ACTION_PREFIX}::{session_id}::{index}", "title": phrase}
        for index, phrase in enumerate(phrases)
    ]
    await hass.services.async_call(
        domain,
        service,
        {
            "title": "Family Intercom",
            "message": message[:240],
            "data": {"actions": actions},
        },
        blocking=False,
    )


async def _maybe_show_reply_view(
    hass: HomeAssistant, options: dict[str, Any], targets: list[str], message: str
) -> None:
    """Optionally cast the configured reply view to display-like targets."""
    if not options["auto_reply_view_enabled"]:
        return
    display_targets = [target for target in targets if _looks_like_display(hass, target)]
    if not display_targets:
        return

    async def show_later() -> None:
        await asyncio.sleep(max(10, min(options["reply_cast_delay_seconds"], 180)))
        await _show_reply_view(
            hass,
            display_targets,
            options["reply_dashboard_path"],
            options["reply_view_path"],
            message,
        )

    hass.loop.create_task(show_later())


def _looks_like_display(hass: HomeAssistant, entity_id: str) -> bool:
    """Return true for likely visual cast targets."""
    state = hass.states.get(entity_id)
    value = f"{entity_id} {state.attributes.get('friendly_name', '') if state else ''}".lower()
    return any(term in value for term in ("display", "hub", "nesthub", "nest_hub", "chromecast"))


async def _show_reply_view(
    hass: HomeAssistant,
    targets: list[str],
    dashboard_path: str,
    view_path: str,
    message: str,
) -> None:
    """Cast a Lovelace reply view to one or more media players."""
    dashboard_path = (dashboard_path or DEFAULT_REPLY_DASHBOARD_PATH).strip().strip("/")
    view_path = (view_path or DEFAULT_REPLY_VIEW_PATH).strip().strip("/")
    if not dashboard_path or not view_path:
        return
    for target in targets:
        try:
            await hass.services.async_call(
                "cast",
                "show_lovelace_view",
                {
                    CONF_ENTITY_ID: target,
                    "dashboard_path": dashboard_path,
                    "view_path": view_path,
                },
                blocking=False,
            )
        except Exception:  # noqa: BLE001 - cast availability varies by install.
            _LOGGER.debug(
                "Could not cast Family Intercom reply view to %s after %s",
                target,
                message[:80],
                exc_info=True,
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
                    "js_url": f"{STATIC_URL}/{FRONTEND_MODULE}",
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


def _schedule_lovelace_resource_registration(hass: HomeAssistant):
    """Schedule Lovelace resource registration without blocking integration setup."""
    task = hass.loop.create_task(_async_register_lovelace_resource(hass))

    def unload() -> None:
        if not task.done():
            task.cancel()

    return unload


async def _async_register_lovelace_resource(hass: HomeAssistant) -> None:
    """Register the Family Intercom card as a Lovelace module resource for Cast receivers.

    The sidebar panel can load the JS directly, but Google Cast Lovelace receivers
    need custom cards to be listed under Dashboard resources. Without that, the
    cast target can open the dashboard route and still show a dark/blank screen.
    """
    resource_base = f"{STATIC_URL}/{FRONTEND_MODULE}"
    resource_url = f"{resource_base}?v={INTEGRATION_VERSION}"
    legacy_prefix = f"{STATIC_URL}/family-intercom-panel-"

    try:
        for _attempt in range(12):
            lovelace = hass.data.get("lovelace")
            resources = getattr(lovelace, "resources", None) if lovelace else None
            if resources is not None:
                mode = getattr(lovelace, "mode", getattr(lovelace, "resource_mode", "storage"))
                if mode != "storage":
                    _LOGGER.info(
                        "Family Intercom Lovelace resource must be added manually in YAML mode: %s",
                        resource_url,
                    )
                    return

                if not getattr(resources, "loaded", True) and hasattr(resources, "async_load"):
                    await resources.async_load()

                for resource in resources.async_items():
                    existing_url = str(resource.get("url", ""))
                    existing_base = existing_url.split("?", 1)[0]
                    if existing_base == resource_base and resource.get("res_type") == "module":
                        if existing_url != resource_url:
                            await resources.async_update_item(resource["id"], {"url": resource_url, "res_type": "module"})
                        return
                    if existing_base.startswith(legacy_prefix):
                        await resources.async_update_item(resource["id"], {"url": resource_url, "res_type": "module"})
                        return

                await resources.async_create_item({"url": resource_url, "res_type": "module"})
                return

            await asyncio.sleep(5)
        _LOGGER.debug("Family Intercom Lovelace resources were not ready; card resource was not auto-registered")
    except asyncio.CancelledError:
        raise
    except Exception:  # noqa: BLE001 - Lovelace internals differ between HA versions.
        _LOGGER.exception("Could not auto-register Family Intercom Lovelace card resource")


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
