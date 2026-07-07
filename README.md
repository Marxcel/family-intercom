# Family Intercom for Home Assistant

Family Intercom adds a simple household intercom panel to Home Assistant.

It can:

- Speak typed messages on a selected `media_player`.
- Record a short voice message from a phone, tablet, or browser and play that recording on a selected speaker/display.
- Delete temporary voice clips automatically after playback.
- Register a Home Assistant sidebar panel without creating loose helpers or scripts.

Google/Nest displays are reliable as output devices. Phones, tablets, wall tablets, or normal browsers are the reliable recording/input devices because Google/Nest display microphones are controlled by Google Assistant and are not generally available to Home Assistant web panels.

## HACS installation

1. Add this repository as a custom repository in HACS.
2. Category: Integration.
3. Install **Family Intercom**.
4. Restart Home Assistant.
5. Go to **Settings > Devices & services > Add integration > Family Intercom**.

After setup, open **Family Intercom** from the Home Assistant sidebar.

## Services

- `family_intercom.speak_text`
- `family_intercom.play_recording`
- `family_intercom.delete_temp_files`

## Notes

Voice recordings are stored only as temporary files under Home Assistant's temporary directory and are deleted automatically after the configured cleanup delay.
