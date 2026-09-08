import { connect } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { SUBMISSION_DEADLINE, isValidDepartment } from "@/constants";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user) {
      return new Response(
        JSON.stringify({ message: "Authentication required" }),
        { status: 401 }
      );
    }

    const user = session.user;
    const userEmail = user.email;

    const deadline = new Date(SUBMISSION_DEADLINE);
    if (new Date() > deadline)
      return new Response(
        JSON.stringify({
          message: "The submission deadline has passed"
        }),
        { status: 403 }
      );
                  

    const db = await connect();
    const data = await req.json();

    const { Department, Questions, ...formFields } = data;

    // The department has to be one that actually exists. Without this the
    // route stored whatever string it was handed, so a crafted request could
    // create applications for departments nobody runs - which then show up in
    // the admin table, the department filter and the CSV export as real rows.
    if (!isValidDepartment(Department)) {
      return new Response(
        JSON.stringify({ message: "That department does not exist." }),
        { status: 400 }
      );
    }

    // Questions must be a plain object of answers; an array or a primitive
    // would be stored as-is and break the admin table and CSV formatting.
    if (
      Questions === null ||
      typeof Questions !== "object" ||
      Array.isArray(Questions)
    ) {
      return new Response(
        JSON.stringify({ message: "Malformed application answers." }),
        { status: 400 }
      );
    }

    const regNoRegex = /^\d{2}[A-Z]{3}\d{4}$/;
    if (formFields.RegistrationNumber && !regNoRegex.test(formFields.RegistrationNumber)) {
      return new Response(
        JSON.stringify({
          message: "Registration number must be 2 numbers, 3 uppercase letters, and 4 numbers (e.g. 25BCE5612)",
        }),
        { status: 400 }
      );
    }

    const collection = db.collection("formData");

    // The client submits both chosen departments concurrently, so a plain
    // read-then-write would let two in-flight requests both observe the
    // pre-write state and both insert. Doing the count/duplicate checks and
    // the insert inside one transaction makes Firestore retry the loser,
    // which then sees the winner's row and rejects correctly.
    const rejection = await db.runTransaction(async (transaction) => {
      const existingSubmissions = await transaction.get(
        collection.where("Email", "==", userEmail)
      );

      const alreadySubmittedDept = existingSubmissions.docs.some(
        (doc) => doc.data()?.Department === Department
      );

      if (alreadySubmittedDept) {
        return `You have already submitted an application for ${Department}`;
      }

      if (existingSubmissions.size >= 2) {
        return "Remember that you can only submit upto 2 unique applications";
      }

      transaction.create(collection.doc(), {
        ...formFields,
        Department,
        Questions,
        Email: userEmail,
        shortlisted: false,
        createdAt: new Date(),
      });

      return null;
    });

    if (rejection) {
      return new Response(JSON.stringify({ message: rejection }), {
        status: 400,
      });
    }

    return new Response(
      JSON.stringify({
        message: "Form submitted successfully!",
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Form submission error:", error);
    return new Response(JSON.stringify({ message: "Error submitting form" }), {
      status: 500,
    });
  }
}
