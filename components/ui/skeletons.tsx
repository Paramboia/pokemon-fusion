import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function PokemonCardSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn("animate-pulse", className)}>
      <div className="relative w-[150px] h-[150px] border-4 border-gray-200 rounded-full p-2">
        <div className="w-full h-full bg-gray-200 rounded-full" />
      </div>
    </div>
  );
}

export function FusionCardSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn("bg-white rounded-lg shadow-md overflow-hidden", className)}>
      <div className="w-full h-64 bg-gray-200 animate-pulse" />
      <div className="p-4">
        <div className="h-6 w-3/4 bg-gray-200 rounded animate-pulse mb-2" />
        <div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse" />
      </div>
    </div>
  );
} 