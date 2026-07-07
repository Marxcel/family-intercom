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
        :host{display:block;min-height:100%;box-sizing:border-box;padding:clamp(14px,3vw,28px);--fi-blue:#4f8cff;--fi-cyan:#23d5d5;--fi-purple:#9b5cff;--fi-pink:#ff4f9a;--fi-orange:#ffb347;--fi-green:#4ade80}
        .wrap{max-width:1080px;margin:0 auto;display:grid;gap:18px}
        .hero{position:relative;overflow:hidden;border-radius:28px;padding:26px;color:white;background:linear-gradient(135deg,var(--fi-blue),var(--fi-purple) 52%,var(--fi-pink));box-shadow:0 18px 50px rgba(79,140,255,.28)}
        .hero:before{content:"";position:absolute;inset:-60px -80px auto auto;width:260px;height:260px;border-radius:999px;background:rgba(255,255,255,.18)}
        .hero:after{content:"";position:absolute;inset:auto auto -80px -50px;width:220px;height:220px;border-radius:999px;background:rgba(35,213,213,.18)}
        .hero-content{position:relative;z-index:1;display:grid;grid-template-columns:1fr auto;gap:18px;align-items:center}
        .eyebrow{margin:0 0 6px;text-transform:uppercase;letter-spacing:.16em;font-size:.76rem;font-weight:900;opacity:.78}
        .device-pill{display:flex;gap:10px;align-items:center;padding:12px 14px;border-radius:999px;background:rgba(12,18,32,.34);backdrop-filter:blur(16px);font-weight:800;white-space:nowrap}
        .pulse-dot{width:10px;height:10px;border-radius:99px;background:var(--fi-green);box-shadow:0 0 0 7px rgba(74,222,128,.18)}
        .layout{display:grid;grid-template-columns:minmax(0,1.08fr) minmax(280px,.72fr);gap:18px}
        .card{position:relative;overflow:hidden;background:var(--ha-card-background,var(--card-background-color,#fff));border:1px solid color-mix(in srgb,var(--divider-color,#ddd),transparent 40%);border-radius:24px;box-shadow:var(--ha-card-box-shadow,0 10px 30px rgba(0,0,0,.10));padding:18px;display:grid;gap:14px}
        .card.soft{background:linear-gradient(180deg,color-mix(in srgb,var(--ha-card-background,var(--card-background-color,#fff)),var(--fi-blue) 7%),var(--ha-card-background,var(--card-background-color,#fff)))}
        h1,h2,h3,p{margin:0} h1{font-size:clamp(2rem,5vw,4rem);line-height:.98;letter-spacing:-.05em} h2{font-size:1.12rem}
        .hero p{max-width:640px;margin-top:12px;font-size:1.05rem;opacity:.9}
        label{display:grid;gap:6px;font-weight:600}
        select,textarea{width:100%;box-sizing:border-box;border:1px solid color-mix(in srgb,var(--divider-color,#ddd),transparent 25%);border-radius:16px;background:var(--card-background-color,#fff);color:var(--primary-text-color,#111);padding:14px;font:inherit;outline:none}
        select:focus,textarea:focus{border-color:var(--fi-blue);box-shadow:0 0 0 4px rgba(79,140,255,.16)}
        textarea{min-height:116px;resize:vertical}
        button{border:0;border-radius:18px;background:linear-gradient(135deg,var(--fi-blue),var(--fi-purple));color:white;font:inherit;font-weight:900;padding:15px;cursor:pointer;box-shadow:0 10px 24px rgba(79,140,255,.2);transition:transform .16s ease,filter .16s ease,opacity .16s ease}
        button:hover{transform:translateY(-1px);filter:saturate(1.08)} button:active{transform:translateY(0) scale(.99)}
        button.secondary{background:var(--secondary-background-color,#eef2f7);color:var(--primary-text-color,#111)}
        button.danger{background:linear-gradient(135deg,#ef4444,#f97316);color:white}
        button.green{background:linear-gradient(135deg,#10b981,#22c55e)}
        button.orange{background:linear-gradient(135deg,#f59e0b,#f97316)}
        button.pink{background:linear-gradient(135deg,#ec4899,#8b5cf6)}
        button:disabled{opacity:.55;cursor:not-allowed}
        .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px}
        .status{color:var(--secondary-text-color,#666);min-height:1.4em}
        .target-row{display:flex;gap:10px;align-items:center}.target-row select{flex:1}
        .mini{font-size:.84rem;color:var(--secondary-text-color,#666);font-weight:700}
        .chips{display:flex;gap:9px;overflow:auto;padding:3px 0 6px;scrollbar-width:thin}
        .chip{display:flex;align-items:center;gap:8px;min-width:max-content;padding:10px 12px;border-radius:999px;background:color-mix(in srgb,var(--ha-card-background,var(--card-background-color,#fff)),var(--fi-blue) 10%);border:1px solid color-mix(in srgb,var(--divider-color,#ddd),transparent 35%);box-shadow:none;color:var(--primary-text-color,#111)}
        .chip.active{background:linear-gradient(135deg,var(--fi-blue),var(--fi-cyan));color:white}
        .device-list{display:grid;gap:8px;max-height:390px;overflow:auto;padding-right:4px}
        .device{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;padding:12px;border-radius:17px;background:color-mix(in srgb,var(--ha-card-background,var(--card-background-color,#fff)),var(--fi-purple) 5%);border:1px solid color-mix(in srgb,var(--divider-color,#ddd),transparent 45%)}
        .device-icon{width:38px;height:38px;display:grid;place-items:center;border-radius:14px;background:linear-gradient(135deg,var(--fi-blue),var(--fi-purple));color:white;font-size:1.2rem}
        .device-name{font-weight:900}.device-state{text-transform:capitalize;font-size:.78rem;color:var(--secondary-text-color,#666)}
        .badge{font-size:.72rem;font-weight:900;padding:5px 8px;border-radius:999px;background:rgba(74,222,128,.14);color:color-mix(in srgb,var(--fi-green),var(--primary-text-color,#111) 25%)}
        .record-pad{display:grid;gap:12px;place-items:center;text-align:center;padding:18px;border-radius:24px;background:radial-gradient(circle at 50% 0,rgba(255,79,154,.22),transparent 45%),color-mix(in srgb,var(--ha-card-background,var(--card-background-color,#fff)),var(--fi-pink) 5%)}
        .record-circle{width:132px;height:132px;border-radius:999px;font-size:2.8rem;display:grid;place-items:center;background:linear-gradient(135deg,var(--fi-pink),var(--fi-orange));box-shadow:0 18px 38px rgba(255,79,154,.28)}
        .recording{animation:pulse 1s infinite;background:linear-gradient(135deg,#ef4444,#ff4f9a)!important}
        @keyframes pulse{50%{transform:scale(1.035);box-shadow:0 0 0 14px rgba(239,68,68,.14),0 18px 38px rgba(255,79,154,.28)}}
        @media (max-width:820px){.layout{grid-template-columns:1fr}.hero-content{grid-template-columns:1fr}.device-pill{width:max-content}.card{border-radius:20px}:host{padding:12px}}
      </style>
      <div class="wrap">
        <section class="hero">
          <div class="hero-content">
            <div>
              <p class="eyebrow">Home Assistant intercom</p>
              <h1>Family Intercom</h1>
              <p>Speak typed messages or record your voice from a phone, tablet, or browser and play it on any currently available speaker, display, TV, or media player.</p>
            </div>
            <div class="device-pill"><span class="pulse-dot"></span><span id="deviceCount">Detecting devices</span></div>
          </div>
        </section>
        <div class="layout">
          <main class="card soft">
            <h2>Send to</h2>
            <div class="target-row">
              <select id="target"></select>
              <button id="refresh" class="secondary" title="Refresh available devices">↻</button>
            </div>
            <div class="chips" id="targetChips"></div>
            <div class="status" id="status">Select a speaker or display, then type or record a message.</div>
            <label>Type a message
              <textarea id="message" placeholder="Example: Dinner is ready."></textarea>
            </label>
            <button id="sendText" class="green">🔊 Speak typed message</button>
            <div class="record-pad">
              <button id="record" class="record-circle" title="Record voice">🎙️</button>
              <h2 id="recordTitle">Record your voice</h2>
              <p class="mini">Voice clips are temporary. Home Assistant deletes them after playback.</p>
              <button id="stop" class="danger" disabled>Stop and send recording</button>
            </div>
          </main>
          <aside class="card">
            <h2>Quick messages</h2>
            <div class="grid" id="quick"></div>
            <h2>Available now</h2>
            <div class="mini">This list updates whenever Home Assistant device states change. Unavailable devices are hidden automatically.</div>
            <div class="device-list" id="deviceList"></div>
          </aside>
        </div>
      </div>
    `;
    this.querySelector("#sendText").addEventListener("click", () => this._sendText());
    this.querySelector("#record").addEventListener("click", () => this._startRecording());
    this.querySelector("#stop").addEventListener("click", () => this._stopRecording());
    this.querySelector("#refresh").addEventListener("click", () => this._updateTargets(true));
    this.querySelector("#target").addEventListener("change", () => this._saveTarget());
    const quick = [
      ["🍽️", "Dinner is ready.", "orange"],
      ["⬇️", "Come downstairs please.", "pink"],
      ["🍳", "Come to the kitchen please.", "orange"],
      ["👋", "Please come here.", ""],
      ["⏰", "Time to get ready.", "green"],
      ["🆘", "I need help please.", "danger"],
    ];
    const quickBox = this.querySelector("#quick");
    for (const [emoji, message, style] of quick) {
      const button = document.createElement("button");
      button.className = style || "secondary";
      button.textContent = `${emoji} ${message.replace(/\.$/, "")}`;
      button.addEventListener("click", () => this._speak(message));
      quickBox.append(button);
    }
  }

  _players() {
    if (!this._hass) return [];
    return Object.entries(this._hass.states)
      .filter(([entityId, state]) => entityId.startsWith("media_player.") && state.state !== "unavailable")
      .map(([entityId, state]) => ({
        entityId,
        name: state.attributes.friendly_name || entityId.replace("media_player.", "").replaceAll("_", " "),
        state: state.state,
        icon: this._iconFor(entityId, state.attributes.friendly_name || ""),
      }))
      .sort((a, b) => this._rank(a) - this._rank(b) || a.name.localeCompare(b.name));
  }

  _rank(player) {
    const value = `${player.entityId} ${player.name}`.toLowerCase();
    if (value.includes("display") || value.includes("hub")) return 0;
    if (value.includes("speaker") || value.includes("announcement")) return 1;
    if (value.includes("tv")) return 2;
    if (value.includes("group") || value.includes("everywhere")) return 3;
    return 4;
  }

  _iconFor(entityId, name) {
    const value = `${entityId} ${name}`.toLowerCase();
    if (value.includes("display") || value.includes("hub")) return "🖥️";
    if (value.includes("speaker") || value.includes("announcement")) return "🔈";
    if (value.includes("tv")) return "📺";
    if (value.includes("group") || value.includes("everywhere")) return "📣";
    return "🎧";
  }

  _updateTargets(force = false) {
    const select = this.querySelector("#target");
    if (!select || !this._hass) return;
    const players = this._players();
    const saved = localStorage.getItem("familyIntercomTarget") || "";
    const current = select.value || saved;
    const signature = players.map(player => `${player.entityId}:${player.state}`).join("|");
    if (!force && signature === this._lastTargetSignature) return;
    this._lastTargetSignature = signature;

    select.replaceChildren();
    for (const player of players) {
      const option = document.createElement("option");
      option.value = player.entityId;
      option.textContent = `${player.icon} ${player.name}`;
      select.append(option);
    }
    if (current && players.some(player => player.entityId === current)) select.value = current;
    else if (players[0]) select.value = players[0].entityId;
    this._saveTarget();

    const count = this.querySelector("#deviceCount");
    if (count) count.textContent = `${players.length} available device${players.length === 1 ? "" : "s"}`;
    this._renderTargetChips(players);
    this._renderDeviceList(players);
    if (!players.length) this._status("No available media players found right now.");
  }

  _renderTargetChips(players) {
    const container = this.querySelector("#targetChips");
    if (!container) return;
    container.replaceChildren();
    for (const player of players.slice(0, 8)) {
      const button = document.createElement("button");
      button.className = `chip${player.entityId === this._target() ? " active" : ""}`;
      button.textContent = `${player.icon} ${player.name}`;
      button.addEventListener("click", () => {
        this.querySelector("#target").value = player.entityId;
        this._saveTarget();
        this._renderTargetChips(players);
      });
      container.append(button);
    }
  }

  _renderDeviceList(players) {
    const container = this.querySelector("#deviceList");
    if (!container) return;
    container.replaceChildren();
    for (const player of players) {
      const row = document.createElement("div");
      row.className = "device";
      row.innerHTML = `
        <div class="device-icon">${player.icon}</div>
        <div><div class="device-name">${this._escape(player.name)}</div><div class="device-state">${this._escape(player.entityId)} · ${this._escape(player.state)}</div></div>
        <div class="badge">available</div>
      `;
      row.addEventListener("click", () => {
        this.querySelector("#target").value = player.entityId;
        this._saveTarget();
        this._renderTargetChips(players);
      });
      container.append(row);
    }
  }

  _escape(value) {
    return String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
  }

  _target() {
    return this.querySelector("#target")?.value || "";
  }

  _saveTarget() {
    const target = this._target();
    if (target) localStorage.setItem("familyIntercomTarget", target);
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
    try {
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
      this.querySelector("#record").textContent = "⏺️";
      this.querySelector("#recordTitle").textContent = "Recording...";
      this.querySelector("#stop").disabled = false;
      this._status("Recording. Tap Stop and send when finished.");
    } catch (error) {
      this._status(`Microphone unavailable: ${error.message || error}`);
    }
  }

  _stopRecording() {
    if (this._recorder?.state === "recording") this._recorder.stop();
    this.querySelector("#record").classList.remove("recording");
    this.querySelector("#record").textContent = "🎙️";
    this.querySelector("#recordTitle").textContent = "Record your voice";
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
    return 8;
  }
}

customElements.define("family-intercom-card", FamilyIntercomCard);
