import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <h2 className="text-3xl font-semibold text-white">Department not found</h2>
      <p className="max-w-md text-gray-400">
        Sorry, the department you&apos;re looking for doesn&apos;t exist or has
        been removed.
      </p>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/departments">Browse all departments</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Go home</Link>
        </Button>
      </div>
    </main>
  );
}
