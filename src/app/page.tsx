"use client";

import { Clock, ExternalLink, Filter, MapPin, Search, Ticket } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatConfidence } from "@/lib/seat-scoring";
import {
  buildSearchParams,
  getEffectiveFilters,
  getLocalDateInputValue,
  makeDefaultSearchState,
  normalizeSearchState,
  readSearchStateFromStorage,
  readSearchStateFromUrl,
  rememberSearchState,
  type SearchFilters,
  type SearchState
} from "@/lib/search-state";
import type { SearchResult } from "@/lib/types";

export default function HomePage() {
  const today = getLocalDateInputValue();
  const initialState = useMemo(() => makeDefaultSearchState(), []);
  const [location, setLocation] = useState(initialState.location);
  const [date, setDate] = useState(initialState.date);
  const [radiusKm, setRadiusKm] = useState(initialState.radiusKm);
  const [movieTitle, setMovieTitle] = useState(initialState.movieTitle);
  const [filters, setFilters] = useState<SearchFilters>(initialState.filters);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [hasSearched, setHasSearched] = useState(false);
  const loadedSavedState = useRef(false);

  const searchState: SearchState = { location, date, radiusKm, movieTitle, filters };
  const selectedDateIsToday = date === today;
  const activeFilterCount = Object.values(getEffectiveFilters(searchState, today)).filter(Boolean).length;

  const executeSearch = useCallback(async (state: SearchState, options?: { replaceUrl?: boolean; remember?: boolean }) => {
    setLoading(true);
    setError(undefined);

    const params = buildSearchParams(state);
    const response = await fetch(`/api/search?${params.toString()}`);
    const body = (await response.json()) as { results?: SearchResult[]; error?: string };

    setLoading(false);
    setHasSearched(true);

    if (options?.replaceUrl !== false) {
      window.history.replaceState(null, "", `/?${params.toString()}`);
    }

    if (options?.remember !== false) {
      rememberSearchState(window.localStorage, state, true);
    }

    if (!response.ok) {
      setResults([]);
      setError(body.error ?? "Search failed");
      return;
    }

    setResults(body.results ?? []);
  }, []);

  useEffect(() => {
    if (loadedSavedState.current) {
      return;
    }

    loadedSavedState.current = true;
    const saved =
      readSearchStateFromUrl(window.location.search) ?? readSearchStateFromStorage(window.localStorage);

    if (!saved) {
      return;
    }

    const state = normalizeSearchState(saved);
    setLocation(state.location);
    setDate(state.date);
    setRadiusKm(state.radiusKm);
    setMovieTitle(state.movieTitle);
    setFilters(state.filters);
    setHasSearched(Boolean(saved.hasSearched));

    if (saved.hasSearched) {
      void executeSearch(state, { replaceUrl: false, remember: true });
    }
  }, [executeSearch]);

  useEffect(() => {
    if (!loadedSavedState.current) {
      return;
    }

    rememberSearchState(window.localStorage, searchState, hasSearched);
  }, [date, filters, hasSearched, location, movieTitle, radiusKm]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await executeSearch(searchState);
  }

  function updateDate(value: string) {
    setDate(value);

    if (value !== today) {
      setFilters((current) => ({ ...current, startsInNextTwoHours: false }));
    }
  }

  return (
    <main className="min-h-screen bg-[#050505] px-4 py-5 text-neutral-100 sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-7xl gap-5 lg:grid-cols-[380px_1fr]">
        <section className="rounded-lg border border-neutral-800 bg-[#111111] p-4 shadow-[0_18px_70px_rgba(0,0,0,0.45)]">
          <div className="mb-5 flex items-start justify-between gap-4 border-b border-neutral-800 pb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-300">Cineplex preview data</p>
              <h1 className="mt-2 text-2xl font-semibold leading-tight text-white">Find likely empty showings</h1>
            </div>
            <Ticket className="mt-1 h-5 w-5 text-amber-300" aria-hidden="true" />
          </div>

          <form className="grid gap-4" onSubmit={onSubmit}>
            <label className="grid gap-1.5 text-sm font-medium text-neutral-200">
              City, postal code, or province
              <input
                className="focus-ring h-10 rounded-md border border-neutral-700 bg-[#1b1b1b] px-3 text-base text-white placeholder:text-neutral-500"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                required
              />
            </label>

            <div className="grid grid-cols-[1fr_120px] gap-3">
              <label className="grid gap-1.5 text-sm font-medium text-neutral-200">
                Date
                <input
                  className="focus-ring h-10 rounded-md border border-neutral-700 bg-[#1b1b1b] px-3 text-base text-white"
                  type="date"
                  value={date}
                  onChange={(event) => updateDate(event.target.value)}
                  required
                />
              </label>

              <label className="grid gap-1.5 text-sm font-medium text-neutral-200">
                Radius
                <select
                  className="focus-ring h-10 rounded-md border border-neutral-700 bg-[#1b1b1b] px-3 text-base text-white"
                  value={radiusKm}
                  onChange={(event) => setRadiusKm(event.target.value)}
                >
                  <option value="10">10 km</option>
                  <option value="25">25 km</option>
                  <option value="50">50 km</option>
                  <option value="100">100 km</option>
                </select>
              </label>
            </div>

            <label className="grid gap-1.5 text-sm font-medium text-neutral-200">
              Movie title
              <input
                className="focus-ring h-10 rounded-md border border-neutral-700 bg-[#1b1b1b] px-3 text-base text-white placeholder:text-neutral-500"
                value={movieTitle}
                onChange={(event) => setMovieTitle(event.target.value)}
                placeholder="Optional"
              />
            </label>

            <fieldset className="grid gap-2 rounded-md border border-neutral-800 bg-[#151515] p-3">
              <legend className="flex items-center gap-2 px-1 text-sm font-semibold text-neutral-100">
                <Filter className="h-4 w-4 text-amber-300" aria-hidden="true" />
                Filters
              </legend>
              <FilterToggle
                checked={filters.onlyZeroSold}
                label="0 seats sold"
                onChange={(value) => setFilters((current) => ({ ...current, onlyZeroSold: value }))}
              />
              <FilterToggle
                checked={filters.maxFiveSold}
                label="5 or fewer seats sold"
                onChange={(value) => setFilters((current) => ({ ...current, maxFiveSold: value }))}
              />
              <FilterToggle
                checked={selectedDateIsToday && filters.startsInNextTwoHours}
                disabled={!selectedDateIsToday}
                label="Starts in next 2 hours"
                onChange={(value) => setFilters((current) => ({ ...current, startsInNextTwoHours: value }))}
              />
              <FilterToggle
                checked={filters.nonVipOnly}
                label="Non-VIP only"
                onChange={(value) => setFilters((current) => ({ ...current, nonVipOnly: value }))}
              />
              <FilterToggle
                checked={filters.accessibleAvailable}
                label="Accessible seating available"
                onChange={(value) => setFilters((current) => ({ ...current, accessibleAvailable: value }))}
              />
            </fieldset>

            <button
              className="focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-md bg-amber-300 px-4 font-semibold text-black transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:text-neutral-400"
              type="submit"
              disabled={loading}
            >
              <Search className="h-4 w-4" aria-hidden="true" />
              {loading ? "Searching" : "Search"}
            </button>
          </form>
        </section>

        <section className="grid content-start gap-3">
          <div className="rounded-lg border border-neutral-800 bg-[#111111] p-4 shadow-[0_18px_70px_rgba(0,0,0,0.35)]">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm text-neutral-400">Results</p>
                <p className="mt-1 text-3xl font-semibold text-white">{resultCount(results, loading)}</p>
              </div>
              <div className="text-right text-sm text-neutral-400">
                <p>{location.trim() || "No location"} - {date}</p>
                <p>{activeFilterCount} active filter{activeFilterCount === 1 ? "" : "s"}</p>
              </div>
            </div>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-neutral-300">
              Results are likely empty, not guaranteed. Accessibility, blocked, house-reserved, and unknown seats are kept out of occupied counts.
            </p>
          </div>

          {error ? (
            <div className="rounded-md border border-red-500/40 bg-red-950/40 p-3 text-sm text-red-100">{error}</div>
          ) : null}

          {!loading && hasSearched && !error && results.length === 0 ? (
            <div className="rounded-lg border border-neutral-800 bg-[#111111] p-5 text-sm leading-6 text-neutral-300">
              No matching likely-empty showtimes were returned for this search. Try clearing the low-occupancy filter or using a future date.
            </div>
          ) : null}

          <div className="grid gap-3">
            {results.map((result) => (
              <ResultCard key={result.showtime.id} result={result} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function FilterToggle({
  checked,
  disabled = false,
  label,
  onChange
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className={`flex items-center justify-between gap-3 text-sm ${disabled ? "text-neutral-500" : "text-neutral-200"}`}>
      <span>{label}</span>
      <input
        className="h-4 w-4 accent-amber-300"
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}

function ResultCard({ result }: { result: SearchResult }) {
  const startsAt = new Date(result.showtime.startsAt);
  const checkedAt = new Date(result.snapshot.checkedAt);

  return (
    <article className="rounded-lg border border-neutral-800 bg-[#111111] p-4 shadow-[0_14px_44px_rgba(0,0,0,0.28)]">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-neutral-800 pb-3">
        <div>
          <h2 className="text-lg font-semibold text-white">{result.theatre.name}</h2>
          <p className="mt-1 flex items-center gap-1 text-sm text-neutral-400">
            <MapPin className="h-4 w-4 text-amber-300" aria-hidden="true" />
            {result.theatre.city}, {result.theatre.province}
            {result.distanceKm !== undefined ? ` - ${result.distanceKm.toFixed(1)} km` : ""}
          </p>
        </div>
        <a
          className="focus-ring inline-flex items-center gap-2 rounded-md border border-neutral-700 px-3 py-2 text-sm font-semibold text-neutral-100 transition hover:border-amber-300 hover:text-amber-200"
          href={result.showtime.ticketUrl}
          target="_blank"
          rel="noreferrer"
        >
          View on Cineplex
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </a>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
        <div>
          <p className="flex items-center gap-2 font-semibold text-neutral-100">
            <Clock className="h-4 w-4 text-emerald-300" aria-hidden="true" />
            {startsAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} - {result.showtime.movieTitle}
          </p>
          <p className="mt-1 text-sm text-neutral-400">
            {[result.showtime.format, result.showtime.auditorium].filter(Boolean).join(" - ")}
          </p>
        </div>

        <div className="grid min-w-56 gap-1 rounded-md border border-neutral-800 bg-black/35 p-3 text-sm">
          <p className="font-semibold text-white">
            {result.snapshot.occupiedEstimate} occupied / {result.snapshot.sellableSeats} seats
          </p>
          <p className="text-amber-200">{formatConfidence(result.snapshot.confidence)}</p>
          <p className="text-neutral-400">Last checked {relativeMinutes(checkedAt)} min ago</p>
          <p className="text-neutral-400">
            Ambiguous seats: {result.snapshot.accessibilityCount + result.snapshot.blockedCount + result.snapshot.unknownCount}
          </p>
        </div>
      </div>
    </article>
  );
}

function resultCount(results: SearchResult[], loading: boolean): string {
  if (loading) {
    return "Searching";
  }

  return String(results.length);
}

function relativeMinutes(date: Date): number {
  const now = new Date();
  return Math.max(0, Math.round((now.getTime() - date.getTime()) / 60000));
}
