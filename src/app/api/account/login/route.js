import { POST as appLogin } from "@/app/api/app/login/route";
import { withSessionCookie } from "@/lib/accountSession";

export async function POST(request) {
  return withSessionCookie(await appLogin(request));
}
