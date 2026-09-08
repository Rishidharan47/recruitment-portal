"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bricolage_Grotesque, Space_Grotesk } from "next/font/google";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import { reviews } from "@/constants";
import { CheckCircle } from "@material-symbols-svg/react/outlined";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";

const bricolageGrotesque = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-bricolage-grotesque",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-space-grotesk",
});

import { useSubmissions } from "@/components/SubmissionsProvider";

const departments = reviews;

// Defined at module scope: when this lived inside the page component it was a
// brand new component type on every render, so React unmounted and remounted
// every checkbox in the list each time anything changed.
const DepartmentListItem = ({ department, isSelected, isSubmitted, onToggle }) => {
  const Icon = department.icon;

  return (
    <li>
      <label
        className={`relative flex h-full cursor-pointer flex-col overflow-hidden rounded-xl border p-5 pt-6 transition-colors ${
          isSubmitted
            ? "cursor-not-allowed border-white/5 bg-white/[0.02] opacity-50"
            : isSelected
              ? "border-brand/60 bg-brand/[0.06]"
              : "border-white/10 bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.04]"
        }`}
      >
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-[2px]"
          style={{ backgroundColor: department.tone }}
        />

        <div className="flex items-start gap-4">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 shrink-0 accent-[hsl(var(--brand))]"
            disabled={isSubmitted}
            checked={isSelected}
            onChange={onToggle}
          />

          {Icon && (
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border"
              style={{
                borderColor: `${department.tone}33`,
                backgroundColor: `${department.tone}14`,
              }}
            >
              <Icon size={20} aria-hidden="true" style={{ color: department.tone }} />
            </span>
          )}

          <div className="min-w-0">
            <span className="font-medium text-white">{department.name}</span>
            {isSubmitted && (
              <span className="ml-2 inline-flex items-center gap-1 align-middle text-xs text-success">
                <CheckCircle size={13} /> Submitted
              </span>
            )}
            <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">
              {department.description}
            </p>
          </div>
        </div>
      </label>
    </li>
  );
};

const DepartmentsListPage = () => {
  const router = useRouter();
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const { submittedDepartments } = useSubmissions();

  // All of these were chained useState + useEffect pairs; they are plain
  // derivations of the two pieces of real state above.
  const remainingSlots = Math.max(0, 2 - submittedDepartments.length);
  const selectedIds = useMemo(
    () =>
      departments
        .filter((dept) => selectedDepartments.includes(dept.name))
        .map((dept) => dept.id),
    [selectedDepartments]
  );

  const toggleDepartment = (departmentName) => {
    if (submittedDepartments.includes(departmentName)) {
      toast.error(`You have already submitted an application for ${departmentName}.`);
      return;
    }

    if (remainingSlots <= 0) {
      toast.error("You have already submitted the maximum allowed (2) applications.");
      return;
    }

    setSelectedDepartments((current) => {
      if (current.includes(departmentName)) {
        return current.filter((name) => name !== departmentName);
      }

      if (current.length >= remainingSlots) {
        toast.error(`You can select at most ${remainingSlots} department(s).`);
        return current;
      }

      return [...current, departmentName];
    });
  };

  const goToApplication = () => {
    if (!selectedIds.length) return;
    router.push(`/join/${selectedIds.join("/")}`);
  };

  return (
    <main
      className={`${bricolageGrotesque.variable} ${spaceGrotesk.variable} min-h-screen`}
    >
      <NavBar />

      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <header className="mb-10 flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-zinc-500">
              Step 01 &middot; Select
            </p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Find your place
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-400">
              Explore {departments.length} departments, learn what they do, and
              apply to at most two.
            </p>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
            <div>
              <p className="text-white">You can apply to at most 2 departments.</p>
              <p className="mt-0.5 text-zinc-400">
                {remainingSlots === 2
                  ? "Choose the ones that best match your interests."
                  : `You have ${remainingSlots} slot${remainingSlots === 1 ? "" : "s"} left.`}
              </p>
            </div>
          </div>
        </header>

        <div
          className="sticky top-[57px] z-40 -mx-4 mb-6 flex flex-wrap items-center gap-4 border-y border-white/10 bg-[#0d0d11]/90 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:border sm:px-5"
          role="status"
        >
          <span className="text-sm text-zinc-300">
            <span className="font-semibold text-white">
              {selectedDepartments.length}
            </span>{" "}
            / {remainingSlots || 2} selected
          </span>
          <Button
            type="button"
            onClick={goToApplication}
            disabled={selectedIds.length === 0}
            className="ml-auto"
          >
            Continue to application &rarr;
          </Button>
        </div>

        <section>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {departments.map((department) => (
              <DepartmentListItem
                key={department.id}
                department={department}
                isSelected={selectedDepartments.includes(department.name)}
                isSubmitted={submittedDepartments.includes(department.name)}
                onToggle={() => toggleDepartment(department.name)}
              />
            ))}
          </ul>
        </section>
      </div>

      <Footer />
    </main>
  );
};

export default DepartmentsListPage;
