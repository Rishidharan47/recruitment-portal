"use client";
import React from "react";
import Link from "next/link";
import UserButton from "./UserButton";
import { authClient } from "@/lib/auth-client";

import { DM_Sans } from "next/font/google";
import CountdownTimer from "./common/CountdownTimer";
import { SUBMISSION_DEADLINE } from "@/constants";

const dm_sans = DM_Sans({ weight: ["400"], subsets: ["latin"] });

// Previously this header re-rendered five times a second forever (a 200ms
// interval driving a wall clock nobody needs) and again on every scroll event,
// on top of a chain of effects deriving values already present on `session`.
// The clock is replaced by the applications-close countdown, which the app
// already had a component for but never rendered.
const NavBar = () => {
  const { data: session, isPending } = authClient.useSession();

  const user = session?.user;
  const isAdmin = user?.role === "admin";
  const deadlinePassed = new Date() > new Date(SUBMISSION_DEADLINE);

  const navItems = [
    { label: "Departments", href: "/departments" },
    ...(isAdmin ? [{ label: "Admin Panel", href: "/admin" }] : []),
  ];

  return (
    <header
      className={`${dm_sans.className} sticky top-0 z-50 border-b border-white/10 bg-[#0d0d11]/80 backdrop-blur`}
    >
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-4">
          <Link href="/" className="font-semibold text-white">
            Recruitment Portal
          </Link>
          {!deadlinePassed && (
            <span className="hidden items-center gap-2 text-xs text-gray-400 sm:flex">
              Closes in
              <CountdownTimer />
            </span>
          )}
        </div>

        <div className="flex items-center gap-4 text-sm">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-gray-300 transition-colors hover:text-white"
            >
              {item.label}
            </Link>
          ))}

          {isPending ? (
            <span className="text-gray-500">Loading...</span>
          ) : !user ? (
            <Link
              href="/auth/signin"
              className="rounded-md bg-white px-3 py-1.5 font-medium text-black transition-opacity hover:opacity-90"
            >
              Sign In
            </Link>
          ) : (
            <UserButton user={user} />
          )}
        </div>
      </nav>
    </header>
  );
};

export default NavBar;
