import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-helpers";
import { applyReferralCode } from "@/lib/quota";

export async function POST(req: NextRequest) {
  const { userId } = await getAuthSession();
  const effectiveUserId = userId ?? 0;

  const body = await req.json();
  const { code } = body;

  if (!code || typeof code !== "string") {
    return NextResponse.json({ error: "Missing referral code" }, { status: 400 });
  }

  const result = await applyReferralCode(effectiveUserId, code.trim().toUpperCase());

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    message: "Referral applied! You got +50 bonus queries.",
  });
}
