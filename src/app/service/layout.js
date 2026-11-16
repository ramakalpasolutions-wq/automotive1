import { pageMeta } from "@/lib/site";

export const metadata = pageMeta({
  title: "General Car Service & Maintenance",
  description:
    "General car service and periodic maintenance in Guntur: oil change, full check-up, AC service, electrical and mechanical repairs for all car brands by experienced technicians.",
  path: "/service",
  image: "/services/general-hero.png",
});

export default function Layout({ children }) {
  return children;
}
