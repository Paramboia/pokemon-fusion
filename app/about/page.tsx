"use client";

import { SparklesText } from "@/components/ui";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";

export default function AboutPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const [imagePaths, setImagePaths] = useState({
    charmander: "/pokemon/charmander.png",
    charmeleon: "/pokemon/charmeleon.png",
    charizard: "/pokemon/charizard.png"
  });

  useEffect(() => {
    // If the user is not signed in and the auth state is loaded, use the proxy API
    if (isLoaded && !isSignedIn) {
      setImagePaths({
        charmander: `/api/proxy-pokemon-image?name=charmander.png`,
        charmeleon: `/api/proxy-pokemon-image?name=charmeleon.png`,
        charizard: `/api/proxy-pokemon-image?name=charizard.png`
      });
    }
  }, [isLoaded, isSignedIn]);

  return (
    <div className="flex flex-col items-center">
      <div className="text-center mb-10">
        <SparklesText 
          text="About Us"
          className="text-4xl md:text-5xl font-bold mb-4"
        />
        <p className="text-xl text-gray-600 dark:text-gray-200">
          Learn more about our Pokémon fusion project
        </p>
      </div>

      <div className="max-w-3xl w-full space-y-8 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
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
            Pokémon Fusion operates on a credit-based system, allowing you to generate fusions at your own pace. 
            Each fusion generation costs 1 credit. We offer several affordable packages to suit your needs:
          </p>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border border-orange-300 dark:border-orange-700 rounded-lg bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/40 dark:to-orange-900/20 shadow-sm hover:shadow-md transition-all duration-300 hover:translate-y-[-2px]">
              <div className="flex items-center mb-1">
                <div className="w-6 h-6 mr-2 relative">
                  <Image 
                    src={imagePaths.charmander}
                    alt="Charmander" 
                    width={24} 
                    height={24} 
                    className="object-contain"
                    priority
                  />
                </div>
                <h3 className="font-bold text-lg text-orange-600 dark:text-orange-300">Starter Pack</h3>
              </div>
              <p className="text-2xl font-bold my-2">5 Credits</p>
              <p className="text-xl">€1.50</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">€0.30 per credit</p>
              <Link href="/credits" className="mt-3 inline-flex items-center text-sm text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300">
                <span>Get started</span>
                <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </div>
            <div className="p-4 border border-orange-500 dark:border-red-700 rounded-lg bg-gradient-to-br from-orange-50 to-red-100 dark:from-red-950/40 dark:to-orange-900/20 shadow-sm hover:shadow-md transition-all duration-300 hover:translate-y-[-2px]">
              <div className="flex items-center mb-1">
                <div className="w-6 h-6 mr-2 relative">
                  <Image 
                    src={imagePaths.charmeleon}
                    alt="Charmeleon" 
                    width={24} 
                    height={24} 
                    className="object-contain"
                    priority
                  />
                </div>
                <h3 className="font-bold text-lg text-red-600 dark:text-orange-300">Standard Pack</h3>
              </div>
              <p className="text-2xl font-bold my-2">20 Credits</p>
              <p className="text-xl">€5.00</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">€0.25 per credit</p>
              <Link href="/credits" className="mt-3 inline-flex items-center text-sm text-red-600 hover:text-red-700 dark:text-orange-400 dark:hover:text-orange-300">
                <span>Get started</span>
                <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </div>
            <div className="p-4 border border-red-500 dark:border-red-700 rounded-lg bg-gradient-to-br from-red-50 to-orange-100 dark:from-red-950/40 dark:to-red-900/20 shadow-sm hover:shadow-md transition-all duration-300 hover:translate-y-[-2px]">
              <div className="flex items-center mb-1">
                <div className="w-6 h-6 mr-2 relative">
                  <Image 
                    src={imagePaths.charizard}
                    alt="Charizard" 
                    width={24} 
                    height={24} 
                    className="object-contain"
                    priority
                  />
                </div>
                <h3 className="font-bold text-lg text-red-700 dark:text-red-300">Value Pack</h3>
              </div>
              <p className="text-2xl font-bold my-2">50 Credits</p>
              <p className="text-xl">€10.00</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">€0.20 per credit</p>
              <Link href="/credits" className="mt-3 inline-flex items-center text-sm text-red-700 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300">
                <span>Get started</span>
                <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
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
          <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Monthly Rewards System 🏆</h2>
          <p className="text-gray-600 dark:text-gray-200 mb-4">
            We believe in recognizing and rewarding our most creative community members! At the end of each month, 
            we automatically reward the creators of the top 3 most popular Pokémon fusions with free credits:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-200 mb-4 ml-4">
            <li><strong className="text-yellow-600 dark:text-yellow-400">🥇 1st Place:</strong> 3 free credits</li>
            <li><strong className="text-gray-400 dark:text-gray-500">🥈 2nd Place:</strong> 2 free credits</li>
            <li><strong className="text-orange-600 dark:text-orange-400">🥉 3rd Place:</strong> 1 free credit</li>
          </ul>
          <p className="text-gray-600 dark:text-gray-200">
            The rankings are based on our hot score algorithm, which considers both the number of likes and recency, 
            ensuring that newer fusions have a fair chance to compete. Credits are automatically added to winners' 
            accounts on the 1st of each month, so keep creating amazing fusions and you might be next month's winner!
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Disclaimer</h2>
          <p className="text-gray-600 dark:text-gray-200">
            Pokémon Fusion is a fan-made project and is not affiliated with or endorsed by Nintendo, 
            Game Freak, or The Pokémon Company. The Pokémon names and images generated on this website are not official and are not covered by any trademark.
          </p>
        </section>

        <section>
          <p className="text-gray-600 dark:text-gray-200">
            Built by <a href="https://miguelparente.com/?ref=miguelos" target="_blank" rel="noopener noreferrer">Miguel Macedo Parente</a>
          </p>
        </section>
      </div>
    </div>
  );
}