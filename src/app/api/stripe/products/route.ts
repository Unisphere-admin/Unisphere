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

// Only initialize Stripe if the secret key is available
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-07-30.basil',
    })
  : null;

// Helper function to map credits to package IDs
function getPackageIdFromCredits(credits: number): string {
  if (credits <= 500) return 'basic';
  if (credits <= 1000) return 'standard';
  return 'premium';
}

// Product IDs from your Stripe product catalog
const STRIPE_PRODUCTS = {
  basic: process.env.STRIPE_BASIC_PRODUCT_ID || 'prod_basic_credits',
  standard: process.env.STRIPE_STANDARD_PRODUCT_ID || 'prod_standard_credits',
  premium: process.env.STRIPE_PREMIUM_PRODUCT_ID || 'prod_premium_credits',
};

export async function GET(req: NextRequest) {
  try {
    // If Stripe is not configured, return mock products for local development
    if (!stripe) {
      return NextResponse.json({ products: MOCK_PRODUCTS });
    }
    const products = [];

    // Fetch each product and its pricing
    for (const [packageId, productId] of Object.entries(STRIPE_PRODUCTS)) {
      try {
        // Get the product
        const product = await stripe.products.retrieve(productId);
        
        if (!product.active) {
          continue;
        }

        // Get all active prices for this product
        const prices = await stripe.prices.list({
          product: productId,
          active: true,
          expand: ['data.currency_options'], // Expand currency_options to get full data
        });

        
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
        console.error(`Error fetching product ${productId}:`, error);
        // Continue with other products even if one fails
      }
    }

    return NextResponse.json({ products }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=600' }
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
} 