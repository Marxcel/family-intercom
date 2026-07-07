class FamilyIntercomPanel extends HTMLElement {
  set hass(hass) {
    this._hass = hass;
    if (!this._rendered) this._render();
    this._updateTargets();
  }

  connectedCallback() {
    this._render();
  }

  _render() {
    if (this._rendered) return;
    this._rendered = true;
    this.innerHTML = `
      <style>
        :host{display:block;padding:24px;box-sizing:border-box}
        .wrap{max-width:840px;margin:0 auto;display:grid;gap:18px}
        .card{background:var(--ha-card-background,var(--card-background-color,#fff));border-radius:16px;box-shadow:var(--ha-card-box-shadow,0 2px 8px rgba(0,0,0,.12));padding:18px;display:grid;gap:14px}
        h1{margin:0;font-size:2rem} h2{margin:0;font-size:1.2rem}
        label{display:grid;gap:6px;font-weight:600}
        select,textarea{width:100%;box-sizing:border-box;border:1px solid var(--divider-color,#ddd);border-radius:12px;background:var(--card-background-color,#fff);color:var(--primary-text-color,#111);padding:12px;font:inherit}
        textarea{min-height:92px;resize:vertical}
        button{border:0;border-radius:14px;background:var(--primary-color,#03a9f4);color:var(--text-primary-color,#fff);font:inherit;font-weight:700;padding:14px;cursor:pointer}
        button.secondary{background:var(--secondary-background-color,#eef2f7);color:var(--primary-text-color,#111)}
        button.danger{background:#d64545;color:white}
        button:disabled{opacity:.55;cursor:not-allowed}
        .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px}
        .status{color:var(--secondary-text-color,#666);min-height:1.4em}
        .recording{animation:pulse 1s infinite;background:#d64545!important}
        @keyframes pulse{50%{opacity:.7}}
      </style>
      <div class="wrap">
        <div class="card">
          <h1>Family Intercom</h1>
          <div class="status" id="status">Select a speaker or display, then type or record a message.</div>
          <label>Play on
            <select id="target"></select>
          </label>
        </div>
        <div class="card">
          <h2>Type a message</h2>
          <textarea id="message" placeholder="Example: Dinner is ready."></textarea>
          <button id="sendText">Speak typed message</button>
        </div>
        <div class="card">
          <h2>Record your voice</h2>
          <div class="grid">
            <button id="record">Hold / tap to record</button>
            <button id="stop" class="danger" disabled>Stop and send</button>
          </div>
          <div class="status">Works from phones, tablets, and normal browsers with microphone permission.</div>
        </div>
        <div class="card">
          <h2>Quick messages</h2>
          <div class="grid" id="quick"></div>
        </div>
      </div>
    `;
    this.querySelector("#sendText").addEventListener("click", () => this._sendText());
    this.querySelector("#record").addEventListener("click", () => this._startRecording());
    this.querySelector("#stop").addEventListener("click", () => this._stopRecording());
    const quick = [
      "Dinner is ready.",
      "Come downstairs please.",
      "Come to the kitchen please.",
      "Please come here.",
      "Time to get ready.",
      "I need help please.",
    ];
    const quickBox = this.querySelector("#quick");
    for (const message of quick) {
      const button = document.createElement("button");
      button.className = "secondary";
      button.textContent = message.replace(/\.$/, "");
      button.addEventListener("click", () => this._speak(message));
      quickBox.append(button);
    }
  }

  _updateTargets() {
    const select = this.querySelector("#target");
    if (!select || !this._hass) return;
    const current = select.value;
    const players = Object.entries(this._hass.states)
      .filter(([entityId, state]) => entityId.startsWith("media_player.") && state.state !== "unavailable")
      .sort((a, b) => (a[1].attributes.friendly_name || a[0]).localeCompare(b[1].attributes.friendly_name || b[0]));
    select.replaceChildren();
    for (const [entityId, state] of players) {
      const option = document.createElement("option");
      option.value = entityId;
      option.textContent = state.attributes.friendly_name || entityId;
      select.append(option);
    }
    if (current && [...select.options].some(option => option.value === current)) select.value = current;
  }

  _target() {
    return this.querySelector("#target")?.value || "";
  }

  _status(text) {
    const status = this.querySelector("#status");
    if (status) status.textContent = text;
  }

  async _speak(message) {
    const target = this._target();
    if (!target) return this._status("Select a target first.");
    await this._hass.callService("family_intercom", "speak_text", { target_entity: target, message });
    this._status(`Sent to ${this._hass.states[target]?.attributes?.friendly_name || target}.`);
  }

  async _sendText() {
    const textarea = this.querySelector("#message");
    const message = textarea.value.trim();
    if (!message) return this._status("Type a message first.");
    await this._speak(message);
    textarea.value = "";
  }

  async _startRecording() {
    if (this._recorder?.state === "recording") return;
    if (!navigator.mediaDevices?.getUserMedia) return this._status("This browser does not support microphone recording.");
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const preferred = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
    const mimeType = preferred.find(type => window.MediaRecorder?.isTypeSupported?.(type)) || "";
    this._chunks = [];
    this._recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    this._recorder.addEventListener("dataavailable", event => {
      if (event.data?.size) this._chunks.push(event.data);
    });
    this._recorder.addEventListener("stop", () => {
      for (const track of stream.getTracks()) track.stop();
      this._sendRecording();
    });
    this._recorder.start();
    this.querySelector("#record").classList.add("recording");
    this.querySelector("#record").textContent = "Recording...";
    this.querySelector("#stop").disabled = false;
    this._status("Recording. Tap Stop and send when finished.");
  }

  _stopRecording() {
    if (this._recorder?.state === "recording") this._recorder.stop();
    this.querySelector("#record").classList.remove("recording");
    this.querySelector("#record").textContent = "Hold / tap to record";
    this.querySelector("#stop").disabled = true;
  }

  async _sendRecording() {
    const target = this._target();
    if (!target) return this._status("Select a target first.");
    const blob = new Blob(this._chunks || [], { type: this._recorder?.mimeType || "audio/webm" });
    if (!blob.size) return this._status("No audio was recorded.");
    const data = await this._blobToBase64(blob);
    await this._hass.callService("family_intercom", "play_recording", {
      target_entity: target,
      data,
      content_type: blob.type || "audio/webm",
      filename: blob.type?.includes("mp4") ? "intercom.m4a" : "intercom.webm",
    });
    this._status(`Voice message sent to ${this._hass.states[target]?.attributes?.friendly_name || target}.`);
  }

  _blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",", 2)[1] || "");
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}

customElements.define("family-intercom-panel", FamilyIntercomPanel);

class FamilyIntercomCard extends FamilyIntercomPanel {
  setConfig(config) {
    this._config = config || {};
  }

  getCardSize() {
    return 6;
  }
}

customElements.define("family-intercom-card", FamilyIntercomCard);
