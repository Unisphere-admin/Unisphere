"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useSessions } from "@/context/SessionContext";
import { 
  StarIcon, 
  ArrowLeft,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { ActiveSession } from "@/context/SessionContext";

export default function LeaveReviewPage() {
  const router = useRouter();
  const { sessionId } = useParams() as { sessionId: string };
  const { user } = useAuth();
  const { getSessionById, submitReview } = useSessions();
  
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch session data
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const sessionData = await getSessionById(sessionId);
        setSession(sessionData);
        
        if (!sessionData) {
          setError("Session not found");
        } else if (sessionData.status !== "ended") {
          setError("You can only review completed sessions");
        }
      } catch (err) {
        setError("Error loading session data");
        console.error("Error fetching session:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [sessionId, getSessionById]);

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      router.push("/login");
    }
  }, [user, router]);

  // Handle form submission
  const handleSubmitReview = async () => {
    if (rating === 0) {
      toast.error("Please select a rating before submitting");
      return;
    }

    if (!session?.tutor_id) {
      toast.error("Unable to identify tutor for this session");
      return;
    }

    setSubmitting(true);
    try {
      await submitReview(
        sessionId,
        session.tutor_id,
        rating,
        comment
      );
      
      toast.success("Review submitted successfully");
      
      // Redirect back to dashboard after successful submission
      setTimeout(() => {
        router.push("/dashboard");
      }, 1000);
    } catch (err) {
      console.error("Error submitting review:", err);
      toast.error("Failed to submit review. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading session data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container max-w-3xl py-8">
        <Link href="/dashboard" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to dashboard
        </Link>
        
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        
        <Button className="mt-6" asChild>
          <Link href="/dashboard">Return to Dashboard</Link>
        </Button>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container max-w-3xl py-8">
        <Link href="/dashboard" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to dashboard
        </Link>
        
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Session Not Found</AlertTitle>
          <AlertDescription>We couldn't find the session you're looking for.</AlertDescription>
        </Alert>
        
        <Button className="mt-6" asChild>
          <Link href="/dashboard">Return to Dashboard</Link>
        </Button>
      </div>
    );
  }

  // Only students can leave reviews for tutors
  if (user?.role === "tutor") {
    return (
      <div className="container max-w-3xl py-8">
        <Link href="/dashboard" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to dashboard
        </Link>
        
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Not Allowed</AlertTitle>
          <AlertDescription>Only students can leave reviews for tutors.</AlertDescription>
        </Alert>
        
        <Button className="mt-6" asChild>
          <Link href="/dashboard">Return to Dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container max-w-3xl py-8 relative">
      {/* Add subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background pointer-events-none -z-10"></div>
      
      <Link href="/dashboard" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to dashboard
      </Link>
      
      <Card className="mb-8 bg-card/80 backdrop-blur-sm border-border/40 shadow-lg hover:shadow-xl transition-all">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 shadow-md">
              <StarIcon className="h-6 w-6 text-primary fill-primary/20" />
            </div>
          </div>
          <CardTitle className="text-center">Leave a Review</CardTitle>
          <CardDescription className="text-center">
            {session.tutor_profile ? 
              `Share your experience with ${session.tutor_profile.first_name} ${session.tutor_profile.last_name}` :
              'Share your experience with this tutor'}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="mb-6 p-3 rounded-lg bg-muted/50 border border-border/30">
            <div className="text-sm font-medium mb-2">Session Details</div>
            <p className="text-sm text-muted-foreground">
              {session.name || "Tutoring Session"} - {session.scheduled_for ? 
                new Date(session.scheduled_for).toLocaleDateString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                }) : 
                "Unknown date"}
            </p>
          </div>
          
          <div>
            <div className="text-sm font-medium mb-2">Rating</div>
            <div className="flex items-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary transition-transform hover:scale-110"
                >
                  <StarIcon 
                    className={cn(
                      "h-8 w-8 transition-colors", 
                      rating >= star 
                        ? "text-yellow-500 fill-yellow-500" 
                        : "text-muted-foreground hover:text-yellow-400 hover:fill-yellow-100"
                    )} 
                  />
                </button>
              ))}
              <span className="ml-2 text-sm text-muted-foreground">
                {rating > 0 ? `${rating} of 5 stars` : "Select a rating"}
              </span>
            </div>
          </div>

          <div>
            <div className="text-sm font-medium mb-2">Your Comments (Optional)</div>
            <Textarea
              placeholder="Share details about your experience with this tutor..."
              className="min-h-[120px] resize-y bg-background/80 backdrop-blur-sm border-border/40 shadow-sm focus-visible:border-primary/30 focus-visible:ring-1 focus-visible:ring-primary/20 transition-all"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={1000}
            />
            <div className="mt-1 text-xs text-muted-foreground text-right">
              {comment.length}/1000 characters
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="flex flex-col gap-2 sm:flex-row sm:justify-between pt-2">
          <Button
            variant="outline"
            onClick={() => router.back()}
            disabled={submitting}
            className="shadow-sm border-border/40 hover:bg-muted hover:border-primary/30 transition-all"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmitReview}
            disabled={rating === 0 || submitting}
            className="shadow-md hover:shadow-lg bg-primary hover:bg-primary/90 transition-all hover:translate-y-[-2px]"
          >
            {submitting ? (
              <>
                <span className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                Submitting...
              </>
            ) : (
              "Submit Review"
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
} 