import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { toJpeg } from "html-to-image";
import {
  EVENT_BY_ID,
  SONGS,
  VSINGER_SIX,
  isVsinger,
  setlistFor,
  songsByVsinger,
  listenedSongCounts,
  singerDistribution,
  computeNewUnlocks,
} from "@/lib/vsinger";
import { useAttended } from "@/lib/store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "我的统计 · Vsinger 观演记忆" },
      { name: "description", content: "查看你的 Vsinger 线下观演统计与解锁曲目。" },
      { property: "og:title", content: "我的统计 · Vsinger 观演记忆" },
      { property: "og:description", content: "查看你的 Vsinger 线下观演统计与解锁曲目。" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { ids } = useAttended();
  const exportRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const attendedEvents = useMemo(
    () =>
      ids
        .map((id) => EVENT_BY_ID.get(id))
        .filter((e): e is NonNullable<ReturnType<typeof EVENT_BY_ID.get>> => !!e)
        .sort((a, b) => a.date.localeCompare(b.date)),
    [ids],
  );

  const counts = useMemo(() => listenedSongCounts(ids), [ids]);
  const unlockedSongs = useMemo(
    () => Array.from(counts.keys()).map((id) => SONGS.find((s) => s.id === id)!).filter(Boolean),
    [counts],
  );

  const allByVsinger = useMemo(() => songsByVsinger(), []);
  const distribution = useMemo(() => singerDistribution(ids), [ids]);
  const newUnlocks = useMemo(() => computeNewUnlocks(ids), [ids]);
  // Display order: newest first. Tiebreaker by seriesNo so 夜场 comes before 日场.
  const newUnlocksDisplay = useMemo(
    () => [...newUnlocks].sort((a, b) => b.sortKey.localeCompare(a.sortKey)),
    [newUnlocks],
  );

  const topSongs = useMemo(
    () =>
      Array.from(counts.entries())
        .map(([id, n]) => ({ song: SONGS.find((s) => s.id === id)!, count: n }))
        .filter((x) => x.song)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
    [counts],
  );

  const totalDist = Object.values(distribution).reduce((a, b) => a + b, 0);

  const citiesCovered = useMemo(
    () =>
      Array.from(new Set(attendedEvents.map((e) => e.city))).filter(
        (c) => c !== "影院观影",
      ),
    [attendedEvents],
  );

  const handleExport = async () => {
    if (!exportRef.current) return;
    setExporting(true);
    try {
      const dataUrl = await toJpeg(exportRef.current, {
        quality: 0.95,
        pixelRatio: 2,
        backgroundColor: getComputedStyle(document.body).backgroundColor || "#ffffff",
        cacheBust: true,
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `vsinger-memory-${new Date().toISOString().slice(0, 10)}.jpg`;
      a.click();
    } catch (e) {
      console.error(e);
      alert("导出失败，请重试");
    } finally {
      setExporting(false);
    }
  };

  if (ids.length === 0) {
    return (
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12">
        <div className="rounded-[2rem] border border-border/60 bg-card/60 backdrop-blur-md p-12 text-center shadow-sm">
          <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-3">
            Empty Archive
          </p>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
            还没有观演记录
          </h1>
          <p className="mt-2 text-muted-foreground">
            前往「演出列表」勾选你看过的 Vsinger 线下场次，统计会实时更新。
          </p>
          <Link
            to="/events"
            className="mt-8 inline-flex items-center rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/20"
          >
            去录入观演记录 →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 py-10 space-y-10">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border/60 pb-8">
        <div className="space-y-2">
          <h1 className="font-display text-4xl font-bold tracking-tight text-foreground">
            我的观演统计
          </h1>
          <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground font-medium">
            Vsinger Performance Archive ·{" "}
            {attendedEvents.length > 0
              ? `${attendedEvents[0]!.year} — ${attendedEvents[attendedEvents.length - 1]!.year}`
              : ""}
          </p>
        </div>
        <Button
          onClick={handleExport}
          disabled={exporting}
          variant="outline"
          className="rounded-full border-border bg-card/60 backdrop-blur-md hover:bg-accent/40"
        >
          <Download className="size-4 mr-1.5" />
          {exporting ? "生成中…" : "导出长图"}
        </Button>
      </header>

      <div ref={exportRef} className="space-y-6 bg-background">
      {/* Bento Grid */}
      <div className="grid grid-cols-12 gap-5">
        {/* 4 stat cards — col-span-8 */}
        <div className="col-span-12 lg:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatDialog
            label="演出场次"
            valueText={String(attendedEvents.length).padStart(2, "0")}
            unit="场"
          content={
            <ul className="space-y-2 max-h-[60vh] overflow-y-auto">
              {attendedEvents.map((e) => (
                <li key={e.id} className="rounded-lg border border-border p-3 text-sm">
                  <div className="font-medium">{e.title}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {e.date} · {e.city}
                    {e.venue ? ` · ${e.venue}` : ""}
                  </div>
                </li>
              ))}
            </ul>
          }
        />
        <StatDialog
          label="解锁曲目"
          valueText={String(unlockedSongs.length)}
          unit={`/ ${SONGS.length}`}
          content={
            <ul className="space-y-1 max-h-[60vh] overflow-y-auto text-sm">
              {unlockedSongs
                .sort((a, b) => (counts.get(b.id)! - counts.get(a.id)!))
                .map((s) => (
                  <li key={s.id} className="flex justify-between rounded-md border border-border px-3 py-2">
                    <span>
                      {s.title}
                      <span className="ml-2 text-xs text-muted-foreground">
                        {s.performers.filter(isVsinger).join("/")}
                      </span>
                    </span>
                    <span className="text-xs text-muted-foreground">x{counts.get(s.id)}</span>
                  </li>
                ))}
            </ul>
          }
        />
        <StatDialog
          label="覆盖城市"
          valueText={String(citiesCovered.length).padStart(2, "0")}
          unit="座"
          content={
            <div className="flex flex-wrap gap-2">
              {citiesCovered.map((c) => (
                <Badge key={c} variant="secondary">{c}</Badge>
              ))}
            </div>
          }
        />
        <StatDialog
          label="跨越年份"
          valueText={String(new Set(attendedEvents.map((e) => e.year)).size).padStart(2, "0")}
          unit="年"
          content={
            <div className="flex flex-wrap gap-2">
              {Array.from(new Set(attendedEvents.map((e) => e.year)))
                .sort()
                .map((y) => (
                  <Badge key={y} variant="secondary">{y}</Badge>
                ))}
            </div>
          }
        />
        </div>

        {/* Top 10 deep card — col-span-4, row-span-2 */}
        <div className="col-span-12 lg:col-span-4 lg:row-span-2 rounded-[2rem] p-8 text-[var(--color-accent-deep-foreground)] shadow-xl relative overflow-hidden"
             style={{ background: "var(--color-accent-deep)" }}>
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full -mr-20 -mt-20 blur-3xl opacity-30"
               style={{ background: "var(--color-primary)" }} />
          <h3 className="font-display text-lg font-bold mb-6 flex justify-between items-center">
            曲目频次 Top 10
            <span className="text-[10px] font-normal opacity-60 tracking-widest uppercase">
              Listen Count
            </span>
          </h3>
          {topSongs.length === 0 ? (
            <p className="text-sm opacity-70">暂无数据</p>
          ) : (
            <div className="space-y-3.5 relative z-10">
              {topSongs.map((t, i) => (
                <div
                  key={t.song.id}
                  className={
                    "flex items-center justify-between text-sm group " +
                    (i >= 5 ? "opacity-70" : "")
                  }
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <span className="opacity-40 italic font-mono tabular-nums shrink-0 w-5">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="font-medium truncate group-hover:translate-x-1 transition-transform">
                      {t.song.title}
                    </span>
                  </div>
                  <span className="font-mono tabular-nums opacity-80 ml-2 shrink-0">
                    {t.count} 次
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Vsinger progress — col-span-8 */}
        <div className="col-span-12 lg:col-span-8 rounded-[2rem] p-8 bg-card/60 backdrop-blur-md border border-border/60">
          <h3 className="font-display font-bold text-foreground mb-8 flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-primary" />
            Vsinger 曲目达成度
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-7">
            {VSINGER_SIX.map((v) => {
            const total = allByVsinger[v]?.length ?? 0;
            const listened = (allByVsinger[v] ?? []).filter((s) => counts.has(s.id));
            const pct = total ? Math.round((listened.length / total) * 100) : 0;
            return (
              <Dialog key={v}>
                <DialogTrigger asChild>
                  <button className="text-left space-y-2.5 group">
                    <div className="flex justify-between items-baseline text-xs font-bold">
                      <span className="text-foreground group-hover:text-primary transition-colors">
                        {v}
                      </span>
                      <span className="font-mono tabular-nums text-muted-foreground">
                        {pct}%
                        <span className="ml-1.5 opacity-60">
                          {listened.length}/{total}
                        </span>
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-border/40 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>{v} · 曲目达成 {listened.length}/{total}</DialogTitle>
                  </DialogHeader>
                  <ul className="space-y-1 max-h-[60vh] overflow-y-auto text-sm">
                    {(allByVsinger[v] ?? [])
                      .slice()
                      .sort((a, b) => Number(counts.has(b.id)) - Number(counts.has(a.id)))
                      .map((s) => {
                        const got = counts.has(s.id);
                        return (
                          <li
                            key={s.id}
                            className={
                              "flex justify-between rounded-md border px-3 py-2 " +
                              (got
                                ? "border-primary/40 bg-primary/5"
                                : "border-border text-muted-foreground")
                            }
                          >
                            <span>{s.title}</span>
                            <span className="text-xs">
                              {got ? `已听 x${counts.get(s.id)}` : "未解锁"}
                            </span>
                          </li>
                        );
                      })}
                  </ul>
                </DialogContent>
              </Dialog>
            );
            })}
          </div>
        </div>

        {/* Singer distribution — col-span-12 */}
        <div className="col-span-12 rounded-[2rem] p-8 bg-card/60 backdrop-blur-md border border-border/60">
          <h3 className="font-display font-bold text-foreground mb-6 flex items-center justify-between">
            <span className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-primary" />
              已听曲目歌手分布
            </span>
            <span className="text-[10px] tracking-widest uppercase text-muted-foreground font-medium">
              Distribution
            </span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-4">
            {VSINGER_SIX.map((v) => {
              const n = distribution[v] ?? 0;
              const pct = totalDist ? (n / totalDist) * 100 : 0;
              return (
                <div key={v} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-foreground">{v}</span>
                    <span className="text-muted-foreground font-mono tabular-nums">
                      {n} 首 · {pct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-1 rounded-full bg-border/40 overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="pt-5 text-[11px] text-muted-foreground/80">
            合唱曲目按全部 Vsinger 表演者重复计算（仅统计六位 Vsinger）
          </p>
        </div>
      </div>

      {/* Timeline / new unlocks */}
      <section className="pt-2">
        <div className="flex items-end justify-between mb-5">
          <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-primary" />
            观演时光机
          </h2>
          <span className="text-[10px] tracking-widest uppercase text-muted-foreground font-medium">
            New Unlocks · Reverse Chronological
          </span>
        </div>
        <div className="space-y-3">
          {newUnlocksDisplay.map(({ eventId, newSongs, simultaneousGroup }) => {
            const e = EVENT_BY_ID.get(eventId)!;
            const rows = setlistFor(eventId);
            const newIds = new Set(newSongs.map((s) => s.id));
            const repeatRows = rows.filter((r) => !newIds.has(r.songId));
            return (
              <div
                key={eventId}
                className="rounded-3xl border border-border/60 bg-card/60 backdrop-blur-md p-6 hover:border-primary/40 transition-colors"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-display font-bold text-foreground text-base">
                      {e.title}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-1 font-medium tracking-wide uppercase">
                      {e.date} · {e.city}
                      {e.venue ? ` · ${e.venue}` : ""}
                      {simultaneousGroup ? " · 同时举行共享解锁" : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-3 py-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold tracking-wider">
                      NEW {newSongs.length}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono tabular-nums">
                      / 本场 {rows.length}
                    </span>
                  </div>
                </div>
                {(newSongs.length > 0 || repeatRows.length > 0) && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {newSongs.map((s) => (
                      <span
                        key={"n" + s.id}
                        className="text-xs rounded-lg bg-primary/10 text-primary border border-primary/30 px-2.5 py-1 font-medium"
                      >
                        {s.title}
                      </span>
                    ))}
                    {repeatRows.map((r) => (
                      <span
                        key={"r" + r.songId + r.order}
                        className="text-xs rounded-lg bg-muted/60 text-muted-foreground px-2.5 py-1"
                      >
                        {r.title}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <div className="pt-6 flex justify-center">
        <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground/60 font-medium">
          — Keep your memories crystalline —
        </p>
      </div>
      </div>
    </div>
  );
}

function StatDialog({
  label,
  valueText,
  unit,
  content,
}: {
  label: string;
  valueText: string;
  unit: string;
  content: React.ReactNode;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="text-left rounded-3xl border border-border/60 bg-card/60 backdrop-blur-md p-6 hover:border-primary/40 hover:bg-card/80 transition-all">
          <div className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-bold">
            {label}
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="font-display text-4xl font-bold tabular-nums text-foreground">
              {valueText}
            </span>
            <span className="text-xs text-muted-foreground font-mono">{unit}</span>
          </div>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{label} · {valueText} {unit}</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
