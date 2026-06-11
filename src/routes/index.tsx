import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  EVENTS,
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
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Link } from "@tanstack/react-router";

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

  if (ids.length === 0) {
    return (
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12">
        <div className="rounded-3xl border border-border bg-card p-10 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">还没有观演记录</h1>
          <p className="mt-2 text-muted-foreground">
            前往「演出列表」勾选你看过的 Vsinger 线下场次，统计会实时更新。
          </p>
          <Link
            to="/events"
            className="mt-6 inline-flex items-center rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            去录入观演记录 →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">我的观演统计</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          点击卡片可查看详细列表
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatDialog
          label="已看演出"
          value={attendedEvents.length}
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
          value={unlockedSongs.length}
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
          value={new Set(attendedEvents.map((e) => e.city)).size}
          unit="座"
          content={
            <div className="flex flex-wrap gap-2">
              {Array.from(new Set(attendedEvents.map((e) => e.city))).map((c) => (
                <Badge key={c} variant="secondary">{c}</Badge>
              ))}
            </div>
          }
        />
        <StatDialog
          label="跨越年份"
          value={new Set(attendedEvents.map((e) => e.year)).size}
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

      <section>
        <h2 className="text-lg font-semibold mb-3">Vsinger 曲目达成</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {VSINGER_SIX.map((v) => {
            const total = allByVsinger[v]?.length ?? 0;
            const listened = (allByVsinger[v] ?? []).filter((s) => counts.has(s.id));
            const pct = total ? Math.round((listened.length / total) * 100) : 0;
            return (
              <Dialog key={v}>
                <DialogTrigger asChild>
                  <button className="text-left rounded-2xl border border-border bg-card p-4 hover:border-primary/60 transition-colors">
                    <div className="flex items-baseline justify-between">
                      <span className="font-medium">{v}</span>
                      <span className="text-sm text-muted-foreground">
                        {listened.length} / {total}
                      </span>
                    </div>
                    <Progress value={pct} className="mt-3 h-2" />
                    <div className="mt-1.5 text-xs text-muted-foreground">{pct}% 已解锁</div>
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
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="text-lg font-semibold mb-3">已听曲目歌手分布</h2>
          <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
            {VSINGER_SIX.map((v) => {
              const n = distribution[v] ?? 0;
              const pct = totalDist ? (n / totalDist) * 100 : 0;
              return (
                <div key={v}>
                  <div className="flex justify-between text-sm">
                    <span>{v}</span>
                    <span className="text-muted-foreground">{n} 首 · {pct.toFixed(1)}%</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            <p className="pt-2 text-xs text-muted-foreground">
              合唱曲目按全部 Vsinger 表演者重复计算（仅统计六位 Vsinger）
            </p>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">曲目频次 Top 10</h2>
          <div className="rounded-2xl border border-border bg-card p-4">
            {topSongs.length === 0 ? (
              <p className="text-sm text-muted-foreground">暂无数据</p>
            ) : (
              <ol className="space-y-1.5 text-sm">
                {topSongs.map((t, i) => (
                  <li key={t.song.id} className="flex justify-between">
                    <span>
                      <span className="text-muted-foreground tabular-nums mr-2">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      {t.song.title}
                    </span>
                    <span className="text-muted-foreground">x{t.count}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">每场新解锁曲目</h2>
        <div className="space-y-3">
          {newUnlocks.map(({ eventId, newSongs }) => {
            const e = EVENT_BY_ID.get(eventId)!;
            return (
              <div key={eventId} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <div className="font-medium">{e.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {e.date} · {e.city}
                      {e.venue ? ` · ${e.venue}` : ""}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    新解锁 <span className="text-primary font-medium">{newSongs.length}</span> 首 /
                    本场 {setlistFor(eventId).length} 首
                  </div>
                </div>
                {newSongs.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {newSongs.map((s) => (
                      <span
                        key={s.id}
                        className="text-xs rounded-full bg-primary/10 text-primary border border-primary/30 px-2 py-0.5"
                      >
                        {s.title}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function StatDialog({
  label,
  value,
  unit,
  content,
}: {
  label: string;
  value: number;
  unit: string;
  content: React.ReactNode;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="text-left rounded-2xl border border-border bg-card p-5 hover:border-primary/60 transition-colors">
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-3xl font-bold tabular-nums">{value}</span>
            <span className="text-sm text-muted-foreground">{unit}</span>
          </div>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{label} · {value} {unit}</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
