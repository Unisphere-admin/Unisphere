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
  age?: number | null;
  major?: string | null;
  current_education?: string | null;
  year?: string | null;
  previous_education?: string[] | null;
  extracurriculars?: string[] | null;
  gcse?: string[] | null;
  "a-levels"?: string[] | null;
  spm?: string | null;
  search_id: string;
}

// Function to perform fuzzy search - handles misspellings
function fuzzySearch(text: string | null | undefined, query: string): boolean {
  if (!text || !query || query.length === 0) return false;
  
  // Convert both strings to lowercase for case-insensitive matching
  const textLower = text.toLowerCase();
  const queryLower = query.toLowerCase();
  
  // Exact match is always good
  if (textLower.includes(queryLower)) return true;
  
  // Split the query into words for multi-word searching
  const queryWords = queryLower.split(/\s+/).filter(word => word.length > 0);
  
  // For each word in the query, check if it matches with reasonable typos
  for (const word of queryWords) {
    if (word.length <= 2) {
      // For very short words, require exact match
      if (textLower.includes(word)) return true;
    } else {
      // For longer words, allow for some typos
      
      // Approach 1: Check if most of the characters are present in order
      let matchCount = 0;
      let lastIndex = -1;
      
      for (const char of word) {
        const index = textLower.indexOf(char, lastIndex + 1);
        if (index > lastIndex) {
          matchCount++;
          lastIndex = index;
        }
      }
      
      // If we matched most of the characters in order (allowing for 1-2 typos)
      if (matchCount >= word.length - 2) return true;
      
      // Approach 2: Check for common prefixes (handles most misspellings)
      if (word.length >= 4) {
        const prefix = word.substring(0, Math.min(4, word.length - 1));
        if (textLower.includes(prefix)) return true;
      }
    }
  }
  
  return false;
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
  const [selectedSchools, setSelectedSchools] = useState<string[]>([]);
  const [isSubjectFilterOpen, setIsSubjectFilterOpen] = useState(false);
  const [isSchoolFilterOpen, setIsSchoolFilterOpen] = useState(false);
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
    
  // Extract all unique schools/educational institutions from tutor profiles
  const allSchools = tutors.length > 0
    ? Array.from(new Set(tutors.flatMap((tutor: TutorProfile) => {
        const schools: string[] = [];
        
        // Add current education if available
        if (tutor.current_education) {
          schools.push(tutor.current_education);
        }
        
        // Add previous education institutions if available
        if (tutor.previous_education && Array.isArray(tutor.previous_education)) {
          schools.push(...tutor.previous_education);
        }
        
        return schools.filter(Boolean).map(s => s.trim());
      })))
    : [];

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

  // Filter tutors based on search term, selected subjects, and selected schools
  const filteredTutors = tutors.filter((tutor: TutorProfile) => {
    // Get tutor data for searching
    const fullName = `${tutor.first_name || ''} ${tutor.last_name || ''}`;
    const tutorSubjects = tutor.subjects?.split(',').map((s: string) => s.trim()) || [];
    
    // Extract all education-related information
    const tutorSchools: string[] = [];
    if (tutor.current_education) tutorSchools.push(tutor.current_education);
    if (tutor.previous_education && Array.isArray(tutor.previous_education)) {
      tutorSchools.push(...tutor.previous_education);
    }
    
    // Collect all searchable keywords (excluding description)
    const searchableKeywords = [
      fullName,
      ...tutorSubjects,
      ...tutorSchools,
      tutor.major || '',
      tutor.year || '',
      ...(tutor.gcse || []),
      ...(tutor["a-levels"] || []),
      tutor.spm || '',
      ...(tutor.extracurriculars || []),
      tutor.location || ''
    ].filter(Boolean); // Remove empty strings
    
    // Check if any searchable field matches the search term using fuzzy search
    const matchesSearch = searchTerm.length === 0 || 
      searchableKeywords.some(keyword => fuzzySearch(keyword, searchTerm));
    
    // Check if tutor teaches any of the selected subjects
    const matchesSubjects = selectedSubjects.length === 0 || 
      tutorSubjects.some(subject => selectedSubjects.includes(subject));
      
    // Check if tutor is associated with any of the selected schools
    const matchesSchools = selectedSchools.length === 0 ||
      tutorSchools.some(school => selectedSchools.includes(school));
    
    return matchesSearch && matchesSubjects && matchesSchools;
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

  const toggleSchool = (school: string) => {
    if (selectedSchools.includes(school)) {
      setSelectedSchools(selectedSchools.filter(s => s !== school));
    } else {
      setSelectedSchools([...selectedSchools, school]);
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
        <div className="flex flex-wrap items-center justify-between mb-6 gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Subject filter dropdown */}
            <DropdownMenu open={isSubjectFilterOpen} onOpenChange={setIsSubjectFilterOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Subjects {selectedSubjects.length > 0 && `(${selectedSubjects.length})`}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 max-h-[60vh] overflow-auto">
                <DropdownMenuLabel>Filter by Subject</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {allSubjects.sort().map((subject) => (
                  <DropdownMenuCheckboxItem
                    key={subject}
                    checked={selectedSubjects.includes(subject)}
                    onCheckedChange={() => toggleSubject(subject)}
                  >
                    {subject}
                  </DropdownMenuCheckboxItem>
                ))}
                {selectedSubjects.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-center"
                      onClick={() => setSelectedSubjects([])}
                    >
                      Clear Subjects
                    </Button>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* School filter dropdown - only show if we have schools */}
            {allSchools.length > 0 && (
              <DropdownMenu open={isSchoolFilterOpen} onOpenChange={setIsSchoolFilterOpen}>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Schools {selectedSchools.length > 0 && `(${selectedSchools.length})`}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 max-h-[60vh] overflow-auto">
                  <DropdownMenuLabel>Filter by School</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {allSchools.sort().map((school) => (
                    <DropdownMenuCheckboxItem
                      key={school}
                      checked={selectedSchools.includes(school)}
                      onCheckedChange={() => toggleSchool(school)}
                    >
                      {school}
                    </DropdownMenuCheckboxItem>
                  ))}
                  {selectedSchools.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-center"
                        onClick={() => setSelectedSchools([])}
                      >
                        Clear Schools
                      </Button>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            
            {/* Clear all filters button */}
            {(selectedSubjects.length > 0 || selectedSchools.length > 0 || searchTerm) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm("");
                  setSelectedSubjects([]);
                  setSelectedSchools([]);
                }}
              >
                Clear All Filters
              </Button>
            )}
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
              setSelectedSchools([]);
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