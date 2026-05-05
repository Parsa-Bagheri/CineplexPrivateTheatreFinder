export type SearchFilters = {
  onlyZeroSold: boolean;
  maxFiveSold: boolean;
  startsInNextTwoHours: boolean;
  nonVipOnly: boolean;
  accessibleAvailable: boolean;
};

export type SearchState = {
  location: string;
  date: string;
  radiusKm: string;
  movieTitle: string;
  filters: SearchFilters;
};

export type StoredSearchState = Partial<SearchState> & {
  hasSearched?: boolean;
};

export const defaultFilters: SearchFilters = {
  onlyZeroSold: false,
  maxFiveSold: true,
  startsInNextTwoHours: false,
  nonVipOnly: false,
  accessibleAvailable: false
};

const STORAGE_KEY = "cineplex-likely-empty-search";

export function makeDefaultSearchState(today = getLocalDateInputValue()): SearchState {
  return {
    location: "Toronto",
    date: today,
    radiusKm: "25",
    movieTitle: "",
    filters: defaultFilters
  };
}

export function getEffectiveFilters(state: SearchState, today = getLocalDateInputValue()): SearchFilters {
  return {
    ...state.filters,
    startsInNextTwoHours: state.date === today && state.filters.startsInNextTwoHours
  };
}

export function buildSearchParams(state: SearchState): URLSearchParams {
  const filters = getEffectiveFilters(state);
  const params = new URLSearchParams({
    location: state.location,
    date: state.date,
    radiusKm: state.radiusKm,
    ...Object.fromEntries(Object.entries(filters).map(([key, value]) => [key, String(value)]))
  });

  if (state.movieTitle.trim()) {
    params.set("movieTitle", state.movieTitle.trim());
  }

  return params;
}

export function normalizeSearchState(state: StoredSearchState, today = getLocalDateInputValue()): SearchState {
  const defaults = makeDefaultSearchState(today);
  const date = state.date || defaults.date;

  return {
    location: state.location || defaults.location,
    date,
    radiusKm: state.radiusKm || defaults.radiusKm,
    movieTitle: state.movieTitle || "",
    filters: {
      ...defaults.filters,
      ...(state.filters ?? {}),
      startsInNextTwoHours: date === today && Boolean(state.filters?.startsInNextTwoHours)
    }
  };
}

export function readSearchStateFromUrl(search: string): StoredSearchState | undefined {
  if (!search) {
    return undefined;
  }

  const params = new URLSearchParams(search);
  const location = params.get("location");
  const date = params.get("date");

  if (!location || !date) {
    return undefined;
  }

  return {
    location,
    date,
    radiusKm: params.get("radiusKm") ?? "25",
    movieTitle: params.get("movieTitle") ?? "",
    filters: {
      onlyZeroSold: params.get("onlyZeroSold") === "true",
      maxFiveSold: params.get("maxFiveSold") !== "false",
      startsInNextTwoHours: params.get("startsInNextTwoHours") === "true",
      nonVipOnly: params.get("nonVipOnly") === "true",
      accessibleAvailable: params.get("accessibleAvailable") === "true"
    },
    hasSearched: true
  };
}

export function readSearchStateFromStorage(storage: Storage): StoredSearchState | undefined {
  const raw = storage.getItem(STORAGE_KEY);

  if (!raw) {
    return undefined;
  }

  try {
    return JSON.parse(raw) as StoredSearchState;
  } catch {
    return undefined;
  }
}

export function rememberSearchState(storage: Storage, state: SearchState, hasSearched: boolean) {
  storage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...state,
      filters: getEffectiveFilters(state),
      hasSearched
    })
  );
}

export function getLocalDateInputValue(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
