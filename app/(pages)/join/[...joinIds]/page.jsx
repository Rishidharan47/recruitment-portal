"use client";
// React import
import React, { useMemo } from "react";
import { useRouter, notFound } from "next/navigation";
// Constant import
import { reviews } from "@/constants/index";

// Component imports
import NavBar from "@/components/NavBar";
import FormComp from "@/components/FormComp";
import Footer from "@/components/Footer";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import Loader from "@/components/GDGLoader";

const JoinDepartmentPage = ({ params }) => {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  const ids = useMemo(() => params?.joinIds ?? [], [params]);

  // Resolve in URL order, not catalogue order: the order the applicant picked
  // the departments in is what makes the stored Preference (1st / 2nd) mean
  // anything. `reviews.filter(...)` silently reordered them.
  const departments = useMemo(
    () => ids.map((id) => reviews.find((dept) => dept.id === id)).filter(Boolean),
    [ids]
  );

  const user = session?.user;

  if (isPending) {
    return (
      <>
        <NavBar />
        <main id="main-content">
          <Loader />
        </main>
        <Footer />
      </>
    );
  }

  if (!ids.length || departments.length !== ids.length) {
    notFound();
  }

  return (
    <>
      <NavBar />
      <main id="main-content">
        {user ? (
          <FormComp dept1={departments[0]} dept2={departments[1]} />
        ) : (
          <section className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
            <h1 className="text-2xl font-semibold text-white">
              Authentication Required
            </h1>
            <p className="text-zinc-400">
              Please sign in to access the application form.
            </p>
            <Button type="button" onClick={() => router.push("/auth/signin")}>
              Sign In
            </Button>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
};

export default JoinDepartmentPage;
