"use client";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface FlipWordsProps {
  words: string[];
  duration?: number;
  className?: string;
}

export const FlipWords = memo(function FlipWords({
  words,
  duration = 3000,
  className,
}: FlipWordsProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startAnimation = useCallback(() => {
    setIsAnimating(true);

    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % words.length);
      setIsAnimating(false);
    }, 400);
  }, [words.length]);

  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      startAnimation();
    }, duration);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [currentIndex, duration, startAnimation]);

  const currentWord = words[currentIndex];

  return (
    <span className={cn("inline-block relative", className)}>
      <span
        className={cn(
          "inline-flex",
          isAnimating ? "flip-words-exit" : "flip-words-enter"
        )}
      >
        {currentWord.split("").map((letter, i) => (
          <span
            key={`${currentIndex}-${i}`}
            className="inline-block opacity-0"
            style={{
              animationName: isAnimating
                ? "flipWordLetterExit"
                : "flipWordLetterEnter",
              animationDuration: "0.3s",
              animationTimingFunction: isAnimating ? "ease-in" : "ease-out",
              animationFillMode: "forwards",
              animationDelay: isAnimating
                ? `${i * 0.02}s`
                : `${i * 0.04}s`,
            }}
          >
            {letter === " " ? "\u00A0" : letter}
          </span>
        ))}
      </span>
    </span>
  );
});
