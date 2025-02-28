"use client"

import { useState, useEffect } from "react";
import { usePokemon } from '@/hooks/use-pokemon'
import { Button } from '@/components/ui/button'
import { Loader2, Search, ArrowLeftRight, X, Shuffle } from 'lucide-react'
import { Card } from '@/components/ui/card'
import type { Pokemon } from '@/types/pokemon'
import { Input } from '@/components/ui/input'

interface PokemonSelectorProps {
  pokemonList: Pokemon[]
  onSelect: (pokemon1: Pokemon | null, pokemon2: Pokemon | null) => void
  selectedPokemon: {
    pokemon1: Pokemon | null
    pokemon2: Pokemon | null
  }
}

export function PokemonSelector({ pokemonList, onSelect, selectedPokemon }: PokemonSelectorProps) {
  const { isLoading } = usePokemon()
  const [searchTerm1, setSearchTerm1] = useState('')
  const [searchTerm2, setSearchTerm2] = useState('')
  const [filteredList1, setFilteredList1] = useState<Pokemon[]>([])
  const [filteredList2, setFilteredList2] = useState<Pokemon[]>([])
  const [showDropdown1, setShowDropdown1] = useState(false)
  const [showDropdown2, setShowDropdown2] = useState(false)

  // Add click outside handler to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.dropdown-container-1')) {
        setShowDropdown1(false);
      }
      if (!target.closest('.dropdown-container-2')) {
        setShowDropdown2(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (searchTerm1) {
      const filtered = pokemonList.filter((pokemon) =>
        pokemon.name.toLowerCase().includes(searchTerm1.toLowerCase())
      );
      setFilteredList1(filtered.slice(0, 5));
    } else {
      setFilteredList1([]);
    }
  }, [searchTerm1, pokemonList]);

  useEffect(() => {
    if (searchTerm2) {
      const filtered = pokemonList.filter((pokemon) =>
        pokemon.name.toLowerCase().includes(searchTerm2.toLowerCase())
      );
      setFilteredList2(filtered.slice(0, 5));
    } else {
      setFilteredList2([]);
    }
  }, [searchTerm2, pokemonList]);

  const handleRandomPokemon1 = () => {
    if (pokemonList.length === 0) return;
    
    const randomIndex = Math.floor(Math.random() * pokemonList.length);
    const randomPokemon = pokemonList[randomIndex];
    
    onSelect(randomPokemon, selectedPokemon.pokemon2);
  };

  const handleRandomPokemon2 = () => {
    if (pokemonList.length === 0) return;
    
    const randomIndex = Math.floor(Math.random() * pokemonList.length);
    const randomPokemon = pokemonList[randomIndex];
    
    onSelect(selectedPokemon.pokemon1, randomPokemon);
  };

  const handlePokemon1Change = (pokemon: Pokemon) => {
    onSelect(pokemon, selectedPokemon.pokemon2);
    setSearchTerm1("");
    setFilteredList1([]);
    setShowDropdown1(false);
  }

  const handlePokemon2Change = (pokemon: Pokemon) => {
    onSelect(selectedPokemon.pokemon1, pokemon);
    setSearchTerm2("");
    setFilteredList2([]);
    setShowDropdown2(false);
  }

  const handleSwapPokemon = () => {
    if (selectedPokemon.pokemon1 && selectedPokemon.pokemon2) {
      onSelect(selectedPokemon.pokemon2, selectedPokemon.pokemon1);
    }
  };

  const clearSearch1 = () => {
    setSearchTerm1('');
    setFilteredList1([]);
    setShowDropdown1(false);
  };

  const clearSearch2 = () => {
    setSearchTerm2('');
    setFilteredList2([]);
    setShowDropdown2(false);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-3xl">
      {/* Pokemon cards with swap button in the middle */}
      <div className="flex items-center justify-between gap-4">
        <div className="h-full w-full">
          <Card className="relative group overflow-hidden h-full flex flex-col">
            {/* Search bar inside first card */}
            <div className="p-4 mb-auto">
              <div className="relative mb-4 flex items-center dropdown-container-1">
                <div className="relative flex-grow">
                  <Input
                    type="text"
                    placeholder="Search first Pokémon..."
                    value={searchTerm1}
                    onChange={(e) => {
                      setSearchTerm1(e.target.value);
                      setShowDropdown1(true);
                    }}
                    onFocus={() => setShowDropdown1(true)}
                    className="pl-10 pr-10 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
                  />
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400" />
                  {searchTerm1 && (
                    <button 
                      onClick={clearSearch1}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleRandomPokemon1}
                  className="ml-2 flex-shrink-0 opacity-70 hover:opacity-100"
                  title="Random Pokémon"
                >
                  <Shuffle className="h-4 w-4" />
                </Button>
                
                {showDropdown1 && filteredList1.length > 0 && (
                  <div className="absolute z-10 w-full left-0 top-full mt-1 bg-white dark:bg-gray-800 rounded-md shadow-lg max-h-60 overflow-auto">
                    {filteredList1.map((pokemon) => (
                      <div
                        key={pokemon.id}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex items-center"
                        onClick={() => handlePokemon1Change(pokemon)}
                      >
                        <img
                          src={pokemon.sprites.front_default}
                          alt={pokemon.name}
                          className="w-8 h-8 mr-2"
                        />
                        <span className="capitalize dark:text-gray-200">{pokemon.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex-grow flex items-center justify-center p-4">
              {selectedPokemon.pokemon1 ? (
                <div className="w-full h-64 relative">
                  <img
                    src={selectedPokemon.pokemon1.sprites.other['official-artwork'].front_default}
                    alt={selectedPokemon.pokemon1.name}
                    className="absolute inset-0 w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div className="w-full h-64 flex items-center justify-center border border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                  <div className="text-6xl font-bold text-gray-300 dark:text-gray-600 flex items-center justify-center w-full h-full">
                    ?
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
              {selectedPokemon.pokemon1 && (
                <h3 className="text-lg font-semibold capitalize text-gray-800 dark:text-gray-200">
                  {selectedPokemon.pokemon1.name}
                </h3>
              )}
            </div>
          </Card>
        </div>

        {/* Swap button in the middle */}
        <Button
          variant="outline"
          size="icon"
          className="rounded-full p-2 flex-shrink-0 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
          onClick={handleSwapPokemon}
          disabled={!selectedPokemon.pokemon1 || !selectedPokemon.pokemon2}
          title="Swap Pokémon"
        >
          <ArrowLeftRight className="h-5 w-5" />
        </Button>

        <div className="h-full w-full">
          <Card className="relative group overflow-hidden h-full flex flex-col">
            {/* Search bar inside second card */}
            <div className="p-4 mb-auto">
              <div className="relative mb-4 flex items-center dropdown-container-2">
                <div className="relative flex-grow">
                  <Input
                    type="text"
                    placeholder="Search second Pokémon..."
                    value={searchTerm2}
                    onChange={(e) => {
                      setSearchTerm2(e.target.value);
                      setShowDropdown2(true);
                    }}
                    onFocus={() => setShowDropdown2(true)}
                    className="pl-10 pr-10 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
                  />
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400" />
                  {searchTerm2 && (
                    <button 
                      onClick={clearSearch2}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleRandomPokemon2}
                  className="ml-2 flex-shrink-0 opacity-70 hover:opacity-100"
                  title="Random Pokémon"
                >
                  <Shuffle className="h-4 w-4" />
                </Button>
                
                {showDropdown2 && filteredList2.length > 0 && (
                  <div className="absolute z-10 w-full left-0 top-full mt-1 bg-white dark:bg-gray-800 rounded-md shadow-lg max-h-60 overflow-auto">
                    {filteredList2.map((pokemon) => (
                      <div
                        key={pokemon.id}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex items-center"
                        onClick={() => handlePokemon2Change(pokemon)}
                      >
                        <img
                          src={pokemon.sprites.front_default}
                          alt={pokemon.name}
                          className="w-8 h-8 mr-2"
                        />
                        <span className="capitalize dark:text-gray-200">{pokemon.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex-grow flex items-center justify-center p-4">
              {selectedPokemon.pokemon2 ? (
                <div className="w-full h-64 relative">
                  <img
                    src={selectedPokemon.pokemon2.sprites.other['official-artwork'].front_default}
                    alt={selectedPokemon.pokemon2.name}
                    className="absolute inset-0 w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div className="w-full h-64 flex items-center justify-center border border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                  <div className="text-6xl font-bold text-gray-300 dark:text-gray-600 flex items-center justify-center w-full h-full">
                    ?
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
              {selectedPokemon.pokemon2 && (
                <h3 className="text-lg font-semibold capitalize text-gray-800 dark:text-gray-200">
                  {selectedPokemon.pokemon2.name}
                </h3>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
} 