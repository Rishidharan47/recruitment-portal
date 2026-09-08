"use client";

import { useEffect, useRef } from "react";

/**
 * A soft radial glow that eases toward the cursor. Same technique as the
 * ambient background on the Ergent dashboard: track the raw pointer position
 * in a ref (no re-renders), lerp toward it every animation frame, and write
 * the result straight to CSS custom properties the gradient reads from -
 * state never touches React, so this can run at 60fps for free.
 *
 * Wrap it around whatever section should feel alive; it fills that section
 * and sits behind `children` via z-index, not the page.
 */
export function CursorGlow({ children, className = "" }) {
  const stageRef = useRef(null);
  const glowRef = useRef(null);
  const rafRef = useRef(0);

  useEffect(() => {
    // A user who has asked for reduced motion gets the static gradient this
    // component starts with and nothing that tracks their pointer.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const stage = stageRef.current;
    const glow = glowRef.current;
    if (!stage || !glow) return;

    const rect = () => stage.getBoundingClientRect();
    let target = { x: rect().width * 0.5, y: rect().height * 0.35 };
    let current = { ...target };

    const onPointerMove = (e) => {
      const box = rect();
      target = { x: e.clientX - box.left, y: e.clientY - box.top };
    };

    stage.addEventListener("pointermove", onPointerMove);

    const animate = () => {
      // Same 0.08 ease as Ergent's version - fast enough to feel responsive,
      // slow enough not to look like it's snapping to the cursor.
      current.x += (target.x - current.x) * 0.08;
      current.y += (target.y - current.y) * 0.08;
      glow.style.setProperty("--x", `${current.x}px`);
      glow.style.setProperty("--y", `${current.y}px`);
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      stage.removeEventListener("pointermove", onPointerMove);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div ref={stageRef} className={`relative ${className}`}>
      <div
        ref={glowRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(480px circle at var(--x, 50%) var(--y, 35%), rgba(138,180,248,0.16), rgba(110,231,160,0.08) 45%, transparent 70%)",
        }}
      />
      <div className="relative z-[1]">{children}</div>
    </div>
  );
}
