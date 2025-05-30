"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, ControllerRenderProps, FieldPath } from "react-hook-form";
import * as z from "zod";
import { Loader2, Save, Mail, AlertCircle, Upload, X, Camera, User, Trash2 } from "lucide-react";
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
const studentProfileSchema = baseProfileSchema.extend({});

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
  bio: z.string().max(500, "Bio must be less than 500 characters").optional(),
});

// Type for the form values
type StudentProfileFormValues = z.infer<typeof studentProfileSchema>;
type EmailFormValues = z.infer<typeof emailSchema>;
type TutorProfileFormValues = z.infer<typeof tutorProfileSchema>;

// Interface for the user profile data from API
interface UserProfile {
  id: string;
  first_name?: string;
  last_name?: string;
  description?: string; // For tutors (bio)
  bio?: string; // Alternative field name
  age?: string;
  avatar_url?: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [initialLoading, setInitialLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [emailUpdateStatus, setEmailUpdateStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [emailError, setEmailError] = useState("");
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [isEditingAvatar, setIsEditingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { token, fetchCsrfToken } = useCsrfToken();

  // Determine if the user is a tutor
  const isTutor = user?.role === "tutor";

  // Create form based on user role
  const studentForm = useForm<StudentProfileFormValues>({
    resolver: zodResolver(studentProfileSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
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
    },
  });

  // Helper function to ensure a valid authentication session
  const ensureAuthSession = useCallback(async () => {
    try {
      const supabase = createClient();
      
      // Check if we have a session and refresh it if needed
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error("Session error:", sessionError);
        setAuthError(true);
        return false;
      }
      
      // Check if token is about to expire and refresh if needed
      const expiresAt = session.expires_at ? new Date(session.expires_at * 1000) : null;
      const now = new Date();
      const timeLeft = expiresAt ? expiresAt.getTime() - now.getTime() : 0;
      
      // If less than 5 minutes left or expiry unknown, refresh the token
      if (!expiresAt || timeLeft < 5 * 60 * 1000) {
        const { error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError) {
          console.error("Failed to refresh session:", refreshError);
          setAuthError(true);
          return false;
        }
      }
      
      // Session is valid
      setAuthError(false);
      return true;
    } catch (error) {
      console.error("Auth error:", error);
      setAuthError(true);
      return false;
    }
  }, []);

  // Fetch the full profile data from the API - keep existing UI if refreshing
  const fetchProfileData = useCallback(async (silent = false) => {
    if (!user?.id) return;
    
    try {
      // Ensure we have a valid session before making API calls
      const isSessionValid = await ensureAuthSession();
      if (!isSessionValid) {
        if (!silent) {
          toast.error("Session expired. Please sign in again.");
          router.push("/login");
        }
        return;
      }
      
      if (!silent) {
        setProfileLoading(true);
      }
      
      // Only show loading indicator on initial load
      if (!hasLoadedOnce) {
        setInitialLoading(true);
      }
      
      // Fetch detailed profile data
      const response = await fetch(`/api/users/profile/${user.id}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
      });
      
      if (response.status === 401) {
        // Handle unauthorized errors specially
        setAuthError(true);
        if (!silent) {
          toast.error("Session expired. Please sign in again.");
          router.push("/login");
        }
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch profile data: ${response.status}`);
      }
      
      const data = await response.json();
      setProfileData(data.profile);
      setHasLoadedOnce(true);
    } catch (error) {
      console.error("Error fetching profile:", error);
      if (!silent) {
        toast.error("Failed to load profile data");
      }
    } finally {
      setProfileLoading(false);
      setInitialLoading(false);
    }
  }, [user?.id, hasLoadedOnce, ensureAuthSession, router]);

  // Handle session expiry and redirect if needed
  useEffect(() => {
    const checkAuth = async () => {
      if (authError) {
        await refreshUser(true).catch(err => {
          console.error("Failed to refresh user:", err);
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
      fetchProfileData();
    }
  }, [user, router, fetchProfileData]);

  // Set form values once profile data is loaded
  useEffect(() => {
    if (user && profileData) {
      const firstName = profileData.first_name || "";
      const lastName = profileData.last_name || "";
      
      if (isTutor) {
        tutorForm.reset({
          first_name: firstName,
          last_name: lastName,
          // Use the profile data values
          age: profileData.age || "",
          bio: profileData.description || profileData.bio || "",
        });
      } else {
        studentForm.reset({
          first_name: firstName,
          last_name: lastName,
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
      
      // Update profile data (name)
      const profileData = {
        first_name: data.first_name,
        last_name: data.last_name
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
      console.error("Error updating profile:", error);
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
      console.error("Error updating email:", emailError);
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

      const response = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": token || "",
        },
        body: JSON.stringify({
          first_name: data.first_name,
          last_name: data.last_name,
          age: data.age,
          bio: data.bio, // This will map to description in the database for tutors
        }),
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
      console.error("Error updating profile:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update profile");
    } finally {
      setProfileLoading(false);
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
          "X-CSRF-Token": token || "",
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
      console.error("Error uploading avatar:", error);
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

  // Show loading only on initial page load
  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
    <div className="container max-w-3xl py-8 relative">
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
            // Student profile form - Name only
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
                        Save Name Changes
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
    </div>
  );
} 