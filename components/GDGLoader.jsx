// React import
import React from "react";

/**
 * Full-page loading state. Announced politely so screen reader users are told
 * the page is working rather than meeting silence.
 */
const Loader = ({ label = "Loading..." }) => (
  <div
    className="flex min-h-[60vh] flex-col items-center justify-center gap-4"
    role="status"
    aria-live="polite"
  >
    <span className="h-9 w-9 animate-spin rounded-full border-2 border-white/15 border-t-white" />
    <p className="text-sm text-zinc-400">{label}</p>
  </div>
);

export default Loader;
