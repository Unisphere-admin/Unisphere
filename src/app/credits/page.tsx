"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

// Define pricing structure by country
interface PricingTier {
  currency: string;
  basic: {
    price: number;
    pricePerCredit: number;
  };
  standard: {
    price: number;
    pricePerCredit: number;
  };
  premium: {
    price: number;
    pricePerCredit: number;
  };
}

const PRICING: Record<string, PricingTier> = {
  US: {
    currency: "$",
    basic: { price: 150, pricePerCredit: 0.3 },
    standard: { price: 275, pricePerCredit: 0.275 },
    premium: { price: 500, pricePerCredit: 0.25 },
  },
  MY: {
    currency: "RM",
    basic: { price: 600, pricePerCredit: 1.2 },
    standard: { price: 1050, pricePerCredit: 1.05 },
    premium: { price: 2000, pricePerCredit: 1 },
  },
  HK: {
    currency: "HKD",
    basic: { price: 1200, pricePerCredit: 2.4 },
    standard: { price: 2200, pricePerCredit: 2.2 },
    premium: { price: 4000, pricePerCredit: 2 },
  },
  GB: {
    currency: "£",
    basic: { price: 110, pricePerCredit: 0.22 },
    standard: { price: 200, pricePerCredit: 0.2 },
    premium: { price: 375, pricePerCredit: 0.1875 },
  },
  SG: {
    currency: "SGD",
    basic: { price: 200, pricePerCredit: 0.4 },
    standard: { price: 350, pricePerCredit: 0.35 },
    premium: { price: 600, pricePerCredit: 0.3 },
  },
  // Default pricing in USD
  DEFAULT: {
    currency: "$",
    basic: { price: 150, pricePerCredit: 0.3 },
    standard: { price: 275, pricePerCredit: 0.275 },
    premium: { price: 500, pricePerCredit: 0.25 },
  }
};

export default function CreditsPage() {
  const { user } = useAuth();
  const [countryCode, setCountryCode] = useState<string>("DEFAULT");
  const [pricing, setPricing] = useState<PricingTier>(PRICING.DEFAULT);
  
  // Detect user's country
  useEffect(() => {
    async function detectCountry() {
      try {
        // Try to get country from browser's language settings
        const language = navigator.language;
        const regionMatch = language.match(/[-_]([A-Z]{2})$/i);
        let detectedCountry = regionMatch ? regionMatch[1].toUpperCase() : null;
        
        // If not detected from language, try IP-based detection
        if (!detectedCountry || !PRICING[detectedCountry]) {
          try {
            const response = await fetch('https://ipapi.co/json/');
            const data = await response.json();
            detectedCountry = data.country_code;
          } catch (error) {
            console.error("Failed to detect country from IP:", error);
          }
        }
        
        // Set country code if it's in our pricing list
        if (detectedCountry && PRICING[detectedCountry]) {
          setCountryCode(detectedCountry);
          setPricing(PRICING[detectedCountry]);
        }
      } catch (error) {
        console.error("Error detecting country:", error);
      }
    }
    
    detectCountry();
  }, []);
  
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
            <div className="mt-4 mb-2">
              <span className="text-4xl font-bold">500</span>
              <span className="text-2xl font-bold"> Credits</span>
            </div>
            <div className="mt-1 mb-2">
              <span className="text-xl font-medium">{pricing.currency}{pricing.basic.price}</span>
              <span className="text-muted-foreground text-sm ml-1">({pricing.currency}{pricing.basic.pricePerCredit}/credit)</span>
            </div>
            <CardDescription>
              Get started with 3-5 mentor sessions. Perfect for targeted help with applications or interview prep from current students at elite universities.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            {/* Content here */}
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full">
              Buy 500 Credits
            </Button>
          </CardFooter>
        </Card>

        {/* Standard Package */}
        <Card className="border-primary/40 bg-card/80 backdrop-blur-sm relative overflow-hidden shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all flex flex-col">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary to-primary-foreground"></div>
          <Badge className="absolute top-4 right-4 bg-primary text-white">Popular</Badge>
          <CardHeader>
            <CardTitle className="text-2xl">Standard</CardTitle>
            <div className="mt-4 mb-2">
              <span className="text-4xl font-bold">1000</span>
              <span className="text-2xl font-bold"> Credits</span>
            </div>
            <div className="mt-1 mb-2">
              <span className="text-xl font-medium">{pricing.currency}{pricing.standard.price}</span>
              <span className="text-muted-foreground text-sm ml-1">({pricing.currency}{pricing.standard.pricePerCredit}/credit)</span>
            </div>
            <CardDescription>
              Popular option with 10-15 sessions. Comprehensive support for students applying to multiple universities with essay reviews and interview preparation.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <ul className="space-y-2">
              {/* Content here */}
            </ul>
          </CardContent>
          <CardFooter>
            <Button className="w-full bg-primary hover:bg-primary/90">
              Buy 1000 Credits
            </Button>
          </CardFooter>
        </Card>

        {/* Premium Package */}
        <Card className="border border-border/40 bg-card/80 backdrop-blur-sm relative overflow-hidden hover:shadow-md transition-all flex flex-col">
          <CardHeader>
            <CardTitle className="text-2xl">Premium</CardTitle>
            <div className="mt-4 mb-2">
              <span className="text-4xl font-bold">2000</span>
              <span className="text-2xl font-bold"> Credits</span>
            </div>
            <div className="mt-1 mb-2">
              <span className="text-xl font-medium">{pricing.currency}{pricing.premium.price}</span>
              <span className="text-muted-foreground text-sm ml-1">({pricing.currency}{pricing.premium.pricePerCredit}/credit)</span>
            </div>
            <CardDescription>
              Best value for complete application support. Full access to all features with unlimited sessions for comprehensive application assistance and academic support.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <ul className="space-y-2">
              {/* Content here */}
            </ul>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full">
              Buy 2000 Credits
            </Button>
          </CardFooter>
        </Card>
      </div>

     

      {/* FAQ Section */}
      <div className="relative z-10 mt-20 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold mb-6 text-center">Frequently Asked Questions</h2>
        
        <div className="space-y-4">
          <div className="bg-card/80 backdrop-blur-sm border border-border/40 rounded-lg p-6">
            <h3 className="font-bold text-lg mb-2">How do credits work?</h3>
            <p className="text-muted-foreground">Credits are used for booking tutoring sessions and accessing premium resources. Different session types cost different amounts of credits. Text sessions cost fewer credits than audio or video sessions.</p>
          </div>
          <div className="bg-card/80 backdrop-blur-sm border border-border/40 rounded-lg p-6">
            <h3 className="font-bold text-lg mb-2">Do credits expire?</h3>
            <p className="text-muted-foreground">No, your credits never expire. Once purchased, you can use them whenever you need them.</p>
          </div>
          <div className="bg-card/80 backdrop-blur-sm border border-border/40 rounded-lg p-6">
            <h3 className="font-bold text-lg mb-2">Can I transfer credits to another account?</h3>
            <p className="text-muted-foreground">Credits are non-transferable and tied to the account that purchased them. However, you can contact support for special circumstances.</p>
          </div>
        </div>
      </div>
      
      {/* CTA Section */}
      
    </div>
  );
} 