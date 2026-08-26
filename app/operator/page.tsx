import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { AdminDashboard } from "./admin-dashboard";

export default async function OperatorPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  if (user.role === "SUPER_ADMIN") redirect("/admin");
  if (user.role !== "ADMIN") redirect("/dashboard");
  return <AdminDashboard user={{ name: user.name }} />;
}
