"use client";

import { ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { getMessageLink, getSessionLink, getSessionWithMessageLink } from "@/utils/messageLinks";

interface SessionLinkProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  sessionId?: string;
  messageId?: string;
  conversationId?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  children?: ReactNode;
  showIcon?: boolean;
}

/**
 * SessionLink component provides a button that links to a specific session
 * in the messages page.
 * 
 * @example
 * // Link to a session
 * <SessionLink sessionId="123">View Session</SessionLink>
 * 
 * @example
 * // Link to a specific message in a conversation
 * <SessionLink conversationId="123" messageId="456">View Message</SessionLink>
 * 
 * @example
 * // Link to a session and highlight the associated message
 * <SessionLink sessionId="123" messageId="456">View Session Message</SessionLink>
 */
export function SessionLink({
  sessionId,
  messageId,
  conversationId,
  variant = "outline",
  size = "sm",
  children = "View in Messages",
  showIcon = true,
  ...props
}: SessionLinkProps) {
  let linkHref = "";
  
  // Determine the appropriate link based on the props provided
  if (sessionId && messageId) {
    // Link to a session with a specific message highlighted
    linkHref = getSessionWithMessageLink(sessionId, messageId);
  } else if (sessionId) {
    // Link to just a session
    linkHref = getSessionLink(sessionId);
  } else if (conversationId && messageId) {
    // Link to a specific message in a conversation
    linkHref = getMessageLink(conversationId, messageId);
  } else if (conversationId) {
    // Link to just a conversation
    linkHref = getMessageLink(conversationId, "");
  }
  
  // If we don't have sufficient info to create a link, don't render anything
  if (!linkHref) {
    return null;
  }
  
  return (
    <Link href={linkHref} passHref>
      <Button 
        variant={variant} 
        size={size}
        {...props}
      >
        {showIcon && <MessageSquare className="h-4 w-4 mr-2" />}
        {children}
      </Button>
    </Link>
  );
} 