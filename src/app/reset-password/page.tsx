"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, ArrowRight, Loader2, Lock, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/context/AuthContext";

export default function ResetPasswordPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [hasSession, setHasSession] = useState(false);
  
  // Check if user has a valid session
  useEffect(() => {
    const checkSession = async () => {
      try {
        // Use our auth API to check session status
        const response = await fetch('/api/auth/session', {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        });
        
        if (!response.ok) {
          throw new Error('Invalid session');
        }
        
        const data = await response.json();
        if (!data.user) {
          throw new Error('No active session');
        }
        
        setHasSession(true);
      } catch (error) {
        console.error('Session check error:', error);
        toast({
          title: "Invalid reset link",
          description: "Your password reset link is invalid or has expired.",
          variant: "destructive"
        });
        router.push("/login");
      }
    };
    
    checkSession();
  }, [router, toast]);
  
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!password || !confirmPassword) {
      setError("Please enter both fields");
      return;
    }
    
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    
    setIsLoading(true);
    
    try {
      const formData = new FormData();
      formData.append("password", password);
      
      const response = await fetch('/api/auth/update-password', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to reset password");
      }
      
      toast({
        title: "Password updated",
        description: "Your password has been reset successfully. You can now log in with your new password.",
        variant: "default"
      });
      
      router.push("/login?success=password-updated");
      
    } catch (err) {
      console.error("Reset password error:", err);
      setError(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setIsLoading(false);
    }
  };
  
  if (!hasSession) {
    return (
      <div className="min-h-screen with-navbar flex items-center justify-center bg-gradient-to-b from-primary/5 via-background to-background">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-20 right-[20%] w-72 h-72 bg-primary/5 rounded-full blur-3xl opacity-70 animate-pulse" style={{animationDuration: '8s'}}></div>
          <div className="absolute bottom-10 left-[10%] w-80 h-80 bg-secondary/5 rounded-full blur-3xl opacity-60 animate-pulse" style={{animationDuration: '12s'}}></div>
        </div>
        <div className="text-center relative z-10">
          <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
          <p className="mt-2">Verifying your reset link...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen with-navbar flex items-center justify-center bg-gradient-to-b from-primary/5 via-background to-background">
      <div className="absolute inset-0 z-0">
        <div className="absolute top-20 right-[20%] w-72 h-72 bg-primary/5 rounded-full blur-3xl opacity-70 animate-pulse" style={{animationDuration: '8s'}}></div>
        <div className="absolute bottom-10 left-[10%] w-80 h-80 bg-secondary/5 rounded-full blur-3xl opacity-60 animate-pulse" style={{animationDuration: '12s'}}></div>
      </div>
      
      <div className="max-w-md w-full px-4 py-8 relative z-10">
        <div className="flex justify-center mb-6">
          <div className="flex items-center gap-2">
            <Link href="/">
              <div className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <BookOpen className="h-10 w-10 text-primary" />
                <h1 className="text-3xl font-bold">TutorMatch</h1>
              </div>
            </Link>
          </div>
        </div>
        
        <Card className="bg-card/80 backdrop-blur-sm border-border/40 shadow-xl hover:shadow-2xl transition-all">
          <CardHeader className="space-y-1">
            <div className="flex justify-center mb-2">
              <div className="p-3 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 shadow-md">
                <ShieldCheck className="h-6 w-6 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl text-center">Reset Password</CardTitle>
            <CardDescription className="text-center">
              Enter your new password below
            </CardDescription>
          </CardHeader>
          
          <form onSubmit={handleResetPassword}>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="bg-background/80 backdrop-blur-sm border-border/40 shadow-sm focus-visible:border-primary/30 focus-visible:ring-1 focus-visible:ring-primary/20 transition-all"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input 
                  id="confirm-password" 
                  type="password" 
                  placeholder="••••••••" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="bg-background/80 backdrop-blur-sm border-border/40 shadow-sm focus-visible:border-primary/30 focus-visible:ring-1 focus-visible:ring-primary/20 transition-all"
                />
              </div>
              
              {error && (
                <Alert variant="destructive">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
            
            <CardFooter>
              <Button type="submit" className="w-full shadow-md hover:shadow-lg bg-primary hover:bg-primary/90 transition-all hover:translate-y-[-2px]" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating password...
                  </>
                ) : (
                  <>
                    Reset Password
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
        
        <div className="mt-6 text-center">
          <Link href="/login" className="text-sm text-primary hover:text-primary/80 hover:underline transition-colors">
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
} 