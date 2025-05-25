"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, ArrowRight, Loader2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertCircle } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { handleApiRedirect } from "@/lib/auth/apiRedirect";

export default function LoginPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");
  const [isLoading, setIsLoading] = useState(false);
  
  // Extract redirectTo from URL if present
  const searchParams = useSearchParams();
  const redirectTo = searchParams?.get('redirectTo') || null;
  
  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState("");
  const [errorType, setErrorType] = useState<"general" | "auth" | "profile">("general");
  const [redirectPath, setRedirectPath] = useState<string | null>(null);
  const [resetEmail, setResetEmail] = useState("");
  const [showResetPasswordForm, setShowResetPasswordForm] = useState(false);

  // Handle URL parameters
  useEffect(() => {
    // Check for redirect path
    const redirect = searchParams.get("redirectTo");
    if (redirect) {
      setRedirectPath(redirect);
    }
    
    // Check for success messages
    const success = searchParams.get("success");
    if (success === "password-updated") {
      toast({
        title: "Password updated",
        description: "Your password has been reset successfully. You can now log in with your new password.",
        variant: "default",
      });
    }
    
    // Check for errors
    const errorParam = searchParams.get("error");
    if (errorParam) {
      const message = searchParams.get("message") || "Authentication failed";
      setError(message);
      setErrorType(errorParam === "profile" ? "profile" : "auth");
    }
    
    // Check for successful signup
    const signupSuccess = searchParams.get("signup") === "success";
    if (signupSuccess) {
      toast({
        title: "Account created successfully",
        description: "Please check your email for a verification link before logging in.",
        variant: "default",
      });
      
      // Set active tab to login
      setActiveTab("login");
    }
  }, [searchParams, toast]);

  // Handle login function that uses the Auth API
  const signIn = async (email: string, password: string, redirectPath?: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Login failed');
      }

      const data = await response.json();
      
      if (data.user) {
        // Refresh user data in the context
        await refreshUser();
        
        // Navigate to redirect path or dashboard
        router.push(redirectPath || '/dashboard');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  // Reset password function
  const resetPassword = async (email: string) => {
    if (!email) {
      setError("Please enter your email address");
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Create a FormData instance for the request
      const formData = new FormData();
      formData.append("email", email);
      
      // Call the API route using fetch
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send reset email');
      }
      
      toast({
        title: "Password reset email sent",
        description: "Check your inbox for a link to reset your password",
      });
      
      // Close the dialog
      setShowResetPasswordForm(false);
      
    } catch (err) {
      console.error("Reset password error:", err);
      setError(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle API redirect check on mount
  useEffect(() => {
    // Check if this is a redirect from an API call that needs authentication
    if (searchParams?.get('apiRedirect') === 'true') {
      toast({
        title: "Authentication Required",
        description: "Please log in to access this resource",
        variant: "default"
      });
    }
  }, [searchParams, toast]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setErrorType("general");
    
    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Use the redirectTo from URL params, converting null to undefined
      const success = await signIn(email, password, redirectTo || undefined);
      
      if (success) {
        // Toast is shown in AuthContext after successful login
        // Redirect is handled in the login function
      } else {
        setError("Invalid email or password");
        setErrorType("auth");
      }
    } catch (err) {
      console.error("Login error:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to login";
      
      // Check if the error is related to profile not found
      if (errorMessage.includes("profile not found") || errorMessage.includes("User profile not found")) {
        setError("Your account exists but your profile is incomplete. Please contact support.");
        setErrorType("profile");
      } else if (errorMessage.includes("401") || errorMessage.includes("unauthorized")) {
        setError("Invalid email or password");
        setErrorType("auth");
      } else {
        setError(`Login failed: ${errorMessage}`);
        setErrorType("general");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setErrorType("general");
    
    if (!email || !password || !confirmPassword || !firstName || !lastName) {
      setError("Please fill in all fields");
      return;
    }
    
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Use API route for signup instead of direct supabase client
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
        email,
        password,
          confirmPassword,
          userType: 'student', // Default to student signup
          firstName,
          lastName
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Signup failed');
      }
      
      toast({
        title: "Account created",
        description: "Please check your email to verify your account."
      });
      
      // After successful signup, let's switch to login tab
      setActiveTab("login");
      setPassword("");
      setConfirmPassword("");
      setFirstName("");
      setLastName("");
      
    } catch (err) {
      console.error("Signup error:", err);
      setError(err instanceof Error ? err.message : "Failed to create account");
    } finally {
      setIsLoading(false);
    }
  };

  // Render error based on type
  const renderError = () => {
    if (!error) return null;
    
    switch (errorType) {
      case "profile":
        return (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Profile Error</AlertTitle>
            <AlertDescription>
              {error}
              <div className="mt-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href="/">Go to Homepage</Link>
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        );
      case "auth":
        return <div className="text-red-500 text-sm">{error}</div>;
      default:
        return <div className="text-red-500 text-sm">{error}</div>;
    }
  };

  return (
    <div className="min-h-screen with-navbar flex items-center justify-center bg-muted/30">
      <div className="max-w-md w-full px-4 py-8">
        <div className="flex justify-center mb-6">
          <div className="flex items-center gap-2">
            <Link href="/">
              <div className="flex items-center gap-2">
                <BookOpen className="h-10 w-10 text-primary" />
                <h1 className="text-3xl font-bold">TutorMatch</h1>
              </div>
            </Link>
          </div>
        </div>
        
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "login" | "signup")} className="w-full">
          <TabsList className="grid grid-cols-2 w-full mb-6">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>
          
          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle>Welcome back</CardTitle>
                <CardDescription>Enter your credentials to access your account</CardDescription>
              </CardHeader>
              <form onSubmit={handleLogin}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="name@example.com" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      <button
                        type="button" 
                        onClick={(e) => {
                          e.preventDefault();
                          setResetEmail(email);
                          setShowResetPasswordForm(true);
                        }}
                        className="text-xs text-primary hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <Input 
                      id="password" 
                      type="password" 
                      placeholder="••••••••" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  
                  {renderError()}
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Please wait
                      </>
                    ) : (
                      <>
                        Login
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
          
          <TabsContent value="signup">
            <Card>
              <CardHeader>
                <CardTitle>Create an account</CardTitle>
                <CardDescription>Enter your details to create a new account</CardDescription>
              </CardHeader>
              <form onSubmit={handleSignup}>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="first-name">First Name</Label>
                      <Input 
                        id="first-name" 
                        type="text" 
                        placeholder="John" 
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last-name">Last Name</Label>
                      <Input 
                        id="last-name" 
                        type="text" 
                        placeholder="Doe" 
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input 
                      id="signup-email" 
                      type="email" 
                      placeholder="name@example.com" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input 
                      id="signup-password" 
                      type="password" 
                      placeholder="••••••••" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
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
                    />
                  </div>
                  
                  {renderError()}
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating account
                      </>
                    ) : (
                      <>
                        Create account
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
        </Tabs>
        
        <div className="mt-6 text-center text-sm text-muted-foreground">
          By continuing, you agree to our
          <Link href="#" className="mx-1 text-primary hover:underline">
            Terms of Service
          </Link>
          and
          <Link href="#" className="ml-1 text-primary hover:underline">
            Privacy Policy
          </Link>
        </div>
      </div>
      
      {/* Reset Password Dialog */}
      <Dialog open={showResetPasswordForm} onOpenChange={setShowResetPasswordForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset your password</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email</Label>
              <Input 
                id="reset-email" 
                type="email" 
                placeholder="name@example.com" 
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
              />
            </div>
            {error && <div className="text-red-500 text-sm">{error}</div>}
          </div>
          <DialogFooter className="flex flex-col sm:flex-row sm:justify-between sm:space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowResetPasswordForm(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => resetPassword(resetEmail)}
              disabled={isLoading || !resetEmail}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Reset Link"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 