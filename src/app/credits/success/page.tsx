"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, CreditCard, ArrowRight, Home, ShoppingCart, Loader2 } from "lucide-react";

interface SessionData {
  credits: number;
  amount: number;
  currency: string;
  packageId: string;
}

export default function CreditsSuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [isLoading, setIsLoading] = useState(true);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionId) {
      fetchSessionDetails(sessionId);
    } else {
      setIsLoading(false);
      setError('No session ID provided');
    }
  }, [sessionId]);

  const fetchSessionDetails = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/stripe/session/${sessionId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch session details');
      }
      
      const data = await response.json();
      setSessionData(data);
    } catch (error) {
      console.error('Error fetching session details:', error);
      setError('Failed to load payment details');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen with-navbar flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Processing your payment...</p>
        </div>
      </div>
    );
  }

  if (error || !sessionData) {
    return (
      <div className="min-h-screen with-navbar flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <CheckCircle className="h-12 w-12 mx-auto" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Payment Verification Failed</h1>
          <p className="text-muted-foreground mb-4">
            {error || 'Unable to verify payment details'}
          </p>
          <Button asChild>
            <Link href="/credits">Return to Credits Page</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen with-navbar flex items-center justify-center bg-gradient-to-b from-background via-background/95 to-muted/20 p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-[20%] w-[500px] h-[500px] bg-green-500/5 rounded-full blur-3xl opacity-70 animate-pulse" style={{animationDuration: '8s'}}></div>
        <div className="absolute -bottom-20 left-[10%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl opacity-60" style={{animationDuration: '12s'}}></div>
      </div>
      
      <div className="relative z-10 max-w-2xl w-full">
        <Card className="border-border/40 shadow-xl backdrop-blur-sm bg-card/95">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-green-600">Payment Successful!</CardTitle>
            <CardDescription className="text-lg">
              Your credits have been added to your account
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <CreditCard className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold text-primary">
                  {sessionData.credits.toLocaleString()} Credits
                </span>
              </div>
              <p className="text-muted-foreground">
                Package: {sessionData.packageId.charAt(0).toUpperCase() + sessionData.packageId.slice(1)}
              </p>
              <p className="text-muted-foreground">
                Amount paid: {sessionData.currency.toUpperCase()} {sessionData.amount}
              </p>
            </div>

            <div className="bg-muted/30 rounded-lg p-4 border border-border/40">
              <h3 className="font-semibold mb-2">What's next?</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Book tutoring sessions with our expert tutors</li>
                <li>• Purchase courses and resources from our marketplace</li>
                <li>• Access premium features and exclusive content</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button asChild className="flex-1 bg-primary hover:bg-primary/90">
                <Link href="/marketplace" className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Browse Marketplace
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              
              <Button variant="outline" asChild className="flex-1">
                <Link href="/dashboard" className="flex items-center gap-2">
                  <Home className="h-4 w-4" />
                  Go to Dashboard
                </Link>
              </Button>
            </div>

            <div className="text-center text-sm text-muted-foreground">
              <p>
                A receipt has been sent to your email. 
                If you have any questions, please contact our support team.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 