"use client";

import { useEffect,useState } from "react";
import Link from "next/link";
import { Brand } from "@/app/components/brand";
import { AccountMenu } from "@/app/components/account-menu";
import { HomeManagement } from "./home-management";
import { CameraDashboard } from "./camera-dashboard";
import { MyInvitations } from "./sharing-panel";
import { SignOutButton } from "./sign-out-button";

export type Destination = "home" | "rooms" | "devices" | "automations" | "more" | "scenes" | "energy" | "presence" | "notifications" | "family" | "cctv";
type ThemeChoice="system"|"light"|"dark";
const primary: { id: Destination; label: string; icon: string }[] = [
  { id: "home", label: "Home", icon: "⌂" },{ id: "rooms", label: "Rooms", icon: "▦" },{ id: "devices", label: "Devices", icon: "◉" },{ id: "automations", label: "Automations", icon: "↻" },{ id: "more", label: "More", icon: "•••" },
];
const secondary: { id: Destination; label: string; icon: string }[] = [
  { id: "cctv", label: "CCTV", icon: "▣" },{ id: "family", label: "Family", icon: "♙" },{ id: "scenes", label: "Scenes", icon: "✦" },{ id: "energy", label: "Energy", icon: "ϟ" },{ id: "notifications", label: "Notifications", icon: "◌" },{ id: "presence", label: "Presence", icon: "●" },
];
const all=[...primary,...secondary];
const descriptions:Partial<Record<Destination,string>>={presence:"See who is currently home and manage presence settings."};

export function DashboardShell({ user }: { user: { name: string; role: string; assignedAdmin?: string } }) {
  const [active,setActiveState]=useState<Destination>("home");
  const [theme,setTheme]=useState<ThemeChoice>("system");
  useEffect(()=>{const saved=(localStorage.getItem("ruvexa:theme") as ThemeChoice|null)??"system";setTheme(saved)},[]);
  useEffect(()=>{const root=document.documentElement;const apply=()=>{const resolved=theme==="system"?(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):theme;root.dataset.ruvexaTheme=resolved};apply();localStorage.setItem("ruvexa:theme",theme);const mq=matchMedia("(prefers-color-scheme: dark)");if(theme==="system")mq.addEventListener("change",apply);return()=>mq.removeEventListener("change",apply)},[theme]);
  useEffect(()=>{history.replaceState({ruvexa:"home"},"");const onPop=(e:PopStateEvent)=>{const next=e.state?.ruvexa as Destination|undefined;if(next)setActiveState(next);else setActiveState("home")};addEventListener("popstate",onPop);return()=>removeEventListener("popstate",onPop)},[]);
  const navigate=(next:Destination)=>{if(next===active)return;setActiveState(next);history.pushState({ruvexa:next},"")};
  const title=all.find(item=>item.id===active)?.label??"Home";const isSecondary=secondary.some(item=>item.id===active);
  return <div className="app-shell">
    <aside className="sidebar"><Brand/><nav aria-label="Product navigation">{primary.concat(secondary).map(item=><button key={item.id} className={active===item.id?"nav-item active":"nav-item"} aria-current={active===item.id?"page":undefined} onClick={()=>navigate(item.id)}><span aria-hidden="true">{item.icon}</span>{item.label}</button>)}</nav><div className="sidebar-account"><span className="avatar" aria-hidden="true">{user.name.slice(0,1).toUpperCase()}</span><span><strong>{user.name}</strong><small>{user.role.replaceAll("_"," ")}</small><Link href="/account">Profile</Link></span><SignOutButton/></div></aside>
    <header className="mobile-header"><Brand/><AccountMenu name={user.name} role={user.role.replaceAll("_"," ")}/></header>
    <main className="workspace" id="main-content">
      {isSecondary&&<header className="page-header compact-page-header"><div><h1>{title}</h1>{descriptions[active]&&<p className="muted">{descriptions[active]}</p>}</div><div className="user-summary"><strong>{user.name}</strong><span>{user.role.replaceAll("_"," ")}</span>{user.assignedAdmin&&<span>AMJ administrator: {user.assignedAdmin}</span>}</div></header>}
      {active==="more"?<section className="content-section"><div className="section-heading"><div><h2>More</h2></div></div><div className="room-grid">{secondary.map(item=><button key={item.id} className="room-card" onClick={()=>navigate(item.id)}><span aria-hidden="true">{item.icon}</span><strong>{item.label}</strong></button>)}<Link className="room-card" href="/account"><strong>Profile & password</strong></Link><article className="room-card"><strong>Help & About</strong><span>AMJ HomeOS</span></article></div><div className="ruvexa-theme-setting"><label htmlFor="ruvexa-theme"><span><strong>Theme</strong><small>Glass 3D appearance</small></span><select id="ruvexa-theme" value={theme} onChange={e=>setTheme(e.target.value as ThemeChoice)}><option value="system">System Default</option><option value="light">Light · Glass White 3D</option><option value="dark">Dark · Dark Glass 3D</option></select></label></div><div className="more-signout"><SignOutButton/></div></section>:active==="cctv"?<CameraDashboard role={user.role}/>:active==="family"?<><MyInvitations/><HomeManagement role={user.role} active={active}/></>:<HomeManagement role={user.role} active={active}/>} 
    </main>
    <nav className="mobile-nav" aria-label="Mobile product navigation">{primary.map(item=><button key={item.id} className={(active===item.id||(item.id==="more"&&secondary.some(s=>s.id===active)))?"active":""} aria-current={active===item.id?"page":undefined} onClick={()=>navigate(item.id)}><span aria-hidden="true">{item.icon}</span><small>{item.label}</small></button>)}</nav>
  </div>;
}
