"use client";

// Root error boundary - catches any unhandled runtime error inside a route segment.
// Without this file, Next.js shows a raw crash page in production.
// See: https://nextjs.org/docs/app/api-reference/file-conventions/error

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function RootError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log to an error reporting service when available
    if (process.env.NODE_ENV !== "development") {
      // e.g. Sentry.captureException(error);
    }
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-white">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
        </div>

        {/* Heading */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">Something went wrong</h1>
          <p className="text-gray-500 text-sm">
            An unexpected error occurred. Our team has been notified. You can try again or return home.
          </p>
        </div>

        {/* Error details (dev only) */}
        {process.env.NODE_ENV === "development" && (
          <div className="text-left bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-xs font-mono text-red-600 break-all">
              {error.message}
            </p>
            {error.digest && (
              <p className="text-xs text-gray-400 mt-1">Digest: {error.digest}</p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={reset}
            variant="default"
            className="bg-[#128ca0] hover:bg-[#0e6b7a] gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </Button>
          <Button variant="outline" asChild>
            <Link href="/" className="gap-2 inline-flex items-center">
              <Home className="w-4 h-4" />
              Return to Home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
