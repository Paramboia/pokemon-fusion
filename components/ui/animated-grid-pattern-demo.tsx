"use client";

import { AnimatedGridPattern } from "./animated-grid-pattern";

export function AnimatedGridPatternDemo() {
  return (
    <div className="relative h-[400px] w-full overflow-hidden rounded-lg border bg-background p-10">
      <AnimatedGridPattern
        className="fill-primary/20 stroke-primary/20"
        width={30}
        height={30}
        numSquares={30}
        maxOpacity={0.3}
        strokeDasharray="2 2"
      />
      <div className="relative z-10 flex h-full flex-col items-center justify-center">
        <h2 className="text-2xl font-bold">Animated Grid Pattern</h2>
        <p className="text-muted-foreground">
          A beautiful animated grid pattern for your background
        </p>
      </div>
    </div>
  );
} 