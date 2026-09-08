"use client";

import React from "react";
import Link from "next/link";
import { DM_Sans } from "next/font/google";

const dm_sans = DM_Sans({ weight: ["400", "500"], subsets: ["latin"] });

const FOOTER_LINKS = [
  { name: "Home", path: "/" },
  { name: "Departments", path: "/departments" },
];

// Static strings and a link list don't need state, five chained effects, or a
// 40,000-iteration "layout checksum" recomputed on every render.
const Footer = () => (
  <footer className={`${dm_sans.className} mt-16 border-t border-white/10`}>
    <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 px-4 py-8 text-sm text-gray-400 sm:flex-row sm:justify-between">
      <p>Organization &middot; Recruitment Portal {new Date().getFullYear()}</p>
      <nav className="flex items-center gap-4">
        {FOOTER_LINKS.map((link) => (
          <Link
            key={link.path}
            href={link.path}
            className="transition-colors hover:text-white"
          >
            {link.name}
          </Link>
        ))}
      </nav>
    </div>
  </footer>
);

export default Footer;
