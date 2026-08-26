"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function UiEnhancements() {
  const pathname = usePathname();

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
        toggle.setAttribute("title", "Show password");
        toggle.innerHTML = '<span aria-hidden="true">👁</span>';
        toggle.addEventListener("click", () => {
          const show = input.type === "password";
          input.type = show ? "text" : "password";
          toggle.setAttribute("aria-label", show ? "Hide password" : "Show password");
          toggle.setAttribute("title", show ? "Hide password" : "Show password");
          toggle.setAttribute("aria-pressed", String(show));
          toggle.innerHTML = `<span aria-hidden="true">${show ? "🙈" : "👁"}</span>`;
        });
        wrapper.appendChild(toggle);
      });
    }
    enhance(document);
    const observer = new MutationObserver(() => enhance(document));
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [pathname]);

  return null;
}
