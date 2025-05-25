    /**
 * Utility functions for generating message and conversation links
 */

/**
 * Generate a URL to a specific conversation
 * @param conversationId The ID of the conversation to link to
 * @returns The URL to the conversation in the dashboard messages page
 */
export function getConversationLink(conversationId: string): string {
  return `/dashboard/messages?conversationId=${encodeURIComponent(conversationId)}`;
}

/**
 * Generate a URL to a specific message within a conversation
 * @param conversationId The ID of the conversation containing the message
 * @param messageId The ID of the specific message to scroll to
 * @returns The URL to the specific message in the dashboard messages page
 */
export function getMessageLink(conversationId: string, messageId: string): string {
  return `/dashboard/messages?conversationId=${encodeURIComponent(conversationId)}&messageId=${encodeURIComponent(messageId)}`;
}

/**
 * Generate a URL to a specific tutoring session
 * @param sessionId The ID of the tutoring session to link to
 * @returns The URL to the tutoring session in the dashboard messages page
 */
export function getSessionLink(sessionId: string): string {
  return `/dashboard/messages?sessionId=${encodeURIComponent(sessionId)}`;
}

/**
 * Generate a URL to a specific tutoring session with message highlighted
 * @param sessionId The ID of the tutoring session to link to
 * @param messageId The ID of the specific message to scroll to (typically the session request message)
 * @returns The URL to the tutoring session in the dashboard messages page
 */
export function getSessionWithMessageLink(sessionId: string, messageId: string): string {
  return `/dashboard/messages?sessionId=${encodeURIComponent(sessionId)}&messageId=${encodeURIComponent(messageId)}`;
} 

/**
 * Generate a URL to the leave review page for a specific session
 * @param sessionId The ID of the completed session to leave a review for
 * @returns The URL to the leave review page
 */
export function getLeaveReviewLink(sessionId: string): string {
  return `/dashboard/leave-review/${encodeURIComponent(sessionId)}`;
} 