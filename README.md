# Family Intercom for Home Assistant

Family Intercom adds a simple household intercom panel to Home Assistant.

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
- Use mobile push-to-talk by holding the microphone button and releasing to send.
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

Google/Nest displays are reliable as output devices. Phones, tablets, wall tablets, or normal browsers are the reliable recording/input devices because Google/Nest display microphones are controlled by Google Assistant and are not generally available to Home Assistant web panels.

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
- **Push-to-talk:** Hold the microphone button on a phone/tablet, then release to send. You can also tap once and use the Stop button.
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
- **Options page:** Configure TTS entity, cleanup delay, sidebar visibility, chime, volume, and quiet hours from the integration's Configure button.

## Experimental reply view on Google/Nest displays

Google/Nest display microphones are not reliably exposed to Home Assistant dashboards, so voice reply from the display microphone may not work. Touch replies are the reliable path.

Family Intercom can automatically cast a Lovelace view after a message is sent to a display-like target. This lets the display show big reply buttons or a Family Intercom card.

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
56-hunt-rd
```

If your reply view URL is `/56-hunt-rd/family-intercom-reply`, then:

- Dashboard path: `56-hunt-rd`
- View path: `family-intercom-reply`

6. Set the reply view path to `family-intercom-reply`.
7. Use a reply delay of at least 20 seconds while testing, so the voice recording or TTS has time to play before the display changes to the reply screen.

Family Intercom normally registers its card resource automatically. If the display plays the message and then shows only a dark Cast screen, verify this resource exists in **Settings > Dashboards > Resources**:

```text
/family_intercom_static/family-intercom-panel-v7.js?v=0.5.2
```

Resource type must be **JavaScript module**. If your Home Assistant dashboards are managed in YAML mode, add the resource manually because integrations cannot update YAML dashboard resources automatically.

Manual service:

- `family_intercom.show_reply_view`

Fields:

- `target_entity`: Google/Nest display or cast target.
- `dashboard_path`: dashboard URL path, for example `lovelace` or `56-hunt-rd`.
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
/family_intercom_static/family-intercom-panel-v7.js?v=0.5.2
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
- `family_intercom.delete_temp_files`

## Notes

Voice recordings are stored only as temporary files under Home Assistant's temporary directory and are deleted automatically after the configured cleanup delay.
