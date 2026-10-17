// Local-only RUVEXA device-list prototype. Credentials are held in memory only.
export const ruvexaHtml = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>RUVEXA | Local Devices</title><style>
:root{color-scheme:dark}body{margin:0;background:#0c1424;color:#eef3fa;font:16px system-ui,sans-serif}
main{max-width:880px;margin:32px auto;padding:20px}h1{margin-bottom:4px}p,small{color:#b6c5d9}
.card{background:#17243a;border:1px solid #33465d;border-radius:16px;padding:20px;margin:14px 0}
form{display:grid;gap:12px}label{display:grid;gap:6px}input,select,button{padding:12px;border-radius:8px;border:1px solid #65768a;font:inherit}
input,select{background:#0d1c30;color:white}button{background:#5bc5ab;color:#0a1b23;font-weight:700;cursor:pointer}
button:disabled{opacity:.55;cursor:default}.row{display:flex;gap:12px;flex-wrap:wrap;justify-content:space-between;align-items:center}
#devices{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px}
.badge{padding:5px 9px;border-radius:12px;background:#273e57}#message{min-height:24px}
</style></head><body><main><small>AMJ HOMEOS · LOCAL PREVIEW</small><h1>RUVEXA Devices</h1>
<p>Connect using a temporary customer session issued by your installer. This is a prototype, not the finished customer app.</p>
<section class="card"><form id="connect"><label>Session ID<input id="session" required autocomplete="off" maxlength="128"></label>
<label>Session token<input id="token" type="password" required autocomplete="off" maxlength="256"></label>
<div class="row"><button id="load" type="submit">View my devices</button><button id="disconnect" type="button">Disconnect</button></div></form>
<p id="message" role="status" aria-live="polite"></p></section>
<section class="card"><div class="row"><h2>My devices</h2><button id="refresh" type="button" disabled>Refresh</button></div>
<p id="summary">Not connected</p><div id="devices"></div></section>
<small>Only installer-approved lights, switches and fans can be toggled. Commands require a valid customer session. Credentials are not saved in this browser.</small>
<script src="/ruvexa-preview.js" defer></script></main></body></html>`;

export const ruvexaScript = `(() => {
  "use strict";
  const el = id => document.getElementById(id);
  let credentials = null;
  const message = text => { el("message").textContent = text; };
  function clearDevices() {
    el("devices").replaceChildren();
    el("summary").textContent = "Not connected";
  }
  function disconnect() {
    credentials = null;
    el("token").value = "";
    el("session").value = "";
    el("refresh").disabled = true;
    clearDevices();
    message("Disconnected.");
  }
  async function setPower(device, power, button) {
    if (!credentials || button.disabled) return;
    const session = credentials;
    button.disabled = true;
    message("Sending command…");
    try {
      const response = await fetch("/v1/devices/relay", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + session.token,
          "X-AMJ-Session-ID": session.sessionId,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ entityId: device.id, power }),
        cache: "no-store"
      });
      if (credentials !== session) return;
      if (response.status === 401) {
        disconnect();
        message("Session expired. Request a new session from your installer.");
        return;
      }
      if (!response.ok) {
        message(response.status === 403 ? "Device control not approved." :
          response.status === 409 ? "Device unavailable." : "Command failed. Try again.");
        return;
      }
      message("Command accepted. Checking device state…");
      await refresh();
    } catch {
      if (credentials === session) message("Unable to reach the gateway. Device state is unconfirmed.");
    } finally {
      button.disabled = false;
    }
  }
  async function setFanSpeed(device, selection, button) {
    if (!credentials || button.disabled) return;
    const session = credentials;
    button.disabled = true;
    message("Setting fan speed…");
    try {
      const response = await fetch("/v1/devices/fan-speed", {
        method: "POST",
        headers: { Authorization: "Bearer " + session.token,
          "X-AMJ-Session-ID": session.sessionId, "Content-Type": "application/json" },
        body: JSON.stringify({ entityId: device.id, ...selection }), cache: "no-store"
      });
      if (credentials !== session) return;
      if (response.status === 401) {
        disconnect();
        message("Session expired. Ask your installer for a new session.");
      } else if (!response.ok) {
        message(response.status === 403 ? "Fan control not approved." :
          response.status === 409 ? "Fan speed unavailable." : "Fan speed command failed.");
      } else {
        message("Fan speed command accepted. Refreshing…");
        await refresh();
      }
    } catch {
      if (credentials === session) message("Gateway unreachable. Fan speed is unconfirmed.");
    } finally {
      button.disabled = false;
    }
  }
  async function refresh() {
    if (!credentials) return;
    const session = credentials;
    el("refresh").disabled = true;
    message("Loading your devices…");
    try {
      const response = await fetch("/v1/devices/inventory", {
        headers: { Authorization: "Bearer " + credentials.token, "X-AMJ-Session-ID": credentials.sessionId },
        cache: "no-store"
      });
      if (response.status === 401) {
        disconnect();
        message("Session expired or invalid. Ask your installer for a new session.");
        return;
      }
      if (!response.ok) throw new Error("Gateway unavailable");
      const inventory = await response.json();
      if (credentials !== session) return;
      if (!inventory || !Array.isArray(inventory.devices) || inventory.devices.length > 1000)
        throw new Error("Invalid inventory");
      clearDevices();
      const summary = inventory.summary || {};
      el("summary").textContent = inventory.count + " devices · " +
        (summary.online || 0) + " online · " + (summary.offline || 0) + " offline";
      for (const device of inventory.devices) {
        const card = document.createElement("article");
        card.className = "card";
        const heading = document.createElement("h3");
        heading.textContent = device.name || device.id;
        const category = document.createElement("p");
        category.textContent = String(device.category || "Device") + " · " + String(device.availability || "unknown");
        const state = document.createElement("span");
        state.className = "badge";
        state.textContent = String(device.state || "unknown") + (device.unit || "");
        card.append(heading, category, state);
        // The gateway remains authoritative: only scoped, approved light/switch/fan
        // commands can succeed. No lock, cover or gate controls here.
        if (device.canToggle === true && device.availability === "online" &&
            (device.category === "lighting" || device.category === "switches" || device.category === "fans") &&
            (device.state === "on" || device.state === "off")) {
          const toggle = document.createElement("button");
          toggle.type = "button";
          toggle.textContent = device.state === "on" ? "Turn off" : "Turn on";
          toggle.setAttribute("aria-label", toggle.textContent + " " + (device.name || device.id));
          toggle.addEventListener("click", () => setPower(device, device.state !== "on", toggle));
          card.append(toggle);
        }
        if (device.category === "fans" && device.supportsFanSpeed === true &&
            (device.fanSpeedMode === "percentage" ||
              (device.fanSpeedMode === "stages" && (device.fanSpeedStages === 4 || device.fanSpeedStages === 5))) &&
            device.availability === "online") {
          const label = document.createElement("label");
          label.textContent = device.fanSpeedMode === "percentage" ? "Fan speed (%)" : "Fan speed";
          const percentageMode = device.fanSpeedMode === "percentage";
          const select = document.createElement(percentageMode ? "input" : "select");
          if (percentageMode) {
            select.type = "range"; select.min = "0"; select.max = "100"; select.step = "1";
            select.value = String(device.fanSpeedPercentage ?? 0);
            const reading = document.createElement("span");
            reading.textContent = select.value + "%";
            select.addEventListener("input", () => { reading.textContent = select.value + "%"; });
            label.append(reading);
          }
          const max = device.fanSpeedStages;
          const start = 1;
          const step = 1;
          if (!percentageMode) for (let stage = start; stage <= max; stage += step) {
            const option = document.createElement("option");
            option.value = String(stage);
            option.textContent = percentageMode ? String(stage) + "%" : "Speed " + String(stage);
            option.selected = percentageMode ? Math.round((device.fanSpeedPercentage ?? 0) / 5) * 5 === stage : device.fanSpeedStage === stage;
            select.append(option);
          }
          const apply = document.createElement("button");
          apply.type = "button";
          apply.textContent = "Set speed";
          apply.addEventListener("click", () => setFanSpeed(device, percentageMode ? { percentage: Number(select.value) } : { stage: Number(select.value) }, apply));
          label.append(select);
          card.append(label, apply);
        }
        el("devices").append(card);
      }
      message("Device list updated.");
    } catch {
      if (credentials === session) {
        clearDevices();
        message("Unable to load devices. Check your gateway connection.");
      }
    } finally {
      el("refresh").disabled = !credentials;
    }
  }
  el("connect").addEventListener("submit", event => {
    event.preventDefault();
    credentials = { sessionId: el("session").value.trim(), token: el("token").value };
    el("token").value = "";
    refresh();
  });
  el("refresh").addEventListener("click", refresh);
  el("disconnect").addEventListener("click", disconnect);
  window.addEventListener("pagehide", () => { credentials = null; });
})();`;
