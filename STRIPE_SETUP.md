# Stripe Integration Setup

This document explains how to set up Stripe payment processing for the credits/top-up system using Stripe's hosted checkout and product catalog with location-based pricing.

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

4. **Set Up Location-Based Pricing** (Optional but Recommended):
   - For each product, you can create multiple prices in different currencies
   - Go to the product page and click "Add price"
   - Create prices for the currencies you want to support:
     - USD (US Dollar)
     - GBP (British Pound)
     - EUR (Euro)
     - CAD (Canadian Dollar)
     - AUD (Australian Dollar)
     - SGD (Singapore Dollar)
     - MYR (Malaysian Ringgit)
     - And any other currencies you want to support
   - The system will automatically select the best matching price based on the user's location

5. **Set Up Webhooks**:
   - Go to Developers > Webhooks in your Stripe dashboard
   - Click "Add endpoint"
   - Set the endpoint URL to: `https://yourdomain.com/api/stripe/webhook`
   - Select these events:
     - `checkout.session.completed`
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
   - Copy the webhook signing secret

6. **Configure Checkout Settings** (Optional):
   - Go to Settings > Checkout in your Stripe dashboard
   - Customize the checkout page appearance
   - Set up tax collection if needed
   - Configure email receipts

## Location-Based Pricing

The system automatically detects the user's location and shows pricing in their local currency:

### How It Works:
1. **Location Detection**: Uses GeoJS API to detect the user's country based on IP address
2. **Currency Mapping**: Maps country codes to appropriate currencies
3. **Price Selection**: Fetches the best matching price from Stripe for the user's currency
4. **Fallback**: If no matching price is found, falls back to the default price

### Supported Countries and Currencies:
The system supports a wide range of countries and currencies including:
- US (USD), GB (GBP), CA (CAD), AU (AUD)
- EU countries (EUR)
- Asian countries: SG (SGD), MY (MYR), JP (JPY), etc.
- And many more...

### Setting Up Multi-Currency Pricing:
1. In your Stripe dashboard, go to each product
2. Click "Add price" to create additional prices in different currencies
3. Set appropriate amounts for each currency (consider exchange rates and local pricing)
4. The system will automatically use the correct price based on user location

## Testing Your Setup

### 1. Test Product Configuration

Run the test script to verify your Stripe products are set up correctly:

```bash
# Make sure your environment variables are loaded
node scripts/test-stripe-products.js
```

### 2. Test Location-Based Pricing

Test the location-based pricing functionality:

```bash
# Test different locations and currencies
node scripts/test-location-pricing.js
```

This will show you:
- ✅ Available prices for each currency
- 💰 Price amounts in different currencies
- ⚠️ Missing prices for specific currencies

### 3. Test the Complete Flow

1. **Start your development server**:
   ```bash
   npm run dev
   ```

2. **Visit the credits page**: `http://localhost:3000/credits`

3. **Check the browser console** for location detection logs

4. **Test with different locations**:
   - Use a VPN to test different countries
   - Check that the correct currency is displayed
   - Verify the pricing matches your Stripe setup

5. **Test a purchase**:
   - Select a package
   - Complete checkout with test card: `4242 4242 4242 4242`
   - Verify credits are added to user account

### 4. Test API Endpoints

Test the products API with different locations:
```bash
# Test US pricing
curl "http://localhost:3000/api/stripe/products?country=US&currency=USD"

# Test UK pricing
curl "http://localhost:3000/api/stripe/products?country=GB&currency=GBP"

# Test Singapore pricing
curl "http://localhost:3000/api/stripe/products?country=SG&currency=SGD"
```

## How It Works

1. **User visits `/credits` page** - System detects user location and fetches appropriate pricing from Stripe
2. **User sees location-based pricing** - Display shows current pricing in their local currency
3. **User selects a credit package** - System creates checkout session with the correct price for their currency
4. **User is redirected to Stripe's hosted checkout page** for secure payment
5. **After payment, Stripe sends webhook** to your server
6. **Server verifies payment and adds credits** to user's account
7. **User is redirected to success page** with payment confirmation

## Benefits of Location-Based Pricing

- **Local Currency Display**: Users see prices in their familiar currency
- **Automatic Conversion**: Stripe handles currency conversion and exchange rates
- **Better User Experience**: No confusion about pricing or conversion rates
- **Global Reach**: Support customers from around the world
- **Flexible Pricing**: Set different prices for different regions if needed

## Testing

1. **Test Cards**: Use Stripe's test card numbers:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
   - Any future expiry date and any 3-digit CVC

2. **Test the Flow**:
   - Go to `/credits` page
   - Verify location detection works
   - Check that correct currency is displayed
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
   - Verify you have prices in the currencies you want to support

2. **"Product is not active" error**:
   - Ensure products are set to active in Stripe dashboard

3. **Wrong pricing displayed**:
   - Verify product IDs in environment variables
   - Check that you have prices set up for the user's currency
   - Clear browser cache and reload

4. **Location detection not working**:
   - Check browser console for GeoJS API errors
   - Verify internet connection
   - Check if GeoJS service is accessible

5. **Credits not being added**:
   - Check webhook configuration
   - Verify webhook endpoint is accessible
   - Check server logs for webhook errors

### Debug Steps

1. **Check environment variables**:
   ```bash
   echo $STRIPE_SECRET_KEY
   echo $STRIPE_BASIC_PRODUCT_ID
   ```

2. **Test products API with location**:
   ```bash
   curl "http://localhost:3000/api/stripe/products?country=US&currency=USD"
   ```

3. **Check server logs** for detailed error messages

4. **Verify Stripe dashboard**:
   - Products are active
   - Prices are active
   - Product IDs match environment variables
   - Multiple currency prices are set up

5. **Test location detection**:
   - Check browser console for location detection logs
   - Verify GeoJS API is working
   - Test with different VPN locations

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
- [ ] Set up multi-currency pricing for all supported regions
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
- [ ] Verify location-based pricing works in all target regions 