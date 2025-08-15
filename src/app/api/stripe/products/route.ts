import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
});

// Product IDs from your Stripe product catalog
const STRIPE_PRODUCTS = {
  basic: process.env.STRIPE_BASIC_PRODUCT_ID || 'prod_basic_credits',
  standard: process.env.STRIPE_STANDARD_PRODUCT_ID || 'prod_standard_credits', 
  premium: process.env.STRIPE_PREMIUM_PRODUCT_ID || 'prod_premium_credits',
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const country = searchParams.get('country') || 'MY';
    const currency = searchParams.get('currency') || 'MYR';
    
    console.log(`Fetching products for country: ${country}, currency: ${currency}`);
    
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
        });

        if (prices.data.length > 0) {
          // Find the best matching price for the user's location/currency
          let bestPrice = prices.data[0]; // Default to first price
          
          // Try to find a price that matches the user's currency
          const matchingPrice = prices.data.find(price => 
            price.currency?.toLowerCase() === currency.toLowerCase()
          );
          
          if (matchingPrice) {
            bestPrice = matchingPrice;
            console.log(`Found matching price for ${currency}: ${bestPrice.unit_amount} ${bestPrice.currency}`);
          } else {
            console.log(`No matching price for ${currency}, using default: ${bestPrice.unit_amount} ${bestPrice.currency}`);
          }
          
          // Extract credits from product metadata or description
          const credits = product.metadata?.credits || 
                         parseInt(product.description?.match(/(\d+)\s*credits/i)?.[1] || '0') ||
                         500; // fallback

          const productData = {
            packageId,
            productId,
            name: product.name,
            description: product.description,
            credits,
            price: bestPrice.unit_amount ? bestPrice.unit_amount / 100 : 0, // Convert from cents
            currency: bestPrice.currency?.toUpperCase() || 'MYR',
            priceId: bestPrice.id,
            active: product.active,
            priceType: bestPrice.type,
            recurring: bestPrice.recurring ? {
              interval: bestPrice.recurring.interval,
              intervalCount: bestPrice.recurring.interval_count,
            } : null,
            // Add location info
            userCountry: country,
            userCurrency: currency,
            availablePrices: prices.data.map(price => ({
              currency: price.currency?.toUpperCase(),
              amount: price.unit_amount ? price.unit_amount / 100 : 0,
              priceId: price.id
            }))
          };

          console.log(`Fetched product: ${product.name}, price: ${productData.price} ${productData.currency}, credits: ${credits} (for ${country})`);
          products.push(productData);
        } else {
          console.log(`No active prices found for product ${productId}`);
        }
      } catch (error) {
        console.error(`Error fetching product ${productId}:`, error);
        // Continue with other products even if one fails
      }
    }

    console.log(`Returning ${products.length} products for ${country}`);
    return NextResponse.json({ 
      products,
      userLocation: {
        country,
        currency
      }
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
} 