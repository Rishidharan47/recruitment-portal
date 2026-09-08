import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { reviews } from "@/constants";
import DepartmentCard from "./DepartmentCard";

/**
 * The departments on the landing page.
 *
 * Replaces BentoGridComp, which built its cards from a hardcoded array of
 * placeholder copy and then mutated that module-level array at import time
 * from `reviews` - reading `r.body`, a field the catalogue does not have, so
 * every description came out `undefined`, and setting `href` to a bare id
 * instead of `/join/<id>`, so every card linked to a 404.
 */
const DepartmentsPreview = () => (
  <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
    <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-[11px] uppercase tracking-widest text-zinc-500">
          Our departments
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Find your place
        </h2>
        <p className="mt-2 max-w-xl text-sm text-zinc-400">
          Explore {reviews.length} departments, see what they do, and apply to at
          most two.
        </p>
      </div>

      <Link
        href="/departments"
        className="group inline-flex items-center gap-1.5 text-sm text-zinc-300 transition-colors hover:text-white"
      >
        View all departments
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </div>

    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {reviews.map((department) => (
        <li key={department.id}>
          <DepartmentCard department={department} href={`/join/${department.id}`} />
        </li>
      ))}
    </ul>
  </section>
);

export default DepartmentsPreview;
