"use client";

import { ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { getLeaveReviewLink } from "@/utils/messageLinks";

interface ReviewLinkProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  sessionId: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  children?: ReactNode;
  showIcon?: boolean;
  className?: string;
}

/**
 * ReviewLink component provides a button that links to the leave review page
 * for a completed tutoring session.
 * 
 * @example
 * <ReviewLink sessionId="123">Leave a Review</ReviewLink>
 */
export function ReviewLink({
  sessionId,
  variant = "default",
  size = "default",
  children = "Leave a Review",
  showIcon = true,
  className,
  ...props
}: ReviewLinkProps) {
  const linkHref = getLeaveReviewLink(sessionId);
  
  return (
    <Link href={linkHref} passHref>
      <Button 
        variant={variant} 
        size={size}
        className={className}
        {...props}
      >
        {showIcon && <Star className="h-4 w-4 mr-2" />}
        {children}
      </Button>
    </Link>
  );
} 