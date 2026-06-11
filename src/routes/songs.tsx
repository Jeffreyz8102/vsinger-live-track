import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  SONGS,
  EVENT_BY_ID,
  isVsinger,
} from "@/lib/vsinger";
import { useAttended } from "@/lib/store";
import { useStore } from "@tanstack/react-store";
import { Input } from "@/components/ui/input";
import { PerformerFilter } from "@/components/PerformerFilter";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { listenedSongCounts } from "@/lib/vsinger";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/songs")({
  head: () => ({
    meta: [
      { title: "曲目索引 · Vsinger 观演记忆" },
      { name: "description", content: "查询每首 Vsinger 线下演出曲目的演出历史与你的收听次数。" },
      { property: "og:title", content: "曲目索引 · Vsinger 观演记忆" },
      { property: "og:description", content: "查询每首 Vsinger 线下演出曲目的演出历史。" },
    ],
  }),
  component: SongsPage,
});

function SongsPage() {
  const { ids } = useAttended();
  const counts = useMemo(() => listenedSongCounts(ids), [ids]);

  const [q, setQ] = useState("");
  const [performers, setPerformers] = useState<string[]>([]);

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return SONGS.filter((s) => {
      if (term && !s.title.toLowerCase().includes(term)) return false;
      if (performers.length && !performers.some((p) => s.performers.includes(p))) return false;
      return true;
    });
  }, [q, performers]);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">曲目索引</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          共 {SONGS.length} 首已在线下演出过的曲目
        </p>
      </div>

      <div className="grid lg:grid-cols-[260px_1fr] gap-6">
        <aside className="space-y-5 lg:sticky lg:top-20 self-start rounded-2xl border border-border bg-card p-4">
          <Input placeholder="搜索曲目名" value={q} onChange={(e) => setQ(e.target.value)} />
          <div>
            <div className="text-xs font-semibold mb-2">演出者</div>
            <PerformerFilter
              selected={performers}
              onToggle={(p) => setPerformers((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]))}
            />
          </div>
          {(q || performers.length > 0) && (
            <Button variant="ghost" size="sm" className="w-full" onClick={() => { setQ(""); setPerformers([]); }}>
              重置筛选
            </Button>
          )}
        </aside>

        <div>
          <div className="text-sm text-muted-foreground mb-3">{list.length} 首匹配</div>
          <ul className="grid sm:grid-cols-2 gap-2">
            {list.map((s) => {
              const got = counts.get(s.id) ?? 0;
              return (
                <li key={s.id}>
                  <Dialog>
                    <DialogTrigger asChild>
                      <button
                        className={cn(
                          "w-full text-left rounded-xl border bg-card p-3 hover:border-primary/60 transition-colors",
                          got > 0 ? "border-primary/40" : "border-border",
                        )}
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="font-medium truncate">{s.title}</span>
                          {got > 0 && (
                            <span className="text-xs text-primary shrink-0">已听 x{got}</span>
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {s.performers.map((p) => (
                            <span
                              key={p}
                              className={cn(
                                "text-[10px] px-1.5 py-0.5 rounded-full border",
                                isVsinger(p)
                                  ? "border-primary/40 text-primary bg-primary/5"
                                  : "border-border text-muted-foreground",
                              )}
                            >
                              {p}
                            </span>
                          ))}
                          <span className="ml-auto text-[10px] text-muted-foreground">
                            {s.eventIds.length} 场
                          </span>
                        </div>
                      </button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                      <DialogHeader>
                        <DialogTitle>{s.title}</DialogTitle>
                      </DialogHeader>
                      <div className="text-sm text-muted-foreground mb-2">
                        在以下 {s.eventIds.length} 场演出中出现 · 你已听 {got} 次
                      </div>
                      <ul className="space-y-1.5 max-h-[60vh] overflow-y-auto">
                        {s.eventIds.map((eid) => {
                          const e = EVENT_BY_ID.get(eid)!;
                          const attended = ids.includes(eid);
                          return (
                            <li
                              key={eid}
                              className={cn(
                                "rounded-md border px-3 py-2 text-sm flex justify-between items-center gap-3",
                                attended ? "border-primary/40 bg-primary/5" : "border-border",
                              )}
                            >
                              <div className="min-w-0">
                                <div className="truncate">{e.title}</div>
                                <div className="text-xs text-muted-foreground">
                                  {e.date} · {e.city}
                                </div>
                              </div>
                              {attended && (
                                <span className="text-xs text-primary shrink-0">已听</span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </DialogContent>
                  </Dialog>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}