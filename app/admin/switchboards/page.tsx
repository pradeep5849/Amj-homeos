import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { Brand } from "@/app/components/brand";
import { SwitchboardCatalogPanel } from "../switchboard-catalog-panel";

export default async function SwitchboardCatalogPage(){
 const user=await currentUser();if(!user)redirect("/sign-in");if(user.role!=="SUPER_ADMIN")redirect("/dashboard");
 return <div className="app-shell"><header className="mobile-header"><Brand href="/admin"/><Link className="button secondary" href="/admin">Back</Link></header><main className="workspace" style={{marginLeft:0,maxWidth:1200,margin:"0 auto"}}><div className="page-header"><div><p className="eyebrow">AMJ HomeOS · Super Admin</p><h1>Switchboard Catalog</h1></div><Link className="button secondary" href="/admin">Back to Platform Console</Link></div><SwitchboardCatalogPanel/></main></div>
}
