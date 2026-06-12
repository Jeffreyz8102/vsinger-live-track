import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./ThemeToggle";

const links = [
  { to: "/", label: "我的统计" },
  { to: "/events", label: "演出列表" },
  { to: "/songs", label: "曲目索引" },
] as const;

export function AppHeader() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <header className="border-b border-border/60 bg-background/70 backdrop-blur-xl sticky top-0 z-30">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 group">
          <span className="inline-block size-2 rounded-full bg-primary" />
          <span className="font-display font-semibold tracking-tight text-foreground">
            Vsinger · 观演记忆
          </span>
        </Link>
        <nav className="flex items-center gap-1">
          {links.map((l) => {
            const active = pathname === l.to;
            return (
              <Link
                key={l.to}
                to={l.to}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent",
                )}
              >
                {l.label}
              </Link>
            );
          })}
          <ThemeToggle className="ml-1" />
        </nav>
      </div>
    </header>
  );
}
