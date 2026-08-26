"use client";

import { useState } from "react";
import Link from "next/link";
import { Brand } from "@/app/components/brand";
import { AccountMenu } from "@/app/components/account-menu";
import { HomeManagement } from "./home-management";
import { MyInvitations } from "./sharing-panel";
import { SignOutButton } from "./sign-out-button";

export type Destination = "home" | "rooms" | "devices" | "scenes" | "automations" | "energy" | "presence" | "notifications" | "family";
const destinations: { id: Destination; label: string; icon: string }[] = [
  { id: "home", label: "Home", icon: "⌂" }, { id: "rooms", label: "Rooms", icon: "▦" },
  { id: "devices", label: "Devices", icon: "◉" }, { id: "scenes", label: "Scenes", icon: "✦" },
  { id: "automations", label: "Automations", icon: "↻" }, { id: "energy", label: "Energy", icon: "ϟ" },
  { id: "presence", label: "Presence", icon: "●" }, { id: "notifications", label: "Notifications", icon: "◌" },
  { id: "family", label: "Family", icon: "♙" },
];

export function DashboardShell({ user }: { user: { name: string; role: string; assignedAdmin?: string } }) {
  const [active, setActive] = useState<Destination>("home");
  return <div className="app-shell">
    <aside className="sidebar"><Brand /><nav aria-label="Product navigation">{destinations.map(item => <button key={item.id} className={active === item.id ? "nav-item active" : "nav-item"} aria-current={active === item.id ? "page" : undefined} onClick={() => setActive(item.id)}><span aria-hidden="true">{item.icon}</span>{item.label}</button>)}</nav><div className="sidebar-account"><span className="avatar" aria-hidden="true">{user.name.slice(0, 1).toUpperCase()}</span><span><strong>{user.name}</strong><small>{user.role.replaceAll("_", " ")}</small><Link href="/account">Profile</Link></span><SignOutButton /></div></aside>
    <header className="mobile-header"><Brand /><AccountMenu name={user.name} role={user.role.replaceAll("_", " ")} /></header>
    <main className="workspace" id="main-content">
      <header className="page-header"><div><p className="eyebrow">AMJ HomeOS</p><h1>{destinations.find(item => item.id === active)?.label}</h1></div><div className="user-summary"><strong>{user.name}</strong><span>{user.role.replaceAll("_", " ")}</span>{user.assignedAdmin && <span>AMJ administrator: {user.assignedAdmin}</span>}</div></header>
      {active === "family" ? <><MyInvitations /><HomeManagement role={user.role} active={active} /></> : <HomeManagement role={user.role} active={active} />}
    </main>
    <nav className="mobile-nav" aria-label="Mobile product navigation">{destinations.map(item => <button key={item.id} className={active === item.id ? "active" : ""} aria-current={active === item.id ? "page" : undefined} onClick={() => setActive(item.id)}><span aria-hidden="true">{item.icon}</span><small>{item.label}</small></button>)}</nav>
  </div>;
}
