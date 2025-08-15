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

    const { packageId, currency } = await req.json();

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

    // Find the best matching price for the user's currency
    let bestPrice = prices.data[0]; // Default to first price
    
    if (currency) {
      const matchingPrice = prices.data.find(price => 
        price.currency?.toLowerCase() === currency.toLowerCase()
      );
      
      if (matchingPrice) {
        bestPrice = matchingPrice;
        console.log(`Using price for ${currency}: ${bestPrice.unit_amount} ${bestPrice.currency}`);
      } else {
        console.log(`No matching price for ${currency}, using default: ${bestPrice.unit_amount} ${bestPrice.currency}`);
      }
    }

    // Extract credits from product metadata or description
    const credits = product.metadata?.credits || 
                   parseInt(product.description?.match(/(\d+)\s*credits/i)?.[1] || '0') ||
                   500; // fallback

    console.log(`Creating checkout session for product: ${product.name}, price: ${bestPrice.unit_amount} ${bestPrice.currency}, credits: ${credits}`);

    // Create Stripe checkout session using the product
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: bestPrice.id, // Use the Stripe price ID for the user's currency
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
        priceId: bestPrice.id,
        productName: product.name,
        userCurrency: currency || bestPrice.currency || 'MYR',
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
          userCurrency: currency || bestPrice.currency || 'MYR',
        },
      },
      custom_text: {
        submit: {
          message: `You will receive ${credits} credits immediately after payment.`,
        },
      },
    });

    console.log(`Created checkout session: ${session.id} for ${credits} credits in ${bestPrice.currency}`);

    return NextResponse.json({ sessionId: session.id });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
} 