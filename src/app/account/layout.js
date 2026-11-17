// Customer account pages: private, keep them out of Google.
export const metadata = {
  title: "My Account",
  alternates: { canonical: null },
  robots: { index: false, follow: false },
};

export default function Layout({ children }) {
  return <div className="bg-gray-50 min-h-[70vh]">{children}</div>;
}
