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
    this._selectedTargets = [];
    this._displayMode = localStorage.getItem("familyIntercomDisplayMode") === "1";
    this.innerHTML = `
      <style>
        :host{display:block;min-height:100%;box-sizing:border-box;padding:clamp(14px,3vw,28px);--fi-blue:#4f8cff;--fi-cyan:#23d5d5;--fi-purple:#9b5cff;--fi-pink:#ff4f9a;--fi-orange:#ffb347;--fi-red:#ef4444;--fi-green:#4ade80}
        .wrap{max-width:1160px;margin:0 auto;display:grid;gap:18px}
        .hero{position:relative;overflow:hidden;border-radius:28px;padding:26px;color:white;background:linear-gradient(135deg,var(--fi-blue),var(--fi-purple) 52%,var(--fi-pink));box-shadow:0 18px 50px rgba(79,140,255,.28)}
        .hero:before{content:"";position:absolute;inset:-60px -80px auto auto;width:260px;height:260px;border-radius:999px;background:rgba(255,255,255,.18)}
        .hero:after{content:"";position:absolute;inset:auto auto -80px -50px;width:220px;height:220px;border-radius:999px;background:rgba(35,213,213,.18)}
        .hero-content{position:relative;z-index:1;display:grid;grid-template-columns:1fr auto;gap:18px;align-items:center}
        .eyebrow{margin:0 0 6px;text-transform:uppercase;letter-spacing:.16em;font-size:.76rem;font-weight:900;opacity:.78}
        .device-pill{display:flex;gap:10px;align-items:center;padding:12px 14px;border-radius:999px;background:rgba(12,18,32,.34);backdrop-filter:blur(16px);font-weight:800;white-space:nowrap}
        .pulse-dot{width:10px;height:10px;border-radius:99px;background:var(--fi-green);box-shadow:0 0 0 7px rgba(74,222,128,.18)}
        .layout{display:grid;grid-template-columns:minmax(0,1.08fr) minmax(300px,.72fr);gap:18px}
        .card{position:relative;overflow:hidden;background:var(--ha-card-background,var(--card-background-color,#fff));border:1px solid color-mix(in srgb,var(--divider-color,#ddd),transparent 40%);border-radius:24px;box-shadow:var(--ha-card-box-shadow,0 10px 30px rgba(0,0,0,.10));padding:18px;display:grid;gap:14px}
        .card.soft{background:linear-gradient(180deg,color-mix(in srgb,var(--ha-card-background,var(--card-background-color,#fff)),var(--fi-blue) 7%),var(--ha-card-background,var(--card-background-color,#fff)))}
        h1,h2,h3,p{margin:0} h1{font-size:clamp(2rem,5vw,4rem);line-height:.98;letter-spacing:-.05em} h2{font-size:1.12rem}
        .hero p{max-width:680px;margin-top:12px;font-size:1.05rem;opacity:.9}
        label{display:grid;gap:6px;font-weight:600}
        select,textarea{width:100%;box-sizing:border-box;border:1px solid color-mix(in srgb,var(--divider-color,#ddd),transparent 25%);border-radius:16px;background:var(--card-background-color,#fff);color:var(--primary-text-color,#111);padding:14px;font:inherit;outline:none}
        select:focus,textarea:focus{border-color:var(--fi-blue);box-shadow:0 0 0 4px rgba(79,140,255,.16)}
        textarea{min-height:116px;resize:vertical}
        button{border:0;border-radius:18px;background:linear-gradient(135deg,var(--fi-blue),var(--fi-purple));color:white;font:inherit;font-weight:900;padding:15px;cursor:pointer;box-shadow:0 10px 24px rgba(79,140,255,.2);transition:transform .16s ease,filter .16s ease,opacity .16s ease}
        button:hover{transform:translateY(-1px);filter:saturate(1.08)} button:active{transform:translateY(0) scale(.99)}
        button.secondary{background:var(--secondary-background-color,#eef2f7);color:var(--primary-text-color,#111)}
        button.danger,.emergency{background:linear-gradient(135deg,#ef4444,#f97316);color:white}
        button.green{background:linear-gradient(135deg,#10b981,#22c55e)}
        button.orange{background:linear-gradient(135deg,#f59e0b,#f97316)}
        button.pink{background:linear-gradient(135deg,#ec4899,#8b5cf6)}
        button:disabled{opacity:.55;cursor:not-allowed}
        .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px}
        .status{color:var(--secondary-text-color,#666);min-height:1.4em}
        .target-row{display:flex;gap:10px;align-items:center}.target-row select{flex:1}
        .mini{font-size:.84rem;color:var(--secondary-text-color,#666);font-weight:700}
        .chips{display:flex;gap:9px;overflow:auto;padding:3px 0 6px;scrollbar-width:thin;flex-wrap:wrap}
        .chip{display:flex;align-items:center;gap:8px;min-width:max-content;padding:10px 12px;border-radius:999px;background:color-mix(in srgb,var(--ha-card-background,var(--card-background-color,#fff)),var(--fi-blue) 10%);border:1px solid color-mix(in srgb,var(--divider-color,#ddd),transparent 35%);box-shadow:none;color:var(--primary-text-color,#111)}
        .chip.active{background:linear-gradient(135deg,var(--fi-blue),var(--fi-cyan));color:white}
        .toolbar{display:grid;grid-template-columns:1fr 1fr;gap:10px}
        .device-list,.history-list{display:grid;gap:8px;max-height:390px;overflow:auto;padding-right:4px}
        .device{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;padding:12px;border-radius:17px;background:color-mix(in srgb,var(--ha-card-background,var(--card-background-color,#fff)),var(--fi-purple) 5%);border:1px solid color-mix(in srgb,var(--divider-color,#ddd),transparent 45%)}
        .device-icon{width:38px;height:38px;display:grid;place-items:center;border-radius:14px;background:linear-gradient(135deg,var(--fi-blue),var(--fi-purple));color:white;font-size:.78rem;font-weight:900}
        .device-name{font-weight:900}.device-state{text-transform:capitalize;font-size:.78rem;color:var(--secondary-text-color,#666)}
        .badge{font-size:.72rem;font-weight:900;padding:5px 8px;border-radius:999px;background:rgba(74,222,128,.14);color:color-mix(in srgb,var(--fi-green),var(--primary-text-color,#111) 25%)}
        .history-item{padding:11px;border-radius:15px;background:color-mix(in srgb,var(--ha-card-background,var(--card-background-color,#fff)),var(--fi-cyan) 5%);border:1px solid color-mix(in srgb,var(--divider-color,#ddd),transparent 55%)}
        .history-message{font-weight:900}.history-meta{font-size:.78rem;color:var(--secondary-text-color,#666);margin-top:3px}
        .record-pad{display:grid;gap:12px;place-items:center;text-align:center;padding:18px;border-radius:24px;background:radial-gradient(circle at 50% 0,rgba(255,79,154,.22),transparent 45%),color-mix(in srgb,var(--ha-card-background,var(--card-background-color,#fff)),var(--fi-pink) 5%)}
        .record-circle{width:132px;height:132px;border-radius:999px;font-size:2.8rem;display:grid;place-items:center;background:linear-gradient(135deg,var(--fi-pink),var(--fi-orange));box-shadow:0 18px 38px rgba(255,79,154,.28);touch-action:none}
        .recording{animation:pulse 1s infinite;background:linear-gradient(135deg,#ef4444,#ff4f9a)!important}
        .display-mode .hero,.display-mode aside .device-list,.display-mode .history-list{display:none}
        .display-mode .layout{grid-template-columns:1fr}.display-mode .grid{grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}
        .display-mode button{font-size:1.18rem;padding:20px}.display-mode .record-circle{width:170px;height:170px;font-size:3.4rem}
        @keyframes pulse{50%{transform:scale(1.035);box-shadow:0 0 0 14px rgba(239,68,68,.14),0 18px 38px rgba(255,79,154,.28)}}
        @media (max-width:820px){.layout{grid-template-columns:1fr}.hero-content{grid-template-columns:1fr}.device-pill{width:max-content}.card{border-radius:20px}:host{padding:12px}.toolbar{grid-template-columns:1fr}}
      </style>
      <div class="wrap${this._displayMode ? " display-mode" : ""}">
        <section class="hero">
          <div class="hero-content">
            <div>
              <p class="eyebrow">Home Assistant intercom</p>
              <h1>Family Intercom</h1>
              <p>Speak typed messages or record your voice from a phone, tablet, browser, or Google display and play it on any speaker, display, TV, or media player Home Assistant knows about.</p>
            </div>
            <div class="device-pill"><span class="pulse-dot"></span><span id="deviceCount">Detecting devices</span></div>
          </div>
        </section>
        <div class="layout">
          <main class="card soft">
            <h2>Send to</h2>
            <div class="target-row">
              <select id="target"></select>
              <button id="refresh" class="secondary" title="Refresh devices">&#8635;</button>
            </div>
            <div class="mini">Room presets</div>
            <div class="chips" id="presetChips"></div>
            <div class="mini">Individual devices</div>
            <div class="chips" id="targetChips"></div>
            <div class="toolbar">
              <button id="displayMode" class="secondary">Display mode</button>
              <button id="emergency" class="emergency">Emergency broadcast</button>
            </div>
            <div class="status" id="status">Select a speaker or display, then type or hold the microphone.</div>
            <label>Type a message
              <textarea id="message" placeholder="Example: Dinner is ready."></textarea>
            </label>
            <button id="sendText" class="green">Speak typed message</button>
            <div class="record-pad">
              <button id="record" class="record-circle" title="Hold to record voice">Mic</button>
              <h2 id="recordTitle">Hold to talk</h2>
              <p class="mini">Hold the mic and release to send. Or tap once, then tap Stop. Clips are temporary and deleted after playback.</p>
              <button id="stop" class="danger" disabled>Stop and send recording</button>
            </div>
          </main>
          <aside class="card">
            <h2>Quick messages</h2>
            <div class="grid" id="quick"></div>
            <h2>Send history</h2>
            <div class="history-list" id="historyList"></div>
            <h2>Available now</h2>
            <div class="mini">This list updates whenever Home Assistant device states change. Idle, off, standby, paused, and playing devices stay visible; unavailable or unknown devices are hidden.</div>
            <div class="device-list" id="deviceList"></div>
          </aside>
        </div>
      </div>
    `;
    this.querySelector("#sendText").addEventListener("click", () => this._sendText());
    this.querySelector("#stop").addEventListener("click", () => this._stopRecording());
    this.querySelector("#refresh").addEventListener("click", () => this._updateTargets(true));
    this.querySelector("#target").addEventListener("change", () => this._saveTarget());
    this.querySelector("#emergency").addEventListener("click", () => this._sendEmergency());
    this.querySelector("#displayMode").addEventListener("click", () => this._toggleDisplayMode());
    const record = this.querySelector("#record");
    record.addEventListener("click", () => this._startRecording());
    record.addEventListener("pointerdown", event => this._startHoldRecording(event));
    record.addEventListener("pointerup", () => this._stopHoldRecording());
    record.addEventListener("pointercancel", () => this._stopHoldRecording());
    record.addEventListener("pointerleave", () => this._stopHoldRecording());
    this._renderQuickMessages();
    this._renderHistory();
  }

  _players() {
    if (!this._hass) return [];
    return Object.entries(this._hass.states)
      .filter(([entityId, state]) => entityId.startsWith("media_player.") && !["unavailable", "unknown"].includes(state.state))
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
    if (value.includes("display") || value.includes("hub")) return "Display";
    if (value.includes("speaker") || value.includes("announcement")) return "Speaker";
    if (value.includes("tv")) return "TV";
    if (value.includes("group") || value.includes("everywhere")) return "Group";
    return "Audio";
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
      option.textContent = `${player.icon} - ${player.name}`;
      select.append(option);
    }
    if (current && players.some(player => player.entityId === current)) select.value = current;
    else if (players[0]) select.value = players[0].entityId;
    this._saveTarget();

    const count = this.querySelector("#deviceCount");
    if (count) count.textContent = `${players.length} media player${players.length === 1 ? "" : "s"}`;
    this._renderPresetChips(players);
    this._renderTargetChips(players);
    this._renderDeviceList(players);
    this._renderQuickMessages();
    if (!players.length) this._status("No media players found right now.");
  }

  _presets(players) {
    const text = player => `${player.entityId} ${player.name}`.toLowerCase();
    const presets = [
      ["All available", players],
      ["Displays", players.filter(player => this._rank(player) === 0)],
      ["Speakers", players.filter(player => this._rank(player) === 1)],
      ["TVs", players.filter(player => this._rank(player) === 2)],
      ["Groups", players.filter(player => this._rank(player) === 3)],
      ["Kitchen", players.filter(player => text(player).includes("kitchen"))],
      ["Living room", players.filter(player => /living|family room|den/.test(text(player)))],
      ["Bedrooms", players.filter(player => /bedroom|master|kids|room/.test(text(player)))],
      ["Office", players.filter(player => text(player).includes("office"))],
      ["Garage", players.filter(player => text(player).includes("garage"))],
    ];
    return presets
      .map(([name, members]) => ({ name, targets: [...new Set(members.map(player => player.entityId))] }))
      .filter(preset => preset.targets.length);
  }

  _renderPresetChips(players) {
    const container = this.querySelector("#presetChips");
    if (!container) return;
    container.replaceChildren();
    for (const preset of this._presets(players)) {
      const button = document.createElement("button");
      button.className = `chip${this._sameTargets(this._selectedTargets, preset.targets) ? " active" : ""}`;
      button.textContent = `${preset.name} (${preset.targets.length})`;
      button.addEventListener("click", () => {
        this._selectedTargets = preset.targets;
        localStorage.setItem("familyIntercomPreset", preset.name);
        this._status(`Targeting ${preset.name}.`);
        this._renderPresetChips(players);
        this._renderTargetChips(players);
        this._renderQuickMessages();
      });
      container.append(button);
    }
  }

  _renderTargetChips(players) {
    const container = this.querySelector("#targetChips");
    if (!container) return;
    container.replaceChildren();
    for (const player of players.slice(0, 10)) {
      const button = document.createElement("button");
      button.className = `chip${this._sameTargets(this._selectedTargets, [player.entityId]) ? " active" : ""}`;
      button.textContent = `${player.icon} ${player.name}`;
      button.addEventListener("click", () => {
        this.querySelector("#target").value = player.entityId;
        this._selectedTargets = [player.entityId];
        this._saveTarget();
        this._renderPresetChips(players);
        this._renderTargetChips(players);
        this._renderQuickMessages();
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
        <div class="device-icon">${this._escape(player.icon.slice(0, 2))}</div>
        <div><div class="device-name">${this._escape(player.name)}</div><div class="device-state">${this._escape(player.entityId)} - ${this._escape(player.state)}</div></div>
        <div class="badge">${this._escape(player.state)}</div>
      `;
      row.addEventListener("click", () => {
        this.querySelector("#target").value = player.entityId;
        this._selectedTargets = [player.entityId];
        this._saveTarget();
        this._renderPresetChips(players);
        this._renderTargetChips(players);
        this._renderQuickMessages();
      });
      container.append(row);
    }
  }

  _renderQuickMessages() {
    const quickBox = this.querySelector("#quick");
    if (!quickBox) return;
    quickBox.replaceChildren();
    const label = this._targetLabel().toLowerCase();
    const quick = [
      ["Dinner is ready.", "orange"],
      ["Come downstairs please.", "pink"],
      ["Please come here.", ""],
      ["Time to get ready.", "green"],
      ["I need help please.", "danger"],
    ];
    if (label.includes("kitchen")) quick.unshift(["Come to the kitchen please.", "orange"]);
    if (label.includes("bedroom") || label.includes("kids")) quick.unshift(["Time for bed.", "pink"]);
    if (label.includes("garage")) quick.unshift(["Please close the garage.", "orange"]);
    if (label.includes("office")) quick.unshift(["Can you come to the office?", "green"]);
    for (const [message, style] of quick) {
      const button = document.createElement("button");
      button.className = style || "secondary";
      button.textContent = message.replace(/\.$/, "");
      button.addEventListener("click", () => this._speak(message));
      quickBox.append(button);
    }
  }

  _renderHistory() {
    const container = this.querySelector("#historyList");
    if (!container) return;
    const history = this._history();
    container.replaceChildren();
    if (!history.length) {
      const empty = document.createElement("div");
      empty.className = "mini";
      empty.textContent = "No messages sent from this browser yet.";
      container.append(empty);
      return;
    }
    for (const item of history) {
      const row = document.createElement("div");
      row.className = "history-item";
      row.innerHTML = `
        <div class="history-message">${this._escape(item.message)}</div>
        <div class="history-meta">${this._escape(item.kind)} to ${this._escape(item.label)} - ${new Date(item.time).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</div>
      `;
      row.addEventListener("click", () => {
        if (item.message !== "Voice recording") this._speak(item.message);
      });
      container.append(row);
    }
  }

  _history() {
    try {
      return JSON.parse(localStorage.getItem("familyIntercomHistory") || "[]");
    } catch {
      return [];
    }
  }

  _addHistory(kind, targets, message, emergency = false) {
    const history = this._history();
    history.unshift({
      kind: emergency ? "Emergency" : kind,
      targets,
      label: this._targetLabel(targets),
      message,
      time: Date.now(),
    });
    localStorage.setItem("familyIntercomHistory", JSON.stringify(history.slice(0, 12)));
    this._renderHistory();
  }

  _sameTargets(left = [], right = []) {
    return left.length === right.length && left.every(value => right.includes(value));
  }

  _escape(value) {
    return String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
  }

  _target() {
    return this.querySelector("#target")?.value || "";
  }

  _targets() {
    if (this._selectedTargets?.length) return this._selectedTargets;
    const target = this._target();
    return target ? [target] : [];
  }

  _targetPayload(targets = this._targets()) {
    return targets.length === 1 ? targets[0] : targets;
  }

  _targetLabel(targets = this._targets()) {
    if (!targets.length) return "no target";
    if (targets.length > 1) return `${targets.length} devices`;
    return this._hass?.states?.[targets[0]]?.attributes?.friendly_name || targets[0];
  }

  _saveTarget() {
    const target = this._target();
    if (target) {
      this._selectedTargets = [target];
      localStorage.setItem("familyIntercomTarget", target);
    }
  }

  _status(text) {
    const status = this.querySelector("#status");
    if (status) status.textContent = text;
  }

  async _speak(message, emergency = false, targets = this._targets()) {
    if (!targets.length) return this._status("Select a target first.");
    await this._hass.callService("family_intercom", "speak_text", {
      target_entity: this._targetPayload(targets),
      message,
      emergency,
    });
    this._addHistory("Text", targets, message, emergency);
    this._status(`${emergency ? "Emergency sent" : "Sent"} to ${this._targetLabel(targets)}.`);
  }

  async _sendText() {
    const textarea = this.querySelector("#message");
    const message = textarea.value.trim();
    if (!message) return this._status("Type a message first.");
    await this._speak(message);
    textarea.value = "";
  }

  async _sendEmergency() {
    const targets = this._players().map(player => player.entityId);
    if (!targets.length) return this._status("No media players found for emergency broadcast.");
    await this._speak("Emergency. I need help please.", true, targets);
  }

  async _startHoldRecording(event) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    this._holding = true;
    this._holdStarted = Date.now();
    await this._startRecording();
  }

  _stopHoldRecording() {
    if (!this._holding) return;
    this._holding = false;
    if (Date.now() - (this._holdStarted || 0) < 500) return;
    this._stopRecording();
  }

  async _startRecording() {
    try {
      if (this._recorder?.state === "recording") return;
      if (!this._targets().length) return this._status("Select a target first.");
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
      this.querySelector("#record").textContent = "Stop";
      this.querySelector("#recordTitle").textContent = "Recording...";
      this.querySelector("#stop").disabled = false;
      this._status("Recording. Release the mic or tap Stop to send.");
    } catch (error) {
      this._status(`Microphone unavailable: ${error.message || error}`);
    }
  }

  _stopRecording() {
    if (this._recorder?.state === "recording") this._recorder.stop();
    this.querySelector("#record").classList.remove("recording");
    this.querySelector("#record").textContent = "Mic";
    this.querySelector("#recordTitle").textContent = "Hold to talk";
    this.querySelector("#stop").disabled = true;
  }

  async _sendRecording() {
    const targets = this._targets();
    if (!targets.length) return this._status("Select a target first.");
    const blob = new Blob(this._chunks || [], { type: this._recorder?.mimeType || "audio/webm" });
    if (!blob.size) return this._status("No audio was recorded.");
    const data = await this._blobToBase64(blob);
    await this._hass.callService("family_intercom", "play_recording", {
      target_entity: this._targetPayload(targets),
      data,
      content_type: blob.type || "audio/webm",
      filename: blob.type?.includes("mp4") ? "intercom.m4a" : "intercom.webm",
    });
    this._addHistory("Voice", targets, "Voice recording");
    this._status(`Voice message sent to ${this._targetLabel(targets)}.`);
  }

  _toggleDisplayMode() {
    this._displayMode = !this._displayMode;
    localStorage.setItem("familyIntercomDisplayMode", this._displayMode ? "1" : "0");
    this.querySelector(".wrap")?.classList.toggle("display-mode", this._displayMode);
    this._status(this._displayMode ? "Display mode enabled." : "Display mode disabled.");
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
