"use client";

import { SignInButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { HTMLAttributes } from "react";

interface AuthCtaButtonProps extends HTMLAttributes<HTMLButtonElement> {
  ctaText?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

export function AuthCtaButton({ 
  ctaText = "Sign in", 
  className,
  variant = "default",
  size = "default",
  ...props 
}: AuthCtaButtonProps) {
  return (
    <SignInButton mode="modal">
      <Button 
        className={className} 
        variant={variant}
        size={size}
        {...props}
      >
        {ctaText}
      </Button>
    </SignInButton>
  );
} 