import { NextResponse } from "next/server";
import { createRouteHandlerClientWithCookies } from "@/lib/db/client";
import { EMAIL_TEMPLATES } from "@/lib/emailTemplates";

const ADMIN_EMAILS = ["joshuaooi105@gmail.com", "justin@unisphere.my", "admin@unisphere.my", "23torch03@gmail.com"];

export async function GET() {
  try {
    const authClient = await createRouteHandlerClientWithCookies();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user?.email || !ADMIN_EMAILS.includes(user.email)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ templates: EMAIL_TEMPLATES });
  } catch (error) {
    console.error("Error fetching templates:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
