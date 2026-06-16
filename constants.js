'use strict';

export const TILE = 48;
export const T = { VOID: 0, FLOOR: 1, WALL: 2, DOOR: 3, CHECKPOINT: 4, EXIT: 5 };

/* souls needed to level up */
export const SOULS_PER_LEVEL = 5;

/* ──────────────────────────────────────────────────────────
   UTILS
────────────────────────────────────────────────────────── */
export const U = {
  clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
  dist: (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay),
  rand: (a, b) => a + Math.random() * (b - a),
  randInt: (a, b) => Math.floor(U.rand(a, b + 1)),
  choice: arr => arr[Math.floor(Math.random() * arr.length)],
  angle: (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax),
  aabb: (ax, ay, aw, ah, bx, by, bw, bh) => ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by,
};

/* ──────────────────────────────────────────────────────────
   CLASS DEFINITIONS
────────────────────────────────────────────────────────── */
export const CLASS_DEFS = {
  warrior: {
    name: 'Warrior',
    hp: 130, stamina: 60, speed: 150, damage: 30, magicDmg: 0,
    weapons: ['fireAxe', 'demonGreatsword', 'devilsGreatspear'],
    color: '#c0392b', bodyColor: '#8B6050',
  },
  assassin: {
    name: 'Assassin',
    hp: 80, stamina: 90, speed: 220, damage: 30, magicDmg: 0,
    weapons: ['fireDagger', 'demonKatana', 'devilsNagakiba'],
    color: '#2c2c3a', bodyColor: '#4a4060',
  },
  mage: {
    name: 'Mage',
    hp: 70, stamina: 60, speed: 175, damage: 0, magicDmg: 30,
    weapons: ['fireGloves', 'demonWand', 'devilsOrb'],
    color: '#4a2060', bodyColor: '#6a3a80',
  },
};

/* ──────────────────────────────────────────────────────────
   WEAPON DEFINITIONS
────────────────────────────────────────────────────────── */
export const WEAPONS = {
  /* Warrior */
  fireAxe: {
    id: 'fireAxe', name: 'Fire Axe',
    damage: 28, range: 60, arc: Math.PI * 0.85, cooldown: 550,
    color: '#e67e22', special: 'groundSmash', specialCd: 5000,
    desc: 'Leaves fire on enemies',
  },
  demonGreatsword: {
    id: 'demonGreatsword', name: 'Demon Greatsword',
    damage: 48, range: 72, arc: Math.PI * 0.75, cooldown: 700,
    color: '#c0392b', special: 'heavySlam', specialCd: 4500,
    desc: 'Massive damage on impact',
  },
  devilsGreatspear: {
    id: 'devilsGreatspear', name: "Devil's Greatspear",
    damage: 65, range: 90, arc: Math.PI * 0.55, cooldown: 600,
    color: '#e74c3c', special: 'spearThrow', specialCd: 4000,
    desc: 'Throw and melee range',
  },
  /* Assassin */
  fireDagger: {
    id: 'fireDagger', name: 'Fire Dagger',
    damage: 18, range: 44, arc: Math.PI * 0.6, cooldown: 250,
    color: '#e67e22', special: 'shadowStrike', specialCd: 4000,
    desc: 'Fast, leaves fire trail',
  },
  demonKatana: {
    id: 'demonKatana', name: 'Demon Katana',
    damage: 34, range: 58, arc: Math.PI * 0.65, cooldown: 320,
    color: '#8e44ad', special: 'dashStrike', specialCd: 3500,
    desc: 'Quick slash with dash',
  },
  devilsNagakiba: {
    id: 'devilsNagakiba', name: "Devil's Nagakiba",
    damage: 52, range: 80, arc: Math.PI * 0.55, cooldown: 280,
    color: '#c0392b', special: 'bladestorm', specialCd: 5000,
    desc: 'Long blade, bladestorm',
  },
  /* Mage */
  fireGloves: {
    id: 'fireGloves', name: 'Fire Gloves',
    damage: 0, magicDmg: 28, range: 180, arc: Math.PI * 0.3, cooldown: 400,
    color: '#e67e22', special: 'fireball', specialCd: 4000,
    desc: 'Cast spells from hands',
    projectile: true,
  },
  demonWand: {
    id: 'demonWand', name: 'Demon Wand',
    damage: 0, magicDmg: 48, range: 220, arc: Math.PI * 0.25, cooldown: 500,
    color: '#9b59b6', special: 'arcaneBlast', specialCd: 4500,
    desc: 'Focused spell blast',
    projectile: true,
  },
  devilsOrb: {
    id: 'devilsOrb', name: "Devil's Orb",
    damage: 0, magicDmg: 70, range: 260, arc: Math.PI * 0.35, cooldown: 600,
    color: '#8e44ad', special: 'orbStorm', specialCd: 5000,
    desc: 'Orb of destruction',
    projectile: true,
  },
};

/* ──────────────────────────────────────────────────────────
   SKILL TREE
────────────────────────────────────────────────────────── */
export const SKILL_DEFS = [
  { id: 'damage', icon: '⚔', name: 'Damage', desc: 'Base damage +5 per level (warrior/assassin)', maxLvl: 20, costPerLvl: 1 },
  { id: 'magicDmg', icon: '🔮', name: 'Magic Damage', desc: 'Magic damage +5 per level (mage only)', maxLvl: 20, costPerLvl: 1 },
  { id: 'speed', icon: '💨', name: 'Speed', desc: 'Move speed +10 per level (base 50)', maxLvl: 20, costPerLvl: 1 },
  { id: 'stamina', icon: '⚡', name: 'Stamina', desc: 'Max stamina +15 per level (base 50)', maxLvl: 20, costPerLvl: 1 },
  { id: 'health', icon: '❤', name: 'Health', desc: 'Max HP +10 per level (base 100)', maxLvl: 20, costPerLvl: 1 },
];