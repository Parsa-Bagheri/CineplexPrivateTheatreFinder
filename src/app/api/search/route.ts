import { NextResponse } from "next/server";
import { z } from "zod";
import { CineplexClient } from "@/lib/cineplex-client";
import type { SearchResult } from "@/lib/types";

const booleanParam = z
  .enum(["true", "false"])
  .transform((value) => value === "true")
  .optional();

const searchSchema = z.object({
  location: z.string().min(1),
  date: z.string().min(10),
  radiusKm: z.coerce.number().min(1).max(250),
  movieTitle: z.string().optional(),
  onlyZeroSold: booleanParam,
  maxFiveSold: booleanParam,
  startsInNextTwoHours: booleanParam,
  nonVipOnly: booleanParam,
  accessibleAvailable: booleanParam
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = searchSchema.safeParse(Object.fromEntries(url.searchParams.entries()));

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid search query",
        issues: parsed.error.flatten()
      },
      { status: 400 }
    );
  }

  try {
    const results = await new CineplexClient().search(parsed.data);

    return NextResponse.json({ results: results.map(toUiResult) });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Live Cineplex search failed"
      },
      { status: 502 }
    );
  }
}

function toUiResult(result: SearchResult): SearchResult {
  return {
    ...result,
    snapshot: {
      ...result.snapshot,
      rawSnapshot: summarizeRawSnapshot(result.snapshot.rawSnapshot)
    }
  };
}

function summarizeRawSnapshot(rawSnapshot: unknown) {
  if (
    rawSnapshot &&
    typeof rawSnapshot === "object" &&
    "counts" in rawSnapshot &&
    typeof rawSnapshot.counts === "object"
  ) {
    return { counts: rawSnapshot.counts };
  }

  return undefined;
}
