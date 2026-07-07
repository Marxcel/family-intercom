"""Config flow for Family Intercom."""

from __future__ import annotations

import voluptuous as vol

from homeassistant import config_entries

from .const import DEFAULT_CLEANUP_SECONDS, DEFAULT_SHOW_SIDEBAR, DEFAULT_TTS_ENTITY, DOMAIN


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

        schema = vol.Schema(
            {
                vol.Optional("tts_entity", default=DEFAULT_TTS_ENTITY): str,
                vol.Optional("cleanup_seconds", default=DEFAULT_CLEANUP_SECONDS): vol.Coerce(int),
                vol.Optional("show_sidebar", default=DEFAULT_SHOW_SIDEBAR): bool,
            }
        )
        return self.async_show_form(step_id="user", data_schema=schema, errors=errors)
