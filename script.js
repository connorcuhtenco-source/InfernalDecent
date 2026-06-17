"use strict";

/* ============================================================
   INFERNAL DESCENT — POLISHED DAY 3 BUILD
   Requires:
   1. sprites.js
   2. levels.js
   3. script.js
============================================================ */

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const menuCanvas = document.getElementById("menuCanvas");
const menuCtx = menuCanvas.getContext("2d");

const classCanvas = document.getElementById("classCanvas");
const classCtx = classCanvas.getContext("2d");

const victoryCanvas = document.getElementById("victoryCanvas");
const victoryCtx = victoryCanvas.getContext("2d");

const keys = {};
const pressed = {};

const SOULS_PER_LEVEL = 5;

const SETTINGS = {
  shake: true,
  particles: true
};

window.addEventListener("keydown", e => {
  if (!keys[e.code]) pressed[e.code] = true;
  keys[e.code] = true;

  if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
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
  pressed[code] = false;
  return value;
}

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
  }, 2100);
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

/* ================= GAME DATA ================= */

const CLASS_DATA = {
  warrior: {
    name: "Warrior",
    hp: 150,
    stamina: 75,
    speed: 165,
    damage: 32,
    magic: 0,
    blockPower: 0.25,
    color: "#c73622",
    weapons: ["Fire Axe", "Demon Greatsword", "Devil's Greatspear"]
  },

  assassin: {
    name: "Assassin",
    hp: 95,
    stamina: 115,
    speed: 250,
    damage: 26,
    magic: 0,
    blockPower: 0.42,
    color: "#ff6a3d",
    weapons: ["Fire Dagger", "Demon Katana", "Devil's Nagakiba"]
  },

  mage: {
    name: "Mage",
    hp: 85,
    stamina: 85,
    speed: 185,
    damage: 8,
    magic: 36,
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
    cooldown: 470,
    special: "Ground Smash"
  },

  "Demon Greatsword": {
    type: "melee",
    damage: 55,
    range: 94,
    cooldown: 620,
    special: "Heavy Slam"
  },

  "Devil's Greatspear": {
    type: "hybrid",
    damage: 72,
    range: 145,
    cooldown: 560,
    special: "Spear Throw"
  },

  "Fire Dagger": {
    type: "melee",
    damage: 21,
    range: 56,
    cooldown: 210,
    special: "Shadow Strike"
  },

  "Demon Katana": {
    type: "melee",
    damage: 38,
    range: 84,
    cooldown: 275,
    special: "Dash Strike"
  },

  "Devil's Nagakiba": {
    type: "melee",
    damage: 58,
    range: 118,
    cooldown: 320,
    special: "Blade Storm"
  },

  "Fire Gloves": {
    type: "ranged",
    damage: 34,
    range: 330,
    cooldown: 355,
    special: "Fireball"
  },

  "Demon Wand": {
    type: "ranged",
    damage: 58,
    range: 370,
    cooldown: 430,
    special: "Arcane Blast"
  },

  "Devil's Orb": {
    type: "ranged",
    damage: 82,
    range: 430,
    cooldown: 520,
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
    detect: 520
  },

  hound: {
    name: "Hell Hound",
    hp: 50,
    speed: 215,
    damage: 10,
    souls: 3,
    color: "#e87519",
    detect: 620
  },

  cyclops: {
    name: "Cyclops",
    hp: 98,
    speed: 86,
    damage: 15,
    beamDamage: 20,
    souls: 4,
    color: "#c73622",
    detect: 720
  },

  gargoyle: {
    name: "Gargoyle",
    hp: 62,
    speed: 170,
    damage: 20,
    souls: 4,
    color: "#82746d",
    detect: 650
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

    this.kills = 0;
    this.projectiles = [];

    this.frame = 0;
  }

  get weapon() {
    return WEAPONS[this.weaponName];
  }

  update(dt, world) {
    const s = dt / 1000;

    this.frame += dt;
    this.attackTimer -= dt;
    this.specialTimer -= dt;
    this.invincible -= dt;

    this.blocking = held("KeyQ") && this.stamina > 5;

    if (this.blocking) {
      this.stamina = clamp(this.stamina - 14 * s, 0, this.maxStamina);
    } else {
      this.stamina = clamp(this.stamina + 20 * s, 0, this.maxStamina);
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

    if (mx || my) {
      this.facingX = mx;
      this.facingY = my;
    }

    let speed = this.baseSpeed;

    if ((held("ShiftLeft") || held("ShiftRight")) && this.stamina > 0 && !this.blocking) {
      speed *= 1.58;
      this.stamina = clamp(this.stamina - 30 * s, 0, this.maxStamina);
    }

    if (this.blocking) {
      speed *= 0.55;
    }

    const nx = this.x + mx * speed * s;
    const ny = this.y + my * speed * s;

    if (!world.collides(nx, this.y)) this.x = nx;
    if (!world.collides(this.x, ny)) this.y = ny;

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

    const weapon = this.weapon;
    this.attackTimer = weapon.cooldown;

    let baseDamage =
      weapon.type === "ranged"
        ? weapon.damage + this.baseMagic
        : weapon.damage + this.baseDamage;

    const crit = Math.random() < 0.12;

    if (crit) baseDamage *= 1.85;

    const damage = Math.round(baseDamage);

    if (weapon.type === "ranged" || weapon.type === "hybrid") {
      this.projectiles.push(
        new Projectile(
          this.x,
          this.y,
          this.facingX,
          this.facingY,
          damage,
          weapon.range,
          this.color,
          crit
        )
      );
    }

    const hitRange = weapon.range;

    for (const enemy of world.enemies) {
      if (enemy.dead) continue;

      const d = distance(this.x, this.y, enemy.x, enemy.y);

      if (d <= hitRange) {
        enemy.takeDamage(damage);

        this.stamina = clamp(this.stamina + 8, 0, this.maxStamina);

        damageNumber(
          enemy.x - world.cameraX,
          enemy.y - world.cameraY,
          damage,
          crit
        );

        world.particles.burst(enemy.x, enemy.y, this.color, 10);
      }
    }

    if (world.boss && !world.boss.dead) {
      const d = distance(this.x, this.y, world.boss.x, world.boss.y);

      if (d <= hitRange) {
        world.boss.takeDamage(damage);

        this.stamina = clamp(this.stamina + 10, 0, this.maxStamina);

        damageNumber(
          world.boss.x - world.cameraX,
          world.boss.y - world.cameraY,
          damage,
          crit
        );

        world.particles.burst(world.boss.x, world.boss.y, this.color, 14);
      }
    }
  }

  special(world) {
    if (this.specialTimer > 0) return;
    if (this.stamina < 30) return;

    this.specialTimer = 3600;
    this.stamina -= 30;

    const weapon = this.weapon;
    const radius = weapon.type === "ranged" ? 210 : 150;

    toast(weapon.special);

    for (const enemy of world.enemies) {
      if (enemy.dead) continue;

      const d = distance(this.x, this.y, enemy.x, enemy.y);

      if (d <= radius) {
        const damage = Math.round(
          (weapon.damage + this.baseDamage + this.baseMagic) * 1.45
        );

        enemy.takeDamage(damage);

        damageNumber(
          enemy.x - world.cameraX,
          enemy.y - world.cameraY,
          damage,
          true
        );

        world.particles.burst(enemy.x, enemy.y, this.color, 22);
      }
    }

    if (world.boss && !world.boss.dead) {
      const d = distance(this.x, this.y, world.boss.x, world.boss.y);

      if (d <= radius) {
        const damage = Math.round(
          (weapon.damage + this.baseDamage + this.baseMagic) * 1.3
        );

        world.boss.takeDamage(damage);

        damageNumber(
          world.boss.x - world.cameraX,
          world.boss.y - world.cameraY,
          damage,
          true
        );

        world.particles.burst(world.boss.x, world.boss.y, this.color, 28);
      }
    }

    if (SETTINGS.shake) world.shake = 18;
    world.particles.burst(this.x, this.y, this.color, 55);
  }

  takeDamage(amount) {
    if (this.invincible > 0) return;

    let finalDamage = amount;

    if (this.blocking && this.stamina > 0) {
      finalDamage = Math.ceil(amount * this.blockPower);
      this.stamina = clamp(this.stamina - 12, 0, this.maxStamina);

      toast("BLOCKED");
      if (game?.world) game.world.particles.burst(this.x, this.y, "#9fdcff", 16);
    }

    this.hp = clamp(this.hp - finalDamage, 0, this.maxHp);
    this.invincible = 620;

    if (game?.world) {
      if (SETTINGS.shake) game.world.shake = this.blocking ? 5 : 10;
      game.world.particles.burst(this.x, this.y, this.blocking ? "#9fdcff" : "#ff2d1c", 18);
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
      toast("LEVEL UP");
    }
  }

  upgradeWeapon() {
    if (this.weaponIndex < this.weaponList.length - 1) {
      this.weaponIndex++;
      this.weaponName = this.weaponList[this.weaponIndex];
      toast("NEW WEAPON: " + this.weaponName);
    }
  }

  learn(skill) {
    if (this.skillPoints <= 0) return;
    if (this.skills[skill] >= 20) return;

    if (skill === "damage" && this.classId === "mage") {
      toast("Mage uses Magic instead");
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
      this.hp += 10;
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
  }

  draw(ctx, camX, camY) {
    if (this.invincible > 0 && Math.floor(this.invincible / 80) % 2 === 0) {
      ctx.globalAlpha = 0.45;
    }

    SpriteRenderer.drawPlayer(
      ctx,
      this.x - camX,
      this.y - camY,
      this,
      this.frame
    );

    ctx.globalAlpha = 1;

    for (const p of this.projectiles) {
      p.draw(ctx, camX, camY);
    }
  }
}

/* ================= PROJECTILES ================= */

class Projectile {
  constructor(x, y, dx, dy, damage, range, color, crit) {
    const len = Math.hypot(dx, dy) || 1;

    this.x = x;
    this.y = y;
    this.startX = x;
    this.startY = y;

    this.dx = dx / len;
    this.dy = dy / len;

    this.damage = damage;
    this.range = range;
    this.color = color;
    this.crit = crit;

    this.speed = 520;
    this.dead = false;
  }

  update(dt, world) {
    const s = dt / 1000;

    this.x += this.dx * this.speed * s;
    this.y += this.dy * this.speed * s;

    if (distance(this.startX, this.startY, this.x, this.y) > this.range) {
      this.dead = true;
      return;
    }

    if (world.collides(this.x, this.y)) {
      this.dead = true;
      return;
    }

    for (const enemy of world.enemies) {
      if (enemy.dead) continue;

      if (distance(this.x, this.y, enemy.x, enemy.y) < 25) {
        enemy.takeDamage(this.damage);

        damageNumber(
          enemy.x - world.cameraX,
          enemy.y - world.cameraY,
          this.damage,
          this.crit
        );

        world.particles.burst(enemy.x, enemy.y, this.color, 12);

        this.dead = true;
        return;
      }
    }

    if (
      world.boss &&
      !world.boss.dead &&
      distance(this.x, this.y, world.boss.x, world.boss.y) < 44
    ) {
      world.boss.takeDamage(this.damage);

      damageNumber(
        world.boss.x - world.cameraX,
        world.boss.y - world.cameraY,
        this.damage,
        this.crit
      );

      world.particles.burst(world.boss.x, world.boss.y, this.color, 14);

      this.dead = true;
    }
  }

  draw(ctx, camX, camY) {
    const x = this.x - camX;
    const y = this.y - camY;

    SpriteFX.glow(ctx, x, y, 26, this.color + "aa");

    ctx.fillStyle = this.color;
    ctx.fillRect(x - 8, y - 8, 16, 16);

    ctx.fillStyle = "#fff";
    ctx.fillRect(x - 4, y - 4, 8, 8);
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

    this.maxHp = data.hp;
    this.hp = data.hp;

    this.speed = data.speed;
    this.damage = data.damage;
    this.souls = data.souls;
    this.detect = data.detect;

    this.color = data.color;

    this.cooldown = rand(500, 1300);
    this.dead = false;
    this.flash = 0;
    this.frame = 0;
  }

  takeDamage(amount) {
    this.hp -= amount;
    this.flash = 120;

    if (this.hp <= 0 && !this.dead) {
      this.dead = true;

      game.player.kills++;
      game.player.addSouls(this.souls);

      game.world.particles.burst(this.x, this.y, this.color, 24);
    }
  }

  update(dt, world) {
    if (this.dead) return;

    this.frame += dt;
    this.flash -= dt;
    this.cooldown -= dt;

    const player = game.player;
    const d = distance(this.x, this.y, player.x, player.y);

    if (d > this.detect) return;

    const dx = (player.x - this.x) / (d || 1);
    const dy = (player.y - this.y) / (d || 1);

    if (this.type === "cyclops") {
      if (d < 330 && this.cooldown <= 0) {
        player.takeDamage(this.damage === 15 ? 20 : this.damage);

        world.particles.line(this.x, this.y, player.x, player.y, "#ff2d1c");
        toast("EYE BEAM");

        this.cooldown = 2600;
      } else if (d > 190) {
        this.move(world, dx, dy, this.speed, dt);
      }
    } else if (this.type === "gargoyle") {
      const diveSpeed = this.cooldown <= 0 ? this.speed * 1.6 : this.speed * 0.75;

      this.move(world, dx, dy, diveSpeed, dt);

      if (d < 38 && this.cooldown <= 0) {
        player.takeDamage(this.damage);
        toast("DIVE STRIKE");
        this.cooldown = 1450;
      }
    } else {
      let speed = this.speed;

      if (this.type === "hound") speed *= 1.18;

      this.move(world, dx, dy, speed, dt);

      if (d < 38 && this.cooldown <= 0) {
        player.takeDamage(this.damage);
        this.cooldown = this.type === "hound" ? 700 : 1100;
      }
    }
  }

  move(world, dx, dy, speed, dt) {
    const s = dt / 1000;

    const nx = this.x + dx * speed * s;
    const ny = this.y + dy * speed * s;

    if (!world.collides(nx, this.y)) this.x = nx;
    if (!world.collides(this.x, ny)) this.y = ny;
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

    this.maxHp = data.hp;
    this.hp = data.hp;

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
      toast(this.name + " — PHASE II");

      if (SETTINGS.shake) game.world.shake = 24;
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

    this.frame += dt;
    this.cooldown -= dt;

    const player = game.player;
    const d = distance(this.x, this.y, player.x, player.y);

    this.updateBossHUD();

    if (d > 110) {
      const dx = (player.x - this.x) / (d || 1);
      const dy = (player.y - this.y) / (d || 1);

      const speed = this.phase2 ? 132 : 94;

      const nx = this.x + dx * speed * (dt / 1000);
      const ny = this.y + dy * speed * (dt / 1000);

      if (!world.collides(nx, this.y)) this.x = nx;
      if (!world.collides(this.x, ny)) this.y = ny;
    }

    if (this.cooldown <= 0) {
      this.attack(player, world);
    }
  }

  updateBossHUD() {
    const bossHud = document.getElementById("bossHud");
    const bossName = document.getElementById("bossName");
    const bossBar = document.getElementById("bossBar");
    const bossPhase = document.getElementById("bossPhase");

    if (bossHud) bossHud.classList.remove("hidden");
    if (bossName) bossName.textContent = this.name;
    if (bossBar) bossBar.style.width = `${Math.max(0, (this.hp / this.maxHp) * 100)}%`;
    if (bossPhase) bossPhase.textContent = this.phase2 ? "Phase II" : "Phase I";
  }

  attack(player, world) {
    if (this.name === "The Gate Keeper") {
      if (Math.random() > 0.5) {
        player.takeDamage(this.phase2 ? 35 : 20);
        toast("RUSH DOWN");
      } else {
        player.takeDamage(this.phase2 ? 25 : 15);
        toast("FIST SWING");
      }

      this.cooldown = this.phase2 ? 1350 : 1750;
    } else if (this.name === "Alpha Cerberus") {
      const move = Math.floor(Math.random() * (this.phase2 ? 3 : 2));

      if (move === 0) {
        player.takeDamage(20);
        toast("ROAR");
      }

      if (move === 1) {
        player.takeDamage(25);
        toast("TRIPLE BITE");
      }

      if (move === 2) {
        player.takeDamage(35);
        world.particles.line(this.x, this.y, player.x, player.y, "#ff6a3d");
        toast("HELL BEAM");
      }

      this.cooldown = this.phase2 ? 1450 : 2050;
    } else if (this.name === "The Devil") {
      const move = Math.floor(Math.random() * (this.phase2 ? 3 : 2));

      if (move === 0) {
        player.takeDamage(20);
        toast("PITCHFORK LUNGE");
      }

      if (move === 1) {
        player.takeDamage(25);
        world.particles.line(this.x, this.y, player.x, player.y, "#ff2d1c");
        toast("FIREBALL");
      }

      if (move === 2) {
        toast("SUMMONING DEMONS");

        const currentSummons = world.enemies.length;

        if (currentSummons < 12) {
          for (let i = 0; i < 4; i++) {
            world.enemies.push(
              new Enemy(
                choice(["hound", "cyclops", "gargoyle"]),
                this.x + rand(-150, 150),
                this.y + rand(-150, 150)
              )
            );
          }
        }
      }

      this.cooldown = this.phase2 ? 1200 : 1700;
    } else {
      player.takeDamage(this.damage);
      this.cooldown = 1450;
    }
  }

  draw(ctx, camX, camY) {
    if (this.dead) return;

    SpriteRenderer.drawBoss(
      ctx,
      this.x - camX,
      this.y - camY,
      this,
      this.frame
    );
  }
}

/* ================= HAZARDS ================= */

class Hazard {
  constructor(type, x, y, r) {
    this.type = type;
    this.x = x;
    this.y = y;
    this.r = r;
    this.timer = rand(0, 1600);
  }

  update(dt, player, world) {
    this.timer -= dt;

    const d = distance(this.x, this.y, player.x, player.y);

    if (this.type === "ash" && d < this.r) {
      player.stamina = clamp(player.stamina - 10 * (dt / 1000), 0, player.maxStamina);
    }

    if ((this.type === "lava" || this.type === "void") && d < this.r) {
      if (this.timer <= 0) {
        player.takeDamage(this.type === "void" ? 22 : 16);
        this.timer = 900;
      }
    }

    if (this.type === "geyser" && d < this.r + 20) {
      if (this.timer <= 0) {
        player.takeDamage(18);
        world.particles.burst(this.x, this.y, "#ff6a3d", 35);
        this.timer = 1700;
      }
    }

    if (this.type === "debris" && d < this.r) {
      if (this.timer <= 0) {
        player.takeDamage(16);
        world.particles.burst(this.x, this.y, "#cfc0b5", 28);
        this.timer = 1500;
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
      SpriteFX.glow(ctx, x, y, this.r + 20, "rgba(255,70,20,0.42)");
      ctx.fillStyle = "rgba(255,70,20,0.28)";
    }

    if (this.type === "geyser") {
      SpriteFX.glow(ctx, x, y, this.r + 24, "rgba(255,90,20,0.38)");
      ctx.fillStyle = "rgba(255,110,30,0.23)";
    }

    if (this.type === "debris") {
      SpriteFX.glow(ctx, x, y, this.r, "rgba(255,255,255,0.08)");
      ctx.fillStyle = "rgba(200,190,180,0.14)";
    }

    if (this.type === "void") {
      SpriteFX.glow(ctx, x, y, this.r + 30, "rgba(255,0,30,0.2)");
      ctx.fillStyle = "rgba(0,0,0,0.48)";
    }

    ctx.beginPath();
    ctx.arc(x, y, this.r, 0, Math.PI * 2);
    ctx.fill();

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
    this.boss = null;

    this.particles = new ParticleSystem();

    this.shake = 0;
    this.frame = 0;

    this.decor = MAP_DECOR[this.level.decor] || [];

    this.generate();
  }

  generate() {
    this.enemies = this.level.enemies.map(
      e => new Enemy(e.type, e.x, e.y)
    );

    this.hazards = this.level.hazards.map(
      h => new Hazard(h.type, h.x, h.y, h.r)
    );

    this.boss = new Boss(
      this.level.boss,
      this.level.bossPos.x,
      this.level.bossPos.y
    );

    if (game.player) {
      game.player.x = this.level.playerStart.x;
      game.player.y = this.level.playerStart.y;
    }

    this.updateLevelUI();
  }

  updateLevelUI() {
    document.getElementById("layerTitle").textContent = this.level.short;
    document.getElementById("objectiveText").textContent = this.level.objective;
  }

  collides(x, y) {
    if (x < 70 || y < 70 || x > this.width - 70 || y > this.height - 70) {
      return true;
    }

    for (const d of this.decor) {
      if (["wall", "column", "pillar", "throne"].includes(d.type)) {
        const w = d.w || 90;
        const h = d.h || 90;

        if (
          x > d.x - w / 2 &&
          x < d.x + w / 2 &&
          y > d.y - h / 2 &&
          y < d.y + h / 2
        ) {
          return true;
        }
      }
    }

    return false;
  }

  update(dt) {
    this.frame += dt;

    this.particles.update(dt);

    for (const h of this.hazards) {
      h.update(dt, game.player, this);
    }

    for (const e of this.enemies) {
      e.update(dt, this);
    }

    this.enemies = this.enemies.filter(e => !e.dead);

    if (this.boss && !this.boss.dead) {
      this.boss.update(dt, this);
    }

    this.cameraX = game.player.x - canvas.width / 2;
    this.cameraY = game.player.y - canvas.height / 2;

    this.cameraX = clamp(this.cameraX, 0, Math.max(0, this.width - canvas.width));
    this.cameraY = clamp(this.cameraY, 0, Math.max(0, this.height - canvas.height));
  }

  draw(ctx) {
    let shakeX = 0;
    let shakeY = 0;

    if (this.shake > 0 && SETTINGS.shake) {
      shakeX = rand(-this.shake, this.shake);
      shakeY = rand(-this.shake, this.shake);
      this.shake *= 0.84;
    }

    ctx.save();
    ctx.translate(shakeX, shakeY);

    this.drawFloor(ctx);
    this.drawDecor(ctx);

    for (const h of this.hazards) {
      h.draw(ctx, this.cameraX, this.cameraY);
    }

    for (const e of this.enemies) {
      e.draw(ctx, this.cameraX, this.cameraY);
    }

    if (this.boss && !this.boss.dead) {
      this.boss.draw(ctx, this.cameraX, this.cameraY);
    }

    game.player.draw(ctx, this.cameraX, this.cameraY);
    this.particles.draw(ctx, this.cameraX, this.cameraY);

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

        ctx.fillStyle = n > 0.2 ? t.floor : t.floor2;
        ctx.fillRect(x, y, TILE - 2, TILE - 2);

        ctx.strokeStyle = t.seam;
        ctx.strokeRect(x, y, TILE - 2, TILE - 2);

        if (n > 1.1) {
          ctx.fillStyle = "rgba(255,255,255,0.025)";
          ctx.fillRect(x + 8, y + 8, 12, 12);
        }
      }
    }

    const glow = ctx.createRadialGradient(
      canvas.width / 2,
      canvas.height / 2,
      10,
      canvas.width / 2,
      canvas.height / 2,
      canvas.height * 0.95
    );

    glow.addColorStop(0, "transparent");
    glow.addColorStop(1, t.glow);

    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = t.fog;

    for (let i = 0; i < 28; i++) {
      const x =
        (i * 211 -
          this.cameraX * 0.18 +
          this.frame * 0.01) %
        canvas.width;

      const y =
        (i * 137 -
          this.cameraY * 0.18) %
        canvas.height;

      ctx.beginPath();
      ctx.arc(
        x,
        y,
        80 + Math.sin(this.frame / 900 + i) * 20,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
  }

  drawDecor(ctx) {
    for (const d of this.decor) {
      const x = d.x - this.cameraX;
      const y = d.y - this.cameraY;

      if (d.type === "wall") {
        ctx.fillStyle = this.theme.wall;
        ctx.fillRect(x - d.w / 2, y - d.h / 2, d.w, d.h);

        ctx.strokeStyle = "rgba(255,255,255,0.08)";
        ctx.strokeRect(x - d.w / 2, y - d.h / 2, d.w, d.h);
      }

      if (d.type === "pillar" || d.type === "column") {
        SpriteFX.shadow(ctx, x, y + 34, 38, 12);

        ctx.fillStyle = this.theme.wall;
        ctx.fillRect(x - 30, y - 52, 60, 104);

        ctx.fillStyle = "rgba(255,255,255,0.08)";
        ctx.fillRect(x - 20, y - 44, 8, 88);
        ctx.fillRect(x + 12, y - 44, 8, 88);
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
        ctx.fillStyle = "rgba(150,20,18,0.55)";
        ctx.fillRect(x, y, d.w, d.h);

        ctx.fillStyle = "rgba(255,150,70,0.16)";
        ctx.fillRect(x, y + d.h / 2 - 8, d.w, 16);
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
        ctx.fillStyle = "rgba(0,0,0,0.35)";
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
    }
  }
}

/* ================= GAME MANAGER ================= */

class Game {
  constructor() {
    this.player = null;
    this.world = null;

    this.levelIndex = 0;

    this.running = false;
    this.paused = false;

    this.last = 0;

    this.bindUI();
  }

  bindUI() {
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
    document.getElementById("btnRestart")?.addEventListener("click", () => location.reload());
    document.getElementById("btnMenuFromPause")?.addEventListener("click", () => location.reload());
    document.getElementById("btnCloseSkills")?.addEventListener("click", () => this.resume());

    document.querySelectorAll(".skill-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        this.player.learn(btn.dataset.skill);
        this.updateSkillScreen();
      });
    });

    document.getElementById("btnTryAgain")?.addEventListener("click", () => location.reload());
    document.getElementById("btnGameOverMenu")?.addEventListener("click", () => location.reload());
    document.getElementById("btnPlayAgain")?.addEventListener("click", () => location.reload());
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
    this.player = new Player(classId);
    this.levelIndex = 0;
    this.world = new World(this.levelIndex);

    this.running = true;
    this.paused = false;

    showScreen("screen-game");
    toast("THE DESCENT BEGINS");

    this.updateHUD();

    this.last = performance.now();
    requestAnimationFrame(t => this.loop(t));
  }

  loop(t) {
    if (!this.running) return;

    const dt = Math.min(34, t - this.last);
    this.last = t;

    if (!this.paused) {
      this.update(dt);
      this.draw();
    }

    requestAnimationFrame(time => this.loop(time));
  }

  update(dt) {
    this.player.update(dt, this.world);
    this.world.update(dt);
    this.updateHUD();
  }

  draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.world.draw(ctx);
  }

  updateHUD() {
    if (!this.player) return;

    const p = this.player;

    document.getElementById("hpBar").style.width = `${(p.hp / p.maxHp) * 100}%`;
    document.getElementById("staminaBar").style.width = `${(p.stamina / p.maxStamina) * 100}%`;

    document.getElementById("hpText").textContent = `${Math.ceil(p.hp)}/${p.maxHp}`;
    document.getElementById("staminaText").textContent = `${Math.ceil(p.stamina)}/${p.maxStamina}`;
    document.getElementById("classBadge").textContent = p.className.toUpperCase();
    document.getElementById("soulText").textContent = p.souls;
    document.getElementById("levelText").textContent = p.level;
    document.getElementById("pointText").textContent = p.skillPoints;
    document.getElementById("weaponText").textContent = p.weaponName;
  }

  pause() {
    this.paused = true;
    showScreen("screen-pause");
  }

  resume() {
    this.paused = false;
    showScreen("screen-game");
  }

  openSkills() {
    this.paused = true;
    this.updateSkillScreen();
    showScreen("screen-skills");
  }

  updateSkillScreen() {
    const info = document.getElementById("skillInfo");

    if (info && this.player) {
      info.textContent = `Skill Points: ${this.player.skillPoints}`;
    }
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

    toast(LEVELS[this.levelIndex].title);
    this.updateHUD();
  }

  gameOver() {
    this.running = false;

    const stats = document.getElementById("gameoverStats");

    if (stats) {
      stats.textContent =
        `Level ${this.player.level} · Kills ${this.player.kills} · Souls ${this.player.totalSouls}`;
    }

    showScreen("screen-gameover");
  }

  victory() {
    this.running = false;

    const stats = document.getElementById("victoryStats");

    if (stats) {
      stats.textContent =
        `Final Level ${this.player.level} · Kills ${this.player.kills} · Souls ${this.player.totalSouls}`;
    }

    showScreen("screen-victory");
  }
}

const game = new Game();
window.game = game;