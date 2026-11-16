import Link from "next/link";
import { notFound } from "next/navigation";
import JsonLd, { breadcrumbs } from "@/components/JsonLd";
import { cleanName, cleanText, getAllServices, getCarBrands, getService } from "@/lib/data";
import { SITE, SITE_URL, pageMeta } from "@/lib/site";

// One page per service (e.g. /services/ac-services-car-air-conditioning-service),
// so each service can rank for its own searches like "car AC repair Guntur".
export const revalidate = 3600;

export async function generateStaticParams() {
  return (await getAllServices()).map(s => ({ slug: s.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const s = await getService(slug);
  if (!s) return {};
  const name = cleanName(s.name);
  const summary = cleanText(s.description).replace(/\s+/g, " ").slice(0, 120);
  return pageMeta({
    title: `${name} in ${SITE.city}`,
    description: `${name} in ${SITE.city} for all car brands at ${SITE.name}. ${summary}${summary.length >= 120 ? "…" : ""} Call ${SITE.phone} or book online.`,
    path: `/services/${slug}`,
    image: s.hero || SITE.ogImage,
  });
}

// "✅ item" lines become a checklist; everything else stays as paragraphs.
function Body({ text }) {
  const blocks = String(text || "").split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
  const out = [];
  let list = [];
  const flush = () => {
    if (list.length) out.push(<ul key={`l${out.length}`} className="grid sm:grid-cols-2 gap-2 my-4">{list}</ul>);
    list = [];
  };
  for (const b of blocks) {
    if (/^[✅✔☑•\-*]/u.test(b)) {
      for (const line of b.split("\n")) {
        const t = cleanText(line.replace(/^[✅✔☑•\-*]\s*/u, ""));
        if (t) list.push(<li key={`i${out.length}-${list.length}`} className="flex gap-2 text-gray-700"><span className="text-green-600">✓</span>{t}</li>);
      }
    } else {
      flush();
      const t = cleanText(b);
      if (t) out.push(<p key={`p${out.length}`} className="text-gray-700 leading-relaxed mb-4 whitespace-pre-line">{t}</p>);
    }
  }
  flush();
  return out;
}

export default async function ServicePage({ params }) {
  const { slug } = await params;
  const [service, all, brands] = await Promise.all([getService(slug), getAllServices(), getCarBrands()]);
  if (!service) notFound();

  const name = cleanName(service.name);
  const tagline = cleanText(service.tagline).split("\n")[0].replace(/[“”"]/g, "");
  const related = all.filter(s => s.slug !== slug).slice(0, 8);
  const brandNames = brands.map(b => b.name).filter(Boolean);

  const faqs = [
    {
      q: `Where can I get ${name.toLowerCase()} in ${SITE.city}?`,
      a: `${SITE.name} offers ${name.toLowerCase()} at our workshop in ${SITE.city}, ${SITE.region}. Book online at ${SITE_URL}/booking or call ${SITE.phone}.`,
    },
    {
      q: `Which cars do you handle for ${name.toLowerCase()}?`,
      a: `We work on all major car brands${brandNames.length ? `, including ${brandNames.slice(0, 10).join(", ")}` : ""}.`,
    },
    {
      q: `How do I book ${name.toLowerCase()}?`,
      a: `Choose your car brand and model on our online booking page, pick a date and time, and we will confirm your slot. You can also call or WhatsApp ${SITE.phone}.`,
    },
  ];

  const path = `/services/${slug}`;
  return (
    <main className="bg-white">
      <JsonLd
        data={[
          breadcrumbs(SITE_URL, [
            ["Home", "/"],
            ["Services", "/services"],
            [name, path],
          ]),
          {
            "@context": "https://schema.org",
            "@type": "Service",
            name,
            description: cleanText(service.description).replace(/\s+/g, " "),
            serviceType: name,
            url: `${SITE_URL}${path}`,
            ...(service.hero ? { image: service.hero } : {}),
            provider: { "@id": `${SITE_URL}/#business` },
            areaServed: SITE.areaServed.map(n => ({ "@type": "City", name: n })),
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map(f => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          },
        ]}
      />

      <section
        className="relative bg-gray-900 text-white py-20 md:py-28"
        style={service.hero ? { backgroundImage: `url(${service.hero})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
      >
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <nav aria-label="Breadcrumb" className="text-xs text-gray-300 mb-6">
            <Link href="/" className="hover:underline">Home</Link> /{" "}
            <Link href="/services" className="hover:underline">Services</Link> / <span>{name}</span>
          </nav>
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            {name} in {SITE.city}
          </h1>
          {tagline && <p className="text-lg md:text-xl text-white/90">{tagline}</p>}
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <Link href={`/booking?service=${slug}`} className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-xl font-semibold">
              Book this service
            </Link>
            <a href={`tel:${SITE.phone.replace(/-/g, "")}`} className="bg-white/10 hover:bg-white/20 px-6 py-3 rounded-xl font-semibold">
              Call {SITE.phone.replace("+91-", "+91 ").replace(/-/g, " ")}
            </a>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 grid lg:grid-cols-3 gap-12">
        <article className="lg:col-span-2">
          {service.contentImage && (
            <img src={service.contentImage} alt={`${name} at ${SITE.name}, ${SITE.city}`} className="w-full rounded-2xl shadow-lg mb-10" />
          )}
          <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-4">About our {name.toLowerCase()}</h2>
          <Body text={service.description} />
          <Body text={service.content} />
          {service.features && (
            <>
              <h2 className="text-2xl font-semibold text-gray-900 mt-10 mb-2">Why choose us</h2>
              <Body text={service.features} />
            </>
          )}

          <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 mt-12 mb-6">Frequently asked questions</h2>
          <div className="space-y-4">
            {faqs.map(f => (
              <details key={f.q} className="border border-gray-200 rounded-xl p-5" open>
                <summary className="font-semibold text-gray-900 cursor-pointer">{f.q}</summary>
                <p className="text-gray-700 mt-3">{f.a}</p>
              </details>
            ))}
          </div>
        </article>

        <aside className="space-y-8">
          <div className="bg-gray-900 text-white rounded-2xl p-6">
            <h2 className="text-xl font-semibold mb-2">Book {name}</h2>
            <p className="text-sm text-gray-300 mb-4">
              {SITE.name}, {SITE.city}, {SITE.region}. All car brands serviced.
            </p>
            <Link href={`/booking?service=${slug}`} className="block text-center bg-green-600 hover:bg-green-700 py-3 rounded-xl font-semibold">
              Book online
            </Link>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Other services</h2>
            <ul className="space-y-2">
              {related.map(s => (
                <li key={s.slug}>
                  <Link href={`/services/${s.slug}`} className="text-gray-700 hover:text-green-700 hover:underline">
                    {cleanName(s.name)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          {brands.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Car brands we service</h2>
              <div className="flex flex-wrap gap-2">
                {brands.filter(b => b.brandSlug).map(b => (
                  <Link key={b.brandSlug} href={`/car-brands/${b.brandSlug}`} className="text-sm border border-gray-200 rounded-full px-3 py-1 hover:border-green-600">
                    {b.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
