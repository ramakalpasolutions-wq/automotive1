import { pageMeta, titleCase } from "@/lib/site";
import { getCarModel } from "@/lib/data";

export async function generateMetadata({ params }) {
  const { brand, model } = await params;
  const doc = await getCarModel(brand, model);
  const name = `${titleCase(brand)} ${doc?.name || titleCase(model)}`;
  const variants = (doc?.variants || []).filter(v => v !== doc?.name).slice(0, 6);
  return pageMeta({
    title: `${name} Service & Repair`,
    description: `${name} service and repair in Guntur${variants.length ? ` (all variants incl. ${variants.join(", ")})` : ""}: general service, AC, electrical, ECU, ABS, airbag and diagnostics at Automotive Car Care. Book online.`,
    path: `/car-brands/${brand}/${model}`,
    ...(doc?.image ? { image: doc.image } : {}),
  });
}

export default function Layout({ children }) {
  return children;
}
