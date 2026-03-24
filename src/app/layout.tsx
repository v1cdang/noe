import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Prompted Journaling',
  description: 'A daily prompt journaling app with mood insights.'
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>): React.ReactElement {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0b0d12" />
      </head>
      <body>
        <div className="appShell">
          <header className="topBar">
            <div className="brand">Prompted Journaling</div>
            <nav className="navLinks">
              <a className="navLink" href="/">
                Home
              </a>
              <a className="navLink" href="/auth">
                Sign in
              </a>
              <a className="navLink" href="/dashboard">
                Dashboard
              </a>
            </nav>
          </header>
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}

