"use client";

import {
  CalendarDays,
  Clock,
  ExternalLink,
  Filter,
  Gauge,
  MapPin,
  Search,
  SlidersHorizontal,
  Zap
} from "lucide-react";
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

const inputClass =
  "focus-ring h-12 w-full border-4 border-black bg-white px-3 text-base font-black text-black shadow-[4px_4px_0_#111111] placeholder:text-zinc-500";
const panelShadow = "shadow-[10px_10px_0_#111111]";
const cardShadow = "shadow-[8px_8px_0_#111111]";

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
    setHasSearched(false);
    setResults([]);
    setError(undefined);
  }, []);

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
    <main className="min-h-screen overflow-hidden px-3 py-4 text-black sm:px-5 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-5">
        <header className={`border-4 border-black bg-white ${panelShadow}`}>
          <div className="grid gap-0 lg:grid-cols-[1fr_auto]">
            <div className="border-b-4 border-black bg-[#ff4fa3] p-4 sm:p-6 lg:border-b-0 lg:border-r-4">
              <p className="mb-4 inline-flex border-4 border-black bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.16em] shadow-[4px_4px_0_#111111]">
                Idea borrowed from Riley Walz
              </p>
              <h1 className="max-w-4xl text-4xl font-black leading-none text-black sm:text-6xl lg:text-7xl">
                (Probably) Empty Theatres
              </h1>
            </div>
            <div className="grid min-w-64 bg-black text-white sm:grid-cols-2 lg:grid-cols-1">
              <HeaderStat
                icon={<SlidersHorizontal className="h-5 w-5" aria-hidden="true" />}
                label="Filters"
                value={`${activeFilterCount} active`}
              />
              <HeaderStat icon={<CalendarDays className="h-5 w-5" aria-hidden="true" />} label="Date" value={date} />
            </div>
          </div>
        </header>

        <div className="grid gap-5 xl:grid-cols-[430px_minmax(0,1fr)]">
          <section className={`border-4 border-black bg-[#00d5ff] p-4 ${panelShadow} xl:sticky xl:top-5 xl:self-start`}>
            <div className="mb-4 border-b-4 border-black bg-[#f7e900] p-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em]">Search console</p>
                <h2 className="mt-1 text-3xl font-black leading-none">FIND A QUIET SPOT</h2>
              </div>
            </div>

            <form className="grid gap-4" onSubmit={onSubmit}>
              <label className="grid gap-2 text-sm font-black uppercase">
                City, postal code, or province
                <input
                  className={inputClass}
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  required
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-[1fr_130px] xl:grid-cols-[1fr_130px]">
                <label className="grid gap-2 text-sm font-black uppercase">
                  Date
                  <input
                    className={inputClass}
                    type="date"
                    value={date}
                    onChange={(event) => updateDate(event.target.value)}
                    required
                  />
                </label>

                <label className="grid gap-2 text-sm font-black uppercase">
                  Radius
                  <select
                    className={inputClass}
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

              <label className="grid gap-2 text-sm font-black uppercase">
                Movie title
                <input
                  className={inputClass}
                  value={movieTitle}
                  onChange={(event) => setMovieTitle(event.target.value)}
                  placeholder="Optional"
                />
              </label>

              <fieldset className="grid gap-3 border-4 border-black bg-white p-3 shadow-[6px_6px_0_#111111]">
                <legend className="ml-2 flex items-center gap-2 border-4 border-black bg-[#f7e900] px-3 py-1 text-sm font-black uppercase shadow-[4px_4px_0_#111111]">
                  <Filter className="h-4 w-4" aria-hidden="true" />
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
                className="focus-ring inline-flex min-h-14 items-center justify-center gap-3 border-4 border-black bg-[#ff4fa3] px-5 text-lg font-black uppercase text-black shadow-[6px_6px_0_#111111] transition hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[10px_10px_0_#111111] active:translate-x-0 active:translate-y-0 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-600"
                type="submit"
                disabled={loading}
              >
                <Search className="h-5 w-5" aria-hidden="true" />
                {loading ? "Searching" : "Search"}
              </button>
            </form>
          </section>

          <section className="grid content-start gap-5">
            <div className={`border-4 border-black bg-black text-white ${panelShadow}`}>
              <div className="grid gap-0 lg:grid-cols-[260px_1fr]">
                <div className="border-b-4 border-black bg-[#00e676] p-5 text-black lg:border-b-0 lg:border-r-4">
                  <p className="text-sm font-black uppercase tracking-[0.16em]">Results</p>
                  <p className="mt-1 text-6xl font-black leading-none">{resultCount(results, loading)}</p>
                </div>
                <div className="grid gap-4 p-5">
                  <div className="flex flex-wrap gap-3">
                    <QueryChip icon={<MapPin className="h-4 w-4" aria-hidden="true" />} label={location.trim() || "No location"} />
                    <QueryChip icon={<CalendarDays className="h-4 w-4" aria-hidden="true" />} label={date} />
                    <QueryChip icon={<Gauge className="h-4 w-4" aria-hidden="true" />} label={`${radiusKm} km`} />
                    <QueryChip icon={<Filter className="h-4 w-4" aria-hidden="true" />} label={`${activeFilterCount} filters`} />
                  </div>
                  <p className="max-w-4xl text-sm font-bold leading-6 text-zinc-100">
                    Results are likely empty, not guaranteed. Accessibility, blocked, house-reserved, and unknown seats are kept out of occupied counts.
                  </p>
                </div>
              </div>
            </div>

            {error ? (
              <div className="border-4 border-black bg-[#ff4f4f] p-4 text-sm font-black uppercase text-black shadow-[8px_8px_0_#111111]">
                {error}
              </div>
            ) : null}

            {!loading && hasSearched && !error && results.length === 0 ? (
              <div className="border-4 border-black bg-white p-5 text-sm font-black uppercase leading-6 shadow-[8px_8px_0_#111111]">
                No matching likely-empty showtimes were returned for this search. Try clearing the low-occupancy filter or using a future date.
              </div>
            ) : null}

            <div className="grid gap-5">
              {results.map((result) => (
                <ResultCard key={result.showtime.id} result={result} />
              ))}
            </div>
          </section>
        </div>
        <footer className="border-4 border-black bg-white px-4 py-3 text-center text-sm font-black uppercase tracking-[0.16em] shadow-[6px_6px_0_#111111]">
          Made with love in Waterloo
        </footer>
      </div>
    </main>
  );
}

function HeaderStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex min-h-20 items-center gap-3 border-b-4 border-white/20 p-4 last:border-b-0 sm:border-b-0 sm:border-r-4 sm:border-white/20 sm:last:border-r-0 lg:border-b-4 lg:border-r-0 lg:last:border-b-0">
      <span className="grid h-10 w-10 shrink-0 place-items-center border-4 border-white bg-[#f7e900] text-black">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#00d5ff]">{label}</p>
        <p className="truncate text-lg font-black uppercase">{value}</p>
      </div>
    </div>
  );
}

function QueryChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex max-w-full items-center gap-2 border-4 border-white bg-[#f7e900] px-3 py-2 text-sm font-black uppercase text-black shadow-[4px_4px_0_#ffffff]">
      {icon}
      <span className="truncate">{label}</span>
    </span>
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
    <label
      className={`flex min-h-12 items-center justify-between gap-3 border-4 border-black px-3 py-2 text-sm font-black uppercase shadow-[4px_4px_0_#111111] ${
        disabled ? "bg-zinc-300 text-zinc-600" : checked ? "bg-[#00e676] text-black" : "bg-white text-black"
      }`}
    >
      <span>{label}</span>
      <input
        className="h-5 w-5 accent-[#ff4fa3]"
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
  const emptySeats = Math.max(0, result.snapshot.sellableSeats - result.snapshot.occupiedEstimate);
  const occupancy =
    result.snapshot.sellableSeats > 0
      ? Math.round((result.snapshot.occupiedEstimate / result.snapshot.sellableSeats) * 100)
      : 0;

  return (
    <article className={`border-4 border-black bg-white ${cardShadow}`}>
      <div className="grid gap-3 border-b-4 border-black bg-[#f7e900] p-4 lg:grid-cols-[1fr_auto]">
        <div className="min-w-0">
          <h2 className="text-2xl font-black uppercase leading-tight text-black">{result.theatre.name}</h2>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm font-black uppercase">
            <MapPin className="h-4 w-4 text-[#ff4fa3]" aria-hidden="true" />
            <span>
              {result.theatre.city}, {result.theatre.province}
            </span>
            {result.distanceKm !== undefined ? <span>{result.distanceKm.toFixed(1)} km</span> : null}
          </p>
        </div>
        <a
          className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 border-4 border-black bg-white px-4 text-sm font-black uppercase shadow-[4px_4px_0_#111111] transition hover:-translate-x-1 hover:-translate-y-1 hover:bg-[#00d5ff] hover:shadow-[7px_7px_0_#111111]"
          href={result.showtime.ticketUrl}
          target="_blank"
          rel="noreferrer"
        >
          Cineplex
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </a>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="grid content-start gap-4 p-4">
          <div>
            <p className="flex flex-wrap items-center gap-2 text-xl font-black uppercase leading-tight">
              <Clock className="h-5 w-5 text-[#00a651]" aria-hidden="true" />
              <span>{startsAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
              <span>{result.showtime.movieTitle}</span>
            </p>
            <p className="mt-2 text-sm font-black uppercase text-zinc-700">
              {[result.showtime.format, result.showtime.auditorium].filter(Boolean).join(" / ")}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <MetricSlab label="Open seats" value={String(emptySeats)} tone="bg-[#00e676]" />
            <MetricSlab label="Occupied" value={`${result.snapshot.occupiedEstimate}/${result.snapshot.sellableSeats}`} tone="bg-[#ff4fa3]" />
            <MetricSlab label="Occupancy" value={`${occupancy}%`} tone="bg-[#00d5ff]" />
          </div>
        </div>

        <aside className="grid border-t-4 border-black bg-black text-white lg:border-l-4 lg:border-t-0">
          <div className="border-b-4 border-white/20 p-4">
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[#f7e900]">
              <Zap className="h-4 w-4" aria-hidden="true" />
              Confidence
            </p>
            <p className="mt-1 text-2xl font-black uppercase">{formatConfidence(result.snapshot.confidence)}</p>
          </div>
          <div className="grid gap-2 p-4 text-sm font-bold uppercase text-zinc-100">
            <p>Last checked {relativeMinutes(checkedAt)} min ago</p>
            <p>
              Ambiguous seats: {result.snapshot.accessibilityCount + result.snapshot.blockedCount + result.snapshot.unknownCount}
            </p>
          </div>
        </aside>
      </div>
    </article>
  );
}

function MetricSlab({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className={`border-4 border-black p-3 text-black shadow-[4px_4px_0_#111111] ${tone}`}>
      <p className="text-xs font-black uppercase tracking-[0.14em]">{label}</p>
      <p className="mt-1 text-3xl font-black leading-none">{value}</p>
    </div>
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
