"use client";

import { Suspense, useState, useEffect, ReactNode, useRef } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useCachedData } from "@/hooks/useCachedData";

interface CachedDataWrapperProps<T> {
  children: (data: T) => ReactNode;
  cacheKey: string;
  fetchFn: () => Promise<T>;
  ttl?: number;
  loadingComponent?: ReactNode;
  errorComponent?: ReactNode | ((error: Error, retry: () => void) => ReactNode);
  emptyComponent?: ReactNode;
  emptyCheck?: (data: T) => boolean;
  initialFetchDelay?: number;
  dependencyArray?: any[];
}

/**
 * A wrapper component that handles data fetching with caching,
 * suspense, error handling, and stale-while-revalidate
 */
export function CachedDataWrapper<T>({
  children,
  cacheKey,
  fetchFn,
  ttl,
  loadingComponent,
  errorComponent,
  emptyComponent,
  emptyCheck = (data) => !data || (Array.isArray(data) && data.length === 0),
  initialFetchDelay = 0,
  dependencyArray = []
}: CachedDataWrapperProps<T>) {
  const {
    data,
    isLoading,
    error,
    refresh,
    lastUpdated
  } = useCachedData<T>(
    cacheKey,
    fetchFn,
    ttl,
    { initialFetchDelay, dependencyArray }
  );
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshRequestRef = useRef<number | null>(null);
  
  // Handle manual refresh with debounce
  const handleRefresh = async () => {
    if (isRefreshing) return;
    
    // Clear any existing refresh request
    if (refreshRequestRef.current !== null) {
      window.cancelAnimationFrame(refreshRequestRef.current);
      refreshRequestRef.current = null;
    }
    
    setIsRefreshing(true);
    
    // Use requestAnimationFrame to avoid refresh during render
    refreshRequestRef.current = window.requestAnimationFrame(async () => {
      try {
        await refresh(true); // Force refresh
      } catch (err) {
      } finally {
        setIsRefreshing(false);
        refreshRequestRef.current = null;
      }
    });
  };
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (refreshRequestRef.current !== null) {
        window.cancelAnimationFrame(refreshRequestRef.current);
      }
    };
  }, []);
  
  // Show loading state if no cached data and still loading
  if (!data && isLoading) {
    return loadingComponent || (
      <div className="flex flex-col items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary/70 mb-4" />
        <p className="text-muted-foreground text-sm">Loading data...</p>
      </div>
    );
  }
  
  // Show error state
  if (error) {
    if (typeof errorComponent === 'function') {
      return errorComponent(error, handleRefresh);
    }
    
    return errorComponent || (
      <Alert variant="destructive" className="my-4">
        <AlertTitle>Error loading data</AlertTitle>
        <AlertDescription className="flex flex-col gap-2">
          <p>{error.message}</p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            className="w-fit mt-2"
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Retrying...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </>
            )}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }
  
  // Show empty state
  if (data && emptyCheck(data) && emptyComponent) {
    return <>{emptyComponent}</>;
  }
  
  // Show data with refresh indicator
  return (
    <>
      {data && (
        <div className="relative">
          {isRefreshing && (
            <div className="absolute top-2 right-2 z-10">
              <div className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full flex items-center">
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                Refreshing...
              </div>
            </div>
          )}
          {children(data)}
        </div>
      )}
    </>
  );
}

/**
 * A wrapper for lists of data with caching
 */
export function CachedListWrapper<T>({
  title,
  emptyMessage = "No data available",
  ...props
}: CachedDataWrapperProps<T[]> & {
  title?: string;
  emptyMessage?: string;
}) {
  return (
    <CachedDataWrapper
      {...props}
      emptyComponent={
        <div className="text-center py-8">
          <h3 className="text-lg font-medium mb-2">{title || 'No Results'}</h3>
          <p className="text-muted-foreground">{emptyMessage}</p>
        </div>
      }
    />
  );
} 