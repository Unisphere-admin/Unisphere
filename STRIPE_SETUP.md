# Stripe Integration Setup

This document explains how to set up Stripe payment processing for the credits/top-up system using Stripe's hosted checkout and product catalog.

## Environment Variables

Add the following environment variables to your `.env.local` file:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_... # Your Stripe secret key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... # Your Stripe publishable key
STRIPE_WEBHOOK_SECRET=whsec_... # Your Stripe webhook secret

# Stripe Product IDs (get these from your Stripe dashboard)
STRIPE_BASIC_PRODUCT_ID=prod_... # Basic credits package
STRIPE_STANDARD_PRODUCT_ID=prod_... # Standard credits package
STRIPE_PREMIUM_PRODUCT_ID=prod_... # Premium credits package
```

## Stripe Dashboard Setup

1. **Create a Stripe Account**: Sign up at [stripe.com](https://stripe.com)

2. **Get API Keys**:
   - Go to Developers > API keys in your Stripe dashboard
   - Copy the publishable key and secret key
   - Use test keys for development, live keys for production

3. **Create Products in Stripe**:
   - Go to Products in your Stripe dashboard
   - Create three products for your credit packages:
     
     **Basic Package:**
     - Name: "Basic Credits Package"
     - Description: "500 credits for tutoring sessions and marketplace items"
     - Add metadata: `credits: 500`
     - Set price (e.g., $15.00 USD)
     
     **Standard Package:**
     - Name: "Standard Credits Package" 
     - Description: "1000 credits for tutoring sessions and marketplace items"
     - Add metadata: `credits: 1000`
     - Set price (e.g., $27.50 USD)
     
     **Premium Package:**
     - Name: "Premium Credits Package"
     - Description: "2000 credits for tutoring sessions and marketplace items"
     - Add metadata: `credits: 2000`
     - Set price (e.g., $50.00 USD)
   
   - Copy the Product IDs and add them to your environment variables

4. **Set Up Webhooks**:
   - Go to Developers > Webhooks in your Stripe dashboard
   - Click "Add endpoint"
   - Set the endpoint URL to: `https://yourdomain.com/api/stripe/webhook`
   - Select these events:
     - `checkout.session.completed`
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
   - Copy the webhook signing secret

5. **Configure Checkout Settings** (Optional):
   - Go to Settings > Checkout in your Stripe dashboard
   - Customize the checkout page appearance
   - Set up tax collection if needed
   - Configure email receipts

## Testing Your Setup

### 1. Test Product Configuration

Run the test script to verify your Stripe products are set up correctly:

```bash
# Make sure your environment variables are loaded
node scripts/test-stripe-products.js
```

This will show you:
- ✅ Product details and metadata
- 💰 Current pricing
- 🎫 Credit amounts
- ❌ Any configuration issues

### 2. Test the Complete Flow

1. **Start your development server**:
   ```bash
   npm run dev
   ```

2. **Visit the credits page**: `http://localhost:3000/credits`

3. **Check the browser console** for any errors

4. **Test a purchase**:
   - Select a package
   - Complete checkout with test card: `4242 4242 4242 4242`
   - Verify credits are added to user account

### 3. Test API Endpoints

Test the products API directly:
```bash
curl http://localhost:3000/api/stripe/products
```

## How It Works

1. **User visits `/credits` page** - System fetches product information from Stripe
2. **User selects a credit package** - Display shows current pricing from Stripe
3. **System creates a Stripe checkout session** using the selected product
4. **User is redirected to Stripe's hosted checkout page** for secure payment
5. **After payment, Stripe sends webhook** to your server
6. **Server verifies payment and adds credits** to user's account
7. **User is redirected to success page** with payment confirmation

## Benefits of Using Stripe Products

- **Centralized Pricing**: Manage all pricing in Stripe dashboard
- **Real-time Updates**: Price changes reflect immediately
- **Multi-currency Support**: Stripe handles currency conversion
- **Product Management**: Easy to add/remove/modify products
- **Analytics**: Track product performance in Stripe dashboard

## Testing

1. **Test Cards**: Use Stripe's test card numbers:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
   - Any future expiry date and any 3-digit CVC

2. **Test the Flow**:
   - Go to `/credits` page
   - Verify products load from Stripe
   - Select a package
   - Complete checkout with test card
   - Verify credits are added to user account
   - Check success page shows correct details

3. **Test Webhooks** (Development):
   - Use Stripe CLI to forward webhooks to localhost
   - Install: `brew install stripe/stripe-cli/stripe`
   - Run: `stripe listen --forward-to localhost:3000/api/stripe/webhook`

## Troubleshooting

### Common Issues

1. **"No active price found" error**:
   - Make sure your products have active prices in Stripe
   - Check that prices are not archived

2. **"Product is not active" error**:
   - Ensure products are set to active in Stripe dashboard

3. **Wrong pricing displayed**:
   - Verify product IDs in environment variables
   - Check that you're using the correct price ID
   - Clear browser cache and reload

4. **Credits not being added**:
   - Check webhook configuration
   - Verify webhook endpoint is accessible
   - Check server logs for webhook errors

### Debug Steps

1. **Check environment variables**:
   ```bash
   echo $STRIPE_SECRET_KEY
   echo $STRIPE_BASIC_PRODUCT_ID
   ```

2. **Test products API**:
   ```bash
   curl http://localhost:3000/api/stripe/products
   ```

3. **Check server logs** for detailed error messages

4. **Verify Stripe dashboard**:
   - Products are active
   - Prices are active
   - Product IDs match environment variables

## Security Notes

- Never expose your secret key in client-side code
- Always verify webhook signatures
- Use HTTPS in production
- Implement proper error handling
- Consider adding rate limiting
- Validate session ownership in success page

## Production Checklist

- [ ] Switch to live Stripe keys
- [ ] Create live products in Stripe dashboard
- [ ] Update product IDs in environment variables
- [ ] Update webhook endpoint URL
- [ ] Test with real payment methods
- [ ] Set up proper error monitoring
- [ ] Implement logging for payment events
- [ ] Add payment analytics
- [ ] Set up customer support processes
- [ ] Configure email receipts
- [ ] Set up tax collection if required
- [ ] Test webhook reliability and retry logic 