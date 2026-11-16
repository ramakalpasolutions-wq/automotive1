import { pageMeta } from "@/lib/site";

export const metadata = pageMeta({
  title: "All Car Services & Repairs",
  description:
    "Complete car services in Guntur: general service, periodic maintenance, AC repair, electrical and mechanical repair, plus specialist ECU, ABS, airbag, gearbox and key programming work. Book online.",
  path: "/services",
});

export default function Layout({ children }) {
  return children;
}
