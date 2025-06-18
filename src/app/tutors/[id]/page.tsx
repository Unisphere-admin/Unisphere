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

  // If still loading auth or user is not logged in, show loading
  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen w-full">
        <div className="text-center">
          <Loader className="h-10 w-10 animate-spin mx-auto mb-4 text-primary" />
          <h3 className="text-xl font-semibold">Loading...</h3>
        </div>
      </div>
    );
  }

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

  // Listen for PostgreSQL changes about new conversations
  useEffect(() => {
    if (!user || !tutor?.search_id) return;

    // Create Supabase client for realtime changes
    const supabase = createClient();
    
    // If the current user is a tutor, they should listen to their own search_id channel
    if (user.role === 'tutor' && user.id === id) {
      console.log(`Tutor listening to their channel: ${tutor.search_id}`);
      
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
            console.log('New conversation created:', payload);
            const conversationId = payload.new.id;
            
            // Subscribe to the new conversation's realtime channel using tutor's search_id
            if (conversationId && tutor?.search_id) {
              // Use tutor's search_id as the channel name
              const channelName = `tutor:${tutor.search_id}`;
              console.log(`Student subscribing to channel: ${channelName}`);
              
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

  // Handle sending a message to the tutor
  // Check if conversation already exists between current user and tutor
  const checkExistingConversation = async (): Promise<string | null> => {
    try {
      console.log(`Checking for existing conversation with tutor ID: ${id}`);
      
      // Fetch all user conversations
      const response = await fetch('/api/conversations', {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error(`Failed to fetch conversations: ${response.status}`, errorText);
        return null;
      }
      
      const data = await response.json();
      const conversations = data.conversations || [];
      
      console.log(`Found ${conversations.length} conversations for current user`);
      
      if (conversations.length === 0) return null;
      
      // Look for a conversation where the tutor is a participant
      const existingConversation = conversations.find((conv: any) => 
        conv.participants?.some((p: any) => p.user_id === id)
      );
      
      if (existingConversation) {
        console.log(`Found existing conversation: ${existingConversation.id}`);
      } else {
        console.log(`No existing conversations found with tutor ID: ${id}`);
      }
      
      return existingConversation ? existingConversation.id : null;
    } catch (error) {
      console.error('Error checking existing conversations:', error);
      // Return null instead of throwing to allow message sending to continue with new conversation
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
      
      console.log(`Created temporary conversation ${tempConversationId} with tutor ${tutor.id}`);
      
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
  console.log('Raw tutor subjects data:', tutor?.subjects);
  
  const tutorSubjects = tutor && tutor.subjects
    ? typeof tutor.subjects === 'string' 
      ? tutor.subjects.split(',').map(s => s.trim()) 
      : Array.isArray(tutor.subjects) ? tutor.subjects : []
    : [];
    
  console.log('Processed tutorSubjects array:', tutorSubjects);
    
  const ukTestsPattern = /^uk admissions tests -/i;
  const subjectTutoringPattern = /^subject tutoring -/i;
  
  // Group subjects
  const ukTests = tutorSubjects.filter(s => ukTestsPattern.test(s));
  const subjectTutoring = tutorSubjects.filter(s => subjectTutoringPattern.test(s));
  const otherSubjects = tutorSubjects.filter(s => 
    !ukTestsPattern.test(s) && !subjectTutoringPattern.test(s)
  );
  
  console.log('Grouped subjects:', { ukTests, subjectTutoring, otherSubjects });
  
  // Prepare processed subjects list
  const processedSubjects = [...otherSubjects];
  
  // Add grouped UK Admissions tests if there are any
  if (ukTests.length > 0) {
    // Extract test names from the UK tests subjects
    const testNames = ukTests.map(test => 
      test.replace(ukTestsPattern, '').trim()
    );
    const testDisplay = `UK Admissions tests - ${testNames.join(', ')}`;
    processedSubjects.unshift(testDisplay);
  }
  
  // Add grouped Subject Tutoring if there are any
  if (subjectTutoring.length > 0) {
    // Extract subject names
    const subjectNames = subjectTutoring.map(subject => 
      subject.replace(subjectTutoringPattern, '').trim()
    );
    const subjectDisplay = `Subject Tutoring - ${subjectNames.join(', ')}`;
    processedSubjects.unshift(subjectDisplay);
  }
  
  console.log('Final processedSubjects:', processedSubjects);
  const tutorBio = tutor?.description || "No bio information available for this tutor.";
  const tutorAvatar = getTutorAvatarUrl(tutor, user?.has_access === true || user?.role === 'tutor');

  // Log for debugging
  console.log(`Enhanced tutor avatar URL: ${tutorAvatar} for tutor: ${tutorName}`);

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
            Unlock premium access to our website to view tutors' full profiles and book sessions
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
                        className="w-full bg-gradient-to-r from-[#4ba896] to-[#126d94]" 
                        onClick={() => router.push('/paywall')}
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        Unlock Premium
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
                    <Sparkles className="h-12 w-12 mx-auto mb-4 text-[#4ba896]" />
                    <h3 className="text-2xl font-bold mb-2">Premium Content</h3>
                    <p className="text-muted-foreground mb-6">
                      Upgrade to premium to view full tutor profiles, message tutors, and book sessions.
                    </p>
                    <Button 
                      onClick={() => router.push('/paywall')}
                      className="bg-gradient-to-r from-[#4ba896] to-[#126d94] hover:from-[#129490] hover:to-[#126d94]"
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
                          <BookOpen className="h-5 w-5 mr-2 text-[#129490]" strokeWidth={1.5} />
                          Services
                        </h3>
                        
                        {processedSubjects && processedSubjects.length > 0 ? (
                          <div className="flex flex-wrap gap-2 pl-1">
                            {processedSubjects.map((subject, index) => (
                              <Badge key={index} variant="outline" className="text-sm bg-[#c2d8d2]/30 border-[#84b7bd]/30 hover:bg-[#c2d8d2]/50 transition-colors">
                                {subject}
                              </Badge>
                            ))}
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
