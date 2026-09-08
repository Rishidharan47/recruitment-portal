"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bricolage_Grotesque, Space_Grotesk } from "next/font/google";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import { reviews } from "@/constants";
import { CheckCircle } from "@material-symbols-svg/react/outlined";
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
const DepartmentListItem = ({ department, isSelected, isSubmitted, onToggle }) => (
  <li>
    <label
      className={`flex h-full cursor-pointer flex-col gap-2 rounded-xl border p-5 transition-colors ${
        isSubmitted
          ? "cursor-not-allowed border-white/5 bg-white/[0.02] opacity-60"
          : isSelected
            ? "border-white/60 bg-white/[0.07]"
            : "border-white/10 bg-white/[0.03] hover:border-white/30"
      }`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 accent-white"
          disabled={isSubmitted}
          checked={isSelected}
          onChange={onToggle}
        />
        <div>
          <span className="font-medium text-white">{department.name}</span>
          {isSubmitted && (
            <span className="ml-2 inline-flex items-center gap-1 text-xs text-emerald-400">
              <CheckCircle size={14} /> Already submitted
            </span>
          )}
          <p className="mt-1 text-sm text-gray-400">{department.description}</p>
        </div>
      </div>
    </label>
  </li>
);

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

      <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
        <header className="mb-8">
          <p className="text-xs uppercase tracking-widest text-gray-500">
            Step 01 &middot; Select
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Pick your departments
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-400">
            Select up to <strong className="text-white">two</strong> departments.
            {remainingSlots < 2 &&
              ` You have ${remainingSlots} slot${remainingSlots === 1 ? "" : "s"} left.`}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-4">
            <span className="text-sm text-gray-300">
              {selectedDepartments.length} / {remainingSlots || 2} selected
            </span>
            <Button
              type="button"
              onClick={goToApplication}
              disabled={selectedIds.length === 0}
            >
              Continue to application &rarr;
            </Button>
          </div>
        </header>

        <section>
          <h2 className="mb-4 text-lg font-medium text-white">
            Available departments
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2">
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
