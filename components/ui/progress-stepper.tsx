"use client"

import { useState, useEffect } from 'react';
import { Check, Loader2, X } from 'lucide-react';
import { FusionStep, StepState } from '@/types/fusion';
import { cn } from '@/lib/utils';

interface ProgressStepperProps {
  steps: FusionStep[];
  currentStep: number;
  className?: string;
}

export function ProgressStepper({ steps, currentStep, className }: ProgressStepperProps) {
  const [animatedSteps, setAnimatedSteps] = useState<FusionStep[]>(steps);

  useEffect(() => {
    setAnimatedSteps(steps);
  }, [steps]);

  const getStepIcon = (step: FusionStep, index: number) => {
    switch (step.state) {
      case 'completed':
        return <Check className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <X className="w-4 h-4 text-red-600" />;
      case 'loading':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-600" />;
      default:
        return (
          <div className="w-4 h-4 rounded-full border-2 border-gray-300 bg-white" />
        );
    }
  };

  const getStepBorderColor = (step: FusionStep) => {
    switch (step.state) {
      case 'completed':
        return 'border-green-500';
      case 'failed':
        return 'border-red-500';
      case 'loading':
        return 'border-blue-500';
      default:
        return 'border-gray-300';
    }
  };

  const getStepBackgroundColor = (step: FusionStep) => {
    switch (step.state) {
      case 'completed':
        return 'bg-green-50';
      case 'failed':
        return 'bg-red-50';
      case 'loading':
        return 'bg-blue-50';
      default:
        return 'bg-gray-50';
    }
  };

  const getStepTextColor = (step: FusionStep) => {
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

  const getConnectorColor = (stepIndex: number) => {
    if (stepIndex >= animatedSteps.length - 1) return 'bg-gray-200';
    
    const currentStepCompleted = animatedSteps[stepIndex].state === 'completed';
    const nextStepStarted = animatedSteps[stepIndex + 1].state !== 'pending';
    
    if (currentStepCompleted && nextStepStarted) {
      return 'bg-green-500';
    } else if (currentStepCompleted) {
      return 'bg-blue-500';
    } else {
      return 'bg-gray-200';
    }
  };

  return (
    <div className={cn("w-full max-w-2xl mx-auto", className)}>
      <div className="flex items-center justify-between">
        {animatedSteps.map((step, index) => (
          <div key={step.id} className="flex items-center flex-1">
            {/* Step Circle */}
            <div className="flex flex-col items-center">
              <div className={cn(
                "w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-300",
                getStepBorderColor(step),
                getStepBackgroundColor(step)
              )}>
                {getStepIcon(step, index)}
              </div>
              
              {/* Step Label */}
              <div className="mt-2 text-center">
                <p className={cn(
                  "text-sm font-medium transition-colors duration-300",
                  getStepTextColor(step)
                )}>
                  {step.name}
                </p>
                
                {/* Step Status */}
                {step.state === 'loading' && (
                  <p className="text-xs text-blue-600 mt-1">In progress...</p>
                )}
                {step.state === 'completed' && (
                  <p className="text-xs text-green-600 mt-1">Completed</p>
                )}
                {step.state === 'failed' && (
                  <p className="text-xs text-red-600 mt-1">
                    {step.error || 'Failed'}
                  </p>
                )}
                {step.state === 'pending' && (
                  <p className="text-xs text-gray-500 mt-1">Waiting...</p>
                )}
              </div>
            </div>
            
            {/* Connector Line */}
            {index < animatedSteps.length - 1 && (
              <div className="flex-1 h-0.5 mx-4 transition-colors duration-500">
                <div className={cn(
                  "h-full transition-all duration-500",
                  getConnectorColor(index)
                )} />
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Progress Bar */}
      <div className="mt-6 w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-blue-500 h-2 rounded-full transition-all duration-500 ease-out"
          style={{ 
            width: `${(currentStep / Math.max(animatedSteps.length - 1, 1)) * 100}%` 
          }}
        />
      </div>
    </div>
  );
}

// Helper function to create initial step configuration
export function createInitialSteps(): FusionStep[] {
  return [
    {
      id: 'capturing',
      name: 'Capturing Pokémons',
      state: 'pending'
    },
    {
      id: 'merging',
      name: 'Merging Pokémons',
      state: 'pending'
    },
    {
      id: 'entering',
      name: 'Pokédex Entering',
      state: 'pending'
    }
  ];
}

// Helper function to update step state
export function updateStepState(
  steps: FusionStep[],
  stepId: string,
  newState: StepState,
  error?: string
): FusionStep[] {
  return steps.map(step => {
    if (step.id === stepId) {
      return {
        ...step,
        state: newState,
        error: error,
        startTime: newState === 'loading' ? Date.now() : step.startTime,
        completedTime: newState === 'completed' || newState === 'failed' ? Date.now() : step.completedTime
      };
    }
    return step;
  });
} 