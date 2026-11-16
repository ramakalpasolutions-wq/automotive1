import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import ConditionalLayout from "@/components/ConditionalLayout";
import { SITE } from "@/lib/site";

const inter = Inter({ subsets: ["latin"] });

const GTM_ID = "GTM-NBMB837C";

export const metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} | ${SITE.tagline}`,
    template: `%s | ${SITE.name} Guntur`,
  },
  description: SITE.description,
  keywords: SITE.keywords,
  applicationName: SITE.name,
  authors: [{ name: SITE.name, url: SITE.url }],
  creator: SITE.name,
  publisher: SITE.name,
  category: "Automotive",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "/",
    siteName: SITE.name,
    title: `${SITE.name} | ${SITE.tagline}`,
    description: SITE.description,
    images: [{ url: SITE.ogImage, width: 1536, height: 1024, alt: `${SITE.name} workshop, Guntur` }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} | ${SITE.tagline}`,
    description: SITE.description,
    images: [SITE.ogImage],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  formatDetection: { telephone: true, email: true, address: true },
  // Paste the code from Google Search Console → "HTML tag" method into this env var.
  verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
    : undefined,
};

export const viewport = {
  themeColor: "#111827",
};

// Structured data so Google can show the business (name, phone, area, socials).
const businessSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "AutoRepair",
      "@id": `${SITE.url}/#business`,
      name: SITE.name,
      description: SITE.description,
      url: SITE.url,
      telephone: SITE.phone,
      email: SITE.email,
      image: `${SITE.url}${SITE.ogImage}`,
      logo: `${SITE.url}${SITE.logo}`,
      priceRange: "₹₹",
      address: {
        "@type": "PostalAddress",
        addressLocality: SITE.city,
        addressRegion: SITE.region,
        addressCountry: SITE.country,
      },
      areaServed: { "@type": "City", name: SITE.city },
      sameAs: SITE.sameAs,
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: "Car services",
        itemListElement: [
          "General Car Service",
          "Car AC Repair",
          "Car Electrical Repair",
          "Mechanical Repair",
          "Periodic Maintenance",
          "ECU Programming",
          "Car Key Programming",
          "ABS Repair",
          "Airbag Repair",
          "Gearbox Repair",
          "Central Locking Repair",
          "Sensor Diagnostics",
        ].map(name => ({ "@type": "Offer", itemOffered: { "@type": "Service", name } })),
      },
    },
    {
      "@type": "WebSite",
      "@id": `${SITE.url}/#website`,
      url: SITE.url,
      name: SITE.name,
      inLanguage: "en-IN",
      publisher: { "@id": `${SITE.url}/#business` },
    },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en-IN" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(businessSchema) }}
        />
        {/* Google Tag Manager */}
        <Script id="gtm" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
dataLayer.push({'gtm.start': new Date().getTime(), event: 'gtm.js'});`}
        </Script>
        <Script
          id="gtm-loader"
          strategy="afterInteractive"
          src={`https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`}
        />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        <ConditionalLayout>{children}</ConditionalLayout>
      </body>
    </html>
  );
}
