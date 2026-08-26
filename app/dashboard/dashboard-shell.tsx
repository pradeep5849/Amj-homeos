"use client";

import { useState } from "react";
import Link from "next/link";
import { Brand } from "@/app/components/brand";
import { AccountMenu } from "@/app/components/account-menu";
import { HomeManagement } from "./home-management";
import { MyInvitations } from "./sharing-panel";
import { SignOutButton } from "./sign-out-button";

export type Destination = "home" | "rooms" | "devices" | "automations" | "more" | "scenes" | "energy" | "presence" | "notifications" | "family";
const primary: { id: Destination; label: string; icon: string }[] = [
  { id: "home", label: "Home", icon: "⌂" },
  { id: "rooms", label: "Rooms", icon: "▦" },
  { id: "devices", label: "Devices", icon: "◉" },
  { id: "automations", label: "Automations", icon: "↻" },
  { id: "more", label: "More", icon: "•••" },
];
const secondary: { id: Destination; label: string; icon: string }[] = [
  { id: "family", label: "Family", icon: "♙" },
  { id: "scenes", label: "Scenes", icon: "✦" },
  { id: "energy", label: "Energy", icon: "ϟ" },
  { id: "notifications", label: "Notifications", icon: "◌" },
  { id: "presence", label: "Presence", icon: "●" },
];
const all = [...primary, ...secondary];

export function DashboardShell({ user }: { user: { name: string; role: string; assignedAdmin?: string } }) {
  const [active, setActive] = useState<Destination>("home");
  const title = all.find(item => item.id === active)?.label ?? "Home";
  return <div className="app-shell">
    <aside className="sidebar"><Brand /><nav aria-label="Product navigation">{primary.concat(secondary).map(item => <button key={item.id} className={active === item.id ? "nav-item active" : "nav-item"} aria-current={active === item.id ? "page" : undefined} onClick={() => setActive(item.id)}><span aria-hidden="true">{item.icon}</span>{item.label}</button>)}</nav><div className="sidebar-account"><span className="avatar" aria-hidden="true">{user.name.slice(0, 1).toUpperCase()}</span><span><strong>{user.name}</strong><small>{user.role.replaceAll("_", " ")}</small><Link href="/account">Profile</Link></span><SignOutButton /></div></aside>
    <header className="mobile-header"><Brand /><AccountMenu name={user.name} role={user.role.replaceAll("_", " ")} /></header>
    <main className="workspace" id="main-content">
      <header className="page-header"><div><p className="eyebrow">AMJ HomeOS</p><h1>{title}</h1></div><div className="user-summary"><strong>{user.name}</strong><span>{user.role.replaceAll("_", " ")}</span>{user.assignedAdmin && <span>AMJ administrator: {user.assignedAdmin}</span>}</div></header>
      {active === "more" ? <section className="content-section"><div className="section-heading"><div><p className="eyebrow">Home settings</p><h2>More</h2></div></div><div className="room-grid">{secondary.map(item => <button key={item.id} className="room-card" onClick={() => setActive(item.id)}><span aria-hidden="true">{item.icon}</span><strong>{item.label}</strong></button>)}<Link className="room-card" href="/account"><strong>Profile & password</strong></Link><article className="room-card"><strong>Help & About</strong><span>AMJ HomeOS</span></article></div></section> : active === "family" ? <><MyInvitations /><HomeManagement role={user.role} active={active} /></> : <HomeManagement role={user.role} active={active} />}
    </main>
    <nav className="mobile-nav" aria-label="Mobile product navigation">{primary.map(item => <button key={item.id} className={(active === item.id || (item.id === "more" && secondary.some(s => s.id === active))) ? "active" : ""} aria-current={active === item.id ? "page" : undefined} onClick={() => setActive(item.id)}><span aria-hidden="true">{item.icon}</span><small>{item.label}</small></button>)}</nav>
  </div>;
}
