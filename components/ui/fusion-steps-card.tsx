"use client"

import { useState, useEffect } from 'react';
import { Check, Loader2, X, Camera, GitMerge, BookOpen } from 'lucide-react';
import { FusionStep, StepState } from '@/types/fusion';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

interface FusionStepsCardProps {
  steps: FusionStep[];
  currentStep: number;
  className?: string;
}

interface StepItemProps {
  step: FusionStep;
  isActive: boolean;
  icon: React.ReactNode;
}

const StepItem = ({ step, isActive, icon }: StepItemProps) => {
  const getStepStatusIcon = () => {
    switch (step.state) {
      case 'completed':
        return <Check className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <X className="w-4 h-4 text-red-600" />;
      case 'loading':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-600" />;
      default:
        return null;
    }
  };

  const getStepBackgroundColor = () => {
    switch (step.state) {
      case 'completed':
        return 'bg-green-100 border-green-200';
      case 'failed':
        return 'bg-red-100 border-red-200';
      case 'loading':
        return 'bg-blue-100 border-blue-200';
      default:
        return 'bg-gray-100 border-gray-200';
    }
  };

  const getStepTextColor = () => {
    switch (step.state) {
      case 'completed':
        return 'text-green-800';
      case 'failed':
        return 'text-red-800';
      case 'loading':
        return 'text-blue-800';
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
      "flex items-center p-4 rounded-lg border-2 transition-all duration-300 mb-3",
      getStepBackgroundColor(),
      isActive && "ring-2 ring-blue-400 ring-opacity-50"
    )}>
      {/* Step Icon Circle */}
      <div className={cn(
        "w-12 h-12 rounded-full flex items-center justify-center mr-4 transition-all duration-300",
        step.state === 'completed' ? 'bg-green-500' :
        step.state === 'failed' ? 'bg-red-500' :
        step.state === 'loading' ? 'bg-blue-500' : 'bg-gray-400'
      )}>
        <div className="text-white">
          {step.state === 'loading' || step.state === 'completed' || step.state === 'failed' ? 
            getStepStatusIcon() : icon
          }
        </div>
      </div>

      {/* Step Content */}
      <div className="flex-1">
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

  useEffect(() => {
    setAnimatedSteps(steps);
  }, [steps]);

  // Icons for each step
  const stepIcons = {
    'capturing': <Camera className="w-6 h-6" />,
    'merging': <GitMerge className="w-6 h-6" />,
    'entering': <BookOpen className="w-6 h-6" />
  };

  return (
    <Card className={cn(
      "w-full max-w-md mx-auto p-6 shadow-lg border border-gray-200 dark:border-gray-700",
      "bg-white dark:bg-gray-800 rounded-2xl transition-all duration-300",
      className
    )}>
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
          Generating Fusion
        </h2>
        <p className="text-gray-600 dark:text-gray-300 text-sm">
          Please wait while we create your fusion...
        </p>
      </div>

      {/* Steps */}
      <div className="space-y-0">
        {animatedSteps.map((step, index) => (
          <StepItem
            key={step.id}
            step={step}
            isActive={index === currentStep}
            icon={stepIcons[step.id as keyof typeof stepIcons]}
          />
        ))}
      </div>

      {/* Progress Bar */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600 dark:text-gray-300">Progress</span>
          <span className="text-sm font-semibold text-gray-800 dark:text-white">
            {Math.round((currentStep / Math.max(animatedSteps.length - 1, 1)) * 100)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div 
            className="bg-blue-500 h-2 rounded-full transition-all duration-500 ease-out"
            style={{ 
              width: `${(currentStep / Math.max(animatedSteps.length - 1, 1)) * 100}%` 
            }}
          />
        </div>
      </div>
    </Card>
  );
} 