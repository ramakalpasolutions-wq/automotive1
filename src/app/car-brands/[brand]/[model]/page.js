import ModelClient from "./ModelClient";
import JsonLd, { breadcrumbs } from "@/components/JsonLd";
import { getCarModel } from "@/lib/data";
import { SITE, SITE_URL, titleCase } from "@/lib/site";

export const revalidate = 3600;

// Built on first visit, then cached and refreshed hourly.
export async function generateStaticParams() {
  return [];
}

export default async function Page({ params }) {
  const { brand, model } = await params;
  const doc = await getCarModel(brand, model);
  const brandName = titleCase(brand);
  const name = `${brandName} ${doc?.name || titleCase(model)}`;
  return (
    <>
      <JsonLd
        data={[
          breadcrumbs(SITE_URL, [
            ["Home", "/"],
            ["Car Brands", "/car-brands"],
            [brandName, `/car-brands/${brand}`],
            [name, `/car-brands/${brand}/${model}`],
          ]),
          {
            "@context": "https://schema.org",
            "@type": "Service",
            name: `${name} Service & Repair`,
            serviceType: "Car service and repair",
            provider: { "@id": `${SITE_URL}/#business` },
            areaServed: { "@type": "City", name: SITE.city },
            ...(doc?.image ? { image: doc.image } : {}),
          },
        ]}
      />
      <ModelClient model={doc} />
    </>
  );
}
