import Link from "next/link";

/** Temporary wordmark. Replace this component with the approved square AMJ SVG when supplied. */
export function Brand({ linked = true }: { linked?: boolean }) {
  const lockup = <span className="brand-lockup" aria-label="AMJ HomeOS"><span className="brand-mark" aria-hidden="true">AMJ</span><span><strong>AMJ</strong><small>HomeOS</small></span></span>;
  return linked ? <Link className="brand-link" href="/dashboard">{lockup}</Link> : lockup;
}
