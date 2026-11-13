import { NextResponse } from "next/server";
import { getDestinyStatus } from "@/lib/destiny"; // the original site's Bungie layer, shared

// Never cached: the 10 minute TTL lives on the upstream Bungie fetches inside getDestinyStatus.
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getDestinyStatus(), { headers: { "Cache-Control": "no-store" } });
}
