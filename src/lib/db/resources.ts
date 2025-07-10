import { createClient } from "@/utils/supabase/client";

// Cache to store fetched resources
let resourceCache: Record<string, ResourceItem[]> = {};
let lastFetchTime: Record<string, number> = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export interface ResourceFile {
  id: string;
  name: string;
  displayName: string;
  size: number;
  type: string;
  created_at: string;
  updated_at: string;
  path: string;
  category?: string;
  subject?: string;
}

export interface ResourceFolder {
  id: string;
  name: string;
  displayName: string;
  path: string;
  created_at: string;
  updated_at: string;
  isFolder: true;
}

export type ResourceItem = ResourceFile | ResourceFolder;

/**
 * Parse file name to extract metadata
 * @param fileName Original file name
 * @returns Object with extracted displayName, category and subject
 */
export function parseFileName(fileName: string): { 
  displayName: string; 
  category?: string; 
  subject?: string;
} {
  // Remove file extension
  const nameWithoutExt = fileName.replace(/\.pdf$/i, '');

  // Try to extract category and subject from format like "Category_Subject_Title"
  const parts = nameWithoutExt.split('_');
  
  if (parts.length >= 3) {
    return {
      category: parts[0],
      subject: parts[1],
      displayName: parts.slice(2).join(' ').replace(/-/g, ' ')
    };
  } else if (parts.length === 2) {
    return {
      category: parts[0],
      displayName: parts[1].replace(/-/g, ' ')
    };
  }
  
  // If no structured naming, just clean up the display
  return {
    displayName: nameWithoutExt.replace(/-/g, ' ')
  };
}

/**
 * Format folder name for display
 * @param folderName Original folder name
 * @returns Formatted display name
 */
export function formatFolderName(folderName: string): string {
  // Remove trailing slash if present
  const name = folderName.endsWith('/') ? folderName.slice(0, -1) : folderName;
  
  // Get the last part of the path
  const parts = name.split('/');
  const lastPart = parts[parts.length - 1];
  
  // Replace hyphens and underscores with spaces and capitalize
  return lastPart
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
}

/**
 * Determines if an item is a folder based on Supabase storage response
 * @param item The storage item to check
 * @returns True if the item is a folder
 */
function isFolder(item: any): boolean {
  // Case 1: Standard folders have an ID ending with '/'
  if (item.id && typeof item.id === 'string' && item.id.endsWith('/')) {
    return true;
  }
  
  // Case 2: Some folders have null ID but have a name property without a file extension
  if (item.id === null && item.name && typeof item.name === 'string') {
    // Check if the name doesn't have a file extension (likely a folder)
    const hasFileExtension = /\.[a-zA-Z0-9]+$/.test(item.name);
    return !hasFileExtension;
  }
  
  return false;
}

/**
 * Get all resources from the resources bucket for a specific path
 * @param path The folder path to list (empty string for root)
 * @param forceRefresh Whether to force a refresh of the cache
 * @param options Additional options
 * @returns Object with resources and loading state
 */
export async function getResources(
  path: string = '',
  forceRefresh: boolean = false,
  options: { 
    onLoadingChange?: (loading: boolean) => void 
  } = {}
): Promise<{ items: ResourceItem[]; error: Error | null }> {
  const now = Date.now();
  const cacheKey = path;
  const isCacheValid = 
    resourceCache[cacheKey] && 
    lastFetchTime[cacheKey] && 
    (now - lastFetchTime[cacheKey] < CACHE_TTL);
  
  // Return cached data if valid and not forcing refresh
  if (!forceRefresh && isCacheValid) {
    return { items: resourceCache[cacheKey], error: null };
  }
  
  // Set loading state
  if (options.onLoadingChange) {
    options.onLoadingChange(true);
  }
  
  try {
    const supabase = createClient();
    
    // List all files from the resources bucket at the specified path
    const { data, error } = await supabase
      .storage
      .from('resources')
      .list(path, {
        sortBy: { column: 'name', order: 'asc' }
      });

    if (error) {
      throw error;
    }

    // Debug logging
    
    // Handle case where data is null or undefined
    if (!data) {
      return { items: [], error: null };
    }
    
    // Handle case where data is not an array
    if (!Array.isArray(data)) {
      return { items: [], error: null };
    }

    // Filter out any null or undefined items
    const validItems = data.filter(item => item !== null && item !== undefined);
    
    if (validItems.length === 0) {
    }
    
    // Process folders using the new isFolder helper
    const folders: ResourceFolder[] = validItems
      .filter(item => isFolder(item))
      .map(folder => {
        const displayName = formatFolderName(folder.name || '');
        const fullPath = path ? `${path}/${folder.name}` : folder.name;
        
        return {
          id: folder.id || `folder_${folder.name}`, // Generate an ID if null
          name: folder.name || '',
          displayName,
          path: fullPath,
          created_at: folder.created_at || '',
          updated_at: folder.updated_at || '',
          isFolder: true
        };
      });


    // Process files (PDFs only) - exclude folders
    const files: ResourceFile[] = validItems
      .filter(file => 
        !isFolder(file) && // Use the isFolder helper (negated)
        (
          (file.metadata?.mimetype === 'application/pdf') || 
          (file.name && typeof file.name === 'string' && file.name.toLowerCase().endsWith('.pdf'))
        )
      )
      .map(file => {
        const fileInfo = parseFileName(file.name || '');
        const fullPath = path ? `${path}/${file.name}` : file.name;
        
        return {
          id: file.id || `file_${file.name}`, // Generate an ID if null
          name: file.name || '',
          displayName: fileInfo.displayName || file.name || '',
          size: file.metadata?.size || 0,
          type: file.metadata?.mimetype || 'application/pdf',
          created_at: file.created_at || '',
          updated_at: file.updated_at || '',
          path: fullPath,
          category: fileInfo.category,
          subject: fileInfo.subject
        };
      });


    // Combine folders and files (folders first)
    const items = [...folders, ...files];

    // Update cache
    resourceCache[cacheKey] = items;
    lastFetchTime[cacheKey] = now;
    
    return { items, error: null };
  } catch (error) {
    return { items: [], error: error as Error };
  } finally {
    // Reset loading state
    if (options.onLoadingChange) {
      options.onLoadingChange(false);
    }
  }
}

/**
 * Get the URL for a file preview
 * @param filePath Path to the file in the bucket
 * @returns URL for preview or null on error
 */
export async function getFilePreviewUrl(filePath: string): Promise<string | null> {
  try {
    // For PDF files, we'll use Google's PDF viewer for better compatibility
    const fileExtension = filePath.split('.').pop()?.toLowerCase();
    
    // Get the direct download URL first
    const file = await downloadResource(filePath);
    if (!file) {
      return null;
    }
    
    // Create a blob URL
    const blobUrl = URL.createObjectURL(file);
    
    // For PDFs, we can use Google's PDF viewer for better cross-platform compatibility
    if (fileExtension === 'pdf') {
      // For production/Vercel environments, use Google PDF Viewer
      if (process.env.NODE_ENV === 'production' || typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
        // We need to create a temporary anchor with download attribute to get the file
        // This is a workaround for Vercel's serverless environment
        return `https://docs.google.com/viewer?url=${encodeURIComponent(window.location.origin + '/api/resources/view?path=' + encodeURIComponent(filePath))}&embedded=true`;
      }
    }
    
    // For local development or non-PDF files, use blob URL directly
    return blobUrl;
  } catch (error) {
    console.error('Error generating preview URL:', error);
    return null;
  }
}

/**
 * Download a resource from the bucket
 * @param filePath Path to the file in the bucket
 * @returns Blob of the file or null on error
 */
export async function downloadResource(filePath: string): Promise<Blob | null> {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase.storage
      .from('resources')
      .download(filePath);
    
    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    return null;
  }
}

/**
 * Filter resources based on a search query
 * @param resources List of resources to filter
 * @param query Search query
 * @returns Filtered list of resources
 */
export function searchResources(resources: ResourceItem[], query: string): ResourceItem[] {
  if (!query) return resources;
  
  const queryLower = query.toLowerCase();
  
  return resources.filter(resource => {
    // For folders, just search by name
    if ('isFolder' in resource) {
      return resource.displayName.toLowerCase().includes(queryLower);
    }
    
    // For files, search by name, category, and subject
    return (
      resource.displayName.toLowerCase().includes(queryLower) ||
      (resource.category?.toLowerCase().includes(queryLower) || false) ||
      (resource.subject?.toLowerCase().includes(queryLower) || false)
    );
  });
}

/**
 * Format file size in a human-readable way
 * @param bytes Size in bytes
 * @returns Formatted size string
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * Clear the resource cache
 * @param path Optional path to clear (if not provided, clears all cache)
 */
export function clearResourceCache(path?: string): void {
  if (path) {
    delete resourceCache[path];
    delete lastFetchTime[path];
  } else {
    resourceCache = {};
    lastFetchTime = {};
  }
} 