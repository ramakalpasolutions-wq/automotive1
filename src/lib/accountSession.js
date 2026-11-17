// Website sign-in reuses the app's account endpoints, then moves the token into
// an httpOnly cookie (so page scripts never see it).
import { NextResponse } from "next/server";
import { setSessionCookie } from "./tokens";

export const USER_TOKEN_DAYS = 60;

export async function withSessionCookie(appResponse) {
  const data = await appResponse.json().catch(() => ({}));
  if (!appResponse.ok || !data.token) return NextResponse.json(data, { status: appResponse.status });
  const { token, ...rest } = data;
  return setSessionCookie(NextResponse.json(rest), "user", token, USER_TOKEN_DAYS);
}
