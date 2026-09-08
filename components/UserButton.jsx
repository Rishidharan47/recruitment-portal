"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { FaUser, FaSignOutAlt } from "react-icons/fa";

export default function UserButton({ user }) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  if (!user) return null;

  const handleSignOut = () => {
    setIsOpen(false);
    // Simply redirect to the auth sign-out page
    router.push("/auth/signout");
  };

  const getInitials = (firstName, lastName) => {
    if (firstName && lastName) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    }
    if (firstName) return firstName.charAt(0).toUpperCase();
    if (user.email) return user.email.charAt(0).toUpperCase();
    return "U";
  };

  return (
    <span className="flex items-center gap-3">
      <span className="hidden max-w-[16ch] truncate text-gray-300 sm:inline">
        {user.name || user.email}
      </span>
      <button
        type="button"
        onClick={handleSignOut}
        className="inline-flex items-center gap-1.5 rounded-md border border-white/15 px-3 py-1.5 text-gray-200 transition-colors hover:border-white/40 hover:text-white"
      >
        <FaSignOutAlt aria-hidden="true" />
        Sign Out
      </button>
    </span>
  );
}
