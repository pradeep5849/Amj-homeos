import Link from "next/link";

export default function Home() {
  return <main><section className="card"><h1>AMJ HomeOS</h1><p>One secure place for home owners and their AMJ administrator.</p><div className="links"><Link className="button" href="/sign-in">Sign in</Link><Link className="button" href="/register">Create account</Link></div></section></main>;
}
