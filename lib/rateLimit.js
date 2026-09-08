import { connect } from "@/lib/db";

const COLLECTION = "rateLimits";

// Fixed windows, in seconds, per bucket. Deliberately generous for anything a
// real applicant does and tight on the expensive or abusable paths.
export const RATE_LIMITS = {
  // One applicant legitimately submits at most 2 applications, so 10 attempts
  // an hour leaves room for validation errors and retries.
  submit: { limit: 10, windowSeconds: 3600 },
  // Sign-in / sign-up attempts, keyed by IP: enough for a shared campus NAT to
  // work, far too few to brute-force a password.
  auth: { limit: 30, windowSeconds: 900 },
  // Sends mail through a real mailbox; a runaway loop here is expensive and
  // damages the sender's reputation.
  email: { limit: 20, windowSeconds: 3600 },
  shortlist: { limit: 300, windowSeconds: 3600 },
  read: { limit: 120, windowSeconds: 3600 },
};

const firstForwardedIp = (request) => {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
};

/**
 * Identify the caller: a signed-in user is limited per account, anyone else
 * per IP. Keying signed-in users by id means one person can't multiply their
 * quota by rotating addresses.
 */
export const rateLimitKey = (request, userId) =>
  userId ? `user:${userId}` : `ip:${firstForwardedIp(request)}`;

/**
 * Fixed-window counter held in Firestore. The read and the increment happen in
 * one transaction, so concurrent requests can't both observe the same count
 * and slip past the limit - the same reasoning as the submit-form fix.
 *
 * Fails OPEN: if the counter can't be read or written, the request proceeds.
 * A limiter outage should not take applications offline during recruitment;
 * the failure is logged instead.
 *
 * @returns {Promise<Response|null>} a 429 to return, or null to continue
 */
export const enforceRateLimit = async (request, bucket, { userId } = {}) => {
  const config = RATE_LIMITS[bucket];
  if (!config) return null;

  const { limit, windowSeconds } = config;
  const now = Date.now();
  const windowStart = Math.floor(now / (windowSeconds * 1000)) * windowSeconds * 1000;
  const key = rateLimitKey(request, userId);
  const docId = `${bucket}__${key}__${windowStart}`.replace(/\//g, "_");

  try {
    const db = await connect();
    const docRef = db.collection(COLLECTION).doc(docId);

    // Returns whether this request was allowed rather than just the count:
    // at the boundary, "I incremented to the limit" and "I was blocked at the
    // limit" produce the same number, and comparing counts alone lets one
    // request past.
    const allowed = await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(docRef);
      const current = snapshot.exists ? snapshot.data().count ?? 0 : 0;

      if (current >= limit) return false;

      transaction.set(
        docRef,
        { bucket, count: current + 1, windowStart: new Date(windowStart) },
        { merge: true }
      );
      return true;
    });

    if (!allowed) {
      const retryAfter = Math.ceil((windowStart + windowSeconds * 1000 - now) / 1000);
      return new Response(
        JSON.stringify({
          message: "Too many requests. Please wait a moment and try again.",
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(retryAfter),
          },
        }
      );
    }

    // Roughly one call in fifty sweeps out windows nothing can read any more,
    // so the collection doesn't grow forever without needing a cron job.
    if (Math.random() < 0.02) {
      const cutoff = new Date(now - 2 * 24 * 60 * 60 * 1000);
      const stale = await db
        .collection(COLLECTION)
        .where("windowStart", "<", cutoff)
        .limit(50)
        .get();
      await Promise.all(stale.docs.map((doc) => doc.ref.delete()));
    }

    return null;
  } catch (error) {
    console.error("Rate limit check failed, allowing request:", error);
    return null;
  }
};
