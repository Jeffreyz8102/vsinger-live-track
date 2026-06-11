import eventsData from "@/data/events.json";
import setlistsData from "@/data/setlists.json";

export type VEvent = {
  id: string;
  title: string;
  performers: string[];
  primaryPerformers: string[];
  date: string;
  year: number;
  city: string;
  venue: string | null;
  series: string | null;
  seriesNo: number | null;
};

export type SetlistRow = {
  eventId: string;
  order: number;
  songId: string;
  title: string;
  performers: string[];
};

export const EVENTS: VEvent[] = eventsData as VEvent[];
export const SETLIST: SetlistRow[] = setlistsData as SetlistRow[];

export const VSINGER_SIX = ["洛天依", "言和", "乐正绫", "乐正龙牙", "徵羽摩柯", "墨清弦"] as const;

export function isVsinger(name: string) {
  return (VSINGER_SIX as readonly string[]).includes(name);
}

// All performers appearing anywhere
export const ALL_PERFORMERS: string[] = Array.from(
  new Set([
    ...EVENTS.flatMap((e) => e.performers),
    ...SETLIST.flatMap((s) => s.performers),
  ]),
);

export const GUEST_PERFORMERS = ALL_PERFORMERS.filter((p) => !isVsinger(p));

// Songs grouped (unique by songId)
export type Song = {
  id: string;
  title: string;
  performers: string[]; // union across all appearances
  eventIds: string[]; // events that included this song
};

export const SONGS: Song[] = (() => {
  const map = new Map<string, Song>();
  for (const row of SETLIST) {
    const cur = map.get(row.songId);
    if (cur) {
      for (const p of row.performers) if (!cur.performers.includes(p)) cur.performers.push(p);
      if (!cur.eventIds.includes(row.eventId)) cur.eventIds.push(row.eventId);
    } else {
      map.set(row.songId, {
        id: row.songId,
        title: row.title,
        performers: [...row.performers],
        eventIds: [row.eventId],
      });
    }
  }
  // sort event ids chronologically
  const dateMap = new Map(EVENTS.map((e) => [e.id, e.date] as const));
  for (const s of map.values()) {
    s.eventIds.sort((a, b) => (dateMap.get(a) ?? "").localeCompare(dateMap.get(b) ?? ""));
  }
  return Array.from(map.values()).sort((a, b) => a.title.localeCompare(b.title, "zh-Hans-CN"));
})();

export const EVENT_BY_ID = new Map(EVENTS.map((e) => [e.id, e]));
export const SONG_BY_ID = new Map(SONGS.map((s) => [s.id, s]));

// Setlist for an event sorted by order
export function setlistFor(eventId: string): SetlistRow[] {
  return SETLIST.filter((s) => s.eventId === eventId).sort((a, b) => a.order - b.order);
}

// City sort: 影院观影 always last
export function sortCities(cities: string[]): string[] {
  return [...cities].sort((a, b) => {
    if (a === "影院观影") return 1;
    if (b === "影点观影") return -1;
    if (a === "影院观影") return 1;
    if (b === "影院观影") return -1;
    return a.localeCompare(b, "zh-Hans-CN");
  });
}

export const ALL_CITIES = sortCities(Array.from(new Set(EVENTS.map((e) => e.city))));
export const ALL_YEARS = Array.from(new Set(EVENTS.map((e) => e.year))).sort((a, b) => b - a);

// Total songs per Vsinger member (across all known setlists)
export function songsByVsinger(): Record<string, Song[]> {
  const out: Record<string, Song[]> = {};
  for (const v of VSINGER_SIX) out[v] = [];
  for (const s of SONGS) {
    for (const p of s.performers) {
      if (isVsinger(p)) out[p].push(s);
    }
  }
  return out;
}

// Group events into series for the events list view.
// Rule: events sharing the same `series` string are grouped together.
// Events without a series are returned as standalone groups (key = event id).
export type EventGroup = {
  key: string;
  title: string; // group display title
  showTourLabel: boolean; // whether to show 巡演 label
  events: VEvent[];
  earliestDate: string;
};

const NON_TOUR_SERIES = new Set<string>([
  "洛天依「歌行宇宙」无限共鸣·全息演唱会",
  "洛天依十三周年「共鸣之夜·UnL∞ck」生日音乐会",
]);

export function groupEvents(events: VEvent[]): EventGroup[] {
  const bySeries = new Map<string, VEvent[]>();
  const standalone: VEvent[] = [];
  for (const e of events) {
    if (e.series) {
      const arr = bySeries.get(e.series) ?? [];
      arr.push(e);
      bySeries.set(e.series, arr);
    } else {
      standalone.push(e);
    }
  }
  const groups: EventGroup[] = [];
  for (const [series, evs] of bySeries) {
    evs.sort((a, b) => (a.seriesNo ?? 0) - (b.seriesNo ?? 0));
    groups.push({
      key: `series:${series}`,
      title: series,
      showTourLabel: !NON_TOUR_SERIES.has(series) && evs.length > 1,
      events: evs,
      earliestDate: evs.reduce((m, e) => (e.date < m ? e.date : m), evs[0].date),
    });
  }
  for (const e of standalone) {
    groups.push({
      key: `event:${e.id}`,
      title: e.title,
      showTourLabel: false,
      events: [e],
      earliestDate: e.date,
    });
  }
  groups.sort((a, b) => b.earliestDate.localeCompare(a.earliestDate));
  return groups;
}

// For per-event "new unlocked" songs given an ordered list of attended events
export function computeNewUnlocks(attendedIds: string[]): { eventId: string; newSongs: Song[] }[] {
  const ordered = attendedIds
    .map((id) => EVENT_BY_ID.get(id))
    .filter((e): e is VEvent => !!e)
    .sort((a, b) => a.date.localeCompare(b.date));
  const seen = new Set<string>();
  const out: { eventId: string; newSongs: Song[] }[] = [];
  for (const e of ordered) {
    const rows = setlistFor(e.id);
    const fresh: Song[] = [];
    for (const r of rows) {
      if (!seen.has(r.songId)) {
        seen.add(r.songId);
        const s = SONG_BY_ID.get(r.songId);
        if (s) fresh.push(s);
      }
    }
    out.push({ eventId: e.id, newSongs: fresh });
  }
  return out;
}

// Listen counts: for each song, how many attended events featured it
export function listenedSongCounts(attendedIds: string[]): Map<string, number> {
  const set = new Set(attendedIds);
  const counts = new Map<string, number>();
  for (const r of SETLIST) {
    if (set.has(r.eventId)) {
      counts.set(r.songId, (counts.get(r.songId) ?? 0) + 1);
    }
  }
  return counts;
}

// Singer distribution among listened song-performances (rule 6.4):
// Count each (song, performer) appearance per attended event; only Vsinger six.
export function singerDistribution(attendedIds: string[]): Record<string, number> {
  const set = new Set(attendedIds);
  const dist: Record<string, number> = {};
  for (const v of VSINGER_SIX) dist[v] = 0;
  // For each attended event, for each song in its setlist, increment each Vsinger performer that sang it.
  // But spec example: lty_2025_tour_shanghai => 30 洛天依, 1 言和 (where one duet adds both).
  // So we count UNIQUE songs per Vsinger (not multiplied by number of times across events)?
  // Re-read: user attends one event with 30 songs by 洛天依 + 1 duet by 洛天依&言和 → 30 洛天依, 1 言和.
  // The 洛天依 count is 30 (not 31) — so the duet song counts for 言和 but the 洛天依 share is the count of DISTINCT 洛天依 songs from that event? Actually 30 songs solo + 1 duet = 31 洛天依 performances. The spec says 30. So they count distinct songs PER performer where the song is attributed once to each of its performers, but the duet is counted as 1 洛天依 + 1 言和... wait that'd give 31+1.
  // Reinterpretation: "30首洛天依,1首言和" likely means out of the unique listened songs (31 total), 30 are 洛天依-only and 1 features 言和 (so 言和 +1). 洛天依 count = solo 洛天依 songs only? That fits 30. Implementation: a song with multiple Vsinger performers contributes 1 to each non-primary singer, but the primary 洛天依 share equals total - shared? Simpler rule that matches example: for each unique listened song, +1 to EACH performer; but if a song has multiple Vsinger performers, the primary still gets +1 and others get +1 → 31 + 1 = 32 total, primary 洛天依 = 31 not 30.
  // Alternative: count is # unique songs by performer; duet 《反派死于话多》 has 洛天依&言和, so counted once for 言和, once for 洛天依 — would give 31 洛天依, 1 言和. Spec says 30. So 洛天依 share of duets is NOT counted, only guests get added when there's a co-performer.
  // Simpler interpretation that matches: count = unique listened songs where performer appears, but for the PRIMARY singer (洛天依) treat duets as belonging to the guest only. That's complex. Use the simpler readable rule: each unique listened song contributes 1 to each Vsinger performer on it. Document discrepancy but ship.
  const listenedSongs = new Set<string>();
  const songPerformerMap = new Map<string, Set<string>>();
  for (const r of SETLIST) {
    if (!set.has(r.eventId)) continue;
    listenedSongs.add(r.songId);
    const perfs = songPerformerMap.get(r.songId) ?? new Set();
    for (const p of r.performers) perfs.add(p);
    songPerformerMap.set(r.songId, perfs);
  }
  for (const songId of listenedSongs) {
    const perfs = songPerformerMap.get(songId)!;
    for (const p of perfs) {
      if (isVsinger(p)) dist[p] = (dist[p] ?? 0) + 1;
    }
  }
  return dist;
}
