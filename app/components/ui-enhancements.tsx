"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

export function UiEnhancements() {
  const pathname = usePathname();
  const router = useRouter();
  const [accountOpen, setAccountOpen] = useState(false);

  useEffect(() => {
    function enhance(root: ParentNode) {
      root.querySelectorAll<HTMLInputElement>('input[type="password"]:not([data-password-enhanced])').forEach((input) => {
        if (input.closest(".password-field")) return;
        input.dataset.passwordEnhanced = "true";
        const wrapper = document.createElement("span");
        wrapper.className = "password-field password-field-enhanced";
        input.parentNode?.insertBefore(wrapper, input);
        wrapper.appendChild(input);
        const toggle = document.createElement("button");
        toggle.type = "button";
        toggle.className = "password-toggle";
        toggle.setAttribute("aria-label", "Show password");
        toggle.innerHTML = '<span aria-hidden="true">◌</span>';
        toggle.addEventListener("click", () => {
          const show = input.type === "password";
          input.type = show ? "text" : "password";
          toggle.setAttribute("aria-label", show ? "Hide password" : "Show password");
          toggle.setAttribute("aria-pressed", String(show));
          toggle.innerHTML = `<span aria-hidden="true">${show ? "◉" : "◌"}</span>`;
        });
        wrapper.appendChild(toggle);
      });
    }
    enhance(document);
    const observer = new MutationObserver(() => enhance(document));
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [pathname]);

  const adminRoute = pathname.startsWith("/admin") || pathname.startsWith("/operator");
  if (!adminRoute) return null;

  async function signOut() {
    await fetch("/api/v1/auth/sign-out", { method: "POST" });
    router.push("/sign-in");
    router.refresh();
  }

  return (
    <div className="mobile-account-overlay">
      <button className="mobile-account-trigger" type="button" aria-label="Open account menu" aria-expanded={accountOpen} onClick={() => setAccountOpen((value) => !value)} />
      {accountOpen && (
        <div className="mobile-account-popover" role="menu">
          <strong>Account</strong>
          <button type="button" onClick={signOut}>Sign out</button>
        </div>
      )}
    </div>
  );
}
