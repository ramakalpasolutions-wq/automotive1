import clientPromise from "@/lib/mongodb";
import { pageMeta } from "@/lib/site";

export const revalidate = 86400;

export const metadata = {
  ...pageMeta({
    title: "Image Credits",
    description: "Credits and licences for the car model photos used on Automotive Car Care's website.",
    path: "/image-credits",
  }),
  robots: { index: false, follow: true },
};

async function getCredits() {
  try {
    const client = await clientPromise;
    return await client
      .db("automotivecarcare")
      .collection("carmodels")
      .find({ photoCredit: { $exists: true } }, { projection: { brand: 1, name: 1, photoCredit: 1, photoLicense: 1, photoLicenseUrl: 1, photoSource: 1 } })
      .sort({ brand: 1, name: 1 })
      .toArray();
  } catch {
    return [];
  }
}

export default async function ImageCreditsPage() {
  const credits = await getCredits();
  return (
    <main className="bg-white">
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-3xl md:text-4xl font-light text-gray-900 mb-4" style={{ fontFamily: "Georgia, serif" }}>
          Image Credits
        </h1>
        <p className="text-gray-600 mb-10 leading-relaxed">
          Car model photos on this site come from{" "}
          <a href="https://commons.wikimedia.org" className="text-red-600 underline" rel="noopener noreferrer" target="_blank">
            Wikimedia Commons
          </a>{" "}
          and are used under the free licences listed below. Brand names and logos belong to their respective owners
          and are used only to identify the vehicles we service.
        </p>
        {credits.length === 0 ? (
          <p className="text-gray-500">No credited images yet.</p>
        ) : (
          <ul className="divide-y divide-gray-200 text-sm">
            {credits.map(c => (
              <li key={String(c._id)} className="py-3 flex flex-col sm:flex-row sm:justify-between gap-1">
                <span className="font-medium text-gray-900">
                  {c.brand} {c.name}
                </span>
                <span className="text-gray-600 sm:text-right">
                  {c.photoSource ? (
                    <a href={c.photoSource} className="underline" rel="noopener noreferrer nofollow" target="_blank">
                      Photo
                    </a>
                  ) : (
                    "Photo"
                  )}{" "}
                  by {c.photoCredit}
                  {c.photoLicense && (
                    <>
                      ,{" "}
                      {c.photoLicenseUrl ? (
                        <a href={c.photoLicenseUrl} className="underline" rel="noopener noreferrer nofollow" target="_blank">
                          {c.photoLicense}
                        </a>
                      ) : (
                        c.photoLicense
                      )}
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
