"use client";

import { useParams } from "next/navigation";
import { useSessions } from "@/context/SessionContext";
import { useMessages } from "@/context/MessageContext";
import { useAuth } from "@/context/AuthContext";
import { useRealtime } from "@/context/RealtimeContext";
import { useTutorProfile, useTutorReviews } from "@/hooks/useSupabase";
import Link from "next/link";
import {
  Calendar,
  Clock,
  MapPin,
  MessageSquare,
  Star,
  CheckCircle,
  BookOpen,
  Users,
  Award,
  ThumbsUp,
  User,
  Languages,
  Loader,
  GraduationCap,
  School,
  Cake,
  Send,
  MessageCircle,
  Video,
  Globe,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useMemo, use, useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

// Define types for reviews
type Review = {
  id: number | string;
  tutor_id?: string;
  tutorId?: string;
  student_id?: string;
  studentId?: string;
  review?: string;
  comment?: string;
  rating?: number;
  created_at?: string;
  date?: string | Date;
};

// Define TutorProfile interface
interface TutorProfile {
  id: string;
  search_id?: string;
  first_name?: string;
  last_name?: string;
  description?: string;
  subjects?: string[] | string;
  avatar_url?: string;
  location?: string;
  age?: number;
  major?: string;
  current_education?: string | string[];
  year?: string;
  previous_education?: string[];
  extracurriculars?: string[];
  gcse?: string[];
  "a-levels"?: string[];
  spm?: string;
  service_costs?: Record<string, number>;
}

// Helper function to extract file reference from URL
function extractFileRefFromUrl(url: string): string | null {
  if (!url) return null;
  try {
    // Try to parse as URL
    let pathToUse = url;
    
    // Handle storage URLs from Supabase
    if (url.includes('storage/v1/object')) {
      // For storage URLs, extract the object path
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      // Find the bucket name and file path
      const bucketIndex = pathParts.indexOf('object');
      if (bucketIndex >= 0 && bucketIndex + 2 < pathParts.length) {
        // Return the full path including bucket name for consistent handling
        return pathParts.slice(bucketIndex + 1).join('/');
      }
    } else if (url.startsWith('http')) {
      // For other URLs, parse and get pathname
      const urlObj = new URL(url);
      pathToUse = urlObj.pathname;
    }
    
    // If it's a simple path (not a URL), or we've extracted the pathname
    if (pathToUse.startsWith('/')) {
      pathToUse = pathToUse.substring(1); // Remove leading slash
    }
    
    return pathToUse;
  } catch (e) {
    // If URL parsing fails, fall back to simple splitting
    console.error('Error parsing URL:', e);
    const parts = url.split('/');
    return parts.slice(Math.max(0, parts.length - 2)).join('/'); // Return last 2 parts to include potential user ID folder
  }
}

// Enhance Avatar component in the profile page to ensure it always has a fallback
// Create a more robust function to handle tutor avatar
const getTutorAvatarUrl = (tutor: any, hasPremiumAccess: boolean = false) => {
  if (!tutor) return null;
  
  // Check if avatar_url exists and is not empty
  if (tutor.avatar_url && typeof tutor.avatar_url === 'string' && tutor.avatar_url.trim() !== '') {
    const avatarUrl = tutor.avatar_url;
    
    // If user doesn't have premium access, use the blurred avatar API
    if (!hasPremiumAccess) {
      // Extract the file reference from the avatar URL
      const avatarRef = extractFileRefFromUrl(avatarUrl);
      
      // If we can extract a reference, use the blurred avatar API with catch-all route
      if (avatarRef) {
        return `/api/avatars/${avatarRef}`;
      }
    }
    
    // If it's a relative path (no protocol), ensure it's properly formed
    if (!avatarUrl.startsWith('http') && !avatarUrl.startsWith('/')) {
      return `/${avatarUrl}`;
    }
    return avatarUrl;
  }
  
  // Return null to trigger the AvatarFallback
  return null;
};

// Function to parse formatted service cost string
const parseServiceCost = (formattedCost: string | number): number => {
  if (typeof formattedCost === 'number') {
    return formattedCost;
  }
  
  const parts = formattedCost.split(' - ');
  return parts.length > 1 ? parseInt(parts[1]) || 0 : 0;
};

// Helper function to get the main service name for cost lookup
const getMainServiceName = (subject: string): string => {
  // Normalize text for comparison by converting to lowercase
  const normalizedSubject = subject.toLowerCase().trim();
  
  // Check for variations of UK Admissions tests
  if (
    normalizedSubject.startsWith('uk admissions tests') ||
    normalizedSubject.startsWith('uk admission tests') ||
    normalizedSubject.startsWith('uk admission test') ||
    normalizedSubject.startsWith('admissions tests') ||
    normalizedSubject.includes('uk test')
  ) {
    return 'UK Admissions tests';
  }
  
  // Check for variations of Subject Tutoring
  if (
    normalizedSubject.startsWith('subject tutoring') ||
    normalizedSubject.startsWith('tutoring') ||
    normalizedSubject.includes('subject') && normalizedSubject.includes('tutor')
  ) {
    return 'Subject Tutoring';
  }
  
  // For other services, use as is but preserve original case
  return subject;
};

// Update the extractServiceCosts function to properly handle the JSON string format
const extractServiceCosts = (tutor: any): Record<string, number> => {
  if (!tutor) return {};
  
  const result: Record<string, number> = {};
  
  try {
    // First try service_costs object which is the preferred format
    if (tutor.service_costs) {
      if (typeof tutor.service_costs === 'string') {
        try {
          // Try to parse JSON string
          // First, make sure it's a valid JSON string
          let jsonString = tutor.service_costs;
          
          // In case it's not properly quoted (e.g., single quotes instead of double)
          if (jsonString.startsWith("'") && jsonString.endsWith("'")) {
            jsonString = jsonString.substring(1, jsonString.length - 1);
          }
          
          // Try direct parsing
          try {
            const parsed = JSON.parse(jsonString);
            
            Object.entries(parsed).forEach(([key, value]) => {
              if (typeof value === 'number') {
                result[key] = value as number;
              } else if (typeof value === 'string') {
                const numValue = parseFloat(value as string);
                if (!isNaN(numValue)) {
                  result[key] = numValue;
                } else {
                  result[key] = parseServiceCost(value as string);
                }
              }
            });
          } catch (jsonError) {
            // Try alternative approach - if it's a string representation of an object like
            // '{"UK Admissions tests": 5, "Extracurricular Building": 50}'
            // but not valid JSON, try to extract using regex
            
            const regex = /"([^"]+)":\s*(\d+)/g;
            let match;
            
            while ((match = regex.exec(jsonString)) !== null) {
              const key = match[1];
              const value = parseInt(match[2], 10);
              if (!isNaN(value)) {
                result[key] = value;
              }
            }
          }
        } catch (e) {
          // Error handling
        }
      } else if (typeof tutor.service_costs === 'object') {
        // Handle object format
        Object.entries(tutor.service_costs).forEach(([key, value]) => {
          if (typeof value === 'number') {
            result[key] = value as number;
          } else if (typeof value === 'string') {
            // For backward compatibility with old format
            const numValue = parseFloat(value as string);
            if (!isNaN(numValue)) {
              result[key] = numValue;
            } else {
              result[key] = parseServiceCost(value as string);
            }
          }
        });
      }
    }
    
    // If still no service_costs found, check for direct 'cost' property
    if (Object.keys(result).length === 0 && tutor.cost !== undefined) {
      // If there's a single cost for all services, use it for the default categories
      const cost = typeof tutor.cost === 'string' ? parseFloat(tutor.cost) : tutor.cost;
      
      if (!isNaN(cost)) {
        // Use the cost for services that are actually offered by the tutor
        const subjects = typeof tutor.subjects === 'string' 
          ? tutor.subjects.split(',').map((s: string) => s.trim())
          : Array.isArray(tutor.subjects) ? tutor.subjects : [];
          
        // Check if tutor offers specific services
        const hasSubjectTutoring = subjects.some((s: string) => s.toLowerCase().includes('subject tutoring'));
        const hasUKTests = subjects.some((s: string) => s.toLowerCase().includes('uk admissions tests'));
        
        // Only add costs for services the tutor actually offers
        if (hasSubjectTutoring) {
          result['Subject Tutoring'] = cost;
        }
        if (hasUKTests) {
          result['UK Admissions tests'] = cost;
        }
      }
    }
  } catch (e) {
    // Error handling
  }
  
  return result;
};

export default function TutorProfile(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const id = params.id;
  const router = useRouter();
  const { reviewHistory } = useSessions();
  const messageContext = useMessages();
  const { user, loading } = useAuth();
  const { subscribeToConversation } = useRealtime();

  // Check for premium access
  const hasPremiumAccess = user?.role === 'tutor' || user?.has_access === true;

  // If user is not logged in, redirect to login
  useEffect(() => {
    if (!loading && !user) {
        router.replace('/login');
    }
  }, [user, loading, router]);

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Use our Supabase hooks
  const { tutor, loading: tutorLoading, error: tutorError } = useTutorProfile(id);
  const { reviews: supabaseReviews, loading: reviewsLoading, error: reviewsError } = useTutorReviews(id);

  // Get reviews for this tutor
  const tutorReviews = useMemo(() => {
    if (supabaseReviews && supabaseReviews.length > 0) {
      return supabaseReviews;
    }
    return reviewHistory.filter(review => review.tutorId === id);
  }, [reviewHistory, id, supabaseReviews]);

  // Effect to fetch reviews if they're not already loaded
  useEffect(() => {
    if (!supabaseReviews || supabaseReviews.length === 0) {
      const fetchReviews = async () => {
        try {
          const response = await fetch(`/api/reviews/tutor/${id}`);
          if (response.ok) {
            const data = await response.json();
            // Reviews will be set through the useTutorReviews hook
          }
        } catch (error) {
          console.error("Error fetching reviews:", error);
        }
      };
      
      fetchReviews();
    }
  }, [id, supabaseReviews]);

  // Calculate average rating
  const averageRating = useMemo(() => {
    if (tutorReviews.length > 0) {
      return tutorReviews.reduce((sum, review) => sum + (review.rating || 0), 0) / tutorReviews.length;
    }
    return 0; // Default to 0 instead of 4.5 when no reviews
  }, [tutorReviews]);

  // Calculate rating distribution
  const ratingDistribution = useMemo(() => {
    const distribution = [0, 0, 0, 0, 0]; // 5 stars to 1 star
    
    if (tutorReviews.length > 0) {
      tutorReviews.forEach(review => {
        if (review.rating && review.rating >= 1 && review.rating <= 5) {
          distribution[5 - Math.floor(review.rating)]++;
        }
      });
    }
    
    return distribution;
  }, [tutorReviews]);

  // Subscribe to realtime updates for this tutor - ALWAYS declare this hook
  useEffect(() => {
    // Only run the subscription logic if both tutor and user exist
    if (!tutor || !user) return;
    
    const channelName = `tutor:${tutor.search_id}`;
    
    if (user.id === tutor.id) {
      // If the user is viewing their own profile, subscribe to their tutor channel
      subscribeToConversation(channelName);
      
      // Note: Since we can't use the callback parameter, we'll need to handle
      // conversation events through the general subscription mechanism
    } else if (user.id !== tutor.id) {
      // If the user is viewing someone else's profile, subscribe to the conversation channel
      // This is used to get updates when a conversation is created
      const studentChannelName = `student:${user.id}:tutor:${tutor.id}`;
      
      subscribeToConversation(studentChannelName);
      
      // Note: Since we can't use the callback parameter, we'll need to handle
      // conversation events through the general subscription mechanism
    }
    
    // No cleanup needed as the subscribeToConversation function handles cleanup
  }, [tutor, user, subscribeToConversation]);

  // Listen for PostgreSQL changes about new conversations
  useEffect(() => {
    if (!user || !tutor?.search_id) return;

    // Create Supabase client for realtime changes
    const supabase = createClient();
    
    // If the current user is a tutor, they should listen to their own search_id channel
    if (user.role === 'tutor' && user.id === id) {
      
      // Tutors listen to their channel based on search_id
      const channel = supabase
        .channel(`tutor:${tutor.search_id}`)
        .subscribe();
      
      return () => {
        supabase.removeChannel(channel);
      };
    } 
    // For students, subscribe to conversations changes
    else if (user.role !== 'tutor') {
      // Students subscribe to changes in conversations table for this user
      const channel = supabase
        .channel('conversations-changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'conversations',
            filter: `created_by=eq.${user.id}`
          },
          (payload) => {
            const conversationId = payload.new.id;
            
            // Subscribe to the new conversation's realtime channel using tutor's search_id
            if (conversationId && tutor?.search_id) {
              // Use tutor's search_id as the channel name
              const channelName = `tutor:${tutor.search_id}`;
              
              // Subscribe to the tutor's channel
              subscribeToConversation(channelName);
              
              // Toast notification
              toast({
                title: "Conversation created",
                description: "You can now message the tutor",
              });
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, tutor?.search_id, id, subscribeToConversation]);

  // Extract service costs when tutor data is loaded
  const serviceCosts = extractServiceCosts(tutor);
  
  // Process subjects for display
  const tutorSubjects = useMemo(() => {
    if (!tutor?.subjects) return [];
    
    let subjects: string[] = [];
    if (typeof tutor.subjects === 'string') {
      try {
        // Try to parse as JSON
        subjects = JSON.parse(tutor.subjects);
      } catch (e) {
        // If not JSON, split by comma
        subjects = tutor.subjects.split(',').map(s => s.trim());
      }
    } else if (Array.isArray(tutor.subjects)) {
      subjects = tutor.subjects;
    }
    
    return subjects;
  }, [tutor?.subjects]);
  
  // Process subjects for display
  const processedSubjects = useMemo(() => {
    return tutorSubjects.slice(0, 3);
  }, [tutorSubjects]);
  
  // Enhanced avatar URL with Supabase storage path if needed
  const avatarUrl = useMemo(() => {
    return tutor?.avatar_url ? getTutorAvatarUrl(tutor, hasPremiumAccess) : null;
  }, [tutor?.avatar_url, hasPremiumAccess]);
  
  const tutorBio = tutor?.description || "No bio information available for this tutor.";
  const tutorAvatar = avatarUrl;
  
  // Check for existing conversation
  const checkExistingConversation = async (): Promise<string | null> => {
    try {
      const response = await fetch('/api/conversations');
      if (!response.ok) {
        throw new Error('Failed to fetch conversations');
      }
      
      const data = await response.json();
      const conversations = data.conversations || [];
      
      // Find a conversation where the tutor is a participant
      const existingConversation = conversations.find((conv: any) => {
        return conv.participants?.some((p: any) => p.user_id === tutor?.id);
      });
      
      if (existingConversation) {
        return existingConversation.id;
      }
      
      return null;
    } catch (error) {
      return null;
    }
  };
  
  const handleMessageTutor = useCallback(() => {
    if (!user || !tutor) return;
    
    try {
      // Create a temporary conversation
      const tempConversationId = messageContext?.createTempConversation(
        tutor.id,
        `${tutor.first_name || ''} ${tutor.last_name || ''}`.trim(),
        tutor.avatar_url
      );
            
      if (!tempConversationId) {
        throw new Error("Failed to create temporary conversation");
      }
      
      
      // Navigate to the messages page with the temporary conversation selected
      router.push(`/dashboard/messages?conversationId=${tempConversationId}`);
    } catch (error) {
      console.error('Error creating temporary conversation:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to start conversation",
        variant: "destructive"
      });
    }
  }, [user, tutor, messageContext, router]);

  // Show loading state
  if (tutorLoading) {
    return (
      <div className="w-full py-24 text-center">
        <Loader className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
        <h1 className="text-2xl font-medium">Loading Tutor Profile</h1>
      </div>
    );
  }

  // Only show error after loading is complete
  if (!tutorLoading && (tutorError || !tutor)) {
    if (tutorError) {
      toast({
        title: "Error loading tutor profile",
        description: tutorError.message,
        variant: "destructive"
      });
    }
    
    return (
      <div className="w-full py-24 text-center">
        <h1 className="text-3xl font-bold mb-4">Tutor Not Found</h1>
        <p className="text-muted-foreground mb-6">
          The tutor you're looking for doesn't exist or has been removed.
        </p>
        <Button asChild>
          <Link href="/tutors">Browse All Tutors</Link>
        </Button>
      </div>
    );
  }

  // Get tutor data with fallbacks
  const tutorName = tutor ? `${tutor.first_name} ${tutor.last_name}`.trim() : 'Tutor Profile';
  
  // Debug the tutor subjects data
  
    
  const ukTestsPattern = /^uk admissions tests -/i;
  const subjectTutoringPattern = /^subject tutoring -/i;
  
  // Group subjects
  const ukTests = tutorSubjects.filter(s => ukTestsPattern.test(s));
  const subjectTutoring = tutorSubjects.filter(s => subjectTutoringPattern.test(s));
  const otherSubjects = tutorSubjects.filter(s => 
    !ukTestsPattern.test(s) && !subjectTutoringPattern.test(s)
  );
  
  
  // Access additional tutor profile fields
  const tutorAge = tutor?.age;
  const tutorEducation = tutor?.current_education;
  const tutorMajor = tutor?.major;
  const tutorYear = tutor?.year;
  const tutorPreviousEducation = tutor?.previous_education && Array.isArray(tutor.previous_education) 
    ? tutor.previous_education 
    : [];
  const tutorExtracurriculars = tutor?.extracurriculars && Array.isArray(tutor.extracurriculars) 
    ? tutor.extracurriculars 
    : [];
  const tutorGcse = tutor?.gcse && Array.isArray(tutor.gcse) ? tutor.gcse : [];
  const tutorALevels = tutor?.['a-levels'] && Array.isArray(tutor['a-levels']) ? tutor['a-levels'] : [];
  const tutorSpm = tutor?.spm;

  return (
    <div className="page-content">
      {!hasPremiumAccess && (
        <div className="text-center mb-8">
          <p className="text-md text-[#126d94] font-medium">
            Unlock access to our website to view tutors' full profiles and book sessions
          </p>
        </div>
      )}

      <div className="content-section">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left Sidebar - Tutor Info */}
          <div className="md:col-span-1">
            <div className="sticky top-24">
              <Card className="overflow-hidden">
                <div className="bg-gradient-to-r from-purple-100 to-blue-100 h-24"></div>
                <div className="p-6 text-center relative">
                  <Avatar className="h-28 w-28 border-4 border-background shadow-md absolute -top-14 left-1/2 transform -translate-x-1/2">
                    <AvatarImage 
                      src={tutorAvatar} 
                      alt={tutor?.first_name ? `${tutor.first_name} ${tutor.last_name || ''}` : 'Tutor'}
                    />
                    <AvatarFallback className="bg-gradient-to-br from-primary/30 to-primary/10 text-primary font-semibold text-xl">
                      {tutor?.first_name ? tutor.first_name.charAt(0).toUpperCase() : ''}
                      {tutor?.last_name ? tutor.last_name.charAt(0).toUpperCase() : 'T'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="mt-16">
                    <h2 className="text-2xl font-bold">{tutorName}</h2>
                  </div>
                  
                  {/* Star rating display commented out due to insufficient data */}
                  {/* 
                  <div className="flex items-center justify-center gap-1 mt-2">
                    {[...Array(5)].map((_, i) => {
                      // Calculate if this should be a full, partial or empty star
                      const starValue = i + 1;
                      let starClass = 'text-muted-foreground'; // Empty star by default
                      
                      if (averageRating >= starValue) {
                        // Full star
                        starClass = 'text-amber-500 fill-amber-500';
                      } else if (averageRating > i && averageRating < starValue) {
                        // Partial star (more than i but less than i+1)
                        return (
                          <div key={i} className="relative">
                            <Star className="h-5 w-5 text-muted-foreground" />
                            <div 
                              className="absolute inset-0 overflow-hidden" 
                              style={{ width: `${(averageRating - i) * 100}%` }}
                            >
                              <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
                            </div>
                          </div>
                        );
                      }
                      
                      return (
                      <Star
                        key={i}
                          className={`h-5 w-5 ${starClass}`}
                      />
                      );
                    })}
                    <span className="ml-2 font-medium">
                      {tutorReviews.length > 0 ? averageRating.toFixed(1) : "0.0"}
                    </span>
                    <span className="ml-1 text-muted-foreground">({tutorReviews.length})</span>
                  </div>
                  */}
                  
                  <div className="flex items-center justify-center gap-1 mt-2 text-green-600 text-sm">
                    <CheckCircle className="h-4 w-4" />
                    <span>Verified Tutor</span>
                  </div>
                </div>
                
                {/* Tutor Details */}
                <div className="border-t border-gray-100">
                  <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100">
                    <div className="flex items-center text-muted-foreground">
                      <Cake className="h-4 w-4 mr-2" />
                      <span>Age</span>
                    </div>
                    <span className="font-medium">{tutorAge || "N/A"}</span>
                  </div>
                  
                  <div className="flex items-center justify-between px-6 py-3">
                    <div className="flex items-center text-muted-foreground">
                      <MapPin className="h-4 w-4 mr-2" />
                      <span>Location</span>
                    </div>
                    <span className="font-medium">Online</span>
                  </div>
                </div>
                
                {/* Message Button - Only shown to students with premium access */}
                <div className="p-6 pt-4">
                  {user && user.role !== 'tutor' ? (
                    hasPremiumAccess ? (
                    <Button className="w-full" onClick={handleMessageTutor}>
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Message Tutor
                        </Button>
                    ) : (
                      <Button 
                        className="w-full bg-gradient-to-r from-[#3e5461] to-[#126d94]" 
                        onClick={() => router.push('/paywall')}
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        Unlock Access
                      </Button>
                    )
                  ) : (
                    <Button className="w-full" disabled={true}>
                      <User className="h-4 w-4 mr-2" />
                      {user?.role === 'tutor' ? 'You are a tutor' : 'Login to message'}
                    </Button>
                  )}
                </div>
              </Card>
            </div>
          </div>
          
          {/* Main Content - Show blurred version for non-premium users */}
          <div className="md:col-span-2">
            {!hasPremiumAccess && (
              <div className="relative">
                <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
                  <div className="text-center max-w-md p-6">
                    <Sparkles className="h-12 w-12 mx-auto mb-4 text-[#3e5461]" />
                    <h3 className="text-2xl font-bold mb-2">Premium Content</h3>
                    <p className="text-muted-foreground mb-6">
                      Upgrade to premium to view full tutor profiles, message tutors, and book sessions.
                    </p>
                    <Button 
                      onClick={() => router.push('/paywall')}
                      className="bg-gradient-to-r from-[#3e5461] to-[#126d94] hover:from-[#128ca0] hover:to-[#126d94]"
                      size="lg"
                    >
                      Upgrade Now
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            <div className={!hasPremiumAccess ? "filter blur-sm" : ""}>
            {/* Tabs */}
            <Tabs defaultValue="about" className="w-full">
              <div className="border-b mb-6">
                <TabsList className="w-full justify-start bg-transparent border-0 p-0 space-x-8">
                  <TabsTrigger value="about" className="border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-1 pb-2 rounded-none">About</TabsTrigger>
                  <TabsTrigger value="reviews" className="border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-1 pb-2 rounded-none">Reviews</TabsTrigger>
                </TabsList>
              </div>
              
              {/* About Tab */}
              <TabsContent value="about" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>About {tutorName}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 whitespace-pre-line">{tutorBio || "N/A"}</p>

                    <div className="mt-6">
                      <h3 className="font-semibold text-lg mb-2">Education</h3>
                      <div className="flex items-start gap-3 mb-3">
                        <GraduationCap className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                          <div className="font-medium">{tutorEducation || "N/A"}</div>
                          {(tutorMajor || tutorYear) && (
                            <div className="text-muted-foreground">
                              {tutorMajor || "N/A"}{tutorYear ? `, ${tutorYear}` : ''}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {tutorPreviousEducation && tutorPreviousEducation.length > 0 ? (
                        <>
                          {tutorPreviousEducation.map((edu, index) => (
                            <div key={index} className="flex items-start gap-3 mb-3 pl-8">
                              <School className="h-4 w-4 text-muted-foreground mt-0.5" />
                              <div className="text-muted-foreground">{edu}</div>
                            </div>
                          ))}
                        </>
                      ) : (
                        <div className="flex items-start gap-3 mb-3 pl-8">
                          <School className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div className="text-muted-foreground">Previous education: N/A</div>
                        </div>
                      )}
                    </div>

                    <div className="mt-6">
                      <h3 className="font-semibold text-lg mb-2 flex items-center">
                        <BookOpen className="h-5 w-5 mr-2 text-[#128ca0]" strokeWidth={1.5} />
                        Services
                      </h3>
                      
                      {processedSubjects && processedSubjects.length > 0 ? (
                        <div className="flex flex-wrap gap-2 pl-1">
                          {processedSubjects.map((subject, index) => {
                            // Get the main service name for cost lookup
                            const mainServiceName = getMainServiceName(subject);
                            
                            // Check if this service has a cost
                            const cost = serviceCosts[mainServiceName];
                            const hasCost = cost !== undefined;
                            
                            if (hasCost) {
                              // Display service with cost in a single oval
                              return (
                                <div 
                                  key={index}
                                  className="flex items-center rounded-full overflow-hidden border border-[#84b7bd]/30"
                                >
                                  <div className="bg-[#c2d8d2]/30 px-2 py-0.5 text-sm font-semibold">
                                    {subject}
                                  </div>
                                  <div className="bg-[#128ca0]/20 px-2 py-0.5 text-sm font-bold text-[#126d94] h-full">
                                    {cost !== undefined && cost !== null ? cost : 'N/A'}
                                  </div>
                                </div>
                              );
                            } else {
                              // Display service without cost
                              return (
                                <Badge key={index} variant="outline" className="text-sm bg-[#c2d8d2]/30 border-[#84b7bd]/30 hover:bg-[#c2d8d2]/50 transition-colors">
                                  {subject}
                                </Badge>
                              );
                            }
                          })}
                          {tutorSubjects.length > processedSubjects.length && (
                            <Badge variant="outline" className="text-sm bg-[#4b92a9]/10 border-[#4b92a9]/30 text-[#126d94]">
                              +{tutorSubjects.length - processedSubjects.length} more
                            </Badge>
                          )}
                        </div>
                      ) : tutor?.major ? (
                        <div className="flex flex-wrap gap-2 pl-1">
                          <Badge variant="outline" className="text-sm bg-[#c2d8d2]/30 border-[#84b7bd]/30 hover:bg-[#c2d8d2]/50 transition-colors">
                            {tutor.major} Tutoring
                          </Badge>
                          <Badge variant="outline" className="text-sm bg-[#c2d8d2]/30 border-[#84b7bd]/30 hover:bg-[#c2d8d2]/50 transition-colors">
                            Academic Support
                          </Badge>
                        </div>
                      ) : (
                        <p className="text-muted-foreground pl-1">No services specified</p>
                      )}
                    </div>

                    <div className="mt-6">
                      <h3 className="font-semibold text-lg mb-2">Extracurricular Activities</h3>
                      {tutorExtracurriculars && tutorExtracurriculars.length > 0 ? (
                        <ul className="list-disc pl-5 space-y-1">
                          {tutorExtracurriculars.map((activity, index) => (
                            <li key={index}>{activity}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-muted-foreground">No extracurricular activities specified</p>
                      )}
                    </div>

                    <div className="mt-6">
                      <h3 className="font-semibold text-lg mb-2">A-Levels</h3>
                      {tutorALevels && tutorALevels.length > 0 ? (
                        <ul className="list-disc pl-5 space-y-1">
                          {tutorALevels.map((level, index) => (
                            <li key={index}>{level}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-muted-foreground">No A-Levels specified</p>
                      )}
                    </div>

                    <div className="mt-6">
                      <h3 className="font-semibold text-lg mb-2">GCSEs</h3>
                      {tutorGcse && tutorGcse.length > 0 ? (
                        <ul className="list-disc pl-5 space-y-1">
                          {tutorGcse.map((gcse, index) => (
                            <li key={index}>{gcse}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-muted-foreground">No GCSEs specified</p>
                      )}
                    </div>

                    <div className="mt-6">
                      <h3 className="font-semibold text-lg mb-2">SPM</h3>
                      <p>{tutorSpm || "N/A"}</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* Reviews Tab */}
              <TabsContent value="reviews" className="mt-0">
                <Card className="border-0 shadow-none">
                  <CardHeader>
                    <CardTitle>Rating Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                      {/* Rating overview section commented out due to insufficient data */}
                      {/* 
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8">
                      <div className="flex flex-col items-center mb-6 md:mb-0">
                        <div className="text-5xl font-bold text-primary">{averageRating.toFixed(1)}</div>
                        <div className="flex mt-2">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${
                                i < Math.floor(averageRating) 
                                  ? 'text-amber-500 fill-amber-500' 
                                  : 'text-muted-foreground'
                              }`}
                            />
                          ))}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">{tutorReviews.length} reviews</div>
                      </div>
                      
                      <div className="flex-1 md:ml-8 space-y-2 w-full md:w-auto">
                        {[5, 4, 3, 2, 1].map((rating) => (
                          <div key={rating} className="flex items-center gap-2">
                            <div className="w-8 text-right">{rating} ★</div>
                            <Progress
                              className="h-2 flex-1"
                              value={tutorReviews.length > 0 
                                ? (ratingDistribution[5 - rating] / tutorReviews.length) * 100 
                                : 0
                              }
                            />
                            <div className="text-muted-foreground text-xs w-16">
                              {tutorReviews.length > 0 
                                ? `${ratingDistribution[5 - rating]} (${((ratingDistribution[5 - rating] / tutorReviews.length) * 100).toFixed(0)}%)` 
                                : '0 (0%)'
                              }
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                      */}
                      
                      {/* Replace review display with simple message */}
                      <div className="text-center py-10">
                        <div className="text-5xl mb-4 opacity-20">★</div>
                        <h3 className="text-xl font-medium mb-2">Reviews Coming Soon</h3>
                        <p className="text-muted-foreground">
                          We're currently collecting reviews from students. Check back later for ratings and reviews.
                        </p>
                      </div>
                      
                      {/* Review listing section commented out due to insufficient data */}
                      {/*
                    {tutorReviews.length > 0 ? (
                      <div className="space-y-6">
                        {tutorReviews.map((review, index) => {
                          // Get review content safely based on the structure
                          let reviewContent = "No comment provided.";
                          
                          if ('review' in review && review.review) {
                            reviewContent = String(review.review);
                          } else if ('comment' in review && review.comment) {
                            reviewContent = String(review.comment);
                          }
                          
                          // Get review date safely
                          const reviewDate = new Date('date' in review ? review.date : 
                                               'created_at' in review ? review.created_at : 
                                               new Date()).toLocaleDateString();
                          
                          return (
                            <div key={index} className="border-b border-gray-100 pb-6 last:border-0">
                              <div className="flex items-center justify-between mb-3">
                                <h3 className="font-medium">Anonymous Student</h3>
                                <div className="flex items-center">
                                  {[...Array(5)].map((_, i) => (
                                    <Star
                                      key={i}
                                      className={`h-4 w-4 ${
                                        i < (review.rating || 0) 
                                          ? 'text-amber-500 fill-amber-500' 
                                          : 'text-muted-foreground'
                                      }`}
                                    />
                                  ))}
                                </div>
                              </div>
                              <p className="text-gray-700 whitespace-pre-line">
                                {reviewContent}
                              </p>
                              <div className="mt-3 text-sm text-muted-foreground">
                                {reviewDate}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-10">
                        <div className="text-5xl mb-4 opacity-20">★</div>
                        <h3 className="text-xl font-medium mb-2">No reviews yet</h3>
                        <p className="text-muted-foreground">
                          This tutor doesn't have any reviews yet. Be the first to leave one after your session.
                        </p>
                        <Button className="mt-6">Book a Session</Button>
                      </div>
                    )}
                      */}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
