"use strict";

/* ============================================================
   INFERNAL DESCENT — POLISHED LEVEL / MAP DATA
   Adds:
   - Better room-based dungeon layouts
   - Safer enemy placement away from obstacles
   - Chests with potion rewards
   - More decor / texture objects
   - Clearer hazards so damage never feels random
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
    bossPos: { x: 1980, y: 800 },

    detectionBonus: 0,

    enemies: [
      { type: "husk", x: 700, y: 720 },
      { type: "husk", x: 900, y: 900 },
      { type: "husk", x: 1120, y: 780 }
    ],

    hazards: [],

    chests: [
      { x: 520, y: 875, potion: "health" },
      { x: 1420, y: 725, potion: "attack" }
    ],

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
    bossPos: { x: 3200, y: 1300 },

    detectionBonus: 40,

    enemies: [
      { type: "husk", x: 720, y: 980 },
      { type: "husk", x: 860, y: 1480 },
      { type: "husk", x: 1180, y: 1180 },
      { type: "husk", x: 1500, y: 1550 },
      { type: "husk", x: 1880, y: 1000 },
      { type: "husk", x: 2120, y: 1410 },
      { type: "husk", x: 2520, y: 1160 },
      { type: "husk", x: 2780, y: 1520 }
    ],

    hazards: [
      { type: "ash", x: 1010, y: 1330, r: 80 },
      { type: "ash", x: 1780, y: 1220, r: 90 },
      { type: "ash", x: 2380, y: 1490, r: 85 }
    ],

    chests: [
      { x: 640, y: 1490, potion: "health" },
      { x: 1540, y: 1040, potion: "speed" },
      { x: 2520, y: 930, potion: "attack" }
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
    bossPos: { x: 3370, y: 1350 },

    detectionBonus: 70,

    enemies: [
      { type: "hound", x: 820, y: 1010 },
      { type: "hound", x: 980, y: 1530 },
      { type: "hound", x: 1260, y: 1180 },
      { type: "hound", x: 1510, y: 1680 },
      { type: "hound", x: 1960, y: 1080 },
      { type: "hound", x: 2180, y: 1460 },
      { type: "hound", x: 2580, y: 1660 },
      { type: "hound", x: 2820, y: 1060 }
    ],

    hazards: [
      { type: "lava", x: 1140, y: 1350, r: 70 },
      { type: "lava", x: 1810, y: 1060, r: 75 },
      { type: "geyser", x: 2170, y: 1580, r: 70 },
      { type: "geyser", x: 2720, y: 1230, r: 75 }
    ],

    chests: [
      { x: 720, y: 1650, potion: "health" },
      { x: 1700, y: 900, potion: "speed" },
      { x: 2520, y: 1410, potion: "attack" }
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
    bossPos: { x: 3540, y: 1400 },

    detectionBonus: 90,

    enemies: [
      { type: "cyclops", x: 820, y: 980 },
      { type: "gargoyle", x: 980, y: 1660 },
      { type: "cyclops", x: 1360, y: 1380 },
      { type: "gargoyle", x: 1620, y: 1050 },
      { type: "cyclops", x: 1940, y: 1780 },
      { type: "gargoyle", x: 2250, y: 1280 },
      { type: "cyclops", x: 2580, y: 980 },
      { type: "gargoyle", x: 2860, y: 1660 },
      { type: "cyclops", x: 3120, y: 1380 }
    ],

    hazards: [
      { type: "debris", x: 1060, y: 1360, r: 75 },
      { type: "debris", x: 1840, y: 1100, r: 80 },
      { type: "debris", x: 2440, y: 1660, r: 75 },
      { type: "void", x: 2940, y: 1280, r: 85 }
    ],

    chests: [
      { x: 780, y: 1570, potion: "health" },
      { x: 1780, y: 900, potion: "speed" },
      { x: 2680, y: 1540, potion: "attack" }
    ],

    decor: "citadelDungeon"
  }
];

const THEME_DATA = {
  void: {
    bg: "#080a0f",
    floor: "#1b1e24",
    floor2: "#11141a",
    wall: "#050608",
    seam: "rgba(210,225,255,0.045)",
    glow: "rgba(180,210,255,0.08)",
    fog: "rgba(210,225,255,0.06)",
    accent: "#d8e8ff"
  },

  ash: {
    bg: "#090706",
    floor: "#241d19",
    floor2: "#17110f",
    wall: "#060403",
    seam: "rgba(255,120,50,0.045)",
    glow: "rgba(255,100,35,0.12)",
    fog: "rgba(150,125,105,0.055)",
    accent: "#ff9f2e"
  },

  lava: {
    bg: "#050202",
    floor: "#1b1113",
    floor2: "#0d0809",
    wall: "#030101",
    seam: "rgba(255,90,30,0.06)",
    glow: "rgba(255,70,20,0.16)",
    fog: "rgba(255,70,20,0.055)",
    accent: "#ff6a3d"
  },

  citadel: {
    bg: "#030204",
    floor: "#19121d",
    floor2: "#0e0a12",
    wall: "#050306",
    seam: "rgba(255,255,255,0.045)",
    glow: "rgba(255,0,30,0.115)",
    fog: "rgba(255,255,255,0.04)",
    accent: "#ff3b24"
  }
};

/*
  Collision objects:
  wall, pillar, column, throne, rubble, barricade

  Decorative / non-blocking objects:
  room, corridor, carpet, torch, crystal, stainedGlass, platform, abyssRock, lavaRiver
*/

const MAP_DECOR = {
  tutorialDungeon: [
    { type: "room", x: 120, y: 610, w: 640, h: 390 },
    { type: "room", x: 780, y: 600, w: 650, h: 410 },
    { type: "room", x: 1480, y: 600, w: 720, h: 420 },

    { type: "platform", x: 120, y: 610, w: 2080, h: 390 },

    { type: "abyssRock", x: 540, y: 500, r: 70 },
    { type: "abyssRock", x: 1080, y: 1080, r: 90 },
    { type: "abyssRock", x: 1640, y: 520, r: 74 },

    { type: "torch", x: 650, y: 660 },
    { type: "torch", x: 1380, y: 930 },

    { type: "rubble", x: 1260, y: 705, w: 96, h: 70 },
    { type: "rubble", x: 1540, y: 915, w: 100, h: 70 }
  ],

  ashDungeon: [
    { type: "room", x: 180, y: 820, w: 680, h: 720 },
    { type: "room", x: 940, y: 720, w: 720, h: 820 },
    { type: "room", x: 1760, y: 840, w: 680, h: 730 },
    { type: "room", x: 2520, y: 760, w: 700, h: 820 },

    { type: "corridor", x: 760, y: 1160, w: 260, h: 190 },
    { type: "corridor", x: 1600, y: 1160, w: 240, h: 190 },
    { type: "corridor", x: 2400, y: 1170, w: 250, h: 190 },

    { type: "wall", x: 720, y: 620, w: 350, h: 72 },
    { type: "wall", x: 1260, y: 1740, w: 410, h: 72 },
    { type: "wall", x: 1900, y: 620, w: 80, h: 400 },
    { type: "wall", x: 2480, y: 1740, w: 400, h: 80 },

    { type: "pillar", x: 760, y: 1280 },
    { type: "pillar", x: 1380, y: 1010 },
    { type: "pillar", x: 2020, y: 1450 },
    { type: "pillar", x: 2700, y: 1040 },

    { type: "barricade", x: 1120, y: 1210, w: 105, h: 58 },
    { type: "rubble", x: 1680, y: 1510, w: 115, h: 68 },
    { type: "rubble", x: 2320, y: 1030, w: 110, h: 72 },

    { type: "torch", x: 980, y: 1040 },
    { type: "torch", x: 2200, y: 1320 },
    { type: "bones", x: 1540, y: 1360 },
    { type: "bones", x: 2450, y: 1240 }
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

    { type: "barricade", x: 1580, y: 1100, w: 115, h: 68 },
    { type: "rubble", x: 1960, y: 1430, w: 112, h: 70 },

    { type: "torch", x: 1650, y: 1290 },
    { type: "bones", x: 1980, y: 1040 },
    { type: "bones", x: 2860, y: 1460 }
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

    { type: "wall", x: 1400, y: 1060, w: 260, h: 65 },
    { type: "wall", x: 2250, y: 1690, w: 280, h: 65 },

    { type: "rubble", x: 1160, y: 1480, w: 110, h: 76 },
    { type: "barricade", x: 2060, y: 1200, w: 125, h: 70 },

    { type: "throne", x: 3560, y: 1400 },
    { type: "stainedGlass", x: 3180, y: 680 },
    { type: "stainedGlass", x: 3180, y: 2100 },
    { type: "bones", x: 1850, y: 1480 },
    { type: "bones", x: 2650, y: 1180 }
  ]
};

function getLevel(index) {
  return LEVELS[index];
}

function getTheme(themeId) {
  return THEME_DATA[themeId] || THEME_DATA.ash;
}