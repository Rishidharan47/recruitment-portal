"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bricolage_Grotesque, Space_Grotesk } from "next/font/google";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import DWASFWLoader from "@/components/GDGLoader";
import SignInButton from "@/components/SignInButton";

const bricolageGrotesque = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-bricolage-grotesque",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-space-grotesk",
});

export default function SignInPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (session?.user && !isPending) {
      router.push("/");
    }
  }, [session, isPending, router]);

  if (isPending) {
    return <DWASFWLoader />;
  }

  if (session?.user) {
    return (
      <div className="min-h-screen bg-[#0d0d11] flex items-center justify-center">
        <div className="text-center text-white">
          <p className="text-sm text-zinc-400">Redirecting...</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in all required fields.");
      return;
    }

    if (mode === "signup" && !name) {
      toast.error("Please enter your name.");
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "signup") {
        const res = await authClient.signUp.email({
          email,
          password,
          name,
          callbackURL: "/",
        });
        if (res?.error) {
          toast.error(res.error.message || "Failed to create account.");
        } else {
          toast.success("Account created successfully!");
          router.push("/");
        }
      } else {
        const res = await authClient.signIn.email({
          email,
          password,
          callbackURL: "/",
        });
        if (res?.error) {
          toast.error(res.error.message || "Invalid credentials.");
        } else {
          toast.success("Signed in successfully!");
          router.push("/");
        }
      }
    } catch (err) {
      console.error("Auth error:", err);
      toast.error("Authentication failed. Please check your credentials.");
    } finally {
      setSubmitting(false);
    }
  };

  const isSignUp = mode === "signup";

  return (
    <main
      id="main-content"
      className={`${bricolageGrotesque.variable} ${spaceGrotesk.variable} flex min-h-screen items-center justify-center bg-[#0d0d11] px-4 py-12`}
    >
      <Card className="w-full max-w-md border-white/10 bg-white/[0.03] text-white">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Recruitment 2026</CardTitle>
          <CardDescription className="text-zinc-400">
            {isSignUp
              ? "Create an account to start your application."
              : "Sign in to continue your application."}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div
            role="tablist"
            aria-label="Authentication mode"
            className="grid grid-cols-2 gap-1 rounded-lg bg-white/5 p-1"
          >
            {[
              { key: "signin", label: "Sign in" },
              { key: "signup", label: "Create account" },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={mode === tab.key}
                onClick={() => setMode(tab.key)}
                className={`rounded-md px-3 py-2 text-sm transition-colors ${
                  mode === tab.key
                    ? "bg-white text-black"
                    : "text-zinc-300 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Jane Doe"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Password"
                autoComplete={isSignUp ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting
                ? "Processing..."
                : isSignUp
                  ? "Create account"
                  : "Sign in"}
            </Button>
          </form>

          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-white/10" />
            <span className="text-xs uppercase tracking-wider text-zinc-500">or</span>
            <span className="h-px flex-1 bg-white/10" />
          </div>

          {/* The Google provider is configured in lib/auth.js and this button
              already existed, but nothing ever rendered it - so the OAuth path
              was unreachable from the UI. */}
          <SignInButton className="w-full" />
        </CardContent>
      </Card>
    </main>
  );
}
