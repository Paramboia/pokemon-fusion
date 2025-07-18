"use client"

import { useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase'
import { event as gaEvent } from '@/lib/gtag'
import { FusionStep, StepResponse, FusionGenerationState, StepState } from '@/types/fusion'
import { createInitialSteps, updateStepState } from '@/components/ui/progress-stepper'

export function useFusion() {
  const router = useRouter()
  const { getToken } = useAuth()
  const { isLoaded, user } = useUser()
  const [generating, setGenerating] = useState(false)
  const [fusionImage, setFusionImage] = useState<string | null>(null)
  const [fusionId, setFusionId] = useState<string | null>(null)
  const [fusionName, setFusionName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPaymentRequired, setIsPaymentRequired] = useState(false)
  const [isLocalFallback, setIsLocalFallback] = useState(false)
  
  // New multi-step UI states
  const [generationState, setGenerationState] = useState<FusionGenerationState>({
    steps: createInitialSteps(),
    currentStep: 0,
    isGenerating: false
  })
  
  // Check if multi-step UI is enabled
  const isMultiStepEnabled = process.env.NEXT_PUBLIC_ENABLE_MULTI_STEP_UI === 'true'

  const generateFusion = async (
    image1Url: string, 
    image2Url: string, 
    name1: string, 
    name2: string, 
    pokemon1Id: number, 
    pokemon2Id: number,
    fusionName?: string
  ) => {
    try {
      // Reset state
      setGenerating(true)
      setError(null)
      setIsPaymentRequired(false)
      setIsLocalFallback(false)
      setFusionId(null)
      setFusionName(null)
      setFusionImage(null)

      // Reset multi-step state
      setGenerationState({
        steps: createInitialSteps(),
        currentStep: 0,
        isGenerating: true
      })

      // Track fusion generation start
      gaEvent({
        action: 'fusion_generation_start',
        category: 'engagement',
        label: `${name1}-${name2}`,
        value: undefined
      });

      // Wait for user to be loaded
      if (!isLoaded || !user) {
        console.error('User not loaded');
        toast.error('Please sign in to generate fusions');
        setError('Authentication required');
        setGenerating(false);
        setGenerationState(prev => ({ ...prev, isGenerating: false }));
        return;
      }

      console.log('Generating fusion for:', { name1, name2, pokemon1Id, pokemon2Id, fusionName })

      // Get the Clerk session token
      const token = await getToken()
      console.log('Got authentication token:', token ? 'Yes' : 'No')
      
      if (!token) {
        console.error('No authentication token available');
        toast.error('Authentication error. Please refresh and try again.');
        setError('Authentication error');
        setGenerating(false);
        setGenerationState(prev => ({ ...prev, isGenerating: false }));
        return;
      }

      // Use provided fusion name or create a default one
      const generatedFusionName = fusionName || `${name1}-${name2}`;

      // Check credits balance directly from Supabase
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('credits_balance')
        .eq('clerk_id', user.id)
        .single()

      if (userError || !userData) {
        console.error('Failed to fetch credits balance:', userError);
        toast.error('Unable to verify credits. Showing first Pokémon instead.');
        setError('Unable to verify credits');
        setFusionImage(image1Url);
        setIsLocalFallback(true);
        setFusionName(name1);
        setGenerating(false);
        setGenerationState(prev => ({ ...prev, isGenerating: false }));
        return;
      }

      if (userData.credits_balance === 0) {
        setIsPaymentRequired(true);
        toast.error('Please purchase more credits to generate more amazing Pokémon fusions.');
        setError('Please purchase more credits to generate more amazing Pokémon fusions.');
        setGenerating(false);
        setGenerationState(prev => ({ ...prev, isGenerating: false }));
        return;
      }

      // Try multi-step UI first if enabled
      if (isMultiStepEnabled) {
        console.log('Using multi-step UI generation');
        await generateWithMultiStepUI(
          token,
          pokemon1Id,
          pokemon2Id,
          name1,
          name2,
          generatedFusionName,
          image1Url
        );
      } else {
        console.log('Using legacy single-step generation');
        await generateWithLegacyUI(
          token,
          pokemon1Id,
          pokemon2Id,
          name1,
          name2,
          generatedFusionName,
          image1Url
        );
      }

    } catch (err) {
      console.error('Error in generateFusion:', err);
      toast.error('Unable to generate fusion. Showing first Pokémon instead.');
      setError('An unexpected error occurred');
      setFusionImage(image1Url);
      setIsLocalFallback(true);
      setFusionName(name1);
    } finally {
      setGenerating(false);
      setGenerationState(prev => ({ ...prev, isGenerating: false }));
    }
  }

  const generateWithMultiStepUI = async (
    token: string,
    pokemon1Id: number,
    pokemon2Id: number,
    name1: string,
    name2: string,
    generatedFusionName: string,
    fallbackImage: string
  ) => {
    try {
      // Show initial toast
      toast.loading('Starting AI fusion generation...', {
        id: 'fusion-generation',
        duration: 300000, // 5 minutes
      });

      // Start Server-Sent Events connection
      const response = await fetch('/api/generate/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          pokemon1Id,
          pokemon2Id,
          pokemon1Name: name1,
          pokemon2Name: name2,
          fusionName: generatedFusionName
        }),
      });

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 402) {
          // Payment required - don't fall back, show payment required
          const errorData = await response.json();
          setIsPaymentRequired(true);
          setError(errorData.error || 'Payment required');
          toast.dismiss('fusion-generation');
          toast.error('Please purchase more credits to generate fusions');
          return;
        }
        
        // For other errors, fall back to legacy API
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('No response body for streaming');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let hasReceivedResult = false;

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            console.log('Stream completed');
            break;
          }

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const eventData: StepResponse = JSON.parse(line.slice(6));
                console.log('Received SSE event:', eventData);
                
                handleStepUpdate(eventData);
                
                // Check if we received a final result
                if (eventData.step === 'entering' && eventData.status === 'completed' && eventData.data) {
                  hasReceivedResult = true;
                }
              } catch (parseError) {
                console.error('Error parsing SSE event:', parseError, 'Line:', line);
              }
            }
          }
        }
        
        // If we didn't receive a final result, something went wrong
        if (!hasReceivedResult) {
          console.error('Stream ended without receiving final result');
          throw new Error('Stream ended without receiving final result');
        }
        
      } finally {
        reader.releaseLock();
      }

    } catch (streamError) {
      console.error('Error with streaming API:', streamError);
      toast.dismiss('fusion-generation');
      
      // Check if this is a payment required error
      if (streamError.message?.includes('402') || streamError.message?.includes('Payment required')) {
        setIsPaymentRequired(true);
        setError('Payment required to generate fusions');
        toast.error('Please purchase more credits to generate fusions');
        return;
      }
      
      // For any other error, fall back to Simple Method immediately
      console.log('Falling back to Simple Method due to streaming error');
      toast.loading('Switching to Simple Method...', {
        id: 'fusion-generation',
        duration: 5000,
      });
      
      // Set Simple Method result immediately
      setFusionImage(fallbackImage);
      setFusionId('simple-' + Date.now());
      setFusionName(name1);
      setIsLocalFallback(true);
      
      // Update generation state to show Simple Method
      setGenerationState(prev => {
        const newSteps = prev.steps.map(step => ({
          ...step,
          state: 'completed' as StepState
        }));
        return {
          ...prev,
          steps: newSteps,
          currentStep: 2
        };
      });
      
      toast.dismiss('fusion-generation');
      toast.success('Using Simple Method - showing first Pokémon');
      
      // Track fallback
      gaEvent({
        action: 'fusion_generation_fallback',
        category: 'engagement',
        label: 'simple-method-fallback',
        value: undefined
      });
    }
  };

  const generateWithLegacyUI = async (
    token: string,
    pokemon1Id: number,
    pokemon2Id: number,
    name1: string,
    name2: string,
    generatedFusionName: string,
    fallbackImage: string
  ) => {
    // Show a toast to indicate generation has started
    toast.loading('Starting Pokémon fusion generation...', {
      id: 'fusion-generation',
      duration: 60000, // 60 seconds
    });

    // Set a timeout for the API call
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 50000) // 50 second timeout

    try {
      // Call the legacy API endpoint
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Simple-Fusion': 'false',
        },
        credentials: 'include',
        body: JSON.stringify({
          pokemon1Id,
          pokemon2Id,
          pokemon1Name: name1,
          pokemon2Name: name2,
          fusionName: generatedFusionName
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMessage = 'Failed to generate fusion';
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
          console.error('Error details:', errorData.details);
        } catch (parseError) {
          errorMessage = `${errorMessage}: ${response.statusText}`;
        }
        
        console.error('Error generating fusion:', errorMessage, 'Status:', response.status);
        toast.dismiss('fusion-generation');
        
        if (response.status === 401) {
          toast.error('Authentication error. Please refresh the page and try again.');
          setError('Authentication error');
        } else if (response.status === 402) {
          setIsPaymentRequired(true);
          toast.error('Payment required to generate more fusions');
          setError('Payment required to generate more fusions');
        } else {
          toast.error('Unable to generate fusion. Showing first Pokémon instead.');
          setError('Fusion generation is currently unavailable');
          setFusionImage(fallbackImage);
          setIsLocalFallback(true);
          setFusionName(name1);
        }
        
        return;
      }

      // Parse the response
      const data = await response.json();
      console.log('Fusion API response:', data);

      toast.dismiss('fusion-generation');
      
      // Set the fusion data
      setFusionImage(data.output || data.fusionImage);
      setFusionId(data.id);
      
      const finalIsLocalFallback = data.isLocalFallback || false;
      setIsLocalFallback(finalIsLocalFallback);
      setFusionName(data.fusionName || generatedFusionName);
      
      // Store fusion data in localStorage
      try {
        const fusionForStorage = {
          ...data,
          isLocalFallback: finalIsLocalFallback,
          output: data.output || data.fusionImage,
          fusionName: data.fusionName || generatedFusionName
        };
        localStorage.setItem('lastGeneratedFusion', JSON.stringify(fusionForStorage));
      } catch (storageError) {
        console.error('Failed to store fusion data in localStorage:', storageError);
      }
      
      // Track success/fallback
      gaEvent({
        action: finalIsLocalFallback ? 'fusion_generation_fallback' : 'fusion_generation_success',
        category: 'engagement',
        label: `${name1}-${name2}`,
        value: undefined
      });
      
      // Show success message
      if (finalIsLocalFallback) {
        toast.success('Showing simplified fusion.');
      } else {
        toast.success('AI Fusion generated successfully!');
      }

    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.error('Error in legacy fetch:', fetchError);
      toast.dismiss('fusion-generation');
      
      gaEvent({
        action: 'fusion_generation_error',
        category: 'error',
        label: `${name1}-${name2}`,
        value: undefined
      });
      
      toast.error('Unable to generate fusion. Showing first Pokémon instead.');
      setError('An unexpected error occurred');
      setFusionImage(fallbackImage);
      setIsLocalFallback(true);
      setFusionName(name1);
    }
  };

  const handleStepUpdate = (eventData: StepResponse) => {
    const stepMap = {
      'capturing': 0,
      'merging': 1,
      'entering': 2
    };

    const stepIndex = stepMap[eventData.step];
    
    setGenerationState(prev => {
      let newSteps = [...prev.steps];
      let newCurrentStep = prev.currentStep;

      if (eventData.status === 'started') {
        newSteps = updateStepState(newSteps, eventData.step, 'loading');
        newCurrentStep = stepIndex;
        
        // Update toast message based on step
        const stepMessages = {
          'capturing': 'Capturing Pokémons...',
          'merging': 'Merging Pokémons...',
          'entering': 'Entering Pokédex...'
        };
        
        toast.loading(stepMessages[eventData.step], {
          id: 'fusion-generation',
          duration: 300000,
        });
        
      } else if (eventData.status === 'completed') {
        newSteps = updateStepState(newSteps, eventData.step, 'completed');
        
        // Check if this is the final step
        if (eventData.step === 'entering' && eventData.data) {
          // Final result received
          setFusionImage(eventData.data.finalUrl || '');
          setFusionId(eventData.data.fusionId || '');
          setFusionName(eventData.data.fusionName || '');
          setIsLocalFallback(eventData.data.isLocalFallback || false);
          
          toast.dismiss('fusion-generation');
          
          if (eventData.data.isLocalFallback) {
            toast.success('Using Simple Method - showing first Pokémon');
          } else {
            toast.success('AI Fusion generated successfully!');
          }
          
          // Track success
          gaEvent({
            action: eventData.data.isLocalFallback ? 'fusion_generation_fallback' : 'fusion_generation_success',
            category: 'engagement',
            label: 'multi-step-ui',
            value: undefined
          });
          
          // Store in localStorage
          try {
            const fusionForStorage = {
              id: eventData.data.fusionId,
              output: eventData.data.finalUrl,
              fusionName: eventData.data.fusionName,
              isLocalFallback: eventData.data.isLocalFallback
            };
            localStorage.setItem('lastGeneratedFusion', JSON.stringify(fusionForStorage));
          } catch (storageError) {
            console.error('Failed to store fusion data:', storageError);
          }
        }
        
      } else if (eventData.status === 'failed') {
        newSteps = updateStepState(newSteps, eventData.step, 'failed', eventData.error);
        
        // Handle failure - check if this is a fallback message
        if (eventData.error?.includes('Simple Method fallback')) {
          console.log('Step failed, but Simple Method fallback is being used');
          // Don't show error, the backend will send a completion event next
        } else {
          // This is a real failure, show error
          console.error('Step failed:', eventData.step, eventData.error);
          
          toast.dismiss('fusion-generation');
          toast.error('AI generation failed. Please try again.');
          
          // Set error state but don't return - let the backend handle fallback
          setError('AI generation failed');
          
          // Track failure
          gaEvent({
            action: 'fusion_generation_step_failed',
            category: 'error',
            label: `${eventData.step}-${eventData.error}`,
            value: undefined
          });
        }
      }

      return {
        ...prev,
        steps: newSteps,
        currentStep: newCurrentStep
      };
    });
  };

  return {
    // Legacy states
    generating,
    fusionImage,
    fusionId,
    fusionName,
    error,
    isPaymentRequired,
    isLocalFallback,
    generateFusion,
    
    // New multi-step UI states
    generationState,
    isMultiStepEnabled,
    
    // Legacy method
    handlePaymentRequired: () => {
      if (isPaymentRequired) {
        router.push('/credits')
      }
    }
  }
} 