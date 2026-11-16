import { Suspense } from "react";
import SpecialServicesClient from "./SpecialServicesClient";
import { pageMeta } from "@/lib/site";

export const metadata = pageMeta({
  title: "ECU, ABS, Airbag, Gearbox & Key Repair",
  description:
    "Specialist car repairs in Guntur: ECU programming and network repair, ABS and airbag repair, gearbox repair, car key programming, central locking and sensor diagnostics.",
  path: "/special-services",
  image: "/services/special/hero.png",
});

export default function Page() {
  return (
    <Suspense fallback={
      <div className="bg-gray-900 min-h-screen flex items-center justify-center">
        <div className="text-white text-xl animate-pulse">
          Loading Special Services...
        </div>
      </div>
    }>
      <SpecialServicesClient />
    </Suspense>
  );
}