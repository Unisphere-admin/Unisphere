'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

export default function AuthLoadingScreen() {
  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-lg font-medium text-muted-foreground">Loading your session...</p>
      </div>
    </div>
  );
} 