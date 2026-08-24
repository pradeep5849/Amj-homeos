import Link from "next/link";
import { AuthForm } from "../auth-form";
export default function SignIn() { return <main><section className="card"><h1>Sign in</h1><AuthForm mode="sign-in" /><p className="muted">New to AMJ HomeOS? <Link href="/register">Register</Link></p></section></main>; }
