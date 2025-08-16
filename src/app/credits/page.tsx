"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, CreditCard, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { loadStripe } from '@stripe/stripe-js';
import { getCurrencyInfo } from "@/lib/currency";

interface StripeProduct {
  packageId: string;
  productId: string;
  name: string;
  description: string;
  credits: number;
  price: number;
  currency: string;
  priceId: string;
  active: boolean;
}

export default function CreditsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [products, setProducts] = useState<StripeProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [userCountry, setUserCountry] = useState<string>('MY'); // Default to Malaysia
  
  // Fetch user's country from profile
  useEffect(() => {
    async function fetchUserCountry() {
      if (user?.id) {
        try {
          const response = await fetch(`/api/users/profile/${user.id}`);
          if (response.ok) {
            const data = await response.json();
            console.log('User profile API response:', data);
            if (data.profile?.country) {
              console.log('Setting user country to:', data.profile.country);
              setUserCountry(data.profile.country);
            } else {
              console.log('No country found in user profile, using default:', 'MY');
            }
          }
        } catch (error) {
          console.error('Error fetching user country:', error);
        }
      }
    }
    
    fetchUserCountry();
  }, [user?.id]);

  // Fetch products from Stripe
  useEffect(() => {
    async function fetchProducts() {
      try {
        setIsLoading(true);
        const response = await fetch('/api/stripe/products');
        if (!response.ok) {
          throw new Error('Failed to fetch products');
          }
        
        const data = await response.json();
        console.log('Fetched products:', data.products);
        setProducts(data.products || []);
      } catch (error) {
        console.error('Error fetching products:', error);
        toast({
          title: "Error",
          description: "Failed to load pricing information",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchProducts();
  }, [toast]);

  const handlePurchase = async (packageId: string) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to purchase credits",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(packageId);

    try {
      // Create checkout session
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          packageId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { sessionId } = await response.json();

      // Redirect to Stripe's hosted checkout page
      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
      if (stripe) {
        const { error } = await stripe.redirectToCheckout({ sessionId });
        if (error) {
          throw error;
        }
      } else {
        throw new Error('Failed to load Stripe');
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      toast({
        title: "Payment error",
        description: "Failed to process payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(null);
    }
  };

  const getProductByPackageId = (packageId: string) => {
    return products.find(product => product.packageId === packageId);
  };

  const formatStripeCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  // Get the appropriate product for the user's country
  const getProductForUserCountry = (packageId: string) => {
    console.log(`Looking for product with packageId: ${packageId}`);
    console.log(`User country: ${userCountry}`);
    console.log(`Available products:`, products);
    
    // First try to find a product with the user's country currency
    const userCurrency = getCurrencyInfo(userCountry)?.code;
    console.log(`User currency code: ${userCurrency}`);
    
    if (userCurrency) {
      const countryProduct = products.find(product => 
        product.packageId === packageId && product.currency === userCurrency
      );
      console.log(`Country-specific product found:`, countryProduct);
      if (countryProduct) {
        return countryProduct;
      }
    }
    
    // If no country-specific product found, try to find any product with the package ID
    // This ensures we always show something even if the user's currency isn't available
    const fallbackProduct = products.find(product => product.packageId === packageId);
    console.log(`Fallback product found:`, fallbackProduct);
    if (fallbackProduct) {
      return fallbackProduct;
    }
    
    console.log(`No product found for packageId: ${packageId}`);
    return null;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen with-navbar flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading pricing information...</p>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="min-h-screen with-navbar flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <p className="text-muted-foreground">No pricing information available</p>
          <Button 
            onClick={() => window.location.reload()} 
            className="mt-4"
            variant="outline"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container max-w-7xl mx-auto py-16 px-4 relative min-h-screen">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background pointer-events-none"></div>
      <div className="absolute inset-0 z-0">
        <div className="absolute top-20 right-[20%] w-72 h-72 bg-primary/5 rounded-full blur-3xl opacity-70 animate-pulse" style={{animationDuration: '8s'}}></div>
        <div className="absolute bottom-10 left-[10%] w-80 h-80 bg-secondary/5 rounded-full blur-3xl opacity-60 animate-pulse" style={{animationDuration: '12s'}}></div>
      </div>
      
      <div className="flex flex-col items-center justify-center text-center max-w-4xl mx-auto mb-12 relative z-10">
        <h1 className="text-4xl md:text-5xl font-bold mb-6">Credits</h1>
        <p className="text-lg text-muted-foreground max-w-2xl">
          Purchase credits to book tutoring sessions, access premium resources, and unlock all platform features.
        </p>
        {userCountry && (
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>
              {(() => {
                const basicProduct = getProductForUserCountry('basic');
                if (basicProduct) {
                  const currencyInfo = getCurrencyInfo(userCountry);
                  if (basicProduct.currency === currencyInfo?.code) {
                    return `Prices displayed in ${currencyInfo.name}`;
                  } else {
                    return `Prices displayed in ${basicProduct.currency} (${getCurrencyInfo(userCountry)?.name || 'your local currency'} not available)`;
                  }
                }
                return 'Loading currency information...';
              })()}
            </span>
          </div>
        )}
      </div>

      {/* Credit Package Cards */}
      <div className="grid md:grid-cols-3 gap-8 relative z-10 mb-16">
        {/* Basic Package */}
        <Card className="border border-border/40 bg-card/80 backdrop-blur-sm relative overflow-hidden hover:shadow-md transition-all flex flex-col">
          <CardHeader>
            <CardTitle className="text-2xl">Basic</CardTitle>
            {(() => {
              const product = getProductForUserCountry('basic');
              if (!product) return <div>Loading...</div>;
              
              return (
                <>
            <div className="mt-4 mb-2">
                    <span className="text-4xl font-bold">{product.credits}</span>
              <span className="text-2xl font-bold"> Credits</span>
            </div>
            <div className="mt-1 mb-2">
                    <span className="text-xl font-medium">{formatStripeCurrency(product.price, product.currency)}</span>
            </div>
            <CardDescription>
                    {product.description || "Get started with 3-5 mentor sessions. Perfect for targeted help with applications or interview prep from current students at elite universities."}
            </CardDescription>
                </>
              );
            })()}
          </CardHeader>
          <CardContent className="flex-1">
            {/* Content here */}
          </CardContent>
          <CardFooter>
            {user?.role === 'tutor' ? (
              <Button variant="outline" className="w-full" disabled>
                Tutor Account
              </Button>
            ) : (
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => handlePurchase('basic')}
                disabled={isProcessing === 'basic'}
              >
                {isProcessing === 'basic' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Buy Basic Package
                  </>
                )}
              </Button>
            )}
          </CardFooter>
        </Card>

        {/* Standard Package */}
        <Card className="border-primary/40 bg-card/80 backdrop-blur-sm relative overflow-hidden shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all flex flex-col">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary to-primary-foreground"></div>
          <Badge className="absolute top-4 right-4 bg-primary text-white">Popular</Badge>
          <CardHeader>
            <CardTitle className="text-2xl">Standard</CardTitle>
            {(() => {
              const product = getProductForUserCountry('standard');
              if (!product) return <div>Loading...</div>;
              
              return (
                <>
            <div className="mt-4 mb-2">
                    <span className="text-4xl font-bold">{product.credits}</span>
              <span className="text-2xl font-bold"> Credits</span>
            </div>
            <div className="mt-1 mb-2">
                    <span className="text-xl font-medium">{formatStripeCurrency(product.price, product.currency)}</span>
            </div>
            <CardDescription>
                    {product.description || "Popular option with 10-15 sessions. Comprehensive support for students applying to multiple universities with essay reviews and interview preparation."}
            </CardDescription>
                </>
              );
            })()}
          </CardHeader>
          <CardContent className="flex-1">
            <ul className="space-y-2">
              {/* Content here */}
            </ul>
          </CardContent>
          <CardFooter>
            {user?.role === 'tutor' ? (
              <Button className="w-full bg-primary/60 hover:bg-primary/60" disabled>
                Tutor Account
              </Button>
            ) : (
              <Button 
                className="w-full bg-primary hover:bg-primary/90"
                onClick={() => handlePurchase('standard')}
                disabled={isProcessing === 'standard'}
              >
                {isProcessing === 'standard' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Buy Standard Package
                  </>
                )}
              </Button>
            )}
          </CardFooter>
        </Card>

        {/* Premium Package */}
        <Card className="border border-border/40 bg-card/80 backdrop-blur-sm relative overflow-hidden hover:shadow-md transition-all flex flex-col">
          <CardHeader>
            <CardTitle className="text-2xl">Premium</CardTitle>
            {(() => {
              const product = getProductForUserCountry('premium');
              if (!product) return <div>Loading...</div>;
              
              return (
                <>
            <div className="mt-4 mb-2">
                    <span className="text-4xl font-bold">{product.credits}</span>
              <span className="text-2xl font-bold"> Credits</span>
            </div>
            <div className="mt-1 mb-2">
                    <span className="text-xl font-medium">{formatStripeCurrency(product.price, product.currency)}</span>
            </div>
            <CardDescription>
                    {product.description || "Best value for complete application support. Full access to all features with unlimited sessions for comprehensive application assistance and academic support."}
            </CardDescription>
                </>
              );
            })()}
          </CardHeader>
          <CardContent className="flex-1">
            <ul className="space-y-2">
              {/* Content here */}
            </ul>
          </CardContent>
          <CardFooter>
            {user?.role === 'tutor' ? (
              <Button variant="outline" className="w-full" disabled>
                Tutor Account
              </Button>
            ) : (
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => handlePurchase('premium')}
                disabled={isProcessing === 'premium'}
              >
                {isProcessing === 'premium' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Buy Premium Package
                  </>
                )}
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>

      <div className="relative z-10 text-center mb-16">
        <Button variant="link" asChild>
          <a href="/marketplace">Visit our Marketplace to spend credits on courses and resources</a>
        </Button>
      </div>

      {/* FAQ Section */}
      <div className="relative z-10 mt-20 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold mb-6 text-center">Frequently Asked Questions</h2>
        
        <div className="space-y-4">
          <div className="bg-card/80 backdrop-blur-sm border border-border/40 rounded-lg p-6">
            <h3 className="font-bold text-lg mb-2">How do credits work?</h3>
            <p className="text-muted-foreground">Credits are used for booking tutoring sessions and accessing premium resources. Each session typically costs 100-200 credits depending on the tutor.</p>
          </div>
          <div className="bg-card/80 backdrop-blur-sm border border-border/40 rounded-lg p-6">
            <h3 className="font-bold text-lg mb-2">Do credits expire?</h3>
            <p className="text-muted-foreground">No, your credits never expire. Once purchased, you can use them whenever you need them.</p>
          </div>
          <div className="bg-card/80 backdrop-blur-sm border border-border/40 rounded-lg p-6">
            <h3 className="font-bold text-lg mb-2">Can I transfer credits to another account?</h3>
            <p className="text-muted-foreground">Credits are non-transferable and tied to the account that purchased them. However, you can contact us for special circumstances.</p>
          </div>
          <div className="bg-card/80 backdrop-blur-sm border border-border/40 rounded-lg p-6">
            <h3 className="font-bold text-lg mb-2">Is my payment secure?</h3>
            <p className="text-muted-foreground">Yes, all payments are processed securely through Stripe, a trusted payment processor. We never store your credit card information.</p>
          </div>
        </div>
      </div>
      
      {/* CTA Section */}
      
    </div>
  );
} 