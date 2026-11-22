import { SEED_BRAND, SEED_CONTENT, SEED_CREATORS, SEED_POSTS } from "@/data/seed";
import type { BrandProfile, ContentItem, Creator, ViralPost } from "@/lib/types";
import type { Repository, Snapshot } from "./types";

const KEY = "pw-creator-data-v1";

function read(): Snapshot | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Snapshot) : null;
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
  return structuredClone({ brand: SEED_BRAND, creators: SEED_CREATORS, posts: SEED_POSTS, content: SEED_CONTENT });
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

  async seedSample() {
    const d = defaults();
    this.commit({
      creators: upsert(this.state.creators, d.creators),
      posts: upsert(this.state.posts, d.posts),
      content: upsert(this.state.content, d.content),
    });
    return this.loadAll();
  }

  async reset() {
    this.state = defaults();
    write(this.state);
    return this.loadAll();
  }
}
