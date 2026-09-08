"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Space_Grotesk } from "next/font/google";
import { Button } from "./ui/button";
import CountdownTimer from "./common/CountdownTimer";
import { SUBMISSION_DEADLINE, reviews } from "@/constants";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["500", "600", "700"] });

// Removed from this component: a nested loop running 50,000 iterations on every
// render, and three chained effects that split the description into characters
// and counted its vowels. Nothing displayed any of it.
export default function Hero() {
  const deadlinePassed = new Date() > new Date(SUBMISSION_DEADLINE);

  return (
    <section className="relative overflow-hidden">
      {/* Accent wash built from the department palette in constants. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-40 h-80 opacity-20 blur-3xl"
        style={{
          background:
            "radial-gradient(40% 60% at 20% 50%, #8ab4f8 0%, transparent 100%), radial-gradient(40% 60% at 70% 40%, #6EE7A0 0%, transparent 100%), radial-gradient(30% 50% at 90% 60%, #FFD45E 0%, transparent 100%)",
        }}
      />

      <div className="relative mx-auto flex max-w-5xl flex-col items-start gap-6 px-4 py-20 sm:px-6 sm:py-28">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-zinc-300">
          <span
            className={`h-1.5 w-1.5 rounded-full ${deadlinePassed ? "bg-zinc-500" : "bg-emerald-400"}`}
          />
          {deadlinePassed ? "Applications closed" : "Applications open now"}
        </span>

        <h1
          className={`${spaceGrotesk.className} text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-6xl`}
        >
          Recruitment 2026
          <span className="mt-2 block text-zinc-400">Ready to make your mark?</span>
        </h1>

        <p className="max-w-xl text-base leading-relaxed text-zinc-400 sm:text-lg">
          Join our departments and work on real-world projects alongside people
          who build things. Pick up to two departments, tell us about yourself,
          and we&apos;ll take it from there.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button asChild size="lg">
            <Link href="/departments" className="group">
              Browse departments
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>
          {!deadlinePassed && (
            <span className="flex items-center gap-2 text-xs text-zinc-500 sm:ml-4">
              Closes in
              <CountdownTimer />
            </span>
          )}
        </div>

        <dl className="mt-6 grid w-full grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/10 bg-white/5 sm:grid-cols-3">
          {[
            { label: "Departments", value: reviews.length },
            { label: "Applications each", value: "Up to 2" },
            { label: "Time to apply", value: "~10 min" },
          ].map((stat) => (
            <div key={stat.label} className="bg-[#0d0d11] px-5 py-4">
              <dt className="text-xs uppercase tracking-wider text-zinc-500">
                {stat.label}
              </dt>
              <dd className="mt-1 text-xl font-semibold text-white">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
