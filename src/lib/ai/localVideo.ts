import type { BrandProfile, Shot, Transition, Trend, VideoProject, VideoStyle } from "@/lib/types";
import { uid } from "@/lib/utils";
import { STYLE_GUIDE } from "./prompts";

export interface ShotPlan {
  title: string;
  hookText: string;
  cta: string;
  music: VideoProject["music"];
  shots: Omit<Shot, "id" | "status">[];
}

const MUSIC: Record<VideoStyle, VideoProject["music"]> = {
  ugc: { mood: "lehká, pozitivní", bpm: 100, hint: "Trendy lo-fi / akustický zvuk z knihovny Reels" },
  cinematic: { mood: "epická, gradující", bpm: 90, hint: "Cinematic build-up s dropem na odhalení" },
  meme_edit: { mood: "rychlá, vtipná", bpm: 128, hint: "Aktuálně trendující zvuk na TikToku (zkontrolujte záložku Trendy zvuky)" },
  game: { mood: "west-coast hip-hop, sebevědomá", bpm: 95, hint: "Instrumentál ve stylu herního traileru (bez licencované hudby ze hry)" },
  retro_vhs: { mood: "synthwave / 2016 pop", bpm: 110, hint: "Nostalgický pop hit z roku 2016 z knihovny Reels" },
  product_3d: { mood: "čistá elektronika", bpm: 115, hint: "Minimal tech beat" },
  kinetic_text: { mood: "pulzující", bpm: 120, hint: "Beat se zřetelnými údery pro střihy textu" },
};

/** Deterministic storyboard builder (offline fallback). */
export function planShotsLocal(
  input: { topic: string; hook?: string; script?: { time: string; spoken: string; onScreen: string; visual: string }[]; style: VideoStyle; trend?: Trend },
  brand: BrandProfile,
): ShotPlan {
  const style = STYLE_GUIDE[input.style];
  const thenNow = /tehdy|then|gta|vs\.? dnes/i.test(`${input.trend?.name ?? ""} ${input.topic}`);
  const hook = input.hook || (thenNow ? "Je váš web pořád v éře GTA V?" : `Tohle na webu dělá ${input.trend ? "každý druhý" : "většina firem"} špatně`);
  const transitions: Transition[] = ["zoom", "cut", "whip", "cut", "flash", "cut"];

  let shots: ShotPlan["shots"];
  if (input.script?.length) {
    shots = input.script.map((b, i) => {
      const [a, z] = (b.time.match(/\d+/g) ?? ["0", "3"]).map(Number);
      return {
        duration: Math.max(2, Math.min(6, (z ?? a + 3) - (a ?? 0) > 0 ? Math.min(6, (z ?? 3) - (a ?? 0)) : 3)),
        description: b.visual,
        prompt: `${b.visual}. ${style.prompt}`,
        camera: i === 0 ? "push-in na obličej / produkt" : "střídat detail a celek",
        onScreenText: b.onScreen.slice(0, 60),
        voiceover: b.spoken,
        transition: transitions[i % transitions.length],
      };
    });
  } else if (thenNow) {
    shots = [
      { duration: 2, description: "Titulek ve stylu herní obálky, starý web na monitoru", prompt: `an old 2014 desktop computer monitor showing an outdated cluttered website with an image slider, dusty office, ${style.prompt}`, camera: "rychlý push-in", onScreenText: hook, voiceover: hook, transition: "zoom" },
      { duration: 3, description: "TEHDY: web s posuvníkem, Comic Sans, návštěvní kniha", prompt: `retro 2014 small business website on a CRT-like monitor, bright gradients, tiny text, low resolution, ${STYLE_GUIDE.retro_vhs.prompt}`, camera: "pomalý pan", onScreenText: "TEHDY: 2014", voiceover: "Takhle vypadal web většiny firem v éře GTA V.", transition: "flash" },
      { duration: 3, description: "DNES: moderní mobile-first web v ruce zákazníka", prompt: `a hand holding a modern smartphone showing a sleek minimal dark website with an orange call-to-action button, sunny modern city background, ${style.prompt}`, camera: "orbit kolem telefonu", onScreenText: "DNES: 2026", voiceover: "A takhle vypadá web, který dnes přináší zakázky.", transition: "whip" },
      { duration: 3, description: "TEHDY vs. DNES: kontakt na mobilu", prompt: `split composition, left: frustrated person zooming into tiny website text on old phone, right: same person tapping a big call button on a modern phone, ${style.prompt}`, camera: "statický split screen", onScreenText: "Telefon? Hledej 30 s → 1 klik", voiceover: "Tehdy jste telefon hledali půl minuty. Dnes je to jeden klik.", transition: "cut" },
      { duration: 3, description: "Notifikace nové poptávky", prompt: `close-up of a smartphone lock screen receiving multiple new email notifications, warm light, ${style.prompt}`, camera: "makro detail", onScreenText: "Nová poptávka 🔔", voiceover: "A tohle je rozdíl, který poznáte na zakázkách.", transition: "zoom" },
      { duration: 3, description: "CTA s logem", prompt: `minimal dark background with soft orange glow, space for text, ${style.prompt}`, camera: "statický", onScreenText: "Ve které éře je váš web?", voiceover: `Napište nám a za dva týdny ho přepneme do roku 2026.`, transition: "cut" },
    ];
  } else {
    const pain = brand.personas[0]?.pains[0] ?? "web nepřináší zakázky";
    shots = [
      { duration: 2, description: "Hook — přímý pohled do kamery, telefon s webem v ruce", prompt: `a confident web designer holding a smartphone towards the camera, modern studio, ${style.prompt}`, camera: "rychlý push-in", onScreenText: hook, voiceover: hook, transition: "zoom" },
      { duration: 4, description: "Problém — starý web na mobilu, scrollování bez konce", prompt: `close-up of a thumb endlessly scrolling an outdated website on a phone, frustration, ${style.prompt}`, camera: "detail na displej", onScreenText: pain, voiceover: `${pain}. A přitom chyba není ve vás.`, transition: "cut" },
      { duration: 4, description: "Agitace — zákazník odchází ke konkurenci", prompt: `a customer sighing and closing a browser tab on a phone, then opening a competitor's sleek website, ${style.prompt}`, camera: "přes rameno", onScreenText: "…a jde ke konkurenci", voiceover: "Zákazník to vzdá za pět vteřin a zavolá jinam.", transition: "whip" },
      { duration: 5, description: "Řešení — nový web, jasné tlačítko", prompt: `a sleek modern mobile website with a single bold orange call button, hand tapping it, satisfying, ${style.prompt}`, camera: "orbit kolem telefonu", onScreenText: brand.usps[1] ?? "Web za 2–3 týdny", voiceover: `${brand.usps[0] ?? "Stavíme weby osobně"}. ${brand.usps[1] ?? ""}.`, transition: "flash" },
      { duration: 3, description: "Výsledek — notifikace poptávek", prompt: `smartphone screen lighting up with new inquiry notifications, celebratory mood, ${style.prompt}`, camera: "makro", onScreenText: "Nová poptávka 🔔", voiceover: "Výsledek? Poptávky místo ticha.", transition: "zoom" },
      { duration: 3, description: "CTA", prompt: `minimal dark background with orange glow and space for text, ${style.prompt}`, camera: "statický", onScreenText: "Napište WEB 👇", voiceover: brand.defaultCta, transition: "cut" },
    ];
  }

  return {
    title: input.topic.slice(0, 80),
    hookText: hook,
    cta: brand.defaultCta,
    music: MUSIC[input.style],
    shots,
  };
}

export function toShots(plan: ShotPlan["shots"]): Shot[] {
  return plan.map((s) => ({ ...s, id: uid(), status: "draft" as const }));
}
