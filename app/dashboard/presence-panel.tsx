"use client";
import { useEffect, useState } from "react";

type Member = { userId: string; name: string; status: "HOME" | "AWAY" | "UNKNOWN"; source: string; lastChangedAt: string | null };

export function PresencePanel({ homeId, canManage }: { homeId: string; canManage: boolean }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [aggregate, setAggregate] = useState("UNKNOWN");
  const [message, setMessage] = useState("");
  async function load() { const response = await fetch(`/api/v1/homes/${homeId}/presence`); if (response.ok) { const body = await response.json(); setMembers(body.members); setAggregate(body.aggregate); } }
  useEffect(() => { let active = true; void fetch(`/api/v1/homes/${homeId}/presence`).then(async response => { if (active && response.ok) { const body = await response.json(); setMembers(body.members); setAggregate(body.aggregate); } }); return () => { active = false; }; }, [homeId]);
  async function manual(status: Member["status"]) { const response = await fetch(`/api/v1/homes/${homeId}/presence/manual`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ status }) }); setMessage(response.ok ? "Presence updated" : (await response.json()).error); await load(); }
  return <section><div className="presence-summary"><span className={`status-badge ${aggregate === "ANYONE_HOME" ? "online" : "unknown"}`}>{aggregate === "ANYONE_HOME" ? "Someone is HOME" : aggregate === "EVERYONE_AWAY" ? "Everyone is AWAY" : "Household status UNKNOWN"}</span><p className="muted">Only privacy-minimized household states are displayed. Exact coordinates and location history are never shown here.</p></div>{members.length === 0 ? <div className="empty-state compact"><p>No household presence is available.</p></div> : <div className="room-grid">{members.map(member => <article className="room-card" key={member.userId}><h3>{member.name}</h3><span className={`status-badge ${member.status === "HOME" ? "online" : "unknown"}`}>{member.status}</span><p className="muted">{member.lastChangedAt ? `Changed ${new Date(member.lastChangedAt).toLocaleString()}` : "Last change unavailable"}</p></article>)}</div>}<div className="home-list" aria-label="Set my presence"><button onClick={() => void manual("HOME")}>I&apos;m Home</button><button className="secondary" onClick={() => void manual("AWAY")}>I&apos;m Away</button><button className="secondary" onClick={() => void manual("UNKNOWN")}>Set Unknown</button></div>{canManage && <p className="muted">Geofence management remains owner/administrator authorized. Precise coordinates are intentionally excluded from the customer dashboard.</p>}{message && <p role="status">{message}</p>}</section>;
}
