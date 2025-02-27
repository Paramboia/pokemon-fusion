"use client"

import { useState } from 'react'
import { usePokemon } from '@/hooks/use-pokemon'
import { Button } from '@/components/ui/button'
import { Loader2, Shuffle } from 'lucide-react'
import Image from 'next/image'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Pokemon } from '@/types/pokemon'

interface PokemonSelectorProps {
  pokemonList: Pokemon[]
  onSelect: (pokemon1: Pokemon, pokemon2: Pokemon) => void
  selectedPokemon: {
    pokemon1: Pokemon | null
    pokemon2: Pokemon | null
  }
}

export function PokemonSelector({ pokemonList, onSelect, selectedPokemon }: PokemonSelectorProps) {
  const { allPokemon, loading, getRandomPokemon } = usePokemon()
  const [selected1, setSelected1] = useState<any>(null)
  const [selected2, setSelected2] = useState<any>(null)

  const handleRandomSelect = () => {
    if (pokemonList.length < 2) return;
    
    const randomIndex1 = Math.floor(Math.random() * pokemonList.length);
    let randomIndex2;
    do {
      randomIndex2 = Math.floor(Math.random() * pokemonList.length);
    } while (randomIndex2 === randomIndex1);
    
    onSelect(pokemonList[randomIndex1], pokemonList[randomIndex2]);
  }

  const handlePokemon1Change = (value: string) => {
    const pokemon1 = pokemonList.find(p => p.name === value)
    if (pokemon1 && selectedPokemon.pokemon2) {
      onSelect(pokemon1, selectedPokemon.pokemon2)
    }
  }

  const handlePokemon2Change = (value: string) => {
    const pokemon2 = pokemonList.find(p => p.name === value)
    if (pokemon2 && selectedPokemon.pokemon1) {
      onSelect(selectedPokemon.pokemon1, pokemon2)
    }
  }

  if (loading) {
    return <Loader2 className="h-8 w-8 animate-spin" />
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRandomSelect}
          className="flex items-center gap-2"
        >
          <Shuffle className="h-4 w-4" />
          Random
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="flex flex-col items-center space-y-4">
          <Select value={selectedPokemon.pokemon1?.name} onValueChange={handlePokemon1Change}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select Pokémon 1" />
            </SelectTrigger>
            <SelectContent>
              {pokemonList.map((pokemon) => (
                <SelectItem key={pokemon.id} value={pokemon.name}>
                  {pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedPokemon.pokemon1 && (
            <Card className="p-4 w-[200px] h-[200px] flex items-center justify-center">
              <Image
                src={selectedPokemon.pokemon1.sprites.other['official-artwork'].front_default}
                alt={selectedPokemon.pokemon1.name}
                width={150}
                height={150}
                className="object-contain"
              />
            </Card>
          )}
        </div>

        <div className="flex flex-col items-center space-y-4">
          <Select value={selectedPokemon.pokemon2?.name} onValueChange={handlePokemon2Change}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select Pokémon 2" />
            </SelectTrigger>
            <SelectContent>
              {pokemonList.map((pokemon) => (
                <SelectItem key={pokemon.id} value={pokemon.name}>
                  {pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedPokemon.pokemon2 && (
            <Card className="p-4 w-[200px] h-[200px] flex items-center justify-center">
              <Image
                src={selectedPokemon.pokemon2.sprites.other['official-artwork'].front_default}
                alt={selectedPokemon.pokemon2.name}
                width={150}
                height={150}
                className="object-contain"
              />
            </Card>
          )}
        </div>
      </div>
    </div>
  )
} 