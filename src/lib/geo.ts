type KnownLocation = Coordinates & {
  match: RegExp;
  fsa: RegExp;
};

const KNOWN_LOCATIONS: KnownLocation[] = [
  { match: /\b(toronto|yonge|dundas)\b/i, fsa: /^M[0-9][A-Z]$/, latitude: 43.6532, longitude: -79.3832 },
  { match: /\bwaterloo\b/i, fsa: /^N2[JKLTV]$/, latitude: 43.4643, longitude: -80.5204 },
  { match: /\bkitchener\b/i, fsa: /^N2[ABCEGHMNPR]$/, latitude: 43.4516, longitude: -80.4925 },
  { match: /\bcambridge\b/i, fsa: /^N1[RST]$/, latitude: 43.3616, longitude: -80.3144 },
  { match: /\bottawa\b/i, fsa: /^K[0-9][A-Z]$/, latitude: 45.4215, longitude: -75.6972 },
  { match: /\b(vancouver|bc)\b/i, fsa: /^V[0-9][A-Z]$/, latitude: 49.2827, longitude: -123.1207 },
  { match: /\b(calgary|ab)\b/i, fsa: /^T[0-9][A-Z]$/, latitude: 51.0447, longitude: -114.0719 },
  { match: /\b(montreal|qc)\b/i, fsa: /^H[0-9][A-Z]$/, latitude: 45.5019, longitude: -73.5674 }
];

export type Coordinates = {
  latitude: number;
  longitude: number;
};

export function resolveLocation(input: string): Coordinates | undefined {
  const normalized = input.trim();
  const fsa = extractForwardSortationArea(normalized);
  const location = KNOWN_LOCATIONS.find((item) => item.match.test(normalized) || (fsa && item.fsa.test(fsa)));

  return location ? { latitude: location.latitude, longitude: location.longitude } : undefined;
}

export function distanceKm(a: Coordinates, b: Coordinates): number {
  const radius = 6371;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  return 2 * radius * Math.asin(Math.sqrt(h));
}

function toRad(value: number): number {
  return (value * Math.PI) / 180;
}

function extractForwardSortationArea(input: string): string | undefined {
  const compact = input.replace(/\s+/g, "").toUpperCase();

  if (/^[A-Z][0-9][A-Z]([0-9][A-Z][0-9])?$/.test(compact)) {
    return compact.slice(0, 3);
  }

  return undefined;
}
