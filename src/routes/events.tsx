import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  EVENTS,
  ALL_CITIES,
  ALL_YEARS,
  groupEvents,
  setlistFor,
  sortCities,
  isVsinger,
  VSINGER_SIX,
} from "@/lib/vsinger";
import { useAttended } from "@/lib/store";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PerformerFilter } from "@/components/PerformerFilter";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";

export const Route = createFileRoute("/events")({
  head: () => ({
    meta: [
      { title: "演出列表 · Vsinger 观演记忆" },
      { name: "description", content: "勾选你看过的 Vsinger 线下演出场次，按年份、城市、巡演快速筛选。" },
      { property: "og:title", content: "演出列表 · Vsinger 观演记忆" },
      { property: "og:description", content: "勾选你看过的 Vsinger 线下演出场次。" },
    ],
  }),
  component: EventsPage,
});

function EventsPage() {
  const { ids, toggle, setMany, clear, exportJson, importJson } = useAttended();
  const attended = useMemo(() => new Set(ids), [ids]);

  const [q, setQ] = useState("");
  const [years, setYears] = useState<number[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [performers, setPerformers] = useState<string[]>([]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return EVENTS.filter((e) => {
      if (term && !(e.title.toLowerCase().includes(term) || e.city.includes(term))) return false;
      if (years.length && !years.includes(e.year)) return false;
      if (cities.length && !cities.includes(e.city)) return false;
      if (performers.length && !performers.some((p) => e.performers.includes(p))) return false;
      return true;
    });
  }, [q, years, cities, performers]);

  const groups = useMemo(() => {
    const g = groupEvents(filtered);
    // 6.6 — when performers filter active, push groups whose primary matches to the top
    if (performers.length) {
      g.sort((a, b) => {
        const aMatch = a.events.some(
          (e) => e.primaryPerformers.some((p) => performers.includes(p)) && e.performers.filter(isVsinger).length === 1,
        );
        const bMatch = b.events.some(
          (e) => e.primaryPerformers.some((p) => performers.includes(p)) && e.performers.filter(isVsinger).length === 1,
        );
        if (aMatch !== bMatch) return aMatch ? -1 : 1;
        return b.earliestDate.localeCompare(a.earliestDate);
      });
    }
    return g;
  }, [filtered, performers]);

  const toggleList = (arr: any[], setArr: (v: any) => void, v: any) =>
    setArr(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
      <div className="flex flex-wrap items-baseline justify-between gap-3 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">演出列表</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            已勾选 <span className="text-primary font-medium">{ids.length}</span> / {EVENTS.length} 场
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={exportJson}>
            导出
          </Button>
          <label className="inline-flex cursor-pointer">
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importJson(f);
                e.target.value = "";
              }}
            />
            <Button variant="outline" size="sm">
              导入
            </Button>
          </label>
          <Button variant="ghost" size="sm" onClick={clear}>
            清空
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[260px_1fr] gap-6">
        <aside className="space-y-5 lg:sticky lg:top-20 self-start rounded-2xl border border-border bg-card p-4">
          <Input placeholder="搜索演出 / 城市" value={q} onChange={(e) => setQ(e.target.value)} />
          <Section title="年份">
            <div className="flex flex-wrap gap-1.5">
              {ALL_YEARS.map((y) => (
                <Chip key={y} active={years.includes(y)} onClick={() => toggleList(years, setYears, y)}>
                  {y}
                </Chip>
              ))}
            </div>
          </Section>
          <Section title="城市">
            <div className="flex flex-wrap gap-1.5">
              {sortCities(ALL_CITIES).map((c) => (
                <Chip key={c} active={cities.includes(c)} onClick={() => toggleList(cities, setCities, c)}>
                  {c}
                </Chip>
              ))}
            </div>
          </Section>
          <Section title="演出者">
            <PerformerFilter
              selected={performers}
              onToggle={(p) => toggleList(performers, setPerformers, p)}
            />
          </Section>
          {(years.length || cities.length || performers.length || q) && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => {
                setYears([]);
                setCities([]);
                setPerformers([]);
                setQ("");
              }}
            >
              重置筛选
            </Button>
          )}
        </aside>

        <div className="space-y-3">
          {groups.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
              没有符合条件的演出
            </div>
          )}
          {groups.map((g) => (
            <GroupCard
              key={g.key}
              group={g}
              attended={attended}
              onToggle={toggle}
              onBulk={(updates) => setMany(updates)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold text-foreground mb-2">{title}</div>
      {children}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-2.5 py-1 rounded-full text-xs border transition-colors",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background hover:bg-accent border-border text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function GroupCard({
  group,
  attended,
  onToggle,
  onBulk,
}: {
  group: ReturnType<typeof groupEvents>[number];
  attended: Set<string>;
  onToggle: (id: string) => void;
  onBulk: (updates: Record<string, boolean>) => void;
}) {
  const [open, setOpen] = useState(group.events.length === 1);
  const allChecked = group.events.every((e) => attended.has(e.id));
  const someChecked = !allChecked && group.events.some((e) => attended.has(e.id));
  const groupIsCollapsible = group.events.length > 1;
  const groupPerformers = useMemo(
    () => sortPerformers(Array.from(new Set(group.events.flatMap((e) => e.performers)))),
    [group],
  );

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-3 p-4">
        {groupIsCollapsible && (
          <Checkbox
            checked={allChecked ? true : someChecked ? "indeterminate" : false}
            onCheckedChange={(v) => {
              const next = v === true;
              const updates: Record<string, boolean> = {};
              for (const e of group.events) updates[e.id] = next;
              onBulk(updates);
            }}
          />
        )}
        {!groupIsCollapsible && (
          <Checkbox
            checked={attended.has(group.events[0].id)}
            onCheckedChange={() => onToggle(group.events[0].id)}
          />
        )}
        <CollapsibleTrigger asChild>
          <button className="flex-1 text-left min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              {group.showTourLabel && (
                <span className="text-[10px] font-semibold text-primary border border-primary/40 bg-primary/10 px-1.5 py-0.5 rounded-full shrink-0">
                  巡演
                </span>
              )}
              <span className="font-medium truncate">{group.title}</span>
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {group.events.length === 1
                ? `${group.events[0].date} · ${group.events[0].city}${group.events[0].venue ? " · " + group.events[0].venue : ""}`
                : `${group.events.length} 场 · ${group.events[0].date.slice(0, 4)}`}
            </div>
          </button>
        </CollapsibleTrigger>
        {groupIsCollapsible && (
          <CollapsibleTrigger asChild>
            <button className="p-2 text-muted-foreground hover:text-foreground">
              <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
            </button>
          </CollapsibleTrigger>
        )}
      </div>
      {groupIsCollapsible && (
        <div className="px-4 pb-3 -mt-1 flex flex-wrap gap-1">
          {groupPerformers.map((p) => (
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
        </div>
      )}
      {groupIsCollapsible && (
        <CollapsibleContent>
          <ul className="border-t border-border divide-y divide-border">
            {group.events.map((e) => (
              <li key={e.id} className="flex items-center gap-3 px-4 py-2.5">
                <Checkbox checked={attended.has(e.id)} onCheckedChange={() => onToggle(e.id)} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{e.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {e.date} · {e.city}
                    {e.venue ? " · " + e.venue : ""} · {setlistFor(e.id).length} 首
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {sortPerformers(e.performers).map((p) => (
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
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </CollapsibleContent>
      )}
      {!groupIsCollapsible && (
        <div className="px-4 pb-3 -mt-2 flex flex-wrap gap-1">
          {sortPerformers(group.events[0].performers).map((p) => (
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
          <span className="text-[10px] text-muted-foreground ml-auto">
            {setlistFor(group.events[0].id).length} 首
          </span>
        </div>
      )}
    </Collapsible>
  );
}

// Sort performers: Vsinger six first (preserving canonical order), then others by zh locale.
function sortPerformers(arr: string[]): string[] {
  const vsingerOrder = new Map<string, number>(
    VSINGER_SIX.map((v, i) => [v, i]),
  );
  return [...arr].sort((a, b) => {
    const av = vsingerOrder.get(a);
    const bv = vsingerOrder.get(b);
    if (av !== undefined && bv !== undefined) return av - bv;
    if (av !== undefined) return -1;
    if (bv !== undefined) return 1;
    return a.localeCompare(b, "zh-Hans-CN");
  });
}