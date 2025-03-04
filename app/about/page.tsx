"use client";

import { SparklesText } from "@/components/ui";

export default function AboutPage() {
  return (
    <div className="flex flex-col items-center">
      <div className="text-center mb-10">
        <SparklesText 
          text="About PokéFusion"
          className="text-4xl md:text-5xl font-bold mb-4"
        />
        <p className="text-xl text-gray-600 dark:text-gray-200">
          Learn more about our Pokémon fusion project
        </p>
      </div>

      <div className="max-w-3xl w-full space-y-8 p-6 bg-white dark:bg-gray-800 dark:bg-opacity-50 rounded-lg shadow-sm">
        <section>
          <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">What is Pokémon Fusion?</h2>
          <p className="text-gray-600 dark:text-gray-200">
            Pokémon Fusion is a fun project that allows you to create unique Pokémon by combining two different species. 
            Our application uses AI to generate images that blend the characteristics of two Pokémon, 
            creating entirely new creatures that showcase the best of both worlds.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">How It Works</h2>
          <p className="text-gray-600 dark:text-gray-200">
            Simply select two Pokémon to merge from our extensive database, and our algorithm will generate a fusion 
            that combines their features. You can download your creations, share them with friends, 
            or save them to your favorites for later viewing.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Our Mission</h2>
          <p className="text-gray-600 dark:text-gray-200">
            We aim to provide a creative and entertaining platform for Pokémon fans to explore 
            the endless possibilities of Pokémon combinations. Our goal is to foster creativity 
            and bring joy to the Pokémon community through innovative fusion designs.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Disclaimer</h2>
          <p className="text-gray-600 dark:text-gray-200">
            PokéFusion is a fan-made project and is not affiliated with or endorsed by Nintendo, 
            Game Freak, or The Pokémon Company. The Pokémon names and images generated on this website are not official and are not covered by any trademark.
          </p>
        </section>

        <section>
          <p className="text-gray-600 dark:text-gray-200">
            A site by <a href="https://www.linkedin.com/in/miguel-macedo-parente/" target="_blank" rel="noopener noreferrer">Miguel Macedo Parente.
          </p>
        </section>

      </div>
    </div>

    
  );
}