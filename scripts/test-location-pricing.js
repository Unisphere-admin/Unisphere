const Stripe = require('stripe');

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-07-30.basil',
});

// Product IDs from your Stripe product catalog
const STRIPE_PRODUCTS = {
  basic: process.env.STRIPE_BASIC_PRODUCT_ID || 'prod_basic_credits',
  standard: process.env.STRIPE_STANDARD_PRODUCT_ID || 'prod_standard_credits', 
  premium: process.env.STRIPE_PREMIUM_PRODUCT_ID || 'prod_premium_credits',
};

// Test different locations and currencies (focusing on current pricing)
const testLocations = [
  { country: 'MY', currency: 'MYR' }, // Default currency
  { country: 'GB', currency: 'GBP' },
  { country: 'HK', currency: 'HKD' },
  { country: 'SG', currency: 'SGD' },
  { country: 'US', currency: 'USD' },
  // Test some other countries that should default to MYR
  { country: 'CA', currency: 'MYR' },
  { country: 'AU', currency: 'MYR' },
  { country: 'JP', currency: 'MYR' },
  { country: 'IN', currency: 'MYR' },
];

async function testLocationPricing() {
  console.log('🌍 Testing Location-Based Pricing (MYR Default)...\n');

  for (const location of testLocations) {
    console.log(`📍 Testing ${location.country} (${location.currency}):`);
    
    for (const [packageId, productId] of Object.entries(STRIPE_PRODUCTS)) {
      try {
        // Get the product
        const product = await stripe.products.retrieve(productId);
        
        if (!product.active) {
          console.log(`  ❌ Product ${productId} is not active`);
          continue;
        }

        // Get all active prices for this product
        const prices = await stripe.prices.list({
          product: productId,
          active: true,
        });

        if (prices.data.length > 0) {
          // Find matching price for this currency
          const matchingPrice = prices.data.find(price => 
            price.currency?.toLowerCase() === location.currency.toLowerCase()
          );
          
          const bestPrice = matchingPrice || prices.data[0];
          
          const credits = product.metadata?.credits || 
                         parseInt(product.description?.match(/(\d+)\s*credits/i)?.[1] || '0') ||
                         500;

          console.log(`  📦 ${packageId.toUpperCase()}: ${credits} credits`);
          console.log(`     💰 Price: ${bestPrice.unit_amount / 100} ${bestPrice.currency.toUpperCase()}`);
          
          if (matchingPrice) {
            console.log(`     ✅ Found matching price for ${location.currency}`);
          } else {
            console.log(`     ⚠️  No matching price for ${location.currency}, using default`);
          }
          
          // Show all available prices for this product
          console.log(`     📋 Available prices:`);
          prices.data.forEach(price => {
            const isMatching = price.currency?.toLowerCase() === location.currency.toLowerCase();
            const marker = isMatching ? '✅' : '  ';
            console.log(`        ${marker} ${price.unit_amount / 100} ${price.currency.toUpperCase()}`);
          });
        } else {
          console.log(`  ❌ No active prices found for ${packageId}`);
        }

      } catch (error) {
        console.log(`  ❌ Error testing ${packageId}: ${error.message}`);
      }
    }
    console.log('');
  }

  console.log('🎯 Summary:');
  console.log('- MYR is now the default currency for most countries');
  console.log('- Current supported currencies: MYR, GBP, HKD, SGD, USD');
  console.log('- The system will automatically select the best matching price for each user\'s location');
  console.log('- If no matching price is found, it will fall back to the default price');
  console.log('- Test the actual checkout flow to ensure the correct prices are being used');
  console.log('');
  console.log('💡 Setup Tips:');
  console.log('- Make sure you have MYR prices set up in Stripe for each product');
  console.log('- Consider setting up prices in GBP, HKD, SGD, and USD for better user experience');
  console.log('- Test with users from different countries to verify the pricing works correctly');
}

// Run the test
testLocationPricing().catch(console.error); 