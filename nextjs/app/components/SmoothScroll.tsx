"use client";

import { ReactLenis } from "lenis/react";
import { MotionConfig } from "framer-motion";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import InteractiveBackground from "./InteractiveBackground";

export default function SmoothScroll({
  children,
}: {
  children: React.ReactNode;
}) {
  // Start false so SSR + first client render agree, then correct on mount.
  const [reduced, setReduced] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // The ASCII home page draws its own backdrop and wants continuous scroll (no snapping),
  // so its transforms track the wheel exactly.
  if (pathname === "/") {
    return (
      <MotionConfig reducedMotion="user">
        <ReactLenis
          root
          options={{
            lerp: reduced ? 1 : 0.1,
            smoothWheel: !reduced,
            anchors: reduced ? { offset: 0, immediate: true } : { offset: 0 },
          }}
        >
          {children}
        </ReactLenis>
      </MotionConfig>
    );
  }

  return (
    // reducedMotion="user" disables transform/layout animations (keeps opacity)
    // for users who prefer reduced motion — and lets us render motion elements
    // unconditionally, avoiding SSR/hydration branches.
    <MotionConfig reducedMotion="user">
      <InteractiveBackground variant="grid" className="fixed inset-0 -z-10" />
      <ReactLenis
        root
        options={{
          lerp: reduced ? 1 : 0.1,
          duration: reduced ? 0 : 1.2,
          smoothWheel: !reduced,
          // Smoothly handle in-page anchors, offset for the fixed nav.
          // Jump instantly when reduced motion is preferred.
          anchors: reduced ? { offset: -80, immediate: true } : { offset: -80 },
        }}
      >
        {children}
      </ReactLenis>
      <div className="grain" aria-hidden="true" />
    </MotionConfig>
  );
}
