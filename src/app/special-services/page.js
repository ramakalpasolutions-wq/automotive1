import SpecialServicesClient from "./SpecialServicesClient";
import { pageMeta } from "@/lib/site";
import { getSpecialServices } from "@/lib/data";

export const revalidate = 3600;

export const metadata = pageMeta({
  title: "ECU, ABS, Airbag, Gearbox & Key Repair",
  description:
    "Specialist car repairs in Guntur: ECU programming and network repair, ABS and airbag repair, gearbox repair, car key programming, central locking and sensor diagnostics.",
  path: "/special-services",
  image: "/services/special/hero.png",
});

export default async function Page() {
  return <SpecialServicesClient initialServices={await getSpecialServices()} />;
}
