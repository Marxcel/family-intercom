"""HTTP media endpoint for Family Intercom."""

from __future__ import annotations

import io
import math
import struct
import wave

from aiohttp import web

from homeassistant.components.http import HomeAssistantView

from .const import DOMAIN
from .helpers import parse_reply_phrases, parse_stations


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


class FamilyIntercomChimeView(HomeAssistantView):
    """Serve a small generated chime."""

    url = f"/api/{DOMAIN}/chime"
    name = f"api:{DOMAIN}:chime"
    requires_auth = False

    async def get(self, request):
        """Return a generated WAV chime."""
        return web.Response(body=_chime_wav(), headers={"Content-Type": "audio/wav"})


class FamilyIntercomReplyContextView(HomeAssistantView):
    """Return the latest reply context for casted reply dashboards."""

    url = f"/api/{DOMAIN}/reply_context"
    name = f"api:{DOMAIN}:reply_context"
    requires_auth = False

    async def get(self, request):
        """Return latest reply context."""
        hass = request.app["hass"]
        context = hass.data.get(DOMAIN, {}).get("reply_context") or {}
        return web.json_response(context)


class FamilyIntercomConfigView(HomeAssistantView):
    """Return panel configuration."""

    url = f"/api/{DOMAIN}/config"
    name = f"api:{DOMAIN}:config"
    requires_auth = True

    async def get(self, request):
        """Return configured stations and reply phrases."""
        hass = request.app["hass"]
        options = hass.data.get(DOMAIN, {}).get("options") or {}
        return web.json_response(
            {
                "stations": parse_stations(options.get("stations_json")),
                "reply_phrases": parse_reply_phrases(options.get("reply_phrases")),
            }
        )


class FamilyIntercomInboxView(HomeAssistantView):
    """Return reply history."""

    url = f"/api/{DOMAIN}/inbox"
    name = f"api:{DOMAIN}:inbox"
    requires_auth = True

    async def get(self, request):
        """Return latest replies."""
        hass = request.app["hass"]
        return web.json_response({"replies": hass.data.get(DOMAIN, {}).get("reply_history", [])[:50]})


def _chime_wav() -> bytes:
    """Generate a short two-tone WAV chime."""
    sample_rate = 22050
    duration = 0.72
    frames = int(sample_rate * duration)
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(sample_rate)
        for index in range(frames):
            position = index / sample_rate
            freq = 660 if position < 0.34 else 880
            envelope = min(1.0, position * 18) * max(0.0, 1 - position / duration)
            sample = int(18000 * envelope * math.sin(2 * math.pi * freq * position))
            wav.writeframes(struct.pack("<h", sample))
    return buffer.getvalue()
