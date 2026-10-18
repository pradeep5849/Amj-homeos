"use client";
import { FormEvent, useEffect, useState } from "react";

type Home = { id: string; name: string; memberships: { role: string }[] };
type Room = { id: string; name: string };
type Recorder = { id: string; name: string; brand: string };
type Camera = { id: string; name: string; brand: string; model: string | null; roomId: string | null; sourceKind: string; connectionStatus: string; connectionMethod: string; capabilities: { live?: boolean; recordings?: boolean; ptz?: boolean; audio?: boolean; snapshots?: boolean } };
const brands = ["HIKVISION","CP_PLUS","DAHUA","TAPO","EZVIZ","REOLINK","GENERIC_ONVIF","OTHER"] as const;
const emptyCapabilities = { live: true, recordings: false, ptz: false, audio: false, snapshots: false };

export function CameraDashboard({ role }: { role: string }) {
  const [homes, setHomes] = useState<Home[]>([]);
  const [homeId, setHomeId] = useState("");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [recorders, setRecorders] = useState<Recorder[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [showCamera, setShowCamera] = useState(false);
  const [showRecorder, setShowRecorder] = useState(false);
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);
  const [readiness, setReadiness] = useState("");
  const [statusBusy, setStatusBusy] = useState(false);
  const [sourceKind, setSourceKind] = useState<"IP_CAMERA" | "NVR_CHANNEL" | "DVR_CHANNEL">("IP_CAMERA");
  const canManage = role === "SUPER_ADMIN" || role === "ADMIN" || homes.find(h => h.id === homeId)?.memberships.some(m => m.role === "OWNER");
  useEffect(() => {
    let alive = true;
    void fetch("/api/v1/homes").then(async r => {
      if (!r.ok) throw new Error("Unable to load homes");
      const data = await r.json() as { homes: Home[] };
      if (alive) { setHomes(data.homes); setHomeId(data.homes[0]?.id ?? ""); }
    }).catch(() => { if (alive) setMessage("Unable to load homes"); });
    return () => { alive = false; };
  }, []);
  useEffect(() => {
    if (!homeId) return;
    let alive = true;
    void Promise.all([
      fetch(`/api/v1/homes/${homeId}/rooms`),
      fetch(`/api/v1/homes/${homeId}/cameras`),
      fetch(`/api/v1/homes/${homeId}/camera-recorders`),
    ]).then(async ([r, c, n]) => {
      if (!r.ok || !c.ok || !n.ok) throw new Error("Unable to load CCTV data");
      const [roomData, cameraData, recorderData] = await Promise.all([r.json(), c.json(), n.json()]);
      if (alive) { setRooms(roomData.rooms ?? []); setCameras(cameraData.cameras ?? []); setRecorders(recorderData.recorders ?? []); setMessage(""); }
    }).catch(() => { if (alive) setMessage("Unable to load CCTV data"); });
    return () => { alive = false; };
  }, [homeId, busy, refresh]);
  async function submit(event: FormEvent<HTMLFormElement>, type: "camera" | "recorder") {
    event.preventDefault();
    if (!homeId || busy) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const payload = type === "recorder" ? {
      name: String(data.get("name") ?? ""), brand: String(data.get("brand") ?? "OTHER"),
      model: String(data.get("model") ?? "") || null,
    } : {
      homeId, name: String(data.get("name") ?? ""), brand: String(data.get("brand") ?? "OTHER"),
      model: String(data.get("model") ?? "") || null,
      roomId: String(data.get("roomId") ?? "") || null,
      sourceKind, connectionMethod: "UNSUPPORTED",
      recorderId: sourceKind === "IP_CAMERA" ? null : String(data.get("recorderId") ?? "") || null,
      recorderChannel: sourceKind === "IP_CAMERA" ? null : Number(data.get("recorderChannel")),
      capabilities: emptyCapabilities,
    };
    setBusy(true);
    try {
      const response = await fetch(`/api/v1/homes/${homeId}/${type === "camera" ? "cameras" : "camera-recorders"}`, {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(typeof body.error === "string" ? body.error : "Registration failed");
      }
      form.reset();
      setShowCamera(false);
      setShowRecorder(false);
      setMessage(type === "camera" ? "Camera registered. Live connection is not configured." : "Recorder registered.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Registration failed"); }
    finally { setBusy(false); }
  }
  async function manageCamera(camera: Camera, action: "rename" | "archive" | "room") {
    if (!homeId || busy) return;
    let name: string | undefined;
    let roomId: string | null | undefined;
    if (action === "room") {
      const choice = window.prompt(`Assign room for ${camera.name}. Enter a room name, or leave blank to unassign.\nAvailable: ${rooms.map(r => r.name).join(", ")}`, rooms.find(r => r.id === camera.roomId)?.name ?? "");
      if (choice === null) return;
      const matching = rooms.find(r => r.name.toLocaleLowerCase() === choice.trim().toLocaleLowerCase());
      if (choice.trim() && !matching) { setMessage("Room not found. Choose an existing room name."); return; }
      roomId = matching?.id ?? null;
      if (roomId === camera.roomId) return;
    } else if (action === "rename") {
      const proposed = window.prompt("Camera name", camera.name);
      if (proposed === null) return;
      name = proposed.trim();
      if (!name || name === camera.name) return;
    } else if (!window.confirm(`Archive camera "${camera.name}"? It will disappear from the dashboard.`)) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/v1/homes/${homeId}/cameras/${camera.id}`, {
        method: action === "archive" ? "DELETE" : "PATCH",
        ...(action !== "archive" ? { headers: { "content-type": "application/json" }, body: JSON.stringify(action === "room" ? { roomId } : { name }) } : {}),
      });
      if (!response.ok) throw new Error("Unable to update camera");
      setSelectedCamera(null);
      setMessage(action === "archive" ? "Camera archived." : action === "room" ? "Camera room updated." : "Camera renamed.");
      setRefresh(value => value + 1);
    } catch { setMessage("Unable to update camera."); }
    finally { setBusy(false); }
  }
  async function checkLive(camera: Camera) {
    if (statusBusy) return;
    setStatusBusy(true);
    setSelectedCamera(camera); setReadiness("Checking connection...");
    try {
      const response = await fetch(`/api/v1/homes/${homeId}/cameras/${camera.id}/live`, { cache: "no-store" });
      if (!response.ok) throw new Error("Unable to check camera");
      const body = await response.json() as { available: boolean; message?: string };
      setReadiness(body.available ? "Gateway reports ready" : body.message ?? "Live view is unavailable");
    } catch { setReadiness("Live view is unavailable"); }
    finally { setStatusBusy(false); }
  }
  return <section className="content-section" aria-label="CCTV dashboard">
    <div className="section-heading"><div><h1>CCTV Cameras</h1><p className="muted">Register and organize your security cameras. Live streaming requires a secure local gateway.</p></div></div>
    {homes.length > 1 && <label>Home <select value={homeId} onChange={e => { setHomeId(e.target.value); setSelectedCamera(null); }} >{homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}</select></label>}
    {message && <p role="status">{message}</p>}
    {!homeId && <p>No home assigned.</p>}
    {homeId && <>
      <div className="rooms-toolbar"><h2>Camera overview · {cameras.length}</h2>{canManage && <div><button type="button" onClick={() => setShowCamera(v => !v)}>+ Add Camera</button> <button type="button" onClick={() => setShowRecorder(v => !v)}>+ Add NVR/DVR</button></div>}</div>
      {canManage && showRecorder && <form className="compact-room-form" onSubmit={e => void submit(e, "recorder")}>
        <h3>Register NVR / DVR</h3><label>Name <input name="name" required maxLength={120}/></label><label>Brand <select name="brand">{brands.map(b => <option key={b} value={b}>{b.replaceAll("_"," ")}</option>)}</select></label><label>Model <input name="model" maxLength={120}/></label><button disabled={busy}>Save Recorder</button>
      </form>}
      {canManage && showCamera && <form className="compact-room-form" onSubmit={e => void submit(e, "camera")}>
        <h3>Register Camera</h3><label>Name <input name="name" required maxLength={120}/></label><label>Brand <select name="brand">{brands.map(b => <option key={b} value={b}>{b.replaceAll("_"," ")}</option>)}</select></label><label>Model <input name="model" maxLength={120}/></label>
        <label>Room <select name="roomId"><option value="">Unassigned</option>{rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
        <label>Source <select value={sourceKind} onChange={e => setSourceKind(e.target.value as typeof sourceKind)}><option value="IP_CAMERA">IP Camera</option><option value="NVR_CHANNEL">NVR Channel</option><option value="DVR_CHANNEL">DVR Channel</option></select></label>
        {sourceKind !== "IP_CAMERA" && <><label>Recorder <select name="recorderId" required><option value="">Choose recorder</option>{recorders.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label><label>Channel number <input name="recorderChannel" type="number" min="1" max="4096" required /></label></>}
        <button disabled={busy}>Save Camera</button>
      </form>}
      {cameras.length === 0 ? <div className="empty-state"><h3>No cameras registered</h3><p>Add your first camera to start organizing CCTV devices.</p></div> :
        <div className="device-grid">{cameras.map(camera => <article className="device-card" key={camera.id}>
          <div className="device-title"><span className="device-icon">▣</span><div><h3>{camera.name}</h3><p>{camera.brand.replaceAll("_"," ")} · {rooms.find(r => r.id === camera.roomId)?.name ?? "Unassigned"}</p></div></div>
          <p className="muted">{camera.sourceKind.replaceAll("_"," ")} · {camera.connectionStatus === "ONLINE" ? "Online (reported)" : camera.connectionStatus === "OFFLINE" ? "Offline" : "Not connected / unknown"}</p>
          <p>Live video unavailable until a secure gateway is connected.</p><button type="button" disabled={statusBusy} onClick={() => void checkLive(camera)}>View Camera Status</button>{canManage && <div><button type="button" disabled={busy} onClick={() => void manageCamera(camera, "rename")}>Rename</button> <button type="button" disabled={busy} onClick={() => void manageCamera(camera, "room")}>Change Room</button> <button type="button" disabled={busy} onClick={() => void manageCamera(camera, "archive")}>Archive</button></div>}
        </article>)}</div>}
      {selectedCamera && <div className="content-section" role="status"><h3>{selectedCamera.name} — Live view</h3><p>{readiness}</p><p>Streaming, recording playback and PTZ are not yet available.</p><p className="muted">A registered camera is not automatically connected. Do not enter camera passwords or RTSP links in this dashboard.</p><button type="button" onClick={() => setSelectedCamera(null)}>Close</button></div>}
    </>}
  </section>;
}
