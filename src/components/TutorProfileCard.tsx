import { Star, MapPin } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { TutorProfile, Review } from "@/types/supabaseTypes";
import { getFullName, getInitials, getAvatarUrl } from "@/utils/nameUtils";
import { Skeleton } from "@/components/ui/skeleton";
import ReactCountryFlag from "react-country-flag";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TutorProfileCardProps {
  tutor: TutorProfile;
  reviews?: Review[];
  loading?: boolean;
}

// Helper function to get country code
const getCountryCode = (country: string | null | undefined): string | null => {
  if (!country) return null;
  
  // Clean up the country string
  const cleanCountry = country.trim().toLowerCase();
  
  // Map of common country names to ISO codes
  const countryMap: Record<string, string> = {
    'uk': 'GB',
    'united kingdom': 'GB',
    'england': 'GB',
    'scotland': 'GB',
    'wales': 'GB',
    'northern ireland': 'GB',
    'usa': 'US',
    'united states': 'US',
    'united states of america': 'US',
    'canada': 'CA',
    'australia': 'AU',
    'new zealand': 'NZ',
    'singapore': 'SG',
    'malaysia': 'MY',
    'hong kong': 'HK',
    'china': 'CN',
    'japan': 'JP',
    'south korea': 'KR',
    'korea': 'KR',
    'india': 'IN',
    'france': 'FR',
    'germany': 'DE',
    'italy': 'IT',
    'spain': 'ES',
    'netherlands': 'NL',
    'belgium': 'BE',
    'switzerland': 'CH',
    'sweden': 'SE',
    'norway': 'NO',
    'denmark': 'DK',
    'finland': 'FI',
    'ireland': 'IE',
    'portugal': 'PT',
    'greece': 'GR',
    'turkey': 'TR',
  };
  
  // Check for exact matches
  if (countryMap[cleanCountry]) {
    return countryMap[cleanCountry];
  }
  
  // Check if the country contains a country name
  for (const [countryName, code] of Object.entries(countryMap)) {
    if (cleanCountry.includes(countryName)) {
      return code;
    }
  }
  
  // If no match found, return null
  return null;
};

const TutorProfileCard = ({ tutor, reviews = [], loading = false }: TutorProfileCardProps) => {
  if (loading) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <Skeleton className="h-14 w-14 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </div>
            <div className="flex justify-between items-center mt-4">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-9 w-20" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const fullName = getFullName(tutor);
  const avatarUrl = getAvatarUrl(tutor);
  const initials = getInitials(tutor);
  
  // Calculate average rating
  const averageRating = reviews && reviews.length > 0
    ? reviews.reduce((sum, review) => sum + (review.rating || 0), 0) / reviews.length
    : 0;
    
  // Format subjects for display
  let subjects: string[] = [];
  if (typeof tutor.subjects === 'string') {
    if (tutor.subjects.includes(',')) {
      subjects = tutor.subjects.split(',').map(s => s.trim());
    } else {
      subjects = [tutor.subjects];
    }
  } else if (Array.isArray(tutor.subjects)) {
    subjects = tutor.subjects;
  }
  
  // Get country codes for flags
  const countryCodes = tutor.country && Array.isArray(tutor.country) ? 
                       tutor.country.map(c => getCountryCode(c)).filter(Boolean) as string[] : [];

  return (
    <Card className="overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 border-border/60">
      <CardContent className="p-0">
        <div className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <Avatar className="h-14 w-14 border border-border/40 ring-2 ring-transparent hover:ring-[#128ca0]/20 transition-all duration-200">
              <AvatarImage src={avatarUrl || "/placeholder.svg"} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">{fullName}</h3>
                
                {/* Country flags */}
                {countryCodes.length > 0 && (
                  <div className="flex gap-1">
                    {countryCodes.map((code, index) => (
                      <TooltipProvider key={`country-${index}-${code}`}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="rounded-sm overflow-hidden">
                              <ReactCountryFlag
                                countryCode={code}
                                svg
                                style={{ width: '16px', height: '16px' }}
                                title={tutor.country && Array.isArray(tutor.country) ? tutor.country[index] : ""}
                              />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            {tutor.country && Array.isArray(tutor.country) ? tutor.country[index] : ""}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-muted-foreground text-sm">
                {tutor.current_education || "Tutor"}
              </p>
            </div>
          </div>
          
          <p className="text-sm mb-4 line-clamp-3 leading-relaxed text-foreground/80">
            {tutor.description || "No description provided"}
          </p>
          
          <div className="flex flex-wrap gap-1 mb-4">
            {subjects && subjects.length > 0 ? (
              subjects.slice(0, 3).map((subject, index) => (
                <Badge key={index} variant="outline" className="bg-primary/5">
                  {subject}
                </Badge>
              ))
            ) : (
              <Badge variant="outline" className="bg-primary/5">
                General Tutoring
              </Badge>
            )}
            
            {subjects && subjects.length > 3 && (
              <Badge variant="outline" className="bg-primary/5">
                +{subjects.length - 3} more
              </Badge>
            )}
          </div>
          
          <div className="flex justify-between items-center">
            {/* Star rating display commented out due to insufficient data */}
            {/*
            <div className="flex items-center">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-4 w-4 ${
                      star <= averageRating
                        ? "text-amber-500 fill-amber-500"
                        : "text-muted-foreground/30"
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm ml-2">
                {averageRating > 0
                  ? `${averageRating.toFixed(1)} (${reviews.length})`
                  : "No reviews yet"}
              </span>
            </div>
            */}
            <div className="flex-grow"></div> {/* Spacer to maintain layout */}
            <Link href={`/tutors/${tutor.search_id || tutor.id}`} className="text-primary font-medium text-sm hover:underline">
              View Profile
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TutorProfileCard;
