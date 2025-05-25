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
import { BookOpen, ArrowRight, Loader2, X, LockKeyhole, Mail, User, Shield } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";

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
          <Alert variant="destructive" className="mt-4 animate-in fade-in-50">
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
        return (
          <Alert variant="destructive" className="mt-4 animate-in fade-in-50">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Authentication Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        );
      default:
        return (
          <Alert variant="destructive" className="mt-4 animate-in fade-in-50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        );
    }
  };

  return (
    <div className="min-h-screen with-navbar flex flex-col items-center justify-center bg-gradient-to-b from-background via-background/95 to-muted/20 p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-[20%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl opacity-70 animate-pulse" style={{animationDuration: '8s'}}></div>
        <div className="absolute -bottom-20 left-[10%] w-[600px] h-[600px] bg-secondary/5 rounded-full blur-3xl opacity-60" style={{animationDuration: '12s'}}></div>
      </div>
      
      <div className="relative z-10 max-w-md w-full">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2 transition hover:opacity-80">
            <div className="bg-primary/10 p-2 rounded-md">
              <BookOpen className="h-6 w-6 text-primary" strokeWidth={2} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">TutorMatch</h1>
          </Link>
          <p className="mt-2 text-muted-foreground text-sm">Learn from the best, anytime, anywhere</p>
        </div>
        
        <Card className="border-border/40 shadow-xl backdrop-blur-sm bg-card/95">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "login" | "signup")} className="w-full">
            <TabsList className="grid grid-cols-2 w-full mb-2 bg-muted/50">
              <TabsTrigger value="login" className="rounded-md data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm">Login</TabsTrigger>
              <TabsTrigger value="signup" className="rounded-md data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login" className="mt-0 pt-4">
              <CardHeader className="px-6 pb-2">
                <CardTitle className="text-xl">Welcome back</CardTitle>
                <CardDescription>Enter your credentials to access your account</CardDescription>
              </CardHeader>
              <form onSubmit={handleLogin}>
                <CardContent className="px-6 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="email" 
                        type="email" 
                        placeholder="name@example.com" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 border-border/40 focus-visible:border-primary/30 focus-visible:ring-1 focus-visible:ring-primary/20 transition-all"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-sm font-medium">Password</Label>
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
                    <div className="relative">
                      <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="password" 
                        type="password" 
                        placeholder="••••••••" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 border-border/40 focus-visible:border-primary/30 focus-visible:ring-1 focus-visible:ring-primary/20 transition-all"
                        required
                      />
                    </div>
                  </div>
                  
                  {renderError()}
                </CardContent>
                <CardFooter className="px-6 pt-2">
                  <Button 
                    type="submit" 
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm hover:shadow-md transition-all"
                    disabled={isLoading}
                  >
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
            </TabsContent>
            
            <TabsContent value="signup" className="mt-0 pt-4">
              <CardHeader className="px-6 pb-2">
                <CardTitle className="text-xl">Create an account</CardTitle>
                <CardDescription>Enter your details to create a new account</CardDescription>
              </CardHeader>
              <form onSubmit={handleSignup}>
                <CardContent className="px-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="first-name" className="text-sm font-medium">First Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          id="first-name" 
                          type="text" 
                          placeholder="John" 
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className="pl-10 border-border/40 focus-visible:border-primary/30 focus-visible:ring-1 focus-visible:ring-primary/20 transition-all"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last-name" className="text-sm font-medium">Last Name</Label>
                      <Input 
                        id="last-name" 
                        type="text" 
                        placeholder="Doe" 
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="border-border/40 focus-visible:border-primary/30 focus-visible:ring-1 focus-visible:ring-primary/20 transition-all"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-sm font-medium">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="signup-email" 
                        type="email" 
                        placeholder="name@example.com" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 border-border/40 focus-visible:border-primary/30 focus-visible:ring-1 focus-visible:ring-primary/20 transition-all"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-sm font-medium">Password</Label>
                    <div className="relative">
                      <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="signup-password" 
                        type="password" 
                        placeholder="••••••••" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 border-border/40 focus-visible:border-primary/30 focus-visible:ring-1 focus-visible:ring-primary/20 transition-all"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password" className="text-sm font-medium">Confirm Password</Label>
                    <div className="relative">
                      <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="confirm-password" 
                        type="password" 
                        placeholder="••••••••" 
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-10 border-border/40 focus-visible:border-primary/30 focus-visible:ring-1 focus-visible:ring-primary/20 transition-all"
                        required
                      />
                    </div>
                  </div>
                  
                  {renderError()}
                </CardContent>
                <CardFooter className="px-6 pt-2">
                  <Button 
                    type="submit" 
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm hover:shadow-md transition-all"
                    disabled={isLoading}
                  >
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
            </TabsContent>
          </Tabs>
        </Card>
        
        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p className="backdrop-blur-sm bg-background/40 p-3 rounded-lg shadow-sm border border-border/20">
            By continuing, you agree to our
            <Link href="#" className="mx-1 text-primary hover:underline font-medium">
              Terms of Service
            </Link>
            and
            <Link href="#" className="ml-1 text-primary hover:underline font-medium">
              Privacy Policy
            </Link>
          </p>
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
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="reset-email" 
                  type="email" 
                  placeholder="name@example.com" 
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="pl-10 border-border/40 focus-visible:border-primary/30 focus-visible:ring-1 focus-visible:ring-primary/20 transition-all"
                />
              </div>
            </div>
            {error && <div className="text-red-500 text-sm">{error}</div>}
          </div>
          <DialogFooter className="flex flex-col sm:flex-row sm:justify-between sm:space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowResetPasswordForm(false)}
              disabled={isLoading}
              className="border-primary/20 hover:border-primary/50 hover:bg-primary/5 transition-all"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => resetPassword(resetEmail)}
              disabled={isLoading || !resetEmail}
              className="bg-primary hover:bg-primary/90 shadow-sm hover:shadow-md transition-all"
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