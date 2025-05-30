import { TutorProfile, StudentProfile, User } from '@/types/supabaseTypes';

export function getFullName(profile: TutorProfile | StudentProfile | User | null | undefined): string {
  if (!profile) return '';
  
  // Check if it's a profile with first_name and last_name properties
  if ('first_name' in profile && 'last_name' in profile) {
    const firstName = profile.first_name || '';
    const lastName = profile.last_name || '';
    
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    } else if (firstName) {
      return firstName;
    } else if (lastName) {
      return lastName;
    }
  }
  
  // For User type, assume it might have email as fallback
  if ('email' in profile && profile.email) {
    return profile.email.split('@')[0]; // Use part before @ in email
  }
  
  return '';
}

export function getInitials(profile: TutorProfile | StudentProfile | User | null | undefined): string {
  if (!profile) return '';
  
  // For profiles with first_name and last_name
  if ('first_name' in profile && 'last_name' in profile) {
    const firstName = profile.first_name || '';
    const lastName = profile.last_name || '';
    
    if (firstName && lastName) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    } else if (firstName) {
      return firstName.charAt(0).toUpperCase();
    } else if (lastName) {
      return lastName.charAt(0).toUpperCase();
    }
  }
  
  // For User type with email
  if ('email' in profile && profile.email) {
    return profile.email.charAt(0).toUpperCase();
  }
  
  return '';
}

export function getAvatarUrl(profile: TutorProfile | StudentProfile | User | null | undefined): string | null {
  if (!profile) return null;
  
  // For profiles with avatar_url
  if ('avatar_url' in profile && profile.avatar_url) {
    // Validate and format the URL
    const avatarUrl = profile.avatar_url.trim();
    
    // If empty after trimming, return null to trigger fallback
    if (!avatarUrl) return null;
    
    // If it's a relative path without leading slash, add one
    if (!avatarUrl.startsWith('http') && !avatarUrl.startsWith('/') && !avatarUrl.startsWith('data:')) {
      return `/${avatarUrl}`;
    }
    
    return avatarUrl;
  }
  
  // No avatar URL found, return null to trigger fallback
  return null;
}
