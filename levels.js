"use strict";

/* ============================================================
   INFERNAL DESCENT — LEVEL / MAP DATA
   Separate controls page. No random gameplay guide UI.
============================================================ */

const TILE = 48;

const LEVELS = [
  {
    id: "tutorial",
    title: "The Edge of Abyss",
    short: "Tutorial",
    objective: "Defeat the Hollow Warden",
    theme: "void",
    width: 2300,
    height: 1600,
    playerStart: { x: 220, y: 800 },
    boss: "Hollow Warden",
    bossPos: { x: 1850, y: 800 },
    enemies: [
      { type: "husk", x: 700, y: 700 },
      { type: "husk", x: 820, y: 900 },
      { type: "husk", x: 1030, y: 800 }
    ],
    hazards: [],
    decor: "floating_abyss"
  },

  {
    id: "ash",
    title: "The Ash Desolation",
    short: "Layer I",
    objective: "Defeat The Gate Keeper",
    theme: "ash",
    width: 3300,
    height: 2300,
    playerStart: { x: 240, y: 1150 },
    boss: "The Gate Keeper",
    bossPos: { x: 2860, y: 1150 },
    enemies: [
      { type: "husk", x: 680, y: 850 },
      { type: "husk", x: 820, y: 1320 },
      { type: "husk", x: 1050, y: 1060 },
      { type: "husk", x: 1260, y: 1490 },
      { type: "husk", x: 1600, y: 890 },
      { type: "husk", x: 1780, y: 1350 },
      { type: "husk", x: 2060, y: 1100 },
      { type: "husk", x: 2320, y: 1430 }
    ],
    hazards: [
      { type: "ash", x: 880, y: 1110, r: 90 },
      { type: "ash", x: 1450, y: 1290, r: 115 },
      { type: "ash", x: 2140, y: 980, r: 100 }
    ],
    decor: "ruined_city"
  },

  {
    id: "kennels",
    title: "The Obsidian Kennels",
    short: "Layer II",
    objective: "Slay Alpha Cerberus",
    theme: "lava",
    width: 3500,
    height: 2450,
    playerStart: { x: 260, y: 1220 },
    boss: "Alpha Cerberus",
    bossPos: { x: 3020, y: 1220 },
    enemies: [
      { type: "hound", x: 760, y: 880 },
      { type: "hound", x: 850, y: 1040 },
      { type: "hound", x: 980, y: 1370 },
      { type: "hound", x: 1280, y: 830 },
      { type: "hound", x: 1420, y: 1520 },
      { type: "hound", x: 1760, y: 1050 },
      { type: "hound", x: 1880, y: 1320 },
      { type: "hound", x: 2180, y: 1500 },
      { type: "hound", x: 2360, y: 960 }
    ],
    hazards: [
      { type: "lava", x: 990, y: 1220, r: 90 },
      { type: "lava", x: 1530, y: 980, r: 110 },
      { type: "geyser", x: 1840, y: 1430, r: 80 },
      { type: "geyser", x: 2410, y: 1130, r: 90 }
    ],
    decor: "obsidian_cavern"
  },

  {
    id: "citadel",
    title: "The Devil's Citadel",
    short: "Final Layer",
    objective: "Destroy The Devil",
    theme: "citadel",
    width: 3700,
    height: 2600,
    playerStart: { x: 280, y: 1300 },
    boss: "The Devil",
    bossPos: { x: 3250, y: 1300 },
    enemies: [
      { type: "cyclops", x: 780, y: 900 },
      { type: "gargoyle", x: 940, y: 1540 },
      { type: "cyclops", x: 1260, y: 1310 },
      { type: "gargoyle", x: 1500, y: 980 },
      { type: "cyclops", x: 1740, y: 1660 },
      { type: "gargoyle", x: 2010, y: 1190 },
      { type: "cyclops", x: 2300, y: 890 },
      { type: "gargoyle", x: 2510, y: 1510 },
      { type: "cyclops", x: 2770, y: 1280 }
    ],
    hazards: [
      { type: "debris", x: 980, y: 1260, r: 85 },
      { type: "debris", x: 1740, y: 1000, r: 95 },
      { type: "debris", x: 2260, y: 1560, r: 90 },
      { type: "void", x: 2640, y: 1180, r: 105 }
    ],
    decor: "gothic_throne"
  }
];

const THEME_DATA = {
  void: {
    bg: "#0b0d12",
    floor: "#1a1d22",
    floor2: "#111318",
    wall: "#050608",
    seam: "rgba(255,255,255,0.035)",
    glow: "rgba(180,210,255,0.08)",
    fog: "rgba(210,225,255,0.07)"
  },

  ash: {
    bg: "#090706",
    floor: "#211b18",
    floor2: "#161210",
    wall: "#060403",
    seam: "rgba(255,120,50,0.035)",
    glow: "rgba(255,100,35,0.11)",
    fog: "rgba(150,125,105,0.055)"
  },

  lava: {
    bg: "#050202",
    floor: "#171012",
    floor2: "#0d090a",
    wall: "#030101",
    seam: "rgba(255,90,30,0.05)",
    glow: "rgba(255,70,20,0.15)",
    fog: "rgba(255,70,20,0.055)"
  },

  citadel: {
    bg: "#030204",
    floor: "#17111b",
    floor2: "#0e0a12",
    wall: "#050306",
    seam: "rgba(255,255,255,0.035)",
    glow: "rgba(255,0,30,0.1)",
    fog: "rgba(255,255,255,0.04)"
  }
};

const MAP_DECOR = {
  floating_abyss: [
    { type: "platform", x: 160, y: 660, w: 1980, h: 280 },
    { type: "abyssRock", x: 540, y: 520, r: 72 },
    { type: "abyssRock", x: 1030, y: 1020, r: 88 },
    { type: "abyssRock", x: 1510, y: 560, r: 70 },
    { type: "torch", x: 620, y: 650 },
    { type: "torch", x: 1260, y: 950 }
  ],

  ruined_city: [
    { type: "wall", x: 590, y: 530, w: 360, h: 80 },
    { type: "wall", x: 1040, y: 1580, w: 420, h: 80 },
    { type: "wall", x: 1590, y: 540, w: 90, h: 500 },
    { type: "wall", x: 2170, y: 1540, w: 410, h: 90 },
    { type: "pillar", x: 720, y: 1200 },
    { type: "pillar", x: 1320, y: 930 },
    { type: "pillar", x: 1920, y: 1340 },
    { type: "pillar", x: 2540, y: 990 },
    { type: "torch", x: 900, y: 970 },
    { type: "torch", x: 2070, y: 1260 }
  ],

  obsidian_cavern: [
    { type: "lavaRiver", x: 1100, y: 0, w: 120, h: 2450 },
    { type: "lavaRiver", x: 2210, y: 0, w: 95, h: 2450 },
    { type: "crystal", x: 680, y: 760 },
    { type: "crystal", x: 1310, y: 1620 },
    { type: "crystal", x: 2090, y: 860 },
    { type: "crystal", x: 2550, y: 1510 },
    { type: "torch", x: 1510, y: 1210 }
  ],

  gothic_throne: [
    { type: "carpet", x: 260, y: 1180, w: 3000, h: 240 },
    { type: "column", x: 740, y: 520 },
    { type: "column", x: 740, y: 1900 },
    { type: "column", x: 1480, y: 520 },
    { type: "column", x: 1480, y: 1900 },
    { type: "column", x: 2260, y: 520 },
    { type: "column", x: 2260, y: 1900 },
    { type: "throne", x: 3340, y: 1300 },
    { type: "stainedGlass", x: 2950, y: 660 },
    { type: "stainedGlass", x: 2950, y: 1940 }
  ]
};

function getLevel(index) {
  return LEVELS[index];
}

function getTheme(themeId) {
  return THEME_DATA[themeId] || THEME_DATA.ash;
}