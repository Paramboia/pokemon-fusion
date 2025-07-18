"use client"

import { useState, useEffect } from 'react';
import { Check, Loader2, X } from 'lucide-react';
import { FusionStep, StepState } from '@/types/fusion';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { AlternatingText } from '@/components/ui/alternating-text';
import Image from 'next/image';

interface FusionStepsCardProps {
  steps: FusionStep[];
  currentStep: number;
  className?: string;
}

interface StepItemProps {
  step: FusionStep;
  isActive: boolean;
  icon: React.ReactNode;
  isLast: boolean;
  isDesktop?: boolean;
}

// CSS for dotted lines
const dotStyles = `
  .dotted-line-horizontal {
    background: linear-gradient(to right, #9CA3AF 30%, transparent 30%);
    background-size: 4px 1px;
    background-repeat: repeat-x;
  }
  
  .dotted-line-vertical {
    background: linear-gradient(to bottom, #9CA3AF 30%, transparent 30%);
    background-size: 1px 4px;
    background-repeat: repeat-y;
  }
`;

const StepItem = ({ step, isActive, icon, isLast, isDesktop }: StepItemProps) => {
  const getStepStatusIcon = () => {
    switch (step.state) {
      case 'completed':
        return <Check className="w-5 h-5 text-white" />;
      case 'failed':
        return <X className="w-5 h-5 text-white" />;
      case 'loading':
        return <Loader2 className="w-5 h-5 animate-spin text-white" />;
      default:
        return icon;
    }
  };

  const getStepBackgroundColor = () => {
    switch (step.state) {
      case 'completed':
        return 'bg-green-500 border-green-500';
      case 'failed':
        return 'bg-red-500 border-red-500';
      case 'loading':
        return 'bg-blue-500 border-blue-500';
      default:
        return 'bg-gray-400 border-gray-400';
    }
  };

  const getStepTextColor = () => {
    switch (step.state) {
      case 'completed':
        return 'text-green-700';
      case 'failed':
        return 'text-red-700';
      case 'loading':
        return 'text-blue-700';
      default:
        return 'text-gray-600';
    }
  };

  const getStepMessage = () => {
    switch (step.state) {
      case 'completed':
        return 'Completed!';
      case 'failed':
        return step.error || 'Failed';
      case 'loading':
        return 'In progress...';
      default:
        return 'Waiting...';
    }
  };

  return (
    <div className={cn(
      "relative flex items-center",
      isDesktop ? "flex-col text-center flex-1" : "flex-row text-left"
    )}>
      {/* Step Circle */}
      <div className={cn(
        "relative z-10 w-14 h-14 rounded-full border-3 flex items-center justify-center transition-all duration-300",
        getStepBackgroundColor(),
        isActive && "ring-4 ring-blue-200 ring-opacity-50 scale-110"
      )}>
        <div className="text-white">
          {getStepStatusIcon()}
        </div>
      </div>

      {/* Connecting Line */}
      {!isLast && (
        <div className={cn(
          "absolute transition-all duration-500",
          isDesktop ? (
            // Desktop: horizontal line to next step, starting from the edge of current circle
            "top-7 left-14 h-0.25 w-full z-0"
          ) : (
            // Mobile: vertical line below current step, starting from the edge of current circle
            "top-14 left-7 w-0.25 h-12 z-0"
          )
        )}>
          {/* Dotted line - no solid base needed */}
          <div className={cn(
            "absolute inset-0",
            isDesktop ? "dotted-line-horizontal" : "dotted-line-vertical"
          )} />
        </div>
      )}

      {/* Step Content */}
      <div className={cn(
        "flex-1 transition-all duration-300",
        isDesktop ? "mt-4" : "ml-4"
      )}>
        <h3 className={cn(
          "font-semibold text-lg transition-colors duration-300",
          getStepTextColor()
        )}>
          {step.name}
        </h3>
        <p className={cn(
          "text-sm mt-1 transition-colors duration-300",
          getStepTextColor()
        )}>
          {getStepMessage()}
        </p>
      </div>
    </div>
  );
};

export function FusionStepsCard({ steps, currentStep, className }: FusionStepsCardProps) {
  const [animatedSteps, setAnimatedSteps] = useState<FusionStep[]>(steps);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    setAnimatedSteps(steps);
    
    // Inject CSS styles
    if (typeof document !== 'undefined') {
      const existingStyle = document.getElementById('fusion-steps-styles');
      if (!existingStyle) {
        const styleElement = document.createElement('style');
        styleElement.id = 'fusion-steps-styles';
        styleElement.textContent = dotStyles;
        document.head.appendChild(styleElement);
      }
    }
  }, [steps]);

  // Dynamic loading messages
  const loadingMessages = [
    "Please wait while we create your fusion...",
    "AI is still cooking...",
    "Mixing DNA sequences...",
    "Training neural networks...",
    "Channeling Pokémon energy...",
    "Almost there...",
    "Creating something magical...",
    "Thank you for your patience..."
  ];

  // Icons for each step - using custom icons
  const stepIcons = {
    'capturing': (
      <Image 
        src="/icon/icon_capturing.png" 
        alt="Capturing" 
        width={24} 
        height={24} 
        className="w-6 h-6"
      />
    ),
    'merging': (
      <Image 
        src="/icon/icon_merging.png" 
        alt="Merging" 
        width={24} 
        height={24} 
        className="w-6 h-6"
      />
    ),
    'entering': (
      <Image 
        src="/icon/icon_pokedex.png" 
        alt="Pokédex" 
        width={24} 
        height={24} 
        className="w-6 h-6"
      />
    )
  };

  // Check if any step is active
  const hasActiveStep = animatedSteps.some(step => step.state === 'loading');

  return (
    <Card className={cn(
      "w-full mx-auto p-6 lg:p-8 shadow-xl border border-gray-200 dark:border-gray-700",
      "bg-white dark:bg-gray-800 rounded-2xl transition-all duration-300",
      // Desktop: slightly narrower than Pokemon selector width
      "max-w-md lg:max-w-3xl",
      className
    )}>
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl lg:text-3xl font-bold text-gray-800 dark:text-white mb-3">
          Generating Fusion
        </h2>
        <p className="text-gray-600 dark:text-gray-300 text-sm lg:text-base">
          {isMounted && hasActiveStep ? (
            <AlternatingText 
              messages={loadingMessages}
              interval={3000}
            />
          ) : (
            "Please wait while we create your fusion..."
          )}
        </p>
      </div>

      {/* Steps Container */}
      <div className="mb-8">
        {/* Desktop Layout */}
        <div className="hidden lg:flex lg:justify-between lg:items-start lg:relative lg:px-8">
          {animatedSteps.map((step, index) => (
            <StepItem
              key={step.id}
              step={step}
              isActive={index === currentStep}
              icon={stepIcons[step.id as keyof typeof stepIcons]}
              isLast={index === animatedSteps.length - 1}
              isDesktop={true}
            />
          ))}
        </div>

        {/* Mobile Layout */}
        <div className="lg:hidden space-y-6">
          {animatedSteps.map((step, index) => (
            <StepItem
              key={step.id}
              step={step}
              isActive={index === currentStep}
              icon={stepIcons[step.id as keyof typeof stepIcons]}
              isLast={index === animatedSteps.length - 1}
              isDesktop={false}
            />
          ))}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="pt-6 border-t border-gray-200 dark:border-gray-600">
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
            Progress
          </span>
          <span className="text-sm font-bold text-gray-800 dark:text-white">
            {Math.round((currentStep / Math.max(animatedSteps.length - 1, 1)) * 100)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
          <div 
            className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-700 ease-out shadow-sm"
            style={{ 
              width: `${(currentStep / Math.max(animatedSteps.length - 1, 1)) * 100}%` 
            }}
          />
        </div>
      </div>
    </Card>
  );
} 