import ServicesClient from "./ServicesClient";
import { getDetailedServices, getSpecialServices } from "@/lib/data";

// Rendered on the server (refreshed hourly) so search engines see every service.
export const revalidate = 3600;

export default async function Page() {
  const [general, special] = await Promise.all([getDetailedServices(), getSpecialServices()]);
  return <ServicesClient initialGeneral={general} initialSpecial={special} />;
}
