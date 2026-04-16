import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClientWithCookies } from "@/lib/db/client";
import { getTemplateById } from "@/lib/emailTemplates";
import { readFile } from "fs/promises";
import path from "path";

const ADMIN_EMAILS = ["joshuaooi105@gmail.com", "justin@unisphere.my", "admin@unisphere.my", "23torch03@gmail.com"];

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authClient = await createRouteHandlerClientWithCookies();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user?.email || !ADMIN_EMAILS.includes(user.email)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const template = getTemplateById(id);

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    // Read the HTML file from public/emails/
    const filePath = path.join(process.cwd(), "public", "emails", template.fileName);
    const htmlContent = await readFile(filePath, "utf-8");

    return NextResponse.json({
      template,
      htmlContent,
    });
  } catch (error) {
    console.error("Error fetching template:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
