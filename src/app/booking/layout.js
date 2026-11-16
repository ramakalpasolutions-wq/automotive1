import { pageMeta } from "@/lib/site";

export const metadata = pageMeta({
  title: "Book a Car Service Online",
  description:
    "Book your car service or repair at Automotive Car Care, Guntur in under a minute. Choose your service, pick a time, and we'll confirm by phone or email.",
  path: "/booking",
});

export default function Layout({ children }) {
  return children;
}
