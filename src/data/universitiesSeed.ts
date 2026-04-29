// Lazy loader for the local universities dataset (public/data/universities.json).
// The dataset is ~2MB so we fetch it on demand and cache in memory.

export interface SeedUniversity {
  name: string;
  country: string;
  alpha_two_code: string;
  domains: string[];
  web_pages: string[];
  "state-province"?: string | null;
}

let cache: SeedUniversity[] | null = null;
let inflight: Promise<SeedUniversity[]> | null = null;

export function getUniversitiesSync(): SeedUniversity[] | null {
  return cache;
}

export async function loadUniversities(): Promise<SeedUniversity[]> {
  if (cache) return cache;
  if (inflight) return inflight;
  inflight = fetch("/data/universities.json")
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json() as Promise<SeedUniversity[]>;
    })
    .then((data) => {
      cache = Array.isArray(data) ? data : [];
      inflight = null;
      return cache;
    })
    .catch((e) => {
      inflight = null;
      cache = [];
      throw e;
    });
  return inflight;
}

// Kept for back-compat with any imports — empty until loaded.
export const SEED_UNIVERSITIES: SeedUniversity[] = [];
