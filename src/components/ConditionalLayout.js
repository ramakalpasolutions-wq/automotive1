"use client";

import { usePathname } from "next/navigation";
import TopBanner from "@/components/TopBanner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function ConditionalLayout({ children }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

  // Admin routes → bare layout, no header/footer
  if (isAdmin) {
    return <>{children}</>;
  }

  // All other routes → normal site layout
  return (
    <>
      <TopBanner />
      <Header />
      {children}
      <Footer />
    </>
  );
}