"use client";

import { useState } from "react";
import Link from "next/link";
import { MOCK_USERS } from "@/context/AuthContext";
import { useSessions } from "@/context/SessionContext";
import { useApiTutorProfiles } from "@/hooks/useApiClient";
import { 
  Search,
  Filter,
  Star,
  MapPin,
  CheckCircle,
  ArrowUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Loader } from "lucide-react";

// Use for fallback when Supabase data is not available
const MOCK_TUTORS = MOCK_USERS.filter(user => user.role === "tutor");

// List of available subjects across all tutors (will be populated dynamically)
const DEFAULT_SUBJECTS = [
  "Mathematics", 
  "Physics", 
  "Chemistry", 
  "Biology", 
  "English", 
  "History", 
  "Computer Science"
];

interface ReviewStarsProps {
  rating: number;
}

const ReviewStars = ({ rating }: ReviewStarsProps) => {
  return (
    <div className="flex items-center">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            i < Math.floor(rating) 
              ? 'text-amber-500 fill-amber-500' 
              : 'text-muted-foreground'
          }`}
        />
      ))}
      <span className="ml-2 text-sm font-medium">{rating.toFixed(1)}</span>
    </div>
  );
};

export default function TutorsPage() {
  const { reviewHistory } = useSessions();
  const { tutors, loading: tutorsLoading, error: tutorsError } = useApiTutorProfiles();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<"rating" | "name" | "popularity">("rating");
  
  // Extract all unique subjects from tutor profiles
  const allSubjects = tutors.length > 0 
    ? Array.from(new Set(tutors.flatMap(tutor => 
        tutor.subjects ? tutor.subjects.split(',').map(s => s.trim()) : []
      )))
    : DEFAULT_SUBJECTS;

  // Determine which tutors to display based on data availability
  const displayTutors = tutorsLoading 
    ? [] 
    : tutorsError || tutors.length === 0 
      ? MOCK_TUTORS 
      : tutors;
  
  // Filter tutors based on search term and selected subjects
  const filteredTutors = displayTutors.filter(tutor => {
    // For Supabase tutors
    if ('first_name' in tutor) {
      const fullName = `${tutor.first_name || ''} ${tutor.last_name || ''}`.toLowerCase();
      const tutorSubjects = tutor.subjects?.split(',').map(s => s.trim()) || [];
      
      const matchesSearch = 
        fullName.includes(searchTerm.toLowerCase()) || 
        (tutor.description && tutor.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        tutorSubjects.some(subject => subject.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesSubjects = selectedSubjects.length === 0 || 
        tutorSubjects.some(subject => selectedSubjects.includes(subject));
      
      return matchesSearch && matchesSubjects;
    } 
    // For mock tutors
    else {
      const mockTutor = tutor as typeof MOCK_USERS[0];
      const matchesSearch = mockTutor.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           (mockTutor.bio && mockTutor.bio.toLowerCase().includes(searchTerm.toLowerCase())) ||
                           (mockTutor.subjects && Array.isArray(mockTutor.subjects) && 
                             mockTutor.subjects.some(subject => 
                               subject.toLowerCase().includes(searchTerm.toLowerCase())
                             ));
      
      const matchesSubjects = selectedSubjects.length === 0 || 
                             (mockTutor.subjects && Array.isArray(mockTutor.subjects) && 
                               mockTutor.subjects.some(subject => 
                                 selectedSubjects.includes(subject)
                               ));
      
      return matchesSearch && matchesSubjects;
    }
  });

  // Sort tutors based on selected sort order
  const sortedTutors = [...filteredTutors].sort((a, b) => {
    if (sortOrder === "rating") {
      // For Supabase tutors - use review data to calculate average rating
      if ('first_name' in a && 'first_name' in b) {
        const aReviews = reviewHistory.filter(review => review.tutorId === a.id);
        const bReviews = reviewHistory.filter(review => review.tutorId === b.id);
        const aRating = aReviews.length > 0 ? aReviews.reduce((sum, r) => sum + r.rating, 0) / aReviews.length : 4.5;
        const bRating = bReviews.length > 0 ? bReviews.reduce((sum, r) => sum + r.rating, 0) / bReviews.length : 4.5;
        return bRating - aRating;
      } else {
        const aMock = a as typeof MOCK_USERS[0];
        const bMock = b as typeof MOCK_USERS[0];
        return ((bMock.rating || 0) - (aMock.rating || 0));
      }
    } else if (sortOrder === "name") {
      if ('first_name' in a && 'first_name' in b) {
        return `${a.first_name || ''} ${a.last_name || ''}`.localeCompare(`${b.first_name || ''} ${b.last_name || ''}`);
      } else {
        const aMock = a as typeof MOCK_USERS[0];
        const bMock = b as typeof MOCK_USERS[0];
        return aMock.name.localeCompare(bMock.name);
      }
    } else {
      // Sort by popularity (number of reviews)
      const aReviews = reviewHistory.filter(review => review.tutorId === a.id).length;
      const bReviews = reviewHistory.filter(review => review.tutorId === b.id).length;
      return bReviews - aReviews;
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
      <div className="container min-h-screen flex items-center justify-center mx-auto px-4 md:px-6 w-full">
        <div className="text-center">
          <Loader className="h-10 w-10 animate-spin mx-auto mb-4 text-primary" />
          <h3 className="text-xl font-semibold">Loading tutors...</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full pt-16">
      {/* Hero Section */}
      <section className="hero-gradient py-12 w-full">
        <div className="container w-full mx-auto px-4 md:px-6 max-w-screen-xl">
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
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12 w-full">
        <div className="container w-full mx-auto px-4 md:px-6 max-w-screen-xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button variant="outline" className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filter by Subject
              </Button>
            </div>
            <div className="flex items-center gap-4">
              <p className="text-sm text-muted-foreground hidden md:block">
                Showing {sortedTutors.length} of {sortedTutors.length} tutors
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {sortedTutors.map((tutor) => {
                // Handle both Supabase and mock tutor data structures
                const isMockTutor = !('first_name' in tutor);
                const tutorId = tutor.id;
                const tutorName = isMockTutor 
                  ? (tutor as typeof MOCK_USERS[0]).name 
                  : `${tutor.first_name || ''} ${tutor.last_name || ''}`;
                const tutorBio = isMockTutor 
                  ? (tutor as typeof MOCK_USERS[0]).bio
                  : tutor.description || '';
                const tutorLocation = isMockTutor
                  ? ((tutor as any).location || 'Online')
                  : ((tutor as any).location || 'Online');
                const tutorImage = isMockTutor
                  ? ((tutor as any).profilePic)
                  : ((tutor as any).avatar_url || '/placeholder.svg');
                
                // Calculate rating
                const reviews = reviewHistory.filter(review => review.tutorId === tutorId);
                const defaultRating = isMockTutor 
                  ? (tutor as typeof MOCK_USERS[0]).rating || 4.5 
                  : 4.5;
                const rating = reviews.length > 0 
                  ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
                  : defaultRating;
                  
                return (
                  <div key={tutorId} className="bg-white border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    <div className="hero-gradient h-24"></div>
                    <div className="p-6 relative">
                      <Avatar className="h-20 w-20 border-4 border-white absolute -top-10 left-6 shadow-sm">
                        <AvatarImage src={tutorImage} />
                        <AvatarFallback>{tutorName.charAt(0)}</AvatarFallback>
                      </Avatar>
                      
                      <div className="mt-12">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xl font-semibold">{tutorName}</h3>
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < Math.floor(rating) 
                                    ? 'text-amber-500 fill-amber-500' 
                                    : 'text-muted-foreground'
                                }`}
                              />
                            ))}
                            <span className="ml-1 text-sm font-medium">{rating.toFixed(1)}</span>
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
                          <span>{reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}</span>
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
        </div>
      </section>
    </div>
  );
} 