"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function AuthForm({ mode }: { mode: "sign-in" | "register" }) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    const form = new FormData(event.currentTarget);
    const body = Object.fromEntries(form.entries());
    const response = await fetch(`/api/v1/auth/${mode}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    if (!response.ok) { const data = await response.json().catch(() => ({})); setError(data.error ?? "Request failed"); return; }
    router.push("/dashboard"); router.refresh();
  }
  return <form onSubmit={submit}>
    {mode === "register" && <label>Name<input name="name" autoComplete="name" required minLength={2} /></label>}
    <label>Email<input name="email" type="email" autoComplete="email" required /></label>
    <label>Password<input name="password" type="password" autoComplete={mode === "register" ? "new-password" : "current-password"} required minLength={12} /></label>
    {error && <p className="error" role="alert">{error}</p>}
    <button type="submit">{mode === "register" ? "Register" : "Sign in"}</button>
  </form>;
}
