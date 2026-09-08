import { describe, it, expect } from "vitest";
import { pageWindow } from "@/components/PaginationComp";

describe("pageWindow", () => {
  it("lists every page when there are few of them", () => {
    expect(pageWindow(1, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it("always keeps the first and last page reachable", () => {
    // The bug this replaced rendered `pageIndex, +1, +2`, so page 1
    // disappeared from the pager as soon as you moved past it.
    const pages = pageWindow(10, 20);
    expect(pages[0]).toBe(1);
    expect(pages[pages.length - 1]).toBe(20);
    expect(pages).toContain(10);
  });

  it("keeps the current page's neighbours visible", () => {
    const pages = pageWindow(10, 20);
    expect(pages).toContain(9);
    expect(pages).toContain(11);
  });

  it("marks skipped ranges with an ellipsis", () => {
    expect(pageWindow(10, 20)).toContain("ellipsis");
    expect(pageWindow(1, 5)).not.toContain("ellipsis");
  });

  it("does not run short at the end of the range", () => {
    const pages = pageWindow(20, 20).filter((p) => p !== "ellipsis");
    expect(pages).toContain(17);
    expect(pages).toContain(20);
  });

  it("never emits a page outside the range", () => {
    for (const current of [1, 2, 15, 19, 20]) {
      const pages = pageWindow(current, 20).filter((p) => p !== "ellipsis");
      expect(pages.every((p) => p >= 1 && p <= 20)).toBe(true);
      expect([...new Set(pages)].length).toBe(pages.length);
    }
  });

  it("copes with a single page", () => {
    expect(pageWindow(1, 1)).toEqual([1]);
  });
});
