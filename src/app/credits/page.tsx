"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, ArrowRight, CreditCard, Shield, Users, Star, Zap, Download, Clock } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function CreditsPage() {
  const { user } = useAuth();
  
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
              <span className="text-xl font-medium">$25</span>
              <span className="text-muted-foreground text-sm ml-1">($0.05/credit)</span>
            </div>
            <CardDescription>
              Perfect for getting started and exploring our platform.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <ul className="space-y-2">
              <li className="flex items-start">
                <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                <span>Book up to 5 tutoring sessions</span>
              </li>
              <li className="flex items-start">
                <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                <span>Access to community forum</span>
              </li>
              <li className="flex items-start">
                <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                <span>Basic resource library</span>
              </li>
              <li className="flex items-start">
                <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                <span>Text & audio sessions</span>
              </li>
            </ul>
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
              <span className="text-xl font-medium">$45</span>
              <span className="text-muted-foreground text-sm ml-1">($0.045/credit)</span>
            </div>
            <CardDescription>
              Our most popular package with the best value.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <ul className="space-y-2">
              <li className="flex items-start">
                <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                <span className="font-medium">Book up to 12 tutoring sessions</span>
              </li>
              <li className="flex items-start">
                <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                <span>Audio & video tutoring sessions</span>
              </li>
              <li className="flex items-start">
                <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                <span>Full resource library access</span>
              </li>
              <li className="flex items-start">
                <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                <span>Priority matching with top tutors</span>
              </li>
              <li className="flex items-start">
                <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                <span>10% bonus credits</span>
              </li>
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
              <span className="text-xl font-medium">$80</span>
              <span className="text-muted-foreground text-sm ml-1">($0.04/credit)</span>
            </div>
            <CardDescription>
              Maximum value for serious students with long-term needs.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <ul className="space-y-2">
              <li className="flex items-start">
                <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                <span>Book up to 25 tutoring sessions</span>
              </li>
              <li className="flex items-start">
                <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                <span>All Standard features included</span>
              </li>
              <li className="flex items-start">
                <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                <span>Personalized study plans</span>
              </li>
              <li className="flex items-start">
                <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                <span>Access to recorded sessions</span>
              </li>
              <li className="flex items-start">
                <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                <span>20% bonus credits</span>
              </li>
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