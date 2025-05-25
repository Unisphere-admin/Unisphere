"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Lock } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function PaywallPage() {
  const { user } = useAuth();

  return (
    <div className="container max-w-7xl mx-auto py-12 px-4 md:px-6">
      <div className="flex flex-col items-center justify-center text-center max-w-3xl mx-auto space-y-8">
        <div className="space-y-3">
          <h1 className="text-3xl md:text-4xl font-bold">Premium Access Required</h1>
          <p className="text-lg text-muted-foreground">
            This feature requires premium access to use.
          </p>
        </div>

        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mx-auto mb-4">
              <Lock className="w-6 h-6" />
            </div>
            <CardTitle className="text-center">Get Premium Access</CardTitle>
            <CardDescription className="text-center">
              Unlock all premium features with a subscription
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center">
                <ArrowRight className="mr-2 h-4 w-4 text-primary" />
                <p>Access to advanced features</p>
              </div>
              <div className="flex items-center">
                <ArrowRight className="mr-2 h-4 w-4 text-primary" />
                <p>Connect with more tutors</p>
              </div>
              <div className="flex items-center">
                <ArrowRight className="mr-2 h-4 w-4 text-primary" />
                <p>Unlimited tutoring sessions</p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <Button className="w-full" asChild>
              <Link href="/dashboard/settings">
                Upgrade Now
              </Link>
            </Button>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/dashboard">
                Return to Dashboard
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
} 