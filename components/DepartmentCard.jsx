import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * One department, as shown on the landing page and the picker.
 * `tone` comes from the catalogue in constants, so each department keeps the
 * same accent colour everywhere it appears.
 */
const DepartmentCard = ({ department, href }) => {
  const Icon = department.icon;

  return (
    <Link
      href={href}
      className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] p-5 pt-6 transition-colors hover:border-white/20 hover:bg-white/[0.05]"
    >
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-[2px]"
        style={{ backgroundColor: department.tone }}
      />

      <div className="flex items-start gap-4">
        {Icon && (
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border"
            style={{
              borderColor: `${department.tone}33`,
              backgroundColor: `${department.tone}14`,
            }}
          >
            <Icon size={22} aria-hidden="true" style={{ color: department.tone }} />
          </span>
        )}

        <div className="min-w-0">
          <h3 className="font-medium text-white">{department.name}</h3>
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-zinc-400">
            {department.description}
          </p>
        </div>
      </div>

      <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-brand">
        Apply
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
};

export default DepartmentCard;
