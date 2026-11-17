import DocumentView from "@/components/workshop/DocumentView";

export default async function Page({ params }) {
  const { id } = await params;
  return (
    <DocumentView
      url={`/api/admin/job-cards?id=${id}`}
      type="jobcard"
      backHref="/admin/dashboard"
      backLabel="Back"
      signInHref="/admin-login"
    />
  );
}
