"""HTTP media endpoint for Family Intercom."""

from __future__ import annotations

from aiohttp import web

from homeassistant.components.http import HomeAssistantView

from .const import DOMAIN


class FamilyIntercomMediaView(HomeAssistantView):
    """Serve unguessable temporary intercom media to cast devices."""

    url = f"/api/{DOMAIN}/media/{{recording_id}}"
    name = f"api:{DOMAIN}:media"
    requires_auth = False

    async def get(self, request, recording_id: str):
        """Return the temporary media file."""
        hass = request.app["hass"]
        recording = hass.data.get(DOMAIN, {}).get("recordings", {}).get(recording_id)
        if not recording or not recording.path.exists():
            raise web.HTTPNotFound()
        return web.FileResponse(recording.path, headers={"Content-Type": recording.content_type})
