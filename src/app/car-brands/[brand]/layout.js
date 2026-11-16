import { pageMeta, titleCase } from "@/lib/site";

export async function generateMetadata({ params }) {
  const { brand } = await params;
  const name = titleCase(brand);
  return pageMeta({
    title: `${name} Car Service & Repair`,
    description: `${name} car service and repair in Guntur. Choose your ${name} model for general service, diagnostics, electrical, AC and specialist repairs at Automotive Car Care.`,
    path: `/car-brands/${brand}`,
  });
}

export default function Layout({ children }) {
  return children;
}
