"use client";

import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";
import { StaticPlate } from "@/components/three/static-plate";

const HeroScene = dynamic(() => import("@/components/three/hero-scene"), {
  ssr: false,
  loading: () => <StaticPlate className="size-full" />,
});

const QUERY = "(min-width: 768px) and (prefers-reduced-motion: no-preference)";

function subscribe(cb) {
  const m = window.matchMedia(QUERY);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
}

/** Loads the 3D scene only on larger screens without reduced-motion. */
export function HeroSceneLoader() {
  const enable3d = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false
  );
  return enable3d ? <HeroScene /> : <StaticPlate className="size-full" />;
}
