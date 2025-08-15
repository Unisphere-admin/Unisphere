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
          // Use the first active price (you can modify this logic if you have multiple prices)
          const price = prices.data[0];
          
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
            price: price.unit_amount ? price.unit_amount / 100 : 0, // Convert from cents
            currency: price.currency?.toUpperCase() || 'USD',
            priceId: price.id,
            active: product.active,
            priceType: price.type,
            recurring: price.recurring ? {
              interval: price.recurring.interval,
              intervalCount: price.recurring.interval_count,
            } : null,
          };

          console.log(`Fetched product: ${product.name}, price: ${productData.price} ${productData.currency}, credits: ${credits}`);
          products.push(productData);
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