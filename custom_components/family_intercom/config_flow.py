"""Config flow for Family Intercom."""

from __future__ import annotations

import voluptuous as vol

from homeassistant import config_entries

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
)


class FamilyIntercomConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a config flow for Family Intercom."""

    VERSION = 1

    async def async_step_user(self, user_input=None):
        """Create the integration config entry."""
        await self.async_set_unique_id(DOMAIN)
        self._abort_if_unique_id_configured()

        errors = {}
        if user_input is not None:
            cleanup_seconds = user_input.get("cleanup_seconds", DEFAULT_CLEANUP_SECONDS)
            if cleanup_seconds < 15:
                errors["cleanup_seconds"] = "cleanup_too_short"
            else:
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
        self.config_entry = config_entry

    async def async_step_init(self, user_input=None):
        """Manage options."""
        errors = {}
        current = {**self.config_entry.data, **self.config_entry.options}
        if user_input is not None:
            if user_input.get("cleanup_seconds", DEFAULT_CLEANUP_SECONDS) < 15:
                errors["cleanup_seconds"] = "cleanup_too_short"
            else:
                return self.async_create_entry(title="", data=user_input)

        schema = _options_schema(current)
        return self.async_show_form(step_id="init", data_schema=schema, errors=errors)


def _options_schema(current):
    """Return shared options schema."""
    return vol.Schema(
        {
            vol.Optional("tts_entity", default=current.get("tts_entity", DEFAULT_TTS_ENTITY)): str,
            vol.Optional("cleanup_seconds", default=current.get("cleanup_seconds", DEFAULT_CLEANUP_SECONDS)): vol.Coerce(int),
            vol.Optional("show_sidebar", default=current.get("show_sidebar", DEFAULT_SHOW_SIDEBAR)): bool,
            vol.Optional("chime_enabled", default=current.get("chime_enabled", DEFAULT_CHIME_ENABLED)): bool,
            vol.Optional("volume_enabled", default=current.get("volume_enabled", DEFAULT_VOLUME_ENABLED)): bool,
            vol.Optional("volume_level", default=current.get("volume_level", DEFAULT_VOLUME_LEVEL)): vol.All(vol.Coerce(float), vol.Range(min=0.0, max=1.0)),
            vol.Optional("restore_seconds", default=current.get("restore_seconds", DEFAULT_RESTORE_SECONDS)): vol.Coerce(int),
            vol.Optional("quiet_hours_enabled", default=current.get("quiet_hours_enabled", DEFAULT_QUIET_HOURS_ENABLED)): bool,
            vol.Optional("quiet_start", default=current.get("quiet_start", DEFAULT_QUIET_START)): str,
            vol.Optional("quiet_end", default=current.get("quiet_end", DEFAULT_QUIET_END)): str,
        }
    )
