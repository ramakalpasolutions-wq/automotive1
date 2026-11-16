import { pageMeta } from "@/lib/site";

export const metadata = pageMeta({
  title: "Car Brands We Service",
  description:
    "Find service and repair for your car brand and model at Automotive Car Care, Guntur — all major Indian and imported car brands.",
  path: "/car-brands",
});

export default function Layout({ children }) {
  return children;
}
