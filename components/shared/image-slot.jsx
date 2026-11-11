"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils/cn";

const tones = [
  "from-olive/70 via-charcoal to-forest",
  "from-charcoal via-forest to-olive/50",
  "from-gold/30 via-charcoal to-forest",
  "from-forest via-olive/40 to-charcoal",
];

/**
 * Shows a real photo when the file exists in /public/images, otherwise a
 * designed placeholder. The photo fades in over the placeholder once loaded.
 */
export function ImageSlot({ src, alt, className, sizes = "100vw", priority = false, tone = 0, caption }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <div className={cn("relative overflow-hidden bg-charcoal", className)}>
      <div
        className={cn("absolute inset-0 bg-gradient-to-br", tones[tone % tones.length])}
        role={failed || !src ? "img" : undefined}
        aria-label={failed || !src ? alt : undefined}
      >
        <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full opacity-[0.18]" aria-hidden="true">
          <circle cx="50" cy="50" r="38" fill="none" stroke="#B9975B" strokeWidth="0.3" />
          <circle cx="50" cy="50" r="28" fill="none" stroke="#B9975B" strokeWidth="0.3" />
          <circle cx="50" cy="50" r="18" fill="none" stroke="#F5F0E6" strokeWidth="0.2" />
          <path d="M12 82 Q50 60 88 82" fill="none" stroke="#D8C8AC" strokeWidth="0.3" />
        </svg>
        {caption ? (
          <span className="absolute bottom-3 left-4 right-4 truncate font-heading text-sm italic text-ivory/55">{caption}</span>
        ) : null}
      </div>
      {src && !failed ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={cn("object-cover transition-opacity duration-700", loaded ? "opacity-100" : "opacity-0")}
        />
      ) : null}
    </div>
  );
}
