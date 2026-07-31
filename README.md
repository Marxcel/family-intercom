# Family Intercom for Home Assistant

Family Intercom is a Home Assistant HACS integration that turns your existing media players, smart displays, speakers, tablets, and browser dashboards into a household intercom. It sends typed announcements or temporary voice recordings to selected devices or named stations, tracks available targets live, and supports reply workflows through Home Assistant events, mobile notifications, and voice-friendly switches.

Short description: send typed or recorded intercom announcements to Home Assistant media players and stations, with reply history, quick replies, live device detection, and optional Google/Nest display reply views.

It can:

- Speak typed messages on a selected `media_player`.
- Record a short voice message from a phone, tablet, or browser and play that recording on a selected speaker/display.
- Delete temporary voice clips automatically after playback.
- Register a Home Assistant sidebar panel without creating loose helpers or scripts.
- Detect Home Assistant media players every time the panel updates.
- Keep controllable devices visible when they are idle, off, standby, paused, or playing.
- Hide devices Home Assistant marks as `unavailable` or `unknown`.
- Target one device, all available devices, or smart room presets such as displays, speakers, TVs, groups, kitchen, living room, bedrooms, office, and garage.
- Play an optional chime before announcements.
- Optionally set announcement volume and restore the previous volume afterward.
- Keep a local send history in the browser for quick repeats.
- Use a simple Mic toggle: tap Mic to record, tap Stop to send.
- Send an emergency broadcast to every currently available media player.
- Respect quiet hours for normal messages while allowing emergency broadcasts.
- Show per-room quick messages based on the selected target.
- Switch to a larger display mode for Google/Nest displays and wall tablets.
- Manage sidebar, chime, volume, cleanup, and quiet-hours settings from the integration options page.
- Search media players by room, device name, entity ID, state, or type.
- Save favorite targets for faster household announcements.
- Save custom quick messages directly from the panel.
- Require a second confirmation tap before emergency broadcasts.
- Optionally cast a reply dashboard view to Google/Nest displays after an intercom message.
- Send compact actionable notifications to a phone/watch notify service for Samsung Galaxy Watch or Wear OS use.
- Use a diagnostics screen to confirm the version, frontend module, available devices, stations, reply sessions, and watch setup status.

Google/Nest displays are reliable as output devices. Phones, tablets, wall tablets, or normal browsers are the reliable recording/input devices because Google/Nest display microphones are controlled by Google Assistant and are not generally available to Home Assistant web panels.

## Changelog

### 0.8.4

Mobile layout release:

- Fixed the Family Intercom panel being clipped inside the Home Assistant mobile app by making the panel its own full-height scroll container on phones.
- Added larger mobile bottom safe-area padding so Android navigation and Home Assistant app controls do not cover the lower dashboard controls.
- Compressed the mobile hero/header so the actual intercom dashboard controls are visible sooner.
- Updated the frontend module to `family-intercom-panel-v17.js` and the cache-buster to `0.8.4`.

### 0.8.3

Branding release:

- Added a custom Family Intercom brand icon so HACS and Home Assistant do not show the generic "icon not available" placeholder.
- Added `brand/icon.png` and `brand/logo.png` at the repository root for HACS.
- Added matching local brand assets under `custom_components/family_intercom/brand/` for Home Assistant's integration branding.
- Kept the HACS/GitHub description in place.
- Updated the integration version to `0.8.3`.

### 0.8.2

Metadata release:

- Added the precise Family Intercom description directly to `hacs.json` so HACS has a repo-local description to ingest.
- Kept the GitHub repository description set to: "Home Assistant HACS integration for typed and voice household intercom announcements, stations, quick replies, reply history, and watch-friendly notifications."
- Updated the integration version to `0.8.2` so HACS gets a fresh metadata update.

### 0.8.1

Bugfix release:

- Removed the separate "Stop and send recording" button from the panel. The large Mic button is now the single recording control: tap Mic to start recording, then tap the same large Stop button to stop and send.
- Added visible star buttons beside the individual device chips so devices can be saved to Favorites without scrolling down into the Available now list.
- Updated the frontend module to `family-intercom-panel-v16.js` and the cache-buster to `0.8.1`.

### 0.8.0

Organization and watch release:

- Added a cleaner, station-first panel layout with section shortcuts for Send, Replies, Devices, and Diagnostics.
- Added richer station cards. Station JSON can now include optional `description`, `icon`, `color`, and `mode`/`type` fields so stations can look and read like real intercom points instead of raw entity chips.
- Added a visible recording timer so users can see how long a voice clip has been recording.
- Added explicit send modes: Normal, Quiet, Watch, and Emergency. Watch mode sends a compact notification through the configured watch notify service.
- Added `watch_notify_service` to the integration options page for Samsung Galaxy Watch / Wear OS workflows through the Home Assistant Companion App notification pipeline.
- Added the `family_intercom.watch_prompt` service for automations, scripts, dashboards, and watch actions.
- Added an authenticated diagnostics API and panel diagnostics screen showing integration version, active frontend module, visible/hidden media players, station availability, reply counts, temporary recordings, and watch/reply configuration status.
- Improved mobile organization so the panel is easier to use from phones, tablets, wall panels, and display dashboards.
- Updated the frontend module to `family-intercom-panel-v15.js` and the cache-buster to `0.8.0`.

### 0.7.5

Bugfix release:

- Changed the large Mic button into a true record toggle: tap Mic to start recording, then tap the same large Stop button to stop and automatically send the recording to the selected target.
- Kept the smaller "Stop and send recording" button as a backup action that performs the same stop-and-send behavior.
- Updated the frontend resource cache-buster to `0.7.5`.

### 0.7.4

Metadata release:

- Added a precise GitHub repository description for HACS/GitHub listings.
- Clarified the README opening summary so users immediately understand what the integration does.
- Updated the frontend resource cache-buster to `0.7.4`.

### 0.7.3

Bugfix release:

- Moved the frontend panel from `family-intercom-panel-v13.js` to `family-intercom-panel-v14.js` so Home Assistant cannot keep serving a cached copy of the old panel.
- Added cache-busting to the sidebar panel registration itself.
- Updated the panel API helper to prefer Home Assistant's `hass.callApi()` method before falling back to authenticated fetch.

### 0.7.2

Bugfix release:

- Fixed the panel config loader to use Home Assistant's authenticated fetch helper. This prevents the panel from trying to parse `403: Forbidden` responses as JSON and showing `Could not load intercom config: Unexpected non-whitespace character after JSON`.
- Updated the frontend resource cache-buster to `0.7.2`.

### 0.7.1

Maintenance release:

- Updated Home Assistant dashboard path examples to `123-nice-st`.
- Updated the frontend resource cache-buster to `0.7.1`.

### 0.7.0

Feature release:

- **Reply history and reply sessions now survive restarts.** Previously everything lived only in memory, so a Home Assistant restart (including the kind that happens right after a HACS update) silently wiped reply history and any in-flight reply sessions. Both are now saved to disk and reloaded automatically.
- **Actionable push-notification quick replies.** A station can now have its `notify` field actually used: when you send a message to a station that has one configured, the recipient also gets a push notification with tappable quick-reply buttons (built from your configured reply phrases) that reply immediately - no need to walk up to a display or use a voice command. This is the `notify` field that stations already supported in the config but that wasn't wired up to anything until now.
- **Friendlier options page.** Settings are now proper pickers instead of raw text: an entity dropdown for the TTS entity, a slider for announcement volume, number boxes with sensible min/max for all the seconds fields, and real time pickers for quiet hours. Reply phrases and stations JSON are now multi-line text areas instead of single-line fields.
- **Real validation for stations JSON.** Invalid JSON or a station missing a usable name/targets now shows a clear error on the options page instead of silently doing nothing.
- Small panel polish: a brief confirmation flash when a message sends successfully, a bell badge on station chips that have quick-reply notifications configured, clearer graying-out of offline stations, and a subtle fade-in for cards.

### 0.6.1

Bugfix release:

- **Fixed replies being routed to the wrong sender.** `reply_text` and `reply_recording` previously accepted a `session_id` but silently ignored it, always delivering to whichever intercom message was sent most recently overall. If two messages were sent close together to different people, a reply could go to the wrong one. Replies sent with a `session_id` are now routed to that exact sender; reply switches (which have no session id) keep the previous best-effort "reply to whoever was latest" behavior.
- **Fixed announcement volume drifting on rapid successive messages.** If a second message was sent to the same device before the first one's volume-restore delay had finished, the code could mistake the temporarily raised volume for the device's real original volume and leave it there. Volume restore now uses a per-device reference count so the true original volume is only captured once and only restored after every in-flight announcement to that device has finished.
- Removed 12 unused legacy panel JS files (`family-intercom-panel.js` through `-v12.js`) that were left behind from earlier versions and only added dead weight to the HACS download; only the active `-v13.js` panel remains.

**Known limitation (unchanged):** `/api/family_intercom/reply_context` intentionally does not require authentication, so that Cast displays running the reply view can read it without logging in. This means anyone with network access to your Home Assistant instance can read the most recently sent intercom message's text, sender name, and target devices from that endpoint. Keep this in mind before sending anything sensitive, especially if remote access is enabled.

## HACS installation

1. Add this repository as a custom repository in HACS.
2. Category: Integration.
3. Install **Family Intercom**.
4. Restart Home Assistant.
5. Go to **Settings > Devices & services > Add integration > Family Intercom**.

After setup, open **Family Intercom** from the Home Assistant sidebar.

To adjust behavior later, open **Settings > Devices & services > Family Intercom > Configure**.

## Recommended use

The default install shows **Family Intercom** in the Home Assistant sidebar. This is recommended because intercom use needs more room than a small card: target picker, typed message, recording controls, quick messages, and a live list of available devices.

During setup, you can disable the sidebar entry if you only want to use the integration services or an optional dashboard card.

## Features

- **Versioned frontend asset:** The panel uses a versioned JavaScript file so Home Assistant and browser caches pick up new UI releases reliably.
- **Mobile-safe layout:** Phone views wrap controls, truncate long device names, and add bottom spacing for mobile navigation bars.
- **Room presets:** The panel builds presets from live Home Assistant `media_player` names and entity IDs. No fixed room list is stored.
- **Chime:** A short generated WAV chime can play before messages. This is enabled by default.
- **Volume handling:** Optional temporary volume control lets you set the target volume before playback and restore previous volume after a delay.
- **Send history:** The last sent messages are stored in the browser's local storage, not in Home Assistant.
- **Mic toggle recording:** Tap Mic to start recording, then tap the same large Stop button to stop and automatically send. No separate stop button is needed.
- **Emergency broadcast:** Sends a priority message to every currently available media player and bypasses quiet hours.
- **Emergency confirmation:** The emergency button requires a second press within five seconds to prevent accidental whole-house announcements.
- **Quiet hours:** Normal announcements can be blocked during configured times.
- **Quick messages:** Buttons adapt to the selected room/device where possible.
- **Custom quick messages:** Save common household phrases in the browser and reuse them without creating Home Assistant helpers.
- **Favorites:** Star frequently used devices so they stay at the top of the intercom workflow.
- **Device search:** Search the live media-player list when the home has many speakers, hubs, and groups.
- **Display mode:** Enlarges controls and reduces clutter for Google/Nest displays, tablets, and wall dashboards.
- **Reply view casting:** Optionally calls `cast.show_lovelace_view` after a message so a Google/Nest display can show a reply dashboard.
- **Cast card resource registration:** The integration registers its Lovelace card resource so Google/Nest Cast receivers can load the reply dashboard instead of showing a blank/dark screen.
- **Watch support:** Configure `watch_notify_service` with a Home Assistant `notify.mobile_app_*` service to send compact actionable notifications that can appear on a Samsung Galaxy Watch or Wear OS watch through the Companion App.
- **Diagnostics:** The panel includes a diagnostics section for checking version/cache state, available device counts, station availability, reply data, and watch notification setup.
- **Reply-to-sender mode:** When a browser, phone, or tablet sends an intercom message, the casted reply view can send typed replies back to that original open browser session.
- **Voice-command reply switches:** If a Google/Nest display does not pass touch events to the casted dashboard, expose the Intercom Reply switches to Google Assistant and reply by voice.
- **Last reply status:** The `sensor.last_intercom_reply` entity shows whether a Google voice reply was delivered to an active sender or had no active sender context.
- **Stations:** Configure named intercom stations such as Kitchen, Office, Front Desk, or Apartment 1A instead of making users pick raw media players.
- **Reply inbox:** The panel shows recent replies stored by Home Assistant, not just browser-local history.
- **Options page:** Configure TTS entity, cleanup delay, sidebar visibility, chime, volume, and quiet hours from the integration's Configure button.

## Stations

Stations make Family Intercom feel like a house/building intercom instead of a raw media-player sender. Configure stations in **Settings > Devices & services > Family Intercom > Configure** using JSON:

```json
[
  {
    "name": "Kitchen",
    "targets": ["media_player.kitchen_display"],
    "notify": "notify.mobile_app_marxcel",
    "description": "Main kitchen display",
    "icon": "Kitchen",
    "color": "#22c55e"
  },
  {
    "name": "Office",
    "targets": ["media_player.jorges_office_google_hub"]
  },
  {
    "name": "Apartment 1A",
    "targets": ["media_player.apartment_1a_speaker"]
  }
]
```

The panel shows stations as first-class targets. If a station's target media player is unavailable, the station shows as offline (grayed out and disabled).

Optional station fields:

- `description`: small text shown under the station name.
- `icon`: short emoji or label shown on the station card.
- `color`: CSS color used as the station card accent.
- `mode` or `type`: optional label for future station organization. `watch` stations use a watch icon by default.

**The `notify` field is now used.** When you send a message to a station that has `notify` set, Family Intercom also pushes an actionable notification to that service at the same time as the audio announcement. That notification includes tappable quick-reply buttons built from your configured [reply phrases](#reply-phrases) (up to 3) - tapping one replies immediately, the same as if the recipient had used a voice command or the on-screen reply view. This is useful when the recipient has a phone: they can reply without walking up to the display at all. Stations with a notify service configured show a 🔔 badge on their chip in the panel.

## Reply phrases

Configure fixed reply phrases in options using `|` separators:

```text
Yes.|No.|Okay.|I am coming.|Give me five minutes.|Call me please.
```

The first 3 of these are also used as the quick-reply buttons on actionable push notifications (see [Stations](#stations) above).

These phrases appear in the panel quick replies and can also generate additional voice-friendly reply switch entities when Home Assistant reloads the integration.

## Samsung Galaxy Watch / Wear OS

The watch-friendly path is Home Assistant Companion App notifications, not the full browser panel. Configure **Watch notification service** in **Settings > Devices & services > Family Intercom > Configure** with a notify service such as:

```text
notify.mobile_app_marxcel
```

Then use **Watch** mode in the Family Intercom panel, or call:

```yaml
service: family_intercom.watch_prompt
data:
  message: "Can you come here?"
```

If your phone mirrors Home Assistant notifications to your Samsung Galaxy Watch, the watch can show the intercom prompt and the first three configured reply phrases as actionable buttons. Recording arbitrary watch voice audio directly into Home Assistant is not currently reliable through standard Home Assistant watch panels.

## Experimental reply view on Google/Nest displays

Google/Nest display microphones, keyboards, and touch events are not reliably exposed to Home Assistant Cast dashboards. Some displays allow touch, but others behave as display-only. Family Intercom therefore also creates voice-friendly reply switches.

Family Intercom can automatically cast a Lovelace view after a message is sent to a display-like target. This lets the display show big reply buttons or a Family Intercom card.

When the reply view is opened by Family Intercom, it uses the most recent sender session as the return path. Keep the original phone/tablet/browser Family Intercom page open if you want it to receive the reply. Replies are sent back through Home Assistant events and spoken by the original browser when the browser allows speech playback.

Family Intercom also creates `sensor.last_intercom_reply`. Check this sensor after saying a Google voice reply command:

- `status: delivered` means there was an active sender session.
- `status: no_active_sender` means Google triggered the switch, but no phone/tablet/browser sender page was available to receive it.

For more reliable phone delivery, set **Reply notification service** in the integration options, for example:

```text
notify.mobile_app_jorge_phone
```

When configured, every Google voice reply also sends a Home Assistant notification.

If the Google display does not react to touch, expose these entities to Google Assistant/Home Assistant Cloud and use voice:

- `switch.intercom_reply`
- `switch.intercom_reply_yes`
- `switch.intercom_reply_no`
- `switch.intercom_reply_okay`
- `switch.intercom_reply_coming`
- `switch.intercom_reply_need_help`
- `switch.intercom_reply_call_me`
- `switch.intercom_yes`
- `switch.intercom_no`
- `switch.intercom_okay`
- `switch.intercom_coming`
- `switch.intercom_help`
- `switch.intercom_call_me`

Example phrase:

```text
Hey Google, turn on Intercom Yes
```

Google Assistant does not pass arbitrary dictated text into a Home Assistant switch. Phrases like "turn on intercom reply and tell him I am outside" will not send the custom words. Use one of the fixed reply switches, or create your own Home Assistant automation/script for additional fixed phrases.

Recommended setup:

1. Create a dashboard view with path:

```text
family-intercom-reply
```

2. Add a manual card:

```yaml
type: custom:family-intercom-card
default_target: media_player.YOUR_REPLY_TARGET
```

Use `default_target` for the speaker/display where replies should be sent. For example, if replies from the office display should announce back in the kitchen, set the kitchen speaker or display as the default target.

3. Open **Settings > Devices & services > Family Intercom > Configure**.
4. Enable **Auto-cast reply view after messages**.
5. Set the dashboard path to the first part of your dashboard URL. For example:

```text
123-nice-st
```

If your reply view URL is `/123-nice-st/family-intercom-reply`, then:

- Dashboard path: `123-nice-st`
- View path: `family-intercom-reply`

6. Set the reply view path to `family-intercom-reply`.
7. Use a reply delay of at least 20 seconds while testing, so the voice recording or TTS has time to play before the display changes to the reply screen.

Family Intercom normally registers its card resource automatically. If the display plays the message and then shows only a dark Cast screen, verify this resource exists in **Settings > Dashboards > Resources**:

```text
/family_intercom_static/family-intercom-panel-v17.js?v=0.8.4
```

Resource type must be **JavaScript module**. If your Home Assistant dashboards are managed in YAML mode, add the resource manually because integrations cannot update YAML dashboard resources automatically.

For version 0.8.4 or newer, the module path is:

```text
/family_intercom_static/family-intercom-panel-v17.js?v=0.8.4
```

Manual service:

- `family_intercom.show_reply_view`

Fields:

- `target_entity`: Google/Nest display or cast target.
- `dashboard_path`: dashboard URL path, for example `lovelace` or `123-nice-st`.
- `view_path`: usually `family-intercom-reply`.

## Device detection

Family Intercom does not use a fixed device list. It reads Home Assistant state live and shows controllable `media_player` entities.

- Devices with states like `off`, `idle`, `standby`, `paused`, and `playing` stay visible because Home Assistant can usually still send media to them.
- If a Google display, speaker group, TV, or other media player becomes `unavailable` or `unknown`, it is hidden until Home Assistant can see it again.
- If a new media player is added later, it appears automatically after Home Assistant exposes it as a `media_player`.
- The panel prioritizes displays/hubs, speakers, TVs, and groups near the top of the target list.

## Design and optional Mushroom usage

The integration ships with its own colorful modern UI and does not require Mushroom or any other HACS frontend card.

If you already use Mushroom, the optional Lovelace card can sit nicely inside a Mushroom-style dashboard next to Mushroom cards. Mushroom is optional; do not add it as a required dependency unless your dashboard already uses it.

## Optional dashboard card

If you want Family Intercom inside an existing dashboard view:

1. Go to **Settings > Dashboards > Resources**.
2. Add this JavaScript module if it was not added automatically:

```text
/family_intercom_static/family-intercom-panel-v17.js?v=0.8.4
```

3. Add a manual card to any dashboard:

```yaml
type: custom:family-intercom-card
```

Example with a Mushroom title card, if Mushroom is already installed:

```yaml
type: vertical-stack
cards:
  - type: custom:mushroom-title-card
    title: Family Intercom
    subtitle: Send voice or typed messages around the house
  - type: custom:family-intercom-card
```

## Services

- `family_intercom.speak_text`
- `family_intercom.play_recording`
- `family_intercom.reply_text`
- `family_intercom.reply_recording`
- `family_intercom.delete_temp_files`

## Notes

Voice recordings are stored only as temporary files under Home Assistant's temporary directory and are deleted automatically after the configured cleanup delay.







