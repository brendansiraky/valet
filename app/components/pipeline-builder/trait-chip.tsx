import { X } from "lucide-react";
import { cn } from "~/lib/utils";

interface TraitChipProps {
  id: string;
  name: string;
  color: string;
  onRemove?: (id: string) => void;
}

export function TraitChip({ id, name, color, onRemove }: TraitChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium text-white",
        "max-w-[100px] truncate"
      )}
      style={{ backgroundColor: color }}
      title={name}
    >
      <span className="truncate">{name}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(id);
          }}
          className="flex-shrink-0 hover:bg-white/20 rounded-full p-0.5"
          aria-label={`Remove ${name} trait`}
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
}
