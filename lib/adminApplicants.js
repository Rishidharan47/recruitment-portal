import { connect, serializeFirestoreData } from "@/lib/db";

const COLLECTION = "formData";

export const APPLICANTS_PAGE_SIZE = 50;

// The columns the admin table actually renders. `Questions` is deliberately
// excluded: it is by far the largest field on a document (every answer to
// every question), and the table never shows it. Fetching it for the table
// meant every applicant's full answers were serialised into the page payload
// and shipped to the browser on each load. Export and the mail composer fetch
// it on demand instead.
const TABLE_FIELDS = [
  "Name",
  "RegistrationNumber",
  "Email",
  "Phone",
  "Department",
  "Pref",
  "Gender",
  "Year of Study",
  "shortlisted",
  "createdAt",
];

const toApplicant = (doc) => ({
  id: doc.id,
  _id: doc.id,
  ...serializeFirestoreData(doc.data()),
});

/**
 * One page of applicants, newest first.
 *
 * Note: Firestore omits documents that lack the field being ordered on, so a
 * document written without `createdAt` would not appear here. Every document
 * this app writes sets it (see app/api/submit-form/route.js); anything
 * imported by hand must too.
 */
export const fetchApplicantsPage = async ({
  limit = APPLICANTS_PAGE_SIZE,
  cursorId = null,
  fields = TABLE_FIELDS,
} = {}) => {
  const db = await connect();
  let query = db.collection(COLLECTION).orderBy("createdAt", "desc");

  if (fields) query = query.select(...fields);

  if (cursorId) {
    // Paging from the document itself rather than from a createdAt value:
    // two applications submitted in the same millisecond would otherwise be
    // skipped or repeated at a page boundary.
    const cursorDoc = await db.collection(COLLECTION).doc(cursorId).get();
    if (cursorDoc.exists) query = query.startAfter(cursorDoc);
  }

  const snapshot = await query.limit(limit).get();
  const applicants = snapshot.docs.map(toApplicant);

  return {
    applicants,
    nextCursor:
      applicants.length === limit ? applicants[applicants.length - 1].id : null,
  };
};

/**
 * Totals for the header, via Firestore's count aggregation: the server counts
 * matching index entries and returns a number, instead of the client reading
 * every document to call `.length` on it.
 */
export const fetchApplicantStats = async () => {
  const db = await connect();
  const collection = db.collection(COLLECTION);

  const [total, shortlisted] = await Promise.all([
    collection.count().get(),
    collection.where("shortlisted", "==", true).count().get(),
  ]);

  const totalCount = total.data().count;
  const shortlistedCount = shortlisted.data().count;

  return {
    total: totalCount,
    shortlisted: shortlistedCount,
    notShortlisted: totalCount - shortlistedCount,
  };
};

/** Every applicant including answers - used only for CSV export and mail. */
export const fetchAllApplicantsForExport = async () => {
  const db = await connect();
  const snapshot = await db
    .collection(COLLECTION)
    .orderBy("createdAt", "desc")
    .get();

  return snapshot.docs.map(toApplicant);
};
