"use strict";

/* ============================================================
   INFERNAL DESCENT — PROCEDURAL DUNGEON LEVEL SYSTEM
   Adds:
   - Room-based maps
   - Corridors
   - Obstacles
   - Hazards
   - Boss arenas
   - Better dungeon crawler layout
============================================================ */

const TILE = 48;

const LEVELS = [
  {
    id: "tutorial",
    title: "The Edge of Abyss",
    short: "Tutorial",
    objective: "Defeat the Hollow Warden",
    theme: "void",
    width: 2400,
    height: 1600,
    playerStart: { x: 220, y: 800 },
    boss: "Hollow Warden",
    bossPos: { x: 1950, y: 800 },
    enemies: [
      { type: "husk", x: 720, y: 700 },
      { type: "husk", x: 880, y: 900 },
      { type: "husk", x: 1080, y: 800 }
    ],
    hazards: [],
    decor: "tutorialDungeon"
  },

  {
    id: "ash",
    title: "The Ash Desolation",
    short: "Layer I",
    objective: "Defeat The Gate Keeper",
    theme: "ash",
    width: 3600,
    height: 2600,
    playerStart: { x: 260, y: 1300 },
    boss: "The Gate Keeper",
    bossPos: { x: 3180, y: 1300 },
    enemies: [
      { type: "husk", x: 760, y: 920 },
      { type: "husk", x: 920, y: 1450 },
      { type: "husk", x: 1260, y: 1120 },
      { type: "husk", x: 1500, y: 1560 },
      { type: "husk", x: 1850, y: 980 },
      { type: "husk", x: 2080, y: 1400 },
      { type: "husk", x: 2460, y: 1180 },
      { type: "husk", x: 2700, y: 1510 }
    ],
    hazards: [
      { type: "ash", x: 1000, y: 1180, r: 95 },
      { type: "ash", x: 1700, y: 1380, r: 120 },
      { type: "ash", x: 2350, y: 990, r: 105 }
    ],
    decor: "ashDungeon"
  },

  {
    id: "kennels",
    title: "The Obsidian Kennels",
    short: "Layer II",
    objective: "Slay Alpha Cerberus",
    theme: "lava",
    width: 3800,
    height: 2700,
    playerStart: { x: 270, y: 1350 },
    boss: "Alpha Cerberus",
    bossPos: { x: 3350, y: 1350 },
    enemies: [
      { type: "hound", x: 820, y: 980 },
      { type: "hound", x: 920, y: 1160 },
      { type: "hound", x: 1120, y: 1520 },
      { type: "hound", x: 1480, y: 980 },
      { type: "hound", x: 1620, y: 1680 },
      { type: "hound", x: 2020, y: 1150 },
      { type: "hound", x: 2180, y: 1460 },
      { type: "hound", x: 2580, y: 1640 },
      { type: "hound", x: 2780, y: 1060 }
    ],
    hazards: [
      { type: "lava", x: 1120, y: 1350, r: 90 },
      { type: "lava", x: 1780, y: 1050, r: 115 },
      { type: "geyser", x: 2140, y: 1580, r: 85 },
      { type: "geyser", x: 2700, y: 1240, r: 95 }
    ],
    decor: "lavaDungeon"
  },

  {
    id: "citadel",
    title: "The Devil's Citadel",
    short: "Final Layer",
    objective: "Destroy The Devil",
    theme: "citadel",
    width: 4000,
    height: 2800,
    playerStart: { x: 300, y: 1400 },
    boss: "The Devil",
    bossPos: { x: 3520, y: 1400 },
    enemies: [
      { type: "cyclops", x: 820, y: 950 },
      { type: "gargoyle", x: 980, y: 1650 },
      { type: "cyclops", x: 1360, y: 1380 },
      { type: "gargoyle", x: 1620, y: 1050 },
      { type: "cyclops", x: 1920, y: 1780 },
      { type: "gargoyle", x: 2220, y: 1280 },
      { type: "cyclops", x: 2560, y: 960 },
      { type: "gargoyle", x: 2820, y: 1640 },
      { type: "cyclops", x: 3080, y: 1380 }
    ],
    hazards: [
      { type: "debris", x: 1060, y: 1360, r: 90 },
      { type: "debris", x: 1840, y: 1100, r: 95 },
      { type: "debris", x: 2440, y: 1660, r: 90 },
      { type: "void", x: 2900, y: 1280, r: 110 }
    ],
    decor: "citadelDungeon"
  }
];

const THEME_DATA = {
  void: {
    bg: "#0b0d12",
    floor: "#1a1d22",
    floor2: "#111318",
    wall: "#050608",
    seam: "rgba(255,255,255,0.04)",
    glow: "rgba(180,210,255,0.08)",
    fog: "rgba(210,225,255,0.06)"
  },

  ash: {
    bg: "#090706",
    floor: "#211b18",
    floor2: "#161210",
    wall: "#060403",
    seam: "rgba(255,120,50,0.04)",
    glow: "rgba(255,100,35,0.11)",
    fog: "rgba(150,125,105,0.055)"
  },

  lava: {
    bg: "#050202",
    floor: "#171012",
    floor2: "#0d090a",
    wall: "#030101",
    seam: "rgba(255,90,30,0.055)",
    glow: "rgba(255,70,20,0.15)",
    fog: "rgba(255,70,20,0.055)"
  },

  citadel: {
    bg: "#030204",
    floor: "#17111b",
    floor2: "#0e0a12",
    wall: "#050306",
    seam: "rgba(255,255,255,0.04)",
    glow: "rgba(255,0,30,0.11)",
    fog: "rgba(255,255,255,0.04)"
  }
};

/* 
  Decor objects are collision-aware if type is:
  wall, pillar, column, throne, rubble, barricade
*/

const MAP_DECOR = {
  tutorialDungeon: [
    { type: "room", x: 120, y: 610, w: 620, h: 380 },
    { type: "room", x: 760, y: 600, w: 650, h: 400 },
    { type: "room", x: 1450, y: 600, w: 720, h: 410 },

    { type: "platform", x: 120, y: 610, w: 2050, h: 380 },

    { type: "abyssRock", x: 540, y: 500, r: 70 },
    { type: "abyssRock", x: 1080, y: 1080, r: 90 },
    { type: "abyssRock", x: 1640, y: 520, r: 74 },

    { type: "torch", x: 640, y: 660 },
    { type: "torch", x: 1380, y: 930 },

    { type: "rubble", x: 1260, y: 720, w: 110, h: 85 },
    { type: "rubble", x: 1540, y: 910, w: 120, h: 80 }
  ],

  ashDungeon: [
    { type: "room", x: 180, y: 820, w: 680, h: 720 },
    { type: "room", x: 940, y: 720, w: 720, h: 820 },
    { type: "room", x: 1760, y: 840, w: 680, h: 730 },
    { type: "room", x: 2520, y: 760, w: 700, h: 820 },

    { type: "corridor", x: 760, y: 1140, w: 260, h: 180 },
    { type: "corridor", x: 1600, y: 1160, w: 230, h: 180 },
    { type: "corridor", x: 2400, y: 1170, w: 240, h: 180 },

    { type: "wall", x: 720, y: 620, w: 360, h: 80 },
    { type: "wall", x: 1260, y: 1740, w: 420, h: 80 },
    { type: "wall", x: 1900, y: 620, w: 90, h: 430 },
    { type: "wall", x: 2480, y: 1740, w: 410, h: 90 },

    { type: "pillar", x: 760, y: 1280 },
    { type: "pillar", x: 1380, y: 1010 },
    { type: "pillar", x: 2020, y: 1450 },
    { type: "pillar", x: 2700, y: 1040 },

    { type: "barricade", x: 1120, y: 1210, w: 120, h: 70 },
    { type: "rubble", x: 1680, y: 1510, w: 130, h: 80 },
    { type: "rubble", x: 2320, y: 1030, w: 120, h: 90 },

    { type: "torch", x: 980, y: 1040 },
    { type: "torch", x: 2200, y: 1320 }
  ],

  lavaDungeon: [
    { type: "room", x: 180, y: 860, w: 720, h: 760 },
    { type: "room", x: 1000, y: 720, w: 760, h: 900 },
    { type: "room", x: 1880, y: 860, w: 760, h: 720 },
    { type: "room", x: 2740, y: 740, w: 760, h: 900 },

    { type: "corridor", x: 840, y: 1190, w: 260, h: 180 },
    { type: "corridor", x: 1700, y: 1190, w: 260, h: 180 },
    { type: "corridor", x: 2600, y: 1190, w: 260, h: 180 },

    { type: "lavaRiver", x: 1240, y: 0, w: 120, h: 2700 },
    { type: "lavaRiver", x: 2380, y: 0, w: 95, h: 2700 },

    { type: "crystal", x: 720, y: 820 },
    { type: "crystal", x: 1380, y: 1700 },
    { type: "crystal", x: 2160, y: 900 },
    { type: "crystal", x: 2700, y: 1600 },

    { type: "barricade", x: 1580, y: 1100, w: 130, h: 80 },
    { type: "rubble", x: 1960, y: 1430, w: 125, h: 80 },

    { type: "torch", x: 1650, y: 1290 }
  ],

  citadelDungeon: [
    { type: "room", x: 200, y: 880, w: 760, h: 850 },
    { type: "room", x: 1100, y: 780, w: 760, h: 980 },
    { type: "room", x: 2000, y: 880, w: 760, h: 850 },
    { type: "room", x: 2920, y: 760, w: 820, h: 1050 },

    { type: "corridor", x: 900, y: 1250, w: 260, h: 190 },
    { type: "corridor", x: 1840, y: 1250, w: 260, h: 190 },
    { type: "corridor", x: 2760, y: 1250, w: 260, h: 190 },

    { type: "carpet", x: 300, y: 1280, w: 3150, h: 240 },

    { type: "column", x: 820, y: 620 },
    { type: "column", x: 820, y: 2020 },
    { type: "column", x: 1580, y: 620 },
    { type: "column", x: 1580, y: 2020 },
    { type: "column", x: 2400, y: 620 },
    { type: "column", x: 2400, y: 2020 },

    { type: "wall", x: 1400, y: 1060, w: 280, h: 70 },
    { type: "wall", x: 2250, y: 1690, w: 300, h: 70 },

    { type: "rubble", x: 1160, y: 1480, w: 120, h: 90 },
    { type: "barricade", x: 2060, y: 1200, w: 140, h: 80 },

    { type: "throne", x: 3560, y: 1400 },
    { type: "stainedGlass", x: 3180, y: 680 },
    { type: "stainedGlass", x: 3180, y: 2100 }
  ]
};

function getLevel(index) {
  return LEVELS[index];
}

function getTheme(themeId) {
  return THEME_DATA[themeId] || THEME_DATA.ash;
}