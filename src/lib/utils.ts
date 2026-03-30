import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function truncateFilename(name: string, max = 24): string {
  if (name.length <= max) return name;
  const dot = name.lastIndexOf('.');
  if (dot > 0 && name.length - dot <= 6) {
    const ext = name.slice(dot);
    const base = name.slice(0, max - ext.length - 1);
    return `${base}…${ext}`;
  }
  return `${name.slice(0, max - 1)}…`;
}

export function randomId(): string {
  return Math.random().toString(36).slice(2, 10);
}
