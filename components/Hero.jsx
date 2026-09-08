"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Users, FileText, Star } from "lucide-react";
import { Space_Grotesk } from "next/font/google";
import { Button } from "./ui/button";
import CountdownTimer from "./common/CountdownTimer";
import { CursorGlow } from "./CursorGlow";
import { SUBMISSION_DEADLINE, reviews } from "@/constants";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["500", "600", "700"] });

const STATS = [
  { icon: FileText, value: reviews.length, label: "Departments" },
  { icon: Users, value: "Up to 2", label: "Applications each" },
  { icon: Star, value: "~10 min", label: "Time to apply" },
];

export default function Hero() {
  const deadlinePassed = new Date() > new Date(SUBMISSION_DEADLINE);

  return (
    <section className="relative overflow-hidden border-b border-white/5">
      {/* No stock photography to fall back on, so the accent palette from the
          department catalogue carries the visual weight instead: a static
          wash for depth, plus a soft glow that eases toward the cursor
          (CursorGlow) the same way Ergent's ambient background does. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-32 h-96 opacity-[0.12] blur-3xl"
        style={{
          background:
            "radial-gradient(35% 55% at 15% 50%, #8AB4F8 0%, transparent 100%), radial-gradient(35% 55% at 55% 35%, #6EE7A0 0%, transparent 100%), radial-gradient(30% 50% at 85% 55%, #FFD45E 0%, transparent 100%)",
        }}
      />

      <CursorGlow className="mx-auto max-w-6xl px-4 pb-14 pt-16 sm:px-6 sm:pb-20 sm:pt-24">
        <span
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${
            deadlinePassed
              ? "border-white/10 bg-white/5 text-zinc-400"
              : "border-success/30 bg-success/10 text-success"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              deadlinePassed ? "bg-zinc-500" : "bg-success"
            }`}
          />
          {deadlinePassed ? "Applications closed" : "Applications open"}
        </span>

        <h1
          className={`${spaceGrotesk.className} mt-6 max-w-3xl text-5xl font-bold leading-[0.98] tracking-[-0.03em] text-white sm:text-7xl`}
        >
          Build. Learn.
          <span className="block text-zinc-500">Belong.</span>
        </h1>

        <p className="mt-6 max-w-xl text-base leading-relaxed text-zinc-400 sm:text-lg">
          Join a community of makers and problem-solvers. Explore our
          departments, work on real projects, and be part of something bigger.
        </p>

        <div className="mt-9 flex flex-wrap items-center gap-x-10 gap-y-6">
          <Button asChild size="lg" className="group h-12 rounded-full px-6 text-base">
            <Link href="/departments">
              Apply now
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>

          {!deadlinePassed && (
            <div className="border-l border-white/10 pl-10">
              <p className="mb-2 text-[10px] uppercase tracking-widest text-zinc-500">
                Applications close in
              </p>
              <CountdownTimer size="lg" />
            </div>
          )}
        </div>

        <dl className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-3">
          {STATS.map(({ icon: Icon, value, label }) => (
            <div key={label} className="flex items-center gap-4 bg-[#0d0d11] px-6 py-6">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                <Icon className="h-5 w-5 text-zinc-300" aria-hidden="true" />
              </span>
              <div>
                <dd className="text-2xl font-semibold leading-none text-white">
                  {value}
                </dd>
                <dt className="mt-1.5 text-[11px] uppercase tracking-widest text-zinc-500">
                  {label}
                </dt>
              </div>
            </div>
          ))}
        </dl>
      </CursorGlow>
    </section>
  );
}
