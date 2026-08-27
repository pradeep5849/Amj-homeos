import {ReactNode} from "react";
import {MarketingHeader} from "./marketing-header";
import {FloatingWhatsApp,PublicFooter} from "./public-footer";
export function PublicShell({children}:{children:ReactNode}){return <main className="marketing-site public-page" id="top"><MarketingHeader/>{children}<FloatingWhatsApp/><PublicFooter/></main>}
export const PLAN_HOME_URL="https://wa.me/919611278818?text=Hi%20AMJ%20Automation%2C%20I%20would%20like%20to%20plan%20smart%20home%20automation%20for%20my%20property.";
export const CONSULT_URL="https://wa.me/919611278818?text=Hi%20AMJ%20Automation%2C%20I%20would%20like%20to%20book%20a%20consultation%20for%20home%20automation.";
