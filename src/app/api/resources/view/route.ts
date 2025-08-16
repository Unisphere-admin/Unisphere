import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/client';
import { getAuthUser } from '@/lib/auth/protectResource';

export async function GET(req: NextRequest) {
  try {
    // Get the path from the query parameters
    const url = new URL(req.url);
    const filePath = url.searchParams.get('path');
    
    if (!filePath) {
      return NextResponse.json({ error: 'No file path provided' }, { status: 400 });
    }
    
    // Check if user is authenticated
    const user = await getAuthUser();
    if (!user) {
      // For unauthenticated users, redirect to login
      return NextResponse.redirect(new URL(`/login?redirectTo=${encodeURIComponent(req.url)}`, req.url));
    }
    
    // Check if user has access to resources
    if (!user.is_tutor && !user.has_access) {
      // For users without access, redirect to paywall
      return NextResponse.redirect(new URL('/credits', req.url));
    }
    
    // Get the file from Supabase storage
    const supabase = createClient();
    const { data, error } = await supabase.storage
      .from('resources')
      .download(filePath);
    
    if (error || !data) {
      console.error('Error downloading file:', error);
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    
    // Determine content type based on file extension
    const fileExtension = filePath.split('.').pop()?.toLowerCase();
    let contentType = 'application/octet-stream'; // Default content type
    
    switch (fileExtension) {
      case 'pdf':
        contentType = 'application/pdf';
        break;
      case 'jpg':
      case 'jpeg':
        contentType = 'image/jpeg';
        break;
      case 'png':
        contentType = 'image/png';
        break;
      case 'txt':
        contentType = 'text/plain';
        break;
      case 'doc':
      case 'docx':
        contentType = 'application/msword';
        break;
      case 'xls':
      case 'xlsx':
        contentType = 'application/vnd.ms-excel';
        break;
      case 'ppt':
      case 'pptx':
        contentType = 'application/vnd.ms-powerpoint';
        break;
    }
    
    // Get the filename from the path
    const fileName = filePath.split('/').pop() || 'file';
    
    // Convert the Blob to ArrayBuffer
    const arrayBuffer = await data.arrayBuffer();
    
    // Return the file with appropriate headers
    return new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${fileName}"`,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error serving file:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 