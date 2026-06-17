A/* Infernal Descent — game.js */

(() => {
  'use strict';

  // ─── Constants ───────────────────────────────────────────────
  const TILE = 32;
  const MAX_SKILL = 20;
  const SOULS_PER_LEVEL = 5;

  const DEFAULT_KEYBINDS = {
    up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD',
    attack: 'KeyJ', block: 'KeyK', dash: 'Space', ability: 'KeyE',
    skillTree: 'Tab', pause: 'Escape'
  };

  const KEYBIND_LABELS = {
    up: 'Move Up', down: 'Move Down', left: 'Move Left', right: 'Move Right',
    attack: 'Attack', block: 'Block', dash: 'Dash / Sprint',
    ability: 'Ability', skillTree: 'Skill Tree', pause: 'Pause'
  };

  const CLASSES = {
    assassin: {
      name: 'Assassin', speed: 80, stamina: 50, health: 80, damage: 25, magic: 0,
      weapons: ['Fire Dagger', 'Demon Katana', "Devil's Nagakiba"],
      color: '#8888ff', radius: 10
    },
    warrior: {
      name: 'Warrior', speed: 40, stamina: 60, health: 150, damage: 40, magic: 0,
      weapons: ['Fire Axe', 'Demon Greatsword', "Devil's Greatspear"],
      color: '#ff4444', radius: 14
    },
    mage: {
      name: 'Mage', speed: 55, stamina: 45, health: 70, damage: 0, magic: 14,
      weapons: ['Fire Gloves', 'Demon Wand', "Devil's Orb"],
      color: '#ff8800', radius: 10
    }
  };

  const SPRITE_ROOT = 'assets/sprites';
  const spriteCache = {};
  let spritesReady = false;

  function spritePath(cls, anim, frame) {
    const folder = cls === 'warrior' ? 'warrior' : cls === 'assassin' ? 'assassin' : 'mage';
    if (anim === 'Attack' && cls === 'warrior') {
      return `${SPRITE_ROOT}/${folder}/Attack/attack${Math.min(frame - 1, 4)}.png`;
    }
    if (anim === 'Attack' && cls === 'assassin') {
      return `${SPRITE_ROOT}/${folder}/Attack/Attack${Math.min(frame, 7)}.png`;
    }
    if (anim === 'Fire' && cls === 'mage') {
      return `${SPRITE_ROOT}/${folder}/Fire/fire${Math.min(frame, 9)}.png`;
    }
    const prefix = anim === 'Run' ? 'run' : 'idle';
    return `${SPRITE_ROOT}/${folder}/${anim}/${prefix}${frame}.png`;
  }

  function loadSprite(path) {
    if (spriteCache[path]) return Promise.resolve(spriteCache[path]);
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => { spriteCache[path] = img; resolve(img); };
      img.onerror = () => resolve(null);
      img.src = path;
    });
  }

  async function preloadAllSprites() {
    const plan = [
      ['warrior', ['Idle', 'Run', 'Attack'], 8, 8, 5],
      ['assassin', ['Idle', 'Run', 'Attack'], 8, 8, 7],
      ['mage', ['Idle', 'Run'], 8, 8, 0]
    ];
    const tasks = [];
    plan.forEach(([cls, anims, idleN, runN, atkN]) => {
      for (let i = 1; i <= idleN; i++) tasks.push(loadSprite(spritePath(cls, 'Idle', i)));
      for (let i = 1; i <= runN; i++) tasks.push(loadSprite(spritePath(cls, 'Run', i)));
      if (cls === 'mage') {
        for (let i = 1; i <= 9; i++) tasks.push(loadSprite(spritePath(cls, 'Fire', i)));
      } else {
        for (let i = 1; i <= atkN; i++) tasks.push(loadSprite(spritePath(cls, 'Attack', i)));
      }
    });
    await Promise.all(tasks);
    spritesReady = true;
  }

  function getSpriteFrame(cls, anim, frame) {
    return spriteCache[spritePath(cls, anim, frame)] || null;
  }

  const SKILLS = [
    { id: 'damage', name: 'Damage', desc: '+5 physical damage per level', base: 30, add: 5, mageOnly: false, nonMage: true },
    { id: 'magic', name: 'Magic Damage', desc: '+3 magic damage per level (Mage)', base: 14, add: 3, mageOnly: true },
    { id: 'speed', name: 'Speed', desc: '+10 movement speed per level', base: 50, add: 10 },
    { id: 'stamina', name: 'Stamina', desc: '+15 max stamina per level', base: 50, add: 15 },
    { id: 'health', name: 'Health', desc: '+10 max health per level', base: 100, add: 10 }
  ];

  const LAYER_NAMES = {
    tutorial: 'The Edge of Abyss',
    layer1: 'The Ash Desolation',
    layer2: 'The Obsidian Kennels',
    layer3: "The Devil's Citadel",
    throne: 'The Throne Room'
  };

  // ─── State ─────────────────────────────────────────────────────
  let settings = loadSettings();
  let keybinds = { ...DEFAULT_KEYBINDS, ...settings.keybinds };
  let audioCtx = null;
  let game = null;

  const screens = {
    landing: document.getElementById('landing'),
    classSelect: document.getElementById('class-select'),
    game: document.getElementById('game-screen'),
    ending: document.getElementById('ending')
  };

  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');
  const brightnessOverlay = document.getElementById('brightness-overlay');

  // ─── Settings ──────────────────────────────────────────────────
  function loadSettings() {
    try {
      return JSON.parse(localStorage.getItem('infernal-descent-settings')) || {};
    } catch { return {}; }
  }

  function saveSettings() {
    localStorage.setItem('infernal-descent-settings', JSON.stringify(settings));
  }

  function applyBrightness(val) {
    brightnessOverlay.style.opacity = String((100 - val) / 100 * 0.7);
  }

  function initSettingsUI() {
    const defaults = { brightness: 100, master: 70, sfx: 80, music: 50 };
    Object.assign(settings, defaults, settings);

    const sliders = [
      ['setting-brightness', 'brightness', 'brightness-value', applyBrightness],
      ['setting-master', 'master', 'master-value'],
      ['setting-sfx', 'sfx', 'sfx-value'],
      ['setting-music', 'music', 'music-value']
    ];

    sliders.forEach(([id, key, labelId, cb]) => {
      const el = document.getElementById(id);
      el.value = settings[key];
      document.getElementById(labelId).textContent = settings[key] + '%';
      if (cb) cb(settings[key]);
      el.addEventListener('input', () => {
        settings[key] = +el.value;
        document.getElementById(labelId).textContent = settings[key] + '%';
        if (cb) cb(settings[key]);
        saveSettings();
      });
    });
  }

  // ─── Keybinds ──────────────────────────────────────────────────
  let listeningKey = null;

  function keyCodeToLabel(code) {
    if (!code) return '—';
    if (code === 'Space') return 'Space';
    if (code.startsWith('Key')) return code.slice(3);
    if (code.startsWith('Arrow')) return code.slice(5);
    return code;
  }

  function renderKeybinds() {
    const list = document.getElementById('keybind-list');
    list.innerHTML = '';
    Object.entries(KEYBIND_LABELS).forEach(([action, label]) => {
      const row = document.createElement('div');
      row.className = 'keybind-row';
      const span = document.createElement('span');
      span.textContent = label;
      const btn = document.createElement('button');
      btn.textContent = keyCodeToLabel(keybinds[action]);
      btn.dataset.action = action;
      btn.addEventListener('click', () => startListening(action, btn));
      row.append(span, btn);
      list.appendChild(row);
    });
  }

  function startListening(action, btn) {
    listeningKey = action;
    document.querySelectorAll('.keybind-row button').forEach(b => b.classList.remove('listening'));
    btn.classList.add('listening');
    btn.textContent = 'Press key...';
  }

  document.addEventListener('keydown', (e) => {
    if (!listeningKey) return;
    e.preventDefault();
    if (e.code === 'Escape') {
      renderKeybinds();
      listeningKey = null;
      return;
    }
    keybinds[listeningKey] = e.code;
    settings.keybinds = { ...keybinds };
    saveSettings();
    listeningKey = null;
    renderKeybinds();
  });

  // ─── Audio ─────────────────────────────────────────────────────
  function ensureAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }

  function playTone(freq, dur, type = 'square', vol = 0.08) {
    ensureAudio();
    const master = (settings.master ?? 70) / 100;
    const sfx = (settings.sfx ?? 80) / 100;
    const g = audioCtx.createGain();
    g.gain.value = vol * master * sfx;
    g.connect(audioCtx.destination);
    const o = audioCtx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    o.connect(g);
    o.start();
    o.stop(audioCtx.currentTime + dur);
  }

  function sfxHit() { playTone(120, 0.08, 'sawtooth', 0.06); }
  function sfxAttack() { playTone(200, 0.05, 'square', 0.04); }
  function sfxSoul() { playTone(600, 0.12, 'sine', 0.05); playTone(800, 0.1, 'sine', 0.04); }
  function sfxLevel() { playTone(440, 0.15, 'sine', 0.06); playTone(660, 0.2, 'sine', 0.05); }
  function sfxBossRoar() { playTone(60, 0.4, 'sawtooth', 0.1); }
  function sfxBeamCharge() { playTone(300, 0.3, 'triangle', 0.05); }

  // ─── Screen Management ─────────────────────────────────────────
  function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[name].classList.add('active');
  }

  function openModal(id) {
    document.getElementById(id).showModal();
  }

  // ─── Map Generation ────────────────────────────────────────────
  function createTutorialMap() {
    const w = 40, h = 30;
    const map = emptyMap(w, h);
    // Floating stone path
    for (let x = 5; x < 35; x++) {
      for (let y = 12; y < 18; y++) setTile(map, x, y, 1);
    }
    // Arena circle
    const cx = 32, cy = 15, r = 6;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d <= r) setTile(map, x, y, 1);
    }
    map.spawn = { x: 6 * TILE + TILE / 2, y: 15 * TILE + TILE / 2 };
    map.gate = { x: 35 * TILE, y: 15 * TILE, open: false };
    map.layer = 'tutorial';
    map.theme = 'tutorial';
    return map;
  }

  function createLayer1Map() {
    const w = 50, h = 40;
    const map = emptyMap(w, h);
    // Labyrinth walls
    carveLabyrinth(map, 1, 1, w - 2, h - 2);
    // Arena highway for Gatekeeper
    for (let x = 20; x < 45; x++) for (let y = 18; y < 22; y++) setTile(map, x, y, 1);
    // Ash hazards scattered
    map.hazards = [];
    for (let i = 0; i < 25; i++) {
      map.hazards.push({
        x: (3 + Math.floor(Math.random() * (w - 6))) * TILE + TILE / 2,
        y: (3 + Math.floor(Math.random() * (h - 6))) * TILE + TILE / 2,
        r: 20, type: 'ash'
      });
    }
    map.spawn = { x: 5 * TILE, y: 5 * TILE };
    map.bossArena = { x1: 20, y1: 17, x2: 44, y2: 23 };
    map.gate = { x: 44 * TILE, y: 20 * TILE, open: false };
    map.layer = 'layer1';
    map.theme = 'ash';
    return map;
  }

  function carveDisc(map, cx, cy, r) {
    for (let y = cy - r; y <= cy + r; y++) {
      for (let x = cx - r; x <= cx + r; x++) {
        if (Math.hypot(x - cx, y - cy) <= r) setTile(map, x, y, 1);
      }
    }
  }

  function carveCorridor(map, x1, y1, x2, y2, halfW = 2) {
    let x = x1;
    let y = y1;
    const stepX = Math.sign(x2 - x1);
    const stepY = Math.sign(y2 - y1);
    const stamp = (tx, ty) => {
      for (let ox = -halfW; ox <= halfW; ox++) {
        for (let oy = -halfW; oy <= halfW; oy++) setTile(map, tx + ox, ty + oy, 1);
      }
    };
    stamp(x, y);
    while (x !== x2 || y !== y2) {
      if (x !== x2) x += stepX;
      else if (y !== y2) y += stepY;
      stamp(x, y);
    }
  }

  function randomWalkableTile(map, tries = 40) {
    for (let i = 0; i < tries; i++) {
      const x = 6 + Math.floor(Math.random() * (map.w - 12));
      const y = 6 + Math.floor(Math.random() * (map.h - 12));
      if (getTile(map, x, y) === 1) return { x, y };
    }
    return null;
  }

  function createLayer2Map() {
    const w = 55, h = 45;
    const map = emptyMap(w, h);
    const mainY = 22;

    // Guaranteed east-west route from spawn to boss (no random gaps)
    for (let x = 4; x <= 50; x++) {
      for (let dy = -2; dy <= 2; dy++) setTile(map, x, mainY + dy, 1);
    }

    // Hunting clearings — each linked to the main highway
    [
      { cx: 14, cy: 14, r: 7, linkX: 14 },
      { cx: 28, cy: 12, r: 6, linkX: 28 },
      { cx: 20, cy: 32, r: 8, linkX: 20 },
      { cx: 38, cy: 30, r: 6, linkX: 38 }
    ].forEach(({ cx, cy, r, linkX }) => {
      carveDisc(map, cx, cy, r);
      carveCorridor(map, linkX, cy, linkX, mainY, 2);
    });

    // Boss colosseum connected to the highway
    const ax = 46;
    const ay = 22;
    const ar = 9;
    carveDisc(map, ax, ay, ar);
    for (let x = 36; x <= ax + ar; x++) {
      for (let dy = -2; dy <= 2; dy++) setTile(map, x, mainY + dy, 1);
    }

    map.hazards = [];
    for (let i = 0; i < 18; i++) {
      const cell = randomWalkableTile(map);
      if (!cell) continue;
      map.hazards.push({
        x: cell.x * TILE + TILE / 2,
        y: cell.y * TILE + TILE / 2,
        r: 16, type: 'geyser', timer: Math.random() * 3, active: false, cd: 2 + Math.random() * 4
      });
    }

    map.spawn = { x: 6 * TILE + TILE / 2, y: mainY * TILE + TILE / 2 };
    map.bossArena = { x1: ax - ar, y1: ay - ar, x2: ax + ar, y2: ay + ar };
    map.gate = { x: (ax + ar - 2) * TILE, y: ay * TILE, open: false };
    map.layer = 'layer2';
    map.theme = 'obsidian';
    return map;
  }

  function createLayer3Map() {
    const w = 50, h = 50;
    const map = emptyMap(w, h);
    // Gothic vertical layout - platforms
    for (let x = 5; x < 45; x++) setTile(map, x, 42, 1);
    for (let x = 8; x < 42; x++) setTile(map, x, 35, 1);
    for (let x = 12; x < 38; x++) setTile(map, x, 28, 1);
    for (let x = 5; x < 45; x++) setTile(map, x, 20, 1);
    // Bridges
    for (let x = 20; x < 30; x++) { setTile(map, x, 35, 1); setTile(map, x, 28, 1); }
    // Stairs
    for (let i = 0; i < 8; i++) {
      setTile(map, 5 + i, 42 - i, 1);
      setTile(map, 44 - i, 42 - i, 1);
    }
    map.hazards = [];
    for (let i = 0; i < 12; i++) {
      map.hazards.push({
        x: (10 + Math.floor(Math.random() * 30)) * TILE,
        y: (22 + Math.floor(Math.random() * 18)) * TILE,
        r: 12, type: 'debris', timer: 3 + Math.random() * 5, warning: false
      });
    }
    map.spawn = { x: 25 * TILE, y: 42 * TILE };
    map.throneDoor = { x: 25 * TILE, y: 18 * TILE, open: false };
    map.layer = 'layer3';
    map.theme = 'citadel';
    return map;
  }

  function createThroneMap() {
    const w = 30, h = 20;
    const map = emptyMap(w, h);
    for (let x = 2; x < w - 2; x++) for (let y = 8; y < h - 2; y++) setTile(map, x, y, 1);
    // Carpet strip
    map.carpetY = 14;
    map.spawn = { x: 15 * TILE, y: 17 * TILE };
    map.throne = { x: 15 * TILE, y: 9 * TILE };
    map.layer = 'throne';
    map.theme = 'throne';
    return map;
  }

  function emptyMap(w, h) {
    return { w, h, tiles: new Uint8Array(w * h), hazards: [] };
  }

  function setTile(map, x, y, v) {
    if (x >= 0 && x < map.w && y >= 0 && y < map.h) map.tiles[y * map.w + x] = v;
  }

  function getTile(map, x, y) {
    if (x < 0 || x >= map.w || y < 0 || y >= map.h) return 0;
    return map.tiles[y * map.w + x];
  }

  function carveLabyrinth(map, x1, y1, x2, y2) {
    for (let y = y1; y <= y2; y++) for (let x = x1; x <= x2; x++) {
      setTile(map, x, y, (x % 3 === 0 || y % 3 === 0) ? 0 : 1);
    }
    // Carve corridors
    for (let i = 0; i < 80; i++) {
      const x = x1 + Math.floor(Math.random() * (x2 - x1));
      const y = y1 + Math.floor(Math.random() * (y2 - y1));
      setTile(map, x, y, 1);
      setTile(map, x + 1, y, 1);
      setTile(map, x, y + 1, 1);
    }
  }

  function tileAt(map, px, py) {
    return getTile(map, Math.floor(px / TILE), Math.floor(py / TILE));
  }

  // ─── Entity Factory ────────────────────────────────────────────
  function createPlayer(cls, weaponTier) {
    const c = CLASSES[cls];
    return {
      x: 0, y: 0, cls, weaponTier,
      radius: c.radius, color: c.color,
      angle: 0, vx: 0, vy: 0,
      health: c.health, maxHealth: c.health,
      stamina: c.stamina, maxStamina: c.stamina,
      staminaRegen: 12, attacking: false, attackTimer: 0, attackCd: 0,
      blocking: false, dashing: false, dashTimer: 0, dashCd: 0,
      invuln: 0, stunned: 0, slowed: 0, abilityCd: 0, animTime: 0,
      souls: 0, level: 1, skillPoints: 0,
      skills: { damage: 0, magic: 0, speed: 0, stamina: 0, health: 0 },
      dead: false
    };
  }

  function applySkillStats(p) {
    const c = CLASSES[p.cls];
    p.maxHealth = c.health + p.skills.health * 10;
    p.maxStamina = c.stamina + p.skills.stamina * 15;
    if (p.health > p.maxHealth) p.health = p.maxHealth;
    if (p.stamina > p.maxStamina) p.stamina = p.maxStamina;
  }

  function getDamage(p) {
    const c = CLASSES[p.cls];
    if (p.cls === 'mage') return 14 + p.skills.magic * 3;
    return 30 + p.skills.damage * 5 + (c.damage - 25);
  }

  function getSpeed(p) {
    return CLASSES[p.cls].speed + p.skills.speed * 10;
  }

  function getWeaponName(p) {
    return CLASSES[p.cls].weapons[p.weaponTier];
  }

  function spawnEnemy(type, x, y, opts = {}) {
    const base = {
      x, y, type, vx: 0, vy: 0, angle: 0,
      health: 30, maxHealth: 30, damage: 8, speed: 30,
      radius: 12, attackCd: 0, state: 'idle', stateTimer: 0,
      phase2: false, dead: false, soulValue: 1, ...opts
    };
    switch (type) {
      case 'husk':
        return { ...base, health: 30, maxHealth: 30, damage: 8, speed: 28, radius: 11, color: '#888' };
      case 'hellhound':
        return { ...base, health: 35, maxHealth: 35, damage: 10, speed: 55, radius: 10, color: '#cc3300' };
      case 'cyclops':
        return { ...base, health: 60, maxHealth: 60, damage: 15, speed: 22, radius: 16, color: '#665544', ranged: 20 };
      case 'gargoyle':
        return { ...base, health: 45, maxHealth: 45, damage: 15, speed: 40, radius: 12, color: '#444466', flying: true };
      case 'tutorial_boss':
        return { ...base, name: 'Hollow Sentinel', health: 120, maxHealth: 120, damage: 12, speed: 35,
          radius: 18, color: '#555', boss: true, soulValue: 5 };
      case 'gatekeeper':
        return { ...base, name: 'The Gatekeeper', health: 300, maxHealth: 300, damage: 15, speed: 45,
          radius: 22, color: '#993333', boss: true, miniBoss: true, soulValue: 15,
          rushDamage: 20, fistDamage: 15 };
      case 'cerberus':
        return { ...base, name: 'Alpha Cerberus', health: 400, maxHealth: 400, damage: 25, speed: 38,
          radius: 26, color: '#aa2200', boss: true, miniBoss: true, soulValue: 15 };
      case 'devil':
        return { ...base, name: 'The Devil', health: 600, maxHealth: 600, damage: 20, speed: 32,
          radius: 20, color: '#cc0000', boss: true, soulValue: 0, summons: 0 };
      default:
        return base;
    }
  }

  // ─── Game Class ────────────────────────────────────────────────
  class InfernalGame {
    constructor(playerClass) {
      this.player = createPlayer(playerClass, 0);
      applySkillStats(this.player);
      this.map = createTutorialMap();
      this.player.x = this.map.spawn.x;
      this.player.y = this.map.spawn.y;
      this.enemies = [];
      this.projectiles = [];
      this.particles = [];
      this.soulOrbs = [];
      this.camera = { x: 0, y: 0 };
      this.keys = {};
      this.mouse = { x: 0, y: 0, down: false };
      this.phase = 'tutorial'; // tutorial, explore, boss, transition
      this.tutorialStep = 0;
      this.tutorialDone = false;
      this.bossSpawned = false;
      this.bossDefeated = false;
      this.gateOpen = false;
      this.gateAnim = 0;
      this.dialogueQueue = [];
      this.dialogueActive = false;
      this.paused = false;
      this.skillOpen = false;
      this.layerBannerTimer = 0;
      this.endingTriggered = false;
      this.lastTime = 0;
      this.enemiesKilled = 0;
      this.spawnTimer = 0;
      this.wispPulse = 0;

      this.setupInput();
      this.resize();
      window.addEventListener('resize', () => this.resize());

      this.showLayerBanner(LAYER_NAMES.tutorial);
      this.queueTutorialDialogue();
    }

    resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    setupInput() {
      window.addEventListener('keydown', (e) => {
        if (this.dialogueActive && e.code !== keybinds.attack && e.code !== 'Enter') return;
        this.keys[e.code] = true;
        if (e.code === keybinds.skillTree && !this.dialogueActive) this.toggleSkillTree();
        if (e.code === keybinds.pause && !this.dialogueActive) this.togglePause();
      });
      window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });
      canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        this.mouse.x = e.clientX - rect.left + this.camera.x;
        this.mouse.y = e.clientY - rect.top + this.camera.y;
      });
      canvas.addEventListener('mousedown', () => { this.mouse.down = true; });
      canvas.addEventListener('mouseup', () => { this.mouse.down = false; });
    }

    isKey(action) {
      return !!this.keys[keybinds[action]];
    }

    queueTutorialDialogue() {
      this.dialogueQueue = [
        'Welcome, fallen warrior. I am a wisp of lost hope — your guide through this abyss.',
        'Use W/A/S/D to move through the shattered path ahead.',
        'Press J or click to attack. Your tutorial weapon burns with hellfire.',
        'Hold K to block incoming damage. Press Space to dash — it costs stamina.',
        'Press E to use your class ability. Defeat the Hollow Sentinel to open the Gate of Despair.'
      ];
      this.showNextDialogue();
    }

    showNextDialogue() {
      if (this.dialogueQueue.length === 0) {
        this.dialogueActive = false;
        document.getElementById('dialogue-box').classList.add('hidden');
        this.tutorialStep = 5;
        if (!this.bossSpawned) {
          this.enemies.push(spawnEnemy('tutorial_boss', 32 * TILE, 15 * TILE));
          this.bossSpawned = true;
        }
        return;
      }
      this.dialogueActive = true;
      document.getElementById('dialogue-box').classList.remove('hidden');
      document.getElementById('dialogue-text').textContent = this.dialogueQueue.shift();
    }

    showLayerBanner(text) {
      const el = document.getElementById('layer-banner');
      el.textContent = text;
      el.classList.remove('hidden');
      this.layerBannerTimer = 3;
    }

    togglePause() {
      if (this.skillOpen) return;
      this.paused = !this.paused;
      document.getElementById('pause-menu').classList.toggle('hidden', !this.paused);
    }

    toggleSkillTree() {
      this.skillOpen = !this.skillOpen;
      document.getElementById('skill-tree').classList.toggle('hidden', !this.skillOpen);
      if (this.skillOpen) this.renderSkillTree();
    }

    renderSkillTree() {
      const p = this.player;
      document.getElementById('skill-points').textContent = p.skillPoints + ' pts';
      const container = document.getElementById('skill-rows');
      container.innerHTML = '';
      SKILLS.forEach(skill => {
        if (skill.mageOnly && p.cls !== 'mage') return;
        if (skill.nonMage && p.cls === 'mage' && skill.id === 'damage') return;
        const lvl = p.skills[skill.id];
        const row = document.createElement('div');
        row.className = 'skill-row' + (lvl >= MAX_SKILL ? ' disabled' : '');
        row.innerHTML = `
          <div class="skill-row-info"><strong>${skill.name}</strong><span>${skill.desc} — ${skill.base + lvl * skill.add} total</span></div>
          <div class="skill-row-btns">
            <span class="skill-level">${lvl}/${MAX_SKILL}</span>
            <button class="skill-btn" data-skill="${skill.id}">+</button>
          </div>`;
        const btn = row.querySelector('.skill-btn');
        btn.disabled = p.skillPoints <= 0 || lvl >= MAX_SKILL;
        btn.addEventListener('click', () => this.upgradeSkill(skill.id));
        container.appendChild(row);
      });
    }

    upgradeSkill(id) {
      const p = this.player;
      if (p.skillPoints <= 0 || p.skills[id] >= MAX_SKILL) return;
      p.skills[id]++;
      p.skillPoints--;
      applySkillStats(p);
      this.renderSkillTree();
      sfxLevel();
    }

    addSouls(n) {
      const p = this.player;
      p.souls += n;
      p.soulsTowardLevel = (p.soulsTowardLevel || 0) + n;
      while (p.soulsTowardLevel >= SOULS_PER_LEVEL) {
        p.soulsTowardLevel -= SOULS_PER_LEVEL;
        p.level++;
        p.skillPoints++;
        sfxLevel();
      }
    }

    loadMap(map) {
      this.map = map;
      this.player.x = map.spawn.x;
      this.player.y = map.spawn.y;
      this.enemies = [];
      this.projectiles = [];
      this.bossSpawned = false;
      this.bossDefeated = false;
      this.gateOpen = false;
      this.gateAnim = 0;
      this.spawnTimer = 0;
      this.enemiesKilled = 0;
    }

    transitionToLayer(layer) {
      this.phase = 'explore';
      switch (layer) {
        case 'layer1':
          this.loadMap(createLayer1Map());
          this.player.weaponTier = 0;
          this.showLayerBanner(LAYER_NAMES.layer1);
          this.spawnMobs('husk', 12);
          break;
        case 'layer2':
          this.loadMap(createLayer2Map());
          this.player.weaponTier = 1;
          this.showLayerBanner(LAYER_NAMES.layer2);
          this.spawnMobs('hellhound', 10);
          break;
        case 'layer3':
          this.loadMap(createLayer3Map());
          this.player.weaponTier = 2;
          this.showLayerBanner(LAYER_NAMES.layer3);
          this.spawnMobs('cyclops', 4);
          this.spawnMobs('gargoyle', 6);
          break;
        case 'throne':
          this.loadMap(createThroneMap());
          this.showLayerBanner(LAYER_NAMES.throne);
          this.enemies.push(spawnEnemy('devil', this.map.throne.x, this.map.throne.y - 30));
          this.bossSpawned = true;
          break;
      }
      this.updateHUD();
    }

    spawnMobs(type, count) {
      for (let i = 0; i < count; i++) {
        let x, y, tries = 0;
        do {
          x = (3 + Math.floor(Math.random() * (this.map.w - 6))) * TILE + TILE / 2;
          y = (3 + Math.floor(Math.random() * (this.map.h - 6))) * TILE + TILE / 2;
          tries++;
        } while (tries < 30 && (tileAt(this.map, x, y) === 0 || Math.hypot(x - this.player.x, y - this.player.y) < 120));
        this.enemies.push(spawnEnemy(type, x, y));
      }
    }

    update(dt) {
      if (this.paused || this.skillOpen || this.endingTriggered) return;
      if (this.dialogueActive) return;

      this.wispPulse += dt;
      if (this.layerBannerTimer > 0) {
        this.layerBannerTimer -= dt;
        if (this.layerBannerTimer <= 0) document.getElementById('layer-banner').classList.add('hidden');
      }

      this.updateHazards(dt);
      this.updatePlayer(dt);
      this.updateEnemies(dt);
      this.updateProjectiles(dt);
      this.updateSoulOrbs(dt);
      this.updateParticles(dt);
      this.checkGate();
      this.checkSpawns(dt);
      this.updateCamera();
      this.updateHUD();
      this.updateBossBar();
    }

    updateHazards(dt) {
      (this.map.hazards || []).forEach(h => {
        if (h.type === 'geyser') {
          h.timer -= dt;
          if (h.timer <= 0 && !h.active) {
            h.active = true;
            h.timer = 0.8;
            sfxBeamCharge();
          } else if (h.active && h.timer <= 0) {
            h.active = false;
            h.timer = h.cd;
            if (Math.hypot(this.player.x - h.x, this.player.y - h.y) < h.r + 20) {
              this.damagePlayer(25, h.x, h.y);
            }
          }
        }
        if (h.type === 'debris') {
          h.timer -= dt;
          if (h.timer <= 0) {
            h.warning = true;
            if (h.timer <= -0.5) {
              h.warning = false;
              h.timer = 4 + Math.random() * 4;
              if (Math.hypot(this.player.x - h.x, this.player.y - h.y) < h.r + 30) {
                this.damagePlayer(18, h.x, h.y);
                this.spawnParticles(h.x, h.y, '#888', 8);
              }
            }
          }
        }
      });
    }

    updatePlayer(dt) {
      const p = this.player;
      if (p.dead) return;

      if (p.stunned > 0) { p.stunned -= dt; return; }
      if (p.invuln > 0) p.invuln -= dt;
      p.animTime += dt;

      let speedMult = 1;
      if (p.slowed > 0) { p.slowed -= dt; speedMult = 0.5; }

      // Ash slow
      (this.map.hazards || []).forEach(h => {
        if (h.type === 'ash' && Math.hypot(p.x - h.x, p.y - h.y) < h.r) speedMult *= 0.55;
      });

      p.blocking = this.isKey('block') && !p.dashing;
      p.angle = Math.atan2(this.mouse.y - p.y, this.mouse.x - p.x);

      if (p.dashTimer > 0) {
        p.dashTimer -= dt;
        if (p.dashTimer <= 0) p.dashing = false;
      }
      if (p.dashCd > 0) p.dashCd -= dt;
      if (p.attackCd > 0) p.attackCd -= dt;
      if (p.attackTimer > 0) {
        p.attackTimer -= dt;
        if (p.attackTimer <= 0) p.attacking = false;
      }

      // Stamina regen — faster when attacking recently
      const regenRate = p.attacking ? p.staminaRegen * 2 : p.staminaRegen;
      if (!p.dashing && p.stamina < p.maxStamina) p.stamina = Math.min(p.maxStamina, p.stamina + regenRate * dt);

      let mx = 0, my = 0;
      if (this.isKey('up')) my -= 1;
      if (this.isKey('down')) my += 1;
      if (this.isKey('left')) mx -= 1;
      if (this.isKey('right')) mx += 1;
      if (mx || my) {
        const len = Math.hypot(mx, my);
        mx /= len; my /= len;
      }

      if (this.isKey('dash') && p.dashCd <= 0 && p.stamina >= 15 && (mx || my) && !p.dashing) {
        p.dashing = true;
        p.dashTimer = 0.2;
        p.dashCd = 0.5;
        p.stamina -= 15;
        p.invuln = 0.15;
      }

      let spd = getSpeed(p) * speedMult;
      if (p.dashing) spd *= 3;

      p.vx = mx * spd;
      p.vy = my * spd;
      this.moveEntity(p, dt);

      const attacking = this.isKey('attack') || this.mouse.down;
      if (attacking && p.attackCd <= 0 && !p.blocking) this.playerAttack();

      if (this.isKey('ability') && p.abilityCd <= 0) this.playerAbility();
      if (p.abilityCd > 0) p.abilityCd -= dt;
      if (!p.abilityCd) p.abilityCd = 0;
    }

    moveEntity(e, dt) {
      const nx = e.x + e.vx * dt;
      const ny = e.y + e.vy * dt;
      if (tileAt(this.map, nx, e.y) !== 0) e.x = nx;
      if (tileAt(this.map, e.x, ny) !== 0) e.y = ny;
    }

    playerAttack() {
      const p = this.player;
      p.attacking = true;
      p.attackTimer = 0.15;
      const cd = p.cls === 'assassin' ? 0.25 : p.cls === 'mage' ? 0.55 : 0.45;
      p.attackCd = cd;
      sfxAttack();

      const range = p.cls === 'mage' ? 180 : p.cls === 'warrior' ? 55 : 45;
      const dmg = getDamage(p);
      const arc = p.cls === 'warrior' ? 1.2 : 0.9;

      if (p.cls === 'mage') {
        this.projectiles.push({
          x: p.x, y: p.y, vx: Math.cos(p.angle) * 320, vy: Math.sin(p.angle) * 320,
          damage: dmg, radius: 8, life: 1.2, friendly: true, color: '#ff6600', fire: true, hitIds: new Set()
        });
      } else {
        this.enemies.forEach(en => {
          if (en.dead) return;
          const dist = Math.hypot(en.x - p.x, en.y - p.y);
          const a = Math.atan2(en.y - p.y, en.x - p.x);
          let da = a - p.angle;
          while (da > Math.PI) da -= Math.PI * 2;
          while (da < -Math.PI) da += Math.PI * 2;
          if (dist < range + en.radius && Math.abs(da) < arc) {
            this.damageEnemy(en, dmg, true);
          }
        });
      }
    }

    playerAbility() {
      const p = this.player;
      p.abilityCd = 3;
      if (p.cls === 'assassin') {
        p.dashing = true;
        p.dashTimer = 0.35;
        p.invuln = 0.3;
        p.stamina = Math.min(p.maxStamina, p.stamina + 10);
      } else if (p.cls === 'warrior') {
        this.enemies.forEach(en => {
          if (en.dead) return;
          if (Math.hypot(en.x - p.x, en.y - p.y) < 80) {
            this.damageEnemy(en, getDamage(p) * 1.5, true);
            en.vx = Math.cos(Math.atan2(en.y - p.y, en.x - p.x)) * 200;
            en.vy = Math.sin(Math.atan2(en.y - p.y, en.x - p.x)) * 200;
          }
        });
        this.spawnParticles(p.x, p.y, '#ff4400', 12);
      } else {
        for (let i = 0; i < 5; i++) {
          const a = p.angle + (i - 2) * 0.25;
          this.projectiles.push({
            x: p.x, y: p.y, vx: Math.cos(a) * 260, vy: Math.sin(a) * 260,
            damage: Math.round(getDamage(p) * 0.45), radius: 6, life: 0.9,
            friendly: true, color: '#ffaa00', fire: true, hitIds: new Set()
          });
        }
      }
    }

    damagePlayer(amount, fromX, fromY) {
      const p = this.player;
      if (p.invuln > 0 || p.dead) return;
      if (p.blocking) amount *= 0.3;
      p.health -= amount;
      p.invuln = 0.4;
      sfxHit();
      this.spawnParticles(p.x, p.y, '#ff0000', 6);
      if (p.health <= 0) {
        p.health = 0;
        p.dead = true;
        setTimeout(() => this.respawn(), 1500);
      }
    }

    respawn() {
      const p = this.player;
      p.dead = false;
      p.health = p.maxHealth;
      p.stamina = p.maxStamina;
      p.x = this.map.spawn.x;
      p.y = this.map.spawn.y;
      p.invuln = 2;
    }

    damageEnemy(en, dmg, isFire = false) {
      if (en.dead) return;
      en.health -= dmg;
      sfxHit();
      this.spawnParticles(en.x, en.y, isFire ? '#ff6600' : '#fff', 4);
      if (isFire) en.burning = 2;
      if (en.health <= 0) this.killEnemy(en);
      else if (en.boss && en.health <= en.maxHealth * 0.5 && !en.phase2) {
        en.phase2 = true;
        en.aura = true;
        if (en.type === 'gatekeeper') { en.rushDamage = 35; en.fistDamage = 25; }
      }
    }

    killEnemy(en) {
      en.dead = true;
      this.enemiesKilled++;
      if (en.soulValue) {
        this.soulOrbs.push({ x: en.x, y: en.y, value: en.soulValue, life: 8 });
      }
      this.spawnParticles(en.x, en.y, en.color || '#888', 10);

      if (en.boss) {
        this.onBossDefeated(en);
      }
    }

    onBossDefeated(en) {
      this.bossDefeated = true;
      if (en.type === 'tutorial_boss') {
        this.player.weaponTier = 0;
        this.tutorialDone = true;
        this.gateOpen = true;
        this.gateAnim = 0;
        this.showLayerBanner('Gate of Despair Opens');
      } else if (en.type === 'gatekeeper') {
        this.player.weaponTier = 1;
        this.gateOpen = true;
        this.showLayerBanner('Seal Shattered — Descend Deeper');
      } else if (en.type === 'cerberus') {
        this.player.weaponTier = 2;
        this.gateOpen = true;
        this.showLayerBanner('Hellfire Weapon Forged');
      } else if (en.type === 'devil') {
        this.triggerEnding();
      }
    }

    triggerEnding() {
      this.endingTriggered = true;
      setTimeout(() => {
        showScreen('ending');
        cancelAnimationFrame(this.raf);
      }, 2000);
    }

    checkGate() {
      if (!this.gateOpen || !this.map.gate) return;
      const g = this.map.gate;
      this.gateAnim = Math.min(1, this.gateAnim + 0.016);
      if (Math.hypot(this.player.x - g.x, this.player.y - g.y) < 40 && this.gateAnim > 0.5) {
        if (this.map.layer === 'tutorial') this.transitionToLayer('layer1');
        else if (this.map.layer === 'layer1') this.transitionToLayer('layer2');
        else if (this.map.layer === 'layer2') this.transitionToLayer('layer3');
        this.gateOpen = false;
      }
      if (this.map.throneDoor && !this.map.throneDoor.open && this.enemiesKilled >= 5) {
        this.map.throneDoor.open = true;
      }
      if (this.map.throneDoor?.open && Math.hypot(this.player.x - this.map.throneDoor.x, this.player.y - this.map.throneDoor.y) < 40) {
        this.transitionToLayer('throne');
        this.map.throneDoor = null;
      }
    }

    checkSpawns(dt) {
      if (this.map.layer === 'layer1' && !this.bossSpawned && this.enemiesKilled >= 8) {
        const ba = this.map.bossArena;
        this.enemies.push(spawnEnemy('gatekeeper', ((ba.x1 + ba.x2) / 2) * TILE, ((ba.y1 + ba.y2) / 2) * TILE));
        this.bossSpawned = true;
        this.phase = 'boss';
      }
      if (this.map.layer === 'layer2' && !this.bossSpawned && this.enemiesKilled >= 8) {
        const ba = this.map.bossArena;
        this.enemies.push(spawnEnemy('cerberus', ((ba.x1 + ba.x2) / 2) * TILE, ((ba.y1 + ba.y2) / 2) * TILE));
        this.bossSpawned = true;
      }
      // Respawn mobs
      this.spawnTimer += dt;
      if (this.spawnTimer > 8 && this.enemies.filter(e => !e.dead && !e.boss).length < 6) {
        this.spawnTimer = 0;
        const types = { layer1: 'husk', layer2: 'hellhound', layer3: 'cyclops' };
        if (types[this.map.layer]) this.spawnMobs(types[this.map.layer], 2);
        if (this.map.layer === 'layer3') this.spawnMobs('gargoyle', 1);
      }
    }

    updateEnemies(dt) {
      const p = this.player;
      this.enemies.forEach(en => {
        if (en.dead) return;
        if (en.burning > 0) {
          en.burning -= dt;
          if (Math.random() < dt * 2) this.damageEnemy(en, 2, true);
        }
        if (en.attackCd > 0) en.attackCd -= dt;
        if (en.stateTimer > 0) en.stateTimer -= dt;

        const dist = Math.hypot(p.x - en.x, p.y - en.y);
        en.angle = Math.atan2(p.y - en.y, p.x - en.x);

        switch (en.type) {
          case 'husk':
          case 'hellhound':
            this.aiChase(en, dt, dist);
            if (dist < en.radius + p.radius + 5 && en.attackCd <= 0) {
              this.damagePlayer(en.damage, en.x, en.y);
              en.attackCd = en.type === 'hellhound' ? 0.6 : 0.9;
            }
            break;
          case 'cyclops':
            this.aiChase(en, dt, dist, 0.6);
            if (dist > 100 && en.attackCd <= 0) {
              this.projectiles.push({
                x: en.x, y: en.y, vx: Math.cos(en.angle) * 200, vy: Math.sin(en.angle) * 200,
                damage: 20, radius: 6, life: 2, friendly: false, color: '#ff0'
              });
              en.attackCd = 2;
            } else if (dist < en.radius + p.radius + 10 && en.attackCd <= 0) {
              this.damagePlayer(15, en.x, en.y);
              en.attackCd = 1.2;
            }
            break;
          case 'gargoyle':
            if (en.state !== 'dive') {
              en.vx = Math.cos(en.angle) * en.speed * 0.5;
              en.vy = Math.sin(en.angle) * en.speed * 0.5;
              this.moveEntity(en, dt);
              if (dist < 120 && en.attackCd <= 0) {
                en.state = 'dive';
                en.stateTimer = 0.6;
                en.diveVx = Math.cos(en.angle) * 250;
                en.diveVy = Math.sin(en.angle) * 250;
              }
            } else {
              en.x += en.diveVx * dt;
              en.y += en.diveVy * dt;
              en.stateTimer -= dt;
              if (Math.hypot(p.x - en.x, p.y - en.y) < en.radius + p.radius) {
                this.damagePlayer(15, en.x, en.y);
                en.state = 'idle';
                en.attackCd = 1.5;
              }
              if (en.stateTimer <= 0) { en.state = 'idle'; en.attackCd = 1; }
            }
            break;
          case 'tutorial_boss':
            this.aiChase(en, dt, dist);
            if (dist < en.radius + p.radius + 8 && en.attackCd <= 0) {
              this.damagePlayer(en.damage, en.x, en.y);
              en.attackCd = 1;
            }
            break;
          case 'gatekeeper':
            this.aiGatekeeper(en, dt, dist, p);
            break;
          case 'cerberus':
            this.aiCerberus(en, dt, dist, p);
            break;
          case 'devil':
            this.aiDevil(en, dt, dist, p);
            break;
        }
      });
    }

    aiChase(en, dt, dist, mult = 1) {
      if (dist > 20) {
        en.vx = Math.cos(en.angle) * en.speed * mult;
        en.vy = Math.sin(en.angle) * en.speed * mult;
        this.moveEntity(en, dt);
      }
    }

    aiGatekeeper(en, dt, dist, p) {
      if (en.state === 'rush') {
        en.x += en.rushVx * dt;
        en.y += en.rushVy * dt;
        en.stateTimer -= dt;
        if (Math.hypot(p.x - en.x, p.y - en.y) < en.radius + p.radius) {
          this.damagePlayer(en.rushDamage || 20, en.x, en.y);
          en.state = 'idle';
          en.attackCd = 1;
        }
        if (en.stateTimer <= 0 || tileAt(this.map, en.x, en.y) === 0) {
          en.state = 'idle';
          en.attackCd = 0.5;
        }
        return;
      }
      if (en.attackCd <= 0 && dist > 60) {
        en.state = 'rush';
        en.rushVx = Math.cos(en.angle) * 180;
        en.rushVy = Math.sin(en.angle) * 180;
        en.stateTimer = 2;
        en.attackCd = 2.5;
        return;
      }
      if (dist < en.radius + p.radius + 15 && en.attackCd <= 0) {
        this.damagePlayer(en.fistDamage || 15, en.x, en.y);
        en.attackCd = 1.2;
      }
      this.aiChase(en, dt, dist, 0.4);
    }

    aiCerberus(en, dt, dist, p) {
      if (en.state === 'beam') {
        en.stateTimer -= dt;
        if (en.stateTimer <= 0) {
          this.projectiles.push({
            x: en.x, y: en.y, vx: Math.cos(en.angle) * 400, vy: Math.sin(en.angle) * 400,
            damage: en.phase2 ? 35 : 25, radius: 10, life: 2, friendly: false, color: '#ff2200', beam: true
          });
          en.state = 'idle';
          en.attackCd = 2;
        }
        return;
      }
      if (en.state === 'roar') {
        en.stateTimer -= dt;
        if (en.stateTimer <= 0) en.state = 'idle';
        return;
      }
      if (en.attackCd <= 0 && dist < 200) {
        if (Math.random() < 0.4 || !en.phase2) {
          en.state = 'roar';
          en.stateTimer = 0.5;
          sfxBossRoar();
          setTimeout(() => { if (!p.dead) { p.stunned = 2; this.damagePlayer(20, en.x, en.y); } }, 500);
          en.attackCd = 3;
        } else {
          en.state = 'beam';
          en.stateTimer = 1;
          sfxBeamCharge();
          en.attackCd = 4;
        }
        return;
      }
      if (dist < en.radius + p.radius + 10 && en.attackCd <= 0) {
        this.damagePlayer(25, en.x, en.y);
        en.attackCd = 1.5;
      }
      this.aiChase(en, dt, dist, 0.5);
    }

    aiDevil(en, dt, dist, p) {
      if (en.phase2 && en.summons < 4 && en.attackCd <= 0 && Math.random() < 0.02) {
        const types = ['husk', 'hellhound', 'cyclops', 'gargoyle'];
        const t = types[Math.floor(Math.random() * types.length)];
        const sx = en.x + (Math.random() - 0.5) * 100;
        const sy = en.y + (Math.random() - 0.5) * 100;
        const minion = spawnEnemy(t, sx, sy);
        minion.health *= 1.1; minion.maxHealth *= 1.1; minion.damage *= 1.1;
        this.enemies.push(minion);
        en.summons++;
      }
      if (en.attackCd <= 0) {
        if (dist < 80) {
          this.damagePlayer(20, en.x, en.y);
          en.attackCd = 1;
        } else {
          this.projectiles.push({
            x: en.x, y: en.y, vx: Math.cos(en.angle) * 220, vy: Math.sin(en.angle) * 220,
            damage: 25, radius: 12, life: 3, friendly: false, color: '#ff4400', fire: true
          });
          en.attackCd = 1.5;
        }
      }
      this.aiChase(en, dt, dist, 0.35);
    }

    updateProjectiles(dt) {
      this.projectiles = this.projectiles.filter(pr => {
        pr.x += pr.vx * dt;
        pr.y += pr.vy * dt;
        pr.life -= dt;
        if (pr.life <= 0) return false;
        if (tileAt(this.map, pr.x, pr.y) === 0) return false;

        if (pr.friendly) {
          if (!pr.hitIds) pr.hitIds = new Set();
          for (const en of this.enemies) {
            if (en.dead || pr.hitIds.has(en)) continue;
            if (Math.hypot(en.x - pr.x, en.y - pr.y) < en.radius + pr.radius) {
              this.damageEnemy(en, pr.damage, pr.fire);
              pr.hitIds.add(en);
              if (!pr.pierce) return false;
            }
          }
          return true;
        }

        if (Math.hypot(this.player.x - pr.x, this.player.y - pr.y) < this.player.radius + pr.radius) {
          this.damagePlayer(pr.damage, pr.x, pr.y);
          return false;
        }
        return true;
      });
    }

    updateSoulOrbs(dt) {
      this.soulOrbs = this.soulOrbs.filter(s => {
        s.life -= dt;
        if (s.life <= 0) return false;
        const dist = Math.hypot(this.player.x - s.x, this.player.y - s.y);
        if (dist < 30) {
          this.addSouls(s.value);
          sfxSoul();
          return false;
        }
        if (dist < 120) { s.x += (this.player.x - s.x) * 3 * dt; s.y += (this.player.y - s.y) * 3 * dt; }
        return true;
      });
    }

    spawnParticles(x, y, color, n) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        this.particles.push({
          x, y, vx: Math.cos(a) * (50 + Math.random() * 100), vy: Math.sin(a) * (50 + Math.random() * 100),
          life: 0.3 + Math.random() * 0.4, color, size: 2 + Math.random() * 3
        });
      }
    }

    updateParticles(dt) {
      this.particles = this.particles.filter(p => {
        p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
        return p.life > 0;
      });
    }

    updateCamera() {
      this.camera.x = this.player.x - canvas.width / 2;
      this.camera.y = this.player.y - canvas.height / 2;
    }

    updateHUD() {
      const p = this.player;
      document.getElementById('health-fill').style.width = (p.health / p.maxHealth * 100) + '%';
      document.getElementById('health-text').textContent = Math.ceil(p.health) + ' / ' + p.maxHealth;
      document.getElementById('stamina-fill').style.width = (p.stamina / p.maxStamina * 100) + '%';
      document.getElementById('level-display').textContent = 'Lv ' + p.level;
      document.getElementById('souls-display').textContent = 'Souls: ' + p.souls;
      document.getElementById('weapon-display').textContent = getWeaponName(p);
    }

    updateBossBar() {
      const boss = this.enemies.find(e => e.boss && !e.dead);
      const bar = document.getElementById('boss-health');
      if (boss) {
        bar.classList.remove('hidden');
        document.getElementById('boss-name').textContent = boss.name || 'Boss';
        document.getElementById('boss-fill').style.width = (boss.health / boss.maxHealth * 100) + '%';
      } else {
        bar.classList.add('hidden');
      }
    }

    draw() {
      const theme = this.map.theme;
      ctx.fillStyle = theme === 'tutorial' ? '#0a0a0a' : theme === 'ash' ? '#1a1818' : theme === 'obsidian' ? '#080808' : theme === 'citadel' ? '#0d0808' : '#120808';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.translate(-this.camera.x, -this.camera.y);

      this.drawMap();
      this.drawHazards();
      this.drawGate();
      this.drawSoulOrbs();
      this.drawEnemies();
      this.drawProjectiles();
      this.drawPlayer();
      this.drawParticles();
      if (this.phase === 'tutorial' && this.tutorialStep < 5) this.drawWisp();

      ctx.restore();

      if (this.player.dead) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ff3333';
        ctx.font = 'bold 36px Cinzel, serif';
        ctx.textAlign = 'center';
        ctx.fillText('YOUR SOUL FALTERS...', canvas.width / 2, canvas.height / 2);
      }
    }

    drawMap() {
      const map = this.map;
      const theme = map.theme;
      const startX = Math.max(0, Math.floor(this.camera.x / TILE) - 1);
      const startY = Math.max(0, Math.floor(this.camera.y / TILE) - 1);
      const endX = Math.min(map.w, Math.ceil((this.camera.x + canvas.width) / TILE) + 1);
      const endY = Math.min(map.h, Math.ceil((this.camera.y + canvas.height) / TILE) + 1);

      for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
          const t = getTile(map, x, y);
          if (t === 0) {
            if (theme === 'tutorial') {
              ctx.fillStyle = '#ffffff08';
            } else {
              ctx.fillStyle = theme === 'obsidian' ? '#111' : '#0a0a0a';
            }
          } else {
            switch (theme) {
              case 'tutorial': ctx.fillStyle = '#1a1a1a'; break;
              case 'ash': ctx.fillStyle = (x + y) % 2 ? '#2a2828' : '#333030'; break;
              case 'obsidian': ctx.fillStyle = (x + y) % 2 ? '#151515' : '#1a1010'; break;
              case 'citadel': ctx.fillStyle = (x + y) % 2 ? '#1a1015' : '#221018'; break;
              case 'throne':
                if (y === map.carpetY) ctx.fillStyle = '#660011';
                else ctx.fillStyle = '#1a0a0a';
                break;
              default: ctx.fillStyle = '#222';
            }
          }
          ctx.fillRect(x * TILE, y * TILE, TILE, TILE);

          // Embers / details
          if (t === 1 && theme === 'ash' && Math.random() < 0.002) {
            ctx.fillStyle = '#ff660066';
            ctx.fillRect(x * TILE + 10, y * TILE + 10, 3, 3);
          }
          if (t === 1 && theme === 'obsidian' && (x + y) % 7 === 0) {
            ctx.fillStyle = '#ff440033';
            ctx.fillRect(x * TILE + 14, y * TILE + 28, 4, 4);
          }
          if (t === 1 && theme === 'citadel' && x % 5 === 0) {
            ctx.fillStyle = '#cc000044';
            ctx.fillRect(x * TILE + 12, y * TILE + 2, 8, 4);
          }
        }
      }

      // Tutorial void fog
      if (theme === 'tutorial') {
        ctx.fillStyle = 'rgba(255,255,255,0.03)';
        for (let i = 0; i < 5; i++) {
          ctx.fillRect(this.camera.x + i * 200, this.camera.y, canvas.width, canvas.height);
        }
      }
    }

    drawHazards() {
      (this.map.hazards || []).forEach(h => {
        if (h.type === 'ash') {
          ctx.fillStyle = '#ff660033';
          ctx.beginPath();
          ctx.arc(h.x, h.y, h.r, 0, Math.PI * 2);
          ctx.fill();
        }
        if (h.type === 'geyser') {
          if (h.active) {
            ctx.fillStyle = '#ff440088';
            ctx.beginPath();
            ctx.arc(h.x, h.y, h.r + 10, 0, Math.PI * 2);
            ctx.fill();
          } else if (h.timer < 1) {
            ctx.strokeStyle = '#ff660066';
            ctx.beginPath();
            ctx.arc(h.x, h.y, h.r, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
        if (h.type === 'debris' && h.warning) {
          ctx.fillStyle = '#ff000044';
          ctx.fillRect(h.x - 15, h.y - 40, 30, 40);
        }
      });
    }

    drawGate() {
      if (!this.map.gate) return;
      const g = this.map.gate;
      const open = this.gateOpen ? this.gateAnim : 0;
      ctx.fillStyle = '#111';
      ctx.fillRect(g.x - 20, g.y - 50, 40, 100);
      if (open > 0) {
        const glow = open;
        ctx.fillStyle = `rgba(255, 100, 0, ${glow * 0.8})`;
        ctx.fillRect(g.x - 15 + open * 20, g.y - 45, 30 - open * 10, 90);
        ctx.shadowColor = '#ff6600';
        ctx.shadowBlur = 30 * glow;
        ctx.fillStyle = '#ff4400';
        ctx.font = '10px Rajdhani';
        ctx.textAlign = 'center';
        ctx.fillText('DESCEND', g.x, g.y + 60);
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = '#333';
        ctx.fillRect(g.x - 18, g.y - 48, 36, 96);
      }
    }

    drawPlayer() {
      const p = this.player;
      if (p.dead) return;

      if (p.invuln > 0 && Math.floor(p.invuln * 10) % 2) return;

      const moving = Math.hypot(p.vx, p.vy) > 8 || p.dashing;
      let anim = 'Idle';
      let frameCount = 8;
      let fps = 8;

      if (p.attacking) {
        anim = p.cls === 'mage' ? 'Fire' : 'Attack';
        frameCount = p.cls === 'mage' ? 9 : p.cls === 'assassin' ? 7 : 5;
        fps = 14;
      } else if (moving) {
        anim = 'Run';
        frameCount = 8;
        fps = 12;
      }

      const frame = Math.floor(p.animTime * fps) % frameCount + 1;
      const img = spritesReady ? getSpriteFrame(p.cls, anim, frame) : null;
      const faceLeft = Math.cos(p.angle) < -0.01;

      ctx.save();
      ctx.translate(p.x, p.y);
      if (faceLeft) ctx.scale(-1, 1);

      if (img) {
        const scale = p.cls === 'warrior' ? 0.52 : 0.48;
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, -w / 2, -h * 0.82, w, h);
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      if (p.blocking) {
        ctx.strokeStyle = '#ffffff88';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, p.radius + 8, -1.2, 1.2);
        ctx.stroke();
      }

      ctx.restore();
    }

    drawEnemies() {
      this.enemies.forEach(en => {
        if (en.dead) return;
        ctx.save();
        ctx.translate(en.x, en.y);

        if (en.aura) {
          ctx.shadowColor = '#ff0000';
          ctx.shadowBlur = 20;
          ctx.strokeStyle = '#ff000066';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, en.radius + 8, 0, Math.PI * 2);
          ctx.stroke();
          ctx.shadowBlur = 0;
        }

        ctx.fillStyle = en.color || '#888';
        if (en.type === 'cerberus') {
          [-12, 0, 12].forEach(ox => {
            ctx.beginPath();
            ctx.arc(ox, -5, en.radius * 0.5, 0, Math.PI * 2);
            ctx.fill();
          });
          ctx.fillRect(-en.radius, 0, en.radius * 2, en.radius);
        } else if (en.type === 'devil') {
          ctx.beginPath();
          ctx.moveTo(-8, -en.radius - 10);
          ctx.lineTo(-4, -en.radius);
          ctx.lineTo(0, -en.radius - 12);
          ctx.lineTo(4, -en.radius);
          ctx.lineTo(8, -en.radius - 10);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(0, 0, en.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffd700';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(en.radius, 0);
          ctx.lineTo(en.radius + 20, -10);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, en.radius, 0, Math.PI * 2);
          ctx.fill();
        }

        // Health bar
        if (en.health < en.maxHealth) {
          ctx.fillStyle = '#000';
          ctx.fillRect(-en.radius, -en.radius - 10, en.radius * 2, 4);
          ctx.fillStyle = en.boss ? '#ff3300' : '#ff6600';
          ctx.fillRect(-en.radius, -en.radius - 10, en.radius * 2 * (en.health / en.maxHealth), 4);
        }

        ctx.restore();
      });
    }

    drawProjectiles() {
      this.projectiles.forEach(pr => {
        ctx.fillStyle = pr.color;
        ctx.shadowColor = pr.color;
        ctx.shadowBlur = pr.beam ? 15 : 8;
        ctx.beginPath();
        ctx.arc(pr.x, pr.y, pr.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });
    }

    drawSoulOrbs() {
      this.soulOrbs.forEach(s => {
        ctx.fillStyle = '#88ccff';
        ctx.shadowColor = '#88ccff';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });
    }

    drawParticles() {
      this.particles.forEach(p => {
        ctx.globalAlpha = p.life * 2;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
        ctx.globalAlpha = 1;
      });
    }

    drawWisp() {
      const wx = this.player.x - 40 + Math.sin(this.wispPulse * 2) * 5;
      const wy = this.player.y - 30 + Math.cos(this.wispPulse * 3) * 5;
      ctx.fillStyle = '#3366ff';
      ctx.shadowColor = '#88bbff';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(wx, wy, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    loop(time) {
      const dt = Math.min(0.05, (time - this.lastTime) / 1000 || 0.016);
      this.lastTime = time;
      this.update(dt);
      this.draw();
      this.raf = requestAnimationFrame((t) => this.loop(t));
    }

    start() {
      this.lastTime = performance.now();
      this.raf = requestAnimationFrame((t) => this.loop(t));
    }

    stop() {
      cancelAnimationFrame(this.raf);
    }
  }

  // ─── UI Wiring ─────────────────────────────────────────────────
  document.getElementById('btn-play').addEventListener('click', () => showScreen('classSelect'));
  document.getElementById('btn-back-landing').addEventListener('click', () => showScreen('landing'));
  document.getElementById('btn-settings').addEventListener('click', () => openModal('modal-settings'));
  document.getElementById('btn-keybinds').addEventListener('click', () => { renderKeybinds(); openModal('modal-keybinds'); });
  document.getElementById('btn-about').addEventListener('click', () => openModal('modal-about'));

  document.getElementById('btn-settings-close').addEventListener('click', () => document.getElementById('modal-settings').close());
  document.getElementById('btn-keybinds-close').addEventListener('click', () => document.getElementById('modal-keybinds').close());
  document.getElementById('btn-about-close').addEventListener('click', () => document.getElementById('modal-about').close());
  document.getElementById('btn-keybinds-reset').addEventListener('click', () => {
    keybinds = { ...DEFAULT_KEYBINDS };
    settings.keybinds = { ...keybinds };
    saveSettings();
    renderKeybinds();
  });

  document.getElementById('dialogue-next').addEventListener('click', () => game?.showNextDialogue());
  document.getElementById('btn-close-skills').addEventListener('click', () => game?.toggleSkillTree());
  document.getElementById('btn-resume').addEventListener('click', () => game?.togglePause());
  document.getElementById('btn-quit').addEventListener('click', () => {
    game?.stop();
    game = null;
    showScreen('landing');
  });
  document.getElementById('btn-ending-menu').addEventListener('click', () => {
    showScreen('landing');
    game = null;
  });

  document.querySelectorAll('.class-card').forEach(card => {
    card.addEventListener('click', async () => {
      const cls = card.dataset.class;
      if (game) game.stop();
      if (!spritesReady) await preloadAllSprites();
      showScreen('game');
      game = new InfernalGame(cls);
      game.start();
    });
  });

  // Init
  initSettingsUI();
  renderKeybinds();
  preloadAllSprites();
})();
