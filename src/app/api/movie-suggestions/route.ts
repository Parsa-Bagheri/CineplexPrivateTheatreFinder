import { NextResponse } from "next/server";
import { z } from "zod";
import { CineplexClient } from "@/lib/cineplex-client";

const suggestionSchema = z.object({
  location: z.string().min(1),
  date: z.string().min(10),
  radiusKm: z.coerce.number().min(1).max(250),
  query: z.string().min(2).max(120),
  limit: z.coerce.number().int().min(1).max(12).optional()
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = suggestionSchema.safeParse(Object.fromEntries(url.searchParams.entries()));

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid suggestion query",
        issues: parsed.error.flatten()
      },
      { status: 400 }
    );
  }

  try {
    const suggestions = await new CineplexClient().suggestMovieTitles({
      location: parsed.data.location,
      date: parsed.data.date,
      radiusKm: parsed.data.radiusKm,
      movieTitle: parsed.data.query,
      limit: parsed.data.limit
    });

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("Live Cineplex movie suggestions failed", error);

    return NextResponse.json(
      {
        error: "Live Cineplex movie suggestions failed"
      },
      { status: 502 }
    );
  }
}
