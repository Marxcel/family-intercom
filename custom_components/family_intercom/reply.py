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


async def async_send_reply(
    hass: HomeAssistant,
    message: str,
    *,
    kind: str = "text",
    from_name: str = "Family Intercom",
    media_url: str | None = None,
    content_type: str | None = None,
    notify_service: str | None = None,
) -> dict[str, Any]:
    """Store and deliver a reply to the latest sender context."""
    context = hass.data.get(DOMAIN, {}).get("reply_context") or {}
    session_id = context.get("session_id")
    now = datetime.now().isoformat()
    status = "delivered" if session_id else "no_active_sender"
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
