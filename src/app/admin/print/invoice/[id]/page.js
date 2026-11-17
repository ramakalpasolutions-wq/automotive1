import DocumentView from "@/components/workshop/DocumentView";

export default async function Page({ params }) {
  const { id } = await params;
  return (
    <DocumentView
      url={`/api/admin/invoices?id=${id}`}
      type="invoice"
      backHref="/admin/dashboard"
      backLabel="Back"
      signInHref="/admin-login"
    />
  );
}
