import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-helpers";
import { getQuotaStatus, getReferralCode } from "@/lib/quota";

export async function GET() {
  const { userId } = await getAuthSession();
  const effectiveUserId = userId ?? 0;

  const quota = await getQuotaStatus(effectiveUserId);
  const referralCode = await getReferralCode(effectiveUserId);

  return NextResponse.json({ ...quota, referralCode });
}
