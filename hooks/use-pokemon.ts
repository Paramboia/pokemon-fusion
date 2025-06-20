"use client"

import { useState, useEffect } from 'react';
import type { Pokemon, PokemonListResponse } from '@/types/pokemon';

const POKEMON_API_BASE = 'https://pokeapi.co/api/v2';

export function usePokemon() {
  const [pokemonList, setPokemonList] = useState<Pokemon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchPokemonList();
  }, []);

  const fetchPokemonList = async () => {
    try {
      setIsLoading(true);
      // Fetch all Pokemon from all generations (1,025 total as of Gen 9)
      const response = await fetch(`${POKEMON_API_BASE}/pokemon?limit=1025`);
      const data: PokemonListResponse = await response.json();
      
      // Fetch details for each Pokemon
      const pokemonDetails = await Promise.all(
        data.results.map(pokemon => getPokemonDetails(pokemon.name))
      );

      setPokemonList(pokemonDetails.filter((p): p is Pokemon => p !== null));
      setError(null);
    } catch (err) {
      setError('Failed to fetch Pokemon list');
      console.error('Error fetching Pokemon:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getPokemonDetails = async (nameOrId: string | number): Promise<Pokemon | null> => {
    try {
      const response = await fetch(`${POKEMON_API_BASE}/pokemon/${nameOrId}`);
      const data = await response.json();
      return data;
    } catch (err) {
      console.error(`Error fetching Pokemon ${nameOrId}:`, err);
      return null;
    }
  };

  const filteredPokemon = searchQuery
    ? pokemonList.filter(pokemon =>
        pokemon.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : pokemonList;

  return {
    pokemonList: filteredPokemon,
    isLoading,
    error,
    getPokemonDetails,
    searchQuery,
    setSearchQuery,
  };
} 