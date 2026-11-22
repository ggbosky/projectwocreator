import { SEED_BRAND, SEED_CONTENT, SEED_CREATORS, SEED_POSTS } from "@/data/seed";
import { SEED_TRENDS } from "@/data/trends";
import type { BrandProfile, ContentItem, Creator, Trend, VideoProject, ViralPost } from "@/lib/types";
import type { Repository, Snapshot } from "./types";

const KEY = "pw-creator-data-v1";

function read(): Snapshot | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Partial<Snapshot>;
    // Migrate snapshots saved by older versions of the app.
    return {
      ...defaults(),
      ...s,
      // The pipeline starts empty: drop the sample cards older versions seeded.
      content: (s.content ?? []).filter((c) => !c.id.startsWith("ci_seed_")),
      trends: s.trends ?? structuredClone(SEED_TRENDS),
      videos: s.videos ?? [],
    } as Snapshot;
  } catch {
    return null;
  }
}

function write(s: Snapshot) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch (e) {
    console.warn("LocalRepository: unable to persist", e);
  }
}

function defaults(): Snapshot {
  return structuredClone({ brand: SEED_BRAND, creators: SEED_CREATORS, posts: SEED_POSTS, content: [] as ContentItem[], trends: SEED_TRENDS, videos: [] as VideoProject[] });
}

function upsert<T extends { id: string }>(list: T[], items: T[]): T[] {
  const map = new Map(list.map((x) => [x.id, x]));
  for (const i of items) map.set(i.id, i);
  return [...map.values()];
}

/** Demo-mode persistence in the browser's localStorage. */
export class LocalRepository implements Repository {
  readonly kind = "local" as const;
  private state: Snapshot;

  constructor() {
    this.state = read() ?? defaults();
    write(this.state);
  }

  private commit(next: Partial<Snapshot>) {
    this.state = { ...this.state, ...next };
    write(this.state);
  }

  async loadAll() {
    return structuredClone(this.state);
  }

  async saveBrand(brand: BrandProfile) {
    const b = { ...brand, updatedAt: new Date().toISOString() };
    this.commit({ brand: b });
    return b;
  }

  async upsertCreators(creators: Creator[]) {
    this.commit({ creators: upsert(this.state.creators, creators) });
    return creators;
  }

  async deleteCreator(id: string) {
    this.commit({ creators: this.state.creators.filter((c) => c.id !== id) });
  }

  async upsertPosts(posts: ViralPost[]) {
    this.commit({ posts: upsert(this.state.posts, posts) });
    return posts;
  }

  async deletePost(id: string) {
    this.commit({ posts: this.state.posts.filter((p) => p.id !== id) });
  }

  async upsertContent(items: ContentItem[]) {
    const now = new Date().toISOString();
    const stamped = items.map((i) => ({ ...i, updatedAt: now }));
    this.commit({ content: upsert(this.state.content, stamped) });
    return stamped;
  }

  async deleteContent(id: string) {
    this.commit({ content: this.state.content.filter((c) => c.id !== id) });
  }

  async upsertTrends(trends: Trend[]) {
    this.commit({ trends: upsert(this.state.trends, trends) });
    return trends;
  }

  async deleteTrend(id: string) {
    this.commit({ trends: this.state.trends.filter((t) => t.id !== id) });
  }

  async upsertVideos(videos: VideoProject[]) {
    const now = new Date().toISOString();
    const stamped = videos.map((v) => ({ ...v, updatedAt: now }));
    this.commit({ videos: upsert(this.state.videos, stamped) });
    return stamped;
  }

  async deleteVideo(id: string) {
    this.commit({ videos: this.state.videos.filter((v) => v.id !== id) });
  }

  async seedSample() {
    const d = defaults();
    this.commit({
      creators: upsert(this.state.creators, d.creators),
      posts: upsert(this.state.posts, d.posts),
      content: upsert(this.state.content, structuredClone(SEED_CONTENT)),
      trends: upsert(this.state.trends, d.trends),
    });
    return this.loadAll();
  }

  async reset() {
    this.state = defaults();
    write(this.state);
    return this.loadAll();
  }
}
