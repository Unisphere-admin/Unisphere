"use client";

import { useParams } from "next/navigation";
import { MOCK_USERS } from "@/context/AuthContext";
import { useSessions } from "@/context/SessionContext";
import { useMessages } from "@/context/MessageContext";
import { useAuth } from "@/context/AuthContext";
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
  Loader2,
  GraduationCap,
  School,
  Cake
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
import { useMemo, use } from "react";

// Define types for reviews
type MockReview = {
  id: string;
  tutorId: string;
  studentId: string;
  rating: number;
  comment: string;
  date: string | Date;
};

type SupabaseReview = {
  id: number;
  tutor_id?: string;
  student_id?: string;
  review?: string;
  rating?: number;
  created_at: string;
};

// Union type that can handle both the mock reviews and Supabase reviews
type Review = MockReview | SupabaseReview;

export default function TutorProfile(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const id = params.id;
  const { reviewHistory } = useSessions();
  const { setSelectedConversationId } = useMessages();
  const { user } = useAuth();

  // Use our new Supabase hooks
  const { tutor, loading: tutorLoading, error: tutorError } = useTutorProfile(id);
  const { reviews: supabaseReviews, loading: reviewsLoading, error: reviewsError } = useTutorReviews(id);

  // Find tutor based on ID from URL params - fallback to mock data if needed
  const mockTutor = useMemo(() => MOCK_USERS.find(user => user.id === id), [id]);

  // Get reviews for this tutor - combine mock and Supabase data
  const tutorReviews = useMemo(() => {
    if (supabaseReviews && supabaseReviews.length > 0) {
      return supabaseReviews;
    }
    return reviewHistory.filter(review => review.tutorId === id);
  }, [reviewHistory, id, supabaseReviews]);

  // Calculate average rating
  const averageRating = useMemo(() => {
    if (tutorReviews.length > 0) {
      return tutorReviews.reduce((sum, review) => sum + (review.rating || 0), 0) / tutorReviews.length;
    }
    // Fixed: Use optional chaining with mockTutor and removed nonexistent 'rating' property from tutor
    return mockTutor?.rating || 4.5;
  }, [tutorReviews, mockTutor]);

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

  // Handle navigating to message page
  const handleMessage = () => {
    if (mockTutor || tutor) {
      setSelectedConversationId(id || "");
      // Navigate to messages page using Next.js navigation
      window.location.href = "/dashboard/messages";
    }
  };

  // Show error if both data sources failed
  if ((tutorError || !mockTutor) && !tutor) {
    if (tutorError) {
      toast({
        title: "Error loading tutor profile",
        description: tutorError.message,
        variant: "destructive"
      });
    }
    
    return (
      <div className="container py-24 text-center">
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

  // Show loading state
  if (tutorLoading) {
    return (
      <div className="container py-24 text-center">
        <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
        <h1 className="text-2xl font-medium">Loading Tutor Profile</h1>
      </div>
    );
  }

  // Use real data if available, otherwise fall back to mock data
  const displayTutor = tutor || mockTutor;

  // Fixed: Type-safe access to first_name and last_name properties
  const tutorName = displayTutor ? (
    // For tutor profile
    ('first_name' in displayTutor && displayTutor.first_name && 'last_name' in displayTutor && displayTutor.last_name ? // For mock data
    `${displayTutor.first_name} ${displayTutor.last_name}` : mockTutor?.name || "Unknown Tutor")
  ) : "Unknown Tutor";

  const tutorSubjects = displayTutor && 'subjects' in displayTutor && displayTutor.subjects
    ? typeof displayTutor.subjects === 'string' 
      ? displayTutor.subjects.split(',').map(s => s.trim()) 
      : []
    : mockTutor?.subjects || [];

  // Fixed: Type-safe access to description
  const tutorBio = displayTutor && 'description' in displayTutor ? displayTutor.description : mockTutor?.bio || "No bio information available for this tutor.";

  // Fixed: Type-safe access to avatar_url
  const tutorAvatar = displayTutor && 'avatar_url' in displayTutor ? displayTutor.avatar_url : mockTutor?.profilePic || "/placeholder.svg";

  // Access additional tutor profile fields
  const tutorAge = displayTutor && 'age' in displayTutor ? displayTutor.age : undefined;
  const tutorEducation = displayTutor && 'current_education' in displayTutor ? displayTutor.current_education : undefined;
  const tutorMajor = displayTutor && 'major' in displayTutor ? displayTutor.major : undefined;
  const tutorYear = displayTutor && 'year' in displayTutor ? displayTutor.year : undefined;
  const tutorPreviousEducation = displayTutor && 'previous_education' in displayTutor && Array.isArray(displayTutor.previous_education) 
    ? displayTutor.previous_education 
    : [];
  const tutorExtracurriculars = displayTutor && 'extracurriculars' in displayTutor && Array.isArray(displayTutor.extracurriculars) 
    ? displayTutor.extracurriculars 
    : [];
  const tutorGcse = displayTutor && 'gcse' in displayTutor && Array.isArray(displayTutor.gcse) ? displayTutor.gcse : [];
  const tutorALevels = displayTutor && 'a-levels' in displayTutor && Array.isArray(displayTutor['a-levels']) ? displayTutor['a-levels'] : [];
  const tutorSpm = displayTutor && 'spm' in displayTutor ? displayTutor.spm : undefined;

  return (
    <div className="min-h-screen bg-white pt-24 pb-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left Sidebar - Tutor Info */}
          <div className="md:col-span-1">
            <div className="sticky top-24">
              <Card className="overflow-hidden">
                <div className="bg-gradient-to-r from-purple-100 to-blue-100 h-24"></div>
                <div className="p-6 text-center relative">
                  <Avatar className="h-24 w-24 mx-auto mt-[-3rem] border-4 border-white shadow-sm">
                    <AvatarImage src={tutorAvatar} alt={tutorName} />
                    <AvatarFallback>{tutorName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <h2 className="text-2xl font-bold mt-3">{tutorName}</h2>
                  
                  <div className="flex items-center justify-center gap-1 mt-2">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-5 w-5 ${
                          i < Math.floor(averageRating) 
                            ? 'text-amber-500 fill-amber-500' 
                            : 'text-muted-foreground'
                        }`}
                      />
                    ))}
                    <span className="ml-2 font-medium">{averageRating.toFixed(1)}</span>
                    <span className="ml-1 text-muted-foreground">({tutorReviews.length})</span>
                  </div>
                  
                  <div className="flex items-center justify-center gap-1 mt-2 text-green-600 text-sm">
                    <CheckCircle className="h-4 w-4" />
                    <span>Verified Tutor</span>
                  </div>
                </div>
                
                {/* Tutor Details */}
                <div className="border-t border-gray-100">
                  <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100">
                    <div className="flex items-center text-muted-foreground">
                      <Clock className="h-4 w-4 mr-2" />
                      <span>Response Time</span>
                    </div>
                    <span className="font-medium">&lt; 2 hours</span>
                  </div>
                  
                  <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100">
                    <div className="flex items-center text-muted-foreground">
                      <BookOpen className="h-4 w-4 mr-2" />
                      <span>Sessions Completed</span>
                    </div>
                    <span className="font-medium">32</span>
                  </div>
                  
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
                
                {/* Message Button */}
                <div className="p-6 pt-4">
                  <Button className="w-full" onClick={handleMessage}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Message Tutor
                  </Button>
                </div>
              </Card>
            </div>
          </div>
          
          {/* Main Content */}
          <div className="md:col-span-2">
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
                      <h3 className="font-semibold text-lg mb-2">Subjects</h3>
                      {tutorSubjects && tutorSubjects.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {tutorSubjects.map((subject, index) => (
                            <Badge key={index} variant="secondary">{subject}</Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground">No subjects specified</p>
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
                    
                    {tutorReviews.length > 0 ? (
                      <div className="space-y-6">
                        {tutorReviews.map((review, index) => {
                          // Get review content safely based on the structure of the review object
                          let reviewContent = "No comment provided.";
                          
                          // Handle Supabase reviews (review field) first, then fall back to mock reviews (comment field)
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
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
} 