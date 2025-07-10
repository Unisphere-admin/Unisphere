"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, ControllerRenderProps, FieldPath, useFieldArray } from "react-hook-form";
import * as z from "zod";
import { Loader2, Save, Mail, AlertCircle, Upload, X, Camera, User, Trash2, Plus, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createClient } from "@/utils/supabase/client";
import Image from "next/image";
import { uploadAvatar } from "@/utils/supabase/storage";
import { AvatarEditor } from "@/components/AvatarEditor";
import { useCsrfToken } from "@/lib/csrf/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

// Define the base schema for profile fields
const baseProfileSchema = z.object({
  first_name: z.string()
    .min(1, "First name is required")
    .max(50, "First name must be less than 50 characters"),
  last_name: z.string()
    .min(1, "Last name is required")
    .max(50, "Last name must be less than 50 characters"),
});

// Schema for student profiles with email update
const studentProfileSchema = baseProfileSchema.extend({
  intended_universities: z.string().max(500, "Must be less than 500 characters").optional(),
  intended_major: z.string().max(100, "Must be less than 100 characters").optional(),
  current_subjects: z.string().max(500, "Must be less than 500 characters")
    .optional(),
  bio: z.string().max(5000, "Bio must be less than 5000 characters").optional(),
});

// Schema for email updates specifically
const emailSchema = z.object({
  email: z.string().email("Please enter a valid email")
});

// Schema for tutor profiles with additional fields
const tutorProfileSchema = baseProfileSchema.extend({
  age: z.string()
    .refine((val: string) => !isNaN(Number(val)), "Age must be a number")
    .transform((val: string) => (val === "" ? undefined : val))
    .optional(),
  bio: z.string().max(5000, "Bio must be less than 500 characters").optional(),
  subjects: z.array(z.string()).optional(),
  serviceCosts: z.record(z.string(), z.number()).optional(),
});

// Update the password schema to include the current password
const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password must be less than 100 characters"),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});

// Type for the form values
type StudentProfileFormValues = z.infer<typeof studentProfileSchema>;
type EmailFormValues = z.infer<typeof emailSchema>;
type TutorProfileFormValues = z.infer<typeof tutorProfileSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

// Interface for the user profile data from API
interface UserProfile {
  id: string;
  first_name?: string;
  last_name?: string;
  description?: string; // For tutors (bio)
  bio?: string; // Alternative field name
  age?: string;
  avatar_url?: string;
  subjects?: string[] | string | null;
  cost?: number | string; // Add cost property
  service_costs?: Record<string, number> | string; // Add service costs property
}

// Interface for service costs
interface ServiceCost {
  service: string;
  subject?: string;
  cost: number;
}

// Function to format service costs for display and storage
const formatServiceCost = (service: string, cost: number): number => {
  return cost;
};

// Function to parse formatted service cost string
const parseServiceCost = (formattedCost: string | number): number => {
  if (typeof formattedCost === 'number') {
    return formattedCost;
  }
  
  const parts = formattedCost.split(' - ');
  return parts.length > 1 ? parseInt(parts[1]) || 0 : 0;
};

export default function SettingsPage() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [initialLoading, setInitialLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [emailUpdateStatus, setEmailUpdateStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [emailError, setEmailError] = useState("");
  const [passwordUpdateStatus, setPasswordUpdateStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [passwordError, setPasswordError] = useState("");
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [isEditingAvatar, setIsEditingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { token, fetchCsrfToken } = useCsrfToken();
  
  // Service options for tutors
  const serviceOptions = [
    "Extracurricular Building",
    "Interviews",
    "SAT",
    "Subject Tutoring",
    "UK Admissions Tests",
    "UK University Admissions",
    "US University Admissions"
  ];
  
  // State for subcategory inputs
  const [newSubjectTutoring, setNewSubjectTutoring] = useState("");
  const [newUKAdmissionsTest, setNewUKAdmissionsTest] = useState("");
  
  // State for service costs
  const [serviceCosts, setServiceCosts] = useState<Record<string, number>>({});
  const [subjectCosts, setSubjectCosts] = useState<Record<string, number>>({});

  // Check for email verification success from URL
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const emailVerified = searchParams.get('email_verified');
    
    if (emailVerified === 'true') {
      // Show success message
      toast.success("Email verified successfully!");
      
      // Remove the query parameter from URL without page reload
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('email_verified');
      window.history.replaceState({}, '', newUrl);
      
      // Refresh user data to get updated email
      refreshUser(true);
    }
  }, [refreshUser]);

  // Determine if the user is a tutor
  const isTutor = user?.role === "tutor";

  // Add effect to ensure CSRF token is available
  useEffect(() => {
    // Fetch CSRF token on mount if not available
    if (!token) {
      fetchCsrfToken().catch(err => {
      });
    }
  }, [token, fetchCsrfToken]);

  // Create form based on user role
  const studentForm = useForm<StudentProfileFormValues>({
    resolver: zodResolver(studentProfileSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      intended_universities: "",
      intended_major: "",
      current_subjects: "",
      bio: "",
    },
  });

  const emailForm = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: user?.email || "",
    },
  });

  const tutorForm = useForm<TutorProfileFormValues>({
    resolver: zodResolver(tutorProfileSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      age: "",
      bio: "",
      subjects: [],
      serviceCosts: {},
    },
  });

  // Add password form
  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      password: "",
      confirmPassword: ""
    },
  });

  // Helper function to ensure a valid authentication session
  const ensureAuthSession = useCallback(async () => {
    try {
      // Call the session API endpoint to verify and refresh the session if needed
      const response = await fetch('/api/auth/session', {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        credentials: 'include'
      });
      
      if (response.status === 401) {
        setAuthError(true);
        return false;
      }
      
      if (!response.ok) {
          setAuthError(true);
          return false;
      }
      
      // Session is valid
      setAuthError(false);
      return true;
    } catch (error) {
      setAuthError(true);
      return false;
    }
  }, []);

  // Fetch profile data
  const fetchProfileData = useCallback(async (silent = false) => {
    if (!user) return;
    
    // Use a loading timeout to avoid flickering loading states for fast responses
    let loadingTimeout: NodeJS.Timeout | null = null;
    
    if (!silent) {
      // Set a timeout to show loading state only if the request takes longer than 300ms
      loadingTimeout = setTimeout(() => {
        setInitialLoading(true);
      }, 300);
    }
    
    try {
      // Ensure session is valid before making the request
      const isSessionValid = await ensureAuthSession();
      if (!isSessionValid) {
        toast.error("Session expired. Please sign in again.");
        router.push("/login");
        return;
      }
      
      const response = await fetch(`/api/users/profile/${user.id}`, {
        method: "GET",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0"
        },
        credentials: "include"
      });
      
      if (response.status === 401) {
        setAuthError(true);
        throw new Error("Unauthorized");
      }
      
      if (!response.ok) {
        throw new Error(`Failed to fetch profile: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Update profile data
      setProfileData(data.profile);
      
      // Format subjects if they exist
      let formattedSubjects: string[] = [];
      if (data.profile.subjects) {
        if (typeof data.profile.subjects === 'string') {
          // Try to parse as JSON first
          try {
            formattedSubjects = JSON.parse(data.profile.subjects);
          } catch (e) {
            // If not JSON, split by comma
            formattedSubjects = data.profile.subjects.split(',').map((s: string) => s.trim());
          }
        } else if (Array.isArray(data.profile.subjects)) {
          formattedSubjects = data.profile.subjects;
        }
      }
      
      // Extract service costs if they exist
      let extractedServiceCosts: Record<string, number> = {};
      if (data.profile.service_costs) {
        try {
          if (typeof data.profile.service_costs === 'string') {
            // Try to parse as JSON
            const parsedCosts = JSON.parse(data.profile.service_costs);
            
            // Handle costs as direct numbers
            if (typeof parsedCosts === 'object') {
              Object.entries(parsedCosts).forEach(([key, value]) => {
                if (typeof value === 'number') {
                  extractedServiceCosts[key] = value as number;
                } else if (typeof value === 'string') {
                  // For backward compatibility with old format
                  extractedServiceCosts[key] = parseServiceCost(value as string);
                }
              });
            }
          } else if (typeof data.profile.service_costs === 'object') {
            // Handle costs as direct numbers
            Object.entries(data.profile.service_costs).forEach(([key, value]) => {
              if (typeof value === 'number') {
                extractedServiceCosts[key] = value as number;
              } else if (typeof value === 'string') {
                // For backward compatibility with old format
                extractedServiceCosts[key] = parseServiceCost(value as string);
              }
            });
          }
        } catch (e) {
        }
      }
      
      // Populate the appropriate form based on user role
      if (user.role === 'tutor') {
        tutorForm.reset({
          first_name: data.profile.first_name || "",
          last_name: data.profile.last_name || "",
          age: data.profile.age?.toString() || "",
          bio: data.profile.description || data.profile.bio || "",
          subjects: formattedSubjects || [],
          serviceCosts: extractedServiceCosts,
        });
        
        // Also update the local state
        setServiceCosts(extractedServiceCosts);
      } else {
        studentForm.reset({
          first_name: data.profile.first_name || "",
          last_name: data.profile.last_name || "",
          intended_universities: data.profile.intended_universities || "",
          intended_major: data.profile.intended_major || "",
          current_subjects: Array.isArray(data.profile.current_subjects) 
            ? data.profile.current_subjects.join(", ") 
            : data.profile.current_subjects || "",
          bio: data.profile.bio || "",
        });
        
        // Update email form separately
        emailForm.reset({
          email: user.email || "",
        });
      }
      
      setHasLoadedOnce(true);
    } catch (error) {
      if (!silent) {
        toast.error("Failed to load profile data");
      }
    } finally {
      // Clear the loading timeout if it exists
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
      }
      
      if (!silent) {
        setInitialLoading(false);
      }
    }
  }, [user, router, tutorForm, studentForm, ensureAuthSession]);

  // Handle session expiry and redirect if needed
  useEffect(() => {
    const checkAuth = async () => {
      if (authError) {
        await refreshUser(true).catch(err => {
          router.push("/login");
        });
      }
    };
    
    if (authError) {
      checkAuth();
    }
  }, [authError, refreshUser, router]);

  // Redirect if not logged in, fetch profile data if logged in
  useEffect(() => {
    if (!user) {
      router.push("/login");
    } else {
      // Check if we've loaded the settings page before
      const hasViewedSettings = localStorage.getItem('hasViewedSettings');
      
      // If we've loaded before, fetch data silently
      if (hasViewedSettings === 'true') {
        fetchProfileData(true); // Silent fetch
      } else {
        fetchProfileData(false); // Show loading state
        // Remember that we've loaded the settings page
        localStorage.setItem('hasViewedSettings', 'true');
      }
    }
  }, [user, router, fetchProfileData]);

  // Set form values once profile data is loaded
  useEffect(() => {
    if (user && profileData) {
      const firstName = profileData.first_name || "";
      const lastName = profileData.last_name || "";
      
      // Format subjects if they exist
      let formattedSubjects: string[] = [];
      if (profileData.subjects) {
        if (typeof profileData.subjects === 'string') {
          // Try to parse as JSON first
          try {
            formattedSubjects = JSON.parse(profileData.subjects);
          } catch (e) {
            // If not JSON, split by comma
            formattedSubjects = profileData.subjects.split(',').map((s: string) => s.trim());
          }
        } else if (Array.isArray(profileData.subjects)) {
          formattedSubjects = profileData.subjects;
        }
      }
      
      // Extract service costs if they exist
      let extractedServiceCosts: Record<string, number> = {};
      if (profileData.service_costs) {
        try {
          if (typeof profileData.service_costs === 'string') {
            extractedServiceCosts = JSON.parse(profileData.service_costs);
          } else if (typeof profileData.service_costs === 'object') {
            extractedServiceCosts = profileData.service_costs;
          }
        } catch (e) {
        }
      }
      
      if (isTutor) {
        tutorForm.reset({
          first_name: firstName,
          last_name: lastName,
          // Convert age to string explicitly to ensure it's properly displayed in the form field
          age: profileData.age?.toString() || "",
          bio: profileData.description || profileData.bio || "",
          subjects: formattedSubjects || [],
          serviceCosts: extractedServiceCosts,
        });
        
        // Also update the local state
        setServiceCosts(extractedServiceCosts);
      } else {
        // Cast to include the new fields
        const extendedProfile = profileData as any;
        
        studentForm.reset({
          first_name: firstName,
          last_name: lastName,
          intended_universities: extendedProfile.intended_universities || "",
          intended_major: extendedProfile.intended_major || "",
          current_subjects: Array.isArray(extendedProfile.current_subjects)
            ? extendedProfile.current_subjects.join(', ')
            : extendedProfile.current_subjects || "",
          bio: extendedProfile.bio || "",
        });
        
        // Update email form separately
        emailForm.reset({
          email: user.email || "",
        });
      }
    }
  }, [user, profileData, isTutor, studentForm, tutorForm, emailForm]);

  useEffect(() => {
    // Make sure we have a CSRF token for forms
    if (!token) {
      fetchCsrfToken();
    }
  }, [token, fetchCsrfToken]);

  // Handle form submission for student profiles - name only
  const onStudentSubmit = async (data: StudentProfileFormValues) => {
    if (!user) return;
    setProfileLoading(true);

    try {
      // Ensure session is valid before making the request
      const isSessionValid = await ensureAuthSession();
      if (!isSessionValid) {
        toast.error("Session expired. Please sign in again.");
        router.push("/login");
        return;
      }
      
      // Process current_subjects as an array
      const currentSubjects = data.current_subjects 
        ? data.current_subjects.split(',').map(s => s.trim()).filter(Boolean)
        : [];
      
      // Update profile data
      const profileData = {
        first_name: data.first_name,
        last_name: data.last_name,
        intended_universities: data.intended_universities,
        intended_major: data.intended_major,
        current_subjects: currentSubjects,
        bio: data.bio,
      };

      const response = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": token || "",
        },
        body: JSON.stringify(profileData),
        credentials: "include",
      });

      if (response.status === 401) {
        // Handle unauthorized errors
        setAuthError(true);
        toast.error("Session expired. Please sign in again.");
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to update profile: ${response.status}`);
      }

      // Refresh user data silently
      await refreshUser(true);
      await fetchProfileData(true);
      toast.success("Profile updated successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update profile");
    } finally {
      setProfileLoading(false);
    }
  };

  // Handle email submission separately
  const onEmailSubmit = async (data: EmailFormValues) => {
    if (!user) return;
    
    // Reset email status
    setEmailLoading(true);
    setEmailUpdateStatus('idle');
    setEmailError("");

    try {
      // Ensure session is valid before making the request
      const isSessionValid = await ensureAuthSession();
      if (!isSessionValid) {
        toast.error("Session expired. Please sign in again.");
        router.push("/login");
        return;
      }

      // Only process if email has changed
      if (data.email && data.email !== user.email) {
        const emailResponse = await fetch("/api/users/update-email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": token || "",
          },
          body: JSON.stringify({ email: data.email }),
          credentials: "include",
        });

        if (emailResponse.status === 401) {
          // Handle unauthorized errors
          setAuthError(true);
          setEmailUpdateStatus('error');
          setEmailError("Session expired. Please sign in again.");
          return;
        }

        if (!emailResponse.ok) {
          const emailErrorData = await emailResponse.json();
          setEmailError(emailErrorData.error || `Failed to update email: ${emailResponse.status}`);
          setEmailUpdateStatus('error');
        } else {
          setEmailUpdateStatus('success');
          toast.success("Email verification sent to your new address");
        }
      } else {
        toast.info("No changes to email detected");
      }
    } catch (emailError) {
      setEmailError("An error occurred while updating your email");
      setEmailUpdateStatus('error');
      toast.error("Failed to send email verification");
    } finally {
      setEmailLoading(false);
    }
  };

  // Handle form submission for tutor profiles
  const onTutorSubmit = async (data: TutorProfileFormValues) => {
    if (!user) return;
    setProfileLoading(true);

    try {
      
      // Ensure session is valid before making the request
      const isSessionValid = await ensureAuthSession();
      if (!isSessionValid) {
        toast.error("Session expired. Please sign in again.");
        router.push("/login");
        return;
      }

      // Format service costs for storage as numbers only
      const formattedServiceCosts: Record<string, number> = {};
      if (data.serviceCosts) {
        Object.entries(data.serviceCosts).forEach(([service, cost]) => {
          // Only include main categories (not subcategories)
          if (!service.includes('-')) {
            // Ensure cost is a number, defaulting to 0
            let costValue = 0;
            if (cost !== undefined && cost !== null) {
              costValue = Number(cost) || 0;
            }
            formattedServiceCosts[service] = costValue;
          }
        });
      }


      const payload = {
        first_name: data.first_name,
        last_name: data.last_name,
        age: data.age ? data.age.toString() : undefined, // Ensure age is sent as a string
        bio: data.bio, // This will map to description in the database for tutors
        subjects: data.subjects, // Add subjects array to the request
        service_costs: formattedServiceCosts, // Send service costs as numbers
      };


      const response = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": token || "",
        },
        body: JSON.stringify(payload),
        credentials: "include",
      });


      if (response.status === 401) {
        // Handle unauthorized errors
        setAuthError(true);
        toast.error("Session expired. Please sign in again.");
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to update profile: ${response.status}`);
      }

      // Refresh user data silently
      await refreshUser(true);
      await fetchProfileData(true);
      toast.success("Profile updated successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update profile");
    } finally {
      // Slight delay to ensure state updates properly before setting loading to false
      setTimeout(() => {
        setProfileLoading(false);
      }, 300);
    }
  };

  // Add avatar file change handler
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    setAvatarError(null);
    
    if (!files || files.length === 0) {
      return;
    }
    
    const file = files[0];
    
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      setAvatarError('Invalid file type. Please upload a JPG, PNG, WebP, or GIF image.');
      return;
    }
    
    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError('File is too large. Maximum size is 2MB.');
      return;
    }
    
    // Create a preview and set file
    const reader = new FileReader();
    reader.onload = (e) => {
      setAvatarPreview(e.target?.result as string);
      setIsEditingAvatar(true); // Enable editing mode
    };
    reader.readAsDataURL(file);
    
    setAvatarFile(file);
  };
  
  // Handle saving edited avatar
  const handleSaveEditedAvatar = (canvas: HTMLCanvasElement) => {
    // Convert canvas to blob and then to File
    canvas.toBlob((blob) => {
      if (blob && avatarFile) {
        const editedFile = new File([blob], avatarFile.name, { 
          type: avatarFile.type,
          lastModified: new Date().getTime()
        });
        
        setAvatarFile(editedFile);
        setAvatarPreview(canvas.toDataURL());
        setIsEditingAvatar(false);
      }
    }, avatarFile?.type || 'image/png');
  };
  
  // Cancel avatar editing
  const handleCancelAvatarEdit = () => {
    if (!avatarFile) {
      clearAvatarSelection();
    }
    setIsEditingAvatar(false);
  };
  
  // Handle avatar upload
  const handleAvatarUpload = async () => {
    if (!user || !avatarFile) return;
    
    try {
      setAvatarLoading(true);
      setAvatarError(null);
      
      // Ensure session is valid before upload
      const isSessionValid = await ensureAuthSession();
      if (!isSessionValid) {
        toast.error("Session expired. Please sign in again.");
        router.push("/login");
        return;
      }
      
      // Ensure we have a CSRF token
      let csrfToken = token;
      if (!csrfToken) {
        try {
          csrfToken = await fetchCsrfToken();
          if (!csrfToken) {
            throw new Error('Failed to fetch CSRF token');
          }
        } catch (csrfError) {
          setAvatarError('Authentication error. Please refresh the page and try again.');
          toast.error('Authentication error. Please refresh the page and try again.');
          return;
        }
      }
      
      // Upload the avatar
      const { path, error } = await uploadAvatar(user.id, avatarFile, {
        maxSizeMB: 2,
        upsert: true,
        acceptedFileTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
      });
      
      if (error) {
        setAvatarError(error);
        toast.error(`Failed to upload avatar: ${error}`);
        return;
      }
      
      if (!path) {
        setAvatarError('Failed to get uploaded file URL');
        toast.error('Failed to get uploaded file URL');
        return;
      }
      
      // Update the user profile with the new avatar URL
      const profileData = {
        avatar_url: path
      };
      
      const response = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken || "",
        },
        body: JSON.stringify(profileData),
        credentials: "include",
      });
      
      if (response.status === 401) {
        setAuthError(true);
        toast.error("Session expired. Please sign in again.");
        return;
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to update profile: ${response.status}`);
      }
      
      // Refresh user data and clear the file input
      await refreshUser(true);
      await fetchProfileData(true);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setAvatarFile(null);
      setAvatarPreview(null);
      setIsEditingAvatar(false);
      toast.success("Avatar updated successfully");
    } catch (error) {
      setAvatarError(error instanceof Error ? error.message : "Failed to upload avatar");
      toast.error(error instanceof Error ? error.message : "Failed to upload avatar");
    } finally {
      setAvatarLoading(false);
    }
  };
  
  // Clear avatar file selection
  const clearAvatarSelection = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    setAvatarError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // Trigger file input click
  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Update the password form handler
  const onPasswordSubmit = async (data: PasswordFormValues) => {
    if (!user) return;
    
    // Reset password status
    setPasswordLoading(true);
    setPasswordUpdateStatus('idle');
    setPasswordError("");

    try {
      // Ensure session is valid before making the request
      const isSessionValid = await ensureAuthSession();
      if (!isSessionValid) {
        toast.error("Session expired. Please sign in again.");
        router.push("/login");
        return;
      }

      // First verify the current password by making an API call
      const verifyResponse = await fetch('/api/auth/verify-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': token || '',
        },
        body: JSON.stringify({ 
          email: user.email || '',
          password: data.currentPassword 
        }),
        credentials: 'include',
      });
      
      if (!verifyResponse.ok) {
        setPasswordError("Current password is incorrect");
        setPasswordUpdateStatus('error');
        toast.error("Current password is incorrect");
        setPasswordLoading(false);
        return;
      }
      
      // If current password is correct, update to new password using the API
      const updateResponse = await fetch('/api/auth/update-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': token || '',
        },
        body: JSON.stringify({ password: data.password }),
        credentials: 'include',
      });

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json();
        setPasswordError(errorData.error || "Failed to update password");
        setPasswordUpdateStatus('error');
        toast.error("Failed to update password");
      } else {
        setPasswordUpdateStatus('success');
        toast.success("Password updated successfully");
        passwordForm.reset();
      }
    } catch (error) {
      setPasswordError("An error occurred while updating your password");
      setPasswordUpdateStatus('error');
      toast.error("Failed to update password");
    } finally {
      setPasswordLoading(false);
    }
  };

  // Function to handle adding multiple comma-separated subjects
  const handleAddMultipleSubjects = (input: string, prefix: string) => {
    if (!input.trim()) return;
    
    const currentSubjects = tutorForm.getValues("subjects") || [];
    const newSubjects = input.split(',')
      .map(item => item.trim())
      .filter(item => item !== '')
      .map(item => `${prefix}${item}`);
    
    // Add only unique subjects
    const uniqueNewSubjects = newSubjects.filter(subject => 
      !currentSubjects.includes(subject)
    );
    
    if (uniqueNewSubjects.length > 0) {
      tutorForm.setValue("subjects", [...currentSubjects, ...uniqueNewSubjects]);
      
      // Don't initialize costs for subcategories
      // We only set costs for main service categories
    }
  };

  // Function to check if a subject belongs to a service category
  const subjectBelongsToService = (subject: string, service: string): boolean => {
    if (!subject) return false;
    
    // Convert both to lowercase for case-insensitive comparison
    const subjectLower = subject.toLowerCase();
    const serviceLower = service.toLowerCase();
    
    // Direct match (case insensitive)
    if (subjectLower === serviceLower) return true;
    
    // Check with or without spaces around the dash (case insensitive)
    return subjectLower.startsWith(`${serviceLower} - `) || 
           subjectLower.startsWith(`${serviceLower}- `) || 
           subjectLower.startsWith(`${serviceLower} -`) || 
           subjectLower.startsWith(`${serviceLower}-`);
  };
  
  // Function to extract subcategory from subject
  const extractSubcategory = (subject: string, service: string): string => {
    if (!subject) return "";
    
    // Convert to lowercase for case-insensitive comparison
    const subjectLower = subject.toLowerCase();
    const serviceLower = service.toLowerCase();
    
    if (subjectLower === serviceLower) return "";
    
    // Try different dash formats with case insensitivity
    // But return the original case of the subcategory
    if (subjectLower.startsWith(`${serviceLower} - `)) {
      return subject.substring(service.length + 3); // " - " is 3 characters
    }
    if (subjectLower.startsWith(`${serviceLower}- `)) {
      return subject.substring(service.length + 2); // "- " is 2 characters
    }
    if (subjectLower.startsWith(`${serviceLower} -`)) {
      return subject.substring(service.length + 2); // " -" is 2 characters
    }
    if (subjectLower.startsWith(`${serviceLower}-`)) {
      return subject.substring(service.length + 1); // "-" is 1 character
    }
    
    return "";
  };

  // Debug effect to log subjects data changes
  useEffect(() => {
    const subjects = tutorForm.watch("subjects");
    
    if (Array.isArray(subjects) && subjects.length > 0) {
      // Log each subject and which service it belongs to
      subjects.forEach(subject => {
        for (const service of serviceOptions) {
          if (subjectBelongsToService(subject, service)) {
            if (subject !== service) {
            }
            break;
          }
        }
      });
    }
  }, [tutorForm.watch("subjects")]);

  // Create a skeleton loading component
  const SettingsSkeleton = () => (
    <div className="space-y-8 animate-pulse">
      {/* Profile Picture Card Skeleton */}
      <Card className="mb-8 bg-card/80 backdrop-blur-sm border-border/40 shadow-md">
        <CardHeader>
          <div className="h-6 w-40 bg-muted rounded-md mb-1"></div>
          <div className="h-4 w-64 bg-muted/70 rounded-md"></div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center sm:flex-row sm:items-start gap-6">
            <div className="h-32 w-32 rounded-full bg-muted/80"></div>
            <div className="w-full space-y-4">
              <div className="h-9 w-full sm:w-40 bg-muted/80 rounded-md"></div>
              <div className="flex gap-2">
                <div className="h-9 w-full sm:w-32 bg-muted/80 rounded-md"></div>
                <div className="h-9 w-full sm:w-32 bg-muted/80 rounded-md"></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Settings Card Skeleton */}
      <Card className="mb-8 bg-card/80 backdrop-blur-sm border-border/40 shadow-md">
        <CardHeader>
          <div className="h-6 w-40 bg-muted rounded-md mb-1"></div>
          <div className="h-4 w-64 bg-muted/70 rounded-md"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="h-4 w-24 bg-muted/80 rounded-md"></div>
                <div className="h-10 w-full bg-muted/60 rounded-md"></div>
              </div>
              <div className="space-y-2">
                <div className="h-4 w-24 bg-muted/80 rounded-md"></div>
                <div className="h-10 w-full bg-muted/60 rounded-md"></div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="h-4 w-24 bg-muted/80 rounded-md"></div>
              <div className="h-10 w-full bg-muted/60 rounded-md"></div>
            </div>
            
            <div className="space-y-2">
              <div className="h-4 w-24 bg-muted/80 rounded-md"></div>
              <div className="h-32 w-full bg-muted/60 rounded-md"></div>
            </div>
            
            {isTutor && (
              <div className="space-y-2">
                <div className="h-4 w-32 bg-muted/80 rounded-md"></div>
                <div className="h-64 w-full bg-muted/60 rounded-md"></div>
              </div>
            )}
            
            <div className="flex justify-end">
              <div className="h-10 w-32 bg-muted/80 rounded-md"></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email Settings Card Skeleton */}
      <Card className="mb-6 bg-card/80 backdrop-blur-sm border-border/40 shadow-md">
        <CardHeader>
          <div className="h-6 w-40 bg-muted rounded-md mb-1"></div>
          <div className="h-4 w-64 bg-muted/70 rounded-md"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="h-4 w-24 bg-muted/80 rounded-md"></div>
              <div className="h-10 w-full bg-muted/60 rounded-md"></div>
            </div>
            <div className="flex justify-end">
              <div className="h-10 w-32 bg-muted/80 rounded-md"></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Password Card Skeleton */}
      <Card className="mb-6 bg-card/80 backdrop-blur-sm border-border/40 shadow-md">
        <CardHeader>
          <div className="h-6 w-40 bg-muted rounded-md mb-1"></div>
          <div className="h-4 w-64 bg-muted/70 rounded-md"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-24 bg-muted/80 rounded-md"></div>
                <div className="h-10 w-full bg-muted/60 rounded-md"></div>
              </div>
            ))}
            <div className="flex justify-end">
              <div className="h-10 w-40 bg-muted/80 rounded-md"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Show loading only on initial page load and if we haven't loaded before
  if (initialLoading && !hasLoadedOnce) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show skeleton for silent loading
  if (!hasLoadedOnce && !initialLoading) {
    return (
      <div className="container max-w-3xl py-8 relative min-h-[calc(100vh-var(--navbar-height)-2rem)]">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background pointer-events-none -z-10"></div>
        <div className="space-y-0.5 mb-6">
          <h2 className="text-2xl font-bold">Settings</h2>
          <p className="text-muted-foreground">
            Manage your account settings and profile information
          </p>
        </div>
        <Separator className="my-6 opacity-70" />
        <SettingsSkeleton />
      </div>
    );
  }

  // Show auth error if session is invalid
  if (authError) {
    return (
      <div className="container max-w-3xl py-8">
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Your session has expired. Please sign in again.
          </AlertDescription>
        </Alert>
        <div className="flex justify-center mt-8">
          <Button onClick={() => router.push("/login")}>
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-3xl py-8 relative min-h-[calc(100vh-var(--navbar-height)-2rem)]">
      {/* Add subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background pointer-events-none -z-10"></div>
      
      <div className="space-y-0.5 mb-6">
        <h2 className="text-2xl font-bold">Settings</h2>
        <p className="text-muted-foreground">
          Manage your account settings and profile information
        </p>
      </div>

      <Separator className="my-6 opacity-70" />

      {/* Profile Picture Card */}
      <Card className="mb-8 bg-card/80 backdrop-blur-sm border-border/40 shadow-md hover:shadow-lg transition-all">
        <CardHeader>
          <CardTitle>Profile Picture</CardTitle>
          <CardDescription>
            Upload a profile picture to personalize your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isEditingAvatar && avatarPreview ? (
            <AvatarEditor 
              image={avatarPreview}
              onSave={handleSaveEditedAvatar}
              onCancel={handleCancelAvatarEdit}
            />
          ) : (
            <div className="flex flex-col items-center sm:flex-row sm:items-start gap-6">
              {/* Current Avatar Display */}
              <div className="relative h-32 w-32 rounded-full overflow-hidden bg-muted flex items-center justify-center border border-border/40 shadow-md group-hover:shadow-lg transition-all">
                {avatarPreview ? (
                  <Image 
                    src={avatarPreview} 
                    alt="Avatar preview" 
                    fill
                    className="object-cover"
                  />
                ) : profileData?.avatar_url ? (
                  <Image 
                    src={profileData.avatar_url} 
                    alt="Current avatar" 
                    fill
                    className="object-cover"
                  />
                ) : (
                  <User className="h-16 w-16 text-muted-foreground" />
                )}
                <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors"></div>
              </div>
              
              {/* Upload Controls */}
              <div className="flex flex-col space-y-4 w-full">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={handleAvatarChange}
                  ref={fileInputRef}
                />
                
                {avatarFile && avatarPreview && !isEditingAvatar ? (
                  <div className="space-y-2">
                    <div className="flex items-center p-2 rounded-md bg-muted/50 border border-border/30">
                      <span className="text-sm font-medium flex-grow truncate mr-2">
                        {avatarFile.name}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={clearAvatarSelection}
                        className="h-8 w-8 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsEditingAvatar(true)}
                        className="flex-1 sm:flex-none shadow-sm border-border/40 hover:bg-muted hover:border-primary/30 transition-all"
                      >
                        <Camera className="mr-2 h-4 w-4" />
                        Edit Image
                      </Button>
                      
                      <Button
                        type="button"
                        onClick={handleAvatarUpload}
                        disabled={avatarLoading}
                        className="flex-1 sm:flex-none shadow-md hover:shadow-lg bg-primary hover:bg-primary/90 transition-all hover:translate-y-[-2px]"
                      >
                        {avatarLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="mr-2 h-4 w-4" />
                            Upload Avatar
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={triggerFileInput}
                      className="w-full sm:w-auto shadow-sm border-border/40 hover:bg-muted hover:border-primary/30 transition-all"
                    >
                      <Camera className="mr-2 h-4 w-4" />
                      Choose Image
                    </Button>
                    
                    {profileData?.avatar_url && (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full sm:w-auto shadow-sm border-border/40 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all"
                        onClick={async () => {
                          // Update profile to remove avatar URL
                          const isSessionValid = await ensureAuthSession();
                          if (!isSessionValid) {
                            toast.error("Session expired. Please sign in again.");
                            router.push("/login");
                            return;
                          }
                          
                          const response = await fetch("/api/users/profile", {
                            method: "PATCH",
                            headers: {
                              "Content-Type": "application/json",
                              "X-CSRF-Token": token || "",
                            },
                            body: JSON.stringify({ avatar_url: null }),
                            credentials: "include",
                          });
                          
                          if (response.ok) {
                            await refreshUser(true);
                            await fetchProfileData(true);
                            toast.success("Avatar removed");
                          } else {
                            toast.error("Failed to remove avatar");
                          }
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove Avatar
                      </Button>
                    )}
                  </div>
                )}
                
                {avatarError && (
                  <p className="text-sm text-destructive">{avatarError}</p>
                )}
                
                <p className="text-xs text-muted-foreground">
                  Accepted formats: JPG, PNG, WebP, GIF. Maximum size: 2MB.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mb-8 bg-card/80 backdrop-blur-sm border-border/40 shadow-md hover:shadow-lg transition-all">
        <CardHeader>
          <CardTitle>Profile Settings</CardTitle>
          <CardDescription>
            Update your personal information
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isTutor ? (
            // Tutor profile form
            <Form {...tutorForm}>
              <form onSubmit={tutorForm.handleSubmit(onTutorSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={tutorForm.control}
                    name="first_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John" {...field} className="bg-background/80 backdrop-blur-sm border-border/40 shadow-sm focus-visible:border-primary/30 focus-visible:ring-1 focus-visible:ring-primary/20 transition-all" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={tutorForm.control}
                    name="last_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Doe" {...field} className="bg-background/80 backdrop-blur-sm border-border/40 shadow-sm focus-visible:border-primary/30 focus-visible:ring-1 focus-visible:ring-primary/20 transition-all" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={tutorForm.control}
                  name="age"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Age</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="25" {...field} className="bg-background/80 backdrop-blur-sm border-border/40 shadow-sm focus-visible:border-primary/30 focus-visible:ring-1 focus-visible:ring-primary/20 transition-all" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={tutorForm.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bio</FormLabel>
                      <FormControl>
                        <textarea 
                          className="flex min-h-[120px] w-full rounded-md border border-input bg-background/80 backdrop-blur-sm px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 shadow-sm focus-visible:border-primary/30 transition-all"
                          placeholder="Tell students about yourself..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Services Selection */}
                <div className="space-y-4">
                  <FormLabel className="text-base font-semibold">Services</FormLabel>
                  <div className="text-sm text-muted-foreground mb-3">
                    Select the services you offer and set their costs in tokens. Students will pay these tokens to access your services.
                  </div>
                  <div className="bg-muted/30 p-4 rounded-md border border-border/40">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {serviceOptions.map((service) => {
                        const isChecked = (tutorForm.watch("subjects") || []).includes(service) || 
                          (tutorForm.watch("subjects") || []).some(subject => 
                            subjectBelongsToService(subject, service)
                          );
                        
                        return (
                          <div key={service} className="flex flex-col space-y-2">
                            <div className="flex items-start space-x-2">
                              <Checkbox 
                                id={`service-${service}`}
                                checked={isChecked}
                                onCheckedChange={(checked) => {
                                  
                                  const currentSubjects = tutorForm.getValues("subjects") || [];
                                  const currentServiceCosts = tutorForm.getValues("serviceCosts") || {};
                                  
                                  if (checked) {
                                    // Add the service if not already present
                                    if (!currentSubjects.includes(service)) {
                                      tutorForm.setValue("subjects", [...currentSubjects, service]);
                                      
                                      // Initialize cost to 0 if not already set
                                      if (currentServiceCosts[service] === undefined) {
                                        const updatedCosts = { ...currentServiceCosts, [service]: 0 };
                                        tutorForm.setValue("serviceCosts", updatedCosts);
                                        setServiceCosts(updatedCosts);
                                      }
                                    }
                                  } else {
                                    // Remove the service and any subcategories
                                    const filteredSubjects = currentSubjects.filter(
                                      subject => !subjectBelongsToService(subject, service)
                                    );
                                    tutorForm.setValue("subjects", filteredSubjects);
                                    
                                    // Remove cost for this service
                                    const { [service]: _, ...restCosts } = currentServiceCosts;
                                    tutorForm.setValue("serviceCosts", restCosts);
                                    setServiceCosts(restCosts);
                                    
                                    // Also remove costs for any subcategories
                                    const subjectCostsToKeep = { ...subjectCosts };
                                    currentSubjects.forEach(subject => {
                                      if (subjectBelongsToService(subject, service) && subject !== service) {
                                        delete subjectCostsToKeep[subject];
                                      }
                                    });
                                    setSubjectCosts(subjectCostsToKeep);
                                  }
                                }}
                              />
                              <div className="space-y-1 leading-none flex-grow">
                                <Label 
                                  htmlFor={`service-${service}`}
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                  {service}
                                </Label>
                              </div>
                            </div>
                            
                            {isChecked && (
                              <div className="ml-6 flex items-center space-x-2">
                                <Label htmlFor={`cost-${service}`} className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                                  Cost (tokens):
                                </Label>
                                <div className="relative flex-grow">
                                  <Input
                                    id={`cost-${service}`}
                                    type="text"
                                    inputMode="numeric"
                                    min="0"
                                    placeholder="0"
                                    value={serviceCosts[service] === undefined || serviceCosts[service] === 0 ? "" : serviceCosts[service]}
                                    onChange={(e) => {
                                      // Allow empty string in the input field
                                      const inputValue = e.target.value;
                                      // Only update if it's a valid number or empty
                                      if (inputValue === "" || /^\d+$/.test(inputValue)) {
                                        const value = inputValue === "" ? 0 : parseInt(inputValue);
                                        const updatedCosts = { ...serviceCosts, [service]: value };
                                        setServiceCosts(updatedCosts);
                                        tutorForm.setValue("serviceCosts", updatedCosts);
                                      }
                                    }}
                                    className="h-7 text-xs bg-background/80 font-bold text-primary placeholder:font-normal placeholder:text-muted-foreground/60"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Subject Tutoring Subcategories */}
                    {tutorForm.watch("subjects")?.some(subject => 
                      subjectBelongsToService(subject, "Subject Tutoring")
                    ) && (
                      <div className="mt-4 border-t border-border/30 pt-4">
                        <Label className="text-sm font-medium mb-2 block">Subject Tutoring Areas</Label>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {tutorForm.watch("subjects")
                            ?.filter(subject => subjectBelongsToService(subject, "Subject Tutoring") && subject !== "Subject Tutoring")
                            .map((subject) => {
                              const subjectName = extractSubcategory(subject, "Subject Tutoring");
                              return (
                                <div key={subject} className="flex flex-col gap-1">
                                  <Badge 
                                    variant="secondary"
                                    className="flex items-center gap-1 bg-primary/10 text-primary border-primary/20"
                                  >
                                    {subjectName}
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
                                      onClick={() => {
                                        const currentSubjects = tutorForm.getValues("subjects") || [];
                                        const filteredSubjects = currentSubjects.filter(s => s !== subject);
                                        tutorForm.setValue("subjects", filteredSubjects);
                                      }}
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </Badge>
                                </div>
                              );
                            })}
                        </div>
                        <div className="flex items-center gap-2">
                          <Input 
                            placeholder="Add subjects (comma-separated, e.g. Mathematics, Physics)"
                            value={newSubjectTutoring}
                            onChange={(e) => setNewSubjectTutoring(e.target.value)}
                            className="flex-1 h-9 bg-background/80"
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-9 border-primary/30 hover:bg-primary/5"
                            onClick={() => {
                              if (newSubjectTutoring.trim()) {
                                handleAddMultipleSubjects(newSubjectTutoring, "Subject Tutoring - ");
                                setNewSubjectTutoring("");
                              }
                            }}
                          >
                            <Plus className="h-4 w-4 mr-1" /> Add
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          You can enter multiple subjects separated by commas
                        </p>
                      </div>
                    )}
                    
                    {/* UK Admissions Tests Subcategories */}
                    {tutorForm.watch("subjects")?.some(subject => 
                      subjectBelongsToService(subject, "UK Admissions tests")
                    ) && (
                      <div className="mt-4 border-t border-border/30 pt-4">
                        <Label className="text-sm font-medium mb-2 block">UK Admissions Tests</Label>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {tutorForm.watch("subjects")
                            ?.filter(subject => subjectBelongsToService(subject, "UK Admissions tests") && subject !== "UK Admissions tests")
                            .map((subject) => {
                              const testName = extractSubcategory(subject, "UK Admissions tests");
                              return (
                                <div key={subject} className="flex flex-col gap-1">
                                  <Badge 
                                    variant="secondary"
                                    className="flex items-center gap-1 bg-primary/10 text-primary border-primary/20"
                                  >
                                    {testName}
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
                                      onClick={() => {
                                        const currentSubjects = tutorForm.getValues("subjects") || [];
                                        const filteredSubjects = currentSubjects.filter(s => s !== subject);
                                        tutorForm.setValue("subjects", filteredSubjects);
                                      }}
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </Badge>
                                </div>
                              );
                            })}
                        </div>
                        <div className="flex items-center gap-2">
                          <Input 
                            placeholder="Add tests (comma-separated, e.g. BMAT, LNAT, TSA)"
                            value={newUKAdmissionsTest}
                            onChange={(e) => setNewUKAdmissionsTest(e.target.value)}
                            className="flex-1 h-9 bg-background/80"
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-9 border-primary/30 hover:bg-primary/5"
                            onClick={() => {
                              if (newUKAdmissionsTest.trim()) {
                                handleAddMultipleSubjects(newUKAdmissionsTest, "UK Admissions tests - ");
                                setNewUKAdmissionsTest("");
                              }
                            }}
                          >
                            <Plus className="h-4 w-4 mr-1" /> Add
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          You can enter multiple tests separated by commas
                        </p>
                      </div>
                    )}
                    
                    {/* Display selected services */}
                    {Array.isArray(tutorForm.watch("subjects")) && tutorForm.watch("subjects")!.length > 0 && (
                      <div className="mt-4 pt-2">
                        <p className="text-xs text-muted-foreground mb-2">Selected services:</p>
                        <ScrollArea className="h-24 rounded-md border border-border/40 p-2">
                          <div className="space-y-1">
                            {(tutorForm.watch("subjects") || []).map((subject) => (
                              <div key={subject} className="text-xs flex items-center justify-between group">
                                <div className="flex items-center">
                                  <Tag className="h-3 w-3 mr-2 text-primary" strokeWidth={2} />
                                  {subject}
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => {
                                    const currentSubjects = tutorForm.getValues("subjects") || [];
                                    const filteredSubjects = currentSubjects.filter(s => s !== subject);
                                    tutorForm.setValue("subjects", filteredSubjects);
                                  }}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={profileLoading} className="shadow-md hover:shadow-lg bg-primary hover:bg-primary/90 transition-all hover:translate-y-[-2px]">
                    {profileLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          ) : (
            // Student profile form - With new educational fields
            <Form {...studentForm}>
              <form onSubmit={studentForm.handleSubmit(onStudentSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={studentForm.control}
                    name="first_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John" {...field} className="bg-background/80 backdrop-blur-sm border-border/40 shadow-sm focus-visible:border-primary/30 focus-visible:ring-1 focus-visible:ring-primary/20 transition-all" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={studentForm.control}
                    name="last_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Doe" {...field} className="bg-background/80 backdrop-blur-sm border-border/40 shadow-sm focus-visible:border-primary/30 focus-visible:ring-1 focus-visible:ring-primary/20 transition-all" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={studentForm.control}
                  name="intended_universities"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Intended Universities</FormLabel>
                      <FormControl>
                        <Input placeholder="Oxford, Cambridge, Harvard..." {...field} className="bg-background/80 backdrop-blur-sm border-border/40 shadow-sm focus-visible:border-primary/30 focus-visible:ring-1 focus-visible:ring-primary/20 transition-all" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={studentForm.control}
                  name="intended_major"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Intended Major</FormLabel>
                      <FormControl>
                        <Input placeholder="Computer Science, Medicine, Engineering..." {...field} className="bg-background/80 backdrop-blur-sm border-border/40 shadow-sm focus-visible:border-primary/30 focus-visible:ring-1 focus-visible:ring-primary/20 transition-all" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={studentForm.control}
                  name="current_subjects"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Subjects</FormLabel>
                      <FormControl>
                        <Input placeholder="Mathematics, Physics, Chemistry, Biology..." {...field} className="bg-background/80 backdrop-blur-sm border-border/40 shadow-sm focus-visible:border-primary/30 focus-visible:ring-1 focus-visible:ring-primary/20 transition-all" />
                      </FormControl>
                      <p className="text-xs text-muted-foreground mt-1">
                        Enter subjects separated by commas (e.g., Math, Physics, Chemistry)
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={studentForm.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bio</FormLabel>
                      <FormControl>
                        <textarea 
                          className="flex min-h-[120px] w-full rounded-md border border-input bg-background/80 backdrop-blur-sm px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 shadow-sm focus-visible:border-primary/30 transition-all"
                          placeholder="Tell students about yourself..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end">
                  <Button type="submit" disabled={profileLoading} className="shadow-md hover:shadow-lg bg-primary hover:bg-primary/90 transition-all hover:translate-y-[-2px]">
                    {profileLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving Profile...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>

      <Card className="mb-6 bg-card/80 backdrop-blur-sm border-border/40 shadow-md hover:shadow-lg transition-all">
        <CardHeader>
          <CardTitle>Email Settings</CardTitle>
          <CardDescription>
            Update your email address
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isTutor ? (
            // Tutors cannot update email directly through this interface
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input 
                id="email" 
                type="email" 
                value={user?.email || ""} 
                disabled 
                className="bg-muted/50 border-border/40"
              />
              <p className="text-sm text-muted-foreground">
                Email updates for tutors are not currently supported through this interface.
                Please contact support to change your email address.
              </p>
            </div>
          ) : (
            // Students can update their email - Separate form
            <Form {...emailForm}>
              <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
                <FormField
                  control={emailForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="your@email.com" 
                          {...field} 
                          className="bg-background/80 backdrop-blur-sm border-border/40 shadow-sm focus-visible:border-primary/30 focus-visible:ring-1 focus-visible:ring-primary/20 transition-all"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {emailUpdateStatus === 'success' && (
                  <Alert className="bg-green-50 border-green-200 text-green-800">
                    <Mail className="h-4 w-4" />
                    <AlertDescription>
                      Email update request sent. Please check your new email for a verification link.
                    </AlertDescription>
                  </Alert>
                )}
                
                {emailUpdateStatus === 'error' && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      {emailError || "Failed to update email. Please try again."}
                    </AlertDescription>
                  </Alert>
                )}
                
                <div className="flex justify-end">
                  <Button 
                    type="submit" 
                    variant="outline"
                    disabled={emailLoading}
                    className="shadow-sm border-border/40 hover:bg-primary/5 hover:border-primary/30 transition-all"
                  >
                    {emailLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating Email...
                      </>
                    ) : (
                      <>
                        <Mail className="mr-2 h-4 w-4" />
                        Update Email
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>

      {/* Add Password Change Card */}
      <Card className="mb-6 bg-card/80 backdrop-blur-sm border-border/40 shadow-md hover:shadow-lg transition-all">
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>
            Update your account password
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
              <FormField
                control={passwordForm.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Password</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="Your current password" 
                        {...field} 
                        className="bg-background/80 backdrop-blur-sm border-border/40 shadow-sm focus-visible:border-primary/30 focus-visible:ring-1 focus-visible:ring-primary/20 transition-all"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={passwordForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="New password" 
                        {...field} 
                        className="bg-background/80 backdrop-blur-sm border-border/40 shadow-sm focus-visible:border-primary/30 focus-visible:ring-1 focus-visible:ring-primary/20 transition-all"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={passwordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="Confirm new password" 
                        {...field} 
                        className="bg-background/80 backdrop-blur-sm border-border/40 shadow-sm focus-visible:border-primary/30 focus-visible:ring-1 focus-visible:ring-primary/20 transition-all"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {passwordUpdateStatus === 'success' && (
                <Alert className="bg-green-50 border-green-200 text-green-800">
                  <AlertDescription>
                    Password updated successfully.
                  </AlertDescription>
                </Alert>
              )}
              
              {passwordUpdateStatus === 'error' && (
                <Alert variant="destructive">
                  <AlertDescription>
                    {passwordError || "Failed to update password. Please try again."}
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="flex justify-end">
                <Button 
                  type="submit" 
                  variant="outline"
                  disabled={passwordLoading}
                  className="shadow-sm border-border/40 hover:bg-primary/5 hover:border-primary/30 transition-all"
                >
                  {passwordLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating Password...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Update Password
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
} 