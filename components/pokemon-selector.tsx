"use client"

import { useState, useEffect } from "react";
import { usePokemon } from '@/hooks/use-pokemon'
import { Button } from '@/components/ui/button'
import { Loader2, Search, ArrowLeftRight } from 'lucide-react'
import { Card } from '@/components/ui/card'
import type { Pokemon } from '@/types/pokemon'
import { Input } from '@/components/ui/input'

interface PokemonSelectorProps {
  pokemonList: Pokemon[]
  onSelect: (pokemon1: Pokemon, pokemon2: Pokemon) => void
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

  const handleRandomSelect = () => {
    if (pokemonList.length < 2) return;
    
    const randomIndex1 = Math.floor(Math.random() * pokemonList.length);
    let randomIndex2;
    do {
      randomIndex2 = Math.floor(Math.random() * pokemonList.length);
    } while (randomIndex2 === randomIndex1);
    
    onSelect(pokemonList[randomIndex1], pokemonList[randomIndex2]);
    setSearchTerm1("");
    setSearchTerm2("");
  }

  const handlePokemon1Change = (pokemon: Pokemon) => {
    if (selectedPokemon.pokemon2) {
      onSelect(pokemon, selectedPokemon.pokemon2);
    } else if (pokemonList.length > 0) {
      const defaultPokemon2 = pokemonList.find(p => p.id !== pokemon.id) || pokemonList[0];
      onSelect(pokemon, defaultPokemon2);
    }
    setSearchTerm1("");
    setShowDropdown1(false);
  }

  const handlePokemon2Change = (pokemon: Pokemon) => {
    if (selectedPokemon.pokemon1) {
      onSelect(selectedPokemon.pokemon1, pokemon);
    } else if (pokemonList.length > 0) {
      const defaultPokemon1 = pokemonList.find(p => p.id !== pokemon.id) || pokemonList[0];
      onSelect(defaultPokemon1, pokemon);
    }
    setSearchTerm2("");
    setShowDropdown2(false);
  }

  const handleSwapPokemon = () => {
    if (selectedPokemon.pokemon1 && selectedPokemon.pokemon2) {
      onSelect(selectedPokemon.pokemon2, selectedPokemon.pokemon1);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-4 md:gap-10 items-center">
      <div className="flex flex-col items-center">
        <Card className="w-full p-4 rounded-lg shadow-md bg-white">
          <div className="text-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">First Pokémon</h3>
          </div>
          
          <div className="relative mb-4">
            <div className="relative">
              <Input
                type="text"
                placeholder="Search Pokémon..."
                value={searchTerm1}
                onChange={(e) => {
                  setSearchTerm1(e.target.value);
                  setShowDropdown1(true);
                }}
                onFocus={() => setShowDropdown1(true)}
                className="pl-10 bg-white border-gray-300"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
            </div>
            
            {showDropdown1 && filteredList1.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg max-h-60 overflow-auto">
                {filteredList1.map((pokemon) => (
                  <div
                    key={pokemon.id}
                    className="p-2 hover:bg-gray-100 cursor-pointer flex items-center"
                    onClick={() => handlePokemon1Change(pokemon)}
                  >
                    <img
                      src={pokemon.sprites.front_default}
                      alt={pokemon.name}
                      className="w-8 h-8 mr-2"
                    />
                    <span className="capitalize">{pokemon.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {selectedPokemon.pokemon1 ? (
            <div className="flex flex-col items-center">
              <div className="w-32 h-32 flex items-center justify-center">
                <img
                  src={selectedPokemon.pokemon1.sprites.other['official-artwork'].front_default}
                  alt={selectedPokemon.pokemon1.name}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              <h3 className="mt-2 text-lg font-medium capitalize text-gray-800">
                {selectedPokemon.pokemon1.name}
              </h3>
            </div>
          ) : (
            <div className="w-32 h-32 mx-auto flex items-center justify-center border border-dashed border-gray-300 rounded-lg">
              <p className="text-gray-500 text-sm text-center">
                Select a Pokémon
              </p>
            </div>
          )}
        </Card>
      </div>

      <div className="flex flex-col items-center">
        <Card className="w-full p-4 rounded-lg shadow-md bg-white">
          <div className="text-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Second Pokémon</h3>
          </div>
          
          <div className="relative mb-4">
            <div className="relative">
              <Input
                type="text"
                placeholder="Search Pokémon..."
                value={searchTerm2}
                onChange={(e) => {
                  setSearchTerm2(e.target.value);
                  setShowDropdown2(true);
                }}
                onFocus={() => setShowDropdown2(true)}
                className="pl-10 bg-white border-gray-300"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
            </div>
            
            {showDropdown2 && filteredList2.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg max-h-60 overflow-auto">
                {filteredList2.map((pokemon) => (
                  <div
                    key={pokemon.id}
                    className="p-2 hover:bg-gray-100 cursor-pointer flex items-center"
                    onClick={() => handlePokemon2Change(pokemon)}
                  >
                    <img
                      src={pokemon.sprites.front_default}
                      alt={pokemon.name}
                      className="w-8 h-8 mr-2"
                    />
                    <span className="capitalize">{pokemon.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {selectedPokemon.pokemon2 ? (
            <div className="flex flex-col items-center">
              <div className="w-32 h-32 flex items-center justify-center">
                <img
                  src={selectedPokemon.pokemon2.sprites.other['official-artwork'].front_default}
                  alt={selectedPokemon.pokemon2.name}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              <h3 className="mt-2 text-lg font-medium capitalize text-gray-800">
                {selectedPokemon.pokemon2.name}
              </h3>
            </div>
          ) : (
            <div className="w-32 h-32 mx-auto flex items-center justify-center border border-dashed border-gray-300 rounded-lg">
              <p className="text-gray-500 text-sm text-center">
                Select a Pokémon
              </p>
            </div>
          )}
        </Card>
      </div>

      <div className="col-span-2 flex justify-center mt-4 space-x-4">
        <Button
          variant="outline"
          size="sm"
          className="rounded-full p-2"
          onClick={handleSwapPokemon}
          disabled={!selectedPokemon.pokemon1 || !selectedPokemon.pokemon2}
        >
          <ArrowLeftRight className="h-5 w-5" />
          <span className="ml-2">Swap</span>
        </Button>
        
        <Button
          variant="outline"
          onClick={handleRandomSelect}
          className="px-6 py-2 border-indigo-500 hover:bg-indigo-600 hover:text-white"
        >
          Random Selection
        </Button>
      </div>
    </div>
  )
} 