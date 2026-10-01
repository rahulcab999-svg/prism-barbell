import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

export const metadata = {
  title: 'Thinking OS — Barbell Decision Engine',
  description:
    'Personal Decision Intelligence grounded in Peter Thiel and Nassim Nicholas Taleb',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.className}>
      <head>
        <style>{`
          * { box-sizing: border-box; }

          body {
            margin: 0;
            background: #f0f2f5;
            color: #1a1a2e;
            font-family: 'Inter', sans-serif;
            font-size: 16px;
            line-height: 1.7;
            -webkit-font-smoothing: antialiased;
          }

          h1 { font-size: 24px; }
          h2 { font-size: 18px; }
          h3 { font-size: 16px; }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
