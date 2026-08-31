import { NextResponse } from "next/server";
import { providerCatalogue } from "@/lib/ai/providers";
import { handle, requireUserId } from "@/lib/apiHelpers";

export const runtime = "nodejs";

/**
 * The provider/model catalogue the Settings UI renders. Served from the
 * server so the model lists live in one place (the provider modules) rather
 * than being duplicated in a client component.
 */
export async function GET() {
  return handle(async () => {
    await requireUserId();
    return NextResponse.json({ providers: providerCatalogue() });
  });
}
