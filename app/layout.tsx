import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { RenewalDeskProvider } from '@/lib/store';
import { ToastProvider } from '@/components/ui/Toast';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/next';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://renewaldesk.chronyx.in'),
  title: 'RenewalDesk — Find Due Customers & Bring Them Back via WhatsApp',
  description: 'Helping small service businesses track due dates, follow up on WhatsApp, and recover repeat revenue.',
  icons: {
    icon: [
      { url: '/brand/renewaldesk-icon.png', sizes: '32x32', type: 'image/png' },
      { url: '/brand/renewaldesk-icon.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/brand/renewaldesk-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased font-sans">
        <AuthProvider>
          <RenewalDeskProvider>
            <ToastProvider>{children}</ToastProvider>
          </RenewalDeskProvider>
        </AuthProvider>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
