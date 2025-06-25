"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, ArrowRight, Loader2, Lock, ShieldCheck, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/context/AuthContext";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [hasSession, setHasSession] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  
  // Check if user has a valid session for password reset
  useEffect(() => {
    const checkSession = async () => {
      try {
        // Import the Supabase client first
        const { createClient } = await import('@/utils/supabase/client');
        const supabase = createClient();
        
        // Check if we came from a password reset link
        const code = searchParams.get('code');
        
        if (code) {
          // If we have a code, we'll try to verify it's valid
          setIsVerifying(true);
          
          try {
            // First check if we already have a session
            const { data: sessionData } = await supabase.auth.getSession();
            
            if (sessionData?.session) {
              setHasSession(true);
              
              // Remove the code from the URL to prevent reuse
              window.history.replaceState({}, '', '/reset-password');
              return;
            }
            
            // If no session, we'll try a different approach
            // Instead of relying on PKCE, we'll use a simpler verification
            // Just check if we can get the user - if this succeeds, we have a valid session
            const { data: userData, error: userError } = await supabase.auth.getUser();
            
            if (!userError && userData?.user) {
              setHasSession(true);
              
              // Remove the code from the URL to prevent reuse
              window.history.replaceState({}, '', '/reset-password');
              return;
            }
            
            // If we still don't have a session, try one more approach
            // Use the signInWithOtp method which works with the same code
            const { error: otpError } = await supabase.auth.verifyOtp({
              type: 'recovery',
              token_hash: code
        });
        
            if (otpError) {
              throw new Error('Invalid reset code');
        }
        
            // If we get here, we should have a session
            const { data: finalCheck } = await supabase.auth.getSession();
            
            if (finalCheck?.session) {
              setHasSession(true);
              
              // Remove the code from the URL to prevent reuse
              window.history.replaceState({}, '', '/reset-password');
              return;
            }
            
            throw new Error('Could not establish a session');
          } catch (verificationError) {
            throw new Error('Invalid reset code');
          }
        }
        
        // If no code, check if there's an existing session
        const { data } = await supabase.auth.getSession();
        
        if (data?.session) {
          setHasSession(true);
          return;
        }
        
        // No valid session found
        throw new Error('No active session');
      } catch (error) {
        toast({
          title: "Invalid reset link",
          description: "Your password reset link is invalid or has expired.",
          variant: "destructive"
        });
        router.push("/login");
      } finally {
        setIsVerifying(false);
      }
    };
    
    checkSession();
  }, [router, toast, searchParams]);
  
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
      // Import the Supabase client directly
      const { createClient } = await import('@/utils/supabase/client');
      const supabase = createClient();
      
      
      // Update the password directly using Supabase client
      const { error } = await supabase.auth.updateUser({
        password: password
      });
      
      if (error) {
        throw new Error(error.message || "Failed to reset password");
      }
      
      
      toast({
        title: "Password updated",
        description: "Your password has been reset successfully. You can now log in with your new password.",
        variant: "default"
      });
      
      // Sign out to ensure clean login with new password
      await supabase.auth.signOut();
      
      router.push("/login?success=password-updated");
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setIsLoading(false);
    }
  };
  
  if (isVerifying) {
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
  
  if (!hasSession) {
    return (
      <div className="min-h-screen with-navbar flex items-center justify-center bg-gradient-to-b from-primary/5 via-background to-background">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-20 right-[20%] w-72 h-72 bg-primary/5 rounded-full blur-3xl opacity-70 animate-pulse" style={{animationDuration: '8s'}}></div>
          <div className="absolute bottom-10 left-[10%] w-80 h-80 bg-secondary/5 rounded-full blur-3xl opacity-60 animate-pulse" style={{animationDuration: '12s'}}></div>
        </div>
        <div className="text-center relative z-10">
          <div className="p-3 rounded-full bg-destructive/20 mx-auto mb-4 inline-flex">
            <Lock className="h-6 w-6 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Invalid Reset Link</h2>
          <p className="text-muted-foreground mb-4">Your password reset link is invalid or has expired.</p>
          <Button asChild>
            <Link href="/login">Back to Login</Link>
          </Button>
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