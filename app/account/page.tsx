import { redirect } from "next/navigation";
import Link from "next/link";
import { currentUser } from "@/lib/session";
import { Brand } from "@/app/components/brand";
import { AccountPanel } from "./account-panel";

export default async function AccountPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  const backHref = user.role === "SUPER_ADMIN" ? "/admin" : user.role === "ADMIN" ? "/operator" : "/dashboard";
  return (
    <main className="account-page-shell">
      <div className="account-page-topbar"><Brand href={backHref}/><Link className="secondary" href={backHref}>Back to dashboard</Link></div>
      <AccountPanel user={{ name: user.name, email: user.email, role: user.role }} />
    </main>
  );
}
