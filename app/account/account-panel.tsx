"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { PasswordInput } from "@/app/components/password-input";
import { SignOutButton } from "@/app/dashboard/sign-out-button";

type Session={id:string;createdAt:string;lastUsedAt:string;expiresAt:string;current:boolean};
type EventItem={id:string;eventType:string;occurredAt:string};

export function AccountPanel({user}:{user:{name:string;email:string;role:string}}){
  const isSuperAdmin=user.role==="SUPER_ADMIN";
  const [sessions,setSessions]=useState<Session[]>([]),[events,setEvents]=useState<EventItem[]>([]),[message,setMessage]=useState("");
  const load=useCallback(async()=>{if(!isSuperAdmin)return;const[s,e]=await Promise.all([fetch('/api/v1/account/sessions'),fetch('/api/v1/account/security-events')]);if(s.ok)setSessions((await s.json()).sessions);if(e.ok)setEvents((await e.json()).events)},[isSuperAdmin]);
  useEffect(()=>{void load()},[load]);
  async function password(event:FormEvent<HTMLFormElement>){event.preventDefault();const form=event.currentTarget,data=new FormData(form);const response=await fetch('/api/v1/account/password',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(Object.fromEntries(data.entries()))});const body=await response.json().catch(()=>({}));setMessage(response.ok?'Password changed successfully. Other sessions were revoked.':body.error?.message||body.error||'Unable to change password');if(response.ok){form.reset();await load();}}
  async function revoke(id?:string){const response=await fetch(id?`/api/v1/account/sessions/${id}/revoke`:'/api/v1/account/sessions/revoke-others',{method:'POST'});const body=await response.json().catch(()=>({}));setMessage(response.ok?'Session access updated.':body.error?.message||body.error||'Unable to update sessions');await load();}
  return <div className="account-page-content">
    <header className="page-header"><div><p className="eyebrow">AMJ HomeOS · Account</p><h1>{isSuperAdmin?'Profile & Security':'Profile'}</h1><p className="muted">Manage your AMJ HomeOS profile and password.</p></div><SignOutButton/></header>
    {message&&<div className="admin-notice" role="status">{message}</div>}
    <section id="profile" className="content-section"><p className="eyebrow">Profile</p><h2>Account details</h2><div className="admin-status-grid"><div><strong>Name</strong><p>{user.name}</p></div><div><strong>Email</strong><p>{user.email}</p></div><div><strong>Role</strong><p>{user.role.replaceAll('_',' ')}</p></div></div></section>
    <section id="password" className="content-section"><p className="eyebrow">Password</p><h2>Change password</h2><form onSubmit={password}><label>Current password<PasswordInput name="currentPassword" required autoComplete="current-password"/></label><label>New password<PasswordInput name="newPassword" minLength={12} required autoComplete="new-password"/></label><label>Confirm new password<PasswordInput name="confirmPassword" minLength={12} required autoComplete="new-password"/></label><button>Change password</button></form></section>
    {isSuperAdmin&&<section id="security" className="content-section"><p className="eyebrow">Security</p><h2>Sessions</h2><button className="secondary" onClick={()=>void revoke()}>Revoke all other sessions</button><div className="admin-list">{sessions.map(s=><article className="admin-row" key={s.id}><div><strong>{s.current?'Current session':'Active session'}</strong><span>Last used {new Date(s.lastUsedAt).toLocaleString()}</span></div>{!s.current&&<button className="secondary small" onClick={()=>void revoke(s.id)}>Revoke</button>}</article>)}</div><h3>Security activity</h3><div className="admin-list">{events.slice(0,20).map(e=><article className="admin-row" key={e.id}><div><strong>{e.eventType.replaceAll('_',' ')}</strong><span>{new Date(e.occurredAt).toLocaleString()}</span></div></article>)}</div></section>}
  </div>;
}
