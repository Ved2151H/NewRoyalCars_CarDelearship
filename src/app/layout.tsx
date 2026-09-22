import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'New Royal Cars | Premium Luxury Automotive Dealership',
  description:
    'Drive your dream today with New Royal Cars. Premium pre-owned luxury vehicles, trusted deals, and royal experience.',
  openGraph: {
    title: 'New Royal Cars | Premium Luxury Automotive Dealership',
    description:
      'Drive your dream today with New Royal Cars. Premium pre-owned luxury vehicles, trusted deals, and royal experience.',
    type: 'website',
  },
  twitter: { card: 'summary_large_image' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#050607',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body className="bg-[#050607] text-neutral-100 font-sans antialiased overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
