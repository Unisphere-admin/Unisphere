"use client";

import React, { useState, useRef } from 'react';
import AvatarEditorBase from 'react-avatar-editor';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw,
  Check,
  X
} from 'lucide-react';

interface AvatarEditorProps {
  image: string | File;
  onSave: (canvas: HTMLCanvasElement) => void;
  onCancel: () => void;
}

export function AvatarEditor({ image, onSave, onCancel }: AvatarEditorProps) {
  const [zoom, setZoom] = useState<number>(1.2);
  const [rotation, setRotation] = useState<number>(0);
  const editorRef = useRef<AvatarEditorBase | null>(null);

  const handleZoomChange = (value: number[]) => {
    setZoom(value[0]);
  };

  const handleRotate = () => {
    setRotation((prevRotation) => (prevRotation + 90) % 360);
  };

  const handleSave = () => {
    if (editorRef.current) {
      const canvas = editorRef.current.getImageScaledToCanvas();
      onSave(canvas);
    }
  };

  return (
    <div className="flex flex-col items-center">
      <div className="mb-4 border border-border rounded-md p-1 w-fit">
        <AvatarEditorBase
          ref={editorRef}
          image={image}
          width={250}
          height={250}
          border={0}
          borderRadius={125}
          color={[255, 255, 255, 0.6]} // RGBA
          scale={zoom}
          rotate={rotation}
          className="rounded-md"
        />
      </div>

      <div className="w-full max-w-xs mb-4 flex items-center gap-4">
        <ZoomOut className="h-4 w-4 text-muted-foreground" />
        <Slider
          value={[zoom]}
          min={1}
          max={3}
          step={0.01}
          onValueChange={handleZoomChange}
          className="flex-1"
        />
        <ZoomIn className="h-4 w-4 text-muted-foreground" />
      </div>

      <div className="flex gap-2 mb-4">
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleRotate}
          type="button"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Rotate
        </Button>
      </div>

      <div className="flex gap-2">
        <Button 
          variant="outline" 
          size="sm"
          onClick={onCancel}
          type="button"
        >
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button 
          size="sm"
          onClick={handleSave}
          type="button"
        >
          <Check className="h-4 w-4 mr-2" />
          Save
        </Button>
      </div>
    </div>
  );
} 