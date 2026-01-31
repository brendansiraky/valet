export const themes = {
  tangerine: {
    name: "Tangerine",
    fonts: {
      sans: "Inter",
      mono: "JetBrains Mono",
      serif: "Source Serif 4",
    },
  },
  bubblegum: {
    name: "Bubblegum",
    fonts: {
      sans: "Poppins",
      mono: "Fira Code",
      serif: "Lora",
    },
  },
  "sunset-horizon": {
    name: "Sunset Horizon",
    fonts: {
      sans: "Montserrat",
      mono: "Ubuntu Mono",
      serif: "Merriweather",
    },
  },
  "soft-pop": {
    name: "Soft Pop",
    fonts: {
      sans: "DM Sans",
      mono: "Space Mono",
      serif: "DM Sans",
    },
  },
  notebook: {
    name: "Notebook",
    fonts: {
      sans: "Architects Daughter",
      mono: "Fira Code",
      serif: "Georgia",
    },
  },
  "northern-lights": {
    name: "Northern Lights",
    fonts: {
      sans: "Plus Jakarta Sans",
      mono: "JetBrains Mono",
      serif: "Source Serif 4",
    },
  },
  "neo-brutalism": {
    name: "Neo Brutalism",
    fonts: {
      sans: "DM Sans",
      mono: "Space Mono",
      serif: "Georgia",
    },
  },
  nature: {
    name: "Nature",
    fonts: {
      sans: "Montserrat",
      mono: "Source Code Pro",
      serif: "Merriweather",
    },
  },
  "modern-minimal": {
    name: "Modern Minimal",
    fonts: {
      sans: "Inter",
      mono: "JetBrains Mono",
      serif: "Source Serif 4",
    },
  },
  "mocha-mousse": {
    name: "Mocha Mousse",
    fonts: {
      sans: "DM Sans",
      mono: "Menlo",
      serif: "Georgia",
    },
  },
  cyberpunk: {
    name: "Cyberpunk",
    fonts: {
      sans: "Outfit",
      mono: "Fira Code",
      serif: "Georgia",
    },
  },
  "vintage-paper": {
    name: "Vintage Paper",
    fonts: {
      sans: "Libre Baskerville",
      mono: "IBM Plex Mono",
      serif: "Lora",
    },
  },
  caffeine: {
    name: "Caffeine",
    fonts: {
      sans: "system-ui",
      mono: "ui-monospace",
      serif: "ui-serif",
    },
  },
} as const;

export type ThemeId = keyof typeof themes;

export const themeIds = Object.keys(themes) as ThemeId[];

export const defaultTheme: ThemeId = "notebook";
