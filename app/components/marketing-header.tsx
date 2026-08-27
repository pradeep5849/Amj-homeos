"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type MenuName = "solutions" | "products" | "partners" | null;

export function MarketingHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSubmenu, setMobileSubmenu] = useState<MenuName>(null);
  const [desktopMenu, setDesktopMenu] = useState<MenuName>(null);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const closeOnOutside = (event: MouseEvent | TouchEvent) => {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setMobileOpen(false);
        setMobileSubmenu(null);
        setDesktopMenu(null);
      }
    };
    document.addEventListener("mousedown", closeOnOutside);
    document.addEventListener("touchstart", closeOnOutside, { passive: true });
    return () => {
      document.removeEventListener("mousedown", closeOnOutside);
      document.removeEventListener("touchstart", closeOnOutside);
    };
  }, []);

  const closeMobile = () => {
    setMobileOpen(false);
    setMobileSubmenu(null);
  };

  const toggleMobileSubmenu = (name: Exclude<MenuName, null>) => {
    setMobileSubmenu((current) => (current === name ? null : name));
  };

  return (
    <header className="marketing-nav" ref={headerRef} onMouseLeave={() => setDesktopMenu(null)}>
      <a className="marketing-brand" href="#top" aria-label="AMJ HomeOS home" onClick={closeMobile}>
        <img src="/amj-homeos-logo.svg" alt="AMJ HomeOS" />
      </a>

      <nav className="desktop-nav" aria-label="Main navigation">
        <a className="active" href="#top">Home</a>
        <div className="desktop-dropdown" onMouseEnter={() => setDesktopMenu("solutions")}>
          <button type="button" onClick={() => setDesktopMenu(desktopMenu === "solutions" ? null : "solutions")}>Solutions⌄</button>
          {desktopMenu === "solutions" && <div className="desktop-dropdown-panel"><a href="#solutions">Smart Home Solutions</a><a href="#solutions">Lighting & Switchboards</a><a href="#solutions">Curtains & Sensors</a></div>}
        </div>
        <div className="desktop-dropdown" onMouseEnter={() => setDesktopMenu("products")}>
          <button type="button" onClick={() => setDesktopMenu(desktopMenu === "products" ? null : "products")}>Products⌄</button>
          {desktopMenu === "products" && <div className="desktop-dropdown-panel"><a href="#solutions">Switchboards</a><a href="#solutions">Gateways</a><a href="#solutions">Sensors & Controllers</a></div>}
        </div>
        <a href="#ruvexa">Ruvexa</a>
        <div className="desktop-dropdown" onMouseEnter={() => setDesktopMenu("partners")}>
          <button type="button" onClick={() => setDesktopMenu(desktopMenu === "partners" ? null : "partners")}>Partners⌄</button>
          {desktopMenu === "partners" && <div className="desktop-dropdown-panel"><a href="/partners/franchise">Franchise</a><a href="/partners/oem">OEM / White Label</a><a href="mailto:amjautomation@gmail.com">Partner Support</a></div>}
        </div>
        <a href="/projects">Projects</a><a href="#about">About</a><a href="#contact">Contact</a>
      </nav>

      <Link className="marketing-login" href="/sign-in">Login / Open Ruvexa</Link>

      <button
        className="mobile-menu-toggle"
        type="button"
        aria-label={mobileOpen ? "Close menu" : "Open menu"}
        aria-expanded={mobileOpen}
        onClick={() => { setMobileOpen((open) => !open); setMobileSubmenu(null); }}
      >{mobileOpen ? "×" : "☰"}</button>

      {mobileOpen && <div className="mobile-menu-panel" role="dialog" aria-label="Mobile navigation">
        <a href="#top" onClick={closeMobile}>Home</a>
        <button className="mobile-parent" type="button" onClick={() => toggleMobileSubmenu("solutions")}>Solutions <span>{mobileSubmenu === "solutions" ? "−" : "+"}</span></button>
        {mobileSubmenu === "solutions" && <div className="mobile-submenu"><a href="#solutions" onClick={closeMobile}>Smart Home Solutions</a><a href="#solutions" onClick={closeMobile}>Lighting & Switchboards</a><a href="#solutions" onClick={closeMobile}>Curtains & Sensors</a></div>}
        <button className="mobile-parent" type="button" onClick={() => toggleMobileSubmenu("products")}>Products <span>{mobileSubmenu === "products" ? "−" : "+"}</span></button>
        {mobileSubmenu === "products" && <div className="mobile-submenu"><a href="#solutions" onClick={closeMobile}>Switchboards</a><a href="#solutions" onClick={closeMobile}>Gateways</a><a href="#solutions" onClick={closeMobile}>Sensors & Controllers</a></div>}
        <a href="#ruvexa" onClick={closeMobile}>Ruvexa</a>
        <button className="mobile-parent" type="button" onClick={() => toggleMobileSubmenu("partners")}>Partners <span>{mobileSubmenu === "partners" ? "−" : "+"}</span></button>
        {mobileSubmenu === "partners" && <div className="mobile-submenu"><a href="/partners/franchise" onClick={closeMobile}>Franchise</a><a href="/partners/oem" onClick={closeMobile}>OEM / White Label</a><a href="mailto:amjautomation@gmail.com" onClick={closeMobile}>Partner Support</a></div>}
        <a href="/projects" onClick={closeMobile}>Projects</a><a href="#about" onClick={closeMobile}>About</a><a href="#contact" onClick={closeMobile}>Contact</a>
        <Link className="mobile-login" href="/sign-in" onClick={closeMobile}>Login / Open Ruvexa</Link>
      </div>}
    </header>
  );
}
