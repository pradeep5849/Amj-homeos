import Link from "next/link";
import { AuthForm } from "../auth-form";
export default function Register() { return <main><section className="card"><h1>Home owner registration</h1><p className="muted">Your account is securely assigned to the default AMJ administrator.</p><AuthForm mode="register" /><p><Link href="/sign-in">Already registered?</Link></p></section></main>; }
