import { NextResponse } from "next/server";
import { getCurrentAccountScope } from "@/server/accounts/current";

export async function GET() {
  const scope = await getCurrentAccountScope();

  if (!scope) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  return NextResponse.json(scope);
}
