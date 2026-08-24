import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { SignOutButton } from "./sign-out-button";

export default async function Dashboard() {
  const user = await currentUser(); if (!user) redirect("/sign-in");
  return <main><section className="card"><h1>AMJ HomeOS</h1><h2>Welcome, {user.name}</h2><p><strong>Role:</strong> {user.role.replaceAll("_", " ")}</p>{user.homeOwnerProfile && <p><strong>Assigned Admin:</strong> {user.homeOwnerProfile.assignedAdmin.user.name}</p>}<p className="muted">Stage 1 account and administration foundation</p><SignOutButton /></section></main>;
}
