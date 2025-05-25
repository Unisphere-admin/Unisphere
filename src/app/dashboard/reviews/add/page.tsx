"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

/**
 * Redirect page for backward compatibility
 * This redirects old review links to the new leave-review page
 */
export default function ReviewRedirectPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  useEffect(() => {
    // Get the session ID from the URL parameters
    const sessionId = searchParams?.get("sessionId");
    
    if (sessionId) {
      // Redirect to the new review page
      router.replace(`/dashboard/leave-review/${sessionId}`);
    } else {
      // If no session ID provided, redirect to dashboard
      router.replace("/dashboard/history");
    }
  }, [searchParams, router]);
  
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-muted-foreground">Redirecting to review form...</p>
      </div>
    </div>
  );
} 