import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { ConfigProvider } from '@/contexts/ConfigContext';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'PawGo - Arnés para Perros con Correa Retráctil Integrada',
  description: 'Arnés innovador para perros con correa retráctil integrada. Próximo lanzamiento en Argentina. Regístrate para ser notificado.',
  keywords: ['arnés perros', 'correa retráctil', 'accesorios perros', 'Argentina'],
  authors: [{ name: 'PawGo' }],
  openGraph: {
    title: 'PawGo - Arnés para Perros con Correa Retráctil Integrada',
    description: 'Arnés innovador para perros con correa retráctil integrada. Próximo lanzamiento en Argentina.',
    type: 'website',
    locale: 'es_AR',
    siteName: 'PawGo',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PawGo - Arnés para Perros con Correa Retráctil Integrada',
    description: 'Arnés innovador para perros con correa retráctil integrada. Próximo lanzamiento en Argentina.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={inter.variable}>
      <head>
        {process.env.NEXT_PUBLIC_GA_ID && (
          <>
            <script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
            />
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}');
                `,
              }}
            />
          </>
        )}
        {process.env.NEXT_PUBLIC_META_PIXEL_ID && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                !function(f,b,e,v,n,t,s)
                {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                n.queue=[];t=b.createElement(e);t.async=!0;
                t.src=v;s=b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t,s)}(window, document,'script',
                'https://connect.facebook.net/en_US/fbevents.js');
                fbq('init', '${process.env.NEXT_PUBLIC_META_PIXEL_ID}');
                fbq('track', 'PageView');
              `,
            }}
          />
        )}
      </head>
      <body className="antialiased">
        <ConfigProvider>
          <AuthProvider>{children}</AuthProvider>
        </ConfigProvider>
      </body>
    </html>
  );
}

