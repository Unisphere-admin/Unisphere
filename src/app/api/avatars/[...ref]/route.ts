import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClientWithCookies } from '@/lib/db/client';
import { getAuthUser } from '@/lib/auth/protectResource';
import sharp from 'sharp';

// Use dynamic to prevent caching for this authenticated endpoint
export const dynamic = 'force-dynamic';

/**
 * API route to serve avatar images, either original or blurred based on user access
 */
export async function GET(request: NextRequest) {
  try {
    // Extract the path segments from the URL
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    
    // Remove 'api' and 'avatars' from the path segments
    const ref = pathSegments.slice(2);
    
    if (!ref || ref.length === 0) {
      return NextResponse.json({ error: 'Avatar reference is required' }, { status: 400 });
    }

    // Join all path segments and clean up any duplicates
    let fullPath = ref.join('/');
    
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
      fullPath,                     // Try the normalized path first
      `public/${fullPath}`,         // Try with public prefix
      fullPath.split('/').pop() || '' // Try just the filename
    ];
    
    // Try each path in sequence
    for (const path of possiblePaths) {
      if (!path) continue;
      
      try {
        const { data, error } = await supabase.storage
          .from(bucket)
          .download(path);
          
        if (!error && data) {
          return handleImageResponse(data, hasPremiumAccess, blurAmount);
        }
      } catch (err) {
        // Continue to next path
      }
    }
    
    // If we've tried all paths and still haven't found the avatar, return 404
    return NextResponse.json({ 
      error: 'Avatar not found',
      attemptedPaths: possiblePaths 
    }, { status: 404 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to process avatar request' },
      { status: 500 }
    );
  }
}

/**
 * Helper function to handle image response
 */
function handleImageResponse(
  data: Blob, 
  hasPremiumAccess: boolean | undefined, 
  blurAmount: number
) {
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
  
  // Process with sharp to blur the image
  return processBlurredImage(data, blurAmount);
}

/**
 * Process image with Sharp for blurring
 */
async function processBlurredImage(data: Blob, blurAmount: number) {
  try {
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
  } catch (error) {
    // If blurring fails, return the original image
    return new NextResponse(data, {
      headers: {
        'Content-Type': data.type || 'image/jpeg',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }
} 