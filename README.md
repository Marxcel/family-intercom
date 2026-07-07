# Family Intercom for Home Assistant

Family Intercom adds a simple household intercom panel to Home Assistant.

It can:

- Speak typed messages on a selected `media_player`.
- Record a short voice message from a phone, tablet, or browser and play that recording on a selected speaker/display.
- Delete temporary voice clips automatically after playback.
- Register a Home Assistant sidebar panel without creating loose helpers or scripts.
- Detect currently available Home Assistant media players every time the panel updates.
- Hide unavailable devices automatically, so stale speakers/displays do not clutter the intercom.

Google/Nest displays are reliable as output devices. Phones, tablets, wall tablets, or normal browsers are the reliable recording/input devices because Google/Nest display microphones are controlled by Google Assistant and are not generally available to Home Assistant web panels.

## HACS installation

1. Add this repository as a custom repository in HACS.
2. Category: Integration.
3. Install **Family Intercom**.
4. Restart Home Assistant.
5. Go to **Settings > Devices & services > Add integration > Family Intercom**.

After setup, open **Family Intercom** from the Home Assistant sidebar.

## Recommended use

The default install shows **Family Intercom** in the Home Assistant sidebar. This is recommended because intercom use needs more room than a small card: target picker, typed message, recording controls, quick messages, and a live list of available devices.

During setup, you can disable the sidebar entry if you only want to use the integration services or an optional dashboard card.

## Device detection

Family Intercom does not use a fixed device list. It reads Home Assistant state live and shows available `media_player` entities only.

- If a Google display, speaker group, TV, or other media player becomes unavailable, it is hidden automatically.
- If a new media player is added later, it appears automatically after Home Assistant exposes it as a `media_player`.
- The panel prioritizes displays/hubs, speakers, TVs, and groups near the top of the target list.

## Design and optional Mushroom usage

The integration ships with its own colorful modern UI and does not require Mushroom or any other HACS frontend card.

If you already use Mushroom, the optional Lovelace card can sit nicely inside a Mushroom-style dashboard next to Mushroom cards. Mushroom is optional; do not add it as a required dependency unless your dashboard already uses it.

## Optional dashboard card

If you want Family Intercom inside an existing dashboard view:

1. Go to **Settings > Dashboards > Resources**.
2. Add this JavaScript module:

```text
/family_intercom_static/family-intercom-panel.js
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
