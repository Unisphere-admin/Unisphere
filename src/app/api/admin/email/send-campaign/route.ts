import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createRouteHandlerClientWithCookies } from "@/lib/db/client";

// Admin emails that can access this endpoint
const ADMIN_EMAILS = ["joshuaooi105@gmail.com", "ghayuan.ng@gmail.com", "jjzlee018@gmail.com", "justin@unisphere.my", "admin@unisphere.my", "23torch03@gmail.com"];

interface FilterState {
  userType: string;
  hasPaid: string;
  services: string[];
  region: string[];
  school: string;
  course: string;
  name: string;
}

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

    const { campaignName, subject, htmlBody, filters, specificEmails } = (await req.json()) as {
      campaignName: string;
      subject: string;
      htmlBody: string;
      filters?: FilterState;
      specificEmails?: string[];
    };

    if (!campaignName || !subject || !htmlBody) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Use service role client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get filtered users (same logic as /users endpoint)
    const usersResponse = await fetch(
      new URL("/api/admin/email/users", req.url).toString(),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: req.headers.get("cookie") || "",
        },
        body: JSON.stringify(specificEmails ? { specificEmails } : { filters }),
      }
    );

    if (!usersResponse.ok) {
      return NextResponse.json(
        { error: "Failed to fetch users" },
        { status: 500 }
      );
    }

    const { users, count } = await usersResponse.json();

    if (count === 0) {
      return NextResponse.json(
        { error: "No users match the filters" },
        { status: 400 }
      );
    }

    // Create campaign record
    const { data: campaign, error: campaignError } = await supabase
      .from("email_campaigns")
      .insert({
        name: campaignName,
        subject,
        html_body: htmlBody,
        segment_filters: filters,
        status: "sending",
        total_recipients: count,
        created_by: user.id,
      })
      .select()
      .single();

    if (campaignError) {
      console.error("Error creating campaign:", campaignError);
      return NextResponse.json(
        { error: "Failed to create campaign" },
        { status: 500 }
      );
    }

    // Create email_sends records for each user
    const emailSends = users.map((u: { email: string }) => ({
      campaign_id: campaign.id,
      user_id: null, // We don't have user_id in the filtered response, could be added
      email: u.email,
      status: "pending",
    }));

    await supabase.from("email_sends").insert(emailSends);

    // Trigger the Edge Function to send emails asynchronously
    // This runs in the background so we can return immediately
    fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-campaign-emails`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          campaignId: campaign.id,
          subject,
          htmlBody,
          users,
        }),
      }
    ).catch((err) => console.error("Error triggering email send:", err));

    return NextResponse.json({
      success: true,
      campaignId: campaign.id,
      totalRecipients: count,
    });
  } catch (error) {
    console.error("Error creating campaign:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
