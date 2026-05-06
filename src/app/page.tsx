"use client";

import {
  CalendarDays,
  Clock,
  ExternalLink,
  Filter,
  MapPin,
  Palette,
  Radar,
  Search,
  SlidersHorizontal,
  Sparkles,
  Ticket,
  Zap
} from "lucide-react";
import {
  type Dispatch,
  type FormEvent,
  type ReactNode,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
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

type UiMode = "clean" | "fun";

type SearchViewProps = {
  activeFilterCount: number;
  date: string;
  error: string | undefined;
  filters: SearchFilters;
  hasSearched: boolean;
  loading: boolean;
  location: string;
  movieTitle: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  radiusKm: string;
  results: SearchResult[];
  selectedDateIsToday: boolean;
  setFilters: Dispatch<SetStateAction<SearchFilters>>;
  setLocation: (value: string) => void;
  setMovieTitle: (value: string) => void;
  setRadiusKm: (value: string) => void;
  setUiMode: (mode: UiMode) => void;
  uiMode: UiMode;
  updateDate: (value: string) => void;
};

const UI_MODE_STORAGE_KEY = "empty-theatres-ui-mode";

const funInputClass =
  "focus-ring h-12 w-full border-4 border-black bg-[#fff8df] px-3 text-base font-black text-black shadow-[6px_6px_0_#111111] transition placeholder:text-zinc-500 focus:-translate-y-0.5 focus:shadow-[8px_8px_0_#111111]";
const funPanelShadow = "shadow-[12px_12px_0_#111111]";
const funCardShadow = "shadow-[10px_10px_0_#111111]";

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
  const [uiMode, setUiModeState] = useState<UiMode>("clean");
  const loadedSavedState = useRef(false);

  const searchState: SearchState = { location, date, radiusKm, movieTitle, filters };
  const selectedDateIsToday = date === today;
  const activeFilterCount = Object.values(getEffectiveFilters(searchState, today)).filter(Boolean).length;

  const setUiMode = useCallback((mode: UiMode) => {
    setUiModeState(mode);
    window.localStorage.setItem(UI_MODE_STORAGE_KEY, mode);
  }, []);

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
    const savedMode = window.localStorage.getItem(UI_MODE_STORAGE_KEY);

    if (savedMode === "clean" || savedMode === "fun") {
      setUiModeState(savedMode);
    }
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

  const viewProps: SearchViewProps = {
    activeFilterCount,
    date,
    error,
    filters,
    hasSearched,
    loading,
    location,
    movieTitle,
    onSubmit,
    radiusKm,
    results,
    selectedDateIsToday,
    setFilters,
    setLocation,
    setMovieTitle,
    setRadiusKm,
    setUiMode,
    uiMode,
    updateDate
  };

  return uiMode === "fun" ? <FunHomeView {...viewProps} /> : <CleanHomeView {...viewProps} />;
}

function CleanHomeView({
  activeFilterCount,
  date,
  error,
  filters,
  hasSearched,
  loading,
  location,
  movieTitle,
  onSubmit,
  radiusKm,
  results,
  selectedDateIsToday,
  setFilters,
  setLocation,
  setMovieTitle,
  setRadiusKm,
  setUiMode,
  uiMode,
  updateDate
}: SearchViewProps) {
  return (
    <main className="flex min-h-screen flex-col bg-[#050505] px-4 py-5 text-neutral-100 sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-7xl flex-1 gap-5 lg:grid-cols-[380px_1fr]">
        <section className="rounded-lg border border-neutral-800 bg-[#111111] p-4 shadow-[0_18px_70px_rgba(0,0,0,0.45)]">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-4 border-b border-neutral-800 pb-4">
            <div>
              <h1 className="text-2xl font-semibold leading-tight text-white">(Probably) Empty Theatres</h1>
              <p className="mt-2 text-xs leading-5 text-neutral-400">Idea borrowed from Riley Walz.</p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <ModeSwitch uiMode={uiMode} onChange={setUiMode} />
              <Ticket className="h-5 w-5 text-amber-300" aria-hidden="true" />
            </div>
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
              <CleanFilterToggle
                checked={filters.onlyZeroSold}
                label="0 seats sold"
                onChange={(value) => setFilters((current) => ({ ...current, onlyZeroSold: value }))}
              />
              <CleanFilterToggle
                checked={filters.maxFiveSold}
                label="5 or fewer seats sold"
                onChange={(value) => setFilters((current) => ({ ...current, maxFiveSold: value }))}
              />
              <CleanFilterToggle
                checked={selectedDateIsToday && filters.startsInNextTwoHours}
                disabled={!selectedDateIsToday}
                label="Starts in next 2 hours"
                onChange={(value) => setFilters((current) => ({ ...current, startsInNextTwoHours: value }))}
              />
              <CleanFilterToggle
                checked={filters.nonVipOnly}
                label="Non-VIP only"
                onChange={(value) => setFilters((current) => ({ ...current, nonVipOnly: value }))}
              />
              <CleanFilterToggle
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
              <CleanResultCard key={result.showtime.id} result={result} />
            ))}
          </div>
        </section>
      </div>
      <footer className="mx-auto mt-5 w-full max-w-7xl border-t border-neutral-900 pt-4 text-center text-xs text-neutral-500">
        Made with love in Waterloo
      </footer>
    </main>
  );
}

function FunHomeView({
  activeFilterCount,
  date,
  error,
  filters,
  hasSearched,
  loading,
  location,
  movieTitle,
  onSubmit,
  radiusKm,
  results,
  selectedDateIsToday,
  setFilters,
  setLocation,
  setMovieTitle,
  setRadiusKm,
  setUiMode,
  uiMode,
  updateDate
}: SearchViewProps) {
  return (
    <main className="chaos-stage min-h-screen overflow-hidden px-3 py-4 text-black sm:px-5 lg:px-8">
      <div className="relative z-10 mx-auto flex w-full max-w-[1500px] flex-col gap-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <MarqueeStrip />
          </div>
          <div className="shrink-0 sm:pl-3">
            <ModeSwitch uiMode={uiMode} onChange={setUiMode} />
          </div>
        </div>

        <header className={`chaos-panel relative overflow-hidden border-[6px] border-black bg-white ${funPanelShadow} sm:-rotate-[0.25deg]`}>
          <div
            className="pointer-events-none absolute -right-12 top-5 hidden rotate-12 border-4 border-black bg-[#00e676] px-10 py-2 text-sm font-black uppercase tracking-[0.16em] shadow-[6px_6px_0_#111111] md:block"
            aria-hidden="true"
          >
            unofficial
          </div>
          <div className="grid gap-0 lg:grid-cols-[1fr_auto]">
            <div className="hero-blast relative border-b-[6px] border-black bg-[#ff4fa3] p-4 sm:p-7 lg:border-b-0 lg:border-r-[6px]">
              <p className="relative mb-4 inline-flex -rotate-2 border-4 border-black bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.16em] shadow-[5px_5px_0_#111111]">
                Idea borrowed from Riley Walz
              </p>
              <h1 className="ransom-title relative max-w-5xl break-words text-[clamp(3rem,9vw,7.75rem)] font-black leading-[0.83] text-black">
                <span className="inline-block -rotate-1 bg-[#f7e900] px-2 shadow-[6px_6px_0_#111111]">(Probably)</span>{" "}
                <span className="inline-block rotate-1 bg-white px-2 shadow-[6px_6px_0_#111111]">Empty</span>{" "}
                <span className="ink-pop inline-block -rotate-2 px-2 text-white">Theatres</span>
              </h1>
              <p className="relative mt-5 max-w-3xl border-4 border-black bg-black px-3 py-2 text-sm font-black normal-case tracking-[0.08em] text-[#00d5ff] shadow-[6px_6px_0_#f7e900]">
                Why do you want an empty theatre? kinda weird
              </p>
            </div>
            <div className="grid min-w-64 bg-black text-white sm:grid-cols-2 lg:grid-cols-1">
              <HeaderStat
                icon={<SlidersHorizontal className="h-5 w-5" aria-hidden="true" />}
                label="Filters"
                value={`${activeFilterCount} active`}
                accent="bg-[#f7e900]"
              />
              <HeaderStat
                icon={<CalendarDays className="h-5 w-5" aria-hidden="true" />}
                label="Date"
                value={date}
                accent="bg-[#00d5ff]"
              />
            </div>
          </div>
        </header>

        <div className="grid gap-5 xl:grid-cols-[430px_minmax(0,1fr)]">
          <section className={`chaos-panel border-[6px] border-black bg-[#00d5ff] p-4 ${funPanelShadow} sm:rotate-[-0.35deg] xl:sticky xl:top-5 xl:self-start`}>
            <div className="panic-heading mb-5 border-[6px] border-black p-3 shadow-[7px_7px_0_#111111]">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em]">Search console</p>
                <h2 className="mt-1 break-words text-[clamp(1.85rem,5.2vw,3.2rem)] font-black uppercase leading-none">
                  Find a private theatre near you, yes you.
                </h2>
              </div>
            </div>

            <form className="grid gap-4" onSubmit={onSubmit}>
              <label className="grid gap-2 text-sm font-black uppercase">
                City, postal code, or province
                <input
                  className={funInputClass}
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  required
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-[1fr_130px] xl:grid-cols-[1fr_130px]">
                <label className="grid gap-2 text-sm font-black uppercase">
                  Date
                  <input
                    className={funInputClass}
                    type="date"
                    value={date}
                    onChange={(event) => updateDate(event.target.value)}
                    required
                  />
                </label>

                <label className="grid gap-2 text-sm font-black uppercase">
                  Radius
                  <select
                    className={funInputClass}
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
                  className={funInputClass}
                  value={movieTitle}
                  onChange={(event) => setMovieTitle(event.target.value)}
                  placeholder="Optional"
                />
              </label>

              <fieldset className="grid gap-3 border-[6px] border-black bg-[#ff4fa3] p-3 shadow-[8px_8px_0_#111111]">
                <legend className="ml-2 flex -rotate-2 items-center gap-2 border-4 border-black bg-[#f7e900] px-3 py-1 text-sm font-black uppercase shadow-[5px_5px_0_#111111]">
                  <Filter className="h-4 w-4" aria-hidden="true" />
                  Filters
                </legend>
                <FunFilterToggle
                  checked={filters.onlyZeroSold}
                  label="0 seats sold"
                  onChange={(value) => setFilters((current) => ({ ...current, onlyZeroSold: value }))}
                />
                <FunFilterToggle
                  checked={filters.maxFiveSold}
                  label="5 or fewer seats sold"
                  onChange={(value) => setFilters((current) => ({ ...current, maxFiveSold: value }))}
                />
                <FunFilterToggle
                  checked={selectedDateIsToday && filters.startsInNextTwoHours}
                  disabled={!selectedDateIsToday}
                  label="Starts in next 2 hours"
                  onChange={(value) => setFilters((current) => ({ ...current, startsInNextTwoHours: value }))}
                />
                <FunFilterToggle
                  checked={filters.nonVipOnly}
                  label="Non-VIP only"
                  onChange={(value) => setFilters((current) => ({ ...current, nonVipOnly: value }))}
                />
                <FunFilterToggle
                  checked={filters.accessibleAvailable}
                  label="Accessible seating available"
                  onChange={(value) => setFilters((current) => ({ ...current, accessibleAvailable: value }))}
                />
              </fieldset>

              <button
                className="focus-ring jitter-hover inline-flex min-h-14 items-center justify-center gap-3 border-[6px] border-black bg-[#f7e900] px-5 text-lg font-black uppercase text-black shadow-[8px_8px_0_#111111] transition hover:-translate-x-1 hover:-translate-y-1 hover:bg-[#00e676] hover:shadow-[12px_12px_0_#111111] active:translate-x-0 active:translate-y-0 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-600"
                type="submit"
                disabled={loading}
              >
                <Search className="h-5 w-5" aria-hidden="true" />
                {loading ? "Searching" : "Search"}
              </button>
            </form>
          </section>

          <section className="grid content-start gap-5">
            <div className={`chaos-panel relative overflow-hidden border-[6px] border-black bg-black text-white ${funPanelShadow} sm:rotate-[0.3deg]`}>
              <div className="absolute right-0 top-0 hidden h-full w-7 bg-[repeating-linear-gradient(180deg,#f7e900_0_12px,#111111_12px_24px)] lg:block" aria-hidden="true" />
              <div className="grid gap-0 lg:grid-cols-[260px_1fr]">
                <div className="relative border-b-[6px] border-black bg-[#00e676] p-5 text-black lg:border-b-0 lg:border-r-[6px]">
                  <p className="text-sm font-black uppercase tracking-[0.16em]">Results</p>
                  <p className="mt-1 text-[clamp(4rem,10vw,7rem)] font-black leading-none">{resultCount(results, loading)}</p>
                </div>
                <div className="grid gap-4 p-5 lg:pr-12">
                  <div className="flex flex-wrap gap-3">
                    <QueryChip icon={<MapPin className="h-4 w-4" aria-hidden="true" />} label={location.trim() || "No location"} />
                    <QueryChip icon={<CalendarDays className="h-4 w-4" aria-hidden="true" />} label={date} />
                    <QueryChip icon={<Radar className="h-4 w-4" aria-hidden="true" />} label={`${radiusKm} km`} />
                    <QueryChip icon={<Filter className="h-4 w-4" aria-hidden="true" />} label={`${activeFilterCount} filters`} />
                  </div>
                  <p className="max-w-4xl text-sm font-bold leading-6 text-zinc-100">
                    Results are likely empty, not guaranteed. Accessibility, blocked, house-reserved, and unknown seats are kept out of occupied counts.
                  </p>
                </div>
              </div>
            </div>

            {error ? (
              <div className="border-[6px] border-black bg-[#ff4f4f] p-4 text-sm font-black uppercase text-black shadow-[10px_10px_0_#111111] sm:-rotate-1">
                {error}
              </div>
            ) : null}

            {loading ? <GoofyLoader /> : null}

            {!loading && hasSearched && !error && results.length === 0 ? (
              <div className="border-[6px] border-black bg-white p-5 text-sm font-black uppercase leading-6 shadow-[10px_10px_0_#111111] sm:rotate-1">
                No matching likely-empty showtimes were returned for this search. Try clearing the low-occupancy filter or using a future date.
              </div>
            ) : null}

            <div className="grid gap-5">
              {results.map((result) => (
                <FunResultCard key={result.showtime.id} result={result} />
              ))}
            </div>
          </section>
        </div>
        <footer className="border-[6px] border-black bg-[#00e676] px-4 py-4 text-center text-sm font-black uppercase tracking-[0.16em] shadow-[10px_10px_0_#111111] sm:-rotate-[0.35deg]">
          <span className="inline-block -rotate-1 bg-white px-3 py-1 shadow-[5px_5px_0_#111111]">Made with love in Waterloo</span>
        </footer>
      </div>
    </main>
  );
}

function ModeSwitch({ uiMode, onChange }: { uiMode: UiMode; onChange: (mode: UiMode) => void }) {
  const isFun = uiMode === "fun";
  const containerClass = isFun
    ? "inline-flex border-4 border-black bg-white p-1 shadow-[5px_5px_0_#111111]"
    : "inline-flex rounded-md border border-neutral-700 bg-black/40 p-1";
  const buttonBase = isFun
    ? "focus-ring inline-flex min-h-9 items-center gap-2 border-4 border-transparent px-3 text-xs font-black uppercase transition"
    : "focus-ring inline-flex h-8 items-center gap-1.5 rounded px-2.5 text-xs font-semibold transition";
  const cleanClass =
    uiMode === "clean"
      ? isFun
        ? "border-black bg-black text-white shadow-[3px_3px_0_#ff4fa3]"
        : "bg-neutral-100 text-black"
      : isFun
        ? "text-black hover:border-black hover:bg-[#00d5ff]"
        : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100";
  const funClass =
    uiMode === "fun"
      ? "border-black bg-[#f7e900] text-black shadow-[3px_3px_0_#111111]"
      : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100";

  return (
    <div className={containerClass} role="group" aria-label="Interface mode">
      <button
        className={`${buttonBase} ${cleanClass}`}
        type="button"
        title="Clean mode"
        aria-pressed={uiMode === "clean"}
        onClick={() => onChange("clean")}
      >
        <Palette className="h-4 w-4" aria-hidden="true" />
        Clean
      </button>
      <button
        className={`${buttonBase} ${funClass}`}
        type="button"
        title="Fun mode"
        aria-pressed={uiMode === "fun"}
        onClick={() => onChange("fun")}
      >
        <Sparkles className="h-4 w-4" aria-hidden="true" />
        Fun
      </button>
    </div>
  );
}

function CleanFilterToggle({
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

function CleanResultCard({ result }: { result: SearchResult }) {
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

function MarqueeStrip() {
  const chunks = [
    "low occupancy signal",
    "probably empty, definitely loud"
  ];

  return (
    <div className="marquee-strip border-[6px] border-black bg-black text-[#f7e900] shadow-[8px_8px_0_#111111]" aria-label="Site status">
      <div className="marquee-track">
        {[...chunks, ...chunks].map((chunk, index) => (
          <span className="marquee-chunk text-sm font-black uppercase tracking-[0.18em]" key={`${chunk}-${index}`}>
            {chunk}
          </span>
        ))}
      </div>
    </div>
  );
}

function HeaderStat({
  accent,
  icon,
  label,
  value
}: {
  accent: string;
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="stat-slab flex min-h-24 items-center gap-3 border-b-[6px] border-white/20 p-4 last:border-b-0 sm:border-b-0 sm:border-r-[6px] sm:border-white/20 sm:last:border-r-0 lg:border-b-[6px] lg:border-r-0 lg:last:border-b-0">
      <span className={`grid h-11 w-11 shrink-0 place-items-center border-4 border-white text-black shadow-[4px_4px_0_#ffffff] ${accent}`}>{icon}</span>
      <div className="min-w-0">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#00d5ff]">{label}</p>
        <p className="truncate text-lg font-black uppercase">{value}</p>
      </div>
    </div>
  );
}

function QueryChip({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="inline-flex max-w-full -rotate-1 items-center gap-2 border-4 border-white bg-[#f7e900] px-3 py-2 text-sm font-black uppercase text-black shadow-[5px_5px_0_#ffffff] even:rotate-1">
      {icon}
      <span className="truncate">{label}</span>
    </span>
  );
}

function GoofyLoader() {
  return (
    <div
      className="goofy-loader-panel border-[6px] border-black bg-[#f7e900] p-5 text-black shadow-[12px_12px_0_#111111] sm:-rotate-1"
      role="status"
      aria-live="polite"
    >
      <div className="grid items-center gap-5 md:grid-cols-[180px_minmax(0,1fr)]">
        <div className="goofy-spinner mx-auto" aria-hidden="true">
          <div className="goofy-face">
            <span className="goofy-eye goofy-eye-left" />
            <span className="goofy-eye goofy-eye-right" />
            <span className="goofy-mouth" />
            <span className="goofy-tooth goofy-tooth-left" />
            <span className="goofy-tooth goofy-tooth-right" />
          </div>
        </div>
        <div>
          <p className="inline-flex -rotate-2 border-4 border-black bg-[#ff4fa3] px-3 py-1 text-xs font-black uppercase tracking-[0.16em] shadow-[5px_5px_0_#111111]">
            Searching
          </p>
          <p className="mt-4 text-[clamp(2rem,5vw,4rem)] font-black uppercase leading-none">
            Spinning up the empty-theatre detector
          </p>
        </div>
      </div>
    </div>
  );
}

function FunFilterToggle({
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
      className={`flex min-h-12 items-center justify-between gap-3 border-4 border-black px-3 py-2 text-sm font-black uppercase shadow-[5px_5px_0_#111111] transition hover:-translate-y-0.5 ${
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

function FunResultCard({ result }: { result: SearchResult }) {
  const startsAt = new Date(result.showtime.startsAt);
  const checkedAt = new Date(result.snapshot.checkedAt);
  const emptySeats = Math.max(0, result.snapshot.sellableSeats - result.snapshot.occupiedEstimate);
  const occupancy =
    result.snapshot.sellableSeats > 0
      ? Math.round((result.snapshot.occupiedEstimate / result.snapshot.sellableSeats) * 100)
      : 0;

  return (
    <article className={`chaos-card relative border-[6px] border-black bg-white ${funCardShadow}`}>
      <div className="chaos-card-head grid gap-3 border-b-[6px] border-black p-4 lg:grid-cols-[1fr_auto]">
        <div className="min-w-0">
          <h2 className="text-[clamp(1.75rem,4vw,2.6rem)] font-black uppercase leading-none text-black">{result.theatre.name}</h2>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm font-black uppercase">
            <MapPin className="h-4 w-4 text-[#ff4fa3]" aria-hidden="true" />
            <span>
              {result.theatre.city}, {result.theatre.province}
            </span>
            {result.distanceKm !== undefined ? <span>{result.distanceKm.toFixed(1)} km</span> : null}
          </p>
        </div>
        <a
          className="focus-ring inline-flex min-h-12 rotate-1 items-center justify-center gap-2 border-4 border-black bg-white px-4 text-sm font-black uppercase shadow-[5px_5px_0_#111111] transition hover:-translate-x-1 hover:-translate-y-1 hover:bg-[#00d5ff] hover:shadow-[8px_8px_0_#111111]"
          href={result.showtime.ticketUrl}
          target="_blank"
          rel="noreferrer"
        >
          Cineplex
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </a>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="grid content-start gap-4 bg-[#fff8df] p-4">
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
            <MetricSlab label="Open seats" value={String(emptySeats)} tone="bg-[#00e676]" tilt="-rotate-2" />
            <MetricSlab label="Occupied" value={`${result.snapshot.occupiedEstimate}/${result.snapshot.sellableSeats}`} tone="bg-[#ff4fa3]" tilt="rotate-1" />
            <MetricSlab label="Occupancy" value={`${occupancy}%`} tone="bg-[#00d5ff]" tilt="-rotate-1" />
          </div>
        </div>

        <aside className="grid border-t-[6px] border-black bg-black text-white lg:border-l-[6px] lg:border-t-0">
          <div className="border-b-[6px] border-white/20 p-4">
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

function MetricSlab({ label, value, tone, tilt }: { label: string; value: string; tone: string; tilt: string }) {
  return (
    <div className={`border-4 border-black p-3 text-black shadow-[5px_5px_0_#111111] ${tone} ${tilt}`}>
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
