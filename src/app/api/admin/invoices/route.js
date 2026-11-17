import { adminCrud } from "@/lib/adminCrud";
import { cleanInvoice } from "@/lib/workshop";

export const { GET, POST, PUT, DELETE } = adminCrud({ collection: "invoices", kind: "invoice", clean: cleanInvoice });
