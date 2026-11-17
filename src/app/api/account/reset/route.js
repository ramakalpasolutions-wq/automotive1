import { POST as appReset } from "@/app/api/app/reset/route";
import { withSessionCookie } from "@/lib/accountSession";

export async function POST(request) {
  return withSessionCookie(await appReset(request));
}
