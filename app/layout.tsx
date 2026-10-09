import type { Metadata } from 'next';
import './globals.css';
import { RenewalDeskProvider } from '@/lib/store';

export const metadata: Metadata = {
  title: 'RenewalDesk — Find Due Customers & Bring Them Back via WhatsApp',
  description: 'Helping small service businesses track due dates, follow up on WhatsApp, and recover repeat revenue.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased font-sans">
        <RenewalDeskProvider>
          {children}
        </RenewalDeskProvider>
      </body>
    </html>
  );
}
