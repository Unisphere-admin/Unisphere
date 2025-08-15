"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { loadStripe } from '@stripe/stripe-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Loader2 } from 'lucide-react';

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
  userCountry?: string;
  userCurrency?: string;
  availablePrices?: Array<{
    currency: string;
    amount: number;
    priceId: string;
  }>;
}

interface UserLocation {
  country: string;
  currency: string;
}

export default function CreditsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [products, setProducts] = useState<StripeProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<UserLocation>({ country: 'MY', currency: 'MYR' });
  const [locationLoading, setLocationLoading] = useState(true);

  // Detect user location
  useEffect(() => {
    async function detectLocation() {
      try {
        setLocationLoading(true);
        
        // Try to get location from GeoJS
        const response = await fetch('https://get.geojs.io/v1/ip/country.json');
        if (response.ok) {
          const data = await response.json();
          const country = data.country || 'MY';
          
          // Map country to currency (prioritizing MYR and current pricing currencies)
          const currencyMap: { [key: string]: string } = {
            // Default to MYR for most countries
            'MY': 'MYR',
            'US': 'USD',
            'GB': 'GBP',
            'HK': 'HKD',
            'SG': 'SGD',
            // Other countries default to MYR
            'CA': 'MYR',
            'AU': 'MYR',
            'EU': 'MYR',
            'JP': 'MYR',
            'IN': 'MYR',
            'CN': 'MYR',
            'KR': 'MYR',
            'TW': 'MYR',
            'TH': 'MYR',
            'ID': 'MYR',
            'PH': 'MYR',
            'VN': 'MYR',
            'BR': 'MYR',
            'MX': 'MYR',
            'AR': 'MYR',
            'CL': 'MYR',
            'CO': 'MYR',
            'PE': 'MYR',
            'ZA': 'MYR',
            'NG': 'MYR',
            'EG': 'MYR',
            'SA': 'MYR',
            'AE': 'MYR',
            'IL': 'MYR',
            'TR': 'MYR',
            'RU': 'MYR',
            'PL': 'MYR',
            'CZ': 'MYR',
            'HU': 'MYR',
            'RO': 'MYR',
            'BG': 'MYR',
            'HR': 'MYR',
            'RS': 'MYR',
            'SI': 'MYR',
            'SK': 'MYR',
            'LT': 'MYR',
            'LV': 'MYR',
            'EE': 'MYR',
            'FI': 'MYR',
            'SE': 'MYR',
            'NO': 'MYR',
            'DK': 'MYR',
            'IS': 'MYR',
            'CH': 'MYR',
            'AT': 'MYR',
            'BE': 'MYR',
            'NL': 'MYR',
            'LU': 'MYR',
            'IE': 'MYR',
            'PT': 'MYR',
            'ES': 'MYR',
            'IT': 'MYR',
            'GR': 'MYR',
            'CY': 'MYR',
            'MT': 'MYR',
            'DE': 'MYR',
            'FR': 'MYR',
          };
          
          const currency = currencyMap[country] || 'MYR';
          
          setUserLocation({ country, currency });
          console.log(`Detected location: ${country}, currency: ${currency}`);
        } else {
          console.log('Failed to detect location, using defaults');
          setUserLocation({ country: 'MY', currency: 'MYR' });
        }
      } catch (error) {
        console.error('Error detecting location:', error);
        setUserLocation({ country: 'MY', currency: 'MYR' });
      } finally {
        setLocationLoading(false);
      }
    }
    
    detectLocation();
  }, []);

  // Fetch products from Stripe with location
  useEffect(() => {
    async function fetchProducts() {
      if (locationLoading) return; // Wait for location detection
      
      try {
        setIsLoading(true);
        const response = await fetch(`/api/stripe/products?country=${userLocation.country}&currency=${userLocation.currency}`);
        if (!response.ok) {
          throw new Error('Failed to fetch products');
        }
        
        const data = await response.json();
        setProducts(data.products || []);
        
        // Update user location if provided by API
        if (data.userLocation) {
          setUserLocation(data.userLocation);
        }
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
  }, [toast, locationLoading, userLocation.country, userLocation.currency]);

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
      // Create checkout session with user's currency
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          packageId,
          currency: userLocation.currency,
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

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  if (isLoading || locationLoading) {
    return (
      <div className="min-h-screen with-navbar flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">
            {locationLoading ? 'Detecting your location...' : 'Loading pricing information...'}
          </p>
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

      </div>

      {/* Credit Package Cards */}
      <div className="grid md:grid-cols-3 gap-8 relative z-10 mb-16">
        {/* Basic Package */}
        <Card className="border border-border/40 bg-card/80 backdrop-blur-sm relative overflow-hidden hover:shadow-md transition-all flex flex-col">
          <CardHeader>
            <CardTitle className="text-2xl">Basic</CardTitle>
            {(() => {
              const product = getProductByPackageId('basic');
              if (!product) return <div>Loading...</div>;
              
              return (
                <>
            <div className="mt-4 mb-2">
                    <span className="text-4xl font-bold">{product.credits}</span>
              <span className="text-2xl font-bold"> Credits</span>
            </div>
            <div className="mt-1 mb-2">
                    <span className="text-xl font-medium">{formatCurrency(product.price, product.currency)}</span>
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
              const product = getProductByPackageId('standard');
              if (!product) return <div>Loading...</div>;
              
              return (
                <>
            <div className="mt-4 mb-2">
                    <span className="text-4xl font-bold">{product.credits}</span>
              <span className="text-2xl font-bold"> Credits</span>
            </div>
            <div className="mt-1 mb-2">
                    <span className="text-xl font-medium">{formatCurrency(product.price, product.currency)}</span>
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
              const product = getProductByPackageId('premium');
              if (!product) return <div>Loading...</div>;
              
              return (
                <>
            <div className="mt-4 mb-2">
                    <span className="text-4xl font-bold">{product.credits}</span>
              <span className="text-2xl font-bold"> Credits</span>
            </div>
            <div className="mt-1 mb-2">
                    <span className="text-xl font-medium">{formatCurrency(product.price, product.currency)}</span>
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
        <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
        
        <div className="space-y-8">
          <div>
            <h3 className="text-xl font-semibold mb-3">How do credits work?</h3>
            <p className="text-muted-foreground">
              Credits are used to book tutoring sessions and access premium resources. Each session typically costs 1-3 credits depending on the duration and tutor.
            </p>
          </div>
          
          <div>
            <h3 className="text-xl font-semibold mb-3">Can I get a refund?</h3>
            <p className="text-muted-foreground">
              Credits are non-refundable once purchased. However, unused credits never expire and can be used for future sessions.
            </p>
          </div>
          
          <div>
            <h3 className="text-xl font-semibold mb-3">How long do credits last?</h3>
            <p className="text-muted-foreground">
              Credits never expire and can be used at any time. You can also transfer credits to other users if needed.
            </p>
          </div>
          
          <div>
            <h3 className="text-xl font-semibold mb-3">What payment methods do you accept?</h3>
            <p className="text-muted-foreground">
              We accept all major credit cards, debit cards, and digital wallets through our secure Stripe payment system.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 