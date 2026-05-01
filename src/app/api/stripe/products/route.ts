import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// Mock products for local development when Stripe keys are not configured
const MOCK_PRODUCTS = [
  {
    packageId: 'basic',
    productId: 'mock_prod_basic',
    name: 'Starter Pack',
    description: '500 credits to get started with tutoring sessions',
    credits: 500,
    price: 29.99,
    currency: 'USD',
    priceId: 'mock_price_basic_usd',
    active: true,
    priceType: 'one_time',
    recurring: null,
  },
  {
    packageId: 'basic',
    productId: 'mock_prod_basic',
    name: 'Starter Pack',
    description: '500 credits to get started with tutoring sessions',
    credits: 500,
    price: 24.99,
    currency: 'GBP',
    priceId: 'mock_price_basic_gbp',
    active: true,
    priceType: 'one_time',
    recurring: null,
  },
  {
    packageId: 'standard',
    productId: 'mock_prod_standard',
    name: 'Growth Pack',
    description: '1000 credits for regular tutoring sessions',
    credits: 1000,
    price: 49.99,
    currency: 'USD',
    priceId: 'mock_price_standard_usd',
    active: true,
    priceType: 'one_time',
    recurring: null,
  },
  {
    packageId: 'standard',
    productId: 'mock_prod_standard',
    name: 'Growth Pack',
    description: '1000 credits for regular tutoring sessions',
    credits: 1000,
    price: 42.99,
    currency: 'GBP',
    priceId: 'mock_price_standard_gbp',
    active: true,
    priceType: 'one_time',
    recurring: null,
  },
  {
    packageId: 'premium',
    productId: 'mock_prod_premium',
    name: 'Premium Pack',
    description: '2000 credits for intensive tutoring and exam prep',
    credits: 2000,
    price: 99.99,
    currency: 'USD',
    priceId: 'mock_price_premium_usd',
    active: true,
    priceType: 'one_time',
    recurring: null,
  },
  {
    packageId: 'premium',
    productId: 'mock_prod_premium',
    name: 'Premium Pack',
    description: '2000 credits for intensive tutoring and exam prep',
    credits: 2000,
    price: 84.99,
    currency: 'GBP',
    priceId: 'mock_price_premium_gbp',
    active: true,
    priceType: 'one_time',
    recurring: null,
  },
];

// Only initialize Stripe if the secret key is available.
// We deliberately don't pin apiVersion — letting the Node SDK pick its
// own default avoids the situation where a hardcoded future version
// triggers a connection-level rejection because the account/SDK pair
// doesn't recognise it. Trim the env var defensively in case the value
// was pasted with a trailing newline/space (Vercel UI doesn't strip).
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY.trim())
  : null;

// Helper function to map credits to package IDs
function getPackageIdFromCredits(credits: number): string {
  if (credits <= 500) return 'basic';
  if (credits <= 1000) return 'standard';
  return 'premium';
}

// Product IDs from your Stripe product catalog.
// The fallback strings are the real live Stripe product IDs for unisphere.my,
// not placeholders. We used to fall back to `prod_basic_credits` etc., which
// were never registered in Stripe — so when the Vercel env vars went missing
// the route silently swallowed three retrieve() failures and returned
// `{ products: [] }`, surfacing as "No pricing information available" on the
// credits page. Hardcoding the real IDs as defaults keeps the page working
// even if env config drifts. Override via env if you ever rotate products.
const STRIPE_PRODUCTS = {
  basic: process.env.STRIPE_BASIC_PRODUCT_ID || 'prod_Sri2gdZiDBKoaz',     // 500 credits
  standard: process.env.STRIPE_STANDARD_PRODUCT_ID || 'prod_Sri213PV6ieQmU', // 1000 credits
  premium: process.env.STRIPE_PREMIUM_PRODUCT_ID || 'prod_Sri2lQOmsvP5jG',   // 2000 credits
};

export async function GET(req: NextRequest) {
  try {
    // If Stripe is not configured, return mock products for local development
    if (!stripe) {
      console.warn('[stripe/products] STRIPE_SECRET_KEY not set — returning mock products for local development');
      return NextResponse.json({ products: MOCK_PRODUCTS });
    }
    const products = [];
    // Per-product failures we hit on the way through. Surfaced in the 500
    // response so production logs (and the on-call engineer) can see exactly
    // which Stripe product caused the empty response, instead of a generic
    // "pricing unavailable" with no breadcrumbs.
    const failures: Array<{ packageId: string; productId: string; reason: string }> = [];

    // Fetch each product and its pricing
    for (const [packageId, productId] of Object.entries(STRIPE_PRODUCTS)) {
      try {
        // Get the product
        const product = await stripe.products.retrieve(productId);

        if (!product.active) {
          console.warn(`[stripe/products] ${packageId} (${productId}) is inactive in Stripe — skipping`);
          failures.push({ packageId, productId, reason: 'product inactive in Stripe' });
          continue;
        }

        // Get all active prices for this product
        const prices = await stripe.prices.list({
          product: productId,
          active: true,
          expand: ['data.currency_options'], // Expand currency_options to get full data
        });

        if (prices.data.length === 0) {
          console.warn(`[stripe/products] ${packageId} (${productId}) has no active prices in Stripe — skipping`);
          failures.push({ packageId, productId, reason: 'no active prices in Stripe' });
          continue;
        }

        
        // Alternative: Try to get multi-currency pricing by fetching the product with expand
        try {
          const expandedProduct = await stripe.products.retrieve(productId, {
            expand: ['default_price', 'prices'],
          });
          
          // Check if the expanded product has multi-currency information
          if ((expandedProduct as any).prices && (expandedProduct as any).prices.data) {
            for (const price of (expandedProduct as any).prices.data) {
            }
          }
        } catch (expandError) {
        }
        
        
        // Debug: Check the structure of the first price object
        if (prices.data.length > 0) {
          const firstPrice = prices.data[0];
          
          // Detailed currency_options inspection
          if (firstPrice.currency_options) {
            for (const [currency, data] of Object.entries(firstPrice.currency_options)) {
            }
          }
          
          // Show all available fields on the price object
        }

        if (prices.data.length > 0) {
          // Handle each price (which may have multiple currencies)
          for (const price of prices.data) {
            // Try to get the full price object with currency_options expanded
            try {
              const expandedPrice = await stripe.prices.retrieve(price.id, {
                expand: ['currency_options'],
              });
              
              // Use the expanded price data
              const priceToProcess = expandedPrice;
              
              // Extract credits from product metadata or description
              const credits = product.metadata?.credits || 
                             parseInt(product.description?.match(/(\d+)\s*credits/i)?.[1] || '0') ||
                             500; // fallback

              // Check if this price has multiple currencies via currency_options
              if (priceToProcess.currency_options && Object.keys(priceToProcess.currency_options).length > 0) {
                
                // Multi-currency price - create entries for each currency
                for (const [currency, currencyData] of Object.entries(priceToProcess.currency_options)) {
                  const currencyInfo = currencyData as any;
                  
                  if (currencyInfo.unit_amount) {
                    const productData = {
                      packageId: getPackageIdFromCredits(Number(credits)),
                      productId,
                      name: product.name,
                      description: product.description,
                      credits,
                      price: currencyInfo.unit_amount / 100, // Convert from cents
                      currency: currency.toUpperCase(),
                      priceId: priceToProcess.id,
                      active: product.active,
                      priceType: priceToProcess.type,
                      recurring: priceToProcess.recurring ? {
                        interval: priceToProcess.recurring.interval,
                        intervalCount: priceToProcess.recurring.interval_count,
                      } : null,
                    };

                    products.push(productData);
                  } else {
                  }
                }
              } else if (priceToProcess.metadata && priceToProcess.metadata.currencies) {
                // Alternative: Check if currencies are stored in metadata
                try {
                  const currencies = JSON.parse(priceToProcess.metadata.currencies);
                  
                  // Process currencies from metadata
                  for (const [currency, priceData] of Object.entries(currencies)) {
                    const currencyInfo = priceData as any;
                    if (currencyInfo.amount) {
                      const productData = {
                        packageId: getPackageIdFromCredits(Number(credits)),
                        productId,
                        name: product.name,
                        description: product.description,
                        credits,
                        price: currencyInfo.amount / 100, // Convert from cents
                        currency: currency.toUpperCase(),
                        priceId: priceToProcess.id,
                        active: product.active,
                        priceType: priceToProcess.type,
                        recurring: priceToProcess.recurring ? {
                          interval: priceToProcess.recurring.interval,
                          intervalCount: priceToProcess.recurring.interval_count,
                        } : null,
                      };

                      products.push(productData);
                    }
                  }
                } catch (error) {
                }
              } else {
                
                // Single currency price (fallback for backward compatibility)
                const productData = {
                  packageId: getPackageIdFromCredits(Number(credits)),
                  productId,
                  name: product.name,
                  description: product.description,
                  credits,
                  price: priceToProcess.unit_amount ? priceToProcess.unit_amount / 100 : 0,
                  currency: priceToProcess.currency?.toUpperCase() || 'USD',
                  priceId: priceToProcess.id,
                  active: product.active,
                  priceType: priceToProcess.type,
                  recurring: priceToProcess.recurring ? {
                    interval: priceToProcess.recurring.interval,
                    intervalCount: priceToProcess.recurring.interval_count,
                  } : null,
                };

                products.push(productData);
              }
            } catch (expandError) {
              
              // Fallback to original price processing
              // Extract credits from product metadata or description
              const credits = product.metadata?.credits || 
                             parseInt(product.description?.match(/(\d+)\s*credits/i)?.[1] || '0') ||
                             500; // fallback

              // Check if this price has multiple currencies via currency_options
              if (price.currency_options && Object.keys(price.currency_options).length > 0) {
                
                // Multi-currency price - create entries for each currency
                for (const [currency, currencyData] of Object.entries(price.currency_options)) {
                  const currencyInfo = currencyData as any;
                  
                  if (currencyInfo.unit_amount) {
                    const productData = {
                      packageId: getPackageIdFromCredits(Number(credits)),
                      productId,
                      name: product.name,
                      description: product.description,
                      credits,
                      price: currencyInfo.unit_amount / 100, // Convert from cents
                      currency: currency.toUpperCase(),
                      priceId: price.id,
                      active: product.active,
                      priceType: price.type,
                      recurring: price.recurring ? {
                        interval: price.recurring.interval,
                        intervalCount: price.recurring.interval_count,
                      } : null,
                    };

                    products.push(productData);
                  } else {
                  }
                }
              } else if (price.metadata && price.metadata.currencies) {
                // Alternative: Check if currencies are stored in metadata
                try {
                  const currencies = JSON.parse(price.metadata.currencies);
                  
                  // Process currencies from metadata
                  for (const [currency, priceData] of Object.entries(currencies)) {
                    const currencyInfo = priceData as any;
                    if (currencyInfo.amount) {
                      const productData = {
                        packageId: getPackageIdFromCredits(Number(credits)),
                        productId,
                        name: product.name,
                        description: product.description,
                        credits,
                        price: currencyInfo.amount / 100, // Convert from cents
                        currency: currency.toUpperCase(),
                        priceId: price.id,
                        active: product.active,
                        priceType: price.type,
                        recurring: price.recurring ? {
                          interval: price.recurring.interval,
                          intervalCount: price.recurring.interval_count,
                        } : null,
                      };

                      products.push(productData);
                    }
                  }
                } catch (error) {
                }
              } else {
                
                // Single currency price (fallback for backward compatibility)
                const productData = {
                  packageId: getPackageIdFromCredits(Number(credits)),
                  productId,
                  name: product.name,
                  description: product.description,
                  credits,
                  price: price.unit_amount ? price.unit_amount / 100 : 0,
                  currency: price.currency?.toUpperCase() || 'USD',
                  priceId: price.id,
                  active: product.active,
                  priceType: price.type,
                  recurring: price.recurring ? {
                    interval: price.recurring.interval,
                    intervalCount: price.recurring.interval_count,
                  } : null,
                };

                products.push(productData);
              }
            }
          }
        } else {
        }
      } catch (error) {
        // Capture the actual Stripe error type/code/message so production
        // logs tell us exactly what went wrong (resource_missing, invalid
        // API key, archived product, etc.) instead of a generic "Error".
        const stripeErr = error as any;
        const reason = stripeErr?.code
          ? `${stripeErr.type || 'StripeError'}: ${stripeErr.code} — ${stripeErr.message}`
          : (stripeErr?.message || String(error));
        console.error(`[stripe/products] ${packageId} (${productId}) failed: ${reason}`);
        failures.push({ packageId, productId, reason });
        // Continue with other products even if one fails
      }
    }

    // If we somehow ended up with zero products after iterating all configured
    // product IDs, that's a server-side configuration problem (bad product
    // IDs, archived products, bad API key, Stripe outage). Return 500 with
    // the per-product failure list so production logs and Sentry have real
    // breadcrumbs instead of a generic "pricing unavailable".
    if (products.length === 0) {
      console.error(
        '[stripe/products] returned zero entries.',
        'Failures:', JSON.stringify(failures, null, 2),
        '\nCheck (1) STRIPE_SECRET_KEY env var on Vercel,',
        '(2) STRIPE_*_PRODUCT_ID env vars or hardcoded fallbacks in this file,',
        '(3) that those products are active in Stripe with at least one active price.'
      );
      return NextResponse.json(
        {
          error: 'Pricing temporarily unavailable. Please try again shortly.',
          // `failures` is safe to send to the client — it doesn't contain
          // secrets, just product IDs and Stripe error codes. Helpful when
          // debugging from the network tab instead of needing Vercel access.
          failures,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ products }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=600' }
    });
  } catch (error) {
    const stripeErr = error as any;
    console.error(
      '[stripe/products] top-level failure:',
      stripeErr?.code
        ? `${stripeErr.type || 'StripeError'}: ${stripeErr.code} — ${stripeErr.message}`
        : (stripeErr?.message || String(error))
    );
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}