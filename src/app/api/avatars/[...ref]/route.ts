import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClientWithCookies } from '@/lib/db/client';
import { getAuthUser } from '@/lib/auth/protectResource';
import sharp from 'sharp';

// Use dynamic to prevent caching for this authenticated endpoint
export const dynamic = 'force-dynamic';

/**
 * API route to serve avatar images, either original or blurred based on user access
 * 
 * @param request The incoming request
 * @param params The route parameters, including the avatar reference
 * @returns The avatar image response
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { ref: string[] } }
): Promise<NextResponse> {
  try {
    // Get the reference from the URL - combine all path segments
    if (!params.ref || !Array.isArray(params.ref) || params.ref.length === 0) {
      return NextResponse.json({ error: 'Avatar reference is required' }, { status: 400 });
    }

    // Join all path segments and clean up any duplicates
    let fullPath = params.ref.join('/');
    console.log(`Raw avatar path: ${fullPath}`);
    
    // Remove duplicated segments like 'avatars/avatars' or 'public/public'
    fullPath = fullPath.replace(/\/(avatars|public)\/\1\//g, '/$1/');
    
    // Normalize the path structure
    // 1. Handle paths with 'public' prefix
    if (fullPath.startsWith('public/')) {
      fullPath = fullPath.replace('public/', '');
    }
    
    // 2. If the path still has 'avatars/' at the beginning, remove it
    if (fullPath.startsWith('avatars/')) {
      fullPath = fullPath.replace('avatars/', '');
    }
    
    console.log(`Normalized avatar path: ${fullPath}`);

    // Check if user has premium access
    const authUser = await getAuthUser();
    const hasPremiumAccess = !!authUser?.has_access || !!authUser?.is_tutor;

    // Get the blur amount from query params (default to 10 if not specified)
    const searchParams = request.nextUrl.searchParams;
    const blurAmount = parseInt(searchParams.get('blur') || '10', 10);
    
    // Connect to Supabase
    const supabase = await createRouteHandlerClientWithCookies();
    
    // Determine the bucket
    const bucket = 'avatars';
    
    // Try a series of possible paths to find the avatar
    const possiblePaths = [
      fullPath,                      // Try the normalized path first
      `public/${fullPath}`,          // Try with public prefix
      fullPath.split('/').pop() || '' // Try just the filename
    ];
    
    console.log('Trying these paths:', possiblePaths);
    
    // Try each path in sequence
    for (const path of possiblePaths) {
      if (!path) continue;
      
      console.log(`Attempting to download avatar from: ${path}`);
      try {
        const { data, error } = await supabase.storage
          .from(bucket)
          .download(path);
          
        if (!error && data) {
          console.log(`Successfully fetched avatar from: ${path}`);
          return handleImageResponse(data, hasPremiumAccess, blurAmount);
        } else {
          console.log(`Failed to fetch from ${path}:`, error);
        }
      } catch (err) {
        console.error(`Error fetching from ${path}:`, err);
      }
    }
    
    // If we've tried all paths and still haven't found the avatar, return 404
    console.error('Avatar not found after trying all possible paths');
    return NextResponse.json({ 
      error: 'Avatar not found',
      attemptedPaths: possiblePaths 
    }, { status: 404 });
  } catch (error) {
    console.error('Error processing avatar request:', error);
    return NextResponse.json(
      { error: 'Failed to process avatar request' },
      { status: 500 }
    );
  }
}

/**
 * Helper function to handle image response
 */
async function handleImageResponse(
  data: Blob, 
  hasPremiumAccess: boolean | undefined, 
  blurAmount: number
): Promise<NextResponse> {
  // If user has premium access, return the original image
  if (hasPremiumAccess === true) {
    // Return the original image with appropriate headers
    return new NextResponse(data, {
      headers: {
        'Content-Type': data.type || 'image/jpeg',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }
  
  // Otherwise, blur the image
  const arrayBuffer = await data.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  // Process the image with sharp to add blur
  const blurredImageBuffer = await sharp(buffer)
    .blur(blurAmount)
    .toBuffer();
  
  // Return the blurred image with appropriate headers
  return new NextResponse(blurredImageBuffer, {
    headers: {
      'Content-Type': data.type || 'image/jpeg',
      'Cache-Control': 'public, max-age=3600',
    },
  });
} 