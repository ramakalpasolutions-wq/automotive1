import DocumentView from "@/components/workshop/DocumentView";

export default async function Page({ params }) {
  const { id } = await params;
  return (
    <DocumentView
      url={`/api/account/document?type=jobcard&id=${id}`}
      type="jobcard"
      backHref="/account"
      backLabel="My account"
      signInHref="/account/login?next=/account"
    />
  );
}
