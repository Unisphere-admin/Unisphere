"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, Coins } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  getCsrfTokenFromStorage,
  CSRF_HEADER_NAME,
  useCsrfToken,
} from "@/lib/csrf/client";

interface CreditRequestCardProps {
  messageId: string;
  conversationId: string;
  tutorId: string;
  title: string;
  amount: number;
  status?: "pending" | "accepted" | "declined";
}

export function CreditRequestCard({
  messageId,
  conversationId,
  tutorId,
  title,
  amount,
  status = "pending",
}: CreditRequestCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { fetchCsrfToken } = useCsrfToken();
  const [loading, setLoading] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(status);
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);

  const isTutor = user?.role === "tutor";
  const isStudent = !isTutor;

  // Check if transaction already exists on mount
  useEffect(() => {
    const checkTransactionStatus = async () => {
      try {
        console.log("Checking transaction status for message:", messageId);
        const response = await fetch(
          `/api/credits/check-status?message_id=${messageId}`,
          {
            credentials: "include",
          }
        );

        if (response.ok) {
          const data = await response.json();
          console.log("Transaction check result:", data);
          if (data.exists) {
            console.log("Transaction exists with status:", data.status);
            if (data.status === "accepted") {
              setCurrentStatus("accepted");
            } else if (data.status === "declined") {
              setCurrentStatus("declined");
            }
          } else {
            console.log("No transaction found, keeping status as pending");
          }
        } else {
          console.error(
            "Failed to check status, response not ok:",
            response.status
          );
        }
      } catch (error) {
        console.error("Failed to check transaction status:", error);
      }
    };

    if (messageId) {
      checkTransactionStatus();
    }
  }, [messageId]);

  // Handle accepting the credit request
  const handleAccept = async () => {
    if (!user || isButtonDisabled || currentStatus !== "pending") return;

    console.log("Credit request accept attempt:", {
      messageId,
      tutorId,
      amount,
      currentUserId: user.id,
    });

    setLoading(true);
    setIsButtonDisabled(true);

    try {
      // Get CSRF token
      const csrfToken = await fetchCsrfToken(true);
      if (!csrfToken) {
        throw new Error("Failed to fetch CSRF token");
      }

      const payload = {
        message_id: messageId,
        tutor_id: tutorId,
        amount,
      };

      console.log("Sending transfer request:", payload);

      const response = await fetch("/api/credits/transfer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          [CSRF_HEADER_NAME]: csrfToken,
        },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      const result = await response.json();

      if (!response.ok) {
        // If already processed, update status to accepted
        if (response.status === 409 && result.alreadyProcessed) {
          setCurrentStatus("accepted");
          toast({
            title: "Already processed",
            description: "This credit request has already been accepted.",
          });
          return;
        }

        console.error("Transfer failed:", result);
        throw new Error(result.error || "Failed to transfer credits");
      }

      console.log("Transfer successful:", result);

      setCurrentStatus("accepted");
      toast({
        title: "Credits transferred",
        description: `Successfully transferred ${amount} credit${
          amount > 1 ? "s" : ""
        } to the tutor.`,
      });
    } catch (error) {
      console.error("Transfer error:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to transfer credits",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setIsButtonDisabled(false);
    }
  };

  // Handle declining the credit request
  const handleDecline = async () => {
    if (!user || isButtonDisabled) return;

    setLoading(true);
    setIsButtonDisabled(true);

    try {
      // Get CSRF token
      const csrfToken = await fetchCsrfToken(true);
      if (!csrfToken) {
        throw new Error("Failed to fetch CSRF token");
      }

      const response = await fetch("/api/credits/decline", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          [CSRF_HEADER_NAME]: csrfToken,
        },
        body: JSON.stringify({
          message_id: messageId,
          tutor_id: tutorId,
        }),
        credentials: "include",
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Failed to decline request");
      }

      setCurrentStatus("declined");
      toast({
        title: "Request declined",
        description: "Credit request has been declined.",
      });
    } catch (error) {
      console.error("Decline error:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to decline request",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setIsButtonDisabled(false);
    }
  };

  // Get status badge
  const getStatusBadge = () => {
    switch (currentStatus) {
      case "pending":
        return (
          <Badge
            variant="outline"
            className="text-yellow-600 border-yellow-400 bg-amber-50 dark:bg-yellow-950/30 dark:text-yellow-300 rounded-full px-4 py-0.5 font-medium"
          >
            Pending
          </Badge>
        );
      case "accepted":
        return (
          <Badge
            variant="outline"
            className="text-green-600 border-green-400 bg-green-50 dark:bg-green-950/30 dark:text-green-300 rounded-full px-4 py-0.5 font-medium"
          >
            Accepted
          </Badge>
        );
      case "declined":
        return (
          <Badge
            variant="outline"
            className="text-red-600 border-red-400 bg-red-50 dark:bg-red-950/30 dark:text-red-300 rounded-full px-4 py-0.5 font-medium"
          >
            Declined
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <Card className="bg-slate-50 border border-slate-200 shadow-sm dark:bg-slate-900/50 dark:border-slate-800">
      <CardContent className="pt-4 pb-2">
        <div className="flex items-start gap-3">
          <Coins className="h-5 w-5 text-amber-600 mt-0.5 dark:text-amber-400" />
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-base">{title}</h3>
              {getStatusBadge()}
            </div>
            <div className="flex items-center text-sm text-muted-foreground mt-1">
              <span className="font-medium">
                Amount: {amount} {amount === 1 ? "Credit" : "Credits"}
              </span>
            </div>
            {currentStatus === "accepted" && (
              <div className="mt-3 text-sm text-green-600 dark:text-green-400">
                <p>Credits have been transferred successfully.</p>
              </div>
            )}
            {currentStatus === "declined" && (
              <div className="mt-3 text-sm text-red-600 dark:text-red-400">
                <p>This credit request has been declined.</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
      {currentStatus === "pending" && isStudent && (
        <CardFooter className="flex flex-wrap gap-2 pt-2 pb-3">
          <Button
            variant="default"
            size="sm"
            onClick={handleAccept}
            disabled={loading || isButtonDisabled}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            )}
            Accept
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={loading || isButtonDisabled}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Decline
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Decline Credit Request</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to decline this credit request? This
                  action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-600 hover:bg-red-700"
                  onClick={handleDecline}
                >
                  Decline
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardFooter>
      )}
      {currentStatus === "pending" && isTutor && (
        <CardFooter className="pt-2 pb-3">
          <p className="text-sm text-muted-foreground">
            Waiting for student to accept...
          </p>
        </CardFooter>
      )}
    </Card>
  );
}
