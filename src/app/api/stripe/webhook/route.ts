import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-07-30.basil',
    })
  : null;

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  try {
    if (!stripe || !webhookSecret) {
      console.error('Stripe or webhook secret not configured');
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
    }

    const rawBody = await req.arrayBuffer();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'No signature' }, { status: 400 });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(Buffer.from(rawBody), signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }


    // ── Idempotency guard ────────────────────────────────────────────────────
    // Stripe retries webhooks on failure for up to 3 days. We record each
    // event.id after processing so retries are silently skipped instead of
    // crediting the user twice.
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: existing } = await supabaseAdmin
      .from('processed_stripe_events')
      .select('event_id')
      .eq('event_id', event.id)
      .maybeSingle();

    if (existing) {
      // Already processed - return 200 so Stripe stops retrying
      return NextResponse.json({ received: true, duplicate: true });
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.payment_status === 'paid') {
          // Process successful payment
          await processSuccessfulPayment(session);
        }
        break;
      
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        break;
      
      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object as Stripe.PaymentIntent;
        break;
      
      default:
    }

    // Mark event as processed so retries are skipped
    await supabaseAdmin
      .from('processed_stripe_events')
      .insert({ event_id: event.id, event_type: event.type });

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function processSuccessfulPayment(session: Stripe.Checkout.Session) {
  try {
    
    // Create service role client to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    if (!supabase) {
      console.error('Failed to create Supabase client');
      return;
    }

    const { userId, credits, packageId, productId, productName } = session.metadata || {};
    
    
    if (!userId) {
      console.error('Missing userId in session metadata:', session.metadata);
      return;
    }
    
    if (!credits) {
      console.error('Missing credits in session metadata:', session.metadata);
      return;
    }

    
    // 🧪 ENHANCED PAYMENT TESTING & VALIDATION
    const paymentAmount = session.amount_total ? session.amount_total / 100 : 0;
    const currency = session.currency?.toUpperCase() || 'UNKNOWN';
    
    // Validate credit amount to catch calculation errors
    const creditsNum = parseInt(credits);
    if (creditsNum <= 0 || creditsNum > 10000) {
      console.error(`❌ INVALID CREDITS: ${credits} credits is out of range (1-10000)`);
      console.error(`🚨 SESSION DATA:`, session.metadata);
      return;
    }
    
    // Check for suspicious credit-to-payment ratios
    if (paymentAmount > 0) {
      const creditsPerUnit = creditsNum / paymentAmount;
      
      if (creditsPerUnit > 50 || creditsPerUnit < 0.1) {
        console.warn(`⚠️  SUSPICIOUS RATIO: ${creditsPerUnit.toFixed(2)} credits per ${currency}`);
        console.warn(`🔍 Expected ranges: 0.5-2 credits/MYR, 20-50 credits/USD`);
      }
    }

    // First get current tokens with detailed logging
    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select('tokens, email, has_access, is_tutor')
      .eq('id', userId)
      .single();

    if (fetchError) {
      console.error('❌ FAILED TO FETCH USER:', fetchError);
      console.error('🔍 USER ID:', userId);
      return;
    }

    if (!userData) {
      console.error('❌ USER NOT FOUND in database:', userId);
      return;
    }


    const currentTokens = userData.tokens || 0;
    const newTokens = currentTokens + parseInt(credits);


    // 🚨 CRITICAL FIX: Update credits AND grant premium access
    const updateStart = Date.now();
    
    const { error, data: updateResult } = await supabase
      .from('users')
      .update({ 
        tokens: newTokens,
        has_access: true,  // 🎯 CRITICAL: Grant premium access after payment
      })
      .eq('id', userId)
      .select('tokens, has_access');  // Return updated data for verification

    const updateDuration = Date.now() - updateStart;

    if (error) {
      console.error('❌ DATABASE UPDATE FAILED:', error);
      console.error('🔍 UPDATE DETAILS:', { userId, newTokens, credits, packageId });
      console.error('⏱️  UPDATE DURATION:', updateDuration, 'ms');
      return;
    }

    
    // Verify the update was successful
    if (updateResult && updateResult.length > 0) {
      const updated = updateResult[0];
      
      // Double-check the update was correct
      if (updated.tokens !== newTokens) {
        console.error(`🚨 MISMATCH: Expected ${newTokens} credits, but database shows ${updated.tokens}`);
      }
      if (!updated.has_access) {
        console.error(`🚨 ACCESS ISSUE: has_access should be true but shows ${updated.has_access}`);
      }
    } else {
      console.warn(`⚠️  NO UPDATE RESULT returned from database`);
    }

    
    // You could also send an email notification here
    // await sendCreditPurchaseEmail(userData?.email, credits, newTokens, productName);
    
  } catch (error) {
    console.error('Error processing successful payment:', error);
  }
} 