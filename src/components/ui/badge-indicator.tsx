import { cn } from "@/lib/utils";

interface BadgeIndicatorProps {
  count: number;
  maxCount?: number;
  className?: string;
  size?: "sm" | "default" | "lg";
}

/**
 * Badge indicator component for showing notification counts
 */
export function BadgeIndicator({
  count,
  maxCount = 99,
  className,
  size = "default"
}: BadgeIndicatorProps) {
  if (count <= 0) return null;

  const displayCount = count > maxCount ? `${maxCount}+` : count.toString();
  
  const sizeClasses = {
    sm: "w-4 h-4 text-[10px]",
    default: "w-5 h-5 text-xs",
    lg: "w-6 h-6 text-sm"
  };

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-red-600 text-white font-medium shadow-sm",
        sizeClasses[size],
        className
      )}
    >
      {displayCount}
    </div>
  );
} 