"use client";

import { useEffect, useRef, useState } from "react";
import { SignOutButton } from "@/app/dashboard/sign-out-button";

export function AccountMenu({ name, role }: { name: string; role: string }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function close(event: PointerEvent) {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  return (
    <div className="account-menu" ref={root}>
      <button className="avatar account-menu-trigger" type="button" aria-label="Open account menu" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        {name.slice(0, 1).toUpperCase()}
      </button>
      {open && (
        <div className="account-menu-popover" role="menu">
          <div className="account-menu-identity"><strong>{name}</strong><small>{role}</small></div>
          <SignOutButton />
        </div>
      )}
    </div>
  );
}
