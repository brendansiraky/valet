import { useTheme } from "~/components/theme-provider";
import { themes, themeIds, type ThemeId } from "~/lib/themes";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { Moon, Sun } from "lucide-react";

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <Select value={theme} onValueChange={(value) => setTheme(value as ThemeId)}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select theme" />
      </SelectTrigger>
      <SelectContent>
        {themeIds.map((id) => (
          <SelectItem key={id} value={id}>
            {themes[id].name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function ColorModeToggle() {
  const { colorMode, setColorMode } = useTheme();
  const isDark = colorMode === "dark";

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {isDark ? (
          <Moon className="size-4 text-muted-foreground" />
        ) : (
          <Sun className="size-4 text-muted-foreground" />
        )}
        <Label htmlFor="color-mode" className="cursor-pointer">
          Dark mode
        </Label>
      </div>
      <Switch
        id="color-mode"
        checked={isDark}
        onCheckedChange={(checked) => setColorMode(checked ? "dark" : "light")}
      />
    </div>
  );
}
