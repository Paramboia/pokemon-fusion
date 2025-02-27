"use client"

import { useState, useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import { supabase } from '@/lib/supabase';
import type { FusionDB } from './use-favorites';

const ITEMS_PER_PAGE = 12;

export function useInfiniteFusions(userId?: string | null) {
  const [fusions, setFusions] = useState<FusionDB[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const { ref: loadMoreRef, inView } = useInView();

  const fetchFusions = async () => {
    try {
      setIsLoading(true);
      let query = supabase
        .from('fusions')
        .select('*')
        .order('created_at', { ascending: false })
        .range(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE - 1);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error: dbError } = await query;

      if (dbError) throw dbError;

      setFusions(prev => [...prev, ...(data as FusionDB[])]);
      setHasMore(data.length === ITEMS_PER_PAGE);
      setPage(prev => prev + 1);
    } catch (err) {
      setError('Failed to load fusions');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (inView && hasMore && !isLoading) {
      fetchFusions();
    }
  }, [inView]);

  return {
    fusions,
    isLoading,
    error,
    hasMore,
    loadMoreRef,
  };
} 