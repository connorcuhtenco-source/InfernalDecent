"use strict";

/* ============================================================
   INFERNAL DESCENT — LEVEL DATA WITH BOSS ARENAS
   Changes:
   - Every level now has a separate boss arena
   - Boss only appears after all mobs are defeated
   - Boss HP is handled in script.js as 5x
   - Safer enemy placement away from obstacles
   - Chest locations included
   - More map texture/decor support
============================================================ */

const TILE = 48;

const LEVELS = [
  {
    id: "tutorial",
    title: "The Edge of Abyss",
    short: "Tutorial",
    objective: "Defeat all enemies, then enter the boss arena",
    bossObjective: "Defeat the Hollow Warden",
    theme: "void",
    width: 2700,
    height: 1700,

    playerStart: { x: 220, y: 850 },

    boss: "Hollow Warden",
    bossArena: {
      x: 1980,
      y: 520,
      w: 560,
      h: 650,
      entranceX: 1840,
      entranceY: 850,
      playerSpawn: { x: 2045, y: 850 },
      bossPos: { x: 2350, y: 850 }
    },

    detectionBonus: 0,

    enemies: [
      { type: "husk", x: 720, y: 760 },
      { type: "husk", x: 920, y: 960 },
      { type: "husk", x: 1150, y: 830 }
    ],

    hazards: [],

    chests: [
      { x: 520, y: 960, potion: "health" },
      { x: 1420, y: 725, potion: "attack" }
    ],

    decor: "tutorialDungeon"
  },

  {
    id: "ash",
    title: "The Ash Desolation",
    short: "Layer I",
    objective: "Clear the ash ruins, then enter the boss arena",
    bossObjective: "Defeat The Gate Keeper",
    theme: "ash",
    width: 4100,
    height: 2700,

    playerStart: { x: 260, y: 1350 },

    boss: "The Gate Keeper",
    bossArena: {
      x: 3180,
      y: 820,
      w: 720,
      h: 1000,
      entranceX: 3040,
      entranceY: 1350,
      playerSpawn: { x: 3260, y: 1350 },
      bossPos: { x: 3680, y: 1350 }
    },

    detectionBonus: 40,

    enemies: [
      { type: "husk", x: 720, y: 980 },
      { type: "husk", x: 860, y: 1540 },
      { type: "husk", x: 1180, y: 1180 },
      { type: "husk", x: 1500, y: 1580 },
      { type: "husk", x: 1880, y: 1000 },
      { type: "husk", x: 2120, y: 1440 },
      { type: "husk", x: 2520, y: 1160 },
      { type: "husk", x: 2760, y: 1520 }
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
    objective: "Clear the kennels, then enter the boss arena",
    bossObjective: "Slay Alpha Cerberus",
    theme: "lava",
    width: 4300,
    height: 2800,

    playerStart: { x: 270, y: 1400 },

    boss: "Alpha Cerberus",
    bossArena: {
      x: 3320,
      y: 790,
      w: 780,
      h: 1120,
      entranceX: 3180,
      entranceY: 1400,
      playerSpawn: { x: 3420, y: 1400 },
      bossPos: { x: 3860, y: 1400 }
    },

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
    objective: "Clear the citadel, then enter the throne arena",
    bossObjective: "Destroy The Devil",
    theme: "citadel",
    width: 4600,
    height: 3000,

    playerStart: { x: 300, y: 1500 },

    boss: "The Devil",
    bossArena: {
      x: 3560,
      y: 850,
      w: 850,
      h: 1300,
      entranceX: 3420,
      entranceY: 1500,
      playerSpawn: { x: 3680, y: 1500 },
      bossPos: { x: 4160, y: 1500 }
    },

    detectionBonus: 90,

    enemies: [
      { type: "cyclops", x: 820, y: 1040 },
      { type: "gargoyle", x: 980, y: 1720 },
      { type: "cyclops", x: 1360, y: 1450 },
      { type: "gargoyle", x: 1620, y: 1100 },
      { type: "cyclops", x: 1940, y: 1850 },
      { type: "gargoyle", x: 2250, y: 1340 },
      { type: "cyclops", x: 2580, y: 1040 },
      { type: "gargoyle", x: 2860, y: 1720 },
      { type: "cyclops", x: 3120, y: 1450 }
    ],

    hazards: [
      { type: "debris", x: 1060, y: 1420, r: 75 },
      { type: "debris", x: 1840, y: 1160, r: 80 },
      { type: "debris", x: 2440, y: 1720, r: 75 },
      { type: "void", x: 2940, y: 1340, r: 85 }
    ],

    chests: [
      { x: 780, y: 1640, potion: "health" },
      { x: 1780, y: 960, potion: "speed" },
      { x: 2680, y: 1600, potion: "attack" }
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
  Blocking collision objects:
  wall, pillar, column, throne, rubble, barricade, bossGate, arenaWall

  Non-blocking decor:
  room, corridor, carpet, torch, crystal, stainedGlass, platform,
  abyssRock, lavaRiver, bones
*/

const MAP_DECOR = {
  tutorialDungeon: [
    { type: "room", x: 120, y: 610, w: 640, h: 390 },
    { type: "room", x: 780, y: 600, w: 650, h: 410 },
    { type: "room", x: 1480, y: 600, w: 420, h: 420 },
    { type: "room", x: 1980, y: 520, w: 560, h: 650 },

    { type: "platform", x: 120, y: 610, w: 1780, h: 390 },
    { type: "platform", x: 1980, y: 520, w: 560, h: 650 },

    { type: "abyssRock", x: 540, y: 500, r: 70 },
    { type: "abyssRock", x: 1080, y: 1080, r: 90 },
    { type: "abyssRock", x: 1640, y: 520, r: 74 },

    { type: "torch", x: 650, y: 660 },
    { type: "torch", x: 1380, y: 930 },
    { type: "torch", x: 2030, y: 610 },
    { type: "torch", x: 2480, y: 1090 },

    { type: "rubble", x: 1260, y: 705, w: 96, h: 70 },
    { type: "rubble", x: 1540, y: 915, w: 100, h: 70 }
  ],

  ashDungeon: [
    { type: "room", x: 180, y: 820, w: 680, h: 720 },
    { type: "room", x: 940, y: 720, w: 720, h: 820 },
    { type: "room", x: 1760, y: 840, w: 680, h: 730 },
    { type: "room", x: 2520, y: 760, w: 570, h: 820 },
    { type: "room", x: 3180, y: 820, w: 720, h: 1000 },

    { type: "corridor", x: 760, y: 1160, w: 260, h: 190 },
    { type: "corridor", x: 1600, y: 1160, w: 240, h: 190 },
    { type: "corridor", x: 2400, y: 1170, w: 250, h: 190 },
    { type: "corridor", x: 3040, y: 1260, w: 170, h: 180 },

    { type: "wall", x: 720, y: 620, w: 350, h: 72 },
    { type: "wall", x: 1260, y: 1740, w: 410, h: 72 },
    { type: "wall", x: 1900, y: 620, w: 80, h: 400 },
    { type: "wall", x: 2480, y: 1740, w: 400, h: 80 },

    { type: "pillar", x: 760, y: 1280 },
    { type: "pillar", x: 1380, y: 1010 },
    { type: "pillar", x: 2020, y: 1450 },
    { type: "pillar", x: 2700, y: 1040 },
    { type: "pillar", x: 3330, y: 1010 },
    { type: "pillar", x: 3330, y: 1690 },
    { type: "pillar", x: 3820, y: 1010 },
    { type: "pillar", x: 3820, y: 1690 },

    { type: "barricade", x: 1120, y: 1210, w: 105, h: 58 },
    { type: "rubble", x: 1680, y: 1510, w: 115, h: 68 },
    { type: "rubble", x: 2320, y: 1030, w: 110, h: 72 },

    { type: "torch", x: 980, y: 1040 },
    { type: "torch", x: 2200, y: 1320 },
    { type: "torch", x: 3260, y: 900 },
    { type: "torch", x: 3860, y: 1780 },

    { type: "bones", x: 1540, y: 1360 },
    { type: "bones", x: 2450, y: 1240 }
  ],

  lavaDungeon: [
    { type: "room", x: 180, y: 860, w: 720, h: 760 },
    { type: "room", x: 1000, y: 720, w: 760, h: 900 },
    { type: "room", x: 1880, y: 860, w: 760, h: 720 },
    { type: "room", x: 2740, y: 740, w: 480, h: 900 },
    { type: "room", x: 3320, y: 790, w: 780, h: 1120 },

    { type: "corridor", x: 840, y: 1190, w: 260, h: 180 },
    { type: "corridor", x: 1700, y: 1190, w: 260, h: 180 },
    { type: "corridor", x: 2600, y: 1190, w: 260, h: 180 },
    { type: "corridor", x: 3180, y: 1310, w: 170, h: 180 },

    { type: "lavaRiver", x: 1240, y: 0, w: 120, h: 2700 },
    { type: "lavaRiver", x: 2380, y: 0, w: 95, h: 2700 },

    { type: "crystal", x: 720, y: 820 },
    { type: "crystal", x: 1380, y: 1700 },
    { type: "crystal", x: 2160, y: 900 },
    { type: "crystal", x: 2700, y: 1600 },
    { type: "crystal", x: 3480, y: 950 },
    { type: "crystal", x: 3980, y: 1820 },

    { type: "barricade", x: 1580, y: 1100, w: 115, h: 68 },
    { type: "rubble", x: 1960, y: 1430, w: 112, h: 70 },

    { type: "torch", x: 1650, y: 1290 },
    { type: "torch", x: 3380, y: 870 },
    { type: "torch", x: 4050, y: 1900 },

    { type: "bones", x: 1980, y: 1040 },
    { type: "bones", x: 2860, y: 1460 }
  ],

  citadelDungeon: [
    { type: "room", x: 200, y: 880, w: 760, h: 850 },
    { type: "room", x: 1100, y: 780, w: 760, h: 980 },
    { type: "room", x: 2000, y: 880, w: 760, h: 850 },
    { type: "room", x: 2920, y: 900, w: 520, h: 850 },
    { type: "room", x: 3560, y: 850, w: 850, h: 1300 },

    { type: "corridor", x: 900, y: 1250, w: 260, h: 190 },
    { type: "corridor", x: 1840, y: 1250, w: 260, h: 190 },
    { type: "corridor", x: 2760, y: 1350, w: 260, h: 190 },
    { type: "corridor", x: 3420, y: 1410, w: 170, h: 190 },

    { type: "carpet", x: 300, y: 1380, w: 3850, h: 240 },

    { type: "column", x: 820, y: 620 },
    { type: "column", x: 820, y: 2140 },
    { type: "column", x: 1580, y: 620 },
    { type: "column", x: 1580, y: 2140 },
    { type: "column", x: 2400, y: 620 },
    { type: "column", x: 2400, y: 2140 },
    { type: "column", x: 3740, y: 1050 },
    { type: "column", x: 3740, y: 1950 },
    { type: "column", x: 4280, y: 1050 },
    { type: "column", x: 4280, y: 1950 },

    { type: "wall", x: 1400, y: 1060, w: 260, h: 65 },
    { type: "wall", x: 2250, y: 1690, w: 280, h: 65 },

    { type: "rubble", x: 1160, y: 1480, w: 110, h: 76 },
    { type: "barricade", x: 2060, y: 1200, w: 125, h: 70 },

    { type: "throne", x: 4260, y: 1500 },

    { type: "stainedGlass", x: 3880, y: 970 },
    { type: "stainedGlass", x: 3880, y: 2030 },
    { type: "stainedGlass", x: 4300, y: 970 },
    { type: "stainedGlass", x: 4300, y: 2030 },

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