"use client";

import { useState, useEffect } from 'react';

interface AlternatingTextProps {
  messages: string[];
  interval?: number; // Time in milliseconds between message changes
}

export function AlternatingText({ messages, interval = 3000 }: AlternatingTextProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    // Only set up the interval if there are multiple messages
    if (messages.length <= 1) return;

    const intervalId = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % messages.length);
    }, interval);

    // Clean up the interval on component unmount
    return () => clearInterval(intervalId);
  }, [messages, interval]);

  // If no messages or empty array, return null
  if (!messages || messages.length === 0) return null;

  return <span>{messages[currentIndex]}</span>;
} 