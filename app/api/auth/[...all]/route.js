import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { enforceRateLimit } from "@/lib/rateLimit";

const handlers = toNextJsHandler(auth.handler);

export const GET = handlers.GET;

// Sign-in and sign-up were completely unthrottled: an attacker could try
// passwords against a known address, or create accounts in bulk, as fast as
// the network allowed. Only credential-submitting paths are limited - session
// lookups and callbacks run on every page load and must stay free.
const LIMITED_PATHS = ["/sign-in", "/sign-up", "/forget-password", "/reset-password"];

export const POST = async (request) => {
  const { pathname } = new URL(request.url);

  if (LIMITED_PATHS.some((path) => pathname.includes(path))) {
    const limited = await enforceRateLimit(request, "auth");
    if (limited) return limited;
  }

  return handlers.POST(request);
};
