"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowRight, Mail, LockKeyhole, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { emailSchema, passwordSchema, nameSchema, sanitizeInput, checkForMaliciousContent } from "@/lib/validation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Sanitize inputs
    const sanitizedEmail = sanitizeInput(email);
    const sanitizedFirstName = sanitizeInput(firstName);
    const sanitizedLastName = sanitizeInput(lastName);

    // Validate fields
    try {
      nameSchema.parse(sanitizedFirstName);
      nameSchema.parse(sanitizedLastName);
      emailSchema.parse(sanitizedEmail);
      passwordSchema.parse(password);
    } catch (err: any) {
      setError(err.errors?.[0]?.message || "Invalid input");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (
      checkForMaliciousContent(sanitizedEmail) ||
      checkForMaliciousContent(password) ||
      checkForMaliciousContent(sanitizedFirstName) ||
      checkForMaliciousContent(sanitizedLastName)
    ) {
      setError("Invalid input detected");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: sanitizedEmail,
          password,
          confirmPassword,
          userType: "student",
          firstName: sanitizedFirstName,
          lastName: sanitizedLastName,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Failed to sign up");
        return;
      }
      toast({
        title: "Account created!",
        description: "Check your email to verify your account.",
      });
      router.push("/login?signup=success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign up");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen with-navbar flex flex-col items-center justify-center bg-gradient-to-b from-background via-background/95 to-muted/20 p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-[20%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl opacity-70 animate-pulse" style={{animationDuration: '8s'}}></div>
        <div className="absolute -bottom-20 left-[10%] w-[600px] h-[600px] bg-secondary/5 rounded-full blur-3xl opacity-60" style={{animationDuration: '12s'}}></div>
      </div>
      <div className="relative z-10 max-w-md w-full">
        <Card className="border-border/40 shadow-xl backdrop-blur-sm bg-card/95">
          <CardHeader className="px-6 pb-2">
            <CardTitle className="text-xl">Create your account</CardTitle>
            <CardDescription>Sign up to get started</CardDescription>
          </CardHeader>
          <form onSubmit={handleSignup}>
            <CardContent className="px-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-sm font-medium">First Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="First Name"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    className="pl-10 border-border/40 focus-visible:border-primary/30 focus-visible:ring-1 focus-visible:ring-primary/20 transition-all"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-sm font-medium">Last Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Last Name"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    className="pl-10 border-border/40 focus-visible:border-primary/30 focus-visible:ring-1 focus-visible:ring-primary/20 transition-all"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="pl-10 border-border/40 focus-visible:border-primary/30 focus-visible:ring-1 focus-visible:ring-primary/20 transition-all"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                <div className="relative">
                  <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="pl-10 border-border/40 focus-visible:border-primary/30 focus-visible:ring-1 focus-visible:ring-primary/20 transition-all"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm Password</Label>
                <div className="relative">
                  <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="pl-10 border-border/40 focus-visible:border-primary/30 focus-visible:ring-1 focus-visible:ring-primary/20 transition-all"
                    required
                  />
                </div>
              </div>
              {error && (
                <Alert variant="destructive" className="mt-4 animate-in fade-in-50">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
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
                    Sign Up
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p className="backdrop-blur-sm bg-background/40 p-3 rounded-lg shadow-sm border border-border/20">
            Already have an account?
            <Link href="/login" className="mx-1 text-primary hover:underline font-medium">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}