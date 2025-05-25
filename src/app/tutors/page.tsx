"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSessions } from "@/context/SessionContext";
import { useApiTutorProfiles } from "@/hooks/useApiClient";
import { useAuth } from "@/context/AuthContext";
import { 
  Search,
  Filter,
  Star,
  MapPin,
  CheckCircle,
  ArrowUpDown,
  Loader
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAvatarUrl } from "@/utils/nameUtils";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Define tutor profile type
interface TutorProfile {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  description?: string | null;
  subjects?: string | null;
  avatar_url?: string | null;
  location?: string | null;
}

// List of available subjects (will be populated dynamically)
const DEFAULT_SUBJECTS = [
  "Mathematics", 
  "Physics", 
  "Chemistry", 
  "Biology", 
  "English", 
  "History", 
  "Computer Science",
  "Spanish",
  "French", 
  "Music"
];

// Add interface for tutor ratings
interface TutorRating {
  tutorId: string;
  averageRating: number;
  reviewCount: number;
}

interface ReviewStarsProps {
  rating: number;
}

const ReviewStars = ({ rating }: ReviewStarsProps) => {
  // Ensure rating is valid (0 stars if no reviews)
  const displayRating = rating || 0;
  
  return (
    <div className="flex items-center">
      {[...Array(5)].map((_, i) => {
        // Calculate if this should be a full, partial or empty star
        const starValue = i + 1;
        let starClass = 'text-muted-foreground'; // Empty star by default
        
        if (displayRating >= starValue) {
          // Full star
          starClass = 'text-amber-500 fill-amber-500';
        } else if (displayRating > i && displayRating < starValue) {
          // Partial star (more than i but less than i+1)
          return (
            <div key={i} className="relative">
              {/* Empty star background */}
              <Star className="h-4 w-4 text-muted-foreground" />
              {/* Filled overlay with a clip to the percentage */}
              <div 
                className="absolute inset-0 overflow-hidden" 
                style={{ width: `${(displayRating - i) * 100}%` }}
              >
                <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
              </div>
            </div>
          );
        }
        
        return (
        <Star
          key={i}
            className={`h-4 w-4 ${starClass}`}
        />
        );
      })}
      <span className="ml-2 text-sm font-medium">{displayRating.toFixed(1)}</span>
    </div>
  );
};

export default function TutorsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { reviewHistory } = useSessions();
  const { tutors: apiTutors, loading: tutorsLoading, error: tutorsError } = useApiTutorProfiles();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<"rating" | "name" | "popularity">("rating");
  // State for storing tutor ratings from API
  const [tutorRatings, setTutorRatings] = useState<{[key: string]: TutorRating}>({});
  const [loadingRatings, setLoadingRatings] = useState(false);
  
  // Check for premium access
  useEffect(() => {
    if (!loading) {
      const hasAccess = user?.role === 'tutor' || user?.has_access === true;
      if (!user) {
        router.replace('/login');
      } else if (!hasAccess) {
        console.log('User does not have premium access, redirecting to paywall');
        router.replace('/paywall');
      }
    }
  }, [user, loading, router]);

  // If still loading auth or user doesn't have access, don't render the actual content
  if (loading || !user || !(user.role === 'tutor' || user.has_access === true)) {
    return (
      <div className="flex items-center justify-center min-h-screen w-full">
        <div className="text-center">
          <Loader className="h-10 w-10 animate-spin mx-auto mb-4 text-primary" />
          <h3 className="text-xl font-semibold">Loading...</h3>
        </div>
      </div>
    );
  }
  
  // Ensure tutors is always an array of TutorProfile
  const tutors: TutorProfile[] = Array.isArray(apiTutors) ? apiTutors : [];
  
  // Extract all unique subjects from tutor profiles
  const allSubjects = tutors.length > 0 
    ? Array.from(new Set(tutors.flatMap((tutor: TutorProfile) => 
        tutor.subjects ? tutor.subjects.split(',').map((s: string) => s.trim()) : []
      )))
    : DEFAULT_SUBJECTS;

  // Function to fetch ratings for all tutors
  const fetchTutorRatings = async () => {
    setLoadingRatings(true);
    const ratingsMap: {[key: string]: TutorRating} = {};
    
    try {
      // Fetch ratings for each tutor
      for (const tutor of tutors) {
        try {
          const response = await fetch(`/api/reviews?tutor_id=${tutor.id}&average_only=true`, {
            credentials: 'include'
          });
          
          if (response.ok) {
            const data = await response.json();
            ratingsMap[tutor.id] = {
              tutorId: tutor.id,
              averageRating: data.averageRating || 0,
              reviewCount: data.count || 0
            };
          }
        } catch (error) {
          console.error(`Error fetching rating for tutor ${tutor.id}:`, error);
        }
      }
      
      setTutorRatings(ratingsMap);
    } catch (error) {
      console.error("Error fetching tutor ratings:", error);
    } finally {
      setLoadingRatings(false);
    }
  };
  
  // Fetch ratings when tutors are loaded
  useEffect(() => {
    if (tutors.length > 0) {
      fetchTutorRatings();
    }
  }, [tutors]);

  // Filter tutors based on search term and selected subjects
  const filteredTutors = tutors.filter((tutor: TutorProfile) => {
    const fullName = `${tutor.first_name || ''} ${tutor.last_name || ''}`.toLowerCase();
    const tutorSubjects = tutor.subjects?.split(',').map((s: string) => s.trim()) || [];
    
    const matchesSearch = 
      fullName.includes(searchTerm.toLowerCase()) || 
      (tutor.description && tutor.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      tutorSubjects.some((subject: string) => subject.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesSubjects = selectedSubjects.length === 0 || 
      tutorSubjects.some((subject: string) => selectedSubjects.includes(subject));
    
    return matchesSearch && matchesSubjects;
  });

  // Sort tutors based on selected sort order
  const sortedTutors = [...filteredTutors].sort((a: TutorProfile, b: TutorProfile) => {
    if (sortOrder === "rating") {
      // Use API ratings data for sorting
      const aRating = tutorRatings[a.id]?.averageRating || 0;
      const bRating = tutorRatings[b.id]?.averageRating || 0;
      return bRating - aRating;
    } else if (sortOrder === "name") {
      return `${a.first_name || ''} ${a.last_name || ''}`.localeCompare(`${b.first_name || ''} ${b.last_name || ''}`);
    } else {
      // Sort by popularity (number of reviews)
      const aReviewCount = tutorRatings[a.id]?.reviewCount || 0;
      const bReviewCount = tutorRatings[b.id]?.reviewCount || 0;
      return bReviewCount - aReviewCount;
    }
  });

  const toggleSubject = (subject: string) => {
    if (selectedSubjects.includes(subject)) {
      setSelectedSubjects(selectedSubjects.filter(s => s !== subject));
    } else {
      setSelectedSubjects([...selectedSubjects, subject]);
    }
  };

  // Show loading indicator while fetching tutors
  if (tutorsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen w-full">
        <div className="text-center">
          <Loader className="h-10 w-10 animate-spin mx-auto mb-4 text-primary" />
          <h3 className="text-xl font-semibold">Loading tutors...</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      {/* Hero Section */}
      <section className="hero-gradient hero-section">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-4">Find Your Perfect Tutor</h1>
          <p className="text-muted-foreground mb-8">
            Browse our network of expert tutors and find the right match for your learning needs
          </p>
          
          {/* Search Bar */}
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
            <Input
              className="pl-10 h-12"
              placeholder="Search by name, subject, or keyword"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="content-section">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filter by Subject
            </Button>
          </div>
          <div className="flex items-center gap-4">
            <p className="text-sm text-muted-foreground hidden md:block">
              Showing {sortedTutors.length} of {tutors.length} tutors
            </p>
            <Select 
              value={sortOrder} 
              onValueChange={(value) => 
                setSortOrder(value as "rating" | "name" | "popularity")
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Highest Rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rating">Highest Rating</SelectItem>
                <SelectItem value="name">Name (A-Z)</SelectItem>
                <SelectItem value="popularity">Most Popular</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tutors List */}
        {sortedTutors.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-xl font-semibold mb-2">No tutors found</h3>
            <p className="text-muted-foreground mb-6">Try adjusting your filters or search term</p>
            <Button onClick={() => {
              setSearchTerm("");
              setSelectedSubjects([]);
            }}>
              Clear all filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {sortedTutors.map((tutor: TutorProfile) => {
              const tutorId = tutor.id;
              const tutorName = `${tutor.first_name || ''} ${tutor.last_name || ''}`;
              const tutorBio = tutor.description || '';
              const tutorLocation = tutor.location || 'Online';
              const tutorImage = getAvatarUrl(tutor);
              
              // Get rating from API data
              const tutorRating = tutorRatings[tutorId];
              const rating = tutorRating?.averageRating || 0;
              const reviewCount = tutorRating?.reviewCount || 0;
                
              return (
                <div key={tutorId} className="bg-white border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  <div className="hero-gradient h-24"></div>
                  <div className="p-6 relative">
                    <Avatar className="h-20 w-20 border-4 border-white absolute -top-10 left-6 shadow-sm">
                      <AvatarImage 
                        src={tutorImage} 
                        alt={tutorName}
                        onError={(e) => {
                          console.error(`Failed to load avatar image: ${tutorImage}`);
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      <AvatarFallback>
                        {tutor.first_name ? tutor.first_name.charAt(0) : ''}
                        {tutor.last_name ? tutor.last_name.charAt(0) : 'T'}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="mt-12">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xl font-semibold">{tutorName}</h3>
                        <div className="flex items-center">
                          <ReviewStars rating={rating} />
                          {reviewCount > 0 && <span className="ml-1 text-xs text-muted-foreground">({reviewCount})</span>}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 text-green-600 text-sm mt-1">
                        <CheckCircle className="h-3.5 w-3.5" />
                        <span>Verified Tutor</span>
                      </div>
                      
                      <p className="text-sm mt-3 text-gray-600">
                        {tutorBio && tutorBio.length > 100 ? `${tutorBio.substring(0, 100)}...` : tutorBio || "Experienced tutor ready to help you succeed."}
                      </p>
                      
                      <div className="flex items-center text-sm text-gray-500 mt-3">
                        <MapPin className="h-3.5 w-3.5 mr-1" />
                        {tutorLocation}
                        <span className="mx-2">•</span>
                        <span>{reviewCount} {reviewCount === 1 ? 'review' : 'reviews'}</span>
                      </div>
                      
                      <Button className="w-full mt-4" asChild>
                        <Link href={`/tutors/${tutorId}`}>View Profile</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
} 