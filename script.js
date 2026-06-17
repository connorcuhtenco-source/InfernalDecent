"use strict";

/* ============================================================
   INFERNAL DESCENT — BOSS ARENA + SOUND + BLOCK BUILD
   Requires:
   1. sprites.js
   2. levels.js
   3. script.js

   Added:
   - Boss arena opens only after all mobs are killed
   - Boss spawns only inside the arena
   - Boss HP is 5x
   - Mob HP is 2x
   - Button click sounds
   - Attack / special / chest sounds
   - Cyclops and Devil beams no longer auto-track
   - Mobs path around obstacles better
   - Block shield absorbs 50 damage, breaks, then regens after 5s
   - Game over screen shows respawn/back menu
   - Respawn restarts the current level and respawns enemies
   - Boss health bar only appears inside boss arena
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
});

window.addEventListener("keyup", e => {
  keys[e.code] = false;
});

function held(code) {
  return !!keys[code];
}

function once(code) {
  const value = !!pressed[code];
  pressed[equivalentCodeFix(code)] = false;
  pressed[code] = false;
  return value;
}

function equivalentCodeFix(code) {
  return code;
}

/* ================= HELPERS ================= */

const SOULS_PER_LEVEL = 5;

const SETTINGS = {
  shake: true,
  particles: true,
  sound: true
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

  bossOpen() {
    this.tone(180, 0.12, "sawtooth", 0.065);

    setTimeout(() => {
      this.tone(420, 0.16, "triangle", 0.075);
    }, 120);
  }
};

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

/* ================= BEAM ATTACKS ================= */

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

    this.blocking = held("KeyQ") && this.stamina > 5 && !this.blockBroken;

    if (this.blocking) {
      this.stamina = clamp(this.stamina - 12 * s, 0, this.maxStamina);
    } else {
      this.stamina = clamp(this.stamina + 22 * s, 0, this.maxStamina);
    }

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

    if (once("Space")) this.attack(world);
    if (once("KeyE")) this.special(world);
    if (once("KeyR")) game.openSkills();
    if (once("Escape")) game.pause();

    for (const p of this.projectiles) {
      p.update(dt, world);
    }

    this.projectiles = this.projectiles.filter(p => !p.dead);
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

    if (world.boss && !world.boss.dead && world.inBossArena) {
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

    if (world.boss && !world.boss.dead && world.inBossArena) {
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

    if (world.boss && !world.boss.dead && world.inBossArena && touching(this, world.boss, this.radius + 30)) {
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
    if (world.inBossArena) return;

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

    if (!this.awake) {
      return;
    }

    if (d > detectRange * 1.55) {
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

    let moved = false;

    for (const a of attempts) {
      const nx = this.x + a.x * step;
      const ny = this.y + a.y * step;

      if (!world.collides(nx, ny, 20)) {
        this.x = nx;
        this.y = ny;
        moved = true;
        break;
      }
    }

    const movement = distance(this.x, this.y, this.lastX, this.lastY);

    if (movement < 0.2) {
      this.stuckTimer += dt;
    } else {
      this.stuckTimer = 0;
    }

    if (this.stuckTimer > 700) {
      const p = world.findSafeSpotNear(this.x, this.y, 45, 110);
      this.x = p.x;
      this.y = p.y;
      this.stuckTimer = 0;
    }

    this.lastX = this.x;
    this.lastY = this.y;
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

/* ================= BOSSES ================= */

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

    this.cooldown = 1500;

    this.dead = false;
    this.phase2 = false;
    this.frame = 0;
  }

  takeDamage(amount) {
    this.hp -= amount;

    if (!this.phase2 && this.hp <= this.maxHp * 0.5) {
      this.phase2 = true;
      toast("Phase II");

      if (SETTINGS.shake) {
        game.world.shake = 20;
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
    if (!world.inBossArena) return;

    this.frame += dt;
    this.cooldown -= dt;

    const player = game.player;
    const d = distance(this.x, this.y, player.x, player.y);

    this.updateBossHUD(world);

    if (d > 95) {
      const dx = (player.x - this.x) / (d || 1);
      const dy = (player.y - this.y) / (d || 1);

      const speed = this.phase2 ? 132 : 96;

      this.moveSmart(world, dx, dy, speed, dt);
    }

    if (this.cooldown <= 0) {
      this.attack(player, world, d);
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

  updateBossHUD(world) {
    const bossHud = document.getElementById("bossHud");
    const bossName = document.getElementById("bossName");
    const bossBar = document.getElementById("bossBar");
    const bossPhase = document.getElementById("bossPhase");

    if (!world.inBossArena) {
      if (bossHud) bossHud.classList.add("hidden");
      return;
    }

    if (bossHud) bossHud.classList.remove("hidden");
    if (bossName) bossName.textContent = this.name;

    if (bossBar) {
      bossBar.style.width = `${Math.max(0, (this.hp / this.maxHp) * 100)}%`;
    }

    if (bossPhase) {
      bossPhase.textContent = this.phase2 ? "Phase II" : "Phase I";
    }
  }

  attack(player, world, d) {
    if (this.name === "The Gate Keeper") {
      if (Math.random() > 0.5) {
        if (touching(this, player, 50)) {
          player.takeDamage(this.phase2 ? 34 : 20);
        }

        toast("Rush");
      } else {
        if (touching(this, player, 48)) {
          player.takeDamage(this.phase2 ? 25 : 15);
        }

        toast("Swing");
      }

      this.cooldown = this.phase2 ? 1250 : 1650;
      return;
    }

    if (this.name === "Alpha Cerberus") {
      const move = Math.floor(Math.random() * (this.phase2 ? 3 : 2));

      if (move === 0) {
        const roarRange = this.phase2 ? 210 : 165;

        if (d <= roarRange) {
          player.takeDamage(this.phase2 ? 16 : 11);
          world.particles.burst(player.x, player.y, "#ff6a3d", 18);
        }

        toast("Roar");
      }

      if (move === 1) {
        if (touching(this, player, 60)) {
          player.takeDamage(25);
        }

        toast("Bite");
      }

      if (move === 2) {
        if (world.hasLineOfSight(this.x, this.y, player.x, player.y)) {
          world.beams.push(
            new BeamAttack(
              this.x,
              this.y - 25,
              player.x,
              player.y,
              30,
              "#ff6a3d",
              28,
              600,
              170
            )
          );
        }

        toast("Beam");
      }

      this.cooldown = this.phase2 ? 1350 : 1950;
      return;
    }

    if (this.name === "The Devil") {
      const move = Math.floor(Math.random() * (this.phase2 ? 3 : 2));

      if (move === 0) {
        if (touching(this, player, 54)) {
          player.takeDamage(22);
        }

        toast("Lunge");
      }

      if (move === 1) {
        if (world.hasLineOfSight(this.x, this.y, player.x, player.y)) {
          world.beams.push(
            new BeamAttack(
              this.x,
              this.y - 45,
              player.x,
              player.y,
              28,
              "#ff2d1c",
              30,
              650,
              180
            )
          );
        }

        toast("Devil Beam");
      }

      if (move === 2) {
        toast("Summon");

        if (world.enemies.length < 3) {
          for (let i = 0; i < 2; i++) {
            const p = world.findSafeSpotNear(this.x, this.y, 180, 320);

            const summoned = new Enemy(choice(["hound", "gargoyle"]), p.x, p.y);
            summoned.awake = true;
            world.enemies.push(summoned);
          }
        }
      }

      this.cooldown = this.phase2 ? 1150 : 1650;
      return;
    }

    if (touching(this, player, 46)) {
      player.takeDamage(this.damage);
    }

    this.cooldown = 1450;
  }

  draw(ctx, camX, camY) {
    if (this.dead) return;

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

    if (world.inBossArena) return;

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
  constructor(levelIndex) {
    this.levelIndex = levelIndex;
    this.level = getLevel(levelIndex);
    this.theme = getTheme(this.level.theme);

    this.width = this.level.width;
    this.height = this.level.height;

    this.cameraX = 0;
    this.cameraY = 0;

    this.enemies = [];
    this.hazards = [];
    this.chests = [];
    this.beams = [];
    this.boss = null;

    this.bossArenaUnlocked = false;
    this.inBossArena = false;
    this.bossArenaEntered = false;

    this.particles = new ParticleSystem();

    this.shake = 0;
    this.frame = 0;

    this.showMiniMap = true;

    this.decor = [...(MAP_DECOR[this.level.decor] || [])];

    this.generate();
  }

  generate() {
    this.enemies = [];

    for (const e of this.level.enemies) {
      const safe = this.findNearestSafeSpot(e.x, e.y);
      this.enemies.push(new Enemy(e.type, safe.x, safe.y));
    }

    this.hazards = this.level.hazards.map(h => new Hazard(h.type, h.x, h.y, h.r));

    this.chests = (this.level.chests || []).map(c => new Chest(c.x, c.y, c.potion));

    this.boss = null;
    this.beams = [];

    this.addRandomDecor();

    if (game.player) {
      game.player.x = this.level.playerStart.x;
      game.player.y = this.level.playerStart.y;
      game.player.projectiles = [];
      game.player.invincible = 900;
    }

    this.hideBossHUD();
    this.updateLevelUI();
  }

  addRandomDecor() {
    const max = this.levelIndex === 0 ? 4 : 10;

    for (let i = 0; i < max; i++) {
      const p = this.findSafeOpenSpot();

      this.decor.push({
        type: choice(["rubble", "barricade"]),
        x: p.x,
        y: p.y,
        w: rand(85, 135),
        h: rand(55, 95)
      });
    }
  }

  updateLevelUI() {
    const layerTitle = document.getElementById("layerTitle");
    const objectiveText = document.getElementById("objectiveText");

    if (layerTitle) layerTitle.textContent = this.level.short;

    if (objectiveText) {
      objectiveText.textContent = this.inBossArena
        ? this.level.bossObjective
        : this.level.objective;
    }
  }

  hideBossHUD() {
    document.getElementById("bossHud")?.classList.add("hidden");
  }

  isBlockingType(type) {
    return ["wall", "column", "pillar", "throne", "rubble", "barricade"].includes(type);
  }

  pointInsideBossArena(x, y) {
    const a = this.level.bossArena;
    if (!a) return false;

    return x > a.x && x < a.x + a.w && y > a.y && y < a.y + a.h;
  }

  collides(x, y, radius = 18) {
    if (x < 70 || y < 70 || x > this.width - 70 || y > this.height - 70) {
      return true;
    }

    const arena = this.level.bossArena;

    if (arena) {
      const insideArena = this.pointInsideBossArena(x, y);

      if (!this.inBossArena && insideArena) {
        return true;
      }

      if (this.inBossArena) {
        if (
          x < arena.x + 45 ||
          x > arena.x + arena.w - 45 ||
          y < arena.y + 45 ||
          y > arena.y + arena.h - 45
        ) {
          return true;
        }
      }
    }

    for (const d of this.decor) {
      if (!this.isBlockingType(d.type)) continue;

      const w = d.w || 115;
      const h = d.h || 115;

      const left = d.x - w / 2 - radius;
      const right = d.x + w / 2 + radius;
      const top = d.y - h / 2 - radius;
      const bottom = d.y + h / 2 + radius;

      if (x > left && x < right && y > top && y < bottom) {
        return true;
      }
    }

    return false;
  }

  findNearestSafeSpot(x, y) {
    if (!this.collides(x, y, 22)) {
      return { x, y };
    }

    for (let r = 40; r <= 380; r += 35) {
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
        const nx = x + Math.cos(a) * r;
        const ny = y + Math.sin(a) * r;

        if (!this.collides(nx, ny, 22)) {
          return { x: nx, y: ny };
        }
      }
    }

    return {
      x: this.level.playerStart.x + 140,
      y: this.level.playerStart.y
    };
  }

  findSafeOpenSpot() {
    for (let i = 0; i < 80; i++) {
      const x = rand(420, this.width - 420);
      const y = rand(420, this.height - 420);

      if (this.collides(x, y, 50)) continue;

      if (distance(x, y, this.level.playerStart.x, this.level.playerStart.y) < 350) {
        continue;
      }

      if (this.level.bossArena && this.pointInsideBossArena(x, y)) {
        continue;
      }

      let tooClose = false;

      for (const e of this.level.enemies) {
        if (distance(x, y, e.x, e.y) < 130) {
          tooClose = true;
          break;
        }
      }

      if (!tooClose) return { x, y };
    }

    return {
      x: rand(500, this.width - 500),
      y: rand(500, this.height - 500)
    };
  }

  findSafeSpotNear(x, y, minRadius = 120, maxRadius = 320) {
    for (let i = 0; i < 60; i++) {
      const angle = rand(0, Math.PI * 2);
      const r = rand(minRadius, maxRadius);

      const nx = x + Math.cos(angle) * r;
      const ny = y + Math.sin(angle) * r;

      if (!this.collides(nx, ny, 26)) {
        return { x: nx, y: ny };
      }
    }

    return this.findNearestSafeSpot(x, y);
  }

  hasLineOfSight(x1, y1, x2, y2) {
    const d = distance(x1, y1, x2, y2);
    const steps = Math.max(6, Math.floor(d / 42));

    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const x = x1 + (x2 - x1) * t;
      const y = y1 + (y2 - y1) * t;

      if (this.collides(x, y, 8)) {
        return false;
      }
    }

    return true;
  }

  update(dt) {
    this.frame += dt;

    this.particles.update(dt);

    for (const b of this.beams) {
      b.update(dt, this);
    }

    this.beams = this.beams.filter(b => !b.dead);

    for (const h of this.hazards) {
      h.update(dt, game.player, this);
    }

    for (const c of this.chests) {
      c.update(dt, this);
    }

    for (const e of this.enemies) {
      e.update(dt, this);
    }

    this.enemies = this.enemies.filter(e => !e.dead);

    if (!this.bossArenaUnlocked && this.enemies.length === 0 && !this.inBossArena) {
      this.bossArenaUnlocked = true;
      SoundFX.bossOpen();
      toast("Boss Arena Open");
      this.updateLevelUI();
    }

    this.checkBossArenaEntry();

    if (this.boss && !this.boss.dead) {
      this.boss.update(dt, this);
    }

    this.cameraX += (game.player.x - canvas.width / 2 - this.cameraX) * 0.08;
    this.cameraY += (game.player.y - canvas.height / 2 - this.cameraY) * 0.08;

    this.cameraX = clamp(this.cameraX, 0, Math.max(0, this.width - canvas.width));
    this.cameraY = clamp(this.cameraY, 0, Math.max(0, this.height - canvas.height));
  }

  checkBossArenaEntry() {
    if (!this.bossArenaUnlocked) return;
    if (this.inBossArena) return;

    const a = this.level.bossArena;
    if (!a) return;

    const d = distance(game.player.x, game.player.y, a.entranceX, a.entranceY);

    if (d < 70) {
      this.enterBossArena();
    }
  }

  enterBossArena() {
    const a = this.level.bossArena;

    this.inBossArena = true;
    this.bossArenaEntered = true;

    game.player.x = a.playerSpawn.x;
    game.player.y = a.playerSpawn.y;
    game.player.projectiles = [];
    game.player.invincible = 1000;

    this.beams = [];
    this.enemies = [];

    const bossSpot = this.findNearestSafeSpot(a.bossPos.x, a.bossPos.y);
    this.boss = new Boss(this.level.boss, bossSpot.x, bossSpot.y);

    this.updateLevelUI();

    toast(this.level.boss);
  }

  draw(ctx) {
    let shakeX = 0;
    let shakeY = 0;

    if (this.shake > 0 && SETTINGS.shake) {
      shakeX = rand(-this.shake, this.shake);
      shakeY = rand(-this.shake, this.shake);
      this.shake *= 0.82;
    }

    ctx.save();
    ctx.translate(shakeX, shakeY);

    this.drawFloor(ctx);
    this.drawDecor(ctx);
    this.drawBossGate(ctx);

    for (const h of this.hazards) {
      h.draw(ctx, this.cameraX, this.cameraY);
    }

    for (const c of this.chests) {
      c.draw(ctx, this.cameraX, this.cameraY);
    }

    for (const e of this.enemies) {
      e.draw(ctx, this.cameraX, this.cameraY);
    }

    if (this.boss && !this.boss.dead) {
      this.boss.draw(ctx, this.cameraX, this.cameraY);
    }

    game.player.draw(ctx, this.cameraX, this.cameraY);

    for (const b of this.beams) {
      b.draw(ctx, this.cameraX, this.cameraY);
    }

    this.particles.draw(ctx, this.cameraX, this.cameraY);

    this.drawMiniMap(ctx);

    ctx.restore();
  }

  drawFloor(ctx) {
    const t = this.theme;

    ctx.fillStyle = t.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const startX = -this.cameraX % TILE;
    const startY = -this.cameraY % TILE;

    for (let x = startX - TILE; x < canvas.width + TILE; x += TILE) {
      for (let y = startY - TILE; y < canvas.height + TILE; y += TILE) {
        const wx = x + this.cameraX;
        const wy = y + this.cameraY;

        const n =
          Math.sin(wx * 0.012) +
          Math.cos(wy * 0.015) +
          Math.sin((wx + wy) * 0.006);

        ctx.fillStyle = n > 0.25 ? t.floor : t.floor2;
        ctx.fillRect(x, y, TILE - 2, TILE - 2);

        ctx.strokeStyle = t.seam;
        ctx.strokeRect(x, y, TILE - 2, TILE - 2);

        ctx.fillStyle = "rgba(255,255,255,0.025)";
        ctx.fillRect(x + 6, y + 8, 7, 7);

        ctx.fillStyle = "rgba(0,0,0,0.17)";
        ctx.fillRect(x + 25, y + 18, 11, 4);

        ctx.fillStyle = "rgba(255,120,40,0.035)";
        ctx.fillRect(x + 31, y + 32, 6, 6);

        if (Math.abs(n) > 1.2) {
          ctx.fillStyle = "rgba(255,255,255,0.035)";
          ctx.fillRect(x + 14, y + 32, 18, 3);
        }
      }
    }

    const glow = ctx.createRadialGradient(
      canvas.width / 2,
      canvas.height / 2,
      40,
      canvas.width / 2,
      canvas.height / 2,
      canvas.height * 0.9
    );

    glow.addColorStop(0, "transparent");
    glow.addColorStop(1, t.glow);

    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = t.fog;

    for (let i = 0; i < 18; i++) {
      const fx = (i * 241 - this.cameraX * 0.13 + this.frame * 0.012) % canvas.width;
      const fy = (i * 157 - this.cameraY * 0.12) % canvas.height;

      ctx.beginPath();
      ctx.arc(fx, fy, 70 + Math.sin(this.frame / 900 + i) * 18, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawBossGate(ctx) {
    const a = this.level.bossArena;
    if (!a) return;

    const x = a.entranceX - this.cameraX;
    const y = a.entranceY - this.cameraY;

    ctx.save();

    if (this.bossArenaUnlocked && !this.inBossArena) {
      SpriteFX.glow(ctx, x, y, 90, "rgba(255,159,46,0.45)");

      ctx.strokeStyle = "#ff9f2e";
      ctx.lineWidth = 5;

      ctx.beginPath();
      ctx.arc(x, y, 46 + Math.sin(this.frame / 180) * 4, 0, Math.PI * 2);
      ctx.stroke();

      ctx.font = "800 12px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(255,240,210,0.9)";
      ctx.fillText("BOSS ARENA", x, y - 62);
    } else if (!this.inBossArena) {
      ctx.globalAlpha = 0.55;

      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.beginPath();
      ctx.arc(x, y, 44, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.font = "700 11px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      ctx.fillText(`${this.enemies.length} enemies left`, x, y - 58);
    }

    ctx.restore();
  }

  drawDecor(ctx) {
    for (const d of this.decor) {
      const x = d.x - this.cameraX;
      const y = d.y - this.cameraY;

      if (x < -300 || y < -300 || x > canvas.width + 300 || y > canvas.height + 300) {
        continue;
      }

      if (d.type === "room") {
        ctx.fillStyle = "rgba(255,255,255,0.025)";
        ctx.fillRect(x, y, d.w, d.h);

        ctx.strokeStyle = "rgba(255,255,255,0.05)";
        ctx.strokeRect(x, y, d.w, d.h);
      }

      if (d.type === "corridor") {
        ctx.fillStyle = "rgba(255,255,255,0.018)";
        ctx.fillRect(x, y, d.w, d.h);
      }

      if (d.type === "wall" || d.type === "barricade" || d.type === "rubble") {
        SpriteFX.shadow(ctx, x, y + 28, d.w * 0.42, 12);

        ctx.fillStyle = this.theme.wall;
        ctx.fillRect(x - d.w / 2, y - d.h / 2, d.w, d.h);

        ctx.fillStyle = "rgba(255,255,255,0.05)";
        ctx.fillRect(x - d.w / 2 + 8, y - d.h / 2 + 8, d.w * 0.45, 5);

        ctx.strokeStyle = "rgba(255,255,255,0.09)";
        ctx.strokeRect(x - d.w / 2, y - d.h / 2, d.w, d.h);
      }

      if (d.type === "pillar" || d.type === "column") {
        SpriteFX.shadow(ctx, x, y + 34, 38, 12);

        ctx.fillStyle = this.theme.wall;
        ctx.fillRect(x - 30, y - 52, 60, 104);

        ctx.fillStyle = "rgba(255,255,255,0.08)";
        ctx.fillRect(x - 20, y - 44, 8, 88);
        ctx.fillRect(x + 12, y - 44, 8, 88);

        ctx.strokeStyle = "rgba(255,255,255,0.1)";
        ctx.strokeRect(x - 30, y - 52, 60, 104);
      }

      if (d.type === "crystal") {
        SpriteFX.glow(ctx, x, y, 75, "rgba(255,90,20,0.32)");

        ctx.fillStyle = "#ff6a3d";
        ctx.beginPath();
        ctx.moveTo(x, y - 58);
        ctx.lineTo(x + 28, y + 12);
        ctx.lineTo(x, y + 48);
        ctx.lineTo(x - 28, y + 12);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = "#ffd078";
        ctx.fillRect(x - 5, y - 20, 10, 34);
      }

      if (d.type === "lavaRiver") {
        SpriteFX.glow(ctx, x + d.w / 2, y + d.h / 2, 160, "rgba(255,70,20,0.34)");

        ctx.fillStyle = "rgba(255,70,20,0.34)";
        ctx.fillRect(x, y, d.w, d.h);

        ctx.fillStyle = "rgba(255,220,100,0.18)";
        ctx.fillRect(x + d.w * 0.35, y, d.w * 0.16, d.h);
      }

      if (d.type === "carpet") {
        ctx.fillStyle = "rgba(150,20,18,0.52)";
        ctx.fillRect(x, y, d.w, d.h);

        ctx.fillStyle = "rgba(255,150,70,0.16)";
        ctx.fillRect(x, y + d.h / 2 - 8, d.w, 16);

        ctx.strokeStyle = "rgba(255,200,130,0.15)";
        ctx.strokeRect(x, y, d.w, d.h);
      }

      if (d.type === "throne") {
        SpriteFX.glow(ctx, x, y, 120, "rgba(255,0,30,0.25)");

        ctx.fillStyle = "#070307";
        ctx.fillRect(x - 65, y - 85, 130, 170);

        ctx.fillStyle = "#1a0b10";
        ctx.fillRect(x - 45, y - 40, 90, 125);

        ctx.strokeStyle = "#ff9f2e";
        ctx.strokeRect(x - 65, y - 85, 130, 170);
      }

      if (d.type === "platform") {
        ctx.fillStyle = "#16191f";
        ctx.fillRect(x, y, d.w, d.h);

        ctx.strokeStyle = "rgba(210,225,255,0.18)";
        ctx.strokeRect(x, y, d.w, d.h);
      }

      if (d.type === "abyssRock") {
        ctx.fillStyle = "rgba(0,0,0,0.38)";
        ctx.beginPath();
        ctx.arc(x, y, d.r || 70, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "rgba(255,255,255,0.06)";
        ctx.stroke();
      }

      if (d.type === "torch") {
        SpriteFX.glow(ctx, x, y, 72, "rgba(255,120,30,0.35)");

        ctx.fillStyle = "#2b1309";
        ctx.fillRect(x - 5, y, 10, 36);

        ctx.fillStyle = "#ff9f2e";
        ctx.beginPath();
        ctx.arc(x, y - 8, 12, 0, Math.PI * 2);
        ctx.fill();
      }

      if (d.type === "stainedGlass") {
        SpriteFX.glow(ctx, x, y, 100, "rgba(255,0,60,0.16)");

        ctx.fillStyle = "rgba(255,0,60,0.18)";
        ctx.fillRect(x - 45, y - 90, 90, 180);

        ctx.strokeStyle = "rgba(255,255,255,0.1)";
        ctx.strokeRect(x - 45, y - 90, 90, 180);
      }

      if (d.type === "bones") {
        ctx.strokeStyle = "rgba(230,220,200,0.35)";
        ctx.lineWidth = 3;

        ctx.beginPath();
        ctx.moveTo(x - 20, y);
        ctx.lineTo(x + 20, y + 12);
        ctx.moveTo(x - 12, y + 18);
        ctx.lineTo(x + 16, y - 10);
        ctx.stroke();

        ctx.fillStyle = "rgba(230,220,200,0.28)";
        ctx.beginPath();
        ctx.arc(x - 24, y - 2, 6, 0, Math.PI * 2);
        ctx.arc(x + 24, y + 14, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  drawMiniMap(ctx) {
    if (!this.showMiniMap) return;

    const w = 136;
    const h = 88;

    const x = canvas.width - w - 18;
    const y = 98;

    ctx.save();
    ctx.globalAlpha = 0.72;

    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(x, y, w, h);

    ctx.strokeStyle = "rgba(255,159,46,0.45)";
    ctx.strokeRect(x, y, w, h);

    for (const c of this.chests) {
      if (c.opened) continue;

      ctx.fillStyle = "#ff9f2e";
      ctx.fillRect(x + (c.x / this.width) * w - 2, y + (c.y / this.height) * h - 2, 4, 4);
    }

    for (const e of this.enemies) {
      ctx.fillStyle = "#ff3b24";
      ctx.fillRect(x + (e.x / this.width) * w - 1, y + (e.y / this.height) * h - 1, 3, 3);
    }

    ctx.fillStyle = "#ffd078";
    ctx.fillRect(x + (game.player.x / this.width) * w - 3, y + (game.player.y / this.height) * h - 3, 6, 6);

    if (this.boss && !this.boss.dead && this.inBossArena) {
      ctx.fillStyle = "#ff3b24";
      ctx.fillRect(x + (this.boss.x / this.width) * w - 4, y + (this.boss.y / this.height) * h - 4, 8, 8);
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
      btn.addEventListener("click", () => showScreen("screen-menu"));
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
    this.world = new World(this.levelIndex);

    this.running = true;
    this.paused = false;
    this.dead = false;
    this.deaths = 0;

    document.getElementById("bossHud")?.classList.add("hidden");

    showScreen("screen-game");
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
    this.world = new World(0);

    this.running = true;
    this.paused = false;
    this.dead = false;
    this.deaths = 0;

    document.getElementById("bossHud")?.classList.add("hidden");

    showScreen("screen-game");
    toast("Restarted");

    this.updateHUD();
    this.startLoop();
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

    this.world = new World(this.levelIndex);

    this.running = true;
    this.paused = false;
    this.dead = false;

    document.getElementById("bossHud")?.classList.add("hidden");

    showScreen("screen-game");
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
    this.world = new World(this.levelIndex);

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