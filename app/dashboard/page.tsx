import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { DashboardShell } from "./dashboard-shell";

export default async function Dashboard() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  if (user.role === "SUPER_ADMIN") redirect("/admin");
  if (user.role === "ADMIN") redirect("/operator");
  return <DashboardShell user={{ name: user.name, role: user.role, assignedAdmin: user.homeOwnerProfile?.assignedAdmin.user.name }} />;
}
