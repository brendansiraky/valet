export const TRAIT_COLORS = [
  // Reds (0-30)
  { name: "Ruby", value: "oklch(0.62 0.22 15)" },
  { name: "Crimson", value: "oklch(0.60 0.24 25)" },
  { name: "Scarlet", value: "oklch(0.64 0.21 35)" },
  // Oranges (45-60)
  { name: "Tangerine", value: "oklch(0.70 0.18 50)" },
  { name: "Coral", value: "oklch(0.72 0.16 60)" },
  // Yellows (75-90) - higher lightness, lower chroma
  { name: "Amber", value: "oklch(0.78 0.14 75)" },
  { name: "Gold", value: "oklch(0.80 0.13 90)" },
  // Yellow-greens (105-120)
  { name: "Lime", value: "oklch(0.75 0.16 120)" },
  { name: "Chartreuse", value: "oklch(0.72 0.17 135)" },
  // Greens (150-165)
  { name: "Emerald", value: "oklch(0.68 0.16 155)" },
  { name: "Jade", value: "oklch(0.65 0.14 165)" },
  // Teals (180-195)
  { name: "Teal", value: "oklch(0.65 0.12 180)" },
  { name: "Cyan", value: "oklch(0.70 0.13 195)" },
  // Blues (210-240) - can have higher chroma
  { name: "Sky", value: "oklch(0.68 0.14 210)" },
  { name: "Azure", value: "oklch(0.62 0.18 225)" },
  { name: "Cobalt", value: "oklch(0.58 0.20 240)" },
  // Indigo/Purple (255-285)
  { name: "Indigo", value: "oklch(0.55 0.22 265)" },
  { name: "Violet", value: "oklch(0.60 0.22 280)" },
  { name: "Purple", value: "oklch(0.62 0.21 295)" },
  // Magentas/Pinks (300-345)
  { name: "Orchid", value: "oklch(0.65 0.20 310)" },
  { name: "Magenta", value: "oklch(0.64 0.22 325)" },
  { name: "Rose", value: "oklch(0.66 0.20 340)" },
  { name: "Blush", value: "oklch(0.70 0.18 355)" },
  // Neutral
  { name: "Stone", value: "oklch(0.55 0.02 270)" },
] as const;

export const DEFAULT_TRAIT_COLOR = TRAIT_COLORS[0].value;
