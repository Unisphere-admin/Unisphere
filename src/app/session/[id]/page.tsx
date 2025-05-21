"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useSessions } from "@/context/SessionContext";
import { 
  BookOpen,
  ChevronLeft,
  Send,
  UserCheck,
  Video,
  Clock,
  X,
  PhoneCall,
  Star,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea as ReviewTextarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

// Define a type for session messages
interface SessionMessage {
  id: string;
  sender_id: string;
  conversation_id: string;
  content: string;
  created_at: string;
  sender?: {
    id: string;
    display_name: string;
    avatar_url: string | null;
    is_tutor: boolean;
  };
}

export default function SessionPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const { user } = useAuth();
  const { 
    endSession, 
    submitReview,
    getSessionById,
    loading: sessionLoading
  } = useSessions();
  const { toast } = useToast();
  
  // Session state
  const [session, setSession] = useState<any>(null);
  const [sessionStatus, setSessionStatus] = useState<"loading" | "active" | "waiting" | "ended" | "error">("loading");
  const [elapsedTime, setElapsedTime] = useState(0); // in seconds
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  
  // Chat state
  const [messages, setMessages] = useState<SessionMessage[]>([]);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Timer interval ref
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Load session data
  useEffect(() => {
    const fetchSession = async () => {
      if (!id) return;
      
      try {
        setSessionStatus("loading");
        // Fetch session data
        const sessionData = await getSessionById(id as string);
        
        if (!sessionData) {
          setSessionStatus("error");
          toast({
            title: "Session not found",
            description: "The session you are looking for doesn't exist or has ended.",
            variant: "destructive"
          });
          return;
        }
        
        setSession(sessionData);
        
        // Set status based on session data
        if (sessionData.status === "started") {
          setSessionStatus("active");
          
          // If session has a start time, calculate elapsed time
          if (sessionData.started_at) {
            const startTime = new Date(sessionData.started_at).getTime();
            const currentTime = Date.now();
            const elapsed = Math.floor((currentTime - startTime) / 1000);
            setElapsedTime(elapsed > 0 ? elapsed : 0);
          }
          
          // Start a timer to update elapsed time
          timerRef.current = setInterval(() => {
            setElapsedTime(prev => prev + 1);
          }, 1000);
        } else if (sessionData.status === "ended") {
          setSessionStatus("ended");
        } else {
          setSessionStatus("waiting");
        }
        
        // Fetch messages for this session's conversation
        await fetchMessages(sessionData.conversation_id);
      } catch (error) {
        console.error("Error fetching session:", error);
        setSessionStatus("error");
        
        toast({
          title: "Error loading session",
          description: "There was an error loading the session. Please try again.",
          variant: "destructive"
        });
      }
    };
    
    fetchSession();
    
    // Clean up timer on unmount
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [id, getSessionById, toast]);
  
  // Fetch messages for the session
  const fetchMessages = async (conversationId: string) => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/messages?conversation_id=${conversationId}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch messages");
      }
      
      const data = await response.json();
      
      if (data.messages) {
        // Make sure we have properly formatted message objects
        const formattedMessages: SessionMessage[] = data.messages.map((msg: any) => ({
          id: msg.id || `temp-${Date.now()}`,
          sender_id: msg.sender_id || '',
          conversation_id: msg.conversation_id || conversationId,
          content: msg.content || '',
          created_at: msg.created_at || new Date().toISOString(),
          // Only include sender if it exists
          ...(msg.sender ? { sender: msg.sender } : {})
        }));
        
        setMessages(formattedMessages);
      } else {
        setMessages([]);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast({
        title: "Error loading messages",
        description: "Could not load chat messages for this session.",
        variant: "destructive"
      });
      // Set empty array on error to prevent rendering issues
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Helper to format elapsed time
  const formatElapsedTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };
  
  // Send a message
  const handleSendMessage = async () => {
    if (!messageText.trim() || !session) return;
    
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          conversation_id: session.conversation_id,
          content: messageText
        })
      });
      
      if (!response.ok) {
        throw new Error("Failed to send message");
      }
      
      const newMessage = await response.json();
      
      // Make sure we're adding a properly formatted message object
      // This prevents directly rendering an API response object
      const formattedMessage: SessionMessage = {
        id: newMessage.id || `temp-${Date.now()}`,
        sender_id: user?.id || '',
        conversation_id: session.conversation_id,
        content: newMessage.content || messageText,
        created_at: newMessage.created_at || new Date().toISOString()
      };
      
      setMessages(prev => [...prev, formattedMessage]);
      setMessageText("");
      
      // Scroll to bottom
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Failed to send message",
        description: "Your message could not be sent. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  // End the session
  const handleEndSession = async () => {
    if (!session) return;
    
    try {
      await endSession(session.id);
      
      // Clear the timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      setSessionStatus("ended");
      
      toast({
        title: "Session ended",
        description: "The tutoring session has been successfully ended."
      });
      
      // Open review dialog
      setIsReviewOpen(true);
    } catch (error) {
      console.error("Error ending session:", error);
      toast({
        title: "Error ending session",
        description: "There was an error ending the session. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  // Submit review
  const handleSubmitReview = async () => {
    if (!session || rating === 0) {
      toast({
        title: "Please add a rating",
        description: "You need to select a rating before submitting your review.",
      });
      return;
    }
    
    try {
      setIsSubmittingReview(true);
      
      await submitReview(
        session.id, 
        session.tutor_id, 
        rating, 
        reviewComment
      );
      
      setIsReviewOpen(false);
      
      toast({
        title: "Review submitted",
        description: "Thank you for your feedback!",
      });
      
      // Navigate back to messages
      router.push("/dashboard/messages");
    } catch (error) {
      console.error("Error submitting review:", error);
      toast({
        title: "Error submitting review",
        description: "There was an error submitting your review. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmittingReview(false);
    }
  };
  
  // Show loading state
  if (sessionLoading || sessionStatus === "loading") {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
          <h3 className="text-xl font-medium">Loading session...</h3>
          <p className="text-muted-foreground mt-2">Please wait while we set up your tutoring session</p>
        </div>
      </div>
    );
  }
  
  // Show error state
  if (sessionStatus === "error" || !session) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <X className="h-10 w-10 text-destructive mx-auto mb-4" />
          <h3 className="text-xl font-medium">Session not found</h3>
          <p className="text-muted-foreground mt-2 mb-6">The session you are looking for doesn't exist or has ended</p>
          <Button onClick={() => router.push("/dashboard/messages")}>Return to Messages</Button>
        </div>
      </div>
    );
  }
  
  // Get other participant (tutor or student)
  const otherParticipant = user?.role === "tutor" 
    ? { 
        name: session.student_profile?.first_name + " " + session.student_profile?.last_name,
        id: session.student_id,
        profilePic: null,
        role: "student"
      }
    : { 
        name: session.tutor_profile?.first_name + " " + session.tutor_profile?.last_name,
        id: session.tutor_id,
        profilePic: session.tutor_profile?.avatar_url,
        role: "tutor"
      };
  
  // Determine if current user is ready
  const isCurrentUserReady = user?.role === "tutor" ? session.tutor_ready : session.student_ready;
  const isOtherUserReady = user?.role === "tutor" ? session.student_ready : session.tutor_ready;
  
  return (
    <div className="flex flex-col min-h-screen">
      {/* Session header */}
      <div className="bg-primary/10 shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard/messages")}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center">
                <BookOpen className="h-6 w-6 text-primary mr-2" />
                <h1 className="text-xl font-semibold">
                  {session.name || "Tutoring Session"}
                </h1>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {sessionStatus === "active" && (
                <div className="flex items-center bg-muted px-3 py-1 rounded-md">
                  <Clock className="h-4 w-4 text-red-500 mr-1.5" />
                  <span className="font-mono">{formatElapsedTime(elapsedTime)}</span>
                </div>
              )}
              
              <Badge 
                className={
                  sessionStatus === "active" ? "bg-green-100 text-green-800" : 
                  sessionStatus === "waiting" ? "bg-amber-100 text-amber-800" :
                  "bg-gray-100 text-gray-800"
                }
              >
                {sessionStatus === "active" ? "Active" : 
                 sessionStatus === "waiting" ? "Waiting to Start" : 
                 "Ended"}
              </Badge>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main content */}
      <div className="container mx-auto px-4 py-6 flex-1 flex flex-col">
        {sessionStatus === "waiting" ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <Card className="max-w-md w-full p-6 text-center">
              <h2 className="text-xl font-semibold mb-4">Waiting to Start Session</h2>
              <p className="text-muted-foreground mb-6">
                Both participants need to be ready to start the session
              </p>
              
              <div className="flex flex-col gap-6 mb-6">
                <div className="flex items-center justify-between bg-muted p-3 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={user?.profilePic} />
                      <AvatarFallback>{user?.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="text-left">
                      <p className="font-medium">{user?.name} (You)</p>
                      <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
                    </div>
                  </div>
                  {isCurrentUserReady ? (
                    <Badge className="bg-green-100 text-green-800">Ready</Badge>
                  ) : (
                    <Badge variant="outline">Not Ready</Badge>
                  )}
                </div>
                
                <div className="flex items-center justify-between bg-muted p-3 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={otherParticipant.profilePic || undefined} />
                      <AvatarFallback>{otherParticipant.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="text-left">
                      <p className="font-medium">{otherParticipant.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{otherParticipant.role}</p>
                    </div>
                  </div>
                  {isOtherUserReady ? (
                    <Badge className="bg-green-100 text-green-800">Ready</Badge>
                  ) : (
                    <Badge variant="outline">Not Ready</Badge>
                  )}
                </div>
              </div>
              
              <Button 
                className="w-full"
                onClick={async () => {
                  try {
                    // Update ready status
                    await fetch('/api/tutoring-sessions', {
                      method: 'PATCH',
                      headers: {
                        'Content-Type': 'application/json'
                      },
                      body: JSON.stringify({
                        session_id: session.id,
                        action: 'set_ready',
                        is_ready: !isCurrentUserReady
                      })
                    });
                    
                    // Update local state
                    setSession((prev: any) => ({
                      ...prev,
                      tutor_ready: user?.role === "tutor" ? !isCurrentUserReady : prev.tutor_ready,
                      student_ready: user?.role === "student" ? !isCurrentUserReady : prev.student_ready
                    }));
                    
                  } catch (error) {
                    console.error("Error updating ready status:", error);
                    toast({
                      title: "Error",
                      description: "Failed to update ready status",
                      variant: "destructive"
                    });
                  }
                }}
              >
                {isCurrentUserReady ? "I'm Not Ready" : "I'm Ready"}
              </Button>
            </Card>
          </div>
        ) : sessionStatus === "active" ? (
          <div className="flex flex-col md:flex-row gap-4 h-full flex-1">
            {/* Video sidebar */}
            <div className="md:w-1/3 lg:w-1/4 bg-muted p-4 rounded-lg flex flex-col">
              <h3 className="font-medium mb-4">Session Info</h3>
              
              <div className="bg-muted/50 border rounded-lg p-3 mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={otherParticipant.profilePic || undefined} />
                    <AvatarFallback>{otherParticipant.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">{otherParticipant.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{otherParticipant.role}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <Button size="sm" className="w-full">
                    <Video className="h-4 w-4 mr-2" />
                    Video
                  </Button>
                  <Button size="sm" variant="outline" className="w-full">
                    <PhoneCall className="h-4 w-4 mr-2" />
                    Audio
                  </Button>
                </div>
                
                <div className="text-xs text-muted-foreground">
                  <p className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    Duration: {formatElapsedTime(elapsedTime)}
                  </p>
                </div>
              </div>
              
              <div className="flex-1"></div>
              
              <Button 
                variant="destructive" 
                className="mt-4"
                onClick={handleEndSession}
              >
                End Session
              </Button>
            </div>
            
            {/* Chat area */}
            <div className="flex-1 flex flex-col border rounded-lg overflow-hidden">
              {/* Chat header */}
              <div className="bg-muted/50 p-3 border-b flex items-center justify-between">
                <h3 className="font-medium">Session Chat</h3>
              </div>
              
              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                {loading ? (
                  <div className="flex items-center justify-center h-40">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-10">
                    <h4 className="font-medium mb-2">No messages yet</h4>
                    <p className="text-muted-foreground text-sm">
                      Send a message to start the conversation
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message) => {
                      const isFromMe = message.sender_id === user?.id;
                      
                      return (
                        <div
                          key={message.id}
                          className={`flex ${isFromMe ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[80%] px-4 py-2 rounded-lg ${
                              isFromMe 
                                ? "bg-primary text-primary-foreground" 
                                : "bg-muted"
                            }`}
                          >
                            <p>{message.content}</p>
                            <div className={`text-xs mt-1 ${
                              isFromMe ? "text-primary-foreground/70" : "text-muted-foreground"
                            }`}>
                              {new Date(message.created_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>
              
              {/* Message input */}
              <div className="p-3 border-t">
                <div className="flex gap-2">
                  <Textarea 
                    placeholder="Type a message..." 
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    className="min-h-[40px] resize-none"
                  />
                  <Button 
                    size="icon"
                    disabled={!messageText.trim()}
                    onClick={handleSendMessage}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center">
            <Card className="max-w-md w-full p-6 text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Session Ended</h2>
              <p className="text-muted-foreground mb-6">
                This tutoring session has been completed
              </p>
              
              <div className="bg-muted p-3 rounded-lg mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <Avatar>
                    <AvatarImage src={otherParticipant.profilePic || undefined} />
                    <AvatarFallback>{otherParticipant.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="text-left">
                    <p className="font-medium">{otherParticipant.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{otherParticipant.role}</p>
                  </div>
                </div>
                
                <div className="text-xs text-muted-foreground text-left">
                  <p>Subject: {session.subject || "General Tutoring"}</p>
                  <p>Duration: {formatElapsedTime(elapsedTime)}</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <Button className="w-full" onClick={() => setIsReviewOpen(true)}>
                  Leave a Review
                </Button>
                <Button variant="outline" className="w-full" onClick={() => router.push("/dashboard/messages")}>
                  Return to Messages
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
      
      {/* Review dialog */}
      <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Rate Your Experience</DialogTitle>
            <DialogDescription>
              How was your tutoring session with {otherParticipant.name}?
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex justify-center py-4">
            <div className="flex space-x-1">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  className="focus:outline-none"
                  onClick={() => setRating(star)}
                >
                  <Star
                    className={`h-8 w-8 ${
                      star <= rating 
                        ? "text-amber-500 fill-amber-500" 
                        : "text-muted-foreground"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="comment">Additional Comments</Label>
              <ReviewTextarea
                id="comment"
                placeholder="Tell us about your experience..."
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsReviewOpen(false)}
              disabled={isSubmittingReview}
            >
              Skip
            </Button>
            <Button 
              onClick={handleSubmitReview}
              disabled={rating === 0 || isSubmittingReview}
            >
              {isSubmittingReview ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Review"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 