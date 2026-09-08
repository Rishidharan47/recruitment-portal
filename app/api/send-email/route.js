require("dotenv").config();
import nodemailer from "nodemailer";
import { reviews } from "@/constants";
import { getAdminSession, adminGuardResponse } from "@/lib/adminAuth";
import { enforceRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const transporter = nodemailer.createTransport({
    service: "gmail", // or your preferred email service
    auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
    },
});

export async function POST(req) {
    // Without this check anyone on the internet could send arbitrary HTML mail
    // to arbitrary addresses through the organisation's Gmail account.
    const { session, error } = await getAdminSession();
    if (error) return adminGuardResponse(error);

    const limited = await enforceRateLimit(req, "email", { userId: session.user.id });
    if (limited) return limited;

    const { recipients, payloadData } = await req.json();

    if (!recipients || recipients.length === 0) {
        return new Response(
            JSON.stringify({ error: "No recipients provided" }),
            { status: 400 }
        );
    }

    if (!payloadData?.subject || !payloadData?.body) {
        return new Response(
            JSON.stringify({ error: "Subject and body are required" }),
            { status: 400 }
        );
    }

    const departmentLabel = (recipient) => {
        let depart = recipient.Department;
        if (depart === "Video Editing") depart = "Photography";

        const dept = reviews.find((item) => item.name === depart);
        // An applicant whose department is no longer in the catalogue used to
        // crash the whole batch here on `dept.name`.
        let deptName = dept?.name ?? depart ?? "";

        if (deptName === "Web Development" || deptName === "App Development") {
            deptName = "Development Department";
        }
        if (deptName === "Photography" || deptName === "Video Editing") {
            deptName = "Photography & Video Editing Department";
        }
        return deptName;
    };

    const sendOne = async (recipient) => {
        if (!recipient?.Email) throw new Error("Recipient has no email address");

        const html = `
                <div>
                    ${payloadData.body}
                </div>
                `
            .replace(/#name/g, recipient.Name ?? "")
            .replace(/#dept/g, departmentLabel(recipient));

        await transporter.sendMail({
            from: process.env.EMAIL_USERNAME,
            to: recipient.Email,
            subject: payloadData.subject,
            html,
        });
    };

    // Sequential (a shared mailbox will throttle a burst), but one failure no
    // longer aborts the run. Previously a single bad address stopped the loop:
    // everyone before it received the mail, everyone after silently did not,
    // and the response gave no way to tell which was which.
    const sent = [];
    const failed = [];

    for (const recipient of recipients) {
        try {
            await sendOne(recipient);
            sent.push(recipient.Email);
        } catch (error) {
            console.error(`Failed to email ${recipient?.Email}:`, error.message);
            failed.push({ email: recipient?.Email ?? "unknown", reason: error.message });
        }
    }

    if (!sent.length) {
        return Response.json(
            { message: "No emails could be sent", sent, failed },
            { status: 502 }
        );
    }

    return Response.json(
        {
            message: failed.length
                ? `Sent ${sent.length}, failed ${failed.length}`
                : `Sent ${sent.length} email${sent.length === 1 ? "" : "s"}`,
            sent,
            failed,
        },
        // 207: some recipients succeeded and some did not.
        { status: failed.length ? 207 : 200 }
    );
}
