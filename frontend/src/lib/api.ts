/**
 * Typed fetch wrapper for the GhostTrace backend (IMPLEMENTATION.md §7).
 *
 * Every call throws ApiError on a non-2xx response so pages can branch on
 * `err.status` (IncidentRoom relies on 404 to show "case not found" rather
 * than the generic error banner).
 */

const BASE_URL: string = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// ---------------------------------------------------------------- types

export type Platform = "YouTube" | "X" | "Instagram";

export interface CreatorProfile {
  name: string;
  email: string;
  address: string;
  phone: string;
}

export interface AssetFingerprint {
  subject: string;
  dominant_colors: string[];
  distinguishing_features: string[];
}

export interface Asset {
  id: string;
  filename: string;
  sha256: string;
  uploaded_at: string;
  path: string;
  fingerprint: AssetFingerprint | null;
}

export interface Incident {
  id: string;
  asset_id: string;
  /** One of Platform for seeded leaks; a bare domain for real web matches. */
  platform: string;
  leak_image_path: string;
  leak_url: string;
  similarity_score: number;
  reasoning: string;
  status: "DETECTED" | "FILED" | "IN_REVIEW" | "RESOLVED";
  detected_at: string;
  /**
   * "SERPAPI" is what the backend emits today; "GOOGLE_VISION" is the older
   * Cloud Vision value still present in db.json rows and still compared
   * against in IncidentRoom/Incidents. Both kept until the UI is updated.
   */
  source: "SYNTHETIC" | "SERPAPI" | "GOOGLE_VISION";
}

export interface Takedown {
  id: string;
  incident_id: string;
  platform: string;
  notice_text: string;
  filed_at: string;
  status: "FILED" | "IN_REVIEW" | "RESOLVED" | "FAILED";
}

export interface ActivityLogEntry {
  id: string;
  timestamp: string;
  action:
    | "ASSET_UPLOADED"
    | "SCAN_RUN"
    | "INCIDENT_DETECTED"
    | "DMCA_FILED"
    | "NUKE_TRIGGERED";
  details: string;
  incident_id: string | null;
}

export interface DashboardStats {
  assets: number;
  incidents: number;
  filed: number;
  resolved: number;
}

export interface ScanResult {
  new_incidents: Incident[];
}

export interface WebScanResult {
  new_incidents: Incident[];
  /** Matches Vision returned before the download filter — 0 means nothing found. */
  raw_match_count: number;
}

// ------------------------------------------------------------- internals

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/api${path}`, init);
  } catch {
    // Network-level failure (backend down, CORS) — surface as status 0 so
    // callers can still use `instanceof ApiError` uniformly.
    throw new ApiError(0, "Cannot reach the backend. Is it running on :8000?");
  }

  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (body?.detail) detail = typeof body.detail === "string" ? body.detail : detail;
    } catch {
      // non-JSON error body — keep the status line
    }
    throw new ApiError(res.status, detail);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/**
 * Same as request(), but also reads the pre-slice row count the paginated
 * list endpoints publish in X-Total-Count (exposed via CORS in main.py).
 * Falls back to the page length when the header is absent.
 */
async function requestPage<T>(
  path: string,
  params: object
): Promise<Page<T>> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") query.set(key, String(value));
  }
  const qs = query.toString();

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/api${path}${qs ? `?${qs}` : ""}`);
  } catch {
    throw new ApiError(0, "Cannot reach the backend. Is it running on :8000?");
  }
  if (!res.ok) throw new ApiError(res.status, `${res.status} ${res.statusText}`);

  const items = (await res.json()) as T[];
  const header = res.headers.get("X-Total-Count");
  return { items, total: header === null ? items.length : Number(header) };
}

function json(method: string, body?: unknown): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  };
}

/**
 * Static image URLs are served off the backend root, NOT under /api
 * (main.py mounts /uploads and /seed_leaks). Callers pass either a stored
 * path ("/uploads/abc.png") or a bare filename, so normalise to the basename.
 */
function staticUrl(mount: string, pathOrName: string): string {
  const name = pathOrName.split("/").filter(Boolean).pop() ?? pathOrName;
  return `${BASE_URL}/${mount}/${name}`;
}

export function uploadUrl(pathOrName: string): string {
  return staticUrl("uploads", pathOrName);
}

export function seedLeakUrl(pathOrName: string): string {
  return staticUrl("seed_leaks", pathOrName);
}

// -------------------------------------------------------------- endpoints

export function getProfile(): Promise<CreatorProfile | null> {
  return request<CreatorProfile | null>("/profile");
}

export function postProfile(profile: CreatorProfile): Promise<CreatorProfile> {
  return request<CreatorProfile>("/profile", json("POST", profile));
}

export function getAssets(): Promise<Asset[]> {
  return request<Asset[]>("/assets");
}

export interface Page<T> {
  items: T[];
  /** Total matching rows on the server, before pagination. */
  total: number;
}

export interface AssetQuery {
  limit?: number;
  offset?: number;
  q?: string;
  sort?: "newest" | "oldest" | "name";
}

export function getAssetsPage(params: AssetQuery = {}): Promise<Page<Asset>> {
  return requestPage<Asset>("/assets", params);
}

export interface IncidentQuery {
  limit?: number;
  offset?: number;
  q?: string;
  status?: string;
  source?: string;
  sort?: "newest" | "oldest" | "score";
}

export function getIncidentsPage(params: IncidentQuery = {}): Promise<Page<Incident>> {
  return requestPage<Incident>("/incidents", params);
}

export function postAsset(file: File): Promise<Asset> {
  const form = new FormData();
  form.append("file", file);
  // No Content-Type header — the browser must set the multipart boundary.
  return request<Asset>("/assets", { method: "POST", body: form });
}

/**
 * Upload with byte-level progress. fetch() cannot report request-body
 * progress, so this drops to XHR — the only reason that API is still here.
 *
 * onProgress fires 0→1 for the transfer itself; once it hits 1 the server is
 * still busy running the Gemini fingerprint, which the UI shows as its own
 * indeterminate stage.
 */
export function postAssetWithProgress(
  file: File,
  opts: { onProgress?: (fraction: number) => void; signal?: AbortSignal } = {}
): Promise<Asset> {
  const { onProgress, signal } = opts;

  return new Promise<Asset>((resolve, reject) => {
    const form = new FormData();
    form.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${BASE_URL}/api/assets`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total);
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as Asset);
        } catch {
          reject(new ApiError(xhr.status, "Malformed response from server."));
        }
        return;
      }
      let detail = `${xhr.status} ${xhr.statusText}`;
      try {
        const body = JSON.parse(xhr.responseText);
        if (typeof body?.detail === "string") detail = body.detail;
      } catch {
        // keep the status line
      }
      reject(new ApiError(xhr.status, detail));
    };

    xhr.onerror = () =>
      reject(new ApiError(0, "Cannot reach the backend. Is it running on :8000?"));
    xhr.onabort = () => reject(new ApiError(0, "Upload cancelled."));

    if (signal) {
      if (signal.aborted) {
        reject(new ApiError(0, "Upload cancelled."));
        return;
      }
      signal.addEventListener("abort", () => xhr.abort(), { once: true });
    }

    xhr.send(form);
  });
}

export function postScan(): Promise<ScanResult> {
  return request<ScanResult>("/scan", json("POST"));
}

export function postWebScan(assetId: string): Promise<WebScanResult> {
  return request<WebScanResult>(`/assets/${assetId}/web-scan`, json("POST"));
}

export function getIncidents(): Promise<Incident[]> {
  return request<Incident[]>("/incidents");
}

export function getIncident(id: string): Promise<Incident> {
  return request<Incident>(`/incidents/${id}`);
}

export function getTakedowns(incidentId: string): Promise<Takedown[]> {
  return request<Takedown[]>(`/incidents/${incidentId}/takedowns`);
}

export function postDmcaPreview(
  incidentId: string,
  platform: string
): Promise<{ notice_text: string }> {
  return request<{ notice_text: string }>(
    `/incidents/${incidentId}/dmca`,
    json("POST", { platform })
  );
}

export function postNuke(incidentId: string): Promise<{ takedowns: Takedown[] }> {
  return request<{ takedowns: Takedown[] }>(
    `/incidents/${incidentId}/nuke`,
    json("POST")
  );
}

export function getDashboardStats(): Promise<DashboardStats> {
  return request<DashboardStats>("/dashboard/stats");
}

export function getActivity(): Promise<ActivityLogEntry[]> {
  return request<ActivityLogEntry[]>("/activity");
}
