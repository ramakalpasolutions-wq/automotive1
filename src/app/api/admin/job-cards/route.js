import { adminCrud } from "@/lib/adminCrud";
import { cleanJobCard } from "@/lib/workshop";

export const { GET, POST, PUT, DELETE } = adminCrud({ collection: "jobcards", kind: "jobcard", clean: cleanJobCard, level: "manager" }); // managers can view/create/update; delete is admin-only
