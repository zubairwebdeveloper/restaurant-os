"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ArrowDown } from "lucide-react";
import { siteConfig } from "@/config/site";
import { Button } from "@/components/ui/button";
import { HeroSceneLoader } from "@/components/three/hero-scene-loader";

const lines = ["Where nature", "meets exceptional", "dining."];

export function Hero() {
  const reduce = useReducedMotion();
  const ease = [0.22, 1, 0.36, 1];

  return (
    <section className="relative isolate flex min-h-dvh items-center overflow-hidden pb-24 pt-32">
      {/* decorative rings */}
      <div
        aria-hidden="true"
        className="absolute right-[-12rem] top-1/2 -z-10 size-[44rem] -translate-y-1/2 rounded-full border border-gold/15"
      />
      <div
        aria-hidden="true"
        className="absolute right-[-6rem] top-1/2 -z-10 size-[32rem] -translate-y-1/2 rounded-full border border-gold/20"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-20 bg-[radial-gradient(ellipse_at_75%_40%,rgba(102,116,90,0.28),transparent_60%)]"
      />

      <div className="mx-auto grid w-full max-w-7xl items-center gap-8 px-5 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:px-12">
        <div>
          <motion.p
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="mb-6 text-sm text-sand/80"
          >
            {siteConfig.location}
          </motion.p>

          <h1 className="text-[clamp(3.25rem,8.5vw,7.5rem)] leading-[0.95]">
            {lines.map((line, i) => (
              <span key={line} className="block overflow-hidden pb-[0.08em]">
                <motion.span
                  className="block"
                  initial={reduce ? false : { y: "105%" }}
                  animate={{ y: 0 }}
                  transition={{ duration: 1, delay: 0.25 + i * 0.14, ease }}
                >
                  {line}
                </motion.span>
              </span>
            ))}
          </h1>

          <motion.p
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.85, ease }}
            className="mt-8 max-w-md text-lg leading-relaxed text-ivory/70"
          >
            Charcoal grills, clay pots and quiet rooms on the edge of the lake
            at Chashma.
          </motion.p>

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1, ease }}
            className="mt-10 flex flex-wrap gap-3"
          >
            <Button size="lg">
              <Link href="/reservation">Reserve a table</Link>
            </Button>
            <Button size="lg" variant="outline">
              <Link href="/menu">Explore the menu</Link>
            </Button>
          </motion.div>
        </div>

        <motion.div
          initial={reduce ? false : { opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, delay: 0.4, ease }}
          className="relative mx-auto aspect-square w-full max-w-[34rem] lg:max-w-none"
        >
          <HeroSceneLoader />
        </motion.div>
      </div>

      <a
        href="#intro"
        aria-label="Scroll to introduction"
        className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 text-gold/80 transition-colors hover:text-gold sm:block"
      >
        <ArrowDown className="size-5 animate-bounce" />
      </a>
    </section>
  );
}
