import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getAuthUser } from '@/lib/auth/protectResource';

// Only initialize Stripe if the secret key is available.
// No pinned apiVersion — let the SDK use its default. Trim the env var
// defensively against accidental whitespace.
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY.trim())
  : null;

// Product IDs from your Stripe product catalog. See the long comment in
// src/app/api/stripe/products/route.ts — defaults are the real live IDs so
// checkout still works even if Vercel env config drifts.
const STRIPE_PRODUCTS = {
  basic: process.env.STRIPE_BASIC_PRODUCT_ID || 'prod_Sri2gdZiDBKoaz',     // 500 credits
  standard: process.env.STRIPE_STANDARD_PRODUCT_ID || 'prod_Sri213PV6ieQmU', // 1000 credits
  premium: process.env.STRIPE_PREMIUM_PRODUCT_ID || 'prod_Sri2lQOmsvP5jG',   // 2000 credits
};

export async function POST(req: NextRequest) {
  try {
    // Get authenticated user
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // If Stripe is not configured, return a friendly error for local dev
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe is not configured. This is a local development environment -- no real purchases can be made.' },
        { status: 503 }
      );
    }

    const { packageId, priceId, currency } = await req.json();

    // Validate package ID
    if (!STRIPE_PRODUCTS[packageId as keyof typeof STRIPE_PRODUCTS]) {
      return NextResponse.json({ error: 'Invalid package selected' }, { status: 400 });
    }
    if (!priceId || typeof priceId !== 'string') {
      return NextResponse.json({ error: 'Missing priceId' }, { status: 400 });
    }
    if (!currency || typeof currency !== 'string') {
      return NextResponse.json({ error: 'Missing currency' }, { status: 400 });
    }

    const productId = STRIPE_PRODUCTS[packageId as keyof typeof STRIPE_PRODUCTS];

    // Fetch the product from Stripe to get current pricing
    const product = await stripe.products.retrieve(productId);

    if (!product.active) {
      return NextResponse.json({ error: 'Product is not active' }, { status: 400 });
    }

    // Fetch the SPECIFIC price the client requested, with currency_options
    // expanded so we can verify the requested currency is actually supported.
    // This is also our anti-tampering check: if the priceId doesn't belong
    // to the product we expect for this packageId, refuse the request.
    const price = await stripe.prices.retrieve(priceId, { expand: ['currency_options'] });
    if (!price.active) {
      return NextResponse.json({ error: 'Price is no longer active' }, { status: 400 });
    }
    const priceProductId = typeof price.product === 'string' ? price.product : price.product?.id;
    if (priceProductId !== productId) {
      console.error(`[create-checkout-session] priceId ${priceId} doesn't belong to product ${productId} for packageId ${packageId}`);
      return NextResponse.json({ error: 'Price does not match selected package' }, { status: 400 });
    }

    // Confirm the requested currency is one this price actually supports —
    // either as the price's base currency or via currency_options. This
    // guarantees the Checkout Session will charge in the same currency the
    // user saw on the credits card.
    const requestedCurrency = currency.toLowerCase();
    const baseCurrency = price.currency?.toLowerCase();
    const currencyOpts = (price as any).currency_options || {};
    const supported =
      requestedCurrency === baseCurrency ||
      Object.keys(currencyOpts).map((c) => c.toLowerCase()).includes(requestedCurrency);
    if (!supported) {
      console.error(`[create-checkout-session] currency ${requestedCurrency} not supported by price ${priceId} (base ${baseCurrency}, opts ${Object.keys(currencyOpts).join(',')})`);
      return NextResponse.json({ error: 'Selected currency is not supported by this price' }, { status: 400 });
    }

    // Extract credits from product metadata or description.
    // We intentionally do NOT fall back to a default - a misconfigured product
    // should surface as an error rather than silently granting free credits.
    const creditsRaw =
      product.metadata?.credits ||
      product.description?.match(/(\d+)\s*credits/i)?.[1];

    if (!creditsRaw || parseInt(creditsRaw) <= 0) {
      console.error(`Stripe product ${productId} has no valid credits metadata or description`);
      return NextResponse.json(
        { error: 'Product configuration error - credits not defined. Contact support.' },
        { status: 500 }
      );
    }

    const credits = parseInt(creditsRaw);


    // Create Stripe checkout session — explicitly pass the requested currency
    // so Stripe charges in the same currency the user saw on the credits page.
    // For prices with currency_options, this picks that option; for single-
    // currency prices, it's a no-op (Stripe just confirms it matches).
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      currency: requestedCurrency,
      line_items: [
        {
          price: price.id,
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
        currency: requestedCurrency,
        productName: product.name,
        has_access: 'true',
      },
      customer_email: authUser.email,
      billing_address_collection: 'auto',
      allow_promotion_codes: true,
      payment_intent_data: {
        metadata: {
          userId: authUser.id,
          packageId,
          credits: credits.toString(),
          productId: productId,
          currency: requestedCurrency,
          has_access: 'true',
        },
      },
      custom_text: {
        submit: {
          message: `You will receive ${credits} credits immediately after payment.`,
        },
      },
    });


    return NextResponse.json({ sessionId: session.id });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
} 