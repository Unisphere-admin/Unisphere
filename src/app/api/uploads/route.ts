import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { createRouteHandlerClientWithCookies } from '@/lib/db/client';
import { createGenericClient } from '@/utils/supabase/client';

export const dynamic = 'force-dynamic';

const BUCKET = 'message-uploads';
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'];

export async function POST(req: NextRequest) {
  try {
    // Ensure user is authenticated
    const authClient = await createRouteHandlerClientWithCookies();
    const { data: { user } = {} } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Parse form data
    const form = await req.formData();
    const file = form.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Basic validation
    const mime = file.type || 'application/octet-stream';
    if (!ALLOWED_TYPES.includes(mime)) {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
    }

    const size = file.size || 0;
    if (size <= 0 || size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: 'File too large' }, { status: 400 });
    }

    // Build path: userId/uuid-originalname
    const safeName = (file.name || 'file').replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const filename = `${user.id}/${uuidv4()}-${safeName}`;

    // Use service role client for storage upload and signed url creation
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createGenericClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', serviceKey || '');

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filename, buffer, {
        contentType: mime,
        upsert: false
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // Create a signed URL valid for 1 hour
    const { data: signedData, error: signedError } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(uploadData.path, 60 * 60);

    if (signedError) {
      // Fallback to public URL if signed URL fails
      const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(uploadData.path);
      return NextResponse.json({
        path: uploadData.path,
        url: publicData.publicUrl || null,
        name: file.name,
        size,
        mime
      });
    }

    return NextResponse.json({
      path: uploadData.path,
      url: signedData.signedUrl,
      name: file.name,
      size,
      mime
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || 'Upload failed' }, { status: 500 });
  }
}
