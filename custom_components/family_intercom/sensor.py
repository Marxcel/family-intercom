"""Sensors for Family Intercom."""

from __future__ import annotations

from homeassistant.components.sensor import SensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import DOMAIN
from .reply import EVENT_REPLY_STATUS


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up Family Intercom sensors."""
    async_add_entities([FamilyIntercomLastReplySensor(hass, entry)])


class FamilyIntercomLastReplySensor(SensorEntity):
    """Show the latest intercom reply status."""

    _attr_has_entity_name = False
    _attr_icon = "mdi:message-reply-text"

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        """Initialize sensor."""
        self.hass = hass
        self.entry = entry
        self._attr_unique_id = f"{DOMAIN}_last_reply"
        self._attr_name = "Last Intercom Reply"

    async def async_added_to_hass(self) -> None:
        """Register update listener."""
        self.async_on_remove(
            self.hass.bus.async_listen(EVENT_REPLY_STATUS, self._handle_reply_status)
        )

    @callback
    def _handle_reply_status(self, event) -> None:
        """Update when a reply is sent."""
        self.async_write_ha_state()

    @property
    def native_value(self):
        """Return latest reply message."""
        reply = self.hass.data.get(DOMAIN, {}).get("last_reply") or {}
        return reply.get("message") or "No reply"

    @property
    def extra_state_attributes(self):
        """Return reply metadata."""
        reply = self.hass.data.get(DOMAIN, {}).get("last_reply") or {}
        return {
            "status": reply.get("status"),
            "kind": reply.get("kind"),
            "from": reply.get("from"),
            "time": reply.get("time"),
            "sender_name": reply.get("sender_name"),
            "original_message": reply.get("original_message"),
            "original_targets": reply.get("original_targets"),
            "session_id": reply.get("session_id"),
            "notification_status": reply.get("notification_status"),
        }

    @property
    def device_info(self):
        """Return device information."""
        return {
            "identifiers": {(DOMAIN, self.entry.entry_id)},
            "name": "Family Intercom",
            "manufacturer": "Family Intercom",
        }
