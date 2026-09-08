import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// Shared server-side admin gate for the admin page and the admin-only API
// routes. The `admin` better-auth plugin stores the role on the user record.
export const getAdminSession = async () => {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) return { session: null, error: "unauthenticated" };
  if (session.user.role !== "admin") return { session: null, error: "forbidden" };

  return { session, error: null };
};

export const adminGuardResponse = (error) =>
  error === "unauthenticated"
    ? Response.json({ error: "Authentication required" }, { status: 401 })
    : Response.json({ error: "Admin access required" }, { status: 403 });
