import { Metadata } from "next";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/contexts/auth-context";
import { ClientLayout } from "@/components/client-layout";
import { ClientPageTracker } from "@/components/ClientPageTracker";
import Script from "next/script";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: 'Pokémon Fusion - Create Unique Pokémon Combinations',
  description: 'Generate unique Pokémon fusions using AI technology. Combine two Pokémon to create amazing new creatures with our fusion generator.',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  manifest: '/manifest.json',
  applicationName: 'Pokémon Fusion',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Pokémon Fusion',
  },
  formatDetection: {
    telephone: false,
  },
  themeColor: '#4f46e5',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
  openGraph: {
    title: 'Pokémon Fusion - Create Unique Pokémon Combinations',
    description: 'Generate unique Pokémon fusions using AI technology. Combine two Pokémon to create amazing new creatures with our fusion generator.',
    url: 'https://www.pokemon-fusion.com',
    siteName: 'Pokémon Fusion',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pokémon Fusion - Create Unique Pokémon Combinations',
    description: 'Generate unique Pokémon fusions using AI technology. Combine two Pokémon to create amazing new creatures.',
  },
  verification: {
    google: 'cKaIVo9nWNcu0wwyAZVxFbEIREtsJog-6qHzJSc3LbM',
  },
  alternates: {
    canonical: 'https://www.pokemon-fusion.com',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <head>
          {/* Google Tag Manager */}
          <Script id="google-tag-manager" strategy="afterInteractive">
            {`
              (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
              new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','GTM-NGJ8SWC8');
            `}
          </Script>
          {/* End Google Tag Manager */}
          
          {/* Google Analytics */}
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=G-NQ57560QHC`}
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-NQ57560QHC');
            `}
          </Script>
          {/* End Google Analytics */}

          {/* PWA meta tags */}
          <meta name="application-name" content="Pokémon Fusion" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="default" />
          <meta name="apple-mobile-web-app-title" content="Pokémon Fusion" />
          <meta name="format-detection" content="telephone=no" />
          <meta name="mobile-web-app-capable" content="yes" />
          <meta name="msapplication-TileColor" content="#4f46e5" />
          <meta name="theme-color" content="#4f46e5" />

          {/* Apple touch icons */}
          <link rel="apple-touch-icon" href="/android-chrome-192x192.png" />
          <link rel="apple-touch-icon" sizes="192x192" href="/android-chrome-192x192.png" />
          <link rel="apple-touch-icon" sizes="256x256" href="/android-chrome-256x256.png" />
          <link rel="apple-touch-icon" sizes="512x512" href="/android-chrome-512x512.png" />
        </head>
        <body className="min-h-screen" suppressHydrationWarning>
          {/* Google Tag Manager (noscript) */}
          <noscript>
            <iframe
              src="https://www.googletagmanager.com/ns.html?id=GTM-NGJ8SWC8"
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
            ></iframe>
          </noscript>
          {/* End Google Tag Manager (noscript) */}
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <AuthProvider>
              <ClientLayout>
                <ClientPageTracker />
                {children}
              </ClientLayout>
            </AuthProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
