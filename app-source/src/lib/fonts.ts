import { Archivo, Inter, IBM_Plex_Mono } from 'next/font/google';

/**
 * Typefaces are self-hosted by next/font at build time, so no external font
 * request is made at runtime and the CSP can stay locked to 'self'.
 *
 * Archivo carries the display voice (tight, editorial, slightly condensed at
 * weight), Inter handles body copy, and IBM Plex Mono is the technical
 * annotation face used for labels, indices and status readouts.
 */
export const fontDisplay = Archivo({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
  fallback: ['Helvetica Neue', 'Arial', 'sans-serif'],
});

export const fontSans = Inter({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-sans',
  display: 'swap',
  fallback: ['system-ui', 'Segoe UI', 'sans-serif'],
});

export const fontMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
  fallback: ['ui-monospace', 'SFMono-Regular', 'monospace'],
});

export const fontVariables = `${fontDisplay.variable} ${fontSans.variable} ${fontMono.variable}`;
