"use strict";

/*
  INFERNAL DESCENT: THE BROKEN CURSE
  Dungeon Style Upgrade
  Stronger visuals + improved gameplay pacing while keeping the class/skill system.
*/

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const keys = {};
let game = null;
let activeLoops = 0;

const CLASS_DATA = {
  assassin: {
    name: "Assassin",
    color: "#f6efe7",
    hp: 80,
    speed: 292,
    stamina: 150,
    damage: 15,
    magic: 5,
    skill: "Shadow Cut",
    weapons: ["Fire Dagger", "Demon Katana", "Devil's Nagakiba"]
  },

  warrior: {
    name: "Warrior",
    color: "#ff8a28",
    hp: 150,
    speed: 205,
    stamina: 112,
    damage: 26,
    magic: 0,
    skill: "Infernal Smash",
    weapons: ["Fire Axe", "Demon Greatsword", "Devil's Greatspear"]
  },

  mage: {
    name: "Mage",
    color: "#ffd6a3",
    hp: 82,
    speed: 238,
    stamina: 120,
    damage: 12,
    magic: 31,
    skill: "Soul Flame",
    weapons: ["Fire Wand", "Demon Caster", "Devil's Orb"]
  }
};

const LAYERS = [
  {
    name: "Layer I — Gates of Despair",
    bg: "#080605",
    floor: "#201713",
    floor2: "#2a1d18",
    wall: "#080403",
    wallTop: "#33221a",
    lava: false,
    enemy: "Husk",
    boss: "The Gatekeeper",
    bossHp: 185,
    weaponTier: 0
  },

  {
    name: "Layer II — Fiery Catacombs",
    bg: "#100403",
    floor: "#24100a",
    floor2: "#33160c",
    wall: "#070201",
    wallTop: "#421407",
    lava: true,
    enemy: "Hellhound",
    boss: "Alpha Cerberus",
    bossHp: 260,
    weaponTier: 1
  },

  {
    name: "Layer III — Throne of Damnation",
    bg: "#050305",
    floor: "#171019",
    floor2: "#241422",
    wall: "#030203",
    wallTop: "#2c152b",
    lava: true,
    enemy: "Infernal Guard",
    boss: "Overlord of Hell",
    bossHp: 340,
    weaponTier: 2
  }
];

const screens = {
  menu: document.getElementById("screen-menu"),
  settings: document.getElementById("screen-settings"),
  story: document.getElementById("screen-story"),
  howto: document.getElementById("screen-howto"),
  class: document.getElementById("screen-class"),
  game: document.getElementById("screen-game"),
  pause: document.getElementById("screen-pause"),
  tree: document.getElementById("screen-skilltree"),
  gameover: document.getElementById("screen-gameover"),
  victory: document.getElementById("screen-victory")
};

const settings = {
  sound: true,
  shake: true
};

function showScreen(name) {
  Object.values(screens).forEach(screen => {
    screen.classList.remove("active");

    if (screen.classList.contains("overlay")) {
      screen.classList.add("hidden");
    }
  });

  screens[name].classList.add("active");
  screens[name].classList.remove("hidden");
}

function showOverlay(name) {
  screens[name].classList.add("active");
  screens[name].classList.remove("hidden");
}

function hideOverlay(name) {
  screens[name].classList.remove("active");
  screens[name].classList.add("hidden");
}

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

window.addEventListener("resize", resize);
resize();

window.addEventListener("keydown", event => {
  keys[event.code] = true;

  if (
    event.code === "Space" ||
    event.code === "ArrowUp" ||
    event.code === "ArrowDown" ||
    event.code === "ArrowLeft" ||
    event.code === "ArrowRight"
  ) {
    event.preventDefault();
  }

  if (game && event.code === "Escape") {
    game.togglePause();
  }

  if (game && event.code === "KeyR") {
    game.tryOpenSkillTree();
  }
});

window.addEventListener("keyup", event => {
  keys[event.code] = false;
});

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function random(min, max) {
  return min + Math.random() * (max - min);
}

function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)];
}

class FloatingText {
  constructor(x, y, text, type = "normal") {
    this.x = x;
    this.y = y;
    this.text = text;
    this.type = type;
    this.life = 850;
  }

  update(deltaTime) {
    this.y -= deltaTime * 0.065;
    this.life -= deltaTime;
    return this.life > 0;
  }

  draw(camera) {
    const screenX = this.x - camera.x;
    const screenY = this.y - camera.y;

    ctx.save();
    ctx.globalAlpha = Math.max(0, this.life / 850);

    if (this.type === "player") {
      ctx.fillStyle = "#ff4b3d";
    } else if (this.type === "crit") {
      ctx.fillStyle = "#ff7a1a";
    } else {
      ctx.fillStyle = "#ffc347";
    }

    ctx.font = this.type === "crit"
      ? "900 25px Segoe UI"
      : "900 17px Segoe UI";

    ctx.textAlign = "center";
    ctx.shadowColor = "#000";
    ctx.shadowBlur = 8;
    ctx.fillText(this.text, screenX, screenY);
    ctx.restore();
  }
}

class Particle {
  constructor(x, y, color, size = null) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.vx = random(-145, 145);
    this.vy = random(-145, 145);
    this.life = random(320, 740);
    this.size = size ?? random(2, 5);
  }

  update(deltaTime) {
    this.x += this.vx * deltaTime / 1000;
    this.y += this.vy * deltaTime / 1000;
    this.vx *= 0.985;
    this.vy *= 0.985;
    this.life -= deltaTime;
    return this.life > 0;
  }

  draw(camera) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.life / 740);
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(
      this.x - camera.x,
      this.y - camera.y,
      this.size,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.restore();
  }
}

class Player {
  constructor(classId) {
    this.classId = classId;
    this.base = JSON.parse(JSON.stringify(CLASS_DATA[classId]));

    this.x = 260;
    this.y = 260;
    this.r = 17;

    this.maxHp = this.base.hp;
    this.hp = this.maxHp;

    this.maxStamina = this.base.stamina;
    this.stamina = this.maxStamina;

    this.speed = this.base.speed;
    this.damage = this.base.damage;
    this.magic = this.base.magic;

    this.level = 1;
    this.souls = 0;
    this.skillPoints = 0;
    this.nextSoulLevel = 5;

    this.skills = {
      damage: 0,
      magic: 0,
      speed: 0,
      stamina: 0,
      health: 0
    };

    this.weaponTier = 0;

    this.attackCooldown = 0;
    this.skillCooldown = 0;
    this.dashCooldown = 0;
    this.invincible = 0;

    this.facing = {
      x: 1,
      y: 0
    };

    this.kills = 0;
    this.totalSouls = 0;
    this.damageDealt = 0;
  }

  get weapon() {
    return this.base.weapons[this.weaponTier];
  }

  update(deltaTime, world) {
    this.attackCooldown -= deltaTime;
    this.skillCooldown -= deltaTime;
    this.dashCooldown -= deltaTime;
    this.invincible -= deltaTime;

    this.stamina = Math.min(
      this.maxStamina,
      this.stamina + deltaTime * 0.025
    );

    let moveX = 0;
    let moveY = 0;

    if (keys.KeyW || keys.ArrowUp) moveY--;
    if (keys.KeyS || keys.ArrowDown) moveY++;
    if (keys.KeyA || keys.ArrowLeft) moveX--;
    if (keys.KeyD || keys.ArrowRight) moveX++;

    const length = Math.hypot(moveX, moveY);

    if (length > 0) {
      moveX /= length;
      moveY /= length;

      this.facing = {
        x: moveX,
        y: moveY
      };
    }

    let currentSpeed = this.speed;

    if (
      (keys.ShiftLeft || keys.ShiftRight) &&
      this.dashCooldown <= 0 &&
      this.stamina >= 25
    ) {
      currentSpeed *= this.classId === "assassin" ? 3.1 : 2.4;
      this.dashCooldown = 650;
      this.stamina -= 25;
      this.invincible = 180;

      if (game) {
        game.burst(this.x, this.y, 8, "#f6efe7");
      }
    }

    this.move(
      moveX * currentSpeed * deltaTime / 1000,
      moveY * currentSpeed * deltaTime / 1000,
      world
    );

    if (keys.Space && this.attackCooldown <= 0) {
      if (this.classId === "warrior") {
        this.attackCooldown = 430;
      } else if (this.classId === "assassin") {
        this.attackCooldown = 225;
      } else {
        this.attackCooldown = 365;
      }

      return {
        type: "attack"
      };
    }

    if (
      keys.KeyE &&
      this.skillCooldown <= 0 &&
      this.stamina >= 35
    ) {
      this.skillCooldown = 2400;
      this.stamina -= 35;

      return {
        type: "skill"
      };
    }

    return null;
  }

  move(dx, dy, world) {
    const nextX = this.x + dx;
    const nextY = this.y + dy;

    if (!world.collides(nextX, this.y, this.r)) {
      this.x = nextX;
    }

    if (!world.collides(this.x, nextY, this.r)) {
      this.y = nextY;
    }
  }

  gainSouls(amount) {
    this.souls += amount;
    this.totalSouls += amount;

    while (this.totalSouls >= this.nextSoulLevel) {
      this.level++;
      this.skillPoints++;
      this.nextSoulLevel += 5;

      if (game) {
        game.message("LEVEL UP — Skill Point Gained");
      }
    }
  }

  takeDamage(amount) {
    if (this.invincible > 0) return;

    this.hp = Math.max(0, this.hp - amount);
    this.invincible = 430;
  }

  upgrade(skill) {
    if (this.skillPoints <= 0) return false;

    this.skillPoints--;
    this.skills[skill]++;

    if (skill === "damage") {
      this.damage += 4;
    }

    if (skill === "magic") {
      this.magic += 5;
    }

    if (skill === "speed") {
      this.speed += 18;
    }

    if (skill === "stamina") {
      this.maxStamina += 22;
      this.stamina = this.maxStamina;
    }

    if (skill === "health") {
      this.maxHp += 25;
      this.hp = this.maxHp;
    }

    return true;
  }

  draw(camera) {
    const x = this.x - camera.x;
    const y = this.y - camera.y;

    ctx.save();

    if (this.invincible > 0 && Math.floor(this.invincible / 70) % 2 === 0) {
      ctx.globalAlpha = 0.45;
    }

    ctx.shadowColor = this.base.color;
    ctx.shadowBlur = 17;

    const gradient = ctx.createRadialGradient(
      x - 5,
      y - 8,
      2,
      x,
      y,
      this.r + 8
    );

    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(0.38, this.base.color);
    gradient.addColorStop(1, "#6d120d");

    ctx.fillStyle = gradient;

    ctx.beginPath();
    ctx.arc(x, y, this.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(0,0,0,.6)";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = "#050304";
    ctx.beginPath();
    ctx.arc(
      x + this.facing.x * 7,
      y + this.facing.y * 7,
      4,
      0,
      Math.PI * 2
    );
    ctx.fill();

    ctx.strokeStyle = "#ff7a1a";
    ctx.lineWidth = 4;
    ctx.shadowColor = "#ff7a1a";
    ctx.shadowBlur = 10;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(
      x + this.facing.x * 33,
      y + this.facing.y * 33
    );
    ctx.stroke();

    ctx.restore();
  }
}

class Enemy {
  constructor(x, y, layerIndex, boss = false) {
    const layer = LAYERS[layerIndex];

    this.x = x;
    this.y = y;
    this.r = boss ? 39 : 18;

    this.boss = boss;
    this.name = boss ? layer.boss : layer.enemy;

    this.maxHp = boss ? layer.bossHp : 38 + layerIndex * 22;
    this.hp = this.maxHp;

    this.speed = boss ? 108 + layerIndex * 13 : 93 + layerIndex * 24;
    this.damage = boss ? 18 + layerIndex * 8 : 8 + layerIndex * 4;
    this.souls = boss ? 8 + layerIndex * 4 : 1;

    this.attackCooldown = random(500, 1000);
    this.alive = true;

    if (boss) {
      this.color = "#cf2f22";
    } else if (layerIndex === 0) {
      this.color = "#9b6b55";
    } else if (layerIndex === 1) {
      this.color = "#ff7a1a";
    } else {
      this.color = "#f6efe7";
    }
  }

  update(deltaTime, player, world) {
    const d = distance(this, player);

    if (d < 540) {
      const angle = Math.atan2(player.y - this.y, player.x - this.x);

      const nextX = this.x + Math.cos(angle) * this.speed * deltaTime / 1000;
      const nextY = this.y + Math.sin(angle) * this.speed * deltaTime / 1000;

      if (!world.collides(nextX, this.y, this.r)) {
        this.x = nextX;
      }

      if (!world.collides(this.x, nextY, this.r)) {
        this.y = nextY;
      }
    }

    this.attackCooldown -= deltaTime;

    if (
      d < this.r + player.r + 10 &&
      this.attackCooldown <= 0
    ) {
      player.takeDamage(this.damage);

      if (game) {
        game.float(player.x, player.y - 25, `-${this.damage}`, "player");
        game.burst(player.x, player.y, 5, "#cf2f22");
        game.shake();
      }

      this.attackCooldown = this.boss ? 720 : 1050;
    }
  }

  takeDamage(amount) {
    this.hp -= amount;

    if (this.hp <= 0) {
      this.alive = false;
    }
  }

  draw(camera) {
    const x = this.x - camera.x;
    const y = this.y - camera.y;

    ctx.save();

    ctx.shadowColor = this.color;
    ctx.shadowBlur = this.boss ? 30 : 12;

    const gradient = ctx.createRadialGradient(
      x - 6,
      y - 7,
      2,
      x,
      y,
      this.r + 8
    );

    gradient.addColorStop(0, this.boss ? "#ffb18a" : "#d8b5a0");
    gradient.addColorStop(0.42, this.color);
    gradient.addColorStop(1, "#180403");

    ctx.fillStyle = gradient;

    if (this.boss) {
      ctx.beginPath();
      ctx.moveTo(x, y - this.r);
      ctx.lineTo(x + this.r, y);
      ctx.lineTo(x, y + this.r);
      ctx.lineTo(x - this.r, y);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(x, y, this.r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.shadowBlur = 0;

    ctx.fillStyle = "#050304";
    ctx.fillRect(x - 10, y - 7, 7, 5);
    ctx.fillRect(x + 3, y - 7, 7, 5);

    if (this.hp < this.maxHp) {
      ctx.fillStyle = "#210605";
      ctx.fillRect(x - this.r, y - this.r - 15, this.r * 2, 7);

      ctx.fillStyle = "#ff7a1a";
      ctx.fillRect(
        x - this.r,
        y - this.r - 15,
        this.r * 2 * (this.hp / this.maxHp),
        7
      );
    }

    ctx.restore();
  }
}

class Pickup {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.r = 14;
    this.time = Math.random() * 10;
  }

  update(deltaTime) {
    this.time += deltaTime / 1000;
  }

  draw(camera) {
    const x = this.x - camera.x;
    const y = this.y - camera.y + Math.sin(this.time * 4) * 4;

    let icon = "💀";

    if (this.type === "heart") {
      icon = "❤";
    }

    if (this.type === "rage") {
      icon = "🔥";
    }

    ctx.save();
    ctx.font = "25px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = this.type === "heart" ? "#ff4b3d" : "#ff7a1a";
    ctx.shadowBlur = 19;
    ctx.fillText(icon, x, y);
    ctx.restore();
  }
}

class Torch {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.flicker = Math.random() * Math.PI * 2;
  }

  update(deltaTime) {
    this.flicker += deltaTime / 1000 * 6;
  }

  draw(camera) {
    const x = this.x - camera.x;
    const y = this.y - camera.y;
    const pulse = 0.85 + Math.sin(this.flicker) * 0.12;

    ctx.save();

    const gradient = ctx.createRadialGradient(
      x,
      y,
      0,
      x,
      y,
      95 * pulse
    );

    gradient.addColorStop(0, "rgba(255,195,71,.28)");
    gradient.addColorStop(0.35, "rgba(255,122,26,.16)");
    gradient.addColorStop(1, "rgba(255,122,26,0)");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, 95 * pulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffc347";
    ctx.shadowColor = "#ff7a1a";
    ctx.shadowBlur = 18;

    ctx.beginPath();
    ctx.moveTo(x, y - 12);
    ctx.lineTo(x + 7, y + 6);
    ctx.lineTo(x, y + 15);
    ctx.lineTo(x - 7, y + 6);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
}

class World {
  constructor(layerIndex) {
    this.layerIndex = layerIndex;
    this.layer = LAYERS[layerIndex];

    this.w = 1800;
    this.h = 1200;

    this.walls = [];
    this.enemies = [];
    this.pickups = [];
    this.torches = [];
    this.lavaPools = [];

    this.checkpoint = {
      x: 220,
      y: 980,
      r: 48
    };

    this.exit = {
      x: 1640,
      y: 190,
      r: 58
    };

    this.build();
  }

  build() {
    this.walls = [
      { x: 0, y: 0, w: this.w, h: 48 },
      { x: 0, y: this.h - 48, w: this.w, h: 48 },
      { x: 0, y: 0, w: 48, h: this.h },
      { x: this.w - 48, y: 0, w: 48, h: this.h },

      { x: 260, y: 180, w: 310, h: 56 },
      { x: 700, y: 120, w: 56, h: 360 },
      { x: 920, y: 420, w: 420, h: 56 },
      { x: 260, y: 640, w: 430, h: 56 },
      { x: 1020, y: 760, w: 56, h: 280 },
      { x: 1280, y: 180, w: 56, h: 310 },
      { x: 1320, y: 780, w: 230, h: 52 }
    ];

    this.torches = [
      new Torch(115, 115),
      new Torch(590, 145),
      new Torch(860, 600),
      new Torch(1320, 560),
      new Torch(1630, 320),
      new Torch(300, 980)
    ];

    if (this.layer.lava) {
      this.lavaPools = [
        { x: 455, y: 420, r: 72 },
        { x: 1175, y: 645, r: 86 },
        { x: 1510, y: 930, r: 70 }
      ];
    }

    const enemyCount = 9 + this.layerIndex * 4;

    const spawnPoints = [
      [390, 340],
      [520, 840],
      [850, 270],
      [900, 720],
      [1180, 320],
      [1450, 560],
      [1520, 850],
      [630, 520],
      [1120, 950],
      [340, 1020]
    ];

    for (let i = 0; i < enemyCount; i++) {
      const point = spawnPoints[i % spawnPoints.length];

      this.enemies.push(
        new Enemy(
          point[0] + random(-55, 55),
          point[1] + random(-55, 55),
          this.layerIndex
        )
      );
    }

    this.enemies.push(
      new Enemy(1540, 240, this.layerIndex, true)
    );
  }

  collides(x, y, radius) {
    if (
      x - radius < 0 ||
      y - radius < 0 ||
      x + radius > this.w ||
      y + radius > this.h
    ) {
      return true;
    }

    return this.walls.some(wall => {
      return (
        x + radius > wall.x &&
        x - radius < wall.x + wall.w &&
        y + radius > wall.y &&
        y - radius < wall.y + wall.h
      );
    });
  }

  update(deltaTime, player) {
    this.torches.forEach(torch => {
      torch.update(deltaTime);
    });

    this.enemies.forEach(enemy => {
      enemy.update(deltaTime, player, this);
    });

    if (this.layer.lava) {
      for (const pool of this.lavaPools) {
        const touchingLava = Math.hypot(
          player.x - pool.x,
          player.y - pool.y
        ) < pool.r + player.r;

        if (touchingLava && player.invincible <= 0) {
          player.takeDamage(6);

          if (game) {
            game.float(player.x, player.y - 20, "-6 lava", "player");
            game.burst(player.x, player.y, 4, "#ff7a1a");
          }
        }
      }
    }

    const deadEnemies = this.enemies.filter(enemy => !enemy.alive);

    deadEnemies.forEach(enemy => {
      player.kills++;
      player.gainSouls(enemy.souls);

      if (game) {
        game.burst(
          enemy.x,
          enemy.y,
          enemy.boss ? 34 : 12,
          enemy.boss ? "#ff7a1a" : "#cf2f22"
        );

        game.float(
          enemy.x,
          enemy.y - enemy.r - 18,
          `+${enemy.souls} soul${enemy.souls > 1 ? "s" : ""}`,
          "crit"
        );
      }

      if (!enemy.boss && Math.random() < 0.26) {
        this.pickups.push(
          new Pickup(
            enemy.x,
            enemy.y,
            Math.random() < 0.55 ? "heart" : "rage"
          )
        );
      }

      if (enemy.boss && game) {
        game.message(`${enemy.name} defeated — weapon upgraded`);
      }
    });

    this.enemies = this.enemies.filter(enemy => enemy.alive);

    this.pickups.forEach(pickup => {
      pickup.update(deltaTime);
    });

    this.pickups = this.pickups.filter(pickup => {
      const touching = Math.hypot(
        pickup.x - player.x,
        pickup.y - player.y
      ) < pickup.r + player.r;

      if (touching) {
        if (pickup.type === "heart") {
          player.hp = Math.min(player.maxHp, player.hp + 30);
        }

        if (pickup.type === "rage") {
          player.damage += 3;

          setTimeout(() => {
            player.damage -= 3;
          }, 8000);
        }

        if (game) {
          game.float(
            player.x,
            player.y - 30,
            pickup.type === "heart" ? "+HP" : "RAGE",
            "crit"
          );

          game.burst(
            pickup.x,
            pickup.y,
            10,
            pickup.type === "heart" ? "#ff4b3d" : "#ff7a1a"
          );
        }

        return false;
      }

      return true;
    });
  }

  bossAlive() {
    return this.enemies.some(enemy => enemy.boss && enemy.alive);
  }

  cleared() {
    return !this.bossAlive();
  }

  draw(camera, time) {
    ctx.fillStyle = this.layer.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(-camera.x, -camera.y);

    this.drawDungeonFloor(time);
    this.drawLava(time);
    this.drawCheckpoint();
    this.drawExit();

    this.pickups.forEach(pickup => {
      pickup.draw(camera);
    });

    this.enemies.forEach(enemy => {
      enemy.draw(camera);
    });

    this.torches.forEach(torch => {
      torch.draw(camera);
    });

    ctx.restore();
  }

  drawDungeonFloor(time) {
    ctx.fillStyle = this.layer.floor;
    ctx.fillRect(0, 0, this.w, this.h);

    for (let x = 0; x < this.w; x += 96) {
      for (let y = 0; y < this.h; y += 96) {
        const shade = ((x + y) / 96) % 2 === 0
          ? this.layer.floor
          : this.layer.floor2;

        ctx.fillStyle = shade;
        ctx.fillRect(x, y, 96, 96);

        ctx.strokeStyle = "rgba(0,0,0,.38)";
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, 94, 94);

        ctx.strokeStyle = "rgba(255,255,255,.025)";
        ctx.lineWidth = 1;

        ctx.beginPath();
        ctx.moveTo(x + 14, y + 18);
        ctx.lineTo(x + 72, y + 16);
        ctx.moveTo(x + 20, y + 72);
        ctx.lineTo(x + 80, y + 78);
        ctx.stroke();
      }
    }

    this.walls.forEach(wall => {
      this.drawWall(wall);
    });
  }

  drawWall(wall) {
    ctx.fillStyle = this.layer.wall;
    ctx.shadowColor = "#000";
    ctx.shadowBlur = 18;
    ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
    ctx.shadowBlur = 0;

    ctx.fillStyle = this.layer.wallTop;
    ctx.fillRect(
      wall.x + 4,
      wall.y + 4,
      Math.max(0, wall.w - 8),
      Math.min(18, wall.h - 8)
    );

    ctx.strokeStyle = "rgba(255,122,26,.08)";
    ctx.lineWidth = 2;
    ctx.strokeRect(
      wall.x + 3,
      wall.y + 3,
      wall.w - 6,
      wall.h - 6
    );

    for (let x = wall.x + 16; x < wall.x + wall.w; x += 46) {
      ctx.strokeStyle = "rgba(255,255,255,.035)";

      ctx.beginPath();
      ctx.moveTo(x, wall.y + 8);
      ctx.lineTo(x + 18, wall.y + Math.min(wall.h - 8, 34));
      ctx.stroke();
    }
  }

  drawLava(time) {
    if (!this.layer.lava) return;

    for (const pool of this.lavaPools) {
      const pulse = 0.92 + Math.sin(time / 280 + pool.x) * 0.06;

      const gradient = ctx.createRadialGradient(
        pool.x,
        pool.y,
        0,
        pool.x,
        pool.y,
        pool.r * 1.25 * pulse
      );

      gradient.addColorStop(0, "#ffc347");
      gradient.addColorStop(0.34, "#ff7a1a");
      gradient.addColorStop(0.7, "#6d120d");
      gradient.addColorStop(1, "rgba(109,18,13,0)");

      ctx.fillStyle = gradient;

      ctx.beginPath();
      ctx.arc(
        pool.x,
        pool.y,
        pool.r * 1.25 * pulse,
        0,
        Math.PI * 2
      );
      ctx.fill();

      ctx.strokeStyle = "rgba(255,195,71,.35)";
      ctx.lineWidth = 3;

      ctx.beginPath();
      ctx.arc(pool.x, pool.y, pool.r * 0.72, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  drawCheckpoint() {
    ctx.fillStyle = "rgba(255,195,71,.13)";
    ctx.strokeStyle = "#ffc347";
    ctx.lineWidth = 3;
    ctx.shadowColor = "#ffc347";
    ctx.shadowBlur = 18;

    ctx.beginPath();
    ctx.arc(
      this.checkpoint.x,
      this.checkpoint.y,
      this.checkpoint.r,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.stroke();

    ctx.font = "32px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("⚜", this.checkpoint.x, this.checkpoint.y);

    ctx.shadowBlur = 0;
  }

  drawExit() {
    ctx.fillStyle = this.cleared()
      ? "rgba(255,122,26,.32)"
      : "rgba(255,255,255,.05)";

    ctx.strokeStyle = this.cleared()
      ? "#ff7a1a"
      : "rgba(255,255,255,.2)";

    ctx.lineWidth = 4;
    ctx.shadowColor = this.cleared() ? "#ff7a1a" : "transparent";
    ctx.shadowBlur = this.cleared() ? 24 : 0;

    ctx.beginPath();
    ctx.arc(
      this.exit.x,
      this.exit.y,
      this.exit.r,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.stroke();

    ctx.font = "31px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      this.cleared() ? "⛧" : "🔒",
      this.exit.x,
      this.exit.y
    );

    ctx.shadowBlur = 0;
  }
}

class Game {
  constructor(classId) {
    activeLoops++;
    this.loopId = activeLoops;

    this.player = new Player(classId);

    this.layerIndex = 0;
    this.world = new World(0);

    this.camera = {
      x: 0,
      y: 0
    };

    this.state = "playing";
    this.texts = [];
    this.particles = [];
    this.time = 0;
    this.last = performance.now();

    this.message("Layer I — Gates of Despair");
    this.updateHud();

    requestAnimationFrame(time => this.loop(time));
  }

  loop(time) {
    if (this.loopId !== activeLoops) return;

    const deltaTime = Math.min(50, time - this.last);
    this.last = time;

    if (this.state === "playing") {
      this.update(deltaTime);
    }

    this.draw();

    requestAnimationFrame(nextTime => this.loop(nextTime));
  }

  update(deltaTime) {
    this.time += deltaTime;

    const action = this.player.update(deltaTime, this.world);

    if (action && action.type === "attack") {
      this.playerAttack();
    }

    if (action && action.type === "skill") {
      this.playerSkill();
    }

    this.world.update(deltaTime, this.player);

    this.texts = this.texts.filter(text => text.update(deltaTime));
    this.particles = this.particles.filter(particle => particle.update(deltaTime));

    this.camera.x = clamp(
      this.player.x - canvas.width / 2,
      0,
      Math.max(0, this.world.w - canvas.width)
    );

    this.camera.y = clamp(
      this.player.y - canvas.height / 2,
      0,
      Math.max(0, this.world.h - canvas.height)
    );

    if (this.world.cleared()) {
      this.player.weaponTier = Math.max(
        this.player.weaponTier,
        this.world.layer.weaponTier
      );

      const nearExit = Math.hypot(
        this.player.x - this.world.exit.x,
        this.player.y - this.world.exit.y
      ) < this.world.exit.r + this.player.r;

      if (nearExit) {
        this.nextLayer();
      }
    }

    if (this.player.hp <= 0) {
      this.gameOver();
    }

    this.updateHud();
  }

  playerAttack() {
    const range = this.player.classId === "mage"
      ? 205
      : this.player.classId === "warrior"
        ? 92
        : 74;

    const baseDamage = this.player.damage;

    this.world.enemies.forEach(enemy => {
      const d = Math.hypot(
        enemy.x - this.player.x,
        enemy.y - this.player.y
      );

      if (d < range + enemy.r) {
        const crit = Math.random() < 0.12 + this.player.skills.damage * 0.02;
        const damage = Math.round(baseDamage * (crit ? 1.8 : 1));

        enemy.takeDamage(damage);
        this.player.damageDealt += damage;

        this.float(
          enemy.x,
          enemy.y - enemy.r,
          damage,
          crit ? "crit" : "normal"
        );

        this.burst(
          enemy.x,
          enemy.y,
          5,
          crit ? "#ff7a1a" : "#ffc347"
        );
      }
    });
  }

  playerSkill() {
    const player = this.player;

    if (player.classId === "mage") {
      this.world.enemies.forEach(enemy => {
        const d = Math.hypot(
          enemy.x - player.x,
          enemy.y - player.y
        );

        if (d < 295) {
          const damage = Math.round(player.magic + 20);

          enemy.takeDamage(damage);
          player.damageDealt += damage;

          this.float(enemy.x, enemy.y - 30, damage, "crit");
          this.burst(enemy.x, enemy.y, 10, "#ff7a1a");
        }
      });

      this.message("Soul Flame unleashed");
    } else {
      const radius = player.classId === "warrior" ? 158 : 122;
      const damage = player.classId === "warrior"
        ? player.damage + 20
        : player.damage + 10;

      this.world.enemies.forEach(enemy => {
        const d = Math.hypot(
          enemy.x - player.x,
          enemy.y - player.y
        );

        if (d < radius + enemy.r) {
          enemy.takeDamage(damage);
          player.damageDealt += damage;

          this.float(enemy.x, enemy.y - 30, damage, "crit");
          this.burst(enemy.x, enemy.y, 10, "#ff7a1a");
        }
      });

      this.message(player.base.skill);
    }

    this.shake();
  }

  tryOpenSkillTree() {
    if (this.state !== "playing") return;

    const nearCheckpoint = Math.hypot(
      this.player.x - this.world.checkpoint.x,
      this.player.y - this.world.checkpoint.y
    ) < 95;

    if (nearCheckpoint) {
      this.state = "tree";
      this.buildTree();
      showOverlay("tree");
    } else {
      this.message("Find a checkpoint to open the skill tree");
    }
  }

  buildTree() {
    document.getElementById("treeLevel").textContent = this.player.level;
    document.getElementById("skillPoints").textContent = this.player.skillPoints;
    document.getElementById("treeSouls").textContent = this.player.souls;

    const grid = document.getElementById("skillGrid");
    grid.innerHTML = "";

    const skillNames = {
      damage: "Damage",
      magic: "Magic Damage",
      speed: "Speed",
      stamina: "Stamina",
      health: "Health"
    };

    Object.keys(skillNames).forEach(skill => {
      const button = document.createElement("button");

      button.className = "skill-card" + (
        this.player.skillPoints <= 0 ? " disabled" : ""
      );

      button.innerHTML = `
        <strong>${skillNames[skill]}</strong>
        <span>Rank ${this.player.skills[skill]}</span>
      `;

      button.onclick = () => {
        if (this.player.upgrade(skill)) {
          this.buildTree();
          this.updateHud();
        }
      };

      grid.appendChild(button);
    });
  }

  closeTree() {
    hideOverlay("tree");
    this.state = "playing";
  }

  nextLayer() {
    if (this.layerIndex >= 2) {
      this.victory();
      return;
    }

    this.layerIndex++;
    this.world = new World(this.layerIndex);

    this.player.x = 250;
    this.player.y = 250;
    this.player.weaponTier = this.layerIndex;

    this.message(LAYERS[this.layerIndex].name);
    this.shake();
  }

  gameOver() {
    this.state = "gameover";

    document.getElementById("gameoverStats").innerHTML = `
      Level reached: ${this.player.level}<br>
      Souls collected: ${this.player.totalSouls}<br>
      Enemies defeated: ${this.player.kills}
    `;

    showOverlay("gameover");
  }

  victory() {
    this.state = "victory";

    document.getElementById("victoryStats").innerHTML = `
      Final level: ${this.player.level}<br>
      Total souls: ${this.player.totalSouls}<br>
      Enemies defeated: ${this.player.kills}<br>
      Damage dealt: ${Math.round(this.player.damageDealt)}
    `;

    showOverlay("victory");
  }

  togglePause() {
    if (this.state === "playing") {
      this.state = "paused";
      showOverlay("pause");
    } else if (this.state === "paused") {
      this.state = "playing";
      hideOverlay("pause");
    }
  }

  updateHud() {
    const player = this.player;

    document.getElementById("hpBar").style.width =
      `${100 * player.hp / player.maxHp}%`;

    document.getElementById("hpText").textContent =
      `${Math.ceil(player.hp)}/${player.maxHp}`;

    document.getElementById("staminaBar").style.width =
      `${100 * player.stamina / player.maxStamina}%`;

    document.getElementById("soulCount").textContent = player.souls;
    document.getElementById("levelText").textContent = `Level ${player.level}`;
    document.getElementById("layerName").textContent = LAYERS[this.layerIndex].name;
    document.getElementById("className").textContent = player.base.name;
    document.getElementById("weaponName").textContent = player.weapon;
    document.getElementById("skillName").textContent = player.base.skill;

    const boss = this.world.enemies.find(enemy => enemy.boss && enemy.alive);
    const bossHud = document.getElementById("bossHud");

    if (boss) {
      bossHud.classList.remove("hidden");
      document.getElementById("bossName").textContent = boss.name;

      document.getElementById("bossBar").style.width =
        `${100 * boss.hp / boss.maxHp}%`;
    } else {
      bossHud.classList.add("hidden");
    }
  }

  draw() {
    if (!this.player) return;

    this.world.draw(this.camera, this.time);

    this.particles.forEach(particle => {
      particle.draw(this.camera);
    });

    this.player.draw(this.camera);

    this.texts.forEach(text => {
      text.draw(this.camera);
    });

    const nearCheckpoint = Math.hypot(
      this.player.x - this.world.checkpoint.x,
      this.player.y - this.world.checkpoint.y
    ) < 95;

    if (nearCheckpoint) {
      this.drawPrompt("Press R to open Skill Tree");
    } else {
      const nearExit = Math.hypot(
        this.player.x - this.world.exit.x,
        this.player.y - this.world.exit.y
      ) < 120;

      if (this.world.cleared() && nearExit) {
        this.drawPrompt(
          this.layerIndex === 2
            ? "Enter to break the curse"
            : "Enter the next layer"
        );
      }
    }
  }

  drawPrompt(text) {
    ctx.save();

    ctx.font = "900 16px Segoe UI";
    const width = ctx.measureText(text).width + 54;

    ctx.fillStyle = "rgba(0,0,0,.76)";
    ctx.strokeStyle = "#ff7a1a";
    ctx.lineWidth = 1;

    ctx.fillRect(
      canvas.width / 2 - width / 2,
      canvas.height - 148,
      width,
      44
    );

    ctx.strokeRect(
      canvas.width / 2 - width / 2,
      canvas.height - 148,
      width,
      44
    );

    ctx.fillStyle = "#ffc347";
    ctx.textAlign = "center";
    ctx.shadowColor = "#ff7a1a";
    ctx.shadowBlur = 10;

    ctx.fillText(
      text,
      canvas.width / 2,
      canvas.height - 121
    );

    ctx.restore();
  }

  float(x, y, text, type) {
    this.texts.push(
      new FloatingText(x, y, text, type)
    );
  }

  burst(x, y, amount, color) {
    for (let i = 0; i < amount; i++) {
      this.particles.push(
        new Particle(x, y, color)
      );
    }
  }

  shake() {
    if (!settings.shake) return;

    const gameScreen = document.getElementById("screen-game");

    gameScreen.classList.remove("shake");
    void gameScreen.offsetWidth;
    gameScreen.classList.add("shake");
  }

  message(text) {
    const box = document.getElementById("messageBox");

    box.textContent = text;
    box.classList.remove("hidden");

    clearTimeout(this.messageTimer);

    this.messageTimer = setTimeout(() => {
      box.classList.add("hidden");
    }, 2300);
  }
}

function makeEmbers(targetId = "embers", amount = 48) {
  const parent = document.getElementById(targetId);

  if (!parent) return;

  parent.innerHTML = "";

  for (let i = 0; i < amount; i++) {
    const spark = document.createElement("div");

    spark.className = "spark";
    spark.style.setProperty("--x", `${Math.random() * 100}%`);
    spark.style.setProperty("--drift", `${random(-70, 70)}px`);
    spark.style.setProperty("--dur", `${random(3, 8)}s`);
    spark.style.animationDelay = `${random(0, 5)}s`;

    parent.appendChild(spark);
  }
}

document.getElementById("btnPlay").onclick = () => {
  showScreen("class");
};

document.getElementById("btnSettings").onclick = () => {
  showScreen("settings");
};

document.getElementById("btnStory").onclick = () => {
  showScreen("story");
};

document.getElementById("btnHowTo").onclick = () => {
  showScreen("howto");
};

document.querySelectorAll("[data-back]").forEach(button => {
  button.onclick = () => showScreen("menu");
});

document.querySelectorAll("[data-menu]").forEach(button => {
  button.onclick = () => showScreen("menu");
});

document.querySelectorAll(".class-card").forEach(card => {
  card.onclick = () => {
    showScreen("game");
    game = new Game(card.dataset.class);
  };
});

document.getElementById("brightnessSlider").oninput = event => {
  document.documentElement.style.setProperty(
    "--brightness",
    Number(event.target.value) / 100
  );
};

document.getElementById("soundToggle").onchange = event => {
  settings.sound = event.target.checked;
};

document.getElementById("shakeToggle").onchange = event => {
  settings.shake = event.target.checked;
};

document.getElementById("btnResume").onclick = () => {
  if (game) game.togglePause();
};

document.getElementById("btnRestart").onclick = () => {
  hideOverlay("pause");
  showScreen("class");
};

document.getElementById("btnQuit").onclick = () => {
  hideOverlay("pause");
  showScreen("menu");
};

document.getElementById("btnTryAgain").onclick = () => {
  hideOverlay("gameover");
  showScreen("class");
};

document.getElementById("btnPlayAgain").onclick = () => {
  hideOverlay("victory");
  showScreen("class");
};

document.getElementById("btnCloseTree").onclick = () => {
  if (game) game.closeTree();
};

makeEmbers("embers", 54);
makeEmbers("classEmbers", 34);