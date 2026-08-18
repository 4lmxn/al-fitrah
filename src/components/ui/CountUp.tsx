"use client";
import { useEffect, useRef, useState } from "react";
import { animate, useInView, useReducedMotion } from "framer-motion";

/**
 * Counts from zero to `to` the first time it scrolls into view.
 *
 * Renders the final number on the server, so with JS off or before hydration
 * the stat is correct rather than a stray "0". The drop to zero happens on the
 * animation's first frame once the element is in view, never during render.
 */
export function CountUp({ to, className }: { to: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const reduce = useReducedMotion();
  const [n, setN] = useState(to);

  useEffect(() => {
    if (reduce || !inView) return;
    const controls = animate(0, to, {
      duration: 1.4,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setN(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, reduce, to]);

  return <span ref={ref} className={className}>{n}</span>;
}
