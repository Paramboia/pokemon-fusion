import { Metadata } from "next";

export const metadata: Metadata = {
  title: 'About Pokémon Fusion - Create Unique Pokémon Combinations',
  description: 'Learn about Pokémon Fusion, a fun project that allows you to create unique Pokémon by combining two different species using AI technology.',
  robots: {
    index: true,
    follow: true,
  },
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 