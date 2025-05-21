"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useMessages } from "@/context/MessageContext";
import { 
  Search, 
  Send,
  User,
  Calendar,
  Loader2,
  ChevronLeft,
  MoreVertical,
  LayoutDashboard
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

export default function MessagesPage() {
  const { user } = useAuth();
  const { 
    conversations, 
    loading, 
    currentConversation, 
    messages, 
    selectedConversationId,
    setSelectedConversationId,
    sendMessage,
    markConversationAsRead,
    loadingMessages,
    hasUnreadMessages
  } = useMessages();
  const { toast } = useToast();
  
  // Local state for the UI
  const [searchQuery, setSearchQuery] = useState("");
  const [messageText, setMessageText] = useState("");
  
  // Session scheduling state
  const [selectedSubject, setSelectedSubject] = useState("");
  const [sessionDate, setSessionDate] = useState("");
  const [sessionTime, setSessionTime] = useState("");
  const [sessionDuration, setSessionDuration] = useState("1 hour");
  const [isSchedulingSession, setIsSchedulingSession] = useState(false);
  
  // Refs for scrolling
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Redirect if not logged in
  if (!user) {
    redirect("/login");
  }
  
  // Filter conversations by search query
  const filteredConversations = conversations.filter(convo => 
    convo.participant?.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);
  
  // Mark conversation as read when opened
  useEffect(() => {
    if (selectedConversationId && hasUnreadMessages(selectedConversationId)) {
      markConversationAsRead(selectedConversationId);
    }
  }, [selectedConversationId, markConversationAsRead, hasUnreadMessages]);

  // Handle message send
  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedConversationId) return;
    
    try {
      await sendMessage(selectedConversationId, messageText);
      setMessageText("");
    } catch (error) {
      console.error("Failed to send message:", error);
      toast({
        title: "Failed to send message",
        description: "Please try again later",
        variant: "destructive",
      });
    }
  };
  
  // Handle conversation selection
  const handleConversationSelect = (conversationId: string) => {
    setSelectedConversationId(conversationId);
  };

  // Handle session request submission
  const handleCreateSessionRequest = async () => {
    if (!selectedConversationId || !selectedSubject || !sessionDate) {
      toast({
        title: "Missing information",
        description: "Please fill out all required fields",
        variant: "destructive",
      });
      return;
    }
    
    setIsSchedulingSession(true);
    
    try {
      // Format the message for the session request
      const sessionMessage = `💼 Session Request:
Subject: ${selectedSubject}
Date: ${sessionDate} ${sessionTime}
Duration: ${sessionDuration}`;
      
      // Send the message
      await sendMessage(selectedConversationId, sessionMessage);
      
      toast({
        title: "Session request sent",
        description: "Your tutor will review your request",
      });
      
      // Reset form
      setSelectedSubject("");
      setSessionDate("");
      setSessionTime("");
      setSessionDuration("1 hour");
    } catch (error) {
      toast({
        title: "Failed to send session request",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsSchedulingSession(false);
    }
  };

  // Calculate token cost based on duration
  const getTokenCost = () => {
    if (sessionDuration.startsWith("0.5")) return 3;
    if (sessionDuration.startsWith("1 ")) return 5;
    if (sessionDuration.startsWith("1.5")) return 8;
    return 10; // 2 hours
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] w-full">
      <div className="flex h-full max-h-[calc(100vh-4rem)]">
        {/* Left sidebar - dashboard navigation has been removed */}
        
        {/* Middle column - conversations list */}
        <div className="w-full sm:w-80 md:w-96 border-r flex flex-col">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Messages</h2>
              {conversations.length > 0 && (
                <Badge variant="secondary" className="rounded-full">
                  {conversations.filter(c => hasUnreadMessages(c.id)).length} unread
                </Badge>
              )}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search conversations..." 
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <ScrollArea className="flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center py-8">
                <User className="h-10 w-10 mx-auto mb-2 text-muted-foreground/60" />
                <h3 className="font-medium mb-1">No conversations</h3>
                <p className="text-sm text-muted-foreground px-4">
                  {searchQuery ? "No results matching your search" : "Start messaging with a tutor"}
                </p>
              </div>
            ) : (
              <>
                {filteredConversations.map((convo) => (
                  <button
                    key={convo.id}
                    onClick={() => handleConversationSelect(convo.id)}
                    className={`w-full text-left p-4 border-b transition-colors ${
                      selectedConversationId === convo.id 
                        ? "bg-primary text-primary-foreground" 
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={convo.participant?.avatar_url || undefined} />
                        <AvatarFallback>
                          {convo.participant?.display_name?.charAt(0) || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 overflow-hidden">
                        <div className="flex items-center justify-between">
                          <p className={`font-medium ${selectedConversationId === convo.id ? "text-primary-foreground" : ""}`}>
                            {convo.participant?.display_name || "Unknown User"}
                          </p>
                        </div>
                        <p className={`text-sm truncate ${
                          selectedConversationId === convo.id 
                            ? "text-primary-foreground/90" 
                            : "text-muted-foreground"
                        }`}>
                          {convo.last_message && typeof convo.last_message === 'object' 
                            ? (convo.last_message as any).content 
                            : (convo.last_message as string) || "No messages yet"}
                        </p>
                        <div className="flex items-center justify-between mt-1">
                          <p className={`text-xs ${
                            selectedConversationId === convo.id 
                              ? "text-primary-foreground/70" 
                              : "text-muted-foreground"
                          }`}>
                            Invalid Date {/* Replace with actual date formatting */}
                          </p>
                          {hasUnreadMessages(convo.id) && (
                            <Badge className="ml-2" variant={selectedConversationId === convo.id ? "outline" : "default"}>
                              !
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </>
            )}
          </ScrollArea>
        </div>
        
        {/* Right column - chat area */}
        <div className="hidden sm:flex flex-col flex-1">
          {selectedConversationId && currentConversation ? (
            <>
              {/* Chat header */}
              <div className="p-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={currentConversation?.participant?.avatar_url || undefined} />
                    <AvatarFallback>
                      {currentConversation?.participant?.display_name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="text-xl font-semibold">{currentConversation?.participant?.display_name}</h2>
                    <p className="text-sm text-muted-foreground">
                      French, Spanish, ESL {/* Replace with actual subjects */}
                    </p>
                  </div>
                </div>
                
                {/* Schedule Session button */}
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="default" className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Schedule Session
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]" aria-describedby="session-dialog-description">
                    <DialogHeader>
                      <DialogTitle>Schedule a tutoring session</DialogTitle>
                      <p className="text-sm text-muted-foreground" id="session-dialog-description">
                        Create a session request with {currentConversation?.participant?.display_name}
                      </p>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Subject</label>
                        <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a subject" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mathematics">Mathematics</SelectItem>
                            <SelectItem value="spanish">Spanish</SelectItem>
                            <SelectItem value="french">French</SelectItem>
                            <SelectItem value="english">English</SelectItem>
                            <SelectItem value="science">Science</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Date and Time</label>
                        <Input 
                          type="datetime-local" 
                          value={`${sessionDate}${sessionTime ? `T${sessionTime}` : ''}`}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value.includes('T')) {
                              const [date, time] = value.split('T');
                              setSessionDate(date);
                              setSessionTime(time);
                            } else {
                              setSessionDate(value);
                            }
                          }}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Duration (hours)</label>
                        <Select value={sessionDuration} onValueChange={setSessionDuration}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select duration" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0.5 hour">30 minutes</SelectItem>
                            <SelectItem value="1 hour">1 hour</SelectItem>
                            <SelectItem value="1.5 hours">1.5 hours</SelectItem>
                            <SelectItem value="2 hours">2 hours</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="bg-muted/40 p-4 rounded-md">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4" />
                            <span>Token Cost</span>
                          </div>
                          <div className="text-lg font-bold">
                            {getTokenCost()}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {getTokenCost()} tokens for {sessionDuration}
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                      </DialogClose>
                      <Button 
                        disabled={isSchedulingSession || !selectedSubject || !sessionDate} 
                        onClick={handleCreateSessionRequest}
                      >
                        {isSchedulingSession ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          "Create Session Request"
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Messages area */}
              <ScrollArea className="flex-1 p-4 h-[400px]">
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : messages && selectedConversationId && messages[selectedConversationId] ? (
                  messages[selectedConversationId].length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <h3 className="font-medium mb-1">No messages yet</h3>
                        <p className="text-sm text-muted-foreground">
                          Start the conversation with a message
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {messages[selectedConversationId].map((message) => {
                        const isFromMe = message.sender_id === user.id;
                        
                        return (
                          <div
                            key={message.id}
                            className={`flex ${isFromMe ? "justify-end" : "justify-start"}`}
                          >
                            {!isFromMe && (
                              <Avatar className="h-10 w-10 mr-2 mt-1 flex-shrink-0">
                                <AvatarImage src={currentConversation?.participant?.avatar_url || undefined} />
                                <AvatarFallback>
                                  {currentConversation?.participant?.display_name?.charAt(0) || '?'}
                                </AvatarFallback>
                              </Avatar>
                            )}
                            <div className="max-w-[70%]">
                              <div
                                className={`px-4 py-2 rounded-lg ${
                                  isFromMe
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted"
                                }`}
                              >
                                <p className="break-words whitespace-pre-line">{message.content}</p>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1 px-1">
                                {message.created_at ? new Date(message.created_at).toLocaleTimeString() : 'Unknown time'}
                              </p>
                            </div>
                            {isFromMe && (
                              <Avatar className="h-10 w-10 ml-2 mt-1 flex-shrink-0">
                                <AvatarImage src={user.profilePic} />
                                <AvatarFallback>{user.name?.charAt(0)}</AvatarFallback>
                              </Avatar>
                            )}
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <h3 className="font-medium mb-1">Select a conversation</h3>
                      <p className="text-sm text-muted-foreground">
                        Choose a conversation from the list to start chatting
                      </p>
                    </div>
                  </div>
                )}
              </ScrollArea>

              {/* Message input */}
              <div className="p-4 border-t">
                <div className="flex items-center gap-2">
                  <Input 
                    placeholder="Type a message..." 
                    className="flex-1"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  <Button 
                    size="icon"
                    onClick={handleSendMessage}
                    disabled={!messageText.trim()}
                    className="rounded-full h-10 w-10 bg-primary hover:bg-primary/90"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <h3 className="font-medium mb-1">Select a conversation</h3>
                <p className="text-sm text-muted-foreground">
                  Choose a conversation from the list to start chatting
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 