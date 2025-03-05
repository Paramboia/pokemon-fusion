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
          <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Credit System</h2>
          <p className="text-gray-600 dark:text-gray-200">
            PokéFusion operates on a credit-based system, allowing you to generate fusions at your own pace. 
            Each fusion generation costs 1 credit. We offer several affordable packages to suit your needs:
          </p>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border border-purple-200 dark:border-purple-800 rounded-lg bg-purple-50 dark:bg-purple-900 dark:bg-opacity-30">
              <h3 className="font-bold text-lg text-purple-700 dark:text-purple-300">Starter Pack</h3>
              <p className="text-2xl font-bold my-2">5 Credits</p>
              <p className="text-xl">€1.50</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">€0.30 per credit</p>
            </div>
            <div className="p-4 border border-blue-200 dark:border-blue-800 rounded-lg bg-blue-50 dark:bg-blue-900 dark:bg-opacity-30">
              <h3 className="font-bold text-lg text-blue-700 dark:text-blue-300">Standard Pack</h3>
              <p className="text-2xl font-bold my-2">20 Credits</p>
              <p className="text-xl">€5.00</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">€0.25 per credit</p>
            </div>
            <div className="p-4 border border-green-200 dark:border-green-800 rounded-lg bg-green-50 dark:bg-green-900 dark:bg-opacity-30">
              <h3 className="font-bold text-lg text-green-700 dark:text-green-300">Value Pack</h3>
              <p className="text-2xl font-bold my-2">50 Credits</p>
              <p className="text-xl">€10.00</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">€0.20 per credit</p>
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-200 mt-4">
            To purchase credits, simply navigate to the Credits page from your account dashboard. 
            We use Stripe for secure payment processing, accepting all major credit cards. 
            Once your payment is processed, credits are instantly added to your account and ready to use.
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
            A site by <a href="https://www.linkedin.com/in/miguel-macedo-parente/" target="_blank" rel="noopener noreferrer">Miguel Macedo Parente</a>.
          </p>
        </section>
      </div>
    </div>
  );
}