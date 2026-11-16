import CarBrandsClient from "./CarBrandsClient";
import { mergeBrands } from "./brands";
import { getCarBrands, getCarModels } from "@/lib/data";

export const revalidate = 3600;

export default async function Page() {
  const [brands, models] = await Promise.all([getCarBrands(), getCarModels()]);
  return <CarBrandsClient initialBrands={mergeBrands(brands, models)} />;
}
