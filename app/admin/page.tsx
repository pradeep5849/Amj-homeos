import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { SuperAdminDashboard } from "./super-admin-dashboard";

export default async function AdminPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  if (user.role !== "SUPER_ADMIN") redirect("/dashboard");
  return <><Link className="catalog-shortcut" href="/admin/switchboards">Switchboard Catalog</Link><SuperAdminDashboard user={{ name: user.name, role: user.role }} /></>;
}
