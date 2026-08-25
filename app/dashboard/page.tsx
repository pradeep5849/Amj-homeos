import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { HomeManagement } from "./home-management";
import { SignOutButton } from "./sign-out-button";
import { MyInvitations } from "./sharing-panel";
export default async function Dashboard() { const user = await currentUser(); if (!user) redirect("/sign-in"); return <main><section className="card"><h1>AMJ HomeOS</h1><h2>Welcome, {user.name}</h2><p><strong>Role:</strong> {user.role.replaceAll("_", " ")}</p>{user.homeOwnerProfile && <p><strong>Assigned Admin:</strong> {user.homeOwnerProfile.assignedAdmin.user.name}</p>}<SignOutButton /></section><MyInvitations /><HomeManagement role={user.role} /></main>; }
