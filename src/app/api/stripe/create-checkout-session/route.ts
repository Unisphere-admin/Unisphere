import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getAuthUser } from '@/lib/auth/protectResource';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
});

// Product IDs from your Stripe product catalog
const STRIPE_PRODUCTS = {
  basic: process.env.STRIPE_BASIC_PRODUCT_ID || 'prod_basic_credits',
  standard: process.env.STRIPE_STANDARD_PRODUCT_ID || 'prod_standard_credits', 
  premium: process.env.STRIPE_PREMIUM_PRODUCT_ID || 'prod_premium_credits',
};

export async function POST(req: NextRequest) {
  try {
    // Get authenticated user
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { packageId } = await req.json();

    // Validate package ID
    if (!STRIPE_PRODUCTS[packageId as keyof typeof STRIPE_PRODUCTS]) {
      return NextResponse.json({ error: 'Invalid package selected' }, { status: 400 });
    }

    const productId = STRIPE_PRODUCTS[packageId as keyof typeof STRIPE_PRODUCTS];

    // Fetch the product from Stripe to get current pricing
    const product = await stripe.products.retrieve(productId);
    
    if (!product.active) {
      return NextResponse.json({ error: 'Product is not active' }, { status: 400 });
    }

    // Get all active prices for this product
    const prices = await stripe.prices.list({
      product: productId,
      active: true,
    });

    if (!prices.data.length) {
      return NextResponse.json({ error: 'No active price found for this product' }, { status: 400 });
    }

    // Use the first active price (you can modify this logic if you have multiple prices)
    const price = prices.data[0];

    // Extract credits from product metadata or description
    const credits = product.metadata?.credits || 
                   parseInt(product.description?.match(/(\d+)\s*credits/i)?.[1] || '0') ||
                   500; // fallback

    console.log(`Creating checkout session for product: ${product.name}, price: ${price.unit_amount} ${price.currency}, credits: ${credits}`);

    // Create Stripe checkout session using the product
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: price.id, // Use the Stripe price ID
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.nextUrl.origin}/credits/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.nextUrl.origin}/credits?cancelled=true`,
      metadata: {
        userId: authUser.id,
        packageId,
        credits: credits.toString(),
        productId: productId,
        priceId: price.id,
        productName: product.name,
        has_access: 'true',
      },
      customer_email: authUser.email,
      billing_address_collection: 'auto',
      shipping_address_collection: {
        allowed_countries: [], // No shipping needed for digital products
      },
      allow_promotion_codes: true,
      payment_intent_data: {
        metadata: {
          userId: authUser.id,
          packageId,
          credits: credits.toString(),
          productId: productId,
          has_access: 'true',
        },
      },
      custom_text: {
        submit: {
          message: `You will receive ${credits} credits immediately after payment.`,
        },
      },
    });

    console.log(`Created checkout session: ${session.id} for ${credits} credits`);

    return NextResponse.json({ sessionId: session.id });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
} 