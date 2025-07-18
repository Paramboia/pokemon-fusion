export interface Fusion {
  id: string;
  pokemon1Name: string;
  pokemon2Name: string;
  fusionName: string;
  fusionImage: string;
  isLocalFallback?: boolean;
  createdAt: string;
  likes?: number;
}

// Multi-step UI types for fusion generation
export type StepState = 'pending' | 'loading' | 'completed' | 'failed';

export interface FusionStep {
  id: string;
  name: string;
  state: StepState;
  error?: string;
  startTime?: number;
  completedTime?: number;
}

export interface StepResponse {
  step: 'capturing' | 'merging' | 'entering';
  status: 'started' | 'completed' | 'failed';
  data?: {
    imageUrl?: string;
    description?: string;
    finalUrl?: string;
  };
  error?: string;
  timestamp?: number;
}

export interface FusionGenerationState {
  steps: FusionStep[];
  currentStep: number;
  isGenerating: boolean;
  error?: string;
  finalResult?: {
    fusionImage: string;
    fusionId: string;
    fusionName: string;
    isLocalFallback: boolean;
  };
} 