import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { reviews } from "@/constants";

/**
 * The departments on the landing page.
 *
 * Replaces BentoGridComp, which built its cards from a hardcoded array of
 * Dropbox-style placeholder copy ("Use the calendar to filter your files by
 * date") and then mutated that module-level array at import time from
 * `reviews`. That rewrite read `r.body`, a field the catalogue does not have,
 * so every description came out `undefined`, and set `href` to a bare id
 * instead of `/join/<id>`, so every card linked to a 404.
 *
 * Rendering straight from the catalogue means the departments shown here are
 * exactly the ones you can apply to, with links that work.
 */
const DepartmentsPreview = () => (
  <section className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6">
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          Find your department
        </h2>
        <p className="mt-2 text-sm text-zinc-400">
          {reviews.length} teams building, designing and running events. Apply to
          up to two.
        </p>
      </div>
      <Link
        href="/departments"
        className="group inline-flex items-center gap-1 text-sm text-zinc-300 transition-colors hover:text-white"
      >
        Start an application
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </div>

    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {reviews.map((department) => {
        const Icon = department.icon;

        return (
          <li key={department.id}>
            <Link
              href={`/join/${department.id}`}
              className="group relative flex h-full flex-col gap-3 overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] p-5 transition-colors hover:border-white/25 hover:bg-white/[0.06]"
            >
              <span
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-px opacity-60"
                style={{ backgroundColor: department.tone }}
              />
              {Icon && (
                <Icon
                  size={28}
                  aria-hidden="true"
                  style={{ color: department.tone }}
                />
              )}
              <h3 className="font-medium text-white">{department.name}</h3>
              <p className="line-clamp-3 text-sm text-zinc-400">
                {department.description}
              </p>
              <span className="mt-auto inline-flex items-center gap-1 pt-2 text-xs text-zinc-500 transition-colors group-hover:text-zinc-300">
                Apply
                <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  </section>
);

export default DepartmentsPreview;
