"""Config flow for Family Intercom."""

from __future__ import annotations

import json

import voluptuous as vol

from homeassistant import config_entries
from homeassistant.helpers import selector

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
    DEFAULT_REPLY_PHRASES,
    DEFAULT_REPLY_VIEW_PATH,
    DEFAULT_RESTORE_SECONDS,
    DEFAULT_SHOW_SIDEBAR,
    DEFAULT_STATIONS_JSON,
    DEFAULT_TTS_ENTITY,
    DEFAULT_VOLUME_ENABLED,
    DEFAULT_VOLUME_LEVEL,
    DOMAIN,
)
from .helpers import parse_stations


def _validate(user_input: dict) -> dict:
    """Validate cross-field rules that a plain selector can't express on its own.

    Returns a dict of field -> error key, empty if everything is valid.
    """
    errors: dict[str, str] = {}
    if user_input.get("cleanup_seconds", DEFAULT_CLEANUP_SECONDS) < 15:
        errors["cleanup_seconds"] = "cleanup_too_short"

    stations_raw = str(user_input.get("stations_json") or "").strip()
    if stations_raw:
        try:
            parsed = json.loads(stations_raw)
        except (TypeError, ValueError):
            errors["stations_json"] = "invalid_json"
        else:
            if not isinstance(parsed, list):
                errors["stations_json"] = "invalid_json"
            elif parsed and not parse_stations(stations_raw):
                # Valid JSON, but every entry was missing a usable name/targets pair.
                errors["stations_json"] = "invalid_stations"
    return errors


class FamilyIntercomConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a config flow for Family Intercom."""

    VERSION = 1

    async def async_step_user(self, user_input=None):
        """Create the integration config entry."""
        await self.async_set_unique_id(DOMAIN)
        self._abort_if_unique_id_configured()

        errors = {}
        if user_input is not None:
            errors = _validate(user_input)
            if not errors:
                return self.async_create_entry(title="Family Intercom", data=user_input)

        schema = _options_schema({})
        return self.async_show_form(step_id="user", data_schema=schema, errors=errors)

    @staticmethod
    def async_get_options_flow(config_entry):
        """Return options flow."""
        return FamilyIntercomOptionsFlow(config_entry)


class FamilyIntercomOptionsFlow(config_entries.OptionsFlow):
    """Handle Family Intercom options."""

    def __init__(self, config_entry):
        """Initialize options flow."""
        self._config_entry = config_entry

    async def async_step_init(self, user_input=None):
        """Manage options."""
        errors = {}
        current = {**self._config_entry.data, **self._config_entry.options}
        if user_input is not None:
            errors = _validate(user_input)
            if not errors:
                return self.async_create_entry(title="", data=user_input)

        schema = _options_schema(current)
        return self.async_show_form(step_id="init", data_schema=schema, errors=errors)


def _options_schema(current):
    """Return shared options schema, using UI-friendly selectors instead of raw typed text."""
    return vol.Schema(
        {
            vol.Optional(
                "tts_entity", default=current.get("tts_entity", DEFAULT_TTS_ENTITY)
            ): selector.EntitySelector(selector.EntitySelectorConfig(domain="tts")),
            vol.Optional(
                "cleanup_seconds", default=current.get("cleanup_seconds", DEFAULT_CLEANUP_SECONDS)
            ): selector.NumberSelector(
                selector.NumberSelectorConfig(min=15, max=600, step=5, mode="box", unit_of_measurement="seconds")
            ),
            vol.Optional(
                "show_sidebar", default=current.get("show_sidebar", DEFAULT_SHOW_SIDEBAR)
            ): selector.BooleanSelector(),
            vol.Optional(
                "chime_enabled", default=current.get("chime_enabled", DEFAULT_CHIME_ENABLED)
            ): selector.BooleanSelector(),
            vol.Optional(
                "volume_enabled", default=current.get("volume_enabled", DEFAULT_VOLUME_ENABLED)
            ): selector.BooleanSelector(),
            vol.Optional(
                "volume_level", default=current.get("volume_level", DEFAULT_VOLUME_LEVEL)
            ): selector.NumberSelector(
                selector.NumberSelectorConfig(min=0.0, max=1.0, step=0.01, mode="slider")
            ),
            vol.Optional(
                "restore_seconds", default=current.get("restore_seconds", DEFAULT_RESTORE_SECONDS)
            ): selector.NumberSelector(
                selector.NumberSelectorConfig(min=0, max=120, step=1, mode="box", unit_of_measurement="seconds")
            ),
            vol.Optional(
                "quiet_hours_enabled", default=current.get("quiet_hours_enabled", DEFAULT_QUIET_HOURS_ENABLED)
            ): selector.BooleanSelector(),
            vol.Optional(
                "quiet_start", default=current.get("quiet_start", DEFAULT_QUIET_START)
            ): selector.TimeSelector(),
            vol.Optional(
                "quiet_end", default=current.get("quiet_end", DEFAULT_QUIET_END)
            ): selector.TimeSelector(),
            vol.Optional(
                "auto_reply_view_enabled",
                default=current.get("auto_reply_view_enabled", DEFAULT_AUTO_REPLY_VIEW_ENABLED),
            ): selector.BooleanSelector(),
            vol.Optional(
                "reply_dashboard_path", default=current.get("reply_dashboard_path", DEFAULT_REPLY_DASHBOARD_PATH)
            ): selector.TextSelector(),
            vol.Optional(
                "reply_view_path", default=current.get("reply_view_path", DEFAULT_REPLY_VIEW_PATH)
            ): selector.TextSelector(),
            vol.Optional(
                "reply_cast_delay_seconds",
                default=current.get("reply_cast_delay_seconds", DEFAULT_REPLY_CAST_DELAY_SECONDS),
            ): selector.NumberSelector(
                selector.NumberSelectorConfig(min=10, max=180, step=5, mode="box", unit_of_measurement="seconds")
            ),
            vol.Optional(
                "reply_notify_service",
                default=current.get("reply_notify_service", DEFAULT_REPLY_NOTIFY_SERVICE),
            ): selector.TextSelector(),
            vol.Optional(
                "reply_phrases", default=current.get("reply_phrases", DEFAULT_REPLY_PHRASES)
            ): selector.TextSelector(selector.TextSelectorConfig(multiline=True)),
            vol.Optional(
                "stations_json", default=current.get("stations_json", DEFAULT_STATIONS_JSON)
            ): selector.TextSelector(selector.TextSelectorConfig(multiline=True)),
        }
    )
