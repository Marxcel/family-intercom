"""Reply helpers for Family Intercom."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from homeassistant.core import HomeAssistant

from .const import DOMAIN

EVENT_REPLY = f"{DOMAIN}_reply"
EVENT_REPLY_STATUS = f"{DOMAIN}_reply_status"


def _data(hass: HomeAssistant) -> dict[str, Any]:
    """Return domain data."""
    return hass.data.setdefault(DOMAIN, {"recordings": {}, "cleanup_tasks": set()})


def _persist(hass: HomeAssistant) -> None:
    """Schedule a debounced save of reply history/sessions to disk.

    Mirrors the helper of the same purpose in __init__.py; duplicated
    rather than imported to avoid a circular import between the two
    modules (__init__.py already imports async_send_reply from here).
    """
    data = _data(hass)
    store = data.get("store")
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


async def async_send_reply(
    hass: HomeAssistant,
    message: str,
    *,
    kind: str = "text",
    from_name: str = "Family Intercom",
    media_url: str | None = None,
    content_type: str | None = None,
    notify_service: str | None = None,
    session_id: str | None = None,
) -> dict[str, Any]:
    """Store and deliver a reply.

    If ``session_id`` is provided (the normal case: a reply sent from the
    panel), the reply is routed to that exact session only. It must NOT
    silently fall back to "whatever is latest" - doing so is what caused
    replies to be misdelivered to the wrong original sender when multiple
    intercom messages were in flight at once.

    If ``session_id`` is omitted entirely (the voice-assistant reply
    switches don't know a session id), fall back to the single latest
    sender context, matching the previous best-effort behavior for that
    use case only.
    """
    domain_data = hass.data.get(DOMAIN, {})
    if session_id:
        context = (domain_data.get("reply_sessions") or {}).get(session_id) or {}
        status_if_missing = "session_expired"
    else:
        context = domain_data.get("reply_context") or {}
        status_if_missing = "no_active_sender"

    resolved_session_id = context.get("session_id")
    now = datetime.now().isoformat()
    status = "delivered" if resolved_session_id else status_if_missing
    session_id = resolved_session_id
    reply = {
        "session_id": session_id,
        "kind": kind,
        "message": message,
        "media_url": media_url,
        "content_type": content_type,
        "from": from_name,
        "status": status,
        "sender_name": context.get("sender_name"),
        "original_message": context.get("message"),
        "original_targets": context.get("targets"),
        "time": now,
    }
    _data(hass)["last_reply"] = reply
    history = list(_data(hass).get("reply_history", []))
    history.insert(0, reply)
    _data(hass)["reply_history"] = history[:50]
    _persist(hass)

    if session_id:
        event_data = {
            "session_id": session_id,
            "kind": kind,
            "message": message,
            "from": from_name,
        }
        if media_url:
            event_data["media_url"] = media_url
        if content_type:
            event_data["content_type"] = content_type
        hass.bus.async_fire(EVENT_REPLY, event_data)

    hass.bus.async_fire(EVENT_REPLY_STATUS, reply)
    await _maybe_notify(hass, notify_service, reply)
    return reply


async def _maybe_notify(hass: HomeAssistant, notify_service: str | None, reply: dict[str, Any]) -> None:
    """Send optional HA notification for a reply."""
    service_name = (notify_service or "").strip()
    if not service_name:
        return
    if "." in service_name:
        domain, service = service_name.split(".", 1)
    else:
        domain, service = "notify", service_name
    if domain != "notify" or not service:
        return
    if not hass.services.has_service(domain, service):
        reply["notification_status"] = "service_not_found"
        return
    title = "Family Intercom reply"
    status = reply.get("status")
    message = reply.get("message") or "Reply received"
    if status == "no_active_sender":
        message = f"{message} (no active sender page found)"
    await hass.services.async_call(
        domain,
        service,
        {
            "title": title,
            "message": message,
        },
        blocking=False,
    )
