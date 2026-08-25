import {expireInvitations} from "./lib/home-sharing"; expireInvitations().then(count=>console.log(`Expired ${count} invitation(s)`)).catch(error=>{console.error(error);process.exitCode=1});
