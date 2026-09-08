"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// Replaces app/_error.js, which was a Pages Router error component sitting in
// the App Router tree: Next never rendered it, so an unhandled runtime error
// fell through to the default error screen.
export default function Error({ error, reset }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-3xl font-semibold text-white">Something went wrong</h1>
      <p className="max-w-md text-gray-400">
        The page failed to load. You can try again, or head back to the
        departments list.
      </p>
      <div className="flex gap-3">
        <Button type="button" onClick={reset}>
          Try again
        </Button>
        <Button asChild variant="outline">
          <Link href="/departments">Browse departments</Link>
        </Button>
      </div>
    </main>
  );
}
