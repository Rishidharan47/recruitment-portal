import { NextResponse } from "next/server";
import { getAdminSession, adminGuardResponse } from "@/lib/adminAuth";
import { enforceRateLimit } from "@/lib/rateLimit";
import {
  fetchApplicantsPage,
  fetchAllApplicantsForExport,
  APPLICANTS_PAGE_SIZE,
} from "@/lib/adminApplicants";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { session, error } = await getAdminSession();
    if (error) return adminGuardResponse(error);

    const limited = await enforceRateLimit(request, "read", {
      userId: session.user.id,
    });
    if (limited) return limited;

    const { searchParams } = new URL(request.url);

    // `full=1` is the export path: every applicant *with* their answers. It is
    // the expensive query, so it only runs when someone actually exports.
    if (searchParams.get("full") === "1") {
      const applicants = await fetchAllApplicantsForExport();
      return NextResponse.json({ applicants });
    }

    const requestedLimit = Number(searchParams.get("limit"));
    const limit =
      Number.isFinite(requestedLimit) && requestedLimit > 0
        ? Math.min(requestedLimit, 200)
        : APPLICANTS_PAGE_SIZE;

    const { applicants, nextCursor } = await fetchApplicantsPage({
      limit,
      cursorId: searchParams.get("cursor"),
    });

    return NextResponse.json({ applicants, nextCursor });
  } catch (error) {
    console.error("Error fetching applicants:", error);
    return NextResponse.json(
      { error: "Failed to fetch applicants" },
      { status: 500 }
    );
  }
}
