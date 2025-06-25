"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Lock, Sparkles, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Badge } from '@/components/ui/badge';

export default function PaywallPage() {
  const { user } = useAuth();

  return (
    <div className="container max-w-7xl mx-auto py-16 md:py-24 px-4 md:px-6 relative min-h-screen">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background pointer-events-none"></div>
      <div className="absolute inset-0 z-0">
        <div className="absolute top-20 right-[20%] w-72 h-72 bg-primary/5 rounded-full blur-3xl opacity-70 animate-pulse" style={{animationDuration: '8s'}}></div>
        <div className="absolute bottom-10 left-[10%] w-80 h-80 bg-secondary/5 rounded-full blur-3xl opacity-60 animate-pulse" style={{animationDuration: '12s'}}></div>
      </div>
      
      <div className="flex flex-col items-center justify-center text-center max-w-3xl mx-auto space-y-8 relative z-10">
        <Badge className="px-3 py-1 mb-2 bg-primary/10 text-primary hover:bg-primary/20 transition-colors border-primary/20">
          Premium Features
        </Badge>
        
        <div className="space-y-3">
          <h1 className="text-3xl md:text-5xl font-bold">Join Our Platform</h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          Unlock access to our exclusive community of tutors and students
          </p>
        </div>

        <Card className="w-full max-w-md bg-card/80 backdrop-blur-sm shadow-xl border-border/40 hover:shadow-2xl transition-all">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5 rounded-lg opacity-50"></div>
          <CardHeader className="relative z-10">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-primary mx-auto mb-6 shadow-md">
              <Lock className="w-7 h-7" />
            </div>
            <CardTitle className="text-center text-2xl">Start your journey</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 relative z-10">
            <div className="space-y-3">
              <div className="flex items-center p-3 bg-primary/5 rounded-lg hover:bg-primary/10 transition-colors">
                <CheckCircle className="mr-3 h-5 w-5 text-primary flex-shrink-0" />
                <p className="font-medium">Access to all our tutors</p>
              </div>
              <div className="flex items-center p-3 bg-primary/5 rounded-lg hover:bg-primary/10 transition-colors">
                <CheckCircle className="mr-3 h-5 w-5 text-primary flex-shrink-0" />
                <p className="font-medium">At 80% lower prices than local competition</p>
              </div>
              <div className="flex items-center p-3 bg-primary/5 rounded-lg hover:bg-primary/10 transition-colors">
                <CheckCircle className="mr-3 h-5 w-5 text-primary flex-shrink-0" />
                <p className="font-medium">Book as many sessions as you'd like</p>
              </div>
              <div className="flex items-center p-3 bg-primary/5 rounded-lg hover:bg-primary/10 transition-colors">
                <CheckCircle className="mr-3 h-5 w-5 text-primary flex-shrink-0" />
                <p className="font-medium">Exclusive guides, communities and more</p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-3 relative z-10">
            <Button className="w-full shadow-md hover:shadow-lg bg-primary hover:bg-primary/90 transition-all hover:translate-y-[-2px]" asChild>
              <Link href={"/consultation"} className="flex items-center justify-center">
                <Sparkles className="mr-2 h-4 w-4" />
                Gain Access Now
              </Link>
            </Button>
            <Button variant="outline" className="w-full border-border/40 hover:bg-primary/5 hover:border-primary/30 transition-all" asChild>
              <Link href="/">
                Return to Home
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
} 