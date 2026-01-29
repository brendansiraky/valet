import { cn } from "~/lib/utils";

interface ColorSwatchPickerProps {
  value: string;
  onChange: (color: string) => void;
  colors: readonly { name: string; value: string }[];
}

export function ColorSwatchPicker({ value, onChange, colors }: ColorSwatchPickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {colors.map((color) => (
        <button
          key={color.value}
          type="button"
          onClick={() => onChange(color.value)}
          className={cn(
            "h-8 w-8 rounded-full border-2 transition-transform hover:scale-110",
            value === color.value
              ? "border-foreground ring-2 ring-ring ring-offset-2"
              : "border-transparent"
          )}
          style={{ backgroundColor: color.value }}
          title={color.name}
          aria-label={`Select ${color.name} color`}
          aria-pressed={value === color.value}
        />
      ))}
    </div>
  );
}
