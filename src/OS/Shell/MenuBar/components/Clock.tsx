"use client";

/**
 * Clock Component
 * Displays current time in the menu bar
 */

import { useState, useEffect } from "react";

interface ClockProps {
  styles: Record<string, string>;
}

function formatTime(date: Date): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes.toString().padStart(2, "0");

  return `${displayHours}:${displayMinutes} ${ampm}`;
}

export function Clock({ styles }: ClockProps) {
  const [time, setTime] = useState<string>("");

  useEffect(() => {
    // Set initial time
    setTime(formatTime(new Date()));

    // Update every minute
    const interval = setInterval(() => {
      setTime(formatTime(new Date()));
    }, 60000);

    // Sync to the next minute
    const now = new Date();
    const msUntilNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();

    const timeout = setTimeout(() => {
      setTime(formatTime(new Date()));
    }, msUntilNextMinute);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  return <span className={styles.clock}>{time}</span>;
}

