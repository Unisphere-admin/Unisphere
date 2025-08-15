import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import { createRouteHandlerClientWithCookies } from '@/lib/db/client';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'No signature' }, { status: 400 });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    console.log(`Received webhook event: ${event.type}`);

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('Processing checkout session completion:', session.id);
        console.log('Session metadata:', session.metadata);
        
        if (session.payment_status === 'paid') {
          // Process successful payment
          await processSuccessfulPayment(session);
        } else {
          console.log('Session not paid, skipping credit addition:', session.payment_status);
        }
        break;
      
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('Payment intent succeeded:', paymentIntent.id);
        console.log('Payment intent metadata:', paymentIntent.metadata);
        break;
      
      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object as Stripe.PaymentIntent;
        console.log('Payment intent failed:', failedPayment.id);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

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
    console.log('Processing successful payment for session:', session.id);
    console.log('Full session metadata:', session.metadata);
    
    const supabase = await createRouteHandlerClientWithCookies();
    
    if (!supabase) {
      console.error('Failed to create Supabase client');
      return;
    }

    const { userId, credits, packageId, productId, productName } = session.metadata || {};
    
    console.log('Extracted metadata:', { userId, credits, packageId, productId, productName });
    
    if (!userId) {
      console.error('Missing userId in session metadata:', session.metadata);
      return;
    }
    
    if (!credits) {
      console.error('Missing credits in session metadata:', session.metadata);
      return;
    }

    console.log(`Adding ${credits} credits to user ${userId} for package ${packageId} (${productName})`);

    // First get current tokens
    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select('tokens, email, first_name, last_name')
      .eq('id', userId)
      .single();

    if (fetchError) {
      console.error('Failed to fetch user tokens:', fetchError);
      return;
    }

    if (!userData) {
      console.error('User not found in database:', userId);
      return;
    }

    const currentTokens = userData?.tokens || 0;
    const newTokens = currentTokens + parseInt(credits);

    console.log(`User ${userId} (${userData.email}) current tokens: ${currentTokens}, new total: ${newTokens}`);

    // Update user's credit balance
    const { error } = await supabase
      .from('users')
      .update({ 
        tokens: newTokens,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      console.error('Failed to update user credits:', error);
      return;
    }

    console.log(`✅ Successfully added ${credits} credits to user ${userId} (${userData.email}). New balance: ${newTokens}`);
    
    // You could also send an email notification here
    // await sendCreditPurchaseEmail(userData?.email, credits, newTokens, productName);
    
  } catch (error) {
    console.error('Error processing successful payment:', error);
  }
} 