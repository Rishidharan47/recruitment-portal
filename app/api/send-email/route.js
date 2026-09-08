require("dotenv").config();
import nodemailer from "nodemailer";
import { reviews } from "@/constants";
import { getAdminSession, adminGuardResponse } from "@/lib/adminAuth";

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
    const { error } = await getAdminSession();
    if (error) return adminGuardResponse(error);

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

    try {
        for (const recipient of recipients) {
            let depart = recipient.Department;
            if (depart === "Video Editing") {
                depart = "Photography";
            }
            const dept = reviews.find((item) => item.name === depart);

            // An applicant whose department no longer exists in the list used
            // to crash the whole batch here on `dept.name`.
            let deptName = dept?.name ?? depart ?? "";
            if (
                deptName === "Web Development" ||
                deptName === "App Development"
            ) {
                deptName = "Development Department";
            }

            if (deptName === "Photography" || deptName === "Video Editing") {
                deptName = "Photography & Video Editing Department";
            }

            let generalTemp = `
                <div>
                    ${payloadData.body}
                </div>
                `;

            generalTemp = generalTemp.replace(/#name/g, recipient.Name);
            generalTemp = generalTemp.replace(/#dept/g, deptName);

            const mailOptions = {
                from: process.env.EMAIL_USERNAME,
                to: recipient.Email,
                subject: payloadData.subject,
                html: generalTemp,
            };

            await transporter.sendMail(mailOptions);
        }

        return new Response(
            JSON.stringify({ message: "Emails sent successfully" }),
            { status: 200 }
        );
    } catch (error) {
        return new Response(
            JSON.stringify({ error: "Failed to send emails" }),
            { status: 500 }
        );
    }
}
