import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "AMJ Automation",
  description: "Smart home automation, Ruvexa, franchise opportunities and OEM white-label solutions from AMJ Automation.",
};

const solutions = [
  ["◉", "Smart Lighting"], ["▦", "Smart Switchboards"], ["✣", "Fan Control"], ["▤", "Curtains & Motors"],
  ["◌", "Sensors"], ["⌂", "Security"], ["▶", "Scenes & Automations"], ["↗", "Energy Management"],
];

const scenes = [
  ["☀", "Good Morning", "Lights on softly. Curtains open. The perfect start."],
  ["↗", "Leaving Home", "Lights off. Appliances off. Home stays secure."],
  ["▶", "Movie Time", "Lights dim. Curtains close. Enjoy the moment."],
  ["⌂", "Welcome Home", "Lights on. Ambience set. Comfort, instantly."],
  ["☾", "Good Night", "Everything off. Home secured. Sleep peacefully."],
];

export default function Home() {
  return <main className="marketing-site">
    <header className="marketing-nav">
      <a className="marketing-brand" href="#top" aria-label="AMJ HomeOS home"><img src="/amj-homeos-logo.svg" alt="AMJ HomeOS"/></a>
      <nav aria-label="Main navigation">
        <a href="#solutions">Solutions</a><a href="#ruvexa">Ruvexa</a><a href="#partners">Partners</a><a href="#about">About</a><a href="#contact">Contact</a>
      </nav>
      <Link className="marketing-login" href="/sign-in">Login / Open Ruvexa</Link>
    </header>

    <section className="marketing-hero" id="top">
      <div className="hero-copy">
        <span className="hero-kicker">AMJ Automation</span>
        <h1>Your Home.<br/><em>Intelligent by Design.</em></h1>
        <p>Experience comfort, safety and convenience with smarter automation for every lifestyle.</p>
        <div className="hero-pills"><span>Lighting</span><span>Fans</span><span>Curtains</span><span>Security</span><span>Sensors</span></div>
        <div className="hero-actions"><a className="gold-button" href="#solutions">Explore Solutions</a><a className="outline-button" href="#contact">Book a Consultation</a></div>
      </div>
      <div className="hero-showcase" aria-label="Ruvexa smart home experience">
        <div className="hero-switchboard"><span/><span/><span/><span/></div>
        <strong>RUVEXA</strong>
        <h2>Where Smart Living<br/>Meets Your <em>Aura</em></h2>
        <p>Ruvexa — Powered by <b>AMJ HomeOS</b></p>
      </div>
    </section>

    <section className="trust-strip">
      <div><b>⌁</b><span><strong>One Unified System</strong><small>All your devices, one smart experience</small></span></div>
      <div><b>▣</b><span><strong>Control Anywhere</strong><small>From anywhere in the world</small></span></div>
      <div><b>✥</b><span><strong>Scenes & Automations</strong><small>Set it once. Enjoy every day.</small></span></div>
      <div><b>♢</b><span><strong>Safe & Secure</strong><small>Enterprise-grade account security</small></span></div>
      <div><b>☏</b><span><strong>Reliable Support</strong><small>Expert support when you need it</small></span></div>
    </section>

    <section className="marketing-section light" id="solutions">
      <div className="marketing-heading"><span>SMART HOME SOLUTIONS</span><p>Everything works better when it works together.</p></div>
      <div className="solution-grid">{solutions.map(([icon,name])=><article key={name}><b>{icon}</b><span>{name}</span></article>)}</div>
    </section>

    <section className="india-ruvexa" id="ruvexa">
      <article className="india-card">
        <span className="section-label">DESIGNED FOR</span><h2>INDIAN HOMES</h2>
        <ul><li>New construction or retrofit</li><li>Works with existing wiring where supported</li><li>Wi‑Fi, Zigbee, Tuya & more</li><li>Scalable and future-ready</li><li>Designed for Indian living conditions</li></ul>
        <a className="navy-button" href="#contact">Learn More</a>
      </article>
      <div className="home-visual" aria-hidden="true"><div className="house"><span/><span/><span/><span/></div></div>
      <article className="ruvexa-card">
        <span className="section-label">RUVEXA</span><h2>Where Smart Living Meets Your <em>Aura</em></h2>
        <p>Your entire home, in your hand.</p>
        <ul><li>Control rooms & devices</li><li>Scenes & automations</li><li>Schedules & timers</li><li>Real-time status</li><li>Secure remote access</li></ul>
        <Link className="gold-button" href="/sign-in">Explore Ruvexa</Link>
        <small>Ruvexa — Powered by AMJ HomeOS</small>
      </article>
    </section>

    <section className="marketing-section light scenes-section">
      <div className="marketing-heading"><span>LIVE SMARTER EVERY DAY</span></div>
      <div className="scene-grid">{scenes.map(([icon,name,text])=><article key={name}><b>{icon}</b><strong>{name}</strong><p>{text}</p></article>)}</div>
    </section>

    <section className="partner-section" id="partners">
      <div className="marketing-heading inverse"><span>PARTNER WITH AMJ AUTOMATION</span><p>Build a business, launch a brand, or scale your automation offering with AMJ.</p></div>
      <div className="partner-grid">
        <article><span className="partner-icon">◎</span><h2>Franchise Partner Program</h2><p>Build a successful automation business with AMJ.</p><ul><li>Territory opportunity</li><li>Training and certification</li><li>Marketing & sales support</li><li>Demo setup guidance</li><li>Installation & technical support</li><li>Growth-focused partner model</li></ul><a className="gold-button" href="#contact">Become a Franchise Partner</a></article>
        <article><span className="partner-icon">⚙</span><h2>OEM & White Label Partner Program</h2><p>Build your brand. We power your success.</p><ul><li>AMJ HomeOS as your automation platform</li><li>White-label mobile app option</li><li>Custom branding & UI</li><li>Product catalogue & device integration</li><li>Partner / installer dashboard</li><li>End-to-end platform support</li></ul><a className="gold-button" href="#contact">Explore OEM / White Label</a></article>
      </div>
    </section>

    <section className="marketing-section story-section" id="about">
      <article><span className="section-label">REAL HOMES. REAL TRANSFORMATIONS.</span><h2>Automation designed around the way people actually live.</h2><p>AMJ Automation brings together smart controls, thoughtful installation and a unified software experience for homes, builders and partners.</p></article>
      <article id="contact"><span className="section-label">PLANNING A SMARTER SPACE?</span><h2>Let’s design the right automation for your home or business.</h2><p>Talk to AMJ Automation about a new home, retrofit, franchise opportunity or OEM partnership.</p><a className="navy-button" href="mailto:info@amjautomation.in">Contact AMJ Automation</a></article>
    </section>

    <footer className="marketing-footer">
      <div className="footer-brand"><img src="/amj-homeos-logo.svg" alt="AMJ HomeOS"/><p>Smarter homes. Better living. Powered by AMJ Automation.</p></div>
      <div><strong>Solutions</strong><a href="#solutions">Smart Lighting</a><a href="#solutions">Switchboards</a><a href="#solutions">Curtains & Motors</a><a href="#solutions">Sensors</a></div>
      <div><strong>Ruvexa</strong><a href="#ruvexa">Ruvexa App</a><Link href="/sign-in">Login</Link><a href="#ruvexa">How it Works</a></div>
      <div><strong>Partners</strong><a href="#partners">Franchise Program</a><a href="#partners">OEM / White Label</a><a href="#contact">Partner Support</a></div>
      <div><strong>Company</strong><a href="#about">About Us</a><a href="#contact">Contact</a><span>Hassan, Karnataka, India</span><a href="mailto:info@amjautomation.in">info@amjautomation.in</a></div>
      <div className="footer-bottom"><span>© {new Date().getFullYear()} AMJ Automation. All rights reserved.</span><span>Ruvexa — Powered by AMJ HomeOS</span></div>
    </footer>
  </main>;
}
