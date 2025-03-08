"use client";

import { Button } from "@/components/ui/button";
import { Wallet, AlertCircle } from "lucide-react";
import Link from "next/link";

interface CreditGateProps {
  title?: string;
  message?: string;
  buttonText?: string;
  redirectPath?: string;
  isError?: boolean;
}

export function CreditGate({ 
  title = "Credits Required",
  message = "You need credits to generate Pokémon fusions!",
  buttonText = "Get Credits",
  redirectPath = "/credits",
  isError = false
}: CreditGateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-4 text-center">
      <div className="p-8 bg-white dark:bg-gray-800 rounded-lg shadow-md max-w-md w-full">
        <div className="flex items-center justify-center mb-4">
          {isError ? (
            <AlertCircle className="h-10 w-10 text-red-500" />
          ) : (
            <Wallet className="h-10 w-10 text-gray-800 dark:text-gray-200" />
          )}
        </div>
        <h3 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-100">
          {title}
        </h3>
        <p className="text-gray-600 dark:text-gray-300 mb-8">
          {message}
        </p>
        <Link href={redirectPath} className="w-full block">
          <Button className="w-full py-2 text-base">
            {buttonText}
          </Button>
        </Link>
      </div>
    </div>
  );
} 