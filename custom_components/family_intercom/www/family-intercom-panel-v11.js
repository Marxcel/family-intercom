class FamilyIntercomPanel extends HTMLElement {
  set hass(hass) {
    this._hass = hass;
    if (!this._rendered) this._render();
    this._subscribeReplies();
    this._updateTargets();
    if (this._isReplyMode() && !this._replyContextRequested) this._loadReplyContext();
  }

  connectedCallback() {
    this._render();
  }

  disconnectedCallback() {
    if (this._replyUnsubscribe) {
      this._replyUnsubscribe();
      this._replyUnsubscribe = null;
      this._replySubscribed = false;
    }
  }

  _render() {
    if (this._rendered) return;
    this._rendered = true;
    this._replyMode = this._isReplyMode();
    this._selectedTargets = [];
    this._displayMode = this._replyMode || localStorage.getItem("familyIntercomDisplayMode") === "1";
    this.innerHTML = `
      <style>
        :host{display:block;width:100%;min-height:100%;box-sizing:border-box;padding:clamp(14px,3vw,28px);overflow-x:hidden;--fi-blue:#4f8cff;--fi-cyan:#23d5d5;--fi-purple:#9b5cff;--fi-pink:#ff4f9a;--fi-orange:#ffb347;--fi-red:#ef4444;--fi-green:#4ade80;--fi-dark:#101827}
        *{box-sizing:border-box}
        .wrap{width:100%;max-width:1240px;min-width:0;margin:0 auto;display:grid;gap:18px}
        .hero{position:relative;overflow:hidden;border-radius:28px;padding:26px;color:white;background:linear-gradient(135deg,var(--fi-blue),var(--fi-purple) 52%,var(--fi-pink));box-shadow:0 18px 50px rgba(79,140,255,.28)}
        .hero:before{content:"";position:absolute;inset:-60px -80px auto auto;width:260px;height:260px;border-radius:999px;background:rgba(255,255,255,.18)}
        .hero:after{content:"";position:absolute;inset:auto auto -80px -50px;width:220px;height:220px;border-radius:999px;background:rgba(35,213,213,.18)}
        .hero-content{position:relative;z-index:1;display:grid;grid-template-columns:1fr auto;gap:18px;align-items:center}
        .eyebrow{margin:0 0 6px;text-transform:uppercase;letter-spacing:.16em;font-size:.76rem;font-weight:900;opacity:.78}
        .hero-actions{display:grid;gap:10px;justify-items:end}
        .device-pill{display:flex;gap:10px;align-items:center;padding:12px 14px;border-radius:999px;background:rgba(12,18,32,.34);backdrop-filter:blur(16px);font-weight:800;white-space:nowrap}
        .hero-stat{display:grid;grid-template-columns:auto 1fr;gap:8px 10px;align-items:center;min-width:230px;padding:14px;border-radius:20px;background:rgba(12,18,32,.26);backdrop-filter:blur(16px);font-size:.88rem}
        .hero-stat strong{font-size:1.08rem}
        .pulse-dot{width:10px;height:10px;border-radius:99px;background:var(--fi-green);box-shadow:0 0 0 7px rgba(74,222,128,.18)}
        .layout{display:grid;grid-template-columns:minmax(0,1.08fr) minmax(300px,.72fr);gap:18px;min-width:0}
        .card{position:relative;overflow:hidden;min-width:0;background:var(--ha-card-background,var(--card-background-color,#fff));border:1px solid color-mix(in srgb,var(--divider-color,#ddd),transparent 40%);border-radius:24px;box-shadow:var(--ha-card-box-shadow,0 10px 30px rgba(0,0,0,.10));padding:18px;display:grid;gap:14px}
        .card.soft{background:linear-gradient(180deg,color-mix(in srgb,var(--ha-card-background,var(--card-background-color,#fff)),var(--fi-blue) 7%),var(--ha-card-background,var(--card-background-color,#fff)))}
        h1,h2,h3,p{margin:0} h1{font-size:clamp(2rem,5vw,4rem);line-height:.98;letter-spacing:-.05em} h2{font-size:1.12rem}
        .hero p{max-width:680px;margin-top:12px;font-size:1.05rem;opacity:.9}
        label{display:grid;gap:6px;font-weight:600}
        select,textarea,input{width:100%;box-sizing:border-box;border:1px solid color-mix(in srgb,var(--divider-color,#ddd),transparent 25%);border-radius:16px;background:var(--card-background-color,#fff);color:var(--primary-text-color,#111);padding:14px;font:inherit;outline:none}
        select:focus,textarea:focus,input:focus{border-color:var(--fi-blue);box-shadow:0 0 0 4px rgba(79,140,255,.16)}
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
        .chips{display:flex;gap:9px;overflow:visible;padding:3px 0 6px;scrollbar-width:thin;flex-wrap:wrap;min-width:0}
        .chip{display:flex;align-items:center;gap:8px;min-width:0;max-width:100%;padding:10px 12px;border-radius:999px;background:color-mix(in srgb,var(--ha-card-background,var(--card-background-color,#fff)),var(--fi-blue) 10%);border:1px solid color-mix(in srgb,var(--divider-color,#ddd),transparent 35%);box-shadow:none;color:var(--primary-text-color,#111);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .chip.active{background:linear-gradient(135deg,var(--fi-blue),var(--fi-cyan));color:white}
        .toolbar{display:grid;grid-template-columns:1fr 1fr;gap:10px}
        .message-actions{display:grid;grid-template-columns:1fr auto;gap:10px}
        .message-actions button{min-width:170px}
        .composer-card{border-radius:22px;padding:14px;background:color-mix(in srgb,var(--ha-card-background,var(--card-background-color,#fff)),var(--fi-cyan) 5%);border:1px solid color-mix(in srgb,var(--divider-color,#ddd),transparent 55%);display:grid;gap:10px}
        .device-list,.history-list{display:grid;gap:8px;max-height:390px;overflow:auto;padding-right:4px}
        .device{display:grid;grid-template-columns:auto minmax(0,1fr) auto auto;gap:10px;align-items:center;padding:12px;border-radius:17px;background:color-mix(in srgb,var(--ha-card-background,var(--card-background-color,#fff)),var(--fi-purple) 5%);border:1px solid color-mix(in srgb,var(--divider-color,#ddd),transparent 45%);cursor:pointer;min-width:0}
        .device:hover{border-color:color-mix(in srgb,var(--fi-blue),transparent 25%);transform:translateY(-1px)}
        .device-icon{width:38px;height:38px;display:grid;place-items:center;border-radius:14px;background:linear-gradient(135deg,var(--fi-blue),var(--fi-purple));color:white;font-size:.78rem;font-weight:900}
        .device-name{font-weight:900;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.device-state{text-transform:capitalize;font-size:.78rem;color:var(--secondary-text-color,#666);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .badge{font-size:.72rem;font-weight:900;padding:5px 8px;border-radius:999px;background:rgba(74,222,128,.14);color:color-mix(in srgb,var(--fi-green),var(--primary-text-color,#111) 25%)}
        .favorite{padding:8px 10px;border-radius:999px;background:transparent;color:var(--secondary-text-color,#666);box-shadow:none;border:1px solid color-mix(in srgb,var(--divider-color,#ddd),transparent 50%)}
        .favorite.active{background:linear-gradient(135deg,#f59e0b,#f97316);color:white;border-color:transparent}
        .section-head{display:flex;align-items:center;justify-content:space-between;gap:10px}
        .tiny{font-size:.76rem;color:var(--secondary-text-color,#666);font-weight:800}
        .inline-form{display:grid;grid-template-columns:1fr auto;gap:8px}
        .history-item{padding:11px;border-radius:15px;background:color-mix(in srgb,var(--ha-card-background,var(--card-background-color,#fff)),var(--fi-cyan) 5%);border:1px solid color-mix(in srgb,var(--divider-color,#ddd),transparent 55%)}
        .history-message{font-weight:900}.history-meta{font-size:.78rem;color:var(--secondary-text-color,#666);margin-top:3px}
        .record-pad{display:grid;gap:12px;place-items:center;text-align:center;padding:18px;border-radius:24px;background:radial-gradient(circle at 50% 0,rgba(255,79,154,.22),transparent 45%),color-mix(in srgb,var(--ha-card-background,var(--card-background-color,#fff)),var(--fi-pink) 5%)}
        .record-circle{width:132px;height:132px;border-radius:999px;font-size:2.8rem;display:grid;place-items:center;background:linear-gradient(135deg,var(--fi-pink),var(--fi-orange));box-shadow:0 18px 38px rgba(255,79,154,.28);touch-action:none}
        .recording{animation:pulse 1s infinite;background:linear-gradient(135deg,#ef4444,#ff4f9a)!important}
        .display-mode .hero,.display-mode aside .device-list,.display-mode .history-list,.display-mode #deviceSearch{display:none}
        .display-mode .layout{grid-template-columns:1fr}.display-mode .grid{grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}
        .display-mode button{font-size:1.18rem;padding:20px}.display-mode .record-circle{width:170px;height:170px;font-size:3.4rem}
        .reply-mode .target-row,.reply-mode #favoriteChips,.reply-mode #presetChips,.reply-mode #targetChips,.reply-mode aside,.reply-mode #saveQuick,.reply-mode #emergency,.reply-mode #displayMode,.reply-mode .composer-card,.reply-mode .record-pad{display:none!important}
        .reply-mode .layout{grid-template-columns:minmax(0,1fr)}
        .reply-mode .card{max-width:760px;margin:0 auto;width:100%}
        .reply-mode .status{font-size:1.1rem;font-weight:900;color:var(--primary-text-color,#111)}
        .reply-banner{display:none;padding:16px;border-radius:20px;background:linear-gradient(135deg,var(--fi-blue),var(--fi-purple));color:white;font-weight:900}
        .reply-mode .reply-banner{display:block}
        .reply-quick{display:none}
        .reply-mode .reply-quick{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
        .reply-mode .reply-quick button{min-height:92px;font-size:1.35rem;border-radius:24px}
        .reply-help{display:none}
        .reply-mode .reply-help{display:block;font-size:.95rem;color:var(--secondary-text-color,#666);font-weight:800;line-height:1.35}
        .voice-commands{display:none}
        .reply-mode .voice-commands{display:grid;gap:10px}
        .voice-command{padding:14px 16px;border-radius:18px;background:color-mix(in srgb,var(--ha-card-background,var(--card-background-color,#fff)),var(--fi-cyan) 8%);border:1px solid color-mix(in srgb,var(--divider-color,#ddd),transparent 45%);font-weight:900}
        @keyframes pulse{50%{transform:scale(1.035);box-shadow:0 0 0 14px rgba(239,68,68,.14),0 18px 38px rgba(255,79,154,.28)}}
        @media (max-width:820px){.layout{grid-template-columns:1fr}.hero-content{grid-template-columns:1fr}.device-pill{width:max-content}.card{border-radius:20px}:host{padding:12px}.toolbar{grid-template-columns:1fr}}
        @media (max-width:520px){
          :host{padding:8px 8px calc(88px + env(safe-area-inset-bottom,0px))}
          .wrap{gap:10px}
          .hero{border-radius:20px;padding:18px}
          h1{font-size:2.35rem}
          .hero p{font-size:.95rem}
          .hero-actions{justify-items:stretch}
          .device-pill,.hero-stat{width:100%;min-width:0}
          .card{padding:14px;border-radius:18px}
          .target-row,.message-actions,.inline-form{grid-template-columns:1fr;display:grid}
          .target-row{gap:8px}
          .target-row button,.message-actions button,.inline-form button,.toolbar button{width:100%;min-width:0}
          #presetChips{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
          #favoriteChips,#targetChips{display:grid;grid-template-columns:1fr;gap:8px}
          .chip{width:100%;justify-content:center;padding:11px 10px;font-size:.93rem}
          #targetChips .chip{justify-content:flex-start;text-align:left}
          .device-list,.history-list{max-height:none;overflow:visible;padding-right:0}
          .device{grid-template-columns:auto minmax(0,1fr) auto;gap:9px}
          .device .favorite{grid-column:1 / -1;width:100%}
          .badge{font-size:.68rem;padding:4px 7px}
          .composer-card{padding:12px}
          textarea{min-height:106px}
          .record-pad{padding:16px 12px}
          .record-circle{width:118px;height:118px;font-size:2.25rem}
          .section-head{align-items:flex-start}
          .section-head button{padding:10px 12px}
        }
      </style>
      <div class="wrap${this._displayMode ? " display-mode" : ""}${this._replyMode ? " reply-mode" : ""}">
        <section class="hero">
          <div class="hero-content">
            <div>
              <p class="eyebrow">Home Assistant intercom</p>
              <h1>Family Intercom</h1>
              <p>Speak typed messages or record your voice from a phone, tablet, browser, or Google display and play it on any speaker, display, TV, or media player Home Assistant knows about.</p>
            </div>
            <div class="hero-actions">
              <div class="device-pill"><span class="pulse-dot"></span><span id="deviceCount">Detecting devices</span></div>
              <div class="hero-stat">
                <span>Target</span><strong id="heroTarget">None selected</strong>
                <span>Last sent</span><strong id="heroLastSent">Not yet</strong>
              </div>
            </div>
          </div>
        </section>
        <div class="layout">
          <main class="card soft">
            <div class="section-head">
              <h2>Send to</h2>
              <span class="tiny" id="selectedCount">0 selected</span>
            </div>
            <div class="target-row">
              <select id="target"></select>
              <button id="refresh" class="secondary" title="Refresh devices">&#8635;</button>
            </div>
            <div class="mini">Favorites</div>
            <div class="chips" id="favoriteChips"></div>
            <div class="mini">Room presets</div>
            <div class="chips" id="presetChips"></div>
            <div class="mini">Individual devices</div>
            <div class="chips" id="targetChips"></div>
            <div class="toolbar">
              <button id="displayMode" class="secondary">Display mode</button>
              <button id="emergency" class="emergency">Emergency broadcast</button>
            </div>
            <div class="reply-banner" id="replyBanner">Loading reply target...</div>
            <div class="status" id="status">Select a speaker or display, then type or hold the microphone.</div>
            <div class="reply-help">This Google display is showing the reply screen, but touch input may be blocked by Home Assistant Cast. Use one of the voice commands below.</div>
            <div class="voice-commands">
              <div class="voice-command">Hey Google, turn on Intercom Yes</div>
              <div class="voice-command">Hey Google, turn on Intercom No</div>
              <div class="voice-command">Hey Google, turn on Intercom Okay</div>
              <div class="voice-command">Hey Google, turn on Intercom Coming</div>
              <div class="voice-command">Hey Google, turn on Intercom Help</div>
              <div class="voice-command">Hey Google, turn on Intercom Call Me</div>
            </div>
            <div class="reply-quick" id="replyQuick"></div>
            <div class="composer-card">
              <label>Type a message
                <textarea id="message" placeholder="Example: Dinner is ready."></textarea>
              </label>
              <div class="message-actions">
                <button id="sendText" class="green">Speak typed message</button>
                <button id="saveQuick" class="secondary" title="Save this as a custom quick message">Save quick</button>
              </div>
            </div>
            <div class="record-pad">
              <button id="record" class="record-circle" title="Hold to record voice">Mic</button>
              <h2 id="recordTitle">Hold to talk</h2>
              <p class="mini">Hold the mic and release to send. Or tap once, then tap Stop. Clips are temporary and deleted after playback.</p>
              <button id="stop" class="danger" disabled>Stop and send recording</button>
            </div>
          </main>
          <aside class="card">
            <div class="section-head">
              <h2>Quick messages</h2>
              <button id="clearCustomQuick" class="secondary" title="Clear custom quick messages">Clear custom</button>
            </div>
            <div class="grid" id="quick"></div>
            <div class="inline-form">
              <input id="customQuick" placeholder="Add custom quick message">
              <button id="addCustomQuick" class="secondary">Add</button>
            </div>
            <div class="section-head">
              <h2>Send history</h2>
              <button id="clearHistory" class="secondary" title="Clear send history">Clear</button>
            </div>
            <div class="history-list" id="historyList"></div>
            <h2>Available now</h2>
            <div class="mini">This list updates whenever Home Assistant device states change. Idle, off, standby, paused, and playing devices stay visible; unavailable or unknown devices are hidden.</div>
            <input id="deviceSearch" placeholder="Search devices, rooms, hubs, speakers">
            <div class="device-list" id="deviceList"></div>
          </aside>
        </div>
      </div>
    `;
    this.querySelector("#sendText").addEventListener("click", () => this._sendText());
    this.querySelector("#saveQuick").addEventListener("click", () => this._saveTypedQuick());
    this.querySelector("#stop").addEventListener("click", () => this._stopRecording());
    this.querySelector("#refresh").addEventListener("click", () => this._updateTargets(true));
    this.querySelector("#target").addEventListener("change", () => this._saveTarget());
    this.querySelector("#emergency").addEventListener("click", () => this._sendEmergency());
    this.querySelector("#displayMode").addEventListener("click", () => this._toggleDisplayMode());
    this.querySelector("#deviceSearch").addEventListener("input", () => this._renderDeviceList(this._players()));
    this.querySelector("#addCustomQuick").addEventListener("click", () => this._addCustomQuick());
    this.querySelector("#clearCustomQuick").addEventListener("click", () => this._clearCustomQuick());
    this.querySelector("#clearHistory").addEventListener("click", () => this._clearHistory());
    const record = this.querySelector("#record");
    record.addEventListener("click", () => this._startRecording());
    record.addEventListener("pointerdown", event => this._startHoldRecording(event));
    record.addEventListener("pointerup", () => this._stopHoldRecording());
    record.addEventListener("pointercancel", () => this._stopHoldRecording());
    record.addEventListener("pointerleave", () => this._stopHoldRecording());
    this._renderQuickMessages();
    this._renderHistory();
    if (this._replyMode) this._status("Loading original sender...");
  }

  _isReplyMode() {
    return Boolean(this._config?.reply_mode) || window.location.pathname.includes("family-intercom-reply");
  }

  _sessionId() {
    let sessionId = localStorage.getItem("familyIntercomSessionId");
    if (!sessionId) {
      sessionId = `fi_${crypto.randomUUID?.() || `${Date.now()}_${Math.random().toString(16).slice(2)}`}`;
      localStorage.setItem("familyIntercomSessionId", sessionId);
    }
    return sessionId;
  }

  _senderName() {
    return localStorage.getItem("familyIntercomSenderName") || "Original device";
  }

  _subscribeReplies() {
    if (this._replySubscribed || !this._hass?.connection?.subscribeEvents) return;
    this._replySubscribed = true;
    this._hass.connection.subscribeEvents(event => this._handleReply(event), "family_intercom_reply")
      .then(unsubscribe => { this._replyUnsubscribe = unsubscribe; })
      .catch(() => { this._replySubscribed = false; });
  }

  async _loadReplyContext() {
    this._replyContextRequested = true;
    try {
      const response = await fetch("/api/family_intercom/reply_context", { cache: "no-store" });
      const context = await response.json();
      this._replyContext = context?.session_id ? context : null;
      const banner = this.querySelector("#replyBanner");
      if (this._replyContext) {
        if (banner) banner.textContent = `Replying to ${this._replyContext.sender_name || "the original sender"}`;
        this._status("Type a reply or tap a quick message. Voice depends on Google display microphone permissions.");
      } else {
        if (banner) banner.textContent = "No active sender found";
        this._status("Send an intercom message to this display first, then this reply view can answer that sender.");
      }
      this._updateHero();
    } catch (error) {
      this._status(`Could not load reply target: ${error.message || error}`);
    }
  }

  async _handleReply(event) {
    const data = event?.data || {};
    if (!data.session_id || data.session_id !== this._sessionId()) return;
    const from = data.from || "Family Intercom";
    if (data.kind === "recording" && data.media_url) {
      this._status(`Voice reply from ${from}.`);
      try {
        await new Audio(data.media_url).play();
      } catch {
        this._status(`Voice reply from ${from} received. Tap the page if your browser blocked autoplay.`);
      }
      return;
    }
    if (data.message) {
      this._status(`Reply from ${from}: ${data.message}`);
      try {
        const utterance = new SpeechSynthesisUtterance(data.message);
        window.speechSynthesis?.speak(utterance);
      } catch {
        // Status text is still updated when speech synthesis is unavailable.
      }
    }
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
    const configured = this._config?.default_target || "";
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
    if (configured && players.some(player => player.entityId === configured)) select.value = configured;
    else if (current && players.some(player => player.entityId === current)) select.value = current;
    else if (players[0]) select.value = players[0].entityId;
    this._saveTarget();

    const count = this.querySelector("#deviceCount");
    if (count) count.textContent = `${players.length} media player${players.length === 1 ? "" : "s"}`;
    this._renderFavoriteChips(players);
    this._renderPresetChips(players);
    this._renderTargetChips(players);
    this._renderDeviceList(players);
    this._renderQuickMessages();
    this._updateHero();
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

  _renderFavoriteChips(players) {
    const container = this.querySelector("#favoriteChips");
    if (!container) return;
    const favorites = this._favorites();
    const favoritePlayers = players.filter(player => favorites.includes(player.entityId));
    container.replaceChildren();
    if (!favoritePlayers.length) {
      const empty = document.createElement("span");
      empty.className = "mini";
      empty.textContent = "Tap the star next to a device to save it here.";
      container.append(empty);
      return;
    }
    for (const player of favoritePlayers) {
      const button = document.createElement("button");
      button.className = `chip${this._sameTargets(this._selectedTargets, [player.entityId]) ? " active" : ""}`;
      button.textContent = `${player.icon} ${player.name}`;
      button.addEventListener("click", () => this._selectPlayer(player, players));
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
    const query = (this.querySelector("#deviceSearch")?.value || "").trim().toLowerCase();
    const favorites = this._favorites();
    const visible = query
      ? players.filter(player => `${player.name} ${player.entityId} ${player.state} ${player.icon}`.toLowerCase().includes(query))
      : players;
    container.replaceChildren();
    if (!visible.length) {
      const empty = document.createElement("div");
      empty.className = "mini";
      empty.textContent = query ? "No devices match that search." : "No available media players found.";
      container.append(empty);
      return;
    }
    for (const player of visible) {
      const row = document.createElement("div");
      row.className = "device";
      row.innerHTML = `
        <div class="device-icon">${this._escape(player.icon.slice(0, 2))}</div>
        <div><div class="device-name">${this._escape(player.name)}</div><div class="device-state">${this._escape(player.entityId)} - ${this._escape(player.state)}</div></div>
        <div class="badge">${this._escape(player.state)}</div>
        <button class="favorite${favorites.includes(player.entityId) ? " active" : ""}" title="Favorite device">Star</button>
      `;
      row.addEventListener("click", event => {
        if (event.target?.classList?.contains("favorite")) return;
        this._selectPlayer(player, players);
      });
      row.querySelector(".favorite").addEventListener("click", () => {
        this._toggleFavorite(player.entityId);
        this._renderFavoriteChips(players);
        this._renderDeviceList(players);
      });
      container.append(row);
    }
  }

  _renderQuickMessages() {
    const quickBoxes = [this.querySelector("#quick"), this.querySelector("#replyQuick")].filter(Boolean);
    if (!quickBoxes.length) return;
    for (const quickBox of quickBoxes) quickBox.replaceChildren();
    const label = this._targetLabel().toLowerCase();
    const quick = [
      ["Yes.", "green"],
      ["No.", "danger"],
      ["Okay.", ""],
      ["I am coming.", "green"],
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
    for (const message of this._customQuickMessages()) quick.push([message, "secondary"]);
    for (const quickBox of quickBoxes) {
      const messages = quickBox.id === "replyQuick" ? quick.slice(0, 8) : quick;
      for (const [message, style] of messages) {
        const button = document.createElement("button");
        button.className = style || "secondary";
        button.textContent = message.replace(/\.$/, "");
        button.addEventListener("click", event => {
          event.preventDefault();
          event.stopPropagation();
          this._speak(message);
        });
        button.addEventListener("pointerup", event => {
          event.preventDefault();
          event.stopPropagation();
        });
        quickBox.append(button);
      }
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
    this._updateHero();
  }

  _clearHistory() {
    localStorage.removeItem("familyIntercomHistory");
    this._renderHistory();
    this._updateHero();
    this._status("Send history cleared.");
  }

  _customQuickMessages() {
    try {
      return JSON.parse(localStorage.getItem("familyIntercomQuickMessages") || "[]");
    } catch {
      return [];
    }
  }

  _saveCustomQuick(message) {
    const clean = String(message || "").trim();
    if (!clean) return false;
    const messages = this._customQuickMessages().filter(item => item.toLowerCase() !== clean.toLowerCase());
    messages.unshift(clean);
    localStorage.setItem("familyIntercomQuickMessages", JSON.stringify(messages.slice(0, 10)));
    this._renderQuickMessages();
    return true;
  }

  _addCustomQuick() {
    const input = this.querySelector("#customQuick");
    if (!this._saveCustomQuick(input.value)) return this._status("Type a quick message first.");
    input.value = "";
    this._status("Custom quick message saved.");
  }

  _saveTypedQuick() {
    const textarea = this.querySelector("#message");
    if (!this._saveCustomQuick(textarea.value)) return this._status("Type a message first.");
    this._status("Saved as a custom quick message.");
  }

  _clearCustomQuick() {
    localStorage.removeItem("familyIntercomQuickMessages");
    this._renderQuickMessages();
    this._status("Custom quick messages cleared.");
  }

  _favorites() {
    try {
      return JSON.parse(localStorage.getItem("familyIntercomFavoriteTargets") || "[]");
    } catch {
      return [];
    }
  }

  _toggleFavorite(entityId) {
    const favorites = this._favorites();
    const next = favorites.includes(entityId)
      ? favorites.filter(item => item !== entityId)
      : [entityId, ...favorites].slice(0, 12);
    localStorage.setItem("familyIntercomFavoriteTargets", JSON.stringify(next));
    this._status(next.includes(entityId) ? "Favorite saved." : "Favorite removed.");
  }

  _selectPlayer(player, players = this._players()) {
    this.querySelector("#target").value = player.entityId;
    this._selectedTargets = [player.entityId];
    this._saveTarget();
    this._rememberTarget(player.entityId);
    this._renderFavoriteChips(players);
    this._renderPresetChips(players);
    this._renderTargetChips(players);
    this._renderQuickMessages();
    this._updateHero();
  }

  _rememberTarget(entityId) {
    const recent = this._recentTargets().filter(item => item !== entityId);
    recent.unshift(entityId);
    localStorage.setItem("familyIntercomRecentTargets", JSON.stringify(recent.slice(0, 8)));
  }

  _recentTargets() {
    try {
      return JSON.parse(localStorage.getItem("familyIntercomRecentTargets") || "[]");
    } catch {
      return [];
    }
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
    if (this._replyMode && this._replyContext?.session_id) {
      return `Reply to ${this._replyContext.sender_name || "original sender"}`;
    }
    if (this._replyMode) return "Loading reply target";
    if (!targets.length) return "no target";
    if (targets.length > 1) return `${targets.length} devices`;
    return this._hass?.states?.[targets[0]]?.attributes?.friendly_name || targets[0];
  }

  _saveTarget() {
    const target = this._target();
    if (target) {
      this._selectedTargets = [target];
      localStorage.setItem("familyIntercomTarget", target);
      this._rememberTarget(target);
      const players = this._players();
      this._renderFavoriteChips(players);
      this._renderPresetChips(players);
      this._renderTargetChips(players);
      this._renderQuickMessages();
      this._updateHero();
    }
  }

  _status(text) {
    const status = this.querySelector("#status");
    if (status) status.textContent = text;
  }

  _updateHero() {
    const heroTarget = this.querySelector("#heroTarget");
    const heroLastSent = this.querySelector("#heroLastSent");
    const selectedCount = this.querySelector("#selectedCount");
    const targets = this._targets();
    if (heroTarget) heroTarget.textContent = this._targetLabel(targets);
    if (selectedCount) selectedCount.textContent = this._replyMode ? "Reply mode" : `${targets.length} selected`;
    const latest = this._history()[0];
    if (heroLastSent) {
      heroLastSent.textContent = latest
        ? `${latest.kind} ${new Date(latest.time).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
        : "Not yet";
    }
  }

  async _speak(message, emergency = false, targets = this._targets()) {
    if (this._replyMode && !this._replyContext?.session_id) {
      return this._status("No original sender found yet.");
    }
    if (this._replyMode) {
      await this._hass.callService("family_intercom", "reply_text", {
        session_id: this._replyContext.session_id,
        message,
        from_name: "Google display",
      });
      this._status(`Reply sent to ${this._replyContext.sender_name || "original sender"}.`);
      return;
    }
    if (!targets.length) return this._status("Select a target first.");
    await this._hass.callService("family_intercom", "speak_text", {
      target_entity: this._targetPayload(targets),
      message,
      emergency,
      sender_session_id: this._sessionId(),
      sender_name: this._senderName(),
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
    const now = Date.now();
    if (!this._emergencyConfirmUntil || now > this._emergencyConfirmUntil) {
      this._emergencyConfirmUntil = now + 5000;
      this._status(`Press Emergency broadcast again within 5 seconds to send to ${targets.length} devices.`);
      return;
    }
    this._emergencyConfirmUntil = 0;
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
      if (!this._replyMode && !this._targets().length) return this._status("Select a target first.");
      if (this._replyMode && !this._replyContext?.session_id) return this._status("No original sender found yet.");
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
    if (!this._replyMode && !targets.length) return this._status("Select a target first.");
    if (this._replyMode && !this._replyContext?.session_id) return this._status("No original sender found yet.");
    const blob = new Blob(this._chunks || [], { type: this._recorder?.mimeType || "audio/webm" });
    if (!blob.size) return this._status("No audio was recorded.");
    const data = await this._blobToBase64(blob);
    if (this._replyMode) {
      await this._hass.callService("family_intercom", "reply_recording", {
        session_id: this._replyContext.session_id,
        data,
        content_type: blob.type || "audio/webm",
        filename: blob.type?.includes("mp4") ? "intercom.m4a" : "intercom.webm",
        from_name: "Google display",
      });
      this._status(`Voice reply sent to ${this._replyContext.sender_name || "original sender"}.`);
      return;
    }
    await this._hass.callService("family_intercom", "play_recording", {
      target_entity: this._targetPayload(targets),
      data,
      content_type: blob.type || "audio/webm",
      filename: blob.type?.includes("mp4") ? "intercom.m4a" : "intercom.webm",
      sender_session_id: this._sessionId(),
      sender_name: this._senderName(),
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
