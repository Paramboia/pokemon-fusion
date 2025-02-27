"use client";

import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

export function SearchInput({
  value,
  onChange,
  className,
  placeholder = "Search..."
}: SearchInputProps) {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      onChange(localValue);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [localValue, onChange]);

  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
      <input
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        className="w-full rounded-md border border-input bg-background px-9 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        placeholder={placeholder}
      />
    </div>
  );
} 