// Main public address. Canonical links always point here, so copies of the
// site on other hosts (e.g. *.vercel.app) are not indexed as duplicates.
export const SITE_URL = (process.env.NEXT_PUBLIC_CANONICAL_URL || "https://www.automotivecarcare.in")
  .replace(/\/$/, "");

export const SITE = {
  name: "Automotive Car Care",
  url: SITE_URL,
  tagline: "Car Service, Repair & Diagnostics in Guntur",
  description:
    "Automotive Car Care, Guntur — expert car service, repair and diagnostics for all brands. General service, AC repair, electrical and mechanical work, ECU programming, key programming, ABS, airbag and gearbox repair. Book online or call +91 93927 92067.",
  phone: "+91-93927-92067",
  email: "vwautomotiveservices@gmail.com",
  city: "Guntur",
  region: "Andhra Pradesh",
  country: "IN",
  // Places customers come from. Used in structured data; edit to match reality.
  areaServed: ["Guntur", "Mangalagiri", "Tenali", "Amaravati", "Vijayawada", "Narasaraopet", "Chilakaluripet", "Sattenapalli", "Bapatla", "Ponnur"],
  ogImage: "/services/services-hero.png",
  logo: "/logo_.png",
  sameAs: [
    "https://www.instagram.com/guntur_automotive_cars",
    "https://youtube.com/@automotivecarcareguntur",
  ],
  keywords: [
    "car service Guntur",
    "car repair Guntur",
    "car mechanic Guntur",
    "car garage near me",
    "car AC repair Guntur",
    "car electrical repair",
    "ECU programming Guntur",
    "car key programming Guntur",
    "ABS repair",
    "airbag repair",
    "gearbox repair Guntur",
    "car diagnostics",
    "Automotive Car Care",
  ],
};

// Page-level metadata with canonical URL and matching social preview.
export function pageMeta({ title, description, path, image = SITE.ogImage }) {
  return {
    title: { absolute: `${title} | ${SITE.name} Guntur` },
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      locale: "en_IN",
      siteName: SITE.name,
      url: path,
      title: `${title} | ${SITE.name}`,
      description,
      images: [{ url: image }],
    },
    twitter: { card: "summary_large_image", title: `${title} | ${SITE.name}`, description, images: [image] },
  };
}

export const titleCase = slug =>
  String(slug || "").split("-").filter(Boolean).map(w => w[0].toUpperCase() + w.slice(1)).join(" ");
