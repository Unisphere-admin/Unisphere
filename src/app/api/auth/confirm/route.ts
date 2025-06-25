import { type EmailOtpType } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClientWithCookies } from '@/lib/db/client'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/'

  if (token_hash && type) {
    const supabase = await createRouteHandlerClientWithCookies()
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })

    if (!error) {
      // redirect user to specified redirect URL or dashboard
      return NextResponse.redirect(new URL(next, request.url))
    } else {
    }
  }

  // Redirect to error page if verification fails
  return NextResponse.redirect(new URL('/error', request.url))
} 