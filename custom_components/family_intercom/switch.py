"""Reply switches for Family Intercom."""

from __future__ import annotations

from dataclasses import dataclass

from homeassistant.components.switch import SwitchEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import DOMAIN
from .helpers import parse_reply_phrases, slugify
from .reply import async_send_reply


@dataclass(frozen=True)
class ReplyChoice:
    """A voice-friendly reply choice."""

    key: str
    name: str
    message: str


REPLY_CHOICES = [
    ReplyChoice("reply", "Intercom Reply", "Okay."),
    ReplyChoice("yes", "Intercom Reply Yes", "Yes."),
    ReplyChoice("no", "Intercom Reply No", "No."),
    ReplyChoice("okay", "Intercom Reply Okay", "Okay."),
    ReplyChoice("coming", "Intercom Reply Coming", "I am coming."),
    ReplyChoice("help", "Intercom Reply Need Help", "I need help please."),
    ReplyChoice("call_me", "Intercom Reply Call Me", "Call me please."),
    ReplyChoice("short_yes", "Intercom Yes", "Yes."),
    ReplyChoice("short_no", "Intercom No", "No."),
    ReplyChoice("short_okay", "Intercom Okay", "Okay."),
    ReplyChoice("short_coming", "Intercom Coming", "I am coming."),
    ReplyChoice("short_help", "Intercom Help", "I need help please."),
    ReplyChoice("short_call_me", "Intercom Call Me", "Call me please."),
]


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up Family Intercom reply switches."""
    options = {**entry.data, **entry.options}
    choices = list(REPLY_CHOICES)
    existing = {choice.message.lower() for choice in choices}
    custom_choices = [
        ReplyChoice(f"custom_{index}_{slugify(phrase)}", f"Intercom {phrase.rstrip('.')}", phrase)
        for index, phrase in enumerate(parse_reply_phrases(options.get("reply_phrases")), start=1)
    ]
    choices.extend(choice for choice in custom_choices if choice.message.lower() not in existing)
    async_add_entities(FamilyIntercomReplySwitch(hass, entry, choice) for choice in choices)


class FamilyIntercomReplySwitch(SwitchEntity):
    """Momentary switch that replies to the latest intercom sender."""

    _attr_has_entity_name = False

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry, choice: ReplyChoice) -> None:
        """Initialize switch."""
        self.hass = hass
        self.entry = entry
        self.choice = choice
        self._attr_unique_id = f"{DOMAIN}_reply_{choice.key}"
        self._attr_name = choice.name
        self._attr_icon = "mdi:reply"
        self._attr_is_on = False

    @property
    def device_info(self):
        """Return device information."""
        return {
            "identifiers": {(DOMAIN, self.entry.entry_id)},
            "name": "Family Intercom",
            "manufacturer": "Family Intercom",
        }

    @property
    def extra_state_attributes(self):
        """Return latest reply context metadata."""
        context = self.hass.data.get(DOMAIN, {}).get("reply_context") or {}
        return {
            "reply_message": self.choice.message,
            "latest_sender": context.get("sender_name"),
            "latest_message": context.get("message"),
            "latest_targets": context.get("targets"),
        }

    async def async_turn_on(self, **kwargs) -> None:
        """Send this reply to the latest sender and return to off."""
        options = {**self.entry.data, **self.entry.options}
        await async_send_reply(
            self.hass,
            self.choice.message,
            kind="text",
            from_name="Google display",
            notify_service=options.get("reply_notify_service"),
        )
        self._attr_is_on = False
        self.async_write_ha_state()

    async def async_turn_off(self, **kwargs) -> None:
        """Keep switch off."""
        self._attr_is_on = False
        self.async_write_ha_state()
