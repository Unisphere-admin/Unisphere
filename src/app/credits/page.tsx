"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { MapPin, Loader2, AlertCircle, Check } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
// @stripe/stripe-js is lazy-loaded inside the checkout handler via dynamic
// import — avoids pulling the Stripe SDK into this route's client bundle on
// first paint. Users who never click checkout never pay the download cost.
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

// Per-tier marketing copy. Pattern matches the Calendly pricing page:
// each card has a name, a subtitle, then a categorised feature list.
// Paid tiers chain — "Basic features, plus:" — so the value progression
// reads cleanly without repeating bullets.
//
// Edit these freely; nothing here is wired to Stripe.
// Items can be plain strings, or objects with `bold: true` for items
// we want to visually emphasise (e.g. the 24/7 support line on the
// premium tier — it's the one differentiator across the paid cards).
type FeatureItem = string | { text: string; bold?: boolean };
type FeatureSection = { title: string; items: FeatureItem[] };
type TierCopy = {
  name: string;
  subtitle: string;
  sessionRange?: string;
  sections: FeatureSection[];
};

const TIER_COPY: Record<string, TierCopy> = {
  free: {
    name: "Free",
    subtitle: "For exploring Unisphere",
    // sessionRange filled with a friendly placeholder so the price block
    // is the same height as the paid tiers and the CTA aligns across cards.
    sessionRange: "Sign up in seconds",
    sections: [
      {
        title: "Browse",
        items: [
          "Browse all tutors",
          "View tutor profiles",
          "Read student success stories",
        ],
      },
      {
        title: "Free resources",
        items: [
          "Access to free resources",
          "Access to opportunities",
        ],
      },
    ],
  },
  basic: {
    name: "500 Credits",
    subtitle: "For trying us out",
    sessionRange: "Roughly 3-5 sessions",
    sections: [
      {
        title: "What's included",
        items: [
          "Access to messaging tutors",
          "Access to booking tutors",
          "Timeline & deadline tracker",
          "Application strategy support",
          "Dedicated mentor matching",
        ],
      },
    ],
  },
  standard: {
    name: "1,000 Credits",
    subtitle: "For most students",
    sessionRange: "Roughly 8-10 sessions",
    sections: [
      {
        title: "What's included",
        items: [
          "Access to messaging tutors",
          "Access to booking tutors",
          "Timeline & deadline tracker",
          "Application strategy support",
          "Dedicated mentor matching",
          { text: "Access to exclusive events", bold: true },
          { text: "Peer project matching", bold: true },
        ],
      },
    ],
  },
  premium: {
    name: "2,000 Credits",
    subtitle: "For serious applicants",
    sessionRange: "Roughly 18-20 sessions",
    sections: [
      {
        title: "What's included",
        items: [
          "Access to messaging tutors",
          "Access to booking tutors",
          "Timeline & deadline tracker",
          "Application strategy support",
          "Dedicated mentor matching",
          { text: "Access to exclusive events", bold: true },
          { text: "Peer project matching", bold: true },
          { text: "24/7 priority support", bold: true },
        ],
      },
    ],
  },
};

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

    // Resolve the SAME product the page displayed for this user — so the
    // priceId + currency we send to Stripe match exactly what the user saw
    // on the card. Without this, the server would default to whatever
    // price Stripe returns first (usually USD) and Malaysian users etc.
    // would see RM on the card but get billed in dollars at checkout.
    const product = getProductForUserCountry(packageId);
    if (!product) {
      toast({
        title: "Pricing unavailable",
        description: "We couldn't find that package. Please refresh and try again.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(packageId);

    try {
      // Create checkout session — pass the exact priceId + currency the
      // user saw on the card so checkout displays the same numbers.
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          packageId,
          priceId: product.priceId,
          currency: product.currency.toLowerCase(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { sessionId } = await response.json();

      // Redirect to Stripe's hosted checkout page. Lazy-import Stripe SDK
      // only now (on click) so the route's initial bundle stays light.
      const { loadStripe } = await import('@stripe/stripe-js');
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

  // Get the appropriate product for the user's country.
  //
  // Resolution order:
  //   1. The user's country-specific currency (GBP, MYR, HKD, SGD).
  //   2. USD — explicit default for any country that isn't in the supported
  //      list (e.g. India, UAE, Brazil…). This guarantees a stable, well-
  //      understood currency rather than relying on whatever Stripe happens
  //      to return first.
  //   3. Any product with the matching packageId — last-resort safety net
  //      in case USD isn't configured in Stripe for some reason.
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

    // Default fallback: USD. Anyone outside our supported-currency countries
    // (India, UAE, etc.) pays in dollars rather than whichever currency Stripe
    // happens to return first.
    const usdProduct = products.find(product =>
      product.packageId === packageId && product.currency === 'USD'
    );
    if (usdProduct) {
      return usdProduct;
    }

    // Last-resort safety net if USD isn't configured in Stripe at all.
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
    // We never want a paying user to see a bare "no products for sale"
    // screen — it reads as "Unisphere doesn't sell anything" rather than
    // "we're having a temporary issue." Frame it as a transient outage,
    // give them a retry, and offer a way out via support.
    return (
      <div className="min-h-screen with-navbar flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <h2 className="text-xl font-semibold mb-2">We can't load pricing right now</h2>
          <p className="text-muted-foreground mb-6">
            This is a temporary issue on our end. Please try again in a moment, or
            contact us at <a href="mailto:admin@unisphere.my" className="underline hover:text-foreground">admin@unisphere.my</a>{' '}
            and we'll help you top up directly.
          </p>
          <Button
            onClick={() => window.location.reload()}
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

      {/* ── Hero + packages ──
          Background: full-section illustration of mountains + fir trees
          under a soft blue sky (public/backgrounds/credits-bg.webp).
          A subtle white-to-transparent overlay at the top keeps the
          headline + subheading legible against the brighter sky area.
          The cards float above all of this with z-10. */}
      <div
        className="relative overflow-hidden py-16 px-4 bg-cover bg-center"
        style={{ backgroundImage: "url('/backgrounds/credits-bg.webp')" }}
      >
        {/* Soft white wash near the top so the "Credits" headline and
            sub-copy stay readable against the brightest sky area. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-white/55 via-white/25 to-transparent z-0"
        />

        <div className="container max-w-6xl mx-auto relative z-10">
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

          {/* Credit Package Cards — Calendly-style. Free + 3 paid tiers.
              On lg+ all 4 sit in a row; on md they wrap 2x2; on mobile
              they stack. */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16 items-stretch">
            {/* Free tier — no Stripe, just the value of signing up.
                We give creditsLabel a deliberate placeholder so the price
                block has the same line-count as the paid tiers, which
                keeps the CTA aligned across all 4 cards. */}
            <PricingCard
              tier={TIER_COPY.free}
              priceLabel="Always free"
              creditsLabel="No credit card needed"
              ctaLabel={user ? "You're on Free" : "Get started"}
              ctaHref={user ? null : "/signup"}
              ctaVariant="dark"
              isPopular={false}
              isProcessing={false}
              isDisabled={!!user}
              onCta={undefined}
            />

            {/* Basic */}
            {(() => {
              const product = getProductForUserCountry('basic');
              return (
                <PricingCard
                  tier={TIER_COPY.basic}
                  priceLabel={product ? formatStripeCurrency(product.price, product.currency) : "—"}
                  creditsLabel={product ? `${product.credits} credits` : null}
                  ctaLabel={user?.role === 'tutor' ? "Tutor Account" : "Top up"}
                  ctaVariant="filled"
                  isPopular={false}
                  isProcessing={isProcessing === 'basic'}
                  isDisabled={user?.role === 'tutor' || !product}
                  onCta={() => handlePurchase('basic')}
                />
              );
            })()}

            {/* Standard — most popular */}
            {(() => {
              const product = getProductForUserCountry('standard');
              return (
                <PricingCard
                  tier={TIER_COPY.standard}
                  priceLabel={product ? formatStripeCurrency(product.price, product.currency) : "—"}
                  creditsLabel={product ? `${product.credits} credits` : null}
                  ctaLabel={user?.role === 'tutor' ? "Tutor Account" : "Top up"}
                  ctaVariant="filled"
                  isPopular
                  isProcessing={isProcessing === 'standard'}
                  isDisabled={user?.role === 'tutor' || !product}
                  onCta={() => handlePurchase('standard')}
                />
              );
            })()}

            {/* Premium */}
            {(() => {
              const product = getProductForUserCountry('premium');
              return (
                <PricingCard
                  tier={TIER_COPY.premium}
                  priceLabel={product ? formatStripeCurrency(product.price, product.currency) : "—"}
                  creditsLabel={product ? `${product.credits} credits` : null}
                  ctaLabel={user?.role === 'tutor' ? "Tutor Account" : "Top up"}
                  ctaVariant="filled"
                  isPopular={false}
                  isProcessing={isProcessing === 'premium'}
                  isDisabled={user?.role === 'tutor' || !product}
                  onCta={() => handlePurchase('premium')}
                />
              );
            })()}
          </div>

          <div className="text-center mb-8 relative z-10">
            <a href="/tutors" className="text-[#1f4a72]/80 hover:text-[#1f4a72] underline underline-offset-4 text-sm transition-colors">
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

// ─────────────────────────────────────────────────────────────────────
// PricingCard — single tier card. Used for both the Free tier (no
// Stripe) and the three paid Stripe-backed tiers. Layout intentionally
// mirrors Calendly's pricing cards: name + subtitle at top, price block
// in the middle, CTA button, then a categorised feature list at the
// bottom with check-marked bullets.
// ─────────────────────────────────────────────────────────────────────

type CtaVariant = "filled" | "outline" | "dark";

interface PricingCardProps {
  tier: TierCopy;
  priceLabel: string;          // e.g. "MYR 600.00" or "Always free"
  creditsLabel: string | null; // e.g. "500 credits" — null for Free
  ctaLabel: string;
  ctaVariant: CtaVariant;
  ctaHref?: string | null;     // if set, render as <Link> instead of button
  isPopular: boolean;
  isProcessing: boolean;
  isDisabled: boolean;
  onCta?: () => void;
}

function PricingCard({
  tier,
  priceLabel,
  creditsLabel,
  ctaLabel,
  ctaVariant,
  ctaHref,
  isPopular,
  isProcessing,
  isDisabled,
  onCta,
}: PricingCardProps) {
  // Wrap the CTA in either a Link (Free → /signup) or a button that
  // fires onCta (paid tiers → Stripe checkout).
  const ctaInner = isProcessing ? (
    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</>
  ) : (
    ctaLabel
  );

  // Per-variant button styling — chunky shadows give the cards a more
  // tactile, premium feel. The "filled" (recommended/Standard) variant
  // gets the heaviest shadow so it visually wins the eye.
  const buttonClasses = (() => {
    const base = "w-full font-semibold transition-all";
    if (ctaVariant === "filled") {
      return `${base} bg-[#128ca0] hover:bg-[#0f7a8d] text-white shadow-[0_10px_25px_-8px_rgba(18,140,160,0.65)] hover:shadow-[0_14px_30px_-8px_rgba(18,140,160,0.8)] hover:-translate-y-0.5`;
    }
    if (ctaVariant === "dark") {
      return `${base} bg-[#1f4a72] hover:bg-[#173d62] text-white shadow-[0_10px_25px_-8px_rgba(31,74,114,0.55)] hover:shadow-[0_14px_30px_-8px_rgba(31,74,114,0.7)] hover:-translate-y-0.5`;
    }
    // outline
    return `${base} border-2 border-[#128ca0]/30 text-[#0f3a52] hover:bg-[#128ca0]/5 hover:border-[#128ca0]/60 shadow-[0_6px_15px_-6px_rgba(15,58,82,0.25)] hover:shadow-[0_10px_22px_-8px_rgba(15,58,82,0.35)] hover:-translate-y-0.5`;
  })();

  const cta = ctaHref ? (
    <Button asChild className={buttonClasses} variant="default">
      <Link href={ctaHref}>{ctaInner}</Link>
    </Button>
  ) : (
    <Button
      className={buttonClasses}
      variant="default"
      onClick={onCta}
      disabled={isDisabled || isProcessing}
    >
      {ctaInner}
    </Button>
  );

  return (
    <Card
      className={`relative flex flex-col h-full bg-white max-w-[280px] mx-auto w-full transition-all hover:-translate-y-1 ${
        isPopular
          ? "border-2 border-[#128ca0] shadow-[0_25px_60px_-15px_rgba(15,58,82,0.55),0_10px_25px_-10px_rgba(15,58,82,0.35)]"
          : "border border-slate-200/80 shadow-[0_18px_45px_-15px_rgba(15,58,82,0.35),0_8px_20px_-10px_rgba(15,58,82,0.2)] hover:shadow-[0_25px_60px_-15px_rgba(15,58,82,0.5),0_10px_25px_-10px_rgba(15,58,82,0.3)]"
      }`}
    >
      {isPopular && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#128ca0] text-white font-semibold shadow-md px-3 py-1 hover:bg-[#128ca0]">
          Recommended
        </Badge>
      )}

      {/* Header: name + subtitle. Fixed-height block so all 4 cards align. */}
      <CardHeader className="pb-3">
        <CardTitle className="text-xl">{tier.name}</CardTitle>
        <CardDescription className="text-sm">{tier.subtitle}</CardDescription>
      </CardHeader>

      {/* Price block + CTA. The price block is a fixed-height grid of three
          rows so the CTA sits at the same Y on all four cards regardless
          of whether the tier has credits or sessionRange filled in. */}
      <CardContent className="flex flex-col gap-4 pb-4">
        <div className="space-y-1 min-h-[5.25rem]">
          <div className="text-2xl font-bold leading-tight">{priceLabel}</div>
          {creditsLabel && (
            <div className="text-sm text-muted-foreground">{creditsLabel}</div>
          )}
          {tier.sessionRange && (
            <div className="text-sm text-muted-foreground">{tier.sessionRange}</div>
          )}
        </div>
        {cta}
      </CardContent>

      {/* Feature list. Sits immediately under the CTA — no `mt-auto` —
          so all four cards have their feature lists starting at the
          same Y. Cards have `h-full` from the parent so they still
          stretch to equal heights overall. */}
      <CardFooter className="flex flex-col items-stretch gap-4 pt-0 pb-6">
        {tier.sections.map((section) => (
          <div key={section.title} className="space-y-2">
            <p className="text-sm font-semibold text-foreground">{section.title}</p>
            <ul className="space-y-2">
              {section.items.map((item) => {
                const text = typeof item === "string" ? item : item.text;
                const bold = typeof item === "string" ? false : !!item.bold;
                return (
                  <li
                    key={text}
                    className={`flex items-start gap-2 text-sm ${
                      bold ? "font-semibold text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    <Check className="w-4 h-4 mt-0.5 text-[#128ca0] flex-shrink-0" />
                    <span>{text}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </CardFooter>
    </Card>
  );
}
