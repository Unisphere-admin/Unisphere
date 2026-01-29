// Supabase Edge Function: send-campaign-emails
// Sends emails to all users in a campaign
// Deploy to Supabase Edge Functions

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { decode as decodeBase64 } from 'https://deno.land/std@0.168.0/encoding/base64.ts';
interface User {
  email: string;
  first_name: string | null;
  last_name: string | null;
}

serve(async (req) => {
  try {
    const { campaignId, subject, htmlBody, users } = (await req.json()) as {
      campaignId: string;
      subject: string;
      htmlBody: string;
      users: User[];
    };

    if (!campaignId || !subject || !htmlBody || !users) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const GMAIL_ACCESS_TOKEN = await getAccessTokenWithServiceAccount();

    let sentCount = 0;
    let failedCount = 0;

    for (const user of users) {
      // Personalize the email
      const personalizedHtml = htmlBody
        .replace(/\{\{first_name\}\}/g, user.first_name || 'there')
        .replace(/\{\{last_name\}\}/g, user.last_name || '')
        .replace(/\{\{email\}\}/g, user.email);

      const rawEmail = buildEmail({
        to: user.email,
        subject,
        htmlBody: personalizedHtml,
      });

      try {
        const res = await fetch(
          'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${GMAIL_ACCESS_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ raw: rawEmail }),
          }
        );

        if (res.ok) {
          // Update email_sends record
          await supabase
            .from('email_sends')
            .update({ status: 'sent', sent_at: new Date().toISOString() })
            .eq('campaign_id', campaignId)
            .eq('email', user.email);

          sentCount++;
          console.log(`✅ Sent to ${user.email}`);
        } else {
          const errorText = await res.text();
          await supabase
            .from('email_sends')
            .update({ status: 'failed', error_message: errorText })
            .eq('campaign_id', campaignId)
            .eq('email', user.email);

          failedCount++;
          console.error(`❌ Failed to send to ${user.email}:`, errorText);
        }
      } catch (err) {
        await supabase
          .from('email_sends')
          .update({ status: 'failed', error_message: String(err) })
          .eq('campaign_id', campaignId)
          .eq('email', user.email);

        failedCount++;
        console.error(`❌ Error sending to ${user.email}:`, err);
      }

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Update campaign status
    await supabase
      .from('email_campaigns')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .eq('id', campaignId);

    console.log(`📧 Campaign complete: ${sentCount} sent, ${failedCount} failed`);

    return new Response(
      JSON.stringify({ success: true, sent: sentCount, failed: failedCount }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-campaign-emails:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

function buildEmail({ to, subject, htmlBody }: { to: string; subject: string; htmlBody: string }) {
  const message = [
    `To: ${to}`,
    'Content-Type: text/html; charset=utf-8',
    'MIME-Version: 1.0',
    `Subject: ${subject}`,
    '',
    htmlBody,
  ].join('\r\n');

  return btoa(unescape(encodeURIComponent(message)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function getAccessTokenWithServiceAccount() {
  const privateKeyPEM = Deno.env.get('GOOGLE_PRIVATE_KEY')?.replaceAll('\\n', '\n');
  const clientEmail = Deno.env.get('GOOGLE_CLIENT_EMAIL');
  const userToImpersonate = 'justin@unisphere.my';

  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 3600;

  const encodeBase64Url = (str: string) =>
    btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const headerEncoded = encodeBase64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claimEncoded = encodeBase64Url(
    JSON.stringify({
      iss: clientEmail,
      scope: 'https://www.googleapis.com/auth/gmail.send',
      aud: 'https://oauth2.googleapis.com/token',
      iat,
      exp,
      sub: userToImpersonate,
    })
  );

  const toSign = `${headerEncoded}.${claimEncoded}`;
  const keyData = decodePEM(privateKeyPEM!);
  const key = await crypto.subtle.importKey(
    'pkcs8',
    keyData,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const sigBuffer = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(toSign)
  );
  const signature = encodeBase64Url(String.fromCharCode(...new Uint8Array(sigBuffer)));

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${toSign}.${signature}`,
    }).toString(),
  });

  const json = await res.json();
  if (!json.access_token) {
    throw new Error('❌ Failed to get access token: ' + JSON.stringify(json));
  }
  return json.access_token;
}

function decodePEM(pem: string) {
  const cleaned = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '');
  return decodeBase64(cleaned);
}
