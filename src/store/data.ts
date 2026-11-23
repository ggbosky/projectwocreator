import { create } from "zustand";
import { SEED_BRAND } from "@/data/seed";
import { getRepository } from "@/lib/repo";
import type { BrandProfile, ContentItem, ContentStatus, Creator, GeneratedContent, MediaItem, Trend, VideoProject, ViralPost } from "@/lib/types";
import { uid } from "@/lib/utils";

interface DataState {
  ready: boolean;
  loading: boolean;
  error: string | null;
  brand: BrandProfile;
  creators: Creator[];
  posts: ViralPost[];
  content: ContentItem[];
  trends: Trend[];
  videos: VideoProject[];
  media: MediaItem[];
  addMedia: (items: MediaItem[]) => Promise<MediaItem[]>;
  deleteMedia: (id: string) => Promise<void>;

  upsertTrends: (trends: Trend[]) => Promise<Trend[]>;
  deleteTrend: (id: string) => Promise<void>;
  saveVideo: (video: VideoProject) => Promise<VideoProject>;
  deleteVideo: (id: string) => Promise<void>;

  load: () => Promise<void>;
  clear: () => void;
  saveBrand: (brand: BrandProfile) => Promise<void>;

  upsertCreators: (creators: Creator[]) => Promise<void>;
  deleteCreator: (id: string) => Promise<void>;
  upsertPosts: (posts: ViralPost[]) => Promise<ViralPost[]>;
  toggleSwipe: (id: string) => Promise<boolean>;
  deletePost: (id: string) => Promise<void>;

  createContent: (input: {
    title: string;
    topic: string;
    format: ContentItem["format"];
    platform: ContentItem["platform"];
    status?: ContentStatus;
    output?: GeneratedContent;
    referencePostId?: string;
    notes?: string;
  }) => Promise<ContentItem>;
  updateContent: (id: string, patch: Partial<ContentItem>) => Promise<void>;
  moveContent: (id: string, status: ContentStatus, beforeId?: string | null) => Promise<void>;
  scheduleContent: (id: string, date: string | null) => Promise<void>;
  deleteContent: (id: string) => Promise<void>;
  markSynced: (ids: string[]) => Promise<void>;

  seedSample: () => Promise<void>;
  reset: () => Promise<void>;
}

function replace<T extends { id: string }>(list: T[], items: T[]) {
  const map = new Map(list.map((x) => [x.id, x]));
  items.forEach((i) => map.set(i.id, i));
  return [...map.values()];
}

/**
 * Global data store. Mutations are optimistic: the UI updates instantly and
 * rolls back if persistence fails (the caller shows the toast).
 */
export const useData = create<DataState>((set, get) => ({
  ready: false,
  loading: false,
  error: null,
  brand: SEED_BRAND,
  creators: [],
  posts: [],
  content: [],
  trends: [],
  videos: [],
  media: [],

  addMedia: async (items) => {
    set({ media: [...items, ...get().media.filter((m) => !items.some((i) => i.id === m.id))] });
    const saved = await getRepository().upsertMedia(items);
    if (saved.length) {
      const ids = new Set(items.map((i) => i.id));
      set({ media: [...saved, ...get().media.filter((m) => !ids.has(m.id) && !saved.some((x) => x.id === m.id))] });
    }
    return saved.length ? saved : items;
  },

  deleteMedia: async (id) => {
    const prev = get().media;
    set({ media: prev.filter((m) => m.id !== id) });
    try {
      await getRepository().deleteMedia(id);
    } catch (e) {
      set({ media: prev });
      throw e;
    }
  },

  upsertTrends: async (trends) => {
    const saved = await getRepository().upsertTrends(trends);
    const result = saved.length ? saved : trends;
    // Replace by id; also drop locally generated ids that the server re-keyed.
    const ids = new Set(trends.map((t) => t.id));
    set({ trends: replace(get().trends.filter((t) => !ids.has(t.id)), result) });
    return result;
  },

  deleteTrend: async (id) => {
    const prev = get().trends;
    set({ trends: prev.filter((t) => t.id !== id) });
    try {
      await getRepository().deleteTrend(id);
    } catch (e) {
      set({ trends: prev });
      throw e;
    }
  },

  saveVideo: async (video) => {
    set({ videos: replace(get().videos, [video]) });
    const [saved] = await getRepository().upsertVideos([video]);
    if (saved) set({ videos: replace(get().videos, [saved]) });
    return saved ?? video;
  },

  deleteVideo: async (id) => {
    const prev = get().videos;
    set({ videos: prev.filter((v) => v.id !== id) });
    try {
      await getRepository().deleteVideo(id);
    } catch (e) {
      set({ videos: prev });
      throw e;
    }
  },

  load: async () => {
    set({ loading: true, error: null });
    try {
      const snap = await getRepository().loadAll();
      set({ ...snap, ready: true, loading: false });
    } catch (e) {
      set({ loading: false, error: (e as Error).message, ready: true });
    }
  },

  clear: () => set({ ready: false, creators: [], posts: [], content: [], trends: [], videos: [], media: [], brand: SEED_BRAND }),

  saveBrand: async (brand) => {
    const prev = get().brand;
    set({ brand });
    try {
      const saved = await getRepository().saveBrand(brand);
      set({ brand: saved });
    } catch (e) {
      set({ brand: prev });
      throw e;
    }
  },

  upsertCreators: async (creators) => {
    const saved = await getRepository().upsertCreators(creators);
    set({ creators: replace(get().creators, saved.length ? saved : creators) });
  },

  deleteCreator: async (id) => {
    const prev = get().creators;
    set({ creators: prev.filter((c) => c.id !== id) });
    try {
      await getRepository().deleteCreator(id);
    } catch (e) {
      set({ creators: prev });
      throw e;
    }
  },

  upsertPosts: async (posts) => {
    const saved = await getRepository().upsertPosts(posts);
    const result = saved.length ? saved : posts;
    set({ posts: replace(get().posts, result) });
    return result;
  },

  toggleSwipe: async (id) => {
    const prev = get().posts;
    const post = prev.find((p) => p.id === id);
    if (!post) return false;
    const next = { ...post, savedToSwipe: !post.savedToSwipe };
    set({ posts: replace(prev, [next]) });
    try {
      await getRepository().upsertPosts([next]);
      return next.savedToSwipe;
    } catch (e) {
      set({ posts: prev });
      throw e;
    }
  },

  deletePost: async (id) => {
    const prev = get().posts;
    set({ posts: prev.filter((p) => p.id !== id) });
    try {
      await getRepository().deletePost(id);
    } catch (e) {
      set({ posts: prev });
      throw e;
    }
  },

  createContent: async (input) => {
    const status = input.status ?? (input.output ? "generated" : "idea");
    const siblings = get().content.filter((c) => c.status === status);
    const now = new Date().toISOString();
    const item: ContentItem = {
      id: uid(),
      title: input.title,
      topic: input.topic,
      format: input.format,
      platform: input.platform,
      status,
      output: input.output,
      referencePostId: input.referencePostId,
      notes: input.notes ?? "",
      position: siblings.length ? Math.min(...siblings.map((s) => s.position)) - 1 : 0,
      createdAt: now,
      updatedAt: now,
    };
    set({ content: [...get().content, item] });
    try {
      const [saved] = await getRepository().upsertContent([item]);
      if (saved) set({ content: replace(get().content, [saved]) });
      return saved ?? item;
    } catch (e) {
      set({ content: get().content.filter((c) => c.id !== item.id) });
      throw e;
    }
  },

  updateContent: async (id, patch) => {
    const prev = get().content;
    const cur = prev.find((c) => c.id === id);
    if (!cur) return;
    const next = { ...cur, ...patch };
    set({ content: replace(prev, [next]) });
    try {
      await getRepository().upsertContent([next]);
    } catch (e) {
      set({ content: prev });
      throw e;
    }
  },

  moveContent: async (id, status, beforeId) => {
    const prev = get().content;
    const cur = prev.find((c) => c.id === id);
    if (!cur) return;
    const column = prev.filter((c) => c.status === status && c.id !== id).sort((a, b) => a.position - b.position);
    let position: number;
    const idx = beforeId ? column.findIndex((c) => c.id === beforeId) : -1;
    if (idx === -1) position = column.length ? column[column.length - 1].position + 1 : 0;
    else if (idx === 0) position = column[0].position - 1;
    else position = (column[idx - 1].position + column[idx].position) / 2;
    if (cur.status === status && cur.position === position) return;
    const next = { ...cur, status, position };
    set({ content: replace(prev, [next]) });
    try {
      await getRepository().upsertContent([next]);
    } catch (e) {
      set({ content: prev });
      throw e;
    }
  },

  scheduleContent: async (id, date) => {
    await get().updateContent(id, { scheduledFor: date ?? undefined });
  },

  deleteContent: async (id) => {
    const prev = get().content;
    set({ content: prev.filter((c) => c.id !== id) });
    try {
      await getRepository().deleteContent(id);
    } catch (e) {
      set({ content: prev });
      throw e;
    }
  },

  markSynced: async (ids) => {
    const now = new Date().toISOString();
    const items = get()
      .content.filter((c) => ids.includes(c.id))
      .map((c) => ({ ...c, crmSyncedAt: now }));
    set({ content: replace(get().content, items) });
    await getRepository().upsertContent(items);
  },

  seedSample: async () => {
    const snap = await getRepository().seedSample();
    set({ ...snap });
  },

  reset: async () => {
    const snap = await getRepository().reset();
    set({ ...snap });
  },
}));
