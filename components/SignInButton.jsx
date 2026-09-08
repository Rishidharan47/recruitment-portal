"use client";

import React from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "./ui/button";
import { FaGoogle } from "react-icons/fa";
import { toast } from "sonner";

export default function SignInButton({
  children,
  callbackURL = "/",
  className = "",
  variant = "outline",
  ...props
}) {
  const [pending, setPending] = React.useState(false);

  const handleSignIn = async () => {
    setPending(true);
    try {
      // callbackURL was accepted as a prop and then ignored in favour of a
      // hardcoded "/", so callers could never redirect anywhere else.
      const res = await authClient.signIn.social({ provider: "google", callbackURL });
      if (res?.error) throw new Error(res.error.message);
    } catch (error) {
      console.error("Sign in error:", error);
      toast.error("Could not sign in with Google. Please try again.");
      setPending(false);
    }
  };

  return (
    <Button
      type="button"
      onClick={handleSignIn}
      disabled={pending}
      variant={variant}
      className={className}
      {...props}
    >
      {children ?? (
        <span className="flex items-center justify-center gap-2">
          <FaGoogle aria-hidden="true" />
          {pending ? "Redirecting..." : "Continue with Google"}
        </span>
      )}
    </Button>
  );
}
