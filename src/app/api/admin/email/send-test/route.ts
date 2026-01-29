import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClientWithCookies } from "@/lib/db/client";

// Admin emails that can access this endpoint
const ADMIN_EMAILS = ["justin@unisphere.my", "admin@unisphere.my", "23torch03@gmail.com"];

export async function POST(req: NextRequest) {
  try {
    // Verify admin access
    const authClient = await createRouteHandlerClientWithCookies();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user?.email || !ADMIN_EMAILS.includes(user.email)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { to, subject, htmlBody } = await req.json();

    if (!to || !subject || !htmlBody) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Replace template variables with test data
    const personalizedHtml = htmlBody
      .replace(/\{\{first_name\}\}/g, "Test")
      .replace(/\{\{last_name\}\}/g, "User")
      .replace(/\{\{email\}\}/g, to);

    // Call the Supabase Edge Function to send email
    const functionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-marketing-emails`;
    const response = await fetch(functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        to,
        subject,
        htmlBody: personalizedHtml,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Failed to send test email:", {
        status: response.status,
        functionUrl,
        errorText,
      });
      return NextResponse.json(
        {
          error: "Failed to send email",
          details: errorText,
          status: response.status,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error sending test email:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
