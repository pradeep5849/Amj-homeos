"use client";
import { useRouter } from "next/navigation";
export function SignOutButton() { const router = useRouter(); return <button onClick={async () => { await fetch("/api/v1/auth/sign-out", { method: "POST" }); router.push("/sign-in"); router.refresh(); }}>Sign out</button>; }
