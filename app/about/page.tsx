"use client";

import { Card } from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-16">
        <div className="relative h-32 w-32 mx-auto mb-6">
          <Image
            src="/logo.webp"
            alt="PokéFusion Logo"
            width={128}
            height={128}
            className="object-contain"
            priority
          />
        </div>
        <h1 className="text-5xl font-bold mb-6">About PokéFusion</h1>
        <p className="text-xl text-gray-300 max-w-2xl mx-auto">
          Bringing Pokémon fans together through the art of fusion
        </p>
      </div>
      
      <Card className="enhanced-card p-8 mb-10 rounded-lg">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="flex-1">
            <h2 className="text-3xl font-semibold mb-6">Our Mission</h2>
            <p className="text-gray-200 mb-4 text-lg">
              PokéFusion is a creative platform that allows Pokémon fans to explore the exciting 
              possibilities of combining their favorite Pokémon. Using advanced AI technology, 
              we generate unique fusion images that blend the characteristics of two Pokémon into 
              one extraordinary creation.
            </p>
            <p className="text-gray-200 text-lg">
              Our mission is to expand the Pokémon universe by providing a fun, interactive way 
              for fans to experiment with new Pokémon combinations and share their creations with 
              the community.
            </p>
          </div>
          <div className="md:w-1/3 flex items-center justify-center">
            <div className="relative w-full aspect-square max-w-[200px]">
              <Image
                src="/android-chrome-512x512.png"
                alt="PokéFusion Mission"
                width={200}
                height={200}
                className="object-contain"
              />
            </div>
          </div>
        </div>
      </Card>

      <Card className="enhanced-card p-8 mb-10 rounded-lg">
        <h2 className="text-3xl font-semibold mb-8 text-center">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex flex-col items-center text-center">
            <div className="bg-indigo-600 rounded-full p-4 mb-6 w-20 h-20 flex items-center justify-center">
              <span className="text-3xl font-bold">1</span>
            </div>
            <h3 className="text-xl font-medium mb-3">Select Pokémon</h3>
            <p className="text-gray-300 text-lg">
              Choose any two Pokémon from our extensive database of over 800 species
            </p>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="bg-indigo-600 rounded-full p-4 mb-6 w-20 h-20 flex items-center justify-center">
              <span className="text-3xl font-bold">2</span>
            </div>
            <h3 className="text-xl font-medium mb-3">Generate Fusion</h3>
            <p className="text-gray-300 text-lg">
              Our AI combines the selected Pokémon into a unique fusion with blended characteristics
            </p>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="bg-indigo-600 rounded-full p-4 mb-6 w-20 h-20 flex items-center justify-center">
              <span className="text-3xl font-bold">3</span>
            </div>
            <h3 className="text-xl font-medium mb-3">Share Creation</h3>
            <p className="text-gray-300 text-lg">
              Save your fusion and share it with friends and the Pokémon community
            </p>
          </div>
        </div>
      </Card>

      <Card className="enhanced-card p-8 mb-10 rounded-lg">
        <div className="flex flex-col md:flex-row-reverse gap-8">
          <div className="flex-1">
            <h2 className="text-3xl font-semibold mb-6">Our Technology</h2>
            <p className="text-gray-200 mb-4 text-lg">
              PokéFusion uses state-of-the-art AI image generation technology to create high-quality 
              Pokémon fusions. Our system analyzes the key visual characteristics of each Pokémon and 
              intelligently combines them to create a coherent and visually appealing fusion.
            </p>
            <p className="text-gray-200 text-lg">
              We&apos;re constantly improving our algorithms to deliver better and more creative results,
              ensuring that each fusion is unique and captures the essence of both parent Pokémon.
            </p>
          </div>
          <div className="md:w-1/3 flex items-center justify-center">
            <div className="relative w-full aspect-square max-w-[200px] bg-gray-800 rounded-lg p-4">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-3/4 h-3/4 relative">
                  <Image
                    src="/android-chrome-256x256.png"
                    alt="AI Technology"
                    width={150}
                    height={150}
                    className="object-contain"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="enhanced-card p-8 rounded-lg">
        <h2 className="text-3xl font-semibold mb-6 text-center">Contact Us</h2>
        <p className="text-gray-200 mb-8 text-center text-lg">
          Have questions, suggestions, or feedback? We&apos;d love to hear from you!
        </p>
        <div className="flex flex-col md:flex-row justify-center gap-6 max-w-md mx-auto">
          <Link 
            href="https://discord.gg/pokefusion" 
            target="_blank"
            rel="noopener noreferrer"
            className="gradient-button text-white py-4 px-6 rounded-lg text-center transition-colors flex-1 flex items-center justify-center gap-2 text-lg"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="12" r="1"></circle>
              <circle cx="15" cy="12" r="1"></circle>
              <path d="M7.5 7.5c3.5-1 5.5-1 9 0"></path>
              <path d="M7 16.5c3.5 1 6.5 1 10 0"></path>
              <path d="M15.5 17c0 1 1.5 3 2 3 1.5 0 2.833-1.667 3.5-3 .667-1.667.5-5.833-1.5-11.5-1.457-1.015-3-1.34-4.5-1.5l-1 2.5"></path>
              <path d="M8.5 17c0 1-1.356 3-1.832 3-1.429 0-2.698-1.667-3.333-3-.635-1.667-.48-5.833 1.428-11.5C6.151 4.485 7.545 4.16 9 4l1 2.5"></path>
            </svg>
            Join Our Discord
          </Link>
          <Link 
            href="mailto:contact@pokefusion.com"
            className="bg-gray-700 hover:bg-gray-600 text-white py-4 px-6 rounded-lg text-center transition-colors flex-1 flex items-center justify-center gap-2 text-lg"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="20" height="16" x="2" y="4" rx="2"></rect>
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
            </svg>
            Email Us
          </Link>
        </div>
      </Card>
    </div>
  );
}