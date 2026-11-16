// Keep admin pages out of Google.
export const metadata = {
  title: "Admin",
  alternates: { canonical: null },
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

export default function Layout({ children }) {
  return children;
}
