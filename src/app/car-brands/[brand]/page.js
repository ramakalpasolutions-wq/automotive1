import BrandClient from "./BrandClient";
import { getCarModels } from "@/lib/data";

export const revalidate = 3600;

// Built on first visit, then cached and refreshed hourly.
export async function generateStaticParams() {
  return [];
}

export default async function Page({ params }) {
  const { brand } = await params;
  return <BrandClient initialModels={await getCarModels(brand)} />;
}
