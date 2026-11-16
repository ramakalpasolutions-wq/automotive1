import ServiceClient from "./ServiceClient";
import { getDetailedServices } from "@/lib/data";

export const revalidate = 3600;

export default async function Page() {
  return <ServiceClient initialServices={await getDetailedServices()} />;
}
