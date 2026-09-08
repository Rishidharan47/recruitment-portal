"use client";
import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Builds a windowed page list: first page, a window around the current page,
 * the last page, with ellipses where numbers are skipped. The previous version
 * always rendered `pageIndex, +1, +2`, so the first page disappeared as soon as
 * you moved past it and the list ran short near the end.
 */
const pageWindow = (current, total) => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages = new Set([1, total, current, current - 1, current + 1]);
  if (current <= 3) [2, 3, 4].forEach((p) => pages.add(p));
  if (current >= total - 2) [total - 3, total - 2, total - 1].forEach((p) => pages.add(p));

  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);

  return sorted.reduce((acc, page, index) => {
    if (index > 0 && page - sorted[index - 1] > 1) acc.push("ellipsis");
    acc.push(page);
    return acc;
  }, []);
};

const PaginationComp = ({
  pageIndex,
  nextPage,
  canNext,
  previousPage,
  canPrev,
  goto,
  pageCount,
  summary,
}) => {
  const current = pageIndex + 1;
  const pages = pageWindow(current, pageCount || 1);

  const arrowClasses =
    "flex h-8 w-8 items-center justify-center rounded-md border border-white/10 text-zinc-400 transition-colors hover:border-white/25 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-white/10 disabled:hover:text-zinc-400";

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 px-1 py-3">
      <p className="text-sm text-zinc-500">{summary}</p>

      <nav className="flex items-center gap-1.5" aria-label="Pagination">
        <button
          type="button"
          className={arrowClasses}
          onClick={previousPage}
          disabled={!canPrev}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {pages.map((page, index) =>
          page === "ellipsis" ? (
            <span key={`gap-${index}`} className="px-1 text-sm text-zinc-600">
              &hellip;
            </span>
          ) : (
            <button
              key={page}
              type="button"
              onClick={() => goto(page - 1)}
              aria-current={page === current ? "page" : undefined}
              className={`h-8 min-w-8 rounded-md px-2 text-sm tabular-nums transition-colors ${
                page === current
                  ? "bg-brand text-brand-foreground"
                  : "border border-white/10 text-zinc-400 hover:border-white/25 hover:text-white"
              }`}
            >
              {page}
            </button>
          )
        )}

        <button
          type="button"
          className={arrowClasses}
          onClick={nextPage}
          disabled={!canNext}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </nav>
    </div>
  );
};

export default PaginationComp;
