"use client";

interface LoadingLogoProps {
  message?: string;
  size?: "sm" | "md" | "lg";
}

export function LoadingLogo({ message = "Loading...", size = "md" }: LoadingLogoProps) {
  const sizeClasses = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-4xl",
  };

  const pulseSize = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      {/* Animated logo icon */}
      <div className="relative">
        {/* Outer ring - pulsing */}
        <div className={`${pulseSize[size]} rounded-full bg-gradient-to-br from-primary/30 to-primary/10 animate-pulse`} />
        
        {/* Inner ring - spinning */}
        <div className={`absolute inset-0 ${pulseSize[size]} rounded-full border-2 border-transparent border-t-primary animate-spin`} />
        
        {/* Center dot */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        </div>
      </div>

      {/* Brand name */}
      <div className={`font-semibold tracking-tight text-foreground ${sizeClasses[size]}`}>
        <span className="text-primary">Crowd</span>
        <span>Stack</span>
      </div>

      {/* Loading message */}
      {message && (
        <p className="text-sm text-foreground-muted animate-pulse">{message}</p>
      )}
    </div>
  );
}

