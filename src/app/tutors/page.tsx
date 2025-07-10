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
import Image from "next/image";

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
  spm?: string[] | string | null;
  ib?: string[] | null;
  search_id: string;
  service_costs?: Record<string, number> | null;
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
    const parts = url.split('/');
    return parts.slice(Math.max(0, parts.length - 2)).join('/'); // Return last 2 parts to include potential user ID folder
  }
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
  
  // Exact match or substring match is ideal
  if (textLower.includes(queryLower)) return true;
  
  // Split the query into words for multi-word searching
  const queryWords = queryLower.split(/\s+/).filter(word => word.length > 0);
  
  // Special case for university searches
  if (queryWords.length >= 2 && 
     (queryLower.includes('university') || 
      queryLower.includes('college') || 
      queryLower.includes('institute'))) {
    // Check if all significant words in the query are in the text
    // This helps with searches like "Columbia University" matching "University of Columbia"
    const significantWords = queryWords.filter(word => 
      word.length > 2 && 
      !['of', 'the', 'and', 'in', 'at', 'for'].includes(word)
    );
    
    if (significantWords.length > 0) {
      const allSignificantWordsMatch = significantWords.every(word => 
        textLower.includes(word)
      );
      
      if (allSignificantWordsMatch) {
        return true;
      }
    }
  }
  
  // If this is a multi-word query, try matching all words in any order
  if (queryWords.length > 1) {
    const allWordsMatch = queryWords.every(word => {
      // Skip very short words (prepositions, articles, etc.)
      if (word.length <= 2) return true;
      return textLower.includes(word);
    });
    if (allWordsMatch) return true;
  }
  
  // Special handling for name searches - be more lenient with name matching
  // Names are typically shorter and may be searched partially
  if ((textLower.length < 20 && textLower.includes(" ")) || 
      (queryLower.length < 20 && queryLower.includes(" "))) {
    
    // Check if this might be a name (short text with a space)
    const textWords = textLower.split(/\s+/);
    const queryWords = queryLower.split(/\s+/);
    
    // For each word in the query, see if it matches the start of any name part
    for (const queryWord of queryWords) {
      if (queryWord.length <= 1) continue; // Skip very short words
      
      // Match against each part of the text (first name, last name, etc.)
      for (const textWord of textWords) {
        // More aggressive matching for names - match if query word starts with first 2+ chars
        if (queryWord.length >= 3 && textWord.startsWith(queryWord.substring(0, 3))) {
          return true;
        }
        
        // Or if text word starts with query word
        if (textWord.startsWith(queryWord)) {
          return true;
        }
      }
    }
  }
  
  // Handle single-word name search (e.g., searching just "John" or "Smith")
  if (queryLower.length >= 2 && !queryLower.includes(" ") && textLower.includes(" ")) {
    // This might be a single name searching against a full name
    const textWords = textLower.split(/\s+/);
    
    // Check if query matches the beginning of any name part
    for (const textWord of textWords) {
      if (textWord.startsWith(queryLower)) return true;
      
      // More lenient match for longer names and queries
      if (queryLower.length >= 4 && textWord.length >= 4) {
        if (textWord.startsWith(queryLower.substring(0, 3))) return true;
      }
    }
  }
  
  // For GCSE searches, handle special format
  if (queryLower.includes('gcse') || textLower.includes('gcse')) {
    // If search is for "GCSE Math" and text has "Math" or vice versa
    if (queryLower.includes('gcse') && !textLower.includes('gcse')) {
      // Try to match the subject after "GCSE"
      const subjectSearch = queryLower.replace(/gcse\s*/i, '').trim();
      if (subjectSearch && textLower.includes(subjectSearch)) return true;
    } else if (!queryLower.includes('gcse') && textLower.includes('gcse')) {
      // Text is GCSE but search doesn't specify it - try to match just the subject
      const subjectText = textLower.replace(/gcse\s*:?\s*/i, '').trim();
      if (subjectText && queryLower.includes(subjectText)) return true;
    }
  }
  
  // Similar handling for A-levels
  if (queryLower.includes('a-level') || queryLower.includes('alevel') || 
      textLower.includes('a-level') || textLower.includes('alevel')) {
    // Normalize "a-level" and "alevel"
    const normalizedQuery = queryLower.replace(/a-level/g, 'alevel');
    const normalizedText = textLower.replace(/a-level/g, 'alevel');
    
    if (normalizedQuery.includes('alevel') && !normalizedText.includes('alevel')) {
      const subjectSearch = normalizedQuery.replace(/alevel\s*/i, '').trim();
      if (subjectSearch && normalizedText.includes(subjectSearch)) return true;
    } else if (!normalizedQuery.includes('alevel') && normalizedText.includes('alevel')) {
      const subjectText = normalizedText.replace(/alevel\s*:?\s*/i, '').trim();
      if (subjectText && normalizedQuery.includes(subjectText)) return true;
    }
  }
  
  // Handle acronyms and abbreviations
  // Convert both to just initials for matching
  const queryInitials = queryLower.split(/\s+/).map(word => word[0] || '').join('');
  const textWords = textLower.split(/\s+/);
  const textInitials = textWords.map(word => word[0] || '').join('');
  
  // If query is short enough to be an acronym (≤ 5 chars) and matches text initials
  if (queryLower.length <= 5 && queryLower.length > 1 && textInitials.includes(queryLower)) {
    return true;
  }
  
  // If text contains an acronym that matches the query initials
  if (queryInitials.length > 1 && textLower.includes(queryInitials)) {
    return true;
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
    for (const textWord of textWords) {
      // More aggressive prefix matching - match first 3 chars or 60% of the word, whichever is greater
      const prefixLength = Math.max(3, Math.floor(word.length * 0.6));
      if (word.length >= 4 && textWord.startsWith(word.substring(0, prefixLength))) return true;
      
      // Standard prefix matching for shorter words
      if (word.length < 4 && textWord.startsWith(word)) return true;
    }
    
    // 3. Check for suffix match (end of words) - useful for things like "ing" forms
    for (const textWord of textWords) {
      if (textWord.length >= 5 && word.length >= 4) {
        // Only check suffix for longer words to avoid false positives
        const suffixLength = Math.floor(word.length * 0.7);
        if (textWord.endsWith(word.substring(word.length - suffixLength))) return true;
      }
    }
    
    // 4. Improved string similarity with higher threshold for longer words
    for (const textWord of textWords) {
      if (textWord.length > 3 && word.length > 3) {
        const similarityThreshold = word.length >= 6 ? 0.8 : 0.7;
        if (calculateSimilarity(textWord, word) > similarityThreshold) return true;
      }
    }
  }
  
  return false;
}

// Helper function to calculate string similarity (0 to 1)
function calculateSimilarity(s1: string, s2: string): number {
  // If strings are very different in length, they're probably not similar
  if (Math.abs(s1.length - s2.length) > Math.min(s1.length, s2.length) * 0.5) return 0;
  
  const shorter = s1.length < s2.length ? s1 : s2;
  const longer = s1.length >= s2.length ? s1 : s2;
  
  // Count matching characters (position-independent)
  let matches = 0;
  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter[i])) matches++;
  }
  
  // Base similarity on character matches
  const baseSimilarity = matches / longer.length;
  
  // Bonus for matching prefixes (start of the word)
  let prefixBonus = 0;
  const minLength = Math.min(s1.length, s2.length);
  let prefixMatchLength = 0;
  
  for (let i = 0; i < minLength; i++) {
    if (s1[i] === s2[i]) prefixMatchLength++;
    else break;
  }
  
  if (prefixMatchLength >= 2) {
    prefixBonus = (prefixMatchLength / minLength) * 0.2; // Up to 0.2 bonus for matching prefix
  }
  
  return Math.min(1, baseSimilarity + prefixBonus);
}

// New function to score search relevance
function scoreSearchRelevance(
  tutor: TutorProfile, 
  searchTerm: string,
  tutorFields: {
    fullName: string,
    universities: string[],
    subjects: string[],
    major: string | null | undefined,
    allSearchableText: string[]
  }
): number {
  if (!searchTerm || searchTerm.length === 0) return 1; // Default score for no search
  
  const searchTermLower = searchTerm.toLowerCase();
  const searchWords = searchTermLower.split(/\s+/).filter(word => word.length > 0);
  
  // Base score starts at 0
  let score = 0;
  
  // 1. Exact match of full search term is highest priority
  if (tutorFields.fullName.toLowerCase().includes(searchTermLower)) {
    score += 100; // Very high score for exact name match
  }
  
  // Check for exact match in university names
  const hasExactUniversityMatch = tutorFields.universities.some(univ => 
    univ.toLowerCase().includes(searchTermLower)
  );
  if (hasExactUniversityMatch) {
    score += 80; // High score for university match
  }
  
  // Handle university abbreviations and variations
  if (searchTermLower.includes('university') || 
      searchTermLower.includes('college') || 
      searchTermLower.includes('institute')) {
    
    // Common abbreviations and alternative formats
    const universityAbbreviations: Record<string, string[]> = {
      'ucla': ['university of california los angeles', 'university of california, los angeles'],
      'uc berkeley': ['university of california berkeley', 'university of california, berkeley'],
      'uc davis': ['university of california davis', 'university of california, davis'],
      'columbia': ['columbia university'],
      'columbia university': ['columbia'],
      'upenn': ['university of pennsylvania', 'penn'],
      'university of pennsylvania': ['upenn', 'penn'],
      'mit': ['massachusetts institute of technology'],
      'caltech': ['california institute of technology'],
      'nyu': ['new york university'],
      'new york university': ['nyu']
    };
    
    // Check if search term is a known abbreviation or has known variations
    for (const [abbr, variations] of Object.entries(universityAbbreviations)) {
      if (searchTermLower.includes(abbr)) {
        // Check if any tutor university matches the variations
        const matchesVariation = tutorFields.universities.some(univ => 
          variations.some(variation => univ.toLowerCase().includes(variation))
        );
        
        if (matchesVariation) {
          score += 75; // Almost as good as an exact match
        }
      }
      
      // Check the reverse - if the tutor has an abbreviation but user searched for the full name
      variations.forEach(variation => {
        if (searchTermLower.includes(variation)) {
          const matchesAbbr = tutorFields.universities.some(univ => 
            univ.toLowerCase().includes(abbr)
          );
          
          if (matchesAbbr) {
            score += 75; // Almost as good as an exact match
          }
        }
      });
    }
    
    // Special case for multi-word university names
    if (searchWords.length >= 2) {
      // Check if all significant words in the search appear in any university name
      const significantWords = searchWords.filter(word => 
        word.length > 2 && 
        !['of', 'the', 'and', 'in', 'at', 'for'].includes(word)
      );
      
      if (significantWords.length > 0) {
        tutorFields.universities.forEach(univ => {
          const univLower = univ.toLowerCase();
          let matchedWords = 0;
          
          significantWords.forEach(word => {
            if (univLower.includes(word)) {
              matchedWords++;
            }
          });
          
          // Add score based on percentage of significant words matched
          const matchPercentage = matchedWords / significantWords.length;
          if (matchPercentage > 0) {
            score += Math.round(matchPercentage * 60); // Up to 60 points
          }
        });
      }
    }
  }
  
  // Check for exact match in subjects
  const hasExactSubjectMatch = tutorFields.subjects.some(subject => 
    subject.toLowerCase().includes(searchTermLower)
  );
  if (hasExactSubjectMatch) {
    score += 60; // Good score for subject match
  }
  
  // Check for exact match in major
  if (tutorFields.major && tutorFields.major.toLowerCase().includes(searchTermLower)) {
    score += 50; // Decent score for major match
  }
  
  // 2. For multi-word searches, prioritize tutors matching all words
  if (searchWords.length > 1) {
    // Count how many search words match any field
    let matchedWordCount = 0;
    
    for (const word of searchWords) {
      if (word.length <= 2) continue; // Skip very short words
      
      const wordMatches = tutorFields.allSearchableText.some(text => 
        text.toLowerCase().includes(word)
      );
      
      if (wordMatches) {
        matchedWordCount++;
      }
    }
    
    // Calculate percentage of words matched
    const matchPercentage = matchedWordCount / searchWords.length;
    
    // Add score based on percentage of words matched (up to 40 points)
    score += Math.round(matchPercentage * 40);
    
    // Bonus for matching all words
    if (matchPercentage === 1) {
      score += 20;
    }
    
    // Special bonus for university searches with multiple words (e.g., "Columbia University")
    if (searchWords.length >= 2 && searchTermLower.includes('university')) {
      const universityMatches = tutorFields.universities.some(univ => {
        const univLower = univ.toLowerCase();
        return searchWords.every(word => {
          if (word.length <= 2) return true; // Skip short words
          return univLower.includes(word);
        });
      });
      
      if (universityMatches) {
        score += 30; // Bonus for matching all parts of a university name
      }
    }
  }
  
  // 3. Prioritize name matches
  const nameWords = tutorFields.fullName.toLowerCase().split(/\s+/);
  for (const word of searchWords) {
    if (word.length <= 2) continue; // Skip very short words
    
    // Check if any name part starts with this search word
    const nameStartMatch = nameWords.some(nameWord => 
      nameWord.startsWith(word)
    );
    
    if (nameStartMatch) {
      score += 15; // Bonus for matching start of name
    }
  }
  
  return score;
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

// Empty placeholder component
const ReviewStars = ({ rating }: ReviewStarsProps) => {
  return null; // Return nothing
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

// Helper function to extract searchable text from array or string fields
function extractSearchableText(field: string | string[] | null | undefined): string[] {
  if (!field) return [];
  
  if (typeof field === 'string') {
    return field.trim().length > 0 ? [field.trim()] : [];
  }
  
  if (Array.isArray(field)) {
    return field
      .filter((item: any) => typeof item === 'string' && item.trim().length > 0)
      .map((item: string) => item.trim());
  }
  
  return [];
}

// Function to get the university logo path based on university name
const getUniversityLogo = (universityName: string | null | undefined): string | null => {
  if (!universityName) return null;
  
  // Normalize the university name for comparison
  const normalizedName = universityName.toLowerCase().trim();
  
  // Direct check for UCLA
  if (universityName.includes('UCLA') || 
      normalizedName.includes('university of california, los angeles') ||
      normalizedName.includes('university of california los angeles')) {
    return '/Unilogos/UCLA Logo.png';
  }
  
  // Map of university name patterns to their logo files
  const universityLogoMap: Record<string, string> = {
    'oxford': '/Unilogos/Oxford Logo.png',
    'cambridge': '/Unilogos/Cambridge Logo.png',
    'harvard': '/Unilogos/Harvard Logo.png',
    'yale': '/Unilogos/Yale Logo.png',
    'columbia': '/Unilogos/Columbia Logo.png',
    'cornell': '/Unilogos/Cornell Logo.png',
    'brown': '/Unilogos/Brown Logo.png',
    'upenn': '/Unilogos/UPenn Logo.png',
    'penn': '/Unilogos/UPenn Logo.png',
    'university of pennsylvania': '/Unilogos/UPenn Logo.png',
    'princeton': '/Unilogos/Princeton Logo.png',
    'uchicago': '/Unilogos/UChicago Logo.png',
    'chicago': '/Unilogos/UChicago Logo.png',
    'university of chicago': '/Unilogos/UChicago Logo.png',
    'berkeley': '/Unilogos/UCBerkeley Logo.png',
    'uc berkeley': '/Unilogos/UCBerkeley Logo.png',
    'university of california, berkeley': '/Unilogos/UCBerkeley Logo.png',
    'university of california berkeley': '/Unilogos/UCBerkeley Logo.png',
    'davis': '/Unilogos/UCDavis Logo.png',
    'uc davis': '/Unilogos/UCDavis Logo.png',
    'university of california, davis': '/Unilogos/UCDavis Logo.png',
    'university of california davis': '/Unilogos/UCDavis Logo.png',
    'ucla': '/Unilogos/UCLA Logo.png',
    'university of california, los angeles': '/Unilogos/UCLA Logo.png',
    'university of california los angeles': '/Unilogos/UCLA Logo.png',
    'University of California, Los Angeles': '/Unilogos/UCLA Logo.png',
    'los angeles': '/Unilogos/UCLA Logo.png',
    'duke': '/Unilogos/Duke Logo.png',
    'duke university': '/Unilogos/Duke Logo.png',
    'northwestern': '/Unilogos/Northwestern Logo.png',
    'northwestern university': '/Unilogos/Northwestern Logo.png',
    'michigan': '/Unilogos/Michigan Logo.png',
    'university of michigan': '/Unilogos/Michigan Logo.png',
    'umich': '/Unilogos/Michigan Logo.png',
    'washington': '/Unilogos/UWashington Logo.png',
    'university of washington': '/Unilogos/UWashington Logo.png',
    'uw': '/Unilogos/UWashington Logo.png',
    'usc': '/Unilogos/USC Logo.png',
    'university of southern california': '/Unilogos/USC Logo.png',
    'southern california': '/Unilogos/USC Logo.png',
    'mit': '/Unilogos/MIT Logo.png',
    'massachusetts institute of technology': '/Unilogos/MIT Logo.png',
    'nyu': '/Unilogos/NYU Logo.png',
    'new york university': '/Unilogos/NYU Logo.png',
    'imperial': '/Unilogos/Imperial Logo.png',
    'imperial college': '/Unilogos/Imperial Logo.png',
    'imperial college london': '/Unilogos/Imperial Logo.png',
    'lse': '/Unilogos/LSE Logo.png',
    'london school of economics': '/Unilogos/LSE Logo.png',
    'ucl': '/Unilogos/UCL Logo.png',
    'university college london': '/Unilogos/UCL Logo.png',
    'kings': '/Unilogos/KCL Logo.png',
    'kings college': '/Unilogos/KCL Logo.png',
    'kings college london': '/Unilogos/KCL Logo.png',
    'kcl': '/Unilogos/KCL Logo.png',
    'durham': '/Unilogos/Durham Logo.png',
    'durham university': '/Unilogos/Durham Logo.png',
    'warwick': '/Unilogos/Warwick Logo.png',
    'warwick university': '/Unilogos/Warwick Logo.png',
    'university of warwick': '/Unilogos/Warwick Logo.png',
    'caltech': '/Unilogos/Caltech Logo.png',
    'california institute of technology': '/Unilogos/Caltech Logo.png',
    'stanford': '/Unilogos/Stanford Logo.png',
    'stanford university': '/Unilogos/Stanford Logo.png'
  };
  
  // Special handling for UC schools
  if (normalizedName.includes('university of california')) {
    // Check for specific UC campus
    const ucCampuses = [
      { name: 'berkeley', logo: '/Unilogos/UCBerkeley Logo.png' },
      { name: 'davis', logo: '/Unilogos/UCDavis Logo.png' },
      { name: 'los angeles', logo: '/Unilogos/UCLA Logo.png' },
      // Add other UC campuses if logos are available
    ];
    
    for (const campus of ucCampuses) {
      if (normalizedName.includes(campus.name)) {
        return campus.logo;
      }
    }
  }
  
  // Find the matching university logo
  for (const [pattern, logoPath] of Object.entries(universityLogoMap)) {
    if (normalizedName.includes(pattern)) {
      return logoPath;
    }
  }
  
  // Implement additional fuzzy matching for UC schools
  // This is a fallback in case the specific format doesn't match
  if (normalizedName.includes('uc ') || normalizedName.includes('u.c.')) {
    if (normalizedName.includes('berk')) {
      return '/Unilogos/UCBerkeley Logo.png';
    }
    if (normalizedName.includes('dav')) {
      return '/Unilogos/UCDavis Logo.png';
    }
    if (normalizedName.includes('los angel')) {
      return '/Unilogos/UCLA Logo.png';
    }
  }
  
  return null;
};

// Function to extract the university name from current_education
const extractUniversityName = (education: string | string[] | null | undefined): string | null => {
  if (!education) return null;
  
  // If education is an array, use the first item
  const educationText = Array.isArray(education) ? education[0] : education;
  
  // Direct check for UCLA
  if (educationText.includes('UCLA') || 
      educationText.toLowerCase().includes('university of california, los angeles') ||
      educationText.toLowerCase().includes('university of california los angeles')) {
    return 'University of California, Los Angeles';
  }
  
  // Special handling for specific patterns
  if (educationText.includes('University of California')) {
    // Return the full UC name including campus
    // Updated regex to handle multi-word campus names like "Los Angeles"
    const matches = educationText.match(/University of California,?\s+(?:[A-Za-z]+\s*)+/i);
    if (matches && matches[0]) {
      return matches[0];
    }
  }
  
  // Common patterns to extract university names
  if (educationText.includes(' at ')) {
    const extracted = educationText.split(' at ')[1].trim();
    return extracted;
  }
  
  if (educationText.includes(', ')) {
    const extracted = educationText.split(', ')[0].trim();
    return extracted;
  }
  
  return educationText;
};

export default function TutorsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { reviewHistory } = useSessions();
  const [tutors, setTutors] = useState<TutorProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedSchools, setSelectedSchools] = useState<string[]>([]);
  const [selectedUniversities, setSelectedUniversities] = useState<string[]>([]);
  const [isSubjectFilterOpen, setIsSubjectFilterOpen] = useState(false);
  const [isSchoolFilterOpen, setIsSchoolFilterOpen] = useState(false);
  const [isUniversityFilterOpen, setIsUniversityFilterOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState<"rating" | "name" | "popularity">("rating");
  const [tutorRatings, setTutorRatings] = useState<{[key: string]: TutorRating}>({});
  const [loadingTutors, setLoadingTutors] = useState(true);
  const [loadingRatings, setLoadingRatings] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  // Check if user has premium access
  const hasPremiumAccess = user?.has_access || user?.role === 'tutor';
  
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
            setTutorRatings(parsed.data || {});
            setLoadingRatings(false);
            return;
          }
        } catch (err) {
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
        }
      }
      
      setTutorRatings(ratingsByTutor);
    } catch (err) {
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
              .filter((s: string) => s.length > 0)
              // Group subjects together
              .map((s: string) => {
                const sLower = s.toLowerCase();
                if (sLower.startsWith('uk admissions tests -')) {
                  return 'UK Admissions Tests';
                }
                if (sLower.startsWith('subject tutoring -')) {
                  return 'Subject Tutoring';
                }
                return s;
              }); 
          } else if (Array.isArray(tutor.subjects)) {
            return tutor.subjects
              .filter((s: any) => typeof s === 'string' && s.trim().length > 0)
              .map((s: string) => s.trim())
              // Group subjects together
              .map((s: string) => {
                const sLower = s.toLowerCase();
                if (sLower.startsWith('uk admissions tests -')) {
                  return 'UK Admissions Tests';
                }
                if (sLower.startsWith('subject tutoring -')) {
                  return 'Subject Tutoring';
                }
                return s;
              });
          }
        }
        return [];
      })))
    : DEFAULT_SUBJECTS;
    
  // Extract previous education (schools) and current education (universities) separately
  const allPreviousEducation = tutors.length > 0
    ? Array.from(new Set(tutors.flatMap((tutor: TutorProfile) => {
        const schools: string[] = [];
        
        // Add previous education institutions if available - with better handling
        if (tutor.previous_education && Array.isArray(tutor.previous_education)) {
          const validPreviousEducation = tutor.previous_education
            .filter((school: any) => typeof school === 'string' && school.trim().length > 0)
            .map((school: string) => school.trim());
          
          validPreviousEducation.forEach(school => {
            schools.push(school);
          });
        }
        
        return schools;
      })))
    : [];
    
  const allCurrentEducation = tutors.length > 0
    ? Array.from(new Set(tutors.flatMap((tutor: TutorProfile) => {
        const universities: string[] = [];
        
        // Add current education if available - with better handling
        if (tutor.current_education) {
          if (typeof tutor.current_education === 'string' && tutor.current_education.trim().length > 0) {
            universities.push(tutor.current_education.trim());
          } else if (Array.isArray(tutor.current_education)) {
            tutor.current_education.forEach((school: any) => {
              if (typeof school === 'string' && school.trim().length > 0) {
                universities.push(school.trim());
              }
            });
          }
        }
        
        return universities;
      })))
    : [];
  
  // If no education data is found, use appropriate fallbacks
  const filterSchools = allPreviousEducation;
  const filterUniversities = allCurrentEducation;

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
    
    // Extract previous education (schools) with improved validation
    const tutorSchools: string[] = [];
    
    // Previous education with better handling
    if (tutor.previous_education && Array.isArray(tutor.previous_education)) {
      const validPreviousEducation = tutor.previous_education
        .filter((school: any) => typeof school === 'string' && school.trim().length > 0)
        .map((school: string) => school.trim());
      
      tutorSchools.push(...validPreviousEducation);
    }
    
    // Extract current education (universities) with improved validation
    const tutorUniversities: string[] = [];
    
    // Current education - handle both string and array formats properly
    if (tutor.current_education) {
      if (typeof tutor.current_education === 'string' && tutor.current_education.trim().length > 0) {
        tutorUniversities.push(tutor.current_education.trim());
      } else if (Array.isArray(tutor.current_education)) {
        tutor.current_education.forEach((school: any) => {
          if (typeof school === 'string' && school.trim().length > 0) {
            tutorUniversities.push(school.trim());
          }
        });
      }
    }
    
    // Extract extracurricular activities
    const tutorExtracurriculars: string[] = extractSearchableText(tutor.extracurriculars);
    
    // For search purposes only - collect all education-related information
    const tutorEducation: string[] = [...tutorSchools, ...tutorUniversities];
    
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
    }
    
    // Add SPM to education-related fields for search
    if (tutor.spm) {
      if (Array.isArray(tutor.spm)) {
        tutor.spm.forEach(subject => {
          if (typeof subject === 'string' && subject.trim().length > 0) {
            tutorEducation.push(subject.trim());
          }
        });
      } else if (typeof tutor.spm === 'string' && tutor.spm.trim().length > 0) {
        tutorEducation.push(tutor.spm.trim());
      }
    }
    
    // Add IB to education-related fields for search
    if (tutor.ib && Array.isArray(tutor.ib)) {
      tutor.ib.forEach(subject => {
        if (typeof subject === 'string' && subject.trim().length > 0) {
          tutorEducation.push(subject.trim());
        }
      });
    }
    
    // Collect all searchable keywords (including description for general search)
    const searchableKeywords = [
      fullName,
      // Add first and last name individually for better search matching
      ...(tutor.first_name ? [tutor.first_name.trim()] : []),
      ...(tutor.last_name ? [tutor.last_name.trim()] : []),
      ...tutorSubjects,
      ...tutorEducation,
      ...tutorExtracurriculars,
      tutor.location || '',
      tutor.description || ''
    ].filter(Boolean).filter(keyword => typeof keyword === 'string' && keyword.trim().length > 0);
    
    // For better search, add concatenated versions of important fields
    if (tutor.major && tutor.current_education) {
      // Add "Major at University" format for better searching
      const majorText = typeof tutor.major === 'string' ? tutor.major.trim() : '';
      
      if (majorText) {
        if (typeof tutor.current_education === 'string') {
          searchableKeywords.push(`${majorText} at ${tutor.current_education.trim()}`);
        } else if (Array.isArray(tutor.current_education)) {
          tutor.current_education.forEach(univ => {
            if (typeof univ === 'string' && univ.trim()) {
              searchableKeywords.push(`${majorText} at ${univ.trim()}`);
            }
          });
        }
      }
    }
    
    // Check if tutor teaches any of the selected subjects
    const matchesSubjects = selectedSubjects.length === 0 || 
      selectedSubjects.every(subject => {
        // Special handling for grouped subjects
        if (subject === 'UK Admissions Tests') {
          return tutorSubjects.some(tutorSubject => 
            tutorSubject.toLowerCase().startsWith('uk admissions tests -')
          );
        }
        if (subject === 'Subject Tutoring') {
          return tutorSubjects.some(tutorSubject => 
            tutorSubject.toLowerCase().startsWith('subject tutoring -')
          );
        }
        return tutorSubjects.includes(subject);
      });
      
    // Check if tutor is associated with any of the selected schools (previous education)
    const matchesSchools = selectedSchools.length === 0 ||
      tutorSchools.some(school => selectedSchools.includes(school));
      
    // Check if tutor is associated with any of the selected universities (current education)
    const matchesUniversities = selectedUniversities.length === 0 ||
      tutorUniversities.some(university => selectedUniversities.includes(university));
    
    // Check if any searchable field matches the search term using fuzzy search
    const matchesSearch = searchTerm.length === 0 || 
      searchableKeywords.some(keyword => fuzzySearch(keyword, searchTerm));
    
    // Store tutor fields for scoring
    if (matchesSearch && matchesSubjects && matchesSchools && matchesUniversities) {
      // Attach search fields to tutor for later scoring
      (tutor as any)._searchFields = {
        fullName,
        universities: tutorUniversities,
        subjects: tutorSubjects,
        major: tutor.major,
        allSearchableText: searchableKeywords
      };
      
      // Pre-calculate search score
      if (searchTerm.length > 0) {
        (tutor as any)._searchScore = scoreSearchRelevance(
          tutor, 
          searchTerm, 
          (tutor as any)._searchFields
        );
      }
    }
    
    return matchesSearch && matchesSubjects && matchesSchools && matchesUniversities;
  });

  // Sort tutors based on selected sort order or search relevance
  const sortedTutors = [...filteredTutors].sort((a: TutorProfile, b: TutorProfile) => {
    // If there's a search term, prioritize by search relevance score
    if (searchTerm.length > 0) {
      const aScore = (a as any)._searchScore || 0;
      const bScore = (b as any)._searchScore || 0;
      
      // If scores are different, sort by score
      if (aScore !== bScore) {
        return bScore - aScore; // Higher score first
      }
      
      // If scores are equal, use the selected sort order as a tiebreaker
    }
    
    // Fall back to the selected sort order
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
    
    // Validate and sanitize the search input but preserve spaces
    try {
      // Only remove dangerous characters, but keep spaces
      const sanitized = input
        .replace(/<[^>]*>/g, '')  // Remove HTML tags
        .replace(/[;'"\\]/g, '');  // Remove special characters that could be used for injection
      
      // Limit length
      if (sanitized.length > 100) {
        setSearchTerm(sanitized.substring(0, 100));
        toast({
          variant: "destructive",
          title: "Search error",
          description: "Search term is too long"
        });
      } else {
        setSearchTerm(sanitized);
      }
    } catch (error) {
      // If there's an error, just set the raw input
      setSearchTerm(input);
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

  const toggleUniversity = (university: string) => {
    // Sanitize the university value
    const sanitizedUniversity = sanitizeInput(university);
    
    setSelectedUniversities(prev => 
      prev.includes(sanitizedUniversity) 
        ? prev.filter(u => u !== sanitizedUniversity) 
        : [...prev, sanitizedUniversity]
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
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#c7e4e3]/30 via-background/95 to-[#c2d8d2]/20">
          <div className="absolute top-20 right-[20%] w-72 h-72 bg-[#84b4cc]/10 rounded-full blur-3xl opacity-70 animate-pulse" style={{animationDuration: '8s'}}></div>
          <div className="absolute bottom-10 left-[10%] w-80 h-80 bg-[#84b7bd]/10 rounded-full blur-3xl opacity-60 animate-pulse" style={{animationDuration: '12s'}}></div>
        </div>
        <div className="container relative z-10 mx-auto px-4 md:px-6 max-w-screen-xl">
        <div className="max-w-3xl mx-auto text-center">
            
            <h1 className="text-4xl font-bold tracking-tight mb-4 md:text-5xl">
              Find Your Perfect <span className="text-[#128ca0]">Tutor</span>
            </h1>
      
          {hasPremiumAccess && (
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
               Browse our network of expert tutors and find the right match for your learning needs.
            </p>
          )}

          {!hasPremiumAccess && (
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
               Browse our network of expert tutors and find the right match for your learning needs. Unlock access to our website to view tutors' full profiles and book sessions.
          </p>
          )}
          
            {/* Search Bar with improved styling */}
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
            <Input
                className="pl-10 h-12 bg-background/80 backdrop-blur-sm border-[#84b4cc]/30 shadow-md focus-visible:border-[#3e5461]/30 focus-visible:ring-1 focus-visible:ring-[#3e5461]/20 transition-all"
              placeholder="Search by name, university, subject, or keyword"
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
                <Button variant="outline" className="flex items-center gap-2 shadow-sm border-[#84b4cc]/40 hover:bg-[#c7e4e3]/10 transition-colors">
                  <Filter className="h-4 w-4 text-[#3e5461]" strokeWidth={1.5} />
                  Services {selectedSubjects.length > 0 && (
                    <Badge variant="secondary" className="ml-1 bg-[#3e5461]/10 text-[#128ca0] border-none">
                      {selectedSubjects.length}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 max-h-[60vh] overflow-auto">
                <div className="flex items-center justify-between mb-2">
                <DropdownMenuLabel>Filter by Service</DropdownMenuLabel>
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
                      Clear Services
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
                  <DropdownMenuLabel>Previous Education</DropdownMenuLabel>
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
            
              {/* University filter dropdown */}
              <DropdownMenu open={isUniversityFilterOpen} onOpenChange={setIsUniversityFilterOpen}>
                <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2 shadow-sm border-[#84b7bd]/40 hover:bg-[#c2d8d2]/10 transition-colors">
                  <GraduationCap className="h-4 w-4 text-[#4b92a9]" strokeWidth={1.5} />
                  Universities {selectedUniversities.length > 0 && (
                    <Badge variant="secondary" className="ml-1 bg-[#4b92a9]/10 text-[#126d94] border-none">
                      {selectedUniversities.length}
                    </Badge>
                  )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 max-h-[60vh] overflow-auto">
                <div className="flex items-center justify-between mb-2">
                  <DropdownMenuLabel>Current Education</DropdownMenuLabel>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6" 
                    onClick={() => setIsUniversityFilterOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                  <DropdownMenuSeparator />
                {filterUniversities.sort().map((university) => (
                  <StayOpenCheckboxItem
                      key={university}
                      checked={selectedUniversities.includes(university)}
                    onCheckedChange={() => {
                      toggleUniversity(university);
                    }}
                    >
                      {university}
                  </StayOpenCheckboxItem>
                  ))}
                  {selectedUniversities.length > 0 && (
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
                        setSelectedUniversities([]);
                      }}
                      >
                        Clear Universities
                      </Button>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            
            {/* Clear all filters button - update to include universities */}
            {(selectedSubjects.length > 0 || selectedSchools.length > 0 || selectedUniversities.length > 0 || searchTerm) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm("");
                  setSelectedSubjects([]);
                  setSelectedSchools([]);
                  setSelectedUniversities([]);
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
              setSelectedUniversities([]);
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
              const tutorImage = getAvatarUrl(tutor);
              
              // Get the avatar URL from our blurred avatar API if the user doesn't have premium access
              // Extract the file reference from the avatar URL if it exists
              const avatarRef = tutorImage && typeof tutorImage === 'string' 
                ? extractFileRefFromUrl(tutorImage)
                : null;
              
              // Create the blurred avatar URL for non-premium users
              // For the catch-all route, we can pass the entire path
              const avatarUrl = avatarRef 
                ? `/api/avatars/${avatarRef}` 
                : tutorImage;
              
              // Get rating from API data
              const tutorRating = tutorRatings[tutorId];
              const rating = tutorRating?.averageRating || 0;
              const reviewCount = tutorRating?.reviewCount || 0;
                
              return (
                <Card key={tutorId} className="overflow-hidden bg-card/80 backdrop-blur-sm border-border/40 shadow-md hover:shadow-xl transition-all duration-300 hover:translate-y-[-3px] group flex flex-col h-full">
                  {/* Card header with gradient background */}
                  <div className="h-24 relative overflow-hidden w-full">
                    <div className="absolute inset-0 bg-gradient-to-r from-[#c7e4e3] via-[#84b4cc] to-[#128ca1] group-hover:scale-105 transition-transform duration-500"></div>
                    <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20"></div>
                  </div>
                  
                  {/* Card content */}
                  <div className="p-6 relative flex-1 flex flex-col h-full">
                    {/* Avatar */}
                    <Avatar className="h-24 w-24 border-4 border-background absolute -top-10 left-6 shadow-md group-hover:shadow-lg transition-all z-20">
                        <AvatarImage 
                          src={user?.has_access || user?.role === 'tutor' ? tutorImage ?? undefined : avatarUrl ?? undefined} 
                          alt={tutorName}
                        />
                        <AvatarFallback className="bg-gradient-to-br from-[#84b4cc] to-[#128ca1] text-white font-semibold">
                          {tutor.first_name ? tutor.first_name.charAt(0).toUpperCase() : ''}
                          {tutor.last_name ? tutor.last_name.charAt(0).toUpperCase() : 'T'}
                        </AvatarFallback>
                    </Avatar>
                    
                    {/* University Logo Circle */}
                    <div className="h-24 w-24 rounded-full border-4 border-background absolute -top-12 shadow-md overflow-hidden bg-white z-10" style={{ left: '6rem' }}>
                      {/* Get university information */}
                      {(() => {
                        const universityName = extractUniversityName(tutor.current_education);
                        const universityLogo = getUniversityLogo(universityName);
                        
                        if (universityLogo) {
                          return (
                            <div className="h-full w-full flex items-center justify-center bg-white p-1">
                              <Image 
                                src={universityLogo} 
                                alt={universityName || "University"} 
                                width={96} 
                                height={96} 
                                className="object-contain"
                                style={{ maxWidth: '120%' }}
                              />
                            </div>
                          );
                        } else if (typeof tutor.current_education === 'string' && tutor.current_education.trim()) {
                          return (
                        <div className="h-full w-full flex items-center justify-center bg-white p-1">
                          <div className="text-xs text-center font-medium text-[#4b92a9]">
                            {tutor.current_education.split(' ').slice(0, 2).map(word => word[0]).join('')}
                          </div>
                        </div>
                          );
                        } else {
                          return (
                        <div className="h-full w-full flex items-center justify-center bg-white">
                          <School className="h-10 w-10 text-[#4b92a9]/40" />
                        </div>
                          );
                        }
                      })()}
                    </div>
                    
                    <div className="mt-12 flex flex-col h-full">
                      {/* Header section - Name and rating */}
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xl font-medium truncate">{tutorName}</h3>
                        {/* Commenting out rating display due to insufficient data
                        <div className="flex items-center shrink-0">
                          <ReviewStars rating={rating} />
                          {reviewCount > 0 && <span className="ml-1 text-xs text-muted-foreground">({reviewCount})</span>}
                        </div>
                        */}
                      </div>
                      
                      {/* Education section */}
                      <div className="text-xs text-muted-foreground mb-1">
                        {/* Current education */}
                        {(typeof tutor.current_education === 'string' && tutor.current_education.trim()) || 
                         (Array.isArray(tutor.current_education) && tutor.current_education.length > 0) ? (
                          <div className="flex items-center gap-1">
                            <School className="h-3 w-3 text-[#128ca0] shrink-0" strokeWidth={2} />
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
                      <div className="flex items-center gap-1 text-[#3e5461] dark:text-[#84b4cc] text-sm mb-2">
                        <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                        <span>Verified Tutor</span>
                      </div>
                      
                      <Separator className="my-2 bg-[#c2d8d2]/50" />
                      
                      {/* Subjects section */}
                      <div className="mb-3">
                        <div className="flex items-center text-sm mb-1">
                          <BookOpen className="h-3.5 w-3.5 mr-1.5 text-[#128ca0] shrink-0" strokeWidth={2} />
                          <span className="font-medium">Services</span>
                        </div>
                        <div className="flex flex-wrap gap-1 pl-5">
                          {(() => {
                            // Process subjects before displaying
                            const rawSubjects = (typeof tutor.subjects === 'string' 
                            ? tutor.subjects.split(',').map(s => s.trim()) 
                            : Array.isArray(tutor.subjects) ? tutor.subjects : []
                            );
                            
                            // Define patterns for grouped subjects
                            const ukTestsPattern = /^uk admissions tests -/i;
                            const subjectTutoringPattern = /^subject tutoring -/i;
                            
                            // Group subjects
                            const ukTests = rawSubjects.filter(s => ukTestsPattern.test(s));
                            const subjectTutoring = rawSubjects.filter(s => subjectTutoringPattern.test(s));
                            const otherSubjects = rawSubjects.filter(s => 
                              !ukTestsPattern.test(s) && !subjectTutoringPattern.test(s)
                            );
                            
                            // Prepare processed subjects list
                            const processedSubjects = [...otherSubjects];
                            
                            // Add grouped UK Admissions tests if there are any
                            if (ukTests.length > 0) {
                              // Extract test names from the UK tests subjects
                              const testNames = ukTests.map(test => 
                                test.replace(ukTestsPattern, '').trim()
                              );
                              const testDisplay = `UK Admissions Tests - ${testNames.join(', ')}`;
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
                            
                            // Get service costs
                            const serviceCosts = tutor.service_costs || {};
                            
                            // Helper function to get the main service name
                            const getMainServiceName = (subject: string): string => {
                              // Check if it's a UK Admissions tests entry
                              if (subject.toLowerCase().startsWith('uk admissions tests')) {
                                return 'UK Admissions Tests';
                              }
                              // Check if it's a Subject Tutoring entry
                              if (subject.toLowerCase().startsWith('subject tutoring')) {
                                return 'Subject Tutoring';
                              }
                              // For other services, use as is
                              return subject;
                            };
                            
                            // Display the badges (up to 3)
                            return processedSubjects.slice(0, 3).map((subject, idx) => {
                              // Get the main service name for cost lookup
                              const mainServiceName = getMainServiceName(subject);
                              
                              // Check if this service has a cost
                              const cost = serviceCosts[mainServiceName];
                              const hasCost = cost !== undefined;
                              if (hasCost) {
                                // Display service with cost in a single oval
                                return (
                                  <div 
                                    key={idx}
                                    className="flex items-center rounded-full overflow-hidden border border-[#84b7bd]/30"
                                  >
                                    <div className="bg-[#c2d8d2]/30 px-2 py-0.5 text-xs font-semibold">
                                      {subject}
                                    </div>
                                    <div className="bg-[#128ca0]/20 px-2 py-0.5 text-xs font-semibold text-[#126d94] h-full">
                                      {cost}
                                    </div>
                                  </div>
                                );
                              } else {
                                // Display service without cost
                                return (
                                  <Badge key={idx} variant="outline" className="text-xs bg-[#c2d8d2]/30 border-[#84b7bd]/30">
                                    {subject}
                                  </Badge>
                                );
                              }
                            });
                          })()}
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
                            
                          </div>
                          {/* Comment out the reviews count
                          <Separator orientation="vertical" className="h-4 bg-[#c2d8d2]/50" />
                          <div className="flex items-center">
                            <GraduationCap className="h-3.5 w-3.5 mr-1 text-[#4b92a9] shrink-0" strokeWidth={2} />
                            <span>{reviewCount} {reviewCount === 1 ? 'review' : 'reviews'}</span>
                          </div>
                          */}
                        </div>
                        
                        {hasPremiumAccess ? (
                        <Button asChild className="w-full shadow-md hover:shadow-lg bg-[#128ca0] hover:bg-[#126d94] transition-all group-hover:translate-y-[-1px]">
                          <Link href={`/tutors/${tutorId}`} className="flex items-center justify-center gap-1">
                            View Profile
                            <ArrowRight className="h-3.5 w-3.5 ml-1 group-hover:translate-x-0.5 transition-transform" />
                          </Link>
                        </Button>
                        ) : (
                          <Button
                            onClick={() => router.push('/paywall')}
                            className="w-full shadow-md hover:shadow-lg bg-gradient-to-r from-[#3e5461] to-[#126d94] hover:from-[#128ca0] hover:to-[#126d94] transition-all group-hover:translate-y-[-1px]"
                          >
                            <div className="flex items-center justify-center gap-1">
                              <Sparkles className="h-3.5 w-3.5 mr-1" />
                              Unlock Access
                            </div>
                          </Button>
                        )}
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