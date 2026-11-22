/**
 * Bridge to the claude.ai Artifact runtime (window.claude.use). When the app is
 * published as an Artifact it can call Claude directly ("sample"), save files
 * ("downloads"), store uploads ("assets") and speak ("tts"). Everywhere else
 * these resolve to null and the app falls back to Supabase / local behaviour.
 */
export interface SampleFn {
  (input: string | { role: "user" | "assistant"; content: string }[], opts?: SampleOpts): Promise<{ text: string; truncated: boolean }>;
  json<T = unknown>(input: string, opts?: SampleOpts): Promise<T>;
}
export interface SampleOpts {
  onText?: (u: { text: string; delta: string }) => void;
  signal?: AbortSignal;
  modelTier?: "quick" | "default" | "complex";
  cache?: boolean;
}
export interface DownloadsNs {
  save(req: { filename: string; data: string | Blob | ArrayBuffer }): Promise<{ status: string }>;
}
export interface AssetsNs {
  upload(blob: Blob, opts?: { type?: string }): Promise<{ id: string; url: string; sizeBytes: number; contentType: string }>;
}
export interface TtsNs {
  speak(text: string, opts?: { voice?: string; rate?: number; language?: string }): Promise<void>;
  stop(): void;
}

type CapMap = { sample: SampleFn; downloads: DownloadsNs; assets: AssetsNs; tts: TtsNs };

declare global {
  interface Window {
    claude?: { use(name: string): Promise<unknown> };
  }
}

const cache = new Map<string, Promise<unknown>>();

export function useCapability<K extends keyof CapMap>(name: K): Promise<CapMap[K] | null> {
  if (typeof window === "undefined" || !window.claude?.use) return Promise.resolve(null);
  if (!cache.has(name)) {
    cache.set(
      name,
      Promise.race([
        window.claude.use(name).catch(() => null),
        new Promise((r) => setTimeout(() => r(null), 12_000)),
      ]),
    );
  }
  return cache.get(name) as Promise<CapMap[K] | null>;
}

export const isArtifactHost = () => typeof window !== "undefined" && Boolean(window.claude?.use);

export interface SampleError {
  code: string;
  message: string;
  text?: string;
}

export function sampleErrorMessage(e: unknown): string {
  const code = (e as SampleError)?.code;
  switch (code) {
    case "not_granted":
      return "Přístup k Claude nebyl povolen — povolte ho v menu Oprávnění stránky.";
    case "rate_limited":
      return "Claude je teď vytížený, zkuste to za chvíli.";
    case "invalid_json":
      return "Claude vrátil neplatná data, zkuste to prosím znovu.";
    case "cancelled":
      return "Zrušeno.";
    default:
      return (e as Error)?.message ?? "Volání Claude selhalo.";
  }
}
