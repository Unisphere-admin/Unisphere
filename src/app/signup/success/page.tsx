"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Mail, ArrowRight, Home, Loader2 } from "lucide-react";

/**
 * Confirmation page shown immediately after a successful signup.
 *
 * The previous flow popped a tiny toast in the bottom-right corner and
 * dropped the user on /login, which made it really easy to miss the
 * "check your email" instruction. This is a full-screen replacement
 * that the user cannot miss: it shows the email address we sent the
 * verification link to, tells them what to do, and gives them a clear
 * way to head to login once they've clicked the link.
 *
 * The user's email is passed via ?email= query param. We display it
 * back to them so they can verify they typed it correctly. The address
 * is the user's own and is not sensitive in this context.
 */
function SignupSuccessContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  return (
    <div className="min-h-screen with-navbar flex items-center justify-center bg-gradient-to-b from-background via-background/95 to-muted/20 p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-20 right-[20%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl opacity-70 animate-pulse"
          style={{ animationDuration: "8s" }}
        />
        <div
          className="absolute -bottom-20 left-[10%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl opacity-60"
          style={{ animationDuration: "12s" }}
        />
      </div>

      <div className="relative z-10 max-w-2xl w-full">
        <Card className="border-border/40 shadow-xl backdrop-blur-sm bg-card/95">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-3xl">Thanks for signing up!</CardTitle>
            <CardDescription className="text-lg pt-2">
              Please check your email to activate your account
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {email && (
              <div className="text-center bg-muted/30 rounded-lg p-4 border border-border/40">
                <p className="text-sm text-muted-foreground mb-1">
                  We sent a verification link to
                </p>
                <p className="text-base font-semibold break-all">{email}</p>
              </div>
            )}

            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">Next step:</span>{" "}
                Open that email and click the verification link inside. Once
                you do, your account is activated and you can sign in.
              </p>
              <p>
                The email is from{" "}
                <span className="font-mono text-foreground">
                  no-reply@unisphere.my
                </span>
                . It usually arrives within a minute. If you don&apos;t see it,
                check your spam or promotions folder.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button asChild className="flex-1">
                <Link href="/login" className="flex items-center gap-2">
                  Already verified? Sign in
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" asChild className="flex-1">
                <Link href="/" className="flex items-center gap-2">
                  <Home className="h-4 w-4" />
                  Back to home
                </Link>
              </Button>
            </div>

            <div className="text-center text-xs text-muted-foreground pt-2 border-t border-border/40">
              <p>
                Still didn&apos;t arrive after a few minutes? Email us at{" "}
                <a
                  href="mailto:hello@unisphere.my"
                  className="underline hover:text-foreground"
                >
                  hello@unisphere.my
                </a>{" "}
                and we&apos;ll get you sorted.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function SignupSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen with-navbar flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      }
    >
      <SignupSuccessContent />
    </Suspense>
  );
}
