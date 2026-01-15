import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats uptime from seconds to human-readable format
 * @param seconds - Uptime in seconds (can be string or number)
 * @returns Formatted uptime string like "35d 14h" or "2h 30m"
 */
export function formatUptimeSeconds(seconds: number | string | null | undefined): string {
  if (!seconds) return '-';
  
  const totalSeconds = typeof seconds === 'string' ? parseInt(seconds, 10) : seconds;
  if (isNaN(totalSeconds) || totalSeconds <= 0) return '-';
  
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  
  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}
