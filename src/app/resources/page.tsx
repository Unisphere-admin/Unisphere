"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Search,
  FileText,
  Download,
  X,
  Loader2,
  RefreshCw,
  Folder,
  FolderOpen,
  ChevronRight,
  Eye,
  Home
} from "lucide-react";
import { toast } from "sonner";
import { 
  ResourceItem,
  ResourceFile,
  ResourceFolder,
  getResources, 
  downloadResource,
  getFilePreviewUrl,
  searchResources, 
  formatFileSize 
} from "@/lib/db/resources";
import React from "react";

export default function ResourcesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentPath, setCurrentPath] = useState<string>('');
  const [pathHistory, setPathHistory] = useState<{name: string, path: string}[]>([{ name: 'Home', path: '' }]);
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [filteredResources, setFilteredResources] = useState<ResourceItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<ResourceFile | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloadingFile, setDownloadingFile] = useState<ResourceFile | null>(null);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  // Add CSS for hiding scrollbars
  useEffect(() => {
    // Add a style tag to hide scrollbars on elements with the scrollbar-hide class
    const style = document.createElement('style');
    style.textContent = `
      .scrollbar-hide::-webkit-scrollbar {
        display: none;
      }
      .scrollbar-hide {
        -ms-overflow-style: none;
        scrollbar-width: none;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Check if user has access
  useEffect(() => {
    if (!authLoading && (!user || (user.role !== 'tutor' && !user.has_access))) {
      router.push("/paywall");
    }
  }, [user, authLoading, router]);

  // Get path from URL query params and update current path
  useEffect(() => {
    const encodedPath = searchParams.get('path') || '';
    const path = decodeURIComponent(encodedPath);
    
    if (path !== currentPath) {
      setCurrentPath(path);
      
      // Build path history
      if (path === '') {
        setPathHistory([{ name: 'Home', path: '' }]);
      } else {
        const segments = path.split('/');
        const history = [{ name: 'Home', path: '' }];
        
        let currentSegmentPath = '';
        for (let i = 0; i < segments.length; i++) {
          if (segments[i]) {
            currentSegmentPath = currentSegmentPath 
              ? `${currentSegmentPath}/${segments[i]}`
              : segments[i];
            
            history.push({
              name: segments[i].replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
              path: currentSegmentPath
            });
          }
        }
        
        setPathHistory(history);
      }
      
      // Reset resources when path changes to trigger a new fetch
      setResources([]);
      setFilteredResources([]);
      setInitialLoad(true);
    }
  }, [searchParams, currentPath]);

  // Fetch resources from Supabase when path or user changes
  useEffect(() => {
    const fetchResources = async () => {
      if (user && (user.role === 'tutor' || user.has_access)) {
        try {
          setError(null);
          
          // Show loading state if this is the initial load or we're changing paths
          if (initialLoad) {
            setLoading(true);
          }
          
          const { items: fetchedResources, error } = await getResources(currentPath, false, { 
            onLoadingChange: (isLoading) => {
              // Only update loading state on initial load
              if (initialLoad) {
                setLoading(isLoading);
                if (!isLoading) {
                  setInitialLoad(false);
                }
              }
            } 
          });
          
          if (error) {
            throw error;
          }
          
          setResources(fetchedResources);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          setError(`Failed to load resources: ${errorMessage}`);
          toast.error(`Failed to load resources: ${errorMessage}`);
        } finally {
          // Ensure loading state is reset even if there's an error
          setLoading(false);
        }
      }
    };

    fetchResources();
  }, [user, initialLoad, currentPath]);

  // Handle manual refresh
  const handleRefresh = async () => {
    if (refreshing) return;
    
    try {
      setRefreshing(true);
      setError(null);
      
      const { items: freshResources, error } = await getResources(currentPath, true);
      
      if (error) {
        throw error;
      }
      
      setResources(freshResources);
      toast.success("Resources refreshed");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(`Failed to refresh resources: ${errorMessage}`);
      toast.error(`Failed to refresh resources: ${errorMessage}`);
    } finally {
      setRefreshing(false);
    }
  };

  // Filter resources based on search query
  useEffect(() => {
    setFilteredResources(searchResources(resources, searchQuery));
  }, [searchQuery, resources]);

  // Clean up when component unmounts
  useEffect(() => {
    return () => {
      // Clean up any open dialogs or pending downloads
      if (isPreviewOpen) {
        setIsPreviewOpen(false);
      }
      if (showDisclaimer) {
        setShowDisclaimer(false);
      }
      if (previewUrl) {
        // Revoke any object URLs to prevent memory leaks
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [isPreviewOpen, showDisclaimer, previewUrl]);

  // Improved folder navigation with error handling
  const navigateToFolder = (folderPath: string) => {
    try {
      // Reset any open dialogs
      setIsPreviewOpen(false);
      setShowDisclaimer(false);
      
      // Navigate to the new path
      router.push(`/resources?path=${encodeURIComponent(folderPath)}`);
    } catch (error) {
      toast.error("Failed to navigate to folder");
    }
  };

  // Navigate to breadcrumb path with error handling
  const navigateToBreadcrumb = (path: string) => {
    try {
      // Reset any open dialogs
      setIsPreviewOpen(false);
      setShowDisclaimer(false);
      
      if (path === '') {
        router.push('/resources');
      } else {
        router.push(`/resources?path=${encodeURIComponent(path)}`);
      }
    } catch (error) {
      toast.error("Failed to navigate to path");
    }
  };

  // Download file
  const handleDownload = async (filePath: string, fileName: string) => {
    try {
      setDownloading(filePath);
      
      const data = await downloadResource(filePath);
      
      if (!data) {
        throw new Error("Failed to download file");
      }

      // Create a URL for the file
      const url = URL.createObjectURL(data);
      
      // Create an anchor element and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${fileName}`);
    } catch (error) {
      toast.error("Failed to download file");
    } finally {
      setDownloading(null);
    }
  };

  // Show disclaimer before download
  const initiateDownload = (file: ResourceFile) => {
    setDownloadingFile(file);
    setDisclaimerAccepted(false); // Reset acceptance state for each download
    setShowDisclaimer(true);
  };

  // Track resource downloads for analytics
  const trackResourceDownload = async (resource: ResourceFile) => {
    try {
      // Simple analytics tracking
      const analyticsData = {
        resourceId: resource.id,
        resourceName: resource.displayName,
        resourcePath: resource.path,
        userId: user?.id,
        timestamp: new Date().toISOString(),
        category: resource.category || 'uncategorized',
        subject: resource.subject || 'general'
      };
      
      // In a real implementation, you would send this to your analytics endpoint
      // For now, we'll just log it to localStorage for demonstration
      const existingLogs = JSON.parse(localStorage.getItem('resource_downloads') || '[]');
      existingLogs.push(analyticsData);
      localStorage.setItem('resource_downloads', JSON.stringify(existingLogs));
      
      // In production, you would send this to your server
      // await fetch('/api/analytics/resource-download', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(analyticsData)
      // });
    } catch (error) {
      // Silently fail - analytics should not block user experience
    }
  };

  // Handle disclaimer acceptance
  const handleDisclaimerAccept = () => {
    if (!disclaimerAccepted || !downloadingFile) return;
    
    setShowDisclaimer(false);
    
    // Track the download
    if (downloadingFile) {
      trackResourceDownload(downloadingFile);
    }
    
    handleDownload(downloadingFile.path, downloadingFile.displayName);
    setDownloadingFile(null);
    // Don't store acceptance state between downloads
  };
  
  // Initiate download from preview dialog
  const initiateDownloadFromPreview = (file: ResourceFile) => {
    // Store the file for download before closing the preview
    const fileToDownload = {...file};
    
    // First close the preview dialog to avoid UI conflicts
    handleClosePreview();
    
    // Then after a short delay, show the disclaimer
    setTimeout(() => {
      initiateDownload(fileToDownload);
    }, 350); // Slightly longer delay for better UX
  };

  // Preview file
  const handlePreview = async (file: ResourceFile) => {
    try {
      // Set loading state first
      setIsPreviewLoading(true);
      setPreviewFile(file);
      
      // Then open the dialog
      setIsPreviewOpen(true);
      
      // Fetch the URL
      const url = await getFilePreviewUrl(file.path);
      
      if (!url) {
        throw new Error("Failed to generate preview URL");
      }
      
      // Only set the URL if the dialog is still open
      // This prevents issues if the user closes the dialog during loading
      if (isPreviewOpen) {
        setPreviewUrl(url);
      }
    } catch (error) {
      toast.error("Failed to preview file");
      setIsPreviewOpen(false);
      setPreviewFile(null);
    } finally {
      // Only update loading state if the dialog is still open
      if (isPreviewOpen) {
        setIsPreviewLoading(false);
      }
    }
  };

  // Handle iframe load event
  const handleIframeLoad = () => {
    setIsPreviewLoading(false);
  };

  // Close preview with proper cleanup
  const handleClosePreview = () => {
    // First close the dialog
    setIsPreviewOpen(false);
    
    // Then clean up resources after a short delay
    // This prevents visual glitches during the closing animation
    setTimeout(() => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewFile(null);
      setPreviewUrl(null);
    }, 300);
  };
  
  // Prevent event bubbling for card clicks
  const handleCardClick = (e: React.MouseEvent, resource: ResourceFile) => {
    e.preventDefault();
    e.stopPropagation();
    handlePreview(resource);
  };
  
  // Prevent event bubbling for button clicks
  const handleButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // If user is not authorized, show loading or redirect
  if (authLoading || (!user || (user.role !== 'tutor' && !user.has_access))) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container px-4 sm:px-6 py-4 sm:py-8">
      <div className="mb-4 sm:mb-8 space-y-3 sm:space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl sm:text-3xl font-bold">Resources</h1>
          {currentPath && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                // Navigate up one level by removing the last segment from the path
                const pathParts = currentPath.split('/');
                pathParts.pop();
                const parentPath = pathParts.join('/');
                navigateToBreadcrumb(parentPath);
              }}
              className="flex gap-2 items-center"
            >
              <ChevronRight className="h-4 w-4 rotate-180" />
              Back
            </Button>
          )}
        </div>
        
        {/* Breadcrumb navigation */}
        <Breadcrumb className="mb-2 sm:mb-4">
          <BreadcrumbList className="overflow-x-auto flex-nowrap pb-1 max-w-full scrollbar-hide">
            {pathHistory.map((item, index) => (
              <React.Fragment key={item.path}>
                <BreadcrumbItem className="flex-shrink-0">
                  <BreadcrumbLink 
                    onClick={() => navigateToBreadcrumb(item.path)}
                    className="flex items-center whitespace-nowrap py-1 px-1 hover:bg-muted/50 rounded-md transition-colors"
                  >
                    {index === 0 && <Home className="h-4 w-4 mr-1" />}
                    <span className="truncate max-w-[80px] xs:max-w-[120px] sm:max-w-none">{item.name}</span>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                {index < pathHistory.length - 1 && (
                  <BreadcrumbSeparator className="flex-shrink-0">
                    <ChevronRight className="h-4 w-4" />
                  </BreadcrumbSeparator>
                )}
              </React.Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
        
        <p className="text-muted-foreground">
          Browse and download learning resources
        </p>
      </div>

      {/* Search section */}
      <div className="mb-6">
        <div className="relative w-full max-w-md mx-auto md:mx-0">
          <Search className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search resources..."
            className="pl-9 pr-9 py-2 h-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-3 h-4 w-4 text-muted-foreground hover:text-foreground"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-destructive/15 border border-destructive text-destructive px-3 py-2 sm:px-4 sm:py-3 rounded-md mb-4 sm:mb-6 text-sm sm:text-base">
          <p className="flex items-center">
            <X className="h-4 w-4 mr-2 flex-shrink-0" />
            <span>{error}</span>
          </p>
          <p className="text-xs sm:text-sm mt-1 pl-6">
            Try refreshing the page or navigating to a different folder.
          </p>
          {/* <div className="mt-2 pl-6">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh} 
              disabled={refreshing}
              className="text-xs h-8"
            >
              {refreshing ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3 mr-1" />
              )}
              Retry
            </Button>
          </div> */}
        </div>
      )}

      {/* Resources grid */}
      {loading ? (
        <div className="flex flex-col justify-center items-center py-8 sm:py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
          <p className="text-sm text-muted-foreground">Loading resources...</p>
        </div>
      ) : filteredResources.length === 0 ? (
        <div className="text-center py-8 sm:py-12 px-4">
          <FileText className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
          <h3 className="text-lg sm:text-xl font-semibold">
            {error ? "Error loading resources" : "No resources found"}
          </h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            {error 
              ? "Check the console for more details" 
              : currentPath 
                ? "This folder is empty or you don't have permission to view its contents" 
                : "Try adjusting your search or navigating to a different folder"
            }
          </p>
          {currentPath && (
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => navigateToBreadcrumb('')}
            >
              <Home className="h-4 w-4 mr-2" />
              Return to Home
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {/* Folders first */}
          {filteredResources.map(resource => {
            if ('isFolder' in resource) {
              // Folder card
              return (
                <Card 
                  key={resource.id} 
                  className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer active:bg-muted/50 touch-manipulation"
                  onClick={() => navigateToFolder(resource.path)}
                >
                  <CardContent className="p-0">
                    <div className="p-3 sm:p-4 flex flex-col h-full">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center">
                          <FolderOpen className="h-5 w-5 text-amber-500 mr-2 flex-shrink-0" />
                          <h3 className="font-medium line-clamp-2">{resource.displayName}</h3>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            } else {
              // For files
              return (
                <Card 
                  key={resource.id} 
                  className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                  onClick={(e) => handleCardClick(e, resource)}
                >
                  <CardContent className="p-0">
                    <div className="p-4 flex flex-col h-full">
                      <div className="flex items-center mb-3">
                        <div className="p-1.5 bg-primary/10 rounded mr-3">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div className="overflow-hidden">
                          <h3 className="font-medium text-sm line-clamp-1">{resource.displayName}</h3>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(resource.size)}
                          </p>
                        </div>
                      </div>
                      
                      {resource.category && (
                        <Badge variant="outline" className="self-start mb-1 text-xs">
                          {resource.category}
                        </Badge>
                      )}
                      
                      {resource.subject && (
                        <p className="text-xs text-muted-foreground mb-3">
                          Subject: {resource.subject}
                        </p>
                      )}
                      
                      <div className="mt-auto flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 py-2 h-auto min-h-9 touch-manipulation"
                          onClick={(e) => handleCardClick(e, resource)}
                        >
                          <Eye className="h-4 w-4 mr-1 sm:mr-2" />
                          <span className="sm:inline">View</span>
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 py-2 h-auto min-h-9 touch-manipulation"
                          onClick={(e) => {
                            handleButtonClick(e);
                            initiateDownload(resource);
                          }}
                          disabled={downloading === resource.path}
                        >
                          {downloading === resource.path ? (
                            <Loader2 className="h-4 w-4 mr-1 sm:mr-2 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4 mr-1 sm:mr-2" />
                          )}
                          <span className="sm:inline">Download</span>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            }
          })}
          
          {/* Add refresh button at the bottom for mobile users
          {filteredResources.length > 0 && (
            <div className="col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-4 flex justify-center mt-6 mb-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
                className="text-xs sm:text-sm"
              >
                {refreshing ? (
                  <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                )}
                {refreshing ? "Refreshing..." : "Refresh Resources"}
              </Button>
            </div>
          )} */}
        </div>
      )}

      {/* PDF Preview Dialog */}
      <Dialog 
        open={isPreviewOpen} 
        onOpenChange={(open) => {
          if (!open) handleClosePreview();
        }}
      >
        <DialogContent 
          className="max-w-4xl w-[95vw] h-[80vh] max-h-[85vh] flex flex-col"
          onInteractOutside={(e) => {
            // Prevent closing when interacting with iframe
            e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center text-base sm:text-lg pr-6">
              <FileText className="h-5 w-5 mr-2 flex-shrink-0" />
              <span className="line-clamp-1">{previewFile?.displayName}</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 relative mt-2 sm:mt-4 border rounded-md overflow-hidden">
            {isPreviewLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
            
            {previewUrl && (
              <iframe
                ref={iframeRef}
                src={previewUrl}
                className="w-full h-full"
                onLoad={handleIframeLoad}
                title={previewFile?.displayName || "PDF Preview"}
              />
            )}
          </div>
          
          <div className="flex justify-between items-center mt-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleClosePreview}
            >
              Close
            </Button>
            
            {previewFile && (
              <Button
                variant="default"
                size="sm"
                onClick={(e) => {
                  handleButtonClick(e);
                  initiateDownloadFromPreview(previewFile);
                }}
                className="flex items-center"
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Download Disclaimer Dialog */}
      <Dialog 
        open={showDisclaimer} 
        onOpenChange={(open) => {
          if (!open) {
            setShowDisclaimer(false);
            setDownloadingFile(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md max-w-[95vw] p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-center">Download Agreement</DialogTitle>
            <DialogDescription className="text-center">
              Please read and accept the following terms before downloading this resource.
            </DialogDescription>
          </DialogHeader>
          
          {downloadingFile && (
            <div className="bg-primary/5 border border-primary/20 rounded-md p-3 flex items-center gap-3 mb-3">
              <FileText className="h-8 w-8 text-primary flex-shrink-0" />
              <div className="overflow-hidden">
                <p className="font-medium text-sm line-clamp-1">{downloadingFile.displayName}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(downloadingFile.size)}</p>
              </div>
            </div>
          )}
          
          <div className="py-3 sm:py-4">
            <div className="bg-muted/50 p-3 sm:p-4 rounded-md text-sm mb-4">
              <p className="font-medium mb-2">By downloading this resource, you agree to:</p>
              <ul className="list-disc pl-4 sm:pl-5 space-y-1">
                <li>Use this material for personal educational purposes only</li>
                <li>Not distribute, share, or publish this content</li>
                <li>Not upload this content to other platforms</li>
                <li>Not use this content for commercial purposes</li>
              </ul>
            </div>
            
            <div className="flex items-start space-x-2 sm:space-x-3">
              <Checkbox 
                id="disclaimer-checkbox" 
                checked={disclaimerAccepted}
                onCheckedChange={(checked) => setDisclaimerAccepted(checked === true)}
                className="mt-0.5"
              />
              <label 
                htmlFor="disclaimer-checkbox" 
                className="text-sm font-medium leading-tight peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                I agree not to distribute or share this content with others
              </label>
            </div>
          </div>
          
          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={() => setShowDisclaimer(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleDisclaimerAccept}
              disabled={!disclaimerAccepted}
              className="w-full sm:w-auto"
            >
              Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 