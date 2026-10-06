import type { Metadata, Viewport } from 'next';

import { fontVariables } from '@/lib/fonts';
import { siteUrl } from '@/lib/env';
import './globals.css';
import './mobile.css';

/**
 * Root layout. Per-page metadata is layered on top of these defaults by each
 * route's generateMetadata, which reads from the SEO table in the CMS.
 */
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: 'Live Miracle — Broadcast Studios & Live Production Infrastructure',
    template: '%s — Live Miracle',
  },
  description:
    'Live Miracle designs, builds and operates professional broadcast studio environments across Georgia, Armenia, Bulgaria and Ukraine.',
  applicationName: 'Live Miracle',
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: '/brand/favicon.png', type: 'image/png', sizes: '64x64' },
    ],
    apple: '/apple-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#FFFFFF',
  colorScheme: 'light',
  width: 'device-width',
  initialScale: 1,
  // Zooming must stay available for accessibility.
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontVariables} suppressHydrationWarning>
      <head>
        {/*
          Scroll reveals are rendered hidden and revealed by IntersectionObserver.
          Without JavaScript that observer never runs, so this forces every
          revealed element visible rather than leaving the page blank.
        */}
        <noscript>
          <style
            dangerouslySetInnerHTML={{
              __html:
                '.lm-reveal{opacity:1!important;transform:none!important}' +
                '.lm-mask{clip-path:none!important}',
            }}
          />
        </noscript>
      </head>
      <body className="min-h-dvh bg-void text-mist">{children}</body>
    </html>
  );
}
