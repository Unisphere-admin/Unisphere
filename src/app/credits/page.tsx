"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, CreditCard, Loader2, AlertCircle } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
  
  // Fetch country + products in parallel - no sequential waiting
  useEffect(() => {
    let cancelled = false;

    async function fetchAll() {
      setIsLoading(true);
      try {
        const [productsRes, profileRes] = await Promise.all([
          fetch('/api/stripe/products'),
          user?.id ? fetch(`/api/users/profile/${user.id}`) : Promise.resolve(null),
        ]);

        if (cancelled) return;

        // Products
        if (productsRes.ok) {
          const data = await productsRes.json();
          if (!cancelled) setProducts(data.products || []);
        } else {
          throw new Error('Failed to fetch products');
        }

        // Country (optional - only if we got a profile response)
        if (profileRes && profileRes.ok) {
          const data = await profileRes.json();
          if (!cancelled && data.profile?.country) {
            setUserCountry(data.profile.country);
          }
        }
      } catch (error) {
        if (cancelled) return;
        console.error('Error loading credits page data:', error);
        toast({
          title: "Error",
          description: "Failed to load pricing information",
          variant: "destructive",
        });
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchAll();
    return () => { cancelled = true; };
  }, [user?.id, toast]);

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
    
    // First try to find a product with the user's country currency
    const userCurrency = getCurrencyInfo(userCountry)?.code;
    
    if (userCurrency) {
      const countryProduct = products.find(product => 
        product.packageId === packageId && product.currency === userCurrency
      );
      if (countryProduct) {
        return countryProduct;
      }
    }
    
    // If no country-specific product found, try to find any product with the package ID
    // This ensures we always show something even if the user's currency isn't available
    const fallbackProduct = products.find(product => product.packageId === packageId);
    if (fallbackProduct) {
      return fallbackProduct;
    }
    
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
    <div className="min-h-screen">

      {/* ── Hero + packages ── */}
      <div className="py-16 px-4">
        <div className="container max-w-7xl mx-auto">
          <div className="flex flex-col items-center justify-center text-center max-w-4xl mx-auto mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 text-center md:text-center">Credits</h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Purchase credits to book tutoring sessions, access premium resources, and unlock all platform features.
            </p>
            {userCountry && (
              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground/60">
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {/* Basic Package */}
            <Card className="border relative overflow-hidden hover:shadow-lg transition-all flex flex-col">
              <CardHeader className="text-center md:text-left">
                <CardTitle className="text-2xl">Basic</CardTitle>
                {(() => {
                  const product = getProductForUserCountry('basic');
                  if (!product) return <div className="text-muted-foreground">Loading...</div>;
                  return (
                    <>
                      <div className="mt-4 mb-2">
                        <span className="text-4xl font-bold">{product.credits}</span>
                        <span className="text-2xl font-bold"> Credits</span>
                      </div>
                      <div className="mt-1 mb-2">
                        <span className="text-xl font-medium text-foreground/80">{formatStripeCurrency(product.price, product.currency)}</span>
                      </div>
                      <CardDescription>
                        {product.description || "Get started with 3-5 mentor sessions. Perfect for targeted help with applications or interview prep from current students at elite universities."}
                      </CardDescription>
                    </>
                  );
                })()}
              </CardHeader>
              <CardContent className="flex-1" />
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
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</>
                    ) : (
                      <><CreditCard className="mr-2 h-4 w-4" />Buy Basic Package</>
                    )}
                  </Button>
                )}
              </CardFooter>
            </Card>

            {/* Standard Package */}
            <Card className="border-2 border-primary/30 relative overflow-hidden shadow-lg hover:shadow-xl transition-all flex flex-col">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary to-primary/40"></div>
              <Badge className="absolute top-4 right-4 bg-primary text-primary-foreground font-semibold">Popular</Badge>
              <CardHeader className="text-center md:text-left">
                <CardTitle className="text-2xl">Standard</CardTitle>
                {(() => {
                  const product = getProductForUserCountry('standard');
                  if (!product) return <div className="text-muted-foreground">Loading...</div>;
                  return (
                    <>
                      <div className="mt-4 mb-2">
                        <span className="text-4xl font-bold">{product.credits}</span>
                        <span className="text-2xl font-bold"> Credits</span>
                      </div>
                      <div className="mt-1 mb-2">
                        <span className="text-xl font-medium text-foreground/80">{formatStripeCurrency(product.price, product.currency)}</span>
                      </div>
                      <CardDescription>
                        {product.description || "Popular option with 10-15 sessions. Comprehensive support for students applying to multiple universities with essay reviews and interview preparation."}
                      </CardDescription>
                    </>
                  );
                })()}
              </CardHeader>
              <CardContent className="flex-1" />
              <CardFooter>
                {user?.role === 'tutor' ? (
                  <Button className="w-full" disabled>
                    Tutor Account
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => handlePurchase('standard')}
                    disabled={isProcessing === 'standard'}
                  >
                    {isProcessing === 'standard' ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</>
                    ) : (
                      <><CreditCard className="mr-2 h-4 w-4" />Buy Standard Package</>
                    )}
                  </Button>
                )}
              </CardFooter>
            </Card>

            {/* Premium Package */}
            <Card className="border relative overflow-hidden hover:shadow-lg transition-all flex flex-col">
              <CardHeader className="text-center md:text-left">
                <CardTitle className="text-2xl">Premium</CardTitle>
                {(() => {
                  const product = getProductForUserCountry('premium');
                  if (!product) return <div className="text-muted-foreground">Loading...</div>;
                  return (
                    <>
                      <div className="mt-4 mb-2">
                        <span className="text-4xl font-bold">{product.credits}</span>
                        <span className="text-2xl font-bold"> Credits</span>
                      </div>
                      <div className="mt-1 mb-2">
                        <span className="text-xl font-medium text-foreground/80">{formatStripeCurrency(product.price, product.currency)}</span>
                      </div>
                      <CardDescription>
                        {product.description || "Best value for complete application support. Full access to all features with unlimited sessions for comprehensive application assistance and academic support."}
                      </CardDescription>
                    </>
                  );
                })()}
              </CardHeader>
              <CardContent className="flex-1" />
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
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</>
                    ) : (
                      <><CreditCard className="mr-2 h-4 w-4" />Buy Premium Package</>
                    )}
                  </Button>
                )}
              </CardFooter>
            </Card>
          </div>

          <div className="text-center mb-8">
            <a href="/tutors" className="text-muted-foreground hover:text-foreground underline underline-offset-4 text-sm transition-colors">
              Browse tutors and book your first session
            </a>
          </div>
        </div>
      </div>

      {/* ── FAQ Section ── */}
      <div className="bg-[#f8fffe] border-t border-[#c2d8d2]/30 py-20 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#128ca0] mb-3">Got questions?</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-center">Frequently Asked Questions</h2>
          </div>

          <Accordion type="single" collapsible className="space-y-3">
            {[
              {
                q: "How do credits work?",
                a: "Credits are used to book tutoring sessions and access premium resources. Each session typically costs 100–200 credits depending on the tutor.",
              },
              {
                q: "Do credits expire?",
                a: "No - once purchased, your credits never expire. Use them at your own pace, whenever you need them.",
              },
              {
                q: "Can I transfer credits to another account?",
                a: "Credits are tied to the account that purchased them and are non-transferable. That said, reach out to us if you have special circumstances and we'll do our best to help.",
              },
              {
                q: "Is my payment secure?",
                a: "Yes. All payments are processed through Stripe, a certified PCI-compliant payment processor. We never store your card details.",
              },
              {
                q: "What if I run out of credits mid-application?",
                a: "You can top up at any time from this page. Your existing sessions and history are always preserved regardless of your credit balance.",
              },
            ].map((faq, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="bg-white border border-border/50 rounded-xl px-6 shadow-sm data-[state=open]:border-[#128ca0]/30 data-[state=open]:shadow-md transition-all duration-200"
              >
                <AccordionTrigger className="text-left font-semibold text-base py-5 hover:no-underline hover:text-[#128ca0] transition-colors duration-200 [&>svg]:text-[#128ca0] [&>svg]:transition-transform">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed pb-5 text-sm">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </div>
  );
} 