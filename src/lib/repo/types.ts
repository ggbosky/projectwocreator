import type { BrandProfile, ContentItem, Creator, ViralPost } from "@/lib/types";

export interface Snapshot {
  brand: BrandProfile;
  creators: Creator[];
  posts: ViralPost[];
  content: ContentItem[];
}

/** Persistence abstraction: LocalRepository (demo) and SupabaseRepository (live). */
export interface Repository {
  readonly kind: "local" | "supabase";
  loadAll(): Promise<Snapshot>;
  saveBrand(brand: BrandProfile): Promise<BrandProfile>;
  upsertCreators(creators: Creator[]): Promise<Creator[]>;
  deleteCreator(id: string): Promise<void>;
  upsertPosts(posts: ViralPost[]): Promise<ViralPost[]>;
  deletePost(id: string): Promise<void>;
  upsertContent(items: ContentItem[]): Promise<ContentItem[]>;
  deleteContent(id: string): Promise<void>;
  /** Inserts the sample library (creators, posts, pipeline). */
  seedSample(): Promise<Snapshot>;
  /** Wipes all data and restores defaults. */
  reset(): Promise<Snapshot>;
}
