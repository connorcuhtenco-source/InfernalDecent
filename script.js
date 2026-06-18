"use strict";

/* ============================================================
   INFERNAL DESCENT — SEPARATE BOSS MAP BUILD
   Requires:
   1. sprites.js
   2. levels.js
   3. script.js

   Main upgrades:
   - Boss portal opens after mobs are cleared
   - Portal transports player to a whole separate boss arena map
   - Hell-style arena maps instead of side-screen arenas
   - Bosses have ranged attacks so you cannot cheese them by running forever
   - Boss HP 5x
   - Mob HP 2x
   - Blocking absorbs 50 damage, breaks, then regens after 5 seconds
   - Cyclops / Devil beams lock direction before firing
   - Game over screen has Respawn and Back To Main Menu
   - Respawn restarts the current level and respawns enemies
   - Boss health bar only appears in boss map
   - Button / attack / chest / boss sounds
============================================================ */

/* ================= CANVAS SETUP ================= */

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const menuCanvas = document.getElementById("menuCanvas");
const menuCtx = menuCanvas?.getContext("2d");

const classCanvas = document.getElementById("classCanvas");
const classCtx = classCanvas?.getContext("2d");

const victoryCanvas = document.getElementById("victoryCanvas");
const victoryCtx = victoryCanvas?.getContext("2d");

/* ================= INPUT ================= */

const keys = {};
const pressed = {};

const mouse = {
  x: window.innerWidth / 2,
  y: window.innerHeight / 2,
  worldX: 0,
  worldY: 0
};

window.addEventListener("mousemove", e => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;

  if (window.game && game.world) {
    mouse.worldX = mouse.x + game.world.cameraX;
    mouse.worldY = mouse.y + game.world.cameraY;
  }
});

window.addEventListener("keydown", e => {
  if (!keys[e.code]) pressed[e.code] = true;
  keys[e.code] = true;

  if (
    ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
      e.code
    )
  ) {
    e.preventDefault();
  }

  if (e.code === "KeyM" && typeof MusicManager !== "undefined") {
    const muted = MusicManager.toggleMute();

    if (typeof toast === "function") {
      toast(muted ? "Music Muted" : "Music On");
    }
  }
});

window.addEventListener("keyup", e => {
  keys[e.code] = false;
});

function held(code) {
  return !!keys[code];
}

function once(code) {
  const value = !!pressed[code];
  pressed[code] = false;
  return value;
}

/* ================= HELPERS ================= */

const SOULS_PER_LEVEL = 5;

const SETTINGS = {
  shake: true,
  particles: true,
  sound: true,
  music: true
};

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function choice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function distance(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}

function touching(a, b, range = 24) {
  return distance(a.x, a.y, b.x, b.y) <= range;
}

function pointLineDistance(px, py, x1, y1, x2, y2) {
  const A = px - x1;
  const B = py - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;

  let param = -1;

  if (lenSq !== 0) {
    param = dot / lenSq;
  }

  let xx;
  let yy;

  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  return Math.hypot(px - xx, py - yy);
}

function isInAttackCone(attacker, target, range, cone = 0.72) {
  const dx = target.x - attacker.x;
  const dy = target.y - attacker.y;
  const d = Math.hypot(dx, dy);

  if (d > range) return false;
  if (d <= 22) return true;

  const ndx = dx / d;
  const ndy = dy / d;

  const dot = ndx * attacker.facingX + ndy * attacker.facingY;

  return dot >= cone;
}

function showScreen(id) {
  document.querySelectorAll(".screen").forEach(screen => {
    screen.classList.add("hidden");
  });

  const target = document.getElementById(id);
  if (target) target.classList.remove("hidden");
}

function resizeCanvas() {
  [canvas, menuCanvas, classCanvas, victoryCanvas].forEach(c => {
    if (!c) return;
    c.width = window.innerWidth;
    c.height = window.innerHeight;
  });
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

function toast(text) {
  const box = document.getElementById("toast");
  if (!box) return;

  box.textContent = text;
  box.classList.remove("hidden");

  clearTimeout(toast._timer);

  toast._timer = setTimeout(() => {
    box.classList.add("hidden");
  }, 1150);
}

function damageNumber(x, y, value, crit = false) {
  const layer = document.getElementById("damageLayer");
  if (!layer) return;

  const el = document.createElement("div");

  el.className = crit ? "damage-number crit" : "damage-number";
  el.textContent = crit ? `${value}!` : value;

  el.style.left = `${x}px`;
  el.style.top = `${y}px`;

  layer.appendChild(el);

  setTimeout(() => el.remove(), 850);
}

/* ================= SOUND EFFECTS ================= */

const SoundFX = {
  ctx: null,

  unlock() {
    if (!SETTINGS.sound) return;

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    if (!this.ctx) {
      this.ctx = new AudioContext();
    }

    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  },

  tone(freq = 440, duration = 0.08, type = "square", volume = 0.08) {
    if (!SETTINGS.sound) return;

    this.unlock();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.04);
  },

  click() {
    this.tone(520, 0.055, "square", 0.045);

    setTimeout(() => {
      this.tone(760, 0.045, "triangle", 0.035);
    }, 35);
  },

  attack(classId = "warrior") {
    if (classId === "mage") {
      this.tone(380, 0.06, "sine", 0.05);

      setTimeout(() => {
        this.tone(720, 0.09, "triangle", 0.06);
      }, 35);

      return;
    }

    if (classId === "assassin") {
      this.tone(720, 0.045, "sawtooth", 0.045);

      setTimeout(() => {
        this.tone(430, 0.04, "square", 0.035);
      }, 35);

      return;
    }

    this.tone(230, 0.07, "sawtooth", 0.06);

    setTimeout(() => {
      this.tone(150, 0.06, "square", 0.045);
    }, 45);
  },

  special(classId = "warrior") {
    this.tone(180, 0.08, "sawtooth", 0.06);

    setTimeout(() => {
      this.tone(classId === "mage" ? 880 : 360, 0.13, "triangle", 0.075);
    }, 60);
  },

  chest() {
    this.tone(500, 0.07, "triangle", 0.05);

    setTimeout(() => {
      this.tone(760, 0.09, "triangle", 0.055);
    }, 70);
  },

  blockBreak() {
    this.tone(140, 0.13, "sawtooth", 0.07);

    setTimeout(() => {
      this.tone(80, 0.16, "square", 0.06);
    }, 70);
  },

  portal() {
    this.tone(180, 0.12, "sawtooth", 0.065);

    setTimeout(() => {
      this.tone(420, 0.16, "triangle", 0.075);
    }, 120);
  },

  roar() {
    this.tone(90, 0.22, "sawtooth", 0.08);

    setTimeout(() => {
      this.tone(65, 0.25, "square", 0.07);
    }, 110);
  }
};

/* ================= BACKGROUND MUSIC =================
   Put your music files in this folder:

   assets/audio/Planning.mp3
   assets/audio/Adventure Awaits.mp3
   assets/audio/Cockroaches.mp3
   assets/audio/Suspensify.mp3

   Music map:
   - Landing / menus: Planning.mp3
   - Tutorial + Layer 1: Adventure Awaits.mp3
   - Layer 2: Cockroaches.mp3
   - Layer 3 / final layer: Suspensify.mp3
==================================================== */

const MusicManager = {
  tracks: {},
  current: null,
  currentName: "",
  volume: 0.45,
  muted: false,
  unlocked: false,
  pendingTrack: "menu",

  init() {
    this.tracks = {
      menu: this.createTrack("assets/audio/Planning.mp3"),
      layer1: this.createTrack("assets/audio/Adventure Awaits.mp3"),
      layer2: this.createTrack("assets/audio/Cockroaches.mp3"),
      layer3: this.createTrack("assets/audio/Suspensify.mp3")
    };

    const unlockOnce = () => this.unlock();

    document.addEventListener("click", unlockOnce, { once: true });
    document.addEventListener("keydown", unlockOnce, { once: true });

    const possibleVolumeSliders = [
      "musicVolumeSlider",
      "volumeSlider",
      "sVolume",
      "soundSlider"
    ];

    for (const id of possibleVolumeSliders) {
      const slider = document.getElementById(id);

      if (!slider) continue;

      slider.addEventListener("input", e => {
        this.setVolume(Number(e.target.value) / 100);
      });
    }
  },

  createTrack(src) {
    const audio = new Audio(src);

    audio.loop = true;
    audio.preload = "auto";
    audio.volume = this.volume;

    return audio;
  },

  unlock() {
    this.unlocked = true;

    if (this.pendingTrack) {
      this.play(this.pendingTrack);
    }
  },

  play(name) {
    if (!SETTINGS.music) return;

    const next = this.tracks[name];
    if (!next) return;

    this.pendingTrack = name;

    if (this.currentName === name && this.current && !this.current.paused) {
      return;
    }

    if (this.current && this.current !== next) {
      this.current.pause();
      this.current.currentTime = 0;
    }

    this.current = next;
    this.currentName = name;
    this.current.volume = this.muted ? 0 : this.volume;

    if (!this.unlocked) return;

    this.current.play().catch(() => {
      /* Browser is waiting for a click/key press before audio can start. */
    });
  },

  playForLevel(levelIndex) {
    if (levelIndex <= 1) {
      this.play("layer1");
      return;
    }

    if (levelIndex === 2) {
      this.play("layer2");
      return;
    }

    this.play("layer3");
  },

  stop() {
    if (!this.current) return;

    this.current.pause();
    this.current.currentTime = 0;
    this.current = null;
    this.currentName = "";
  },

  setVolume(value) {
    this.volume = clamp(value, 0, 1);

    Object.values(this.tracks).forEach(track => {
      track.volume = this.muted ? 0 : this.volume;
    });
  },

  toggleMute() {
    this.muted = !this.muted;

    Object.values(this.tracks).forEach(track => {
      track.volume = this.muted ? 0 : this.volume;
    });

    return this.muted;
  }
};

MusicManager.init();

/* ================= GAME DATA ================= */

const CLASS_DATA = {
  warrior: {
    name: "Warrior",
    hp: 155,
    stamina: 80,
    speed: 165,
    damage: 32,
    magic: 0,
    blockPower: 0.22,
    color: "#c73622",
    weapons: ["Fire Axe", "Demon Greatsword", "Devil's Greatspear"]
  },

  assassin: {
    name: "Assassin",
    hp: 100,
    stamina: 120,
    speed: 255,
    damage: 25,
    magic: 0,
    blockPower: 0.42,
    color: "#ff6a3d",
    weapons: ["Fire Dagger", "Demon Katana", "Devil's Nagakiba"]
  },

  mage: {
    name: "Mage",
    hp: 85,
    stamina: 90,
    speed: 185,
    damage: 0,
    magic: 22,
    blockPower: 0.5,
    color: "#ffd078",
    weapons: ["Fire Gloves", "Demon Wand", "Devil's Orb"]
  }
};

const WEAPONS = {
  "Fire Axe": {
    type: "melee",
    damage: 30,
    range: 72,
    cooldown: 455,
    specialCooldown: 2200,
    special: "Ground Smash"
  },

  "Demon Greatsword": {
    type: "melee",
    damage: 54,
    range: 94,
    cooldown: 590,
    specialCooldown: 2400,
    special: "Heavy Slam"
  },

  "Devil's Greatspear": {
    type: "hybrid",
    damage: 68,
    range: 135,
    cooldown: 540,
    specialCooldown: 2300,
    special: "Spear Throw"
  },

  "Fire Dagger": {
    type: "melee",
    damage: 20,
    range: 56,
    cooldown: 205,
    specialCooldown: 1800,
    special: "Shadow Strike"
  },

  "Demon Katana": {
    type: "melee",
    damage: 36,
    range: 84,
    cooldown: 265,
    specialCooldown: 1900,
    special: "Dash Strike"
  },

  "Devil's Nagakiba": {
    type: "melee",
    damage: 55,
    range: 116,
    cooldown: 310,
    specialCooldown: 2100,
    special: "Blade Storm"
  },

  "Fire Gloves": {
    type: "ranged",
    damage: 18,
    range: 330,
    cooldown: 380,
    specialCooldown: 2200,
    special: "Fireball"
  },

  "Demon Wand": {
    type: "ranged",
    damage: 28,
    range: 370,
    cooldown: 455,
    specialCooldown: 2400,
    special: "Arcane Blast"
  },

  "Devil's Orb": {
    type: "ranged",
    damage: 42,
    range: 430,
    cooldown: 540,
    specialCooldown: 2600,
    special: "Orb Storm"
  }
};

const ENEMY_TYPES = {
  husk: {
    name: "Husk",
    hp: 38,
    speed: 82,
    damage: 8,
    souls: 2,
    color: "#6b5145",
    detect: 390,
    touchRange: 22
  },

  hound: {
    name: "Hell Hound",
    hp: 50,
    speed: 215,
    damage: 10,
    souls: 3,
    color: "#e87519",
    detect: 470,
    touchRange: 23
  },

  cyclops: {
    name: "Cyclops",
    hp: 98,
    speed: 86,
    damage: 15,
    beamDamage: 20,
    souls: 4,
    color: "#c73622",
    detect: 560,
    touchRange: 24
  },

  gargoyle: {
    name: "Gargoyle",
    hp: 62,
    speed: 170,
    damage: 20,
    souls: 4,
    color: "#82746d",
    detect: 500,
    touchRange: 24
  }
};

const BOSS_TYPES = {
  "Hollow Warden": {
    hp: 150,
    damage: 12,
    souls: 10,
    color: "#f8efe7"
  },

  "The Gate Keeper": {
    hp: 290,
    damage: 18,
    souls: 15,
    color: "#c73622"
  },

  "Alpha Cerberus": {
    hp: 430,
    damage: 23,
    souls: 15,
    color: "#ff6a3d"
  },

  "The Devil": {
    hp: 610,
    damage: 28,
    souls: 25,
    color: "#ff2d1c"
  }
};

const POTIONS = {
  health: {
    name: "Health Flask",
    color: "#ff3b24",
    apply(player) {
      player.hp = clamp(player.hp + 45, 0, player.maxHp);
      toast("+45 HP");
    }
  },

  speed: {
    name: "Speed Rune",
    color: "#ffd078",
    apply(player) {
      player.speedBoostTimer = 8500;
      toast("Speed Boost");
    }
  },

  attack: {
    name: "Ember Core",
    color: "#ff9f2e",
    apply(player) {
      player.attackBoostTimer = 8500;
      toast("Damage Boost");
    }
  }
};

/* ================= MENU BACKGROUND ================= */

const embers = Array.from({ length: 150 }, () => ({
  x: Math.random() * window.innerWidth,
  y: Math.random() * window.innerHeight,
  r: rand(1, 3),
  speed: rand(16, 54),
  alpha: rand(0.18, 0.82)
}));

function drawMenuBackground(context) {
  if (!context) return;

  context.clearRect(0, 0, window.innerWidth, window.innerHeight);

  const bg = context.createRadialGradient(
    window.innerWidth / 2,
    window.innerHeight,
    0,
    window.innerWidth / 2,
    window.innerHeight,
    window.innerHeight
  );

  bg.addColorStop(0, "rgba(255,90,35,0.28)");
  bg.addColorStop(0.42, "rgba(120,20,10,0.08)");
  bg.addColorStop(1, "rgba(0,0,0,0)");

  context.fillStyle = bg;
  context.fillRect(0, 0, window.innerWidth, window.innerHeight);

  for (const e of embers) {
    e.y -= e.speed * 0.016;

    if (e.y < -20) {
      e.y = window.innerHeight + 20;
      e.x = Math.random() * window.innerWidth;
    }

    context.globalAlpha = e.alpha;
    context.fillStyle = "#ff9f2e";
    context.fillRect(e.x, e.y, e.r, e.r);
  }

  context.globalAlpha = 1;
}

function menuLoop() {
  drawMenuBackground(menuCtx);
  drawMenuBackground(classCtx);
  drawMenuBackground(victoryCtx);

  requestAnimationFrame(menuLoop);
}

menuLoop();

/* ================= PARTICLES ================= */

class ParticleSystem {
  constructor() {
    this.particles = [];
    this.lines = [];
  }

  burst(x, y, color, amount = 20) {
    if (!SETTINGS.particles) return;

    for (let i = 0; i < amount; i++) {
      this.particles.push({
        x,
        y,
        vx: rand(-210, 210),
        vy: rand(-210, 210),
        size: rand(2, 6),
        life: rand(0.35, 1.15),
        color
      });
    }
  }

        });
    }
  }

  line(x1, y1, x2, y2, color) {
    if (!SETTINGS.particles) return;

    this.lines.push({
      x1,
      y1,
      x2,
      y2,
      color,
      life: 0.22
    });
  }

  update(dt) {
    const s = dt / 1000;

    for (const p of this.particles) {
      p.x += p.vx * s;
      p.y += p.vy * s;
      p.life -= s;
    }

    for (const l of this.lines) {
      l.life -= s;
    }

    this.particles = this.particles.filter(p => p.life > 0);
    this.lines = this.lines.filter(l => l.life > 0);
  }

  draw(ctx, camX, camY) {
    for (const p of this.particles) {
      ctx.globalAlpha = clamp(p.life, 0, 1);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - camX, p.y - camY, p.size, p.size);
    }

    ctx.globalAlpha = 1;

    for (const l of this.lines) {
      ctx.strokeStyle = l.color;
      ctx.lineWidth = 4;
      ctx.shadowColor = l.color;
      ctx.shadowBlur = 18;

      ctx.beginPath();
      ctx.moveTo(l.x1 - camX, l.y1 - camY);
      ctx.lineTo(l.x2 - camX, l.y2 - camY);
      ctx.stroke();

      ctx.shadowBlur = 0;
    }
  }
}

/* ================= BEAM + ARENA HAZARD ATTACKS ================= */

class BeamAttack {
  constructor(x1, y1, x2, y2, damage, color, width = 22, windup = 520, active = 160) {
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;

    this.damage = damage;
    this.color = color;
    this.width = width;

    this.windup = windup;
    this.active = active;
    this.timer = 0;

    this.hit = false;
    this.dead = false;
  }

  update(dt, world) {
    this.timer += dt;

    if (this.timer >= this.windup && this.timer <= this.windup + this.active) {
      if (!this.hit) {
        const p = game.player;
        const d = pointLineDistance(p.x, p.y, this.x1, this.y1, this.x2, this.y2);

        if (d <= this.width && world.hasLineOfSight(this.x1, this.y1, p.x, p.y)) {
          p.takeDamage(this.damage);
          this.hit = true;
        }
      }
    }

    if (this.timer > this.windup + this.active) {
      this.dead = true;
    }
  }

  draw(ctx, camX, camY) {
    const isActive = this.timer >= this.windup;

    ctx.save();

    ctx.strokeStyle = isActive ? this.color : "rgba(255,255,255,0.35)";
    ctx.lineWidth = isActive ? this.width * 0.55 : 3;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = isActive ? 24 : 8;
    ctx.globalAlpha = isActive ? 0.85 : 0.45;

    ctx.beginPath();
    ctx.moveTo(this.x1 - camX, this.y1 - camY);
    ctx.lineTo(this.x2 - camX, this.y2 - camY);
    ctx.stroke();

    ctx.restore();
  }
}

class TimedVent {
  constructor(x, y, r) {
    this.x = x;
    this.y = y;
    this.r = r;
    this.timer = rand(0, 2200);
    this.active = false;
    this.dead = false;
    this.hitThisBlast = false;
  }

  update(dt, world) {
    this.timer += dt;

    const cycle = this.timer % 3200;
    this.active = cycle > 2300 && cycle < 2700;

    if (cycle < 2000) {
      this.hitThisBlast = false;
    }

    if (this.active && !this.hitThisBlast) {
      const p = game.player;

      if (distance(this.x, this.y, p.x, p.y) < this.r + 22) {
        p.takeDamage(18);
        this.hitThisBlast = true;
      }
    }
  }

  draw(ctx, camX, camY) {
    const x = this.x - camX;
    const y = this.y - camY;

    const cycle = this.timer % 3200;
    const warning = cycle > 1700 && cycle <= 2300;

    ctx.save();

    if (this.active) {
      SpriteFX.glow(ctx, x, y, this.r + 75, "rgba(255,80,20,0.6)");
      ctx.fillStyle = "rgba(255,80,20,0.45)";
    } else if (warning) {
      SpriteFX.glow(ctx, x, y, this.r + 45, "rgba(255,170,50,0.35)");
      ctx.fillStyle = "rgba(255,170,50,0.28)";
    } else {
      ctx.fillStyle = "rgba(0,0,0,0.32)";
    }

    ctx.beginPath();
    ctx.arc(x, y, this.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = warning || this.active ? "#ff9f2e" : "rgba(255,255,255,0.12)";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.restore();
  }
}

class BossFireball {
  constructor(x, y, dx, dy, damage, color = "#ff3b24") {
    const len = Math.hypot(dx, dy) || 1;

    this.x = x;
    this.y = y;
    this.dx = dx / len;
    this.dy = dy / len;
    this.damage = damage;
    this.color = color;
    this.speed = 340;
    this.radius = 16;
    this.life = 2600;
    this.dead = false;
  }

  update(dt, world) {
    this.life -= dt;

    this.x += this.dx * this.speed * (dt / 1000);
    this.y += this.dy * this.speed * (dt / 1000);

    if (this.life <= 0 || world.collides(this.x, this.y, 8)) {
      world.particles.burst(this.x, this.y, this.color, 20);
      this.dead = true;
      return;
    }

    if (touching(this, game.player, this.radius + 18)) {
      game.player.takeDamage(this.damage);
      world.particles.burst(this.x, this.y, this.color, 22);
      this.dead = true;
    }
  }

  draw(ctx, camX, camY) {
    const x = this.x - camX;
    const y = this.y - camY;

    ctx.save();

    SpriteFX.glow(ctx, x, y, 48, "rgba(255,90,25,0.55)");

    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(x, y, this.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffd078";
    ctx.beginPath();
    ctx.arc(x - this.dx * 5, y - this.dy * 5, this.radius * 0.45, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

/* ================= PLAYER ================= */

class Player {
  constructor(classId) {
    const data = CLASS_DATA[classId];

    this.classId = classId;
    this.className = data.name;

    this.x = 200;
    this.y = 200;
    this.w = 30;
    this.h = 38;

    this.maxHp = data.hp;
    this.hp = this.maxHp;

    this.maxStamina = data.stamina;
    this.stamina = this.maxStamina;

    this.baseSpeed = data.speed;
    this.baseDamage = data.damage;
    this.baseMagic = data.magic;
    this.blockPower = data.blockPower;

    this.blockMax = 50;
    this.blockHp = this.blockMax;
    this.blockBroken = false;
    this.blockRegenTimer = 0;

    this.color = data.color;

    this.weaponList = data.weapons;
    this.weaponIndex = 0;
    this.weaponName = this.weaponList[this.weaponIndex];

    this.souls = 0;
    this.totalSouls = 0;
    this.level = 1;
    this.skillPoints = 0;

    this.skills = {
      health: 0,
      damage: 0,
      magic: 0,
      speed: 0,
      stamina: 0
    };

    this.facingX = 1;
    this.facingY = 0;

    this.attackTimer = 0;
    this.specialTimer = 0;
    this.invincible = 0;
    this.blocking = false;

    this.stunned = 0;

    this.swingTimer = 0;
    this.swingPower = 0;

    this.speedBoostTimer = 0;
    this.attackBoostTimer = 0;

    this.kills = 0;
    this.projectiles = [];
    this.frame = 0;
  }

  get weapon() {
    return WEAPONS[this.weaponName];
  }

  getDamageValue() {
    const weapon = this.weapon;

    let value = weapon.damage;

    if (this.classId === "mage") {
      value += this.baseMagic;
    } else {
      value += this.baseDamage;
    }

    if (this.attackBoostTimer > 0) {
      value *= 1.35;
    }

    return value;
  }

  update(dt, world) {
    const s = dt / 1000;

    this.frame += dt;

    this.attackTimer -= dt;
    this.specialTimer -= dt;
    this.invincible -= dt;
    this.swingTimer -= dt;
    this.stunned -= dt;

    this.speedBoostTimer -= dt;
    this.attackBoostTimer -= dt;

    if (this.blockBroken) {
      this.blockRegenTimer -= dt;

      if (this.blockRegenTimer <= 0) {
        this.blockBroken = false;
        this.blockHp = this.blockMax;
        toast("Block Ready");
      }
    }

    mouse.worldX = mouse.x + world.cameraX;
    mouse.worldY = mouse.y + world.cameraY;

    const aimX = mouse.worldX - this.x;
    const aimY = mouse.worldY - this.y;
    const aimLen = Math.hypot(aimX, aimY);

    if (aimLen > 5) {
      this.facingX = aimX / aimLen;
      this.facingY = aimY / aimLen;
    }

    this.blocking = held("KeyQ") && this.stamina > 5 && !this.blockBroken && this.stunned <= 0;

    if (this.blocking) {
      this.stamina = clamp(this.stamina - 12 * s, 0, this.maxStamina);
    } else {
      this.stamina = clamp(this.stamina + 22 * s, 0, this.maxStamina);
    }

    if (this.stunned <= 0) {
      this.move(dt, world);
    }

    if (once("Space") && this.stunned <= 0) this.attack(world);
    if (once("KeyE") && this.stunned <= 0) this.special(world);
    if (once("KeyR")) game.openSkills();
    if (once("Escape")) game.pause();

    for (const p of this.projectiles) {
      p.update(dt, world);
    }

    this.projectiles = this.projectiles.filter(p => !p.dead);
  }

  move(dt, world) {
    const s = dt / 1000;

    let mx = 0;
    let my = 0;

    if (held("KeyW") || held("ArrowUp")) my--;
    if (held("KeyS") || held("ArrowDown")) my++;
    if (held("KeyA") || held("ArrowLeft")) mx--;
    if (held("KeyD") || held("ArrowRight")) mx++;

    const len = Math.hypot(mx, my) || 1;

    mx /= len;
    my /= len;

    let speed = this.baseSpeed;

    if (this.speedBoostTimer > 0) speed *= 1.28;

    if ((held("ShiftLeft") || held("ShiftRight")) && this.stamina > 0 && !this.blocking) {
      speed *= 1.55;
      this.stamina = clamp(this.stamina - 30 * s, 0, this.maxStamina);
    }

    if (this.blocking) speed *= 0.55;

    const nx = this.x + mx * speed * s;
    const ny = this.y + my * speed * s;

    if (!world.collides(nx, this.y, 18)) this.x = nx;
    if (!world.collides(this.x, ny, 18)) this.y = ny;
  }

  attack(world) {
    if (this.attackTimer > 0) return;

    SoundFX.attack(this.classId);

    const weapon = this.weapon;

    this.attackTimer = weapon.cooldown;
    this.swingTimer = 170;
    this.swingPower = weapon.type === "ranged" ? 0.5 : 1;

    const crit = Math.random() < 0.12;

    let damage = this.getDamageValue();

    if (crit) damage *= 1.75;

    damage = Math.round(damage);

    if (weapon.type === "ranged") {
      this.projectiles.push(
        new Projectile({
          x: this.x + this.facingX * 28,
          y: this.y + this.facingY * 28,
          dx: this.facingX,
          dy: this.facingY,
          damage,
          range: weapon.range,
          color: this.color,
          crit,
          kind: this.classId === "mage" ? "fireball" : "bolt"
        })
      );

      world.particles.burst(this.x, this.y, this.color, 10);
      return;
    }

    if (weapon.type === "hybrid") {
      this.projectiles.push(
        new Projectile({
          x: this.x + this.facingX * 30,
          y: this.y + this.facingY * 30,
          dx: this.facingX,
          dy: this.facingY,
          damage,
          range: weapon.range,
          color: this.color,
          crit,
          kind: "spear"
        })
      );
    }

    let hitSomething = false;

    for (const enemy of world.enemies) {
      if (enemy.dead) continue;

      if (isInAttackCone(this, enemy, weapon.range, 0.62)) {
        enemy.takeDamage(damage);

        hitSomething = true;

        damageNumber(enemy.x - world.cameraX, enemy.y - world.cameraY, damage, crit);
        world.particles.burst(enemy.x, enemy.y, this.color, 12);
      }
    }

    if (world.boss && !world.boss.dead && world.isBossMap) {
      if (isInAttackCone(this, world.boss, weapon.range + 8, 0.6)) {
        world.boss.takeDamage(damage);

        hitSomething = true;

        damageNumber(world.boss.x - world.cameraX, world.boss.y - world.cameraY, damage, crit);
        world.particles.burst(world.boss.x, world.boss.y, this.color, 16);
      }
    }

    if (hitSomething) {
      this.stamina = clamp(this.stamina + 8, 0, this.maxStamina);
    }
  }

  special(world) {
    if (this.specialTimer > 0) return;
    if (this.stamina < 25) return;

    SoundFX.special(this.classId);

    const weapon = this.weapon;

    this.specialTimer = weapon.specialCooldown;
    this.stamina -= 25;
    this.swingTimer = 280;
    this.swingPower = 1.4;

    toast(weapon.special);

    if (this.classId === "mage") {
      const spread = [-0.22, 0, 0.22];

      for (const angle of spread) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        const dx = this.facingX * cos - this.facingY * sin;
        const dy = this.facingX * sin + this.facingY * cos;

        this.projectiles.push(
          new Projectile({
            x: this.x + dx * 34,
            y: this.y + dy * 34,
            dx,
            dy,
            damage: Math.round(this.getDamageValue() * 1.25),
            range: weapon.range + 120,
            color: "#ff9f2e",
            crit: true,
            kind: "fireball",
            radius: 18
          })
        );
      }

      world.particles.burst(this.x, this.y, "#ff9f2e", 40);

      if (SETTINGS.shake) world.shake = 8;
      return;
    }

    const radius = weapon.range + 55;
    const damage = Math.round(this.getDamageValue() * 1.35);

    for (const enemy of world.enemies) {
      if (enemy.dead) continue;

      if (isInAttackCone(this, enemy, radius, 0.42)) {
        enemy.takeDamage(damage);

        damageNumber(enemy.x - world.cameraX, enemy.y - world.cameraY, damage, true);
        world.particles.burst(enemy.x, enemy.y, this.color, 24);
      }
    }

    if (world.boss && !world.boss.dead && world.isBossMap) {
      if (isInAttackCone(this, world.boss, radius + 10, 0.42)) {
        world.boss.takeDamage(damage);

        damageNumber(world.boss.x - world.cameraX, world.boss.y - world.cameraY, damage, true);
        world.particles.burst(world.boss.x, world.boss.y, this.color, 32);
      }
    }

    world.particles.burst(this.x, this.y, this.color, 45);

    if (SETTINGS.shake) world.shake = 12;
  }

  takeDamage(amount) {
    if (this.invincible > 0) return;

    let finalDamage = amount;

    if (this.blocking && this.blockHp > 0 && !this.blockBroken) {
      const absorbed = Math.min(finalDamage, this.blockHp);

      finalDamage -= absorbed;
      this.blockHp -= absorbed;

      game.world.particles.burst(this.x, this.y, "#9fdcff", 16);

      if (this.blockHp <= 0) {
        this.blockHp = 0;
        this.blockBroken = true;
        this.blocking = false;
        this.blockRegenTimer = 5000;

        SoundFX.blockBreak();
        toast("Block Broken");
      } else {
        toast("Blocked");
      }
    }

    if (finalDamage <= 0) {
      this.invincible = 260;
      return;
    }

    this.hp = clamp(this.hp - finalDamage, 0, this.maxHp);
    this.invincible = 520;

    if (game?.world) {
      if (SETTINGS.shake) game.world.shake = 8;
      game.world.particles.burst(this.x, this.y, "#ff2d1c", 16);
    }

    if (this.hp <= 0) {
      game.gameOver();
    }
  }

  addSouls(amount) {
    this.souls += amount;
    this.totalSouls += amount;

    while (this.souls >= SOULS_PER_LEVEL) {
      this.souls -= SOULS_PER_LEVEL;
      this.level++;
      this.skillPoints++;
      toast(`Level ${this.level}`);
    }
  }

  upgradeWeapon() {
    if (this.weaponIndex < this.weaponList.length - 1) {
      this.weaponIndex++;
      this.weaponName = this.weaponList[this.weaponIndex];
      toast(this.weaponName);
    }
  }

  learn(skill) {
    if (this.skillPoints <= 0) return;
    if (this.skills[skill] >= 20) return;

    if (skill === "damage" && this.classId === "mage") {
      toast("Mage uses Magic");
      return;
    }

    if (skill === "magic" && this.classId !== "mage") {
      toast("Only Mage uses Magic");
      return;
    }

    this.skillPoints--;
    this.skills[skill]++;

    if (skill === "health") {
      this.maxHp += 10;
      this.hp = clamp(this.hp + 10, 0, this.maxHp);
    }

    if (skill === "damage") {
      this.baseDamage += 5;
    }

    if (skill === "magic") {
      this.baseMagic += 5;
    }

    if (skill === "speed") {
      this.baseSpeed += 10;
    }

    if (skill === "stamina") {
      this.maxStamina += 15;
      this.stamina = this.maxStamina;
    }

    game.updateHUD();
    game.updateSkillScreen();
  }

  draw(ctx, camX, camY) {
    if (this.invincible > 0 && Math.floor(this.invincible / 70) % 2 === 0) {
      ctx.globalAlpha = 0.45;
    }

    SpriteRenderer.drawPlayer(ctx, this.x - camX, this.y - camY, this, this.frame);

    this.drawWeaponSwing(ctx, camX, camY);
    this.drawBlockMeter(ctx, camX, camY);

    ctx.globalAlpha = 1;

    for (const p of this.projectiles) {
      p.draw(ctx, camX, camY);
    }

    if (this.stunned > 0) {
      ctx.save();
      ctx.fillStyle = "rgba(255,220,120,0.8)";
      ctx.font = "900 12px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("STUNNED", this.x - camX, this.y - camY - 52);
      ctx.restore();
    }
  }

  drawWeaponSwing(ctx, camX, camY) {
    if (this.swingTimer <= 0) return;

    const progress = 1 - this.swingTimer / 280;
    const x = this.x - camX;
    const y = this.y - camY;

    const angle = Math.atan2(this.facingY, this.facingX);
    const arcStart = angle - 0.9 + progress * 0.55;
    const arcEnd = angle + 0.9 + progress * 0.55;

    ctx.save();

    ctx.globalAlpha = clamp(this.swingTimer / 180, 0.15, 0.75);
    ctx.strokeStyle = this.classId === "mage" ? "#ff9f2e" : "#fff1d0";
    ctx.lineWidth = this.classId === "mage" ? 5 : 8;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 18;

    ctx.beginPath();
    ctx.arc(x, y, this.weapon.range * 0.72, arcStart, arcEnd);
    ctx.stroke();

    ctx.restore();
  }

  drawBlockMeter(ctx, camX, camY) {
    const x = this.x - camX;
    const y = this.y - camY + 38;

    ctx.save();

    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.fillRect(x - 24, y, 48, 5);

    ctx.fillStyle = this.blockBroken ? "#ff2d1c" : "#9fdcff";
    ctx.fillRect(x - 24, y, 48 * (this.blockHp / this.blockMax), 5);

    ctx.restore();
  }
}

/* ================= PROJECTILES ================= */

class Projectile {
  constructor(options) {
    const len = Math.hypot(options.dx, options.dy) || 1;

    this.x = options.x;
    this.y = options.y;
    this.startX = options.x;
    this.startY = options.y;

    this.dx = options.dx / len;
    this.dy = options.dy / len;

    this.damage = options.damage;
    this.range = options.range;
    this.color = options.color;
    this.crit = options.crit;

    this.kind = options.kind || "bolt";
    this.radius = options.radius || (this.kind === "fireball" ? 14 : 9);

    this.speed = this.kind === "fireball" ? 500 : 560;
    this.dead = false;
    this.frame = 0;
  }

  update(dt, world) {
    const s = dt / 1000;

    this.frame += dt;

    this.x += this.dx * this.speed * s;
    this.y += this.dy * this.speed * s;

    if (distance(this.startX, this.startY, this.x, this.y) > this.range) {
      this.dead = true;
      return;
    }

    if (world.collides(this.x, this.y, 8)) {

            world.particles.burst(this.x, this.y, this.color, 14);
      this.dead = true;
      return;
    }

    for (const enemy of world.enemies) {
      if (enemy.dead) continue;

      if (touching(this, enemy, this.radius + 16)) {
        enemy.takeDamage(this.damage);

        damageNumber(enemy.x - world.cameraX, enemy.y - world.cameraY, this.damage, this.crit);
        world.particles.burst(enemy.x, enemy.y, this.color, 18);

        this.dead = true;
        return;
      }
    }

    if (world.boss && !world.boss.dead && world.isBossMap && touching(this, world.boss, this.radius + 30)) {
      world.boss.takeDamage(this.damage);

      damageNumber(world.boss.x - world.cameraX, world.boss.y - world.cameraY, this.damage, this.crit);
      world.particles.burst(world.boss.x, world.boss.y, this.color, 22);

      this.dead = true;
    }
  }

  draw(ctx, camX, camY) {
    const x = this.x - camX;
    const y = this.y - camY;

    ctx.save();

    if (this.kind === "fireball") {
      SpriteFX.glow(ctx, x, y, 44, "rgba(255,95,30,0.55)");

      ctx.fillStyle = "#ff3b24";
      ctx.beginPath();
      ctx.arc(x, y, this.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#ffd078";
      ctx.beginPath();
      ctx.arc(x - this.dx * 4, y - this.dy * 4, this.radius * 0.45, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.beginPath();
      ctx.arc(x + this.dx * 5, y + this.dy * 5, this.radius * 0.25, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.kind === "spear") {
      ctx.strokeStyle = "#fff1d0";
      ctx.lineWidth = 5;
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 16;

      ctx.beginPath();
      ctx.moveTo(x - this.dx * 18, y - this.dy * 18);
      ctx.lineTo(x + this.dx * 24, y + this.dy * 24);
      ctx.stroke();
    } else {
      SpriteFX.glow(ctx, x, y, 28, this.color + "aa");

      ctx.fillStyle = this.color;
      ctx.fillRect(x - 8, y - 8, 16, 16);

      ctx.fillStyle = "#fff";
      ctx.fillRect(x - 4, y - 4, 8, 8);
    }

    ctx.restore();
  }
}

/* ================= CHESTS ================= */

class Chest {
  constructor(x, y, potionType = "health") {
    this.x = x;
    this.y = y;
    this.w = 42;
    this.h = 34;
    this.potionType = potionType;
    this.opened = false;
    this.frame = 0;
  }

  update(dt, world) {
    this.frame += dt;

    if (this.opened) return;

    const player = game.player;

    if (touching(this, player, 46) && once("KeyF")) {
      this.open(world);
    }
  }

  open(world) {
    if (this.opened) return;

    this.opened = true;

    SoundFX.chest();

    const potion = POTIONS[this.potionType] || POTIONS.health;
    potion.apply(game.player);

    world.particles.burst(this.x, this.y, potion.color, 34);
  }

  draw(ctx, camX, camY) {
    const x = this.x - camX;
    const y = this.y - camY;

    ctx.save();

    SpriteFX.shadow(ctx, x, y + 20, 30, 8);

    if (!this.opened) {
      SpriteFX.glow(ctx, x, y, 36, "rgba(255,159,46,0.2)");

      ctx.fillStyle = "#3a1b0c";
      ctx.fillRect(x - 22, y - 14, 44, 28);

      ctx.fillStyle = "#6b3514";
      ctx.fillRect(x - 18, y - 20, 36, 12);

      ctx.fillStyle = "#ff9f2e";
      ctx.fillRect(x - 4, y - 12, 8, 12);

      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.strokeRect(x - 22, y - 20, 44, 34);

      if (touching(this, game.player, 55)) {
        ctx.font = "700 12px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = "rgba(255,240,205,0.9)";
        ctx.fillText("Press F", x, y - 34);
      }
    } else {
      ctx.globalAlpha = 0.55;

      ctx.fillStyle = "#241107";
      ctx.fillRect(x - 22, y - 10, 44, 24);

      ctx.fillStyle = "#0b0503";
      ctx.fillRect(x - 18, y - 18, 36, 10);
    }

    ctx.restore();
  }
}

/* ================= ENEMIES ================= */

class Enemy {
  constructor(type, x, y) {
    const data = ENEMY_TYPES[type];

    this.type = type;
    this.name = data.name;

    this.x = x;
    this.y = y;

    this.maxHp = data.hp * 2;
    this.hp = this.maxHp;

    this.speed = data.speed;
    this.damage = data.damage;
    this.souls = data.souls;
    this.detect = data.detect;
    this.touchRange = data.touchRange || 22;

    this.color = data.color;

    this.cooldown = rand(500, 1300);
    this.dead = false;
    this.flash = 0;
    this.frame = 0;

    this.awake = false;
    this.stuckTimer = 0;
    this.lastX = x;
    this.lastY = y;
  }

  takeDamage(amount) {
    this.hp -= amount;
    this.flash = 120;
    this.awake = true;

    if (this.hp <= 0 && !this.dead) {
      this.dead = true;

      game.player.kills++;
      game.player.addSouls(this.souls);

      game.world.particles.burst(this.x, this.y, this.color, 24);
    }
  }

  update(dt, world) {
    if (this.dead) return;
    if (world.isBossMap && !this.awake) return;

    this.frame += dt;
    this.flash -= dt;
    this.cooldown -= dt;

    const player = game.player;
    const d = distance(this.x, this.y, player.x, player.y);

    const detectRange = this.detect + (world.level.detectionBonus || 0);

    const canSeePlayer =
      d <= detectRange &&
      (!world.hasLineOfSight || world.hasLineOfSight(this.x, this.y, player.x, player.y));

    if (canSeePlayer) {
      this.awake = true;
    }

    if (!this.awake) return;

    if (!world.isBossMap && d > detectRange * 1.55) {
      this.awake = false;
      return;
    }

    const dx = (player.x - this.x) / (d || 1);
    const dy = (player.y - this.y) / (d || 1);

    if (this.type === "cyclops") {
      this.updateCyclops(dt, world, player, d, dx, dy);
      return;
    }

    if (this.type === "gargoyle") {
      this.updateGargoyle(dt, world, player, d, dx, dy);
      return;
    }

    this.updateMelee(dt, world, player, d, dx, dy);
  }

  updateMelee(dt, world, player, d, dx, dy) {
    let speed = this.speed;

    if (this.type === "hound") {
      speed *= 1.18;
    }

    if (!touching(this, player, this.touchRange)) {
      this.moveSmart(world, dx, dy, speed, dt);
    }

    if (touching(this, player, this.touchRange) && this.cooldown <= 0) {
      player.takeDamage(this.damage);
      this.cooldown = this.type === "hound" ? 780 : 1150;

      world.particles.burst(this.x, this.y, this.color, 10);
    }
  }

  updateGargoyle(dt, world, player, d, dx, dy) {
    const diveReady = this.cooldown <= 0;
    const diveSpeed = diveReady ? this.speed * 1.55 : this.speed * 0.82;

    if (!touching(this, player, this.touchRange)) {
      this.moveSmart(world, dx, dy, diveSpeed, dt);
    }

    if (touching(this, player, this.touchRange) && this.cooldown <= 0) {
      player.takeDamage(this.damage);
      toast("Dive");
      this.cooldown = 1500;

      world.particles.burst(this.x, this.y, this.color, 16);
    }
  }

  updateCyclops(dt, world, player, d, dx, dy) {
    const beamRange = 430;
    const beamLine =
      !world.hasLineOfSight ||
      world.hasLineOfSight(this.x, this.y, player.x, player.y);

    if (d < beamRange && beamLine && this.cooldown <= 0) {
      world.beams.push(
        new BeamAttack(
          this.x,
          this.y - 20,
          player.x,
          player.y,
          ENEMY_TYPES.cyclops.beamDamage,
          "#ff2d1c",
          22,
          560,
          160
        )
      );

      toast("Beam");
      this.cooldown = 3000;
      return;
    }

    if (d > 155) {
      this.moveSmart(world, dx, dy, this.speed, dt);
    }

    if (touching(this, player, this.touchRange) && this.cooldown <= 0) {
      player.takeDamage(this.damage);
      this.cooldown = 1500;
    }
  }

  moveSmart(world, dx, dy, speed, dt) {
    const s = dt / 1000;
    const step = speed * s;

    const attempts = [
      { x: dx, y: dy },
      { x: -dy, y: dx },
      { x: dy, y: -dx },
      { x: dx * 0.7 - dy * 0.7, y: dy * 0.7 + dx * 0.7 },
      { x: dx * 0.7 + dy * 0.7, y: dy * 0.7 - dx * 0.7 }
    ];

    for (const a of attempts) {
      const nx = this.x + a.x * step;
      const ny = this.y + a.y * step;

      if (!world.collides(nx, ny, 20)) {
        this.x = nx;
        this.y = ny;
        this.stuckTimer = 0;
        this.lastX = this.x;
        this.lastY = this.y;
        return;
      }
    }

    this.stuckTimer += dt;

    if (this.stuckTimer > 700) {
      const p = world.findSafeSpotNear(this.x, this.y, 45, 110);
      this.x = p.x;
      this.y = p.y;
      this.stuckTimer = 0;
    }
  }

  draw(ctx, camX, camY) {
    if (this.dead) return;

    const x = this.x - camX;
    const y = this.y - camY;

    if (this.flash > 0) {
      SpriteFX.glow(ctx, x, y, 52, "rgba(255,255,255,0.45)");
    }

    if (this.type === "hound") {
      SpriteRenderer.drawHellHound(ctx, x, y, this, this.frame);
    } else if (this.type === "cyclops") {
      SpriteRenderer.drawCyclops(ctx, x, y, this, this.frame);
    } else if (this.type === "gargoyle") {
      SpriteRenderer.drawGargoyle(ctx, x, y, this, this.frame);
    } else {
      SpriteRenderer.drawHusk(ctx, x, y, this, this.frame);
    }

    ctx.fillStyle = "rgba(0,0,0,0.72)";
    ctx.fillRect(x - 22, y - 46, 44, 6);

    ctx.fillStyle = "#ff3b24";
    ctx.fillRect(x - 22, y - 46, 44 * (this.hp / this.maxHp), 6);
  }
}

/* ================= BOSS ================= */

class Boss {
  constructor(name, x, y) {
    const data = BOSS_TYPES[name];

    this.name = name;

    this.x = x;
    this.y = y;

    this.maxHp = data.hp * 5;
    this.hp = this.maxHp;

    this.damage = data.damage;
    this.souls = data.souls;
    this.color = data.color;

    this.cooldown = 1200;
    this.rangedCooldown = 1600;
    this.specialCooldown = 2800;

    this.dead = false;
    this.phase2 = false;
    this.phase3 = false;
    this.frame = 0;

    this.throneIntro = name === "The Devil" ? 900 : 0;
  }

  takeDamage(amount) {
    this.hp -= amount;

    if (!this.phase2 && this.hp <= this.maxHp * 0.5) {
      this.phase2 = true;
      toast("Phase II");

      if (this.name === "Alpha Cerberus") {
        SoundFX.roar();
        game.world.activateCerberusPhase2();
      }

      if (this.name === "The Devil") {
        game.world.activateDevilAnger();
      }

      if (this.name === "The Gate Keeper") {
        game.world.activateGateKeeperPhase2();
      }

      if (SETTINGS.shake) {
        game.world.shake = 22;
      }
    }

    if (!this.phase3 && this.hp <= this.maxHp * 0.25) {
      this.phase3 = true;

      if (this.name === "The Devil") {
        game.world.activateDevilFinal();
      }
    }

    if (this.hp <= 0 && !this.dead) {
      this.dead = true;

      game.player.addSouls(this.souls);
      game.world.particles.burst(this.x, this.y, this.color, 130);

      game.completeLevel();
    }
  }

  update(dt, world) {
    if (this.dead) return;
    if (!world.isBossMap) return;

    this.frame += dt;

    if (this.throneIntro > 0) {
      this.throneIntro -= dt;

      if (this.throneIntro <= 0) {
        const start = world.currentArena.bossPos;
        this.x = start.x;
        this.y = start.y;
        toast("The Devil Descends");
        if (SETTINGS.shake) world.shake = 18;
      }

      return;
    }

    this.cooldown -= dt;
    this.rangedCooldown -= dt;
    this.specialCooldown -= dt;

    const player = game.player;
    const d = distance(this.x, this.y, player.x, player.y);

    this.updateBossHUD(world);

    if (d > 105) {
      const dx = (player.x - this.x) / (d || 1);
      const dy = (player.y - this.y) / (d || 1);

      const speed = this.phase2 ? 132 : 96;

      this.moveSmart(world, dx, dy, speed, dt);
    }

    if (this.rangedCooldown <= 0) {
      this.rangedAttack(player, world, d);
      return;
    }

    if (this.specialCooldown <= 0) {
      this.specialAttack(player, world, d);
      return;
    }

    if (this.cooldown <= 0) {
      this.meleeAttack(player, world, d);
    }
  }

  moveSmart(world, dx, dy, speed, dt) {
    const s = dt / 1000;
    const step = speed * s;

    const attempts = [
      { x: dx, y: dy },
      { x: -dy, y: dx },
      { x: dy, y: -dx },
      { x: dx * 0.6 - dy * 0.8, y: dy * 0.6 + dx * 0.8 },
      { x: dx * 0.6 + dy * 0.8, y: dy * 0.6 - dx * 0.8 }
    ];

    for (const a of attempts) {
      const nx = this.x + a.x * step;
      const ny = this.y + a.y * step;

      if (!world.collides(nx, ny, 35)) {
        this.x = nx;
        this.y = ny;
        return;
      }
    }
  }

  meleeAttack(player, world, d) {
    if (this.name === "The Gate Keeper") {
      if (touching(this, player, 54)) {
        player.takeDamage(this.phase2 ? 34 : 22);
      }

      toast("Crushing Swing");
      this.cooldown = this.phase2 ? 1050 : 1450;
      return;
    }

    if (this.name === "Alpha Cerberus") {
      if (touching(this, player, 62)) {
        player.takeDamage(this.phase2 ? 29 : 24);
      }

      toast("Triple Bite");
      this.cooldown = this.phase2 ? 1050 : 1450;
      return;
    }

    if (this.name === "The Devil") {
      if (touching(this, player, 58)) {
        player.takeDamage(this.phase2 ? 28 : 22);
      }

      toast("Pitchfork Lunge");
      this.cooldown = this.phase2 ? 950 : 1350;
      return;
    }

    if (touching(this, player, 48)) {
      player.takeDamage(this.damage);
    }

    this.cooldown = 1400;
  }

  rangedAttack(player, world, d) {
    if (this.name === "The Gate Keeper") {
      if (d > 250) {
        world.projectiles.push(
          new BossFireball(
            this.x,
            this.y,
            player.x - this.x,
            player.y - this.y,
            20,
            "#ff6a3d"
          )
        );

        toast("Burning Rubble");
      } else {
        this.gateKeeperRush(world, player);
      }

      this.rangedCooldown = this.phase2 ? 1300 : 1700;
      return;
    }

    if (this.name === "Alpha Cerberus") {
      world.projectiles.push(
        new BossFireball(
          this.x,
          this.y,
          player.x - this.x,
          player.y - this.y,
          this.phase2 ? 24 : 18,
          "#ff6a3d"
        )
      );

      toast("Fire Spit");
      this.rangedCooldown = this.phase2 ? 1100 : 1450;
      return;
    }

    if (this.name === "The Devil") {
      if (world.hasLineOfSight(this.x, this.y, player.x, player.y)) {
        world.beams.push(
          new BeamAttack(
            this.x,
            this.y - 45,
            player.x,
            player.y,
            this.phase2 ? 32 : 26,
            "#ff2d1c",
            30,
            650,
            180
          )
        );

        toast("Devil Beam");
      }

      this.rangedCooldown = this.phase2 ? 1150 : 1550;
      return;
    }

    world.projectiles.push(
      new BossFireball(this.x, this.y, player.x - this.x, player.y - this.y, this.damage)
    );

    this.rangedCooldown = 1600;
  }

  specialAttack(player, world, d) {
    if (this.name === "The Gate Keeper") {
      this.gateKeeperShockwave(world);
      this.specialCooldown = this.phase2 ? 2200 : 2800;
      return;
    }

    if (this.name === "Alpha Cerberus") {
      const roarRange = this.phase2 ? 240 : 185;

      SoundFX.roar();

      if (d <= roarRange) {
        player.takeDamage(this.phase2 ? 18 : 12);
        player.stunned = 900;
        world.particles.burst(player.x, player.y, "#ff6a3d", 22);
      }

      toast("Roar");
      this.specialCooldown = this.phase2 ? 2300 : 3100;
      return;
    }

    if (this.name === "The Devil") {
      world.devilSummon();
      this.specialCooldown = this.phase2 ? 2600 : 3400;
      return;
    }

    this.specialCooldown = 2600;
  }

  gateKeeperRush(world, player) {
    const arena = world.currentArena;
    const runway = arena.runway;

    if (!runway) return;

    world.beams.push(
      new BeamAttack(
        runway.x1,
        runway.y1,
        runway.x2,
        runway.y2,
        this.phase2 ? 30 : 22,
        "#ff6a3d",
        55,
        480,
        120
      )
    );

    for (const d of world.decor) {
      if (d.type !== "breakPillar" || d.broken) continue;

      const dist = pointLineDistance(d.x, d.y, runway.x1, runway.y1, runway.x2, runway.y2);

      if (dist < 85 && Math.random() < 0.42) {
        d.broken = true;
        world.particles.burst(d.x, d.y, "#cfc0b5", 40);
      }
    }

    toast("Rush Down");
  }

  gateKeeperShockwave(world) {
    const p = game.player;
    const d = distance(this.x, this.y, p.x, p.y);

    if (d < 360 && world.hasLineOfSight(this.x, this.y, p.x, p.y)) {
      p.takeDamage(this.phase2 ? 24 : 18);
    }

    world.particles.burst(this.x, this.y, "#ff9f2e", 65);

    if (SETTINGS.shake) world.shake = 16;

    toast("Shockwave");
  }

  updateBossHUD(world) {
    const bossHud = document.getElementById("bossHud");
    const bossName = document.getElementById("bossName");
    const bossBar = document.getElementById("bossBar");
    const bossPhase = document.getElementById("bossPhase");

    if (!world.isBossMap) {
      if (bossHud) bossHud.classList.add("hidden");
      return;
    }

    if (bossHud) bossHud.classList.remove("hidden");
    if (bossName) bossName.textContent = this.name;

    if (bossBar) {
      bossBar.style.width = `${Math.max(0, (this.hp / this.maxHp) * 100)}%`;
    }

    if (bossPhase) {
      if (this.phase3) bossPhase.textContent = "Final Rage";
      else if (this.phase2) bossPhase.textContent = "Phase II";
      else bossPhase.textContent = "Phase I";
    }
  }

  draw(ctx, camX, camY) {
    if (this.dead) return;

    if (this.throneIntro > 0 && this.name === "The Devil") {
      SpriteRenderer.drawBoss(ctx, this.x - camX, this.y - camY, this, this.frame);
      return;
    }

    SpriteRenderer.drawBoss(ctx, this.x - camX, this.y - camY, this, this.frame);
  }
}

/* ================= HAZARDS ================= */

class Hazard {
  constructor(type, x, y, r) {
    this.type = type;
    this.x = x;
    this.y = y;
    this.r = r;
    this.timer = rand(0, 1400);
    this.frame = 0;
  }

  update(dt, player, world) {
    this.frame += dt;
    this.timer -= dt;

    if (world.isBossMap) return;

    const d = distance(this.x, this.y, player.x, player.y);

    if (this.type === "ash" && d < this.r) {
      player.stamina = clamp(player.stamina - 8 * (dt / 1000), 0, player.maxStamina);
    }

    if (this.type === "lava" && d < this.r) {
      if (this.timer <= 0) {
        player.takeDamage(10);
        this.timer = 1200;
      }
    }

    if (this.type === "void" && d < this.r) {
      if (this.timer <= 0) {
        player.takeDamage(14);
        this.timer = 1300;
      }
    }

    if (this.type === "geyser" && d < this.r) {
      if (this.timer <= 0) {
        player.takeDamage(12);
        world.particles.burst(this.x, this.y, "#ff6a3d", 35);
        this.timer = 1800;
      }
    }

    if (this.type === "debris" && d < this.r) {
      if (this.timer <= 0) {
        player.takeDamage(10);
        world.particles.burst(this.x, this.y, "#cfc0b5", 24);
        this.timer = 1600;
      }
    }
  }

  draw(ctx, camX, camY) {
    const x = this.x - camX;
    const y = this.y - camY;

    ctx.save();

    if (this.type === "ash") {
      SpriteFX.glow(ctx, x, y, this.r, "rgba(170,150,130,0.16)");
      ctx.fillStyle = "rgba(120,105,90,0.18)";
    }

    if (this.type === "lava") {
      SpriteFX.glow(ctx, x, y, this.r + 18, "rgba(255,70,20,0.46)");
      ctx.fillStyle = "rgba(255,70,20,0.34)";
    }

    if (this.type === "geyser") {
      SpriteFX.glow(ctx, x, y, this.r + 20, "rgba(255,90,20,0.42)");
      ctx.fillStyle = "rgba(255,110,30,0.28)";
    }

    if (this.type === "debris") {
      SpriteFX.glow(ctx, x, y, this.r, "rgba(255,255,255,0.09)");
      ctx.fillStyle = "rgba(200,190,180,0.17)";
    }

    if (this.type === "void") {
      SpriteFX.glow(ctx, x, y, this.r + 26, "rgba(255,0,30,0.22)");
      ctx.fillStyle = "rgba(0,0,0,0.52)";
    }

    ctx.beginPath();
    ctx.arc(x, y, this.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }
}

/* ================= WORLD ================= */

class World {
  constructor(levelIndex, mode = "normal") {
    this.levelIndex = levelIndex;
    this.level = getLevel(levelIndex);
    this.mode = mode;
    this.isBossMap = mode === "boss";

    this.currentArena = this.isBossMap ? this.level.bossArenaMap : null;

    const themeId = this.isBossMap ? this.currentArena.theme : this.level.theme;
    this.theme = getTheme(themeId);

    this.width = this.isBossMap ? this.currentArena.width : this.level.width;
    this.height = this.isBossMap ? this.currentArena.height : this.level.height;

    this.cameraX = 0;
    this.cameraY = 0;

    this.enemies = [];
    this.hazards = [];
    this.chests = [];
    this.beams = [];
    this.projectiles = [];
    this.vents = [];
    this.boss = null;

    this.portalUnlocked = false;
    this.portalPulse = 0;

    this.devilsAnger = false;
    this.devilFinal = false;
    this.cerberusShrink = false;
    this.gateKeeperInferno = false;

    this.particles = new ParticleSystem();

    this.shake = 0;
    this.frame = 0;

    this.showMiniMap = true;

    this.decor = this.isBossMap
      ? [...(this.currentArena.decor || [])]
      : [...(MAP_DECOR[this.level.decor] || [])];

    this.generate();
  }

  generate() {
    if (this.isBossMap) {
      this.generateBossMap();
    } else {
      this.generateNormalMap();
    }

    this.updateLevelUI();
  }

  generateNormalMap() {
    this.enemies = [];

    for (const e of this.level.enemies) {
      const safe = this.findNearestSafeSpot(e.x, e.y);
      this.enemies.push(new Enemy(e.type, safe.x, safe.y));
    }

    this.hazards = this.level.hazards.map(h => new Hazard(h.type, h.x, h.y, h.r));
    this.chests = (this.level.chests || []).map(c => new Chest(c.x, c.y, c.potion));

    this.boss = null;
    this.beams = [];
    this.projectiles = [];

    this.addRandomDecor();

    if (game.player) {
      game.player.x = this.level.playerStart.x;
      game.player.y = this.level.playerStart.y;
      game.player.projectiles = [];
      game.player.invincible = 900;
    }

    this.hideBossHUD();
  }

  generateBossMap() {
    const arena = this.currentArena;

    this.enemies = [];
    this.chests = [];
    this.hazards = [];
    this.beams = [];
    this.projectiles = [];
    this.vents = [];

    if (arena.lavaVents) {
      this.vents = arena.lavaVents.map(v => new TimedVent(v.x, v.y, v.r));
    }

    const bossSpot = this.findNearestSafeSpot(arena.bossPos.x, arena.bossPos.y);
    this.boss = new Boss(this.level.boss, bossSpot.x, bossSpot.y);

    if (this.level.boss === "The Devil" && arena.throne) {
      this.boss.x = arena.throne.x;
      this.boss.y = arena.throne.y;
    }

    if (game.player) {
      game.player.x = arena.playerStart.x;
      game.player.y = arena.playerStart.y;
      game.player.projectiles = [];
      game.player.invincible = 1200;
    }

    this.portalUnlocked = false;
    this.showBossHUD();
  }

  addRandomDecor() {
    const count = Math.floor((this.width * this.height) / 170000);

    for (let i = 0; i < count; i++) {
      const x = rand(160, this.width - 160);
      const y = rand(160, this.height - 160);

      if (this.collides(x, y, 36)) continue;

      this.decor.push({
        type: choice(["bonePile", "chain", "candle", "crack"]),
        x,
        y,
        s: rand(0.8, 1.3)
      });
    }
  }

  update(dt) {
    const s = dt / 1000;

    this.frame += dt;
    this.portalPulse += dt;

    if (this.shake > 0) {
      this.shake -= dt * 0.08;
    }

    this.updateCamera();

    for (const h of this.hazards) {
      h.update(dt, game.player, this);
    }

    for (const v of this.vents) {
      v.update(dt, this);
    }

    for (const c of this.chests) {
      c.update(dt, this);
    }

    for (const e of this.enemies) {
      e.update(dt, this);
    }

    this.enemies = this.enemies.filter(e => !e.dead);

    if (this.boss) {
      this.boss.update(dt, this);
    }

    for (const b of this.beams) {
      b.update(dt, this);
    }

    this.beams = this.beams.filter(b => !b.dead);

    for (const p of this.projectiles) {
      p.update(dt, this);
    }

    this.projectiles = this.projectiles.filter(p => !p.dead);

    this.particles.update(dt);

    if (!this.isBossMap && this.enemies.length === 0 && !this.portalUnlocked) {
      this.portalUnlocked = true;
      SoundFX.portal();
      toast("Boss Portal Opened");
    }

    if (!this.isBossMap && this.portalUnlocked && touching(game.player, this.level.portal, 52)) {
      game.enterBossMap();
    }

    if (this.isBossMap && this.boss && this.boss.dead) {
      this.hideBossHUD();
    }
  }

  updateCamera() {
    const p = game.player;

    let targetX = p.x - canvas.width / 2;
    let targetY = p.y - canvas.height / 2;

    targetX = clamp(targetX, 0, Math.max(0, this.width - canvas.width));
    targetY = clamp(targetY, 0, Math.max(0, this.height - canvas.height));

    this.cameraX += (targetX - this.cameraX) * 0.12;
    this.cameraY += (targetY - this.cameraY) * 0.12;

    if (this.shake > 0 && SETTINGS.shake) {
      this.cameraX += rand(-this.shake, this.shake);
      this.cameraY += rand(-this.shake, this.shake);
    }
  }

  collides(x, y, radius = 18) {
    if (x < radius || y < radius || x > this.width - radius || y > this.height - radius) {
      return true;
    }

    for (const d of this.decor) {
      if (
        d.type === "pillar" ||
        d.type === "breakPillar" ||
        d.type === "wall" ||
        d.type === "throne"
      ) {
        if (!d.broken && distance(x, y, d.x, d.y) < (d.r || 46) + radius) {
          return true;
        }
      }
    }

    return false;
  }

  findNearestSafeSpot(x, y) {
    if (!this.collides(x, y, 24)) return { x, y };

    for (let r = 25; r <= 260; r += 25) {
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
        const nx = x + Math.cos(a) * r;
        const ny = y + Math.sin(a) * r;

        if (!this.collides(nx, ny, 24)) {
          return { x: nx, y: ny };
        }
      }
    }

    return { x: this.width / 2, y: this.height / 2 };
  }

  findSafeSpotNear(x, y, minR = 35, maxR = 120) {
    for (let i = 0; i < 40; i++) {
      const a = rand(0, Math.PI * 2);
      const r = rand(minR, maxR);

      const nx = x + Math.cos(a) * r;
      const ny = y + Math.sin(a) * r;

      if (!this.collides(nx, ny, 24)) {
        return { x: nx, y: ny };
      }
    }

    return this.findNearestSafeSpot(x, y);
  }

  hasLineOfSight(x1, y1, x2, y2) {
    const steps = Math.ceil(distance(x1, y1, x2, y2) / 32);

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = x1 + (x2 - x1) * t;
      const y = y1 + (y2 - y1) * t;

      if (this.collides(x, y, 12)) {
        return false;
      }
    }

    return true;
  }

  devilSummon() {
    if (!this.currentArena) return;

    const circles = this.currentArena.summonCircles || [];
    const livingSummons = this.enemies.filter(e => e.type === "hound" || e.type === "gargoyle").length;
    const maxSummons = this.boss?.phase3 ? 4 : 3;

    if (livingSummons >= maxSummons) {
      this.boss.specialCooldown = 1900;
      return;
    }

    const slots = circles.slice(0, maxSummons);

    for (const c of slots) {
      if (this.enemies.length >= maxSummons) break;

      const safe = this.findNearestSafeSpot(c.x, c.y);
      const type = Math.random() < 0.55 ? "hound" : "gargoyle";

      const enemy = new Enemy(type, safe.x, safe.y);
      enemy.awake = true;

      this.enemies.push(enemy);
      this.particles.burst(safe.x, safe.y, "#ff2d1c", 30);
    }

    toast("Summon");
  }

  activateDevilAnger() {
    this.devilsAnger = true;
    toast("Devil's Anger");
    this.particles.burst(this.width / 2, this.height / 2, "#ff2d1c", 80);
  }

  activateDevilFinal() {
    this.devilFinal = true;
    toast("Final Rage");
    this.particles.burst(this.width / 2, this.height / 2, "#ffd078", 110);
  }

  activateCerberusPhase2() {
    this.cerberusShrink = true;

    for (const d of this.decor) {
      if (d.type === "breakPillar" && Math.random() < 0.5) {
        d.broken = true;
        this.particles.burst(d.x, d.y, "#cfc0b5", 32);
      }
    }
  }

  activateGateKeeperPhase2() {
    this.gateKeeperInferno = true;

    if (this.currentArena?.fireLines) {
      for (const l of this.currentArena.fireLines) {
        this.beams.push(
          new BeamAttack(l.x1, l.y1, l.x2, l.y2, 18, "#ff6a3d", 36, 350, 160)
        );
      }
    }
  }

  updateLevelUI() {
    const levelText = document.getElementById("levelText");
    const layerText = document.getElementById("layerText");

    if (levelText) levelText.textContent = `Layer ${this.levelIndex + 1}`;
    if (layerText) layerText.textContent = this.isBossMap ? this.currentArena.name : this.level.short;
  }

  showBossHUD() {
    const bossHud = document.getElementById("bossHud");
    if (bossHud) bossHud.classList.remove("hidden");
  }

  hideBossHUD() {
    const bossHud = document.getElementById("bossHud");
    if (bossHud) bossHud.classList.add("hidden");
  }

  draw(ctx) {
    ctx.save();

    const camX = this.cameraX;
    const camY = this.cameraY;

    this.drawBackground(ctx, camX, camY);
    this.drawDecor(ctx, camX, camY);

    for (const h of this.hazards) {
      h.draw(ctx, camX, camY);
    }

    for (const v of this.vents) {
      v.draw(ctx, camX, camY);
    }

    if (!this.isBossMap) {
      this.drawPortal(ctx, camX, camY);
    }

    for (const c of this.chests) {
      c.draw(ctx, camX, camY);
    }

    for (const e of this.enemies) {
      e.draw(ctx, camX, camY);
    }

    if (this.boss) {
      this.boss.draw(ctx, camX, camY);
    }

    for (const p of this.projectiles) {
      p.draw(ctx, camX, camY);
    }

    for (const b of this.beams) {
      b.draw(ctx, camX, camY);
    }

    this.particles.draw(ctx, camX, camY);

    game.player.draw(ctx, camX, camY);

    this.drawMiniMap(ctx);

    ctx.restore();
  }

  drawBackground(ctx, camX, camY) {
    const theme = this.theme;

    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, theme.bgTop);
    grad.addColorStop(0.55, theme.bgMid);
    grad.addColorStop(1, theme.bgBot);

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const grid = this.isBossMap ? 160 : 120;

    ctx.strokeStyle = theme.grid;
    ctx.lineWidth = 1;

    const startX = -((camX * 0.35) % grid);
    const startY = -((camY * 0.35) % grid);

    for (let x = startX; x < canvas.width; x += grid) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 80, canvas.height);
      ctx.stroke();
    }

    for (let y = startY; y < canvas.height; y += grid) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y + 80);
      ctx.stroke();
    }

    SpriteFX.glow(
      ctx,
      canvas.width / 2,
      canvas.height + 120,
      canvas.height * 0.9,
      theme.glow
    );
  }

  drawDecor(ctx, camX, camY) {
    for (const d of this.decor) {
      const x = d.x - camX;
      const y = d.y - camY;

      if (x < -160 || y < -160 || x > canvas.width + 160 || y > canvas.height + 160) {
        continue;
      }

      ctx.save();

      if (d.type === "pillar" || d.type === "breakPillar") {
        SpriteFX.shadow(ctx, x, y + 28, 46, 12);

        ctx.fillStyle = d.broken ? "rgba(80,60,52,0.5)" : "#241820";
        ctx.fillRect(x - 24, y - 52, 48, 96);

        ctx.fillStyle = d.broken ? "rgba(120,95,80,0.45)" : "#3b2730";
        ctx.fillRect(x - 18, y - 46, 36, 84);

        ctx.strokeStyle = "rgba(255,255,255,0.12)";
        ctx.lineWidth = 2;
        ctx.strokeRect(x - 24, y - 52, 48, 96);

        if (!d.broken) {
          SpriteFX.glow(ctx, x, y - 30, 36, "rgba(255,120,30,0.18)");
        }
      } else if (d.type === "wall") {
        ctx.fillStyle = "#090506";
        ctx.fillRect(x - d.w / 2, y - d.h / 2, d.w, d.h);

        ctx.strokeStyle = "rgba(255,255,255,0.1)";
        ctx.strokeRect(x - d.w / 2, y - d.h / 2, d.w, d.h);
      } else if (d.type === "throne") {
        SpriteFX.glow(ctx, x, y, 110, "rgba(255,0,30,0.28)");
        ctx.fillStyle = "#0b0506";
        ctx.fillRect(x - 70, y - 110, 140, 190);
        ctx.fillStyle = "#241820";
        ctx.fillRect(x - 44, y - 72, 88, 128);
        ctx.fillStyle = "#ff2d1c";
        ctx.fillRect(x - 6, y - 94, 12, 44);
      } else if (d.type === "bonePile") {
        ctx.fillStyle = "rgba(207,192,181,0.28)";
        ctx.fillRect(x - 16, y - 6, 32, 8);
        ctx.fillRect(x - 10, y - 16, 7, 28);
        ctx.fillRect(x + 7, y - 14, 7, 26);
      } else if (d.type === "chain") {
        ctx.strokeStyle = "rgba(207,192,181,0.23)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x, y - 30);
        ctx.lineTo(x + 10, y + 26);
        ctx.stroke();
      } else if (d.type === "candle") {
        ctx.fillStyle = "#f8efe7";
        ctx.fillRect(x - 3, y - 12, 6, 18);
        SpriteFX.glow(ctx, x, y - 15, 28, "rgba(255,159,46,0.32)");
        ctx.fillStyle = "#ff9f2e";
        ctx.fillRect(x - 2, y - 18, 4, 7);
      } else if (d.type === "crack") {
        ctx.strokeStyle = "rgba(255,90,30,0.16)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - 24, y);
        ctx.lineTo(x - 4, y + 12);
        ctx.lineTo(x + 12, y - 6);
        ctx.lineTo(x + 28, y + 8);
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  drawPortal(ctx, camX, camY) {
    const portal = this.level.portal;
    const x = portal.x - camX;
    const y = portal.y - camY;

    if (!this.portalUnlocked) {
      ctx.save();
      ctx.globalAlpha = 0.28;
      SpriteFX.glow(ctx, x, y, 55, "rgba(255,255,255,0.12)");
      ctx.strokeStyle = "rgba(255,255,255,0.22)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(x, y, 32, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      return;
    }

    const pulse = Math.sin(this.portalPulse / 180) * 0.5 + 0.5;

    SpriteFX.glow(ctx, x, y, 92 + pulse * 24, "rgba(255,90,20,0.42)");

    ctx.save();
    ctx.strokeStyle = "#ff9f2e";
    ctx.lineWidth = 5;
    ctx.shadowColor = "#ff6a3d";
    ctx.shadowBlur = 26;
    ctx.beginPath();
    ctx.arc(x, y, 34 + pulse * 5, 0, Math.PI * 2);
    ctx.stroke();

    ctx.font = "800 12px Inter, sans-serif";
    ctx.fillStyle = "#ffd078";
    ctx.textAlign = "center";
    ctx.fillText("BOSS", x, y - 48);

    ctx.restore();
  }

  drawMiniMap(ctx) {
    if (!this.showMiniMap) return;

    const w = 150;
    const h = 96;
    const x = canvas.width - w - 16;
    const y = 16;

    ctx.save();

    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(x, y, w, h);

    ctx.strokeStyle = "rgba(255,255,255,0.14)";
    ctx.strokeRect(x, y, w, h);

    const sx = w / this.width;
    const sy = h / this.height;

    ctx.fillStyle = "#ff3b24";
    ctx.fillRect(x + game.player.x * sx - 3, y + game.player.y * sy - 3, 6, 6);

    if (this.boss && !this.boss.dead) {
      ctx.fillStyle = "#ffd078";
      ctx.fillRect(x + this.boss.x * sx - 4, y + this.boss.y * sy - 4, 8, 8);
    }

    ctx.restore();
  }
}

/* ================= GAME MANAGER ================= */

class Game {
  constructor() {
    this.player = null;
    this.world = null;

    this.levelIndex = 0;
    this.selectedClass = "warrior";

    this.running = false;
    this.paused = false;
    this.dead = false;

    this.deaths = 0;

    this.last = 0;
    this.rafId = null;

    this.bindUI();
  }

  bindUI() {
    document.querySelectorAll("button").forEach(btn => {
      btn.addEventListener("click", () => {
        SoundFX.unlock();
        SoundFX.click();
      });
    });

    document.getElementById("btnPlay")?.addEventListener("click", () => {
      showScreen("screen-class");
    });

    document.getElementById("btnStory")?.addEventListener("click", () => {
      showScreen("screen-story");
    });

    document.getElementById("btnInstructions")?.addEventListener("click", () => {
      showScreen("screen-instructions");
    });

    document.getElementById("btnSettings")?.addEventListener("click", () => {
      showScreen("screen-settings");
    });

    document.querySelectorAll(".back-menu").forEach(btn => {
      btn.addEventListener("click", () => {
        showScreen("screen-menu");
        MusicManager.play("menu");
      });
    });

    document.querySelectorAll(".class-card").forEach(card => {
      card.addEventListener("click", () => this.start(card.dataset.class));
    });

    document.getElementById("btnResume")?.addEventListener("click", () => this.resume());
    document.getElementById("btnSkillTree")?.addEventListener("click", () => this.openSkills());
    document.getElementById("btnRestart")?.addEventListener("click", () => this.restartRun());
    document.getElementById("btnMenuFromPause")?.addEventListener("click", () => location.reload());
    document.getElementById("btnCloseSkills")?.addEventListener("click", () => this.resume());

    document.querySelectorAll(".skill-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        if (!this.player) return;

        this.player.learn(btn.dataset.skill);
        this.updateSkillScreen();
      });
    });

    const tryAgain = document.getElementById("btnTryAgain");

    if (tryAgain) {
      tryAgain.textContent = "Respawn";
      tryAgain.addEventListener("click", () => this.respawnCurrentLevel());
    }

    const menuBtn = document.getElementById("btnGameOverMenu");

    if (menuBtn) {
      menuBtn.textContent = "Back To Main Menu";
      menuBtn.addEventListener("click", () => location.reload());
    }

    document.getElementById("btnPlayAgain")?.addEventListener("click", () => this.restartRun());
    document.getElementById("btnVictoryMenu")?.addEventListener("click", () => location.reload());

    document.getElementById("brightnessSlider")?.addEventListener("input", e => {
      const val = Number(e.target.value);
      const overlay = document.getElementById("brightnessOverlay");

      if (!overlay) return;

      if (val < 100) {
        overlay.style.background = `rgba(0,0,0,${(100 - val) / 130})`;
      } else {
        overlay.style.background = `rgba(255,160,80,${(val - 100) / 230})`;
      }
    });

    document.getElementById("shakeToggle")?.addEventListener("change", e => {
      SETTINGS.shake = e.target.checked;
    });

    document.getElementById("particleToggle")?.addEventListener("change", e => {
      SETTINGS.particles = e.target.checked;
    });
  }

  start(classId) {
    this.selectedClass = classId;

    this.player = new Player(classId);
    this.levelIndex = 0;
    this.world = new World(this.levelIndex, "normal");

    this.running = true;
    this.paused = false;
    this.dead = false;
    this.deaths = 0;

    document.getElementById("bossHud")?.classList.add("hidden");

    showScreen("screen-game");
    MusicManager.playForLevel(this.levelIndex);
    toast("Begin");

    this.updateHUD();
    this.startLoop();
  }

  startLoop() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    this.last = performance.now();
    this.rafId = requestAnimationFrame(t => this.loop(t));
  }

  restartRun() {
    this.player = new Player(this.selectedClass || "warrior");
    this.levelIndex = 0;
    this.world = new World(0, "normal");

    this.running = true;
    this.paused = false;
    this.dead = false;
    this.deaths = 0;

    document.getElementById("bossHud")?.classList.add("hidden");

    showScreen("screen-game");
    MusicManager.playForLevel(this.levelIndex);
    toast("Restarted");

    this.updateHUD();
    this.startLoop();
  }

  enterBossMap() {
    SoundFX.portal();

    this.world = new World(this.levelIndex, "boss");

    document.getElementById("bossHud")?.classList.remove("hidden");

    toast(LEVELS[this.levelIndex].bossArenaMap.name);

    this.updateHUD();
  }

  respawnCurrentLevel() {
    if (!this.player) {
      this.restartRun();
      return;
    }

    this.player.hp = this.player.maxHp;
    this.player.stamina = this.player.maxStamina;
    this.player.blockHp = this.player.blockMax;
    this.player.blockBroken = false;
    this.player.blockRegenTimer = 0;
    this.player.projectiles = [];
    this.player.invincible = 1200;
    this.player.speedBoostTimer = 0;
    this.player.attackBoostTimer = 0;
    this.player.stunned = 0;

    this.world = new World(this.levelIndex, "normal");

    this.running = true;
    this.paused = false;
    this.dead = false;

    document.getElementById("bossHud")?.classList.add("hidden");

    showScreen("screen-game");
    MusicManager.playForLevel(this.levelIndex);
    toast("Respawned");

    this.updateHUD();
    this.startLoop();
  }

  gameOver() {
    if (this.dead) return;

    this.dead = true;
    this.running = false;
    this.paused = false;
    this.deaths++;

    document.getElementById("bossHud")?.classList.add("hidden");

    const stats = document.getElementById("gameoverStats");

    if (stats) {
      stats.textContent =
        `Deaths ${this.deaths} · Level ${this.player.level} · Kills ${this.player.kills} · Souls ${this.player.totalSouls}`;
    }

    showScreen("screen-gameover");
  }

  loop(t) {
    if (!this.running) return;

    const dt = Math.min(34, t - this.last);
    this.last = t;

    if (!this.paused) {
      this.update(dt);
      this.draw();
    }

    this.rafId = requestAnimationFrame(time => this.loop(time));
  }

  update(dt) {
    if (!this.player || !this.world) return;

    this.player.update(dt, this.world);
    this.world.update(dt);
    this.updateHUD();
  }

  draw() {
    if (!this.world) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.world.draw(ctx);
  }

  updateHUD() {
    if (!this.player) return;

    const p = this.player;

    const hpBar = document.getElementById("hpBar");
    const staminaBar = document.getElementById("staminaBar");
    const hpText = document.getElementById("hpText");
    const staminaText = document.getElementById("staminaText");
    const classBadge = document.getElementById("classBadge");
    const soulText = document.getElementById("soulText");
    const levelText = document.getElementById("levelText");
    const pointText = document.getElementById("pointText");
    const weaponText = document.getElementById("weaponText");

    if (hpBar) hpBar.style.width = `${(p.hp / p.maxHp) * 100}%`;
    if (staminaBar) staminaBar.style.width = `${(p.stamina / p.maxStamina) * 100}%`;

    if (hpText) hpText.textContent = `${Math.ceil(p.hp)}/${p.maxHp}`;
    if (staminaText) staminaText.textContent = `${Math.ceil(p.stamina)}/${p.maxStamina}`;
    if (classBadge) classBadge.textContent = p.className.toUpperCase();
    if (soulText) soulText.textContent = p.souls;
    if (levelText) levelText.textContent = p.level;
    if (pointText) pointText.textContent = p.skillPoints;
    if (weaponText) weaponText.textContent = p.weaponName;
  }

  pause() {
    if (this.dead) return;

    this.paused = true;
    showScreen("screen-pause");
  }

  resume() {
    this.paused = false;
    showScreen("screen-game");
  }

  openSkills() {
    if (this.dead) return;

    this.paused = true;
    this.updateSkillScreen();
    showScreen("screen-skills");
  }

  updateSkillScreen() {
    if (!this.player) return;

    const info = document.getElementById("skillInfo");

    if (info) {
      info.textContent = `Skill Points: ${this.player.skillPoints}`;
    }

    document.querySelectorAll(".skill-btn").forEach(btn => {
      const skill = btn.dataset.skill;
      const count = this.player.skills[skill] || 0;

      const label = btn.dataset.baseText || btn.textContent.split(" • ")[0];
      btn.dataset.baseText = label;

      btn.textContent = `${label} • ${count}/20`;

      if (skill === "damage" && this.player.classId === "mage") {
        btn.disabled = true;
        btn.textContent = "Damage • Not for Mage";
      } else if (skill === "magic" && this.player.classId !== "mage") {
        btn.disabled = true;
        btn.textContent = "Magic • Mage Only";
      } else {
        btn.disabled = false;
      }
    });
  }

  completeLevel() {
    document.getElementById("bossHud")?.classList.add("hidden");

    if (this.levelIndex === LEVELS.length - 1) {
      this.victory();
      return;
    }

    this.player.upgradeWeapon();

    this.levelIndex++;
    this.world = new World(this.levelIndex, "normal");

    MusicManager.playForLevel(this.levelIndex);
    toast(LEVELS[this.levelIndex].short);
    this.updateHUD();
  }

  victory() {
    this.running = false;

    const stats = document.getElementById("victoryStats");

    if (stats) {
      stats.textContent =
        `Final Level ${this.player.level} · Deaths ${this.deaths} · Kills ${this.player.kills} · Souls ${this.player.totalSouls}`;
    }

    showScreen("screen-victory");
  }
}

const game = new Game();
window.game = game;

MusicManager.play("menu");