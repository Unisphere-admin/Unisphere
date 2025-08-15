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

async function testStripeProducts() {
  console.log('🔍 Testing Stripe Products Setup...\n');

  for (const [packageId, productId] of Object.entries(STRIPE_PRODUCTS)) {
    console.log(`📦 Testing ${packageId.toUpperCase()} package (${productId}):`);
    
    try {
      // Get the product
      const product = await stripe.products.retrieve(productId);
      console.log(`  ✅ Product found: ${product.name}`);
      console.log(`  📝 Description: ${product.description}`);
      console.log(`  🔧 Active: ${product.active}`);
      console.log(`  🏷️  Metadata:`, product.metadata);

      // Get active prices
      const prices = await stripe.prices.list({
        product: productId,
        active: true,
      });

      if (prices.data.length > 0) {
        const price = prices.data[0];
        console.log(`  💰 Price: ${price.unit_amount / 100} ${price.currency.toUpperCase()}`);
        console.log(`  🆔 Price ID: ${price.id}`);
        console.log(`  📊 Type: ${price.type}`);
        
        if (price.recurring) {
          console.log(`  🔄 Recurring: ${price.recurring.interval_count} ${price.recurring.interval}`);
        }
      } else {
        console.log(`  ❌ No active prices found!`);
      }

      // Extract credits
      const credits = product.metadata?.credits || 
                     parseInt(product.description?.match(/(\d+)\s*credits/i)?.[1] || '0') ||
                     500;
      console.log(`  🎫 Credits: ${credits}`);

    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
    
    console.log('');
  }

  console.log('🎯 Summary:');
  console.log('- Make sure all products are active');
  console.log('- Ensure each product has at least one active price');
  console.log('- Add credits metadata to each product (e.g., credits: 500)');
  console.log('- Verify the product IDs in your environment variables');
}

// Run the test
testStripeProducts().catch(console.error); 