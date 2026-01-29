import { useTheme } from "~/components/theme-provider";
import { themes, themeIds, type ThemeId } from "~/lib/themes";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

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
