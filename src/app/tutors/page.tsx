"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSessions } from "@/context/SessionContext";
import { useCachedTutors } from "@/hooks/useCachedData";
import { useAuth } from "@/context/AuthContext";
import { 
  Search,
  Filter,
  Star,
  MapPin,
  CheckCircle,
  ArrowUpDown,
  Loader2,
  Sparkles,
  ArrowRight,
  GraduationCap,
  School,
  X,
  AlertCircle,
  BookOpen
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
import { Separator } from "@/components/ui/separator";
import React from "react";
import { validateSearchInput, sanitizeInput } from "@/lib/validation";
import { toast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { throttledFetch } from "@/utils/requestThrottler";

// Define tutor profile type with more precise types
interface TutorProfile {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  description?: string | null;
  subjects?: string | null | string[];
  avatar_url?: string | null;
  location?: string | null;
  age?: number | null;
  major?: string | null;
  current_education?: string | null | string[];
  year?: string | null;
  previous_education?: string[] | null;
  extracurriculars?: string[] | null;
  gcse?: string[] | null;
  "a-levels"?: string[] | null;
  spm?: string | null;
  search_id: string;
}

// Improve fuzzy search to better handle education data
function fuzzySearch(text: string | null | undefined, query: string): boolean {
  if (!text || !query || query.length === 0) return false;
  
  // Handle array data
  if (Array.isArray(text)) {
    return text.some(item => fuzzySearch(item, query));
  }
  
  // Convert both strings to lowercase for case-insensitive matching
  const textLower = String(text).toLowerCase();
  const queryLower = query.toLowerCase();
  
  // For GCSE searches, handle special format
  if (queryLower.includes('gcse') || textLower.includes('gcse')) {
    // If search is for "GCSE Math" and text has "Math" or vice versa
    if (queryLower.includes('gcse') && !textLower.includes('gcse')) {
      // Try to match the subject after "GCSE"
      const subjectSearch = queryLower.replace('gcse', '').trim();
      if (subjectSearch && textLower.includes(subjectSearch)) return true;
    } else if (!queryLower.includes('gcse') && textLower.includes('gcse')) {
      // Text is GCSE but search doesn't specify it - try to match just the subject
      const subjectText = textLower.replace('gcse:', '').trim();
      if (subjectText && queryLower.includes(subjectText)) return true;
    }
  }
  
  // Similar handling for A-levels
  if (queryLower.includes('a-level') || textLower.includes('a-level')) {
    if (queryLower.includes('a-level') && !textLower.includes('a-level')) {
      const subjectSearch = queryLower.replace('a-level', '').trim();
      if (subjectSearch && textLower.includes(subjectSearch)) return true;
    } else if (!queryLower.includes('a-level') && textLower.includes('a-level')) {
      const subjectText = textLower.replace('a-level:', '').trim();
      if (subjectText && queryLower.includes(subjectText)) return true;
    }
  }
  
  // Exact match or substring match is ideal
  if (textLower.includes(queryLower)) return true;
  
  // Split the query into words for multi-word searching
  const queryWords = queryLower.split(/\s+/).filter(word => word.length > 0);
  
  // If this is a multi-word query, try matching all words in any order
  if (queryWords.length > 1) {
    const allWordsMatch = queryWords.every(word => {
      // Skip very short words (prepositions, articles, etc.)
      if (word.length <= 2) return true;
      return textLower.includes(word);
    });
    if (allWordsMatch) return true;
  }
  
  // For each word in the query, check if it matches
  for (const word of queryWords) {
    // Skip very short words (prepositions, articles, etc.) unless exact match found
    if (word.length <= 2) {
      if (textLower.includes(word)) return true;
      continue;
    }
    
    // For longer words, try different fuzzy matching approaches
    
    // 1. Check for substring match (most important)
    if (textLower.includes(word)) return true;
    
    // 2. Check for prefix match (beginning of words)
    const textWords = textLower.split(/\s+/);
    for (const textWord of textWords) {
      if (textWord.startsWith(word.substring(0, Math.min(word.length, 3)))) return true;
    }
    
    // 3. Levenshtein distance (basic implementation for similar words)
    for (const textWord of textWords) {
      if (textWord.length > 2 && calculateSimilarity(textWord, word) > 0.7) return true;
    }
  }
  
  return false;
}

// Helper function to calculate string similarity (0 to 1)
function calculateSimilarity(s1: string, s2: string): number {
  // Simple character overlap ratio for similar words
  if (Math.abs(s1.length - s2.length) > 3) return 0;
  
  const shorter = s1.length < s2.length ? s1 : s2;
  const longer = s1.length >= s2.length ? s1 : s2;
  
  let matches = 0;
  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter[i])) matches++;
  }
  
  return matches / longer.length;
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
          starClass = 'text-[#4ba896] fill-[#4ba896]';
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
                <Star className="h-4 w-4 text-[#4ba896] fill-[#4ba896]" />
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

// Custom checkbox item that doesn't close the dropdown
const StayOpenCheckboxItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuCheckboxItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuCheckboxItem> & {
    onCheckedChange?: (checked: boolean) => void;
  }
>(({ onCheckedChange, ...props }, ref) => {
  return (
    <DropdownMenuCheckboxItem
      {...props}
      ref={ref}
      onSelect={(e) => {
        // Prevent the dropdown from closing
        e.preventDefault();
        onCheckedChange?.(!props.checked);
      }}
    />
  );
});
StayOpenCheckboxItem.displayName = "StayOpenCheckboxItem";

export default function TutorsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { reviewHistory } = useSessions();
  const [tutors, setTutors] = useState<TutorProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedSchools, setSelectedSchools] = useState<string[]>([]);
  const [isSubjectFilterOpen, setIsSubjectFilterOpen] = useState(false);
  const [isSchoolFilterOpen, setIsSchoolFilterOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState<"rating" | "name" | "popularity">("rating");
  const [tutorRatings, setTutorRatings] = useState<{[key: string]: TutorRating}>({});
  const [loadingTutors, setLoadingTutors] = useState(true);
  const [loadingRatings, setLoadingRatings] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  // Function to safely fetch data with retries and error handling
  const fetchWithRetry = async (url: string, options: RequestInit = {}, maxRetries = 3): Promise<Response> => {
    let lastError: any;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Add a small delay for retries
        if (attempt > 0) {
          await new Promise(r => setTimeout(r, 300 * attempt));
        }
        
        const response = await fetch(url, {
          ...options,
          credentials: 'include',
          headers: {
            ...options.headers,
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        
        return response;
      } catch (error) {
        lastError = error;
        console.warn(`Fetch attempt ${attempt + 1}/${maxRetries + 1} failed:`, error);
      }
    }
    
    throw lastError;
  };
  
  const fetchTutorsWithRetry = async () => {
    setLoadingTutors(true);
    setError(null);
    
    try {
      // Attempt to fetch tutors
      const response = await fetchWithRetry('/api/tutors');
      
      if (!response.ok) {
        // Handle error response
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }
      
      const data = await response.json();
      setTutors(data.tutors || []);
    } catch (error) {
      console.error("Error fetching tutors:", error);
      setError("Failed to load tutors. Please try again.");
      
      // Schedule a retry
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
      }, 3000); // Retry after 3 seconds
    } finally {
      setLoadingTutors(false);
    }
  };
  
  // Fetch ratings for all tutors
  const fetchTutorRatings = async () => {
    setLoadingRatings(true);
    
    try {
      // Check for cached ratings first
      const cacheKey = 'cached_tutor_ratings';
      const cachedRatings = localStorage.getItem(cacheKey);
      
      if (cachedRatings) {
        try {
          const parsed = JSON.parse(cachedRatings);
          const cacheAge = Date.now() - (parsed.timestamp || 0);
          
          // Use cache if it's less than 5 minutes old
          if (cacheAge < 5 * 60 * 1000) {
            console.log('Using cached tutor ratings');
            setTutorRatings(parsed.data || {});
            setLoadingRatings(false);
            return;
          }
        } catch (err) {
          console.warn('Error parsing cached ratings:', err);
        }
      }
      
      // Fetch fresh ratings if no cache or cache is stale
      let ratingsByTutor: {[key: string]: TutorRating} = {};
      
      if (tutors && tutors.length > 0) {
        // Use new endpoint for ratings
        try {
          const response = await fetchWithRetry('/api/reviews?type=all');
          
          if (response.ok) {
            const data = await response.json();
            const { reviews } = data;
            
            if (Array.isArray(reviews)) {
              // Process reviews into ratings by tutor
              tutors.forEach(tutor => {
                if (!tutor.id) return;
                
                const tutorReviews = reviews.filter((review: any) => 
                  review.tutor_id === tutor.id || review.tutorId === tutor.id
                );
                
                if (tutorReviews.length > 0) {
                  const totalRating = tutorReviews.reduce((sum: number, review: any) => 
                    sum + (review.rating || 0), 0
                  );
                  
                  ratingsByTutor[tutor.id] = {
                    tutorId: tutor.id,
                    averageRating: totalRating / tutorReviews.length,
                    reviewCount: tutorReviews.length
                  };
                }
              });
            }
            
            // Cache the ratings
            localStorage.setItem(cacheKey, JSON.stringify({
              data: ratingsByTutor,
              timestamp: Date.now()
            }));
          }
        } catch (err) {
          console.warn('Error fetching ratings:', err);
        }
      }
      
      setTutorRatings(ratingsByTutor);
    } catch (err) {
      console.error('Error in fetchTutorRatings:', err);
    } finally {
      setLoadingRatings(false);
    }
  };
  
  // Set initial load complete after a short delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setInitialLoadComplete(true);
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  // Load tutors data with retry capability
  useEffect(() => {
    fetchTutorsWithRetry();
  }, [retryCount]);
  
  // Fetch ratings when tutors are loaded
  useEffect(() => {
    if (tutors.length > 0) {
      fetchTutorRatings();
    }
  }, [tutors]);

  // If data is still loading, show a loading indicator
  if (loadingTutors && !initialLoadComplete && (!tutors || tutors.length === 0)) {
    return (
      <div className="flex items-center justify-center min-h-screen w-full">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin mx-auto mb-4 text-primary" />
          <h3 className="text-xl font-semibold">Loading Tutors...</h3>
        </div>
      </div>
    );
  }
  
  // Ensure tutors is always an array of TutorProfile
  // const tutors: TutorProfile[] = Array.isArray(tutors) ? tutors : [];
  
  // Extract all unique subjects from tutor profiles - improved to handle edge cases
  const allSubjects = tutors.length > 0 
    ? Array.from(new Set(tutors.flatMap((tutor: TutorProfile) => {
        // Get subjects from the subjects field if available
        if (tutor.subjects) {
          // Handle both string and array formats
          if (typeof tutor.subjects === 'string') {
            return tutor.subjects
              .split(',')
              .map((s: string) => s.trim())
              .filter((s: string) => s.length > 0); // Filter out empty strings
          } else if (Array.isArray(tutor.subjects)) {
            return tutor.subjects
              .filter((s: any) => typeof s === 'string' && s.trim().length > 0)
              .map((s: string) => s.trim());
          }
        }
        return [];
      })))
    : DEFAULT_SUBJECTS;
    
  // Fix education filter to properly use current and previous education only
  const allSchools = tutors.length > 0
    ? Array.from(new Set(tutors.flatMap((tutor: TutorProfile) => {
        const schools: string[] = [];
        
        // Log the tutor and their education data types
        console.log(`Tutor ${tutor.id} education data:`, {
          currentEducationType: tutor.current_education ? typeof tutor.current_education : 'undefined',
          currentEducation: tutor.current_education,
          previousEducationType: tutor.previous_education ? typeof tutor.previous_education : 'undefined',
          previousEducation: tutor.previous_education,
          major: tutor.major
        });
        
        // Add current education if available - with better handling
        if (tutor.current_education) {
          if (typeof tutor.current_education === 'string' && tutor.current_education.trim().length > 0) {
            schools.push(tutor.current_education.trim());
            console.log(`Found current education (string): ${tutor.current_education.trim()}`);
          } else if (Array.isArray(tutor.current_education)) {
            tutor.current_education.forEach((school: any) => {
              if (typeof school === 'string' && school.trim().length > 0) {
                schools.push(school.trim());
                console.log(`Found current education (array): ${school.trim()}`);
              }
            });
          }
        }
        
        // Add previous education institutions if available - with better handling
        if (tutor.previous_education && Array.isArray(tutor.previous_education)) {
          const validPreviousEducation = tutor.previous_education
            .filter((school: any) => typeof school === 'string' && school.trim().length > 0)
            .map((school: string) => school.trim());
          
          validPreviousEducation.forEach(school => {
            schools.push(school);
            console.log(`Found previous education: ${school}`);
          });
        }
        
        return schools;
      })))
    : [];
    
  // If no education data is found, use majors as a fallback
  const filterSchools = allSchools.length > 0 
    ? allSchools 
    : Array.from(new Set(tutors
        .filter(tutor => tutor.major && typeof tutor.major === 'string')
        .map(tutor => {
          const majorLabel = `${tutor.major}${tutor.year ? ` (${tutor.year})` : ''}`;
          console.log(`Using major as fallback: ${majorLabel}`);
          return majorLabel;
        })
      ));
  
  // Log the collected schools for debugging
  console.log("All schools collected:", filterSchools);

  // In the filteredTutors, improve the handling of education data for search
  const filteredTutors = tutors.filter((tutor: TutorProfile) => {
    // Get tutor data for searching
    const fullName = `${tutor.first_name || ''} ${tutor.last_name || ''}`.trim();
    
    // Handle subject data properly
    const tutorSubjects: string[] = [];
    if (tutor.subjects) {
      if (typeof tutor.subjects === 'string') {
        tutorSubjects.push(
          ...tutor.subjects
            .split(',')
            .map((s: string) => s.trim())
            .filter((s: string) => s.length > 0)
        );
      } else if (Array.isArray(tutor.subjects)) {
        const validSubjects = tutor.subjects
          .filter((s: any) => typeof s === 'string' && s.trim().length > 0)
          .map((s: string) => s.trim());
        tutorSubjects.push(...validSubjects);
      }
    }
    
    // Extract all education-related information with improved validation
    const tutorSchools: string[] = [];
    
    // Current education - handle both string and array formats properly
    if (tutor.current_education) {
      if (typeof tutor.current_education === 'string' && tutor.current_education.trim().length > 0) {
        tutorSchools.push(tutor.current_education.trim());
      } else if (Array.isArray(tutor.current_education)) {
        tutor.current_education.forEach((school: any) => {
          if (typeof school === 'string' && school.trim().length > 0) {
            tutorSchools.push(school.trim());
          }
        });
      }
    }
    
    // Previous education with better handling
    if (tutor.previous_education && Array.isArray(tutor.previous_education)) {
      const validPreviousEducation = tutor.previous_education
        .filter((school: any) => typeof school === 'string' && school.trim().length > 0)
        .map((school: string) => school.trim());
      
      tutorSchools.push(...validPreviousEducation);
    }
    
    // For search purposes only - collect all education-related information
    const tutorEducation: string[] = [...tutorSchools];
    
    // Add major to education-related fields for search
    if (tutor.major && typeof tutor.major === 'string' && tutor.major.trim().length > 0) {
      tutorEducation.push(tutor.major.trim());
    }
    
    // Add year to education-related fields for search
    if (tutor.year && typeof tutor.year === 'string' && tutor.year.trim().length > 0) {
      tutorEducation.push(tutor.year.trim());
    }
    
    // Add GCSEs to education-related fields for search
    if (tutor.gcse && Array.isArray(tutor.gcse)) {
      const validGcse = tutor.gcse
        .filter((item: any) => typeof item === 'string' && item.trim().length > 0)
        .map((item: string) => item.trim());
      
      // Add each GCSE subject individually  
      tutorEducation.push(...validGcse);
      
      // Also add with GCSE prefix for better searching
      validGcse.forEach(subject => {
        tutorEducation.push(`GCSE ${subject}`);
        tutorEducation.push(`GCSE: ${subject}`);
      });
      
      // Debug log GCSE subjects
      if (validGcse.length > 0) {
        console.log(`Tutor ${tutor.id} (${fullName}) has GCSE subjects:`, validGcse);
      }
    }
    
    // Add A-levels to education-related fields for search
    if (tutor["a-levels"] && Array.isArray(tutor["a-levels"])) {
      const validALevels = tutor["a-levels"]
        .filter((item: any) => typeof item === 'string' && item.trim().length > 0)
        .map((item: string) => item.trim());
      
      // Add each A-Level subject individually
      tutorEducation.push(...validALevels);
      
      // Also add with A-Level prefix for better searching
      validALevels.forEach(subject => {
        tutorEducation.push(`A-Level ${subject}`);
        tutorEducation.push(`A-Level: ${subject}`);
      });
      
      // Debug log A-Level subjects
      if (validALevels.length > 0) {
        console.log(`Tutor ${tutor.id} (${fullName}) has A-Level subjects:`, validALevels);
      }
    }
    
    // Add SPM to education-related fields for search
    if (tutor.spm && typeof tutor.spm === 'string' && tutor.spm.trim().length > 0) {
      tutorEducation.push(tutor.spm.trim());
    }
    
    // Collect all searchable keywords (including description for general search)
    const searchableKeywords = [
      fullName,
      ...tutorSubjects,
      ...tutorEducation,
      tutor.location || '',
      tutor.description || ''
    ].filter(Boolean).filter(keyword => typeof keyword === 'string' && keyword.trim().length > 0);
    
    // Debug log searchable keywords if searching
    if (searchTerm.length > 0) {
      console.log(`Searching with term: "${searchTerm}" against tutor ${fullName}`, {
        matchesSearch: searchableKeywords.some(keyword => fuzzySearch(keyword, searchTerm)),
        educationKeywords: tutorEducation
      });
    }
    
    // Special handling for education-related search terms
    const educationTerms = ['university', 'college', 'school', 'degree', 'major', 'gcse', 'a-level', 'spm', 'education', 'previous', 'current'];
    const isEducationSearch = educationTerms.some(term => searchTerm.toLowerCase().includes(term));
    
    // Check if tutor teaches any of the selected subjects
    const matchesSubjects = selectedSubjects.length === 0 || 
      tutorSubjects.some(subject => selectedSubjects.includes(subject));
      
    // Check if tutor is associated with any of the selected schools - prioritize education data
    const matchesSchools = selectedSchools.length === 0 ||
      tutorSchools.some(school => selectedSchools.includes(school));
    
    // Check if any searchable field matches the search term using fuzzy search
    // Always check all fields for all search terms
    const matchesSearch = searchTerm.length === 0 || 
      searchableKeywords.some(keyword => fuzzySearch(keyword, searchTerm));
    
    // If it's a GCSE search, also log the match details
    if (searchTerm.toLowerCase().includes('gcse')) {
      console.log(`GCSE search: "${searchTerm}", tutor: ${fullName}, matches: ${matchesSearch}`);
      if (matchesSearch) {
        // Log which keyword matched for debugging
        const matchingKeyword = searchableKeywords.find(keyword => fuzzySearch(keyword, searchTerm));
        console.log(`  Matched on keyword: "${matchingKeyword}"`);
      }
    }
    
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

  // Update the handler for search inputs
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    
    // Validate and sanitize the search input
    const { valid, value, error } = validateSearchInput(input);
    
    if (valid) {
      setSearchTerm(value);
    } else {
      // If invalid, truncate or use last valid value
      setSearchTerm(value); // using the sanitized version
      
      if (error) {
        toast({
          variant: "destructive",
          title: "Search error",
          description: error
        });
      }
    }
  };

  // Update the toggle functions for subjects and schools to include validation
  const toggleSubject = (subject: string) => {
    // Sanitize the subject value
    const sanitizedSubject = sanitizeInput(subject);
    
    setSelectedSubjects(prev => 
      prev.includes(sanitizedSubject) 
        ? prev.filter(s => s !== sanitizedSubject) 
        : [...prev, sanitizedSubject]
    );
  };

  const toggleSchool = (school: string) => {
    // Sanitize the school value
    const sanitizedSchool = sanitizeInput(school);
    
    setSelectedSchools(prev => 
      prev.includes(sanitizedSchool) 
        ? prev.filter(s => s !== sanitizedSchool) 
        : [...prev, sanitizedSchool]
    );
  };

  // Add error UI
  if (error) {
    return (
      <div className="p-8 text-center">
        <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-lg max-w-md mx-auto">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Failed to Load Tutors</h2>
          <p className="mb-4 text-muted-foreground">{error}</p>
          <Button 
            onClick={() => {
              setRetryCount(count => count + 1);
            }}
            className="mx-auto"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }
  
  // Return main content without ErrorBoundary since it's not available
  return (
    <div className="space-y-8 pb-12">
      {/* Hero Section */}
      <section className="relative py-20 md:py-28 overflow-hidden">
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#c2dac2]/30 via-background/95 to-[#c2d8d2]/20">
          <div className="absolute top-20 right-[20%] w-72 h-72 bg-[#84bc9c]/10 rounded-full blur-3xl opacity-70 animate-pulse" style={{animationDuration: '8s'}}></div>
          <div className="absolute bottom-10 left-[10%] w-80 h-80 bg-[#84b7bd]/10 rounded-full blur-3xl opacity-60 animate-pulse" style={{animationDuration: '12s'}}></div>
        </div>
        <div className="container relative z-10 mx-auto px-4 md:px-6 max-w-screen-xl">
        <div className="max-w-3xl mx-auto text-center">
            <Badge variant="outline" className="px-3 py-1 mb-4 text-sm bg-background/80 backdrop-blur-sm border-[#4ba896]/30 shadow-sm">
              <span className="text-[#129490] font-medium">Premium</span> - Expert tutors
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight mb-4 md:text-5xl">
              Find Your Perfect <span className="text-[#129490]">Tutor</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Browse our network of expert tutors and find the right match for your learning needs
          </p>
          
            {/* Search Bar with improved styling */}
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
            <Input
                className="pl-10 h-12 bg-background/80 backdrop-blur-sm border-[#84bc9c]/30 shadow-md focus-visible:border-[#4ba896]/30 focus-visible:ring-1 focus-visible:ring-[#4ba896]/20 transition-all"
              placeholder="Search by name, subject, or keyword"
              value={searchTerm}
                onChange={handleSearchChange}
            />
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="container mx-auto px-4 md:px-6">
        <div className="flex flex-wrap items-center justify-between mb-8 gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Subject filter dropdown */}
            <DropdownMenu open={isSubjectFilterOpen} onOpenChange={setIsSubjectFilterOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2 shadow-sm border-[#84bc9c]/40 hover:bg-[#c2dac2]/10 transition-colors">
                  <Filter className="h-4 w-4 text-[#4ba896]" strokeWidth={1.5} />
                  Subjects {selectedSubjects.length > 0 && (
                    <Badge variant="secondary" className="ml-1 bg-[#4ba896]/10 text-[#129490] border-none">
                      {selectedSubjects.length}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 max-h-[60vh] overflow-auto">
                <div className="flex items-center justify-between mb-2">
                <DropdownMenuLabel>Filter by Subject</DropdownMenuLabel>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6" 
                    onClick={() => setIsSubjectFilterOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <DropdownMenuSeparator />
                {allSubjects.sort().map((subject) => (
                  <StayOpenCheckboxItem
                    key={subject}
                    checked={selectedSubjects.includes(subject)}
                    onCheckedChange={() => {
                      toggleSubject(subject);
                    }}
                  >
                    {subject}
                  </StayOpenCheckboxItem>
                ))}
                {selectedSubjects.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-center text-primary/80 hover:text-primary"
                      onClick={(e) => {
                        // Prevent the dropdown from closing
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedSubjects([]);
                      }}
                    >
                      Clear Subjects
                    </Button>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* School filter dropdown */}
              <DropdownMenu open={isSchoolFilterOpen} onOpenChange={setIsSchoolFilterOpen}>
                <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2 shadow-sm border-[#84b7bd]/40 hover:bg-[#c2d8d2]/10 transition-colors">
                  <School className="h-4 w-4 text-[#4b92a9]" strokeWidth={1.5} />
                  Schools {selectedSchools.length > 0 && (
                    <Badge variant="secondary" className="ml-1 bg-[#4b92a9]/10 text-[#126d94] border-none">
                      {selectedSchools.length}
                    </Badge>
                  )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 max-h-[60vh] overflow-auto">
                <div className="flex items-center justify-between mb-2">
                  <DropdownMenuLabel>Filter by School</DropdownMenuLabel>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6" 
                    onClick={() => setIsSchoolFilterOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                  <DropdownMenuSeparator />
                {filterSchools.sort().map((school) => (
                  <StayOpenCheckboxItem
                      key={school}
                      checked={selectedSchools.includes(school)}
                    onCheckedChange={() => {
                      toggleSchool(school);
                    }}
                    >
                      {school}
                  </StayOpenCheckboxItem>
                  ))}
                  {selectedSchools.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <Button
                        variant="ghost"
                        size="sm"
                      className="w-full justify-center text-primary/80 hover:text-primary"
                      onClick={(e) => {
                        // Prevent the dropdown from closing
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedSchools([]);
                      }}
                      >
                        Clear Schools
                      </Button>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            
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
                className="text-muted-foreground hover:text-foreground"
              >
                Clear All Filters
                <X className="h-4 w-4 ml-1" />
            </Button>
            )}
          </div>
          <div className="flex items-center gap-4">
            <p className="text-sm text-muted-foreground hidden md:block">
              Showing {sortedTutors.length} of {tutors.length} tutors
            </p>
            <Select 
              value={sortOrder} 
              onValueChange={(value) => {
                // Type guard to prevent unnecessary re-renders
                const newValue = value as "rating" | "name" | "popularity";
                if (sortOrder !== newValue) {
                  setSortOrder(newValue);
                }
              }}
            >
              <SelectTrigger className="w-[180px] shadow-sm border-border/40">
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
          <div className="text-center py-12 px-4 bg-muted/30 backdrop-blur-sm border border-border/20 rounded-xl max-w-md mx-auto shadow-sm">
            <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 shadow-sm">
              <Search className="h-8 w-8 text-primary/80" strokeWidth={1.5} />
            </div>
            <h3 className="text-xl font-medium mb-2">No tutors found</h3>
            <p className="text-muted-foreground mb-6">Try adjusting your filters or search term</p>
            <Button 
              onClick={() => {
              setSearchTerm("");
              setSelectedSubjects([]);
              setSelectedSchools([]);
              }}
              className="bg-primary hover:bg-primary/90 shadow-md hover:shadow-lg transition-all hover:translate-y-[-2px]"
            >
              Clear all filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 auto-rows-fr">
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
                <Card key={tutorId} className="overflow-hidden bg-card/80 backdrop-blur-sm border-border/40 shadow-md hover:shadow-xl transition-all duration-300 hover:translate-y-[-3px] group flex flex-col h-full">
                  {/* Card header with gradient background */}
                  <div className="h-24 relative overflow-hidden w-full">
                    <div className="absolute inset-0 bg-gradient-to-r from-[#c2dac2] via-[#84bc9c] to-[#4ba896] group-hover:scale-105 transition-transform duration-500"></div>
                    <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20"></div>
                  </div>
                  
                  {/* Card content */}
                  <div className="p-6 relative flex-1 flex flex-col h-full">
                    {/* Avatar */}
                    <Avatar className="h-20 w-20 border-4 border-background absolute -top-10 left-6 shadow-md group-hover:shadow-lg transition-all">
                      {user?.has_access || user?.role === 'tutor' ? (
                        <AvatarImage 
                          src={tutorImage ?? undefined} 
                          alt={tutorName}
                        />
                      ) : (
                        <AvatarFallback className="bg-gradient-to-br from-[#84bc9c] to-[#4ba896] text-white font-semibold">
                          {tutor.first_name ? tutor.first_name.charAt(0).toUpperCase() : ''}
                          {tutor.last_name ? tutor.last_name.charAt(0).toUpperCase() : 'T'}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    
                    <div className="mt-12 flex flex-col h-full">
                      {/* Header section - Name and rating */}
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xl font-medium truncate">{tutorName}</h3>
                        <div className="flex items-center shrink-0">
                          <ReviewStars rating={rating} />
                          {reviewCount > 0 && <span className="ml-1 text-xs text-muted-foreground">({reviewCount})</span>}
                        </div>
                      </div>
                      
                      {/* Education section */}
                      <div className="text-xs text-muted-foreground mb-1">
                        {/* Current education */}
                        {(typeof tutor.current_education === 'string' && tutor.current_education.trim()) || 
                         (Array.isArray(tutor.current_education) && tutor.current_education.length > 0) ? (
                          <div className="flex items-center gap-1">
                            <School className="h-3 w-3 text-[#129490] shrink-0" strokeWidth={2} />
                            <span className="truncate">
                              {typeof tutor.current_education === 'string' 
                                ? tutor.current_education 
                                : (Array.isArray(tutor.current_education) && tutor.current_education.length > 0
                                   ? tutor.current_education[0] 
                                   : "")}
                              {tutor.year ? ` (${tutor.year})` : ''}
                            </span>
                          </div>
                        ) : null}
                        
                        {/* Major - Always show if available */}
                        {tutor.major ? (
                          <div className="flex items-center gap-1 mt-1">
                            <GraduationCap className="h-3 w-3 text-[#4b92a9] shrink-0" strokeWidth={2} />
                            <span className="truncate">Major: {tutor.major}</span>
                          </div>
                        ) : null}
                        
                        {/* Previous education */}
                        {Array.isArray(tutor.previous_education) && tutor.previous_education.length > 0 ? (
                          <div className="flex items-center gap-1 mt-1">
                            <School className="h-3 w-3 text-[#84b7bd] opacity-70 shrink-0" strokeWidth={2} />
                            <span className="truncate opacity-80">
                              Previously: {tutor.previous_education[0]}
                              {tutor.previous_education.length > 1 && (
                                <span className="opacity-70 text-[10px]"> +{tutor.previous_education.length - 1}</span>
                              )}
                            </span>
                          </div>
                        ) : null}
                      </div>
                      
                      {/* Verified Badge */}
                      <div className="flex items-center gap-1 text-[#4ba896] dark:text-[#84bc9c] text-sm mb-2">
                        <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                        <span>Verified Tutor</span>
                      </div>
                      
                      <Separator className="my-2 bg-[#c2d8d2]/50" />
                      
                      {/* Subjects section */}
                      <div className="mb-3">
                        <div className="flex items-center text-sm mb-1">
                          <BookOpen className="h-3.5 w-3.5 mr-1.5 text-[#129490] shrink-0" strokeWidth={2} />
                          <span className="font-medium">Subjects</span>
                        </div>
                        <div className="flex flex-wrap gap-1 pl-5">
                          {(typeof tutor.subjects === 'string' 
                            ? tutor.subjects.split(',').map(s => s.trim()) 
                            : Array.isArray(tutor.subjects) ? tutor.subjects : []
                          ).slice(0, 3).map((subject, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs bg-[#c2d8d2]/30 border-[#84b7bd]/30">
                              {subject}
                            </Badge>
                          ))}
                          {(typeof tutor.subjects === 'string' 
                            ? tutor.subjects.split(',') 
                            : Array.isArray(tutor.subjects) ? tutor.subjects : []
                          ).length > 3 && (
                            <Badge variant="outline" className="text-xs bg-[#4b92a9]/10 border-[#4b92a9]/30 text-[#126d94]">
                              +{(typeof tutor.subjects === 'string' 
                                ? tutor.subjects.split(',') 
                                : Array.isArray(tutor.subjects) ? tutor.subjects : []
                              ).length - 3} more
                            </Badge>
                          )}
                          {(!tutor.subjects || 
                            (typeof tutor.subjects === 'string' && !tutor.subjects.trim()) || 
                            (Array.isArray(tutor.subjects) && tutor.subjects.length === 0)) && (
                            <span className="text-xs text-muted-foreground pl-1">Contact for subject information</span>
                          )}
                        </div>
                      </div>
                      
                      {/* Location and stats - Always at bottom */}
                      <div className="mt-auto pt-2">
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mb-3">
                          <div className="flex items-center">
                            <MapPin className="h-3.5 w-3.5 mr-1 text-[#4ba896] shrink-0" strokeWidth={2} />
                            <span className="truncate">{tutorLocation}</span>
                          </div>
                          <Separator orientation="vertical" className="h-4 bg-[#c2d8d2]/50" />
                          <div className="flex items-center">
                            <GraduationCap className="h-3.5 w-3.5 mr-1 text-[#4b92a9] shrink-0" strokeWidth={2} />
                            <span>{reviewCount} {reviewCount === 1 ? 'review' : 'reviews'}</span>
                          </div>
                        </div>
                        
                        <Button asChild className="w-full shadow-md hover:shadow-lg bg-[#129490] hover:bg-[#126d94] transition-all group-hover:translate-y-[-1px]">
                          <Link href={`/tutors/${tutorId}`} className="flex items-center justify-center gap-1">
                            View Profile
                            <ArrowRight className="h-3.5 w-3.5 ml-1 group-hover:translate-x-0.5 transition-transform" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
} 