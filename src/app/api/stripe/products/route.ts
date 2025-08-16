import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
});

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
    const products = [];

    // Fetch each product and its pricing
    for (const [packageId, productId] of Object.entries(STRIPE_PRODUCTS)) {
      try {
        // Get the product
        const product = await stripe.products.retrieve(productId);
        
        if (!product.active) {
          console.log(`Product ${productId} is not active, skipping`);
          continue;
        }

        // Get all active prices for this product
        const prices = await stripe.prices.list({
          product: productId,
          active: true,
          expand: ['data.currency_options'], // Expand currency_options to get full data
        });

        console.log(`Found ${prices.data.length} prices for product ${productId}`);
        
        // Alternative: Try to get multi-currency pricing by fetching the product with expand
        try {
          const expandedProduct = await stripe.products.retrieve(productId, {
            expand: ['default_price', 'prices'],
          });
          console.log('Expanded product with prices:', JSON.stringify(expandedProduct, null, 2));
          
          // Check if the expanded product has multi-currency information
          if ((expandedProduct as any).prices && (expandedProduct as any).prices.data) {
            console.log(`Found ${(expandedProduct as any).prices.data.length} prices in expanded product`);
            for (const price of (expandedProduct as any).prices.data) {
              console.log(`Expanded price - currency: ${price.currency}, amount: ${price.unit_amount}, options:`, price.currency_options);
            }
          }
        } catch (expandError) {
          console.log('Could not expand product with prices:', expandError);
        }
        
        console.log('Price objects:', JSON.stringify(prices.data, null, 2));
        
        // Debug: Check the structure of the first price object
        if (prices.data.length > 0) {
          const firstPrice = prices.data[0];
          console.log('First price object structure:');
          console.log('- currency:', firstPrice.currency);
          console.log('- unit_amount:', firstPrice.unit_amount);
          console.log('- currency_options:', firstPrice.currency_options);
          console.log('- has currency_options:', !!firstPrice.currency_options);
          console.log('- currency_options keys:', firstPrice.currency_options ? Object.keys(firstPrice.currency_options) : 'none');
          
          // Detailed currency_options inspection
          if (firstPrice.currency_options) {
            console.log('Currency options details:');
            for (const [currency, data] of Object.entries(firstPrice.currency_options)) {
              console.log(`  ${currency.toUpperCase()}:`, data);
            }
          }
          
          // Show all available fields on the price object
          console.log('All price object fields:', Object.keys(firstPrice));
          console.log('Price object full structure:', JSON.stringify(firstPrice, null, 2));
        }

        if (prices.data.length > 0) {
          // Handle each price (which may have multiple currencies)
          for (const price of prices.data) {
            // Try to get the full price object with currency_options expanded
            try {
              const expandedPrice = await stripe.prices.retrieve(price.id, {
                expand: ['currency_options'],
              });
              console.log(`Expanded price ${price.id}:`, JSON.stringify(expandedPrice, null, 2));
              
              // Use the expanded price data
              const priceToProcess = expandedPrice;
              
              // Extract credits from product metadata or description
              const credits = product.metadata?.credits || 
                             parseInt(product.description?.match(/(\d+)\s*credits/i)?.[1] || '0') ||
                             500; // fallback

              // Check if this price has multiple currencies via currency_options
              if (priceToProcess.currency_options && Object.keys(priceToProcess.currency_options).length > 0) {
                console.log(`Processing multi-currency price with ${Object.keys(priceToProcess.currency_options).length} currencies`);
                
                // Multi-currency price - create entries for each currency
                for (const [currency, currencyData] of Object.entries(priceToProcess.currency_options)) {
                  const currencyInfo = currencyData as any;
                  console.log(`Processing currency: ${currency}, data:`, currencyInfo);
                  
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

                    console.log(`✓ Created product entry: ${product.name}, ${productData.price} ${productData.currency}, ${credits} credits`);
                    products.push(productData);
                  } else {
                    console.log(`⚠ Skipping currency ${currency} - no unit_amount found`);
                  }
                }
              } else if (priceToProcess.metadata && priceToProcess.metadata.currencies) {
                // Alternative: Check if currencies are stored in metadata
                console.log(`Found currencies in metadata:`, priceToProcess.metadata.currencies);
                try {
                  const currencies = JSON.parse(priceToProcess.metadata.currencies);
                  console.log(`Parsed currencies from metadata:`, currencies);
                  
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

                      console.log(`✓ Created product entry from metadata: ${product.name}, ${productData.price} ${productData.currency}, ${credits} credits`);
                      products.push(productData);
                    }
                  }
                } catch (error) {
                  console.log(`Failed to parse currencies from metadata:`, error);
                }
              } else {
                console.log(`Single currency price detected: ${priceToProcess.currency}`);
                
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

                console.log(`✓ Created single-currency product: ${product.name}, ${productData.price} ${productData.currency}, ${credits} credits`);
                products.push(productData);
              }
            } catch (expandError) {
              console.log(`Failed to expand price ${price.id}:`, expandError);
              
              // Fallback to original price processing
              // Extract credits from product metadata or description
              const credits = product.metadata?.credits || 
                             parseInt(product.description?.match(/(\d+)\s*credits/i)?.[1] || '0') ||
                             500; // fallback

              // Check if this price has multiple currencies via currency_options
              if (price.currency_options && Object.keys(price.currency_options).length > 0) {
                console.log(`Processing multi-currency price with ${Object.keys(price.currency_options).length} currencies`);
                
                // Multi-currency price - create entries for each currency
                for (const [currency, currencyData] of Object.entries(price.currency_options)) {
                  const currencyInfo = currencyData as any;
                  console.log(`Processing currency: ${currency}, data:`, currencyInfo);
                  
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

                    console.log(`✓ Created product entry: ${product.name}, ${productData.price} ${productData.currency}, ${credits} credits`);
                    products.push(productData);
                  } else {
                    console.log(`⚠ Skipping currency ${currency} - no unit_amount found`);
                  }
                }
              } else if (price.metadata && price.metadata.currencies) {
                // Alternative: Check if currencies are stored in metadata
                console.log(`Found currencies in metadata:`, price.metadata.currencies);
                try {
                  const currencies = JSON.parse(price.metadata.currencies);
                  console.log(`Parsed currencies from metadata:`, currencies);
                  
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

                      console.log(`✓ Created product entry from metadata: ${product.name}, ${productData.price} ${productData.currency}, ${credits} credits`);
                      products.push(productData);
                    }
                  }
                } catch (error) {
                  console.log(`Failed to parse currencies from metadata:`, error);
                }
              } else {
                console.log(`Single currency price detected: ${price.currency}`);
                
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

                console.log(`✓ Created single-currency product: ${product.name}, ${productData.price} ${productData.currency}, ${credits} credits`);
                products.push(productData);
              }
            }
          }
        } else {
          console.log(`No active prices found for product ${productId}`);
        }
      } catch (error) {
        console.error(`Error fetching product ${productId}:`, error);
        // Continue with other products even if one fails
      }
    }

    console.log(`Returning ${products.length} products`);
    return NextResponse.json({ products });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
} 