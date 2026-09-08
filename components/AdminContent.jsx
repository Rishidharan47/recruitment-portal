"use client";
import React from "react";
import { authClient } from "@/lib/auth-client";
import DataTable from "./DataTable";

const AdminContent = ({ applicants }) => {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) return null;

  // Defence in depth only: the /admin server component already refuses to
  // fetch or render applicant data for non-admins.
  if (!session?.user) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center">
        <h2 className="text-2xl font-semibold">Authentication Required</h2>
        <p className="text-muted-foreground">
          Please sign in to access the admin panel.
        </p>
        <button
          type="button"
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          onClick={() => {
            window.location.href = "/auth/signin";
          }}
        >
          Sign In
        </button>
      </div>
    );
  }

  if (session.user.role !== "admin") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-6 text-center">
        Access Denied! You are not authorized to view this webpage.
      </div>
    );
  }

  return <DataTable data={applicants} />;
};

export default AdminContent;
