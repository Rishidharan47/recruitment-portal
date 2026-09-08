import React from "react";
import { redirect } from "next/navigation";
import NavBar from "@/components/NavBar";
import AdminContent from "@/components/AdminContent";
import { getAdminSession } from "@/lib/adminAuth";
import { fetchApplicantsPage, fetchApplicantStats } from "@/lib/adminApplicants";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  // This gate has to run *before* the Firestore read. AdminContent's own
  // role check is client-side, so gating there alone would still ship every
  // applicant's name, email, phone and answers to whoever opened the page.
  const { error } = await getAdminSession();

  if (error === "unauthenticated") redirect("/auth/signin");
  if (error) {
    return (
      <>
        <NavBar />
        <main
          id="main-content"
          className="flex min-h-[60vh] items-center justify-center px-6 text-center"
        >
          <div>
            <h1 className="text-2xl font-semibold">Access denied</h1>
            <p className="mt-2 text-muted-foreground">
              You are not authorised to view this page.
            </p>
          </div>
        </main>
      </>
    );
  }

  // First page only, plus server-side counts. This used to read every
  // applicant document - with every answer - on every page load.
  const [{ applicants, nextCursor }, stats] = await Promise.all([
    fetchApplicantsPage(),
    fetchApplicantStats(),
  ]);

  return (
    <>
      <NavBar />
      <main id="main-content">
        <AdminContent
          applicants={applicants}
          nextCursor={nextCursor}
          stats={stats}
        />
      </main>
    </>
  );
}
