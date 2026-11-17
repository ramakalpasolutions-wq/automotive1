import { POST as appSignup } from "@/app/api/app/signup/route";
import { withSessionCookie } from "@/lib/accountSession";

export async function POST(request) {
  return withSessionCookie(await appSignup(request));
}
