import { distanceKm, resolveLocation, type Coordinates } from "./geo";
import { buildSeatSnapshot } from "./seat-scoring";
import type { RawSeat, SearchQuery, SearchResult, SeatSnapshot, Showtime, Theatre } from "./types";

const THEATRICAL_API_BASE = "https://apis.cineplex.com/prod/cpx/theatrical/api";
const TICKETING_API_BASE = "https://apis.cineplex.com/prod/ticketing/api";
const PUBLIC_SITE_KEY = "dcdac5601d864addbc2675a2e96cb1f8";

type CineplexTheatresResponse = {
  favouriteTheatres?: CineplexTheatre[];
  nearbyTheatres?: CineplexTheatre[];
  otherTheatres?: CineplexTheatre[];
};

type CineplexTheatre = {
  theatreId: number;
  theatreName: string;
  isVIP?: boolean;
  location?: {
    geoLocation?: {
      latitude?: number;
      longitude?: number;
    };
    address?: string;
    city?: string;
    provinceCode?: string;
    postalCode?: string;
  };
  amenities?: string[];
  accessibilities?: string[];
};

type CineplexShowtimeResponse = Array<{
  dates: Array<{
    movies: CineplexMovieShowtime[];
  }>;
}>;

type CineplexMovieShowtime = {
  name: string;
  experiences?: Array<{
    experienceTypes?: string[];
    isCcEnabled?: boolean;
    isDsEnabled?: boolean;
    sessions?: CineplexSession[];
  }>;
};

type CineplexSession = {
  vistaSessionId: number;
  showStartDateTime: string;
  seatMapUrl?: string;
  ticketingUrl?: string;
  isSoldOut?: boolean;
  isInThePast?: boolean;
  isReservedSeating?: boolean;
  areaCode?: string;
  auditorium?: string;
};

type SeatLayoutArea = {
  rows?: Array<{
    label?: string | null;
    seats?: Array<{
      id: string;
      label?: string;
      type?: string;
    }>;
  }>;
};

type SeatLayout = {
  standardSeats?: SeatLayoutArea;
  dboxSeats?: SeatLayoutArea;
  balconySeats?: SeatLayoutArea;
};

type SeatAvailability = {
  seatAvailabilities?: Record<string, string>;
  isPostShowtime?: boolean;
};

export class CineplexClient {
  private readonly headers: HeadersInit;

  constructor(subscriptionKey = process.env.CINEPLEX_APIM_SUBSCRIPTION_KEY || PUBLIC_SITE_KEY) {
    this.headers = {
      Accept: "application/json",
      "Ocp-Apim-Subscription-Key": subscriptionKey
    };
  }

  async search(query: SearchQuery): Promise<SearchResult[]> {
    const theatres = await this.findTheatres(query);
    const maxTheatres = Number(process.env.CINEPLEX_MAX_THEATRES_PER_SEARCH ?? 5);
    const maxSeatChecks = Number(process.env.CINEPLEX_MAX_SEAT_CHECKS_PER_SEARCH ?? 40);
    let seatChecks = 0;
    const results: SearchResult[] = [];

    for (const theatre of theatres.slice(0, maxTheatres)) {
      const showtimes = await this.getShowtimes(theatre, query.date);
      const matchingShowtimes = this.filterShowtimes(showtimes, query);
      const queryCoordinates = resolveLocation(query.location);

      for (const showtime of matchingShowtimes) {
        if (seatChecks >= maxSeatChecks) {
          break;
        }

        seatChecks += 1;
        const snapshot = await this.getSeatSnapshot(theatre, showtime);
        const result = {
          theatre,
          showtime,
          snapshot,
          distanceKm: theatre.latitude !== undefined && theatre.longitude !== undefined && queryCoordinates
            ? distanceKm(queryCoordinates, {
                latitude: theatre.latitude,
                longitude: theatre.longitude
              })
            : undefined
        };

        if (this.matchesSnapshotFilters(result, query)) {
          results.push(result);
        }
      }
    }

    return results.sort((a, b) => {
      const confidenceRank = {
        high: 0,
        medium: 1,
        "low-but-interesting": 2,
        "not-empty": 3,
        unknown: 4
      };

      return (
        confidenceRank[a.snapshot.confidence] - confidenceRank[b.snapshot.confidence] ||
        a.snapshot.occupiedEstimate - b.snapshot.occupiedEstimate ||
        new Date(a.showtime.startsAt).getTime() - new Date(b.showtime.startsAt).getTime()
      );
    });
  }

  async findTheatres(query: Pick<SearchQuery, "location" | "radiusKm">): Promise<Theatre[]> {
    const response = await this.getJson<CineplexTheatresResponse>(
      `${THEATRICAL_API_BASE}/v1/theatres?language=en`
    );
    const rawTheatres = [
      ...(response.favouriteTheatres ?? []),
      ...(response.nearbyTheatres ?? []),
      ...(response.otherTheatres ?? [])
    ];
    const theatres = rawTheatres.map(toTheatre).filter((theatre) => Boolean(theatre.cineplexId));
    const coordinates = resolveLocation(query.location);
    const text = query.location.trim().toLowerCase();
    const provinceCode = /^[a-z]{2}$/i.test(text) ? text.toUpperCase() : undefined;
    const textMatches = theatres.filter((theatre) => matchesTheatreText(theatre, text));
    const inferredCoordinates = coordinates ?? inferCoordinatesFromMatches(textMatches, text);

    if (inferredCoordinates) {
      return theatres
        .map((theatre) => ({
          theatre,
          distance:
            theatre.latitude !== undefined && theatre.longitude !== undefined
              ? distanceKm(inferredCoordinates, { latitude: theatre.latitude, longitude: theatre.longitude })
              : Number.POSITIVE_INFINITY
        }))
        .filter((item) => item.distance <= query.radiusKm)
        .sort((a, b) => a.distance - b.distance)
        .map((item) => item.theatre);
    }

    if (provinceCode) {
      return theatres.filter((theatre) => theatre.province.toUpperCase() === provinceCode);
    }

    return textMatches;
  }

  async getShowtimes(theatre: Theatre, date: string): Promise<Showtime[]> {
    if (!theatre.cineplexId) {
      return [];
    }

    const url = `${THEATRICAL_API_BASE}/v1/showtimes?${new URLSearchParams({
      language: "en",
      locationId: theatre.cineplexId,
      date
    })}`;
    const response = await this.getJson<CineplexShowtimeResponse>(url, []);
    const showtimes: Showtime[] = [];

    for (const theatreShowtimes of response) {
      for (const showDate of theatreShowtimes.dates ?? []) {
        for (const movie of showDate.movies ?? []) {
          for (const experience of movie.experiences ?? []) {
            for (const session of experience.sessions ?? []) {
              if (session.isSoldOut || session.isInThePast || !session.isReservedSeating) {
                continue;
              }

              const format = (experience.experienceTypes ?? ["Regular"]).join(", ");
              const dbox = /D-BOX/i.test(format);
              showtimes.push({
                id: `${theatre.cineplexId}-${session.vistaSessionId}-${session.areaCode ?? "area"}`,
                cineplexShowtimeId: String(session.vistaSessionId),
                theatreId: theatre.id,
                movieTitle: movie.name,
                startsAt: session.showStartDateTime,
                format,
                auditorium: session.auditorium,
                ticketUrl: buildPublicSeatMapUrl(theatre.cineplexId, session, dbox),
                accessibleServices: [
                  ...(experience.isCcEnabled ? ["Closed captioning"] : []),
                  ...(experience.isDsEnabled ? ["Described services"] : []),
                  "Seat-map accessibility seats tracked separately"
                ]
              });
            }
          }
        }
      }
    }

    return showtimes;
  }

  async getSeatSnapshot(theatre: Theatre, showtime: Showtime): Promise<SeatSnapshot> {
    if (!theatre.cineplexId || !showtime.cineplexShowtimeId) {
      return buildSeatSnapshot(showtime.id, []);
    }

    const [layout, availability] = await Promise.all([
      this.getJson<SeatLayout>(
        `${TICKETING_API_BASE}/v1/theatre/${theatre.cineplexId}/showtime/${showtime.cineplexShowtimeId}/seat-layout`
      ),
      this.getJson<SeatAvailability>(
        `${TICKETING_API_BASE}/v1/theatre/${theatre.cineplexId}/showtime/${showtime.cineplexShowtimeId}/seat-availability?preview=true`
      )
    ]);

    return buildSeatSnapshot(showtime.id, toRawSeats(layout, availability));
  }

  private async getJson<T>(url: string, emptyFallback?: T): Promise<T> {
    const response = await fetch(url, {
      headers: this.headers,
      cache: "no-store"
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Cineplex GET failed ${response.status} for ${url}: ${body.slice(0, 300)}`);
    }

    const text = await response.text();

    if (!text.trim() && emptyFallback !== undefined) {
      return emptyFallback;
    }

    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(`Cineplex returned invalid JSON for ${url}: ${text.slice(0, 300)}`);
    }
  }

  private filterShowtimes(showtimes: Showtime[], query: SearchQuery): Showtime[] {
    const movieFilter = query.movieTitle?.trim().toLowerCase();
    const now = new Date();
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    return showtimes
      .filter((showtime) => !movieFilter || showtime.movieTitle.toLowerCase().includes(movieFilter))
      .filter((showtime) => !query.nonVipOnly || !/vip/i.test(showtime.format ?? ""))
      .filter((showtime) => {
        if (!query.startsInNextTwoHours) {
          return true;
        }

        const startsAt = new Date(showtime.startsAt);
        return startsAt >= now && startsAt <= twoHoursFromNow;
      });
  }

  private matchesSnapshotFilters(result: SearchResult, query: SearchQuery): boolean {
    return (
      (!query.onlyZeroSold || result.snapshot.occupiedEstimate === 0) &&
      (!query.maxFiveSold || result.snapshot.occupiedEstimate <= 5) &&
      (!query.accessibleAvailable || result.snapshot.accessibilityCount > 0)
    );
  }
}

function toTheatre(theatre: CineplexTheatre): Theatre {
  return {
    id: `cineplex-${theatre.theatreId}`,
    cineplexId: String(theatre.theatreId),
    name: theatre.theatreName,
    address: theatre.location?.address,
    city: theatre.location?.city ?? "",
    province: theatre.location?.provinceCode ?? "",
    postalCode: theatre.location?.postalCode,
    latitude: theatre.location?.geoLocation?.latitude,
    longitude: theatre.location?.geoLocation?.longitude,
    amenities: [...(theatre.amenities ?? []), ...(theatre.accessibilities ?? [])],
    isVip: theatre.isVIP ?? /vip/i.test(theatre.theatreName)
  };
}

function buildPublicSeatMapUrl(theatreId: string, session: CineplexSession, dbox: boolean): string {
  const publicSeatMapUrl = normalizePublicSeatMapUrl(session.seatMapUrl);

  if (publicSeatMapUrl) {
    return publicSeatMapUrl;
  }

  const url = new URL("https://www.cineplex.com/en-Mobile/ticketing/preview");
  url.searchParams.set("theatreId", theatreId);
  url.searchParams.set("showtimeId", String(session.vistaSessionId));
  url.searchParams.set("dbox", dbox ? "True" : "False");
  return url.toString();
}

function normalizePublicSeatMapUrl(rawUrl?: string): string | undefined {
  if (!rawUrl) {
    return undefined;
  }

  try {
    const url = new URL(rawUrl);
    const hostname = url.hostname.toLowerCase();
    const isCineplexPreview =
      (hostname === "www.cineplex.com" || hostname === "cineplex.com") &&
      url.pathname.toLowerCase().endsWith("/ticketing/preview") &&
      Boolean(url.searchParams.get("theatreId")) &&
      Boolean(url.searchParams.get("showtimeId"));

    return isCineplexPreview ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function matchesTheatreText(theatre: Theatre, text: string): boolean {
  const compactText = text.replace(/\s+/g, "");

  return [theatre.name, theatre.city, theatre.province, theatre.address]
    .filter(Boolean)
    .some((value) => value!.toLowerCase().includes(text)) ||
    Boolean(theatre.postalCode?.toLowerCase().replace(/\s+/g, "").includes(compactText));
}

function inferCoordinatesFromMatches(matches: Theatre[], text: string): Coordinates | undefined {
  const coordinateMatches = matches.filter(
    (theatre): theatre is Theatre & { latitude: number; longitude: number } =>
      theatre.latitude !== undefined && theatre.longitude !== undefined
  );

  const strongMatches = coordinateMatches.filter((theatre) => {
    const city = theatre.city.toLowerCase();
    const postalCode = theatre.postalCode?.toLowerCase().replace(/\s+/g, "");
    const normalizedText = text.replace(/\s+/g, "");

    return city === text || Boolean(postalCode?.startsWith(normalizedText)) || coordinateMatches.length <= 3;
  });

  if (!strongMatches.length) {
    return undefined;
  }

  return {
    latitude: strongMatches.reduce((sum, theatre) => sum + theatre.latitude, 0) / strongMatches.length,
    longitude: strongMatches.reduce((sum, theatre) => sum + theatre.longitude, 0) / strongMatches.length
  };
}

function toRawSeats(layout: SeatLayout, availability: SeatAvailability): RawSeat[] {
  const availabilityBySeat = availability.seatAvailabilities ?? {};

  if (availability.isPostShowtime) {
    return flattenSeats(layout).map((seat) => ({
      id: seat.id,
      label: seat.label,
      type: seat.type,
      status: "unknown"
    }));
  }

  return flattenSeats(layout).map((seat) => ({
    id: seat.id,
    label: seat.label,
    type: seat.type,
    status: availabilityBySeat[seat.id] ?? "Available"
  }));
}

function flattenSeats(layout: SeatLayout): Array<{ id: string; label?: string; type?: string }> {
  return [layout.standardSeats, layout.dboxSeats, layout.balconySeats].flatMap((area) =>
    (area?.rows ?? []).flatMap((row) => row.seats ?? [])
  );
}
