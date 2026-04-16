import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/adminAuth";
import { createRouteHandlerClientWithCookies } from "@/lib/db/client";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * GET /api/admin/resources
 * Returns file list from storage with download counts and recent downloaders.
 */
export async function GET(req: NextRequest) {
  try {
    const admin = await getAdminUser();
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const path = searchParams.get("path") || "";

    const supabase = getServiceClient();

    // List files from storage
    const { data: files, error: storageError } = await supabase.storage
      .from("resources")
      .list(path, { sortBy: { column: "name", order: "asc" } });

    if (storageError) return NextResponse.json({ error: "Failed to list files" }, { status: 500 });

    // Get download counts for all files
    const { data: downloads } = await supabase
      .from("resource_download")
      .select("file_path, file_name, user_id, user_email, user_name, downloaded_at");

    // Group downloads by file path
    const downloadMap: Record<string, { count: number; leads: any[] }> = {};
    for (const dl of downloads || []) {
      if (!downloadMap[dl.file_path]) downloadMap[dl.file_path] = { count: 0, leads: [] };
      downloadMap[dl.file_path].count += 1;
      downloadMap[dl.file_path].leads.push({
        user_id: dl.user_id,
        user_email: dl.user_email,
        user_name: dl.user_name,
        downloaded_at: dl.downloaded_at,
      });
    }

    return NextResponse.json({
      files: files || [],
      downloadMap,
      currentPath: path,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/resources
 * Delete a file from storage.
 */
export async function DELETE(req: NextRequest) {
  try {
    const admin = await getAdminUser();
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const filePath = searchParams.get("path");
    if (!filePath) return NextResponse.json({ error: "File path required" }, { status: 400 });

    const supabase = getServiceClient();
    const { error } = await supabase.storage.from("resources").remove([filePath]);

    if (error) return NextResponse.json({ error: "Failed to delete file" }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
