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
    <div className="flex min-h-[60vh] items-center justify-center relative">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background pointer-events-none"></div>
      <div className="absolute inset-0 z-0">
        <div className="absolute top-20 right-[20%] w-72 h-72 bg-primary/5 rounded-full blur-3xl opacity-70 animate-pulse" style={{animationDuration: '8s'}}></div>
        <div className="absolute bottom-10 left-[10%] w-80 h-80 bg-secondary/5 rounded-full blur-3xl opacity-60 animate-pulse" style={{animationDuration: '12s'}}></div>
      </div>
      
      <div className="text-center relative z-10">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-muted-foreground">Redirecting to review form...</p>
      </div>
    </div>
  );
} 