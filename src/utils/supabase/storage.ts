import { createClient } from './client';
import { v4 as uuidv4 } from 'uuid';

const AVATARS_BUCKET = 'avatars';
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

/**
 * Interface for upload options
 */
interface UploadOptions {
  maxSizeMB?: number;
  upsert?: boolean;
  acceptedFileTypes?: string[];
}

/**
 * Interface for upload result
 */
interface UploadResult {
  path: string | null;
  error: string | null;
}

/**
 * Upload an avatar image for a user
 * @param userId User ID
 * @param file File to upload
 * @param options Upload options
 * @returns Object with path to the uploaded file or an error
 */
export async function uploadAvatar(
  userId: string,
  file: File,
  options: UploadOptions = {}
): Promise<UploadResult> {
  try {
    // Validate file
    if (!file) {
      return { path: null, error: 'No file provided' };
    }

    // Check file size
    const maxSize = options.maxSizeMB ? options.maxSizeMB * 1024 * 1024 : MAX_FILE_SIZE;
    if (file.size > maxSize) {
      return { 
        path: null, 
        error: `File too large. Maximum size is ${options.maxSizeMB || 2}MB` 
      };
    }

    // Check file type if specified
    if (options.acceptedFileTypes && options.acceptedFileTypes.length > 0) {
      const fileType = file.type;
      if (!options.acceptedFileTypes.includes(fileType)) {
        return { 
          path: null, 
          error: `Invalid file type. Accepted types: ${options.acceptedFileTypes.join(', ')}` 
        };
      }
    }

    // Create Supabase client with auth headers (including CSRF token)
    const supabase = createClient();

    // Generate a unique filename with the original extension
    const fileExt = file.name.split('.').pop() || '';
    const fileName = `${userId}/${uuidv4()}.${fileExt}`;

    // Upload the file with authorization
    const { data, error } = await supabase.storage
      .from(AVATARS_BUCKET)
      .upload(fileName, file, {
        upsert: options.upsert || false,
        contentType: file.type,
      });

    if (error) {
      console.error('Error uploading avatar:', error);
      return { path: null, error: error.message };
    }

    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from(AVATARS_BUCKET)
      .getPublicUrl(data.path);

    return { path: publicUrl, error: null };
  } catch (error) {
    console.error('Unexpected error uploading avatar:', error);
    return { 
      path: null, 
      error: error instanceof Error ? error.message : 'Unknown error during upload' 
    };
  }
}

/**
 * Remove an avatar image for a user
 * @param userId User ID
 * @param fileName File name to remove
 * @returns Object indicating success or error
 */
export async function removeAvatar(
  userId: string,
  fileName: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    // Create Supabase client
    const supabase = createClient();

    // Make sure the file belongs to the user - security check
    if (!fileName.startsWith(`${userId}/`)) {
      return { 
        success: false, 
        error: 'Not authorized to delete this file' 
      };
    }

    // Remove the file
    const { error } = await supabase.storage
      .from(AVATARS_BUCKET)
      .remove([fileName]);

    if (error) {
      console.error('Error removing avatar:', error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('Unexpected error removing avatar:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error during removal' 
    };
  }
}

/**
 * Get the public URL for an avatar
 * @param path The path to the avatar in storage
 * @returns The public URL to the avatar
 */
export function getAvatarUrl(path: string): string {
  const supabase = createClient();
  const { data: { publicUrl } } = supabase.storage
    .from(AVATARS_BUCKET)
    .getPublicUrl(path);
  
  return publicUrl;
} 