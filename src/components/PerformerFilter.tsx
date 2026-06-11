import { VSINGER_SIX, GUEST_PERFORMERS } from "@/lib/vsinger";
import { cn } from "@/lib/utils";

export function PerformerFilter({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (name: string) => void;
}) {
  const guests = [...GUEST_PERFORMERS].sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));
  return (
    <div className="space-y-2">
      <div>
        <div className="text-xs font-medium text-muted-foreground mb-1.5">Vsinger</div>
        <div className="flex flex-wrap gap-1.5">
          {VSINGER_SIX.map((p) => (
            <Chip key={p} active={selected.includes(p)} onClick={() => onToggle(p)}>
              {p}
            </Chip>
          ))}
        </div>
      </div>
      {guests.length > 0 && (
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-1.5">特邀嘉宾</div>
          <div className="flex flex-wrap gap-1.5">
            {guests.map((p) => (
              <Chip key={p} active={selected.includes(p)} onClick={() => onToggle(p)}>
                {p}
              </Chip>
            ))}
          </div>
        </div>
      )}
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
          : "bg-card hover:bg-accent border-border text-foreground",
      )}
    >
      {children}
    </button>
  );
}
