import { NextRequest, NextResponse } from 'next/server';
import { withRouteAuth } from '@/lib/auth/validateRequest';
import { RtcTokenBuilder, RtcRole } from 'agora-access-token';

// Agora token generator API endpoint
export const GET = withRouteAuth(async (req: NextRequest, user) => {
  try {
    const url = new URL(req.url);
    const channelName = url.searchParams.get('channelName');
    const uidParam = url.searchParams.get('uid');

    if (!channelName) {
      return NextResponse.json(
        { error: 'Channel name is required' },
        { status: 400 }
      );
    }

    // Agora app credentials from environment variables
    const appId = process.env.AGORA_APP_ID;
    const appCertificate = process.env.AGORA_APP_CERTIFICATE;

    if (!appId || !appCertificate) {
      return NextResponse.json(
        { error: 'Agora credentials are not configured' },
        { status: 500 }
      );
    }

    // Set token expiration time (1 hour from now)
    const expirationTimeInSeconds = 3600;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    // Ensure we have a numeric UID for Agora
    let tokenUid: number;
    
    if (uidParam) {
      // Convert to number if provided
      tokenUid = parseInt(uidParam, 10);
      
      // If parsing failed, generate a random UID
      if (isNaN(tokenUid)) {
        tokenUid = Math.floor(Math.random() * 100000);
      }
    } else {
      // Default to a random number if no UID provided
      tokenUid = Math.floor(Math.random() * 100000);
    }
    
    // Build the token with appropriate permissions
    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelName,
      tokenUid,
      RtcRole.PUBLISHER,
      privilegeExpiredTs
    );

    // Return the token
    return NextResponse.json({ token, uid: tokenUid });
  } catch (error) {
    console.error('Error generating Agora token:', error);
    return NextResponse.json(
      { error: 'Failed to generate token' },
      { status: 500 }
    );
  }
}); 