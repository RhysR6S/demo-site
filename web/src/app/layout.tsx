// src/app/layout.tsx
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/components/auth-provider"
import { DebugProvider } from "@/providers/debug-provider"
import { PageTransitionProvider } from '@/components/page-transition-provider'
import { SidebarWrapper } from '@/components/sidebar-wrapper'
import { DownloadProvider } from '@/components/download-manager'
import { MobileProvider } from '@/providers/mobile-provider'
import { Analytics } from '@vercel/analytics/react'

const inter = Inter({ 
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: "PhotoVault - Premium Stock Photo Platform",
  description: "Access exclusive, high-quality stock photography with advanced protection",
  keywords: "stock photos, premium photography, digital content",
  authors: [{ name: "DemoCreator" }],
  metadataBase: new URL('http://localhost:3000'),
  openGraph: {
    title: "PhotoVault - Premium Stock Photo Platform",
    description: "Access exclusive, high-quality stock photography with advanced protection",
    type: "website",
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'PhotoVault - Premium Stock Photo Platform',
      }
    ],
    locale: 'en_US',
    siteName: 'PhotoVault',
  },
  twitter: {
    card: "summary_large_image",
    title: "PhotoVault",
    description: "Premium stock photo platform with exclusive access",
    images: ['/twitter-image.png'],
    creator: '@DemoCreator',
  },
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
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0f172a',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${inter.className}`}>
      <head>
        {/* Additional mobile-specific meta tags */}
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="font-sans antialiased min-h-screen bg-slate-950 overflow-x-hidden max-w-full">
        <AuthProvider>
          <MobileProvider>
            <PageTransitionProvider>
              <DebugProvider>
                <DownloadProvider>
                  {/* Main app wrapper */}
                  <div className="relative min-h-screen bg-slate-950 max-w-screen overflow-x-hidden">
                    {/* Global background effects */}
                    <div className="fixed inset-0 -z-50 overflow-hidden">
                      {/* Gradient background */}
                      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />

                      {/* Animated gradient orbs */}
                      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-sky-500/5 rounded-full blur-3xl animate-pulse" />
                      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-cyan-500/3 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
                      
                      {/* Subtle grid pattern */}
                      <div 
                        className="absolute inset-0 opacity-[0.02]"
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                          backgroundSize: '60px 60px'
                        }}
                      />
                      
                      {/* Noise texture overlay */}
                      <div className="absolute inset-0 noise-overlay" />
                    </div>
                    
                    {/* Content wrapper with sidebar */}
                    <div className="relative z-0 max-w-full overflow-x-hidden">
                      <SidebarWrapper>
                        {children}
                      </SidebarWrapper>
                    </div>
                    
                    {/* Future: Global toast notifications */}
                    <div id="toast-container" className="fixed bottom-4 right-4 z-50 pointer-events-none" />
                    
                    {/* Future: Global modal portal */}
                    <div id="modal-portal" />
                  </div>
                </DownloadProvider>
              </DebugProvider>
            </PageTransitionProvider>
          </MobileProvider>
        </AuthProvider>
        
        {/* Performance monitoring script (optional) */}
        {process.env.NODE_ENV === 'production' && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                window.addEventListener('load', function() {
                  if ('performance' in window) {
                    const perfData = window.performance.timing;
                    const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
                    console.log('Page load time:', pageLoadTime, 'ms');
                  }
                });
              `,
            }}
          />
        )}
        <Analytics />
      </body>
    </html>
  )
}