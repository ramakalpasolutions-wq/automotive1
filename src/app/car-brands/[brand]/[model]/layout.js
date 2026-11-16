import { pageMeta, titleCase } from "@/lib/site";

export async function generateMetadata({ params }) {
  const { brand, model } = await params;
  const name = `${titleCase(brand)} ${titleCase(model)}`;
  return pageMeta({
    title: `${name} Service & Repair`,
    description: `${name} service and repair in Guntur: general service, AC, electrical, mechanical, ECU and diagnostics by specialists at Automotive Car Care. Book online.`,
    path: `/car-brands/${brand}/${model}`,
  });
}

export default function Layout({ children }) {
  return children;
}
