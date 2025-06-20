"use client"

import { useState, useEffect } from 'react';
import type { Pokemon } from '@/types/pokemon';
// Import local Pokemon data
import pokemonData from '@/data/pokemon-data.json';

export function usePokemon() {
  const [pokemonList, setPokemonList] = useState<Pokemon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadPokemonData();
  }, []);

  const loadPokemonData = async () => {
    try {
      setIsLoading(true);
      
      // Transform local data to match Pokemon interface
      const transformedData: Pokemon[] = pokemonData.map(pokemon => ({
        id: pokemon.id,
        name: pokemon.name,
        sprites: {
          front_default: pokemon.thumbnail,
          other: {
            'official-artwork': {
              front_default: pokemon.image
            }
          }
        },
        types: [] // Empty array since types aren't used in the fusion UI
      }));

      setPokemonList(transformedData);
      setError(null);
    } catch (err) {
      setError('Failed to load Pokemon data');
      console.error('Error loading Pokemon:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getPokemonDetails = async (nameOrId: string | number): Promise<Pokemon | null> => {
    try {
      // Find Pokemon in local data
      const pokemon = pokemonData.find(p => 
        p.name === nameOrId || p.id === parseInt(nameOrId.toString())
      );
      
      if (!pokemon) {
        return null;
      }

      // Transform to match Pokemon interface
      return {
        id: pokemon.id,
        name: pokemon.name,
        sprites: {
          front_default: pokemon.thumbnail,
          other: {
            'official-artwork': {
              front_default: pokemon.image
            }
          }
        },
        types: [] // Empty array since types aren't used in the fusion UI
      };
    } catch (err) {
      console.error(`Error getting Pokemon ${nameOrId}:`, err);
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