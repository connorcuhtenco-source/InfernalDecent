/* ═══════════════════════════════════════════════════════════════
   INFERNAL DESCENT: THE BROKEN CURSE — script.js
   Full game engine for Day 1
   Architecture: Game → ScreenManager, InputManager, World,
                 Player, Enemy, Boss, ParticleSystem, UI, Audio
═══════════════════════════════════════════════════════════════ */

'use strict';

/* ──────────────────────────────────────────────────────────────
   CONSTANTS
────────────────────────────────────────────────────────────── */
const TILE  = 48;   // tile size in px
const FPS   = 60;

/* Tile types */
const T = { EMPTY: 0, FLOOR: 1, WALL: 2, DOOR: 3, CHECKPOINT: 4, CHEST: 5, VOID: 6 };

/* Layers */
const LAYERS = [
  { id: 1, roman: 'I',  name: 'Gates of Despair',    floorColor: '#1a1410', wallColor: '#0d0a08', accentColor: '#3a2820' },
  { id: 2, roman: 'II', name: 'Fiery Catacombs',     floorColor: '#1a1008', wallColor: '#0d0700', accentColor: '#3a1a08' },
  { id: 3, roman: 'III',name: 'Throne of Damnation', floorColor: '#0d0a14', wallColor: '#06050d', accentColor: '#1a1030' },
];

/* ──────────────────────────────────────────────────────────────
   UTILITY
────────────────────────────────────────────────────────────── */
const Utils = {
  clamp:  (v, lo, hi) => Math.max(lo, Math.min(hi, v)),
  lerp:   (a, b, t)   => a + (b - a) * t,
  dist:   (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay),
  rand:   (lo, hi)    => lo + Math.random() * (hi - lo),
  randInt:(lo, hi)    => Math.floor(Utils.rand(lo, hi + 1)),
  choice: (arr)       => arr[Math.floor(Math.random() * arr.length)],
  angle:  (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax),
  /** Axis-aligned bounding box overlap */
  aabb:   (ax, ay, aw, ah, bx, by, bw, bh) =>
    ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by,
};

/* ──────────────────────────────────────────────────────────────
   INPUT MANAGER
────────────────────────────────────────────────────────────── */
class InputManager {
  constructor() {
    this.keys    = {};
    this.pressed = {};   // fired once per keydown
    this._setup();
  }
  _setup() {
    window.addEventListener('keydown', e => {
      if (!this.keys[e.code]) this.pressed[e.code] = true;
      this.keys[e.code] = true;
      // Prevent scrolling on game keys
      if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))
        e.preventDefault();
    });
    window.addEventListener('keyup', e => { this.keys[e.code] = false; });
  }
  isDown(code)    { return !!this.keys[code]; }
  isPressed(code) { const v = !!this.pressed[code]; this.pressed[code] = false; return v; }
  consumePressed() { this.pressed = {}; }
  /** Returns normalized movement vector */
  getMovement() {
    let x = 0, y = 0;
    if (this.isDown('KeyA') || this.isDown('ArrowLeft'))  x -= 1;
    if (this.isDown('KeyD') || this.isDown('ArrowRight')) x += 1;
    if (this.isDown('KeyW') || this.isDown('ArrowUp'))    y -= 1;
    if (this.isDown('KeyS') || this.isDown('ArrowDown'))  y += 1;
    const len = Math.hypot(x, y);
    return len > 0 ? { x: x / len, y: y / len } : { x: 0, y: 0 };
  }
}

/* ──────────────────────────────────────────────────────────────
   WEAPONS
────────────────────────────────────────────────────────────── */
const WEAPONS = {
  rustedSword: {
    id: 'rustedSword', name: 'Rusted Sword',
    damage: 10, range: 56, arc: Math.PI * 0.7,
    cooldown: 450, color: '#888', special: null,
  },
  heavyAxe: {
    id: 'heavyAxe', name: 'Heavy Axe',
    damage: 20, range: 64, arc: Math.PI * 0.9,
    cooldown: 700, color: '#c0392b', special: 'heavySwing',
  },
  demonBlade: {
    id: 'demonBlade', name: 'Demon Blade',
    damage: 35, range: 70, arc: Math.PI * 0.65,
    cooldown: 350, color: '#8e44ad', special: 'dashStrike',
  },
};

/* ──────────────────────────────────────────────────────────────
   PLAYER
────────────────────────────────────────────────────────────── */
class Player {
  constructor(x, y) {
    // Position (world px, centre)
    this.x = x; this.y = y;
    this.w = 28; this.h = 28;

    // Stats
    this.maxHp     = 100;
    this.hp        = 100;
    this.speed     = 180;      // px/sec
    this.damage    = 1.0;      // multiplier
    this.critChance= 0.10;
    this.souls     = 0;

    // Weapon & armor
    this.weapon    = { ...WEAPONS.rustedSword };
    this.armorBonus= 0;        // extra max HP from armor

    // Upgrades purchased
    this.upgrades  = { hp: 0, damage: 0, speed: 0, crit: 0 };

    // Timers
    this.attackCooldown  = 0;
    this.dashCooldown    = 0;
    this.specialCooldown = 0;
    this.invincible      = 0;  // i-frames ms
    this.dashTime        = 0;
    this.dashVx          = 0;
    this.dashVy          = 0;

    // Visual
    this.facing    = { x: 1, y: 0 };
    this.swingAnim = 0;
    this.walkFrame = 0;
    this.walkTimer = 0;

    // Active effects
    this.effects   = [];       // { type, duration, remaining }

    // Stats tracking
    this.totalDamageDealt = 0;
    this.totalSoulsCollected = 0;
    this.killCount = 0;
  }

  get left()   { return this.x - this.w / 2; }
  get top()    { return this.y - this.h / 2; }
  get right()  { return this.x + this.w / 2; }
  get bottom() { return this.y + this.h / 2; }

  equipWeapon(weaponId) {
    this.weapon = { ...WEAPONS[weaponId] };
  }

  addSouls(n) {
    this.souls += n;
    this.totalSoulsCollected += n;
  }

  applyEffect(type, duration) {
    // Remove existing of same type
    this.effects = this.effects.filter(e => e.type !== type);
    this.effects.push({ type, duration, remaining: duration });
  }

  hasEffect(type) {
    return this.effects.some(e => e.type === type && e.remaining > 0);
  }

  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  takeDamage(amount) {
    if (this.invincible > 0) return 0;
    if (this.hasEffect('cursedArmor')) amount = Math.ceil(amount * 0.5);
    this.hp = Math.max(0, this.hp - amount);
    this.invincible = 600;
    return amount;
  }

  update(dt, input, world) {
    const dtSec = dt / 1000;

    // ── Effects ──
    for (const e of this.effects) e.remaining -= dt;
    this.effects = this.effects.filter(e => e.remaining > 0);

    // ── Cooldowns ──
    if (this.attackCooldown  > 0) this.attackCooldown  -= dt;
    if (this.dashCooldown    > 0) this.dashCooldown    -= dt;
    if (this.specialCooldown > 0) this.specialCooldown -= dt;
    if (this.invincible      > 0) this.invincible      -= dt;
    if (this.dashTime        > 0) this.dashTime        -= dt;

    // ── Movement ──
    let vx = 0, vy = 0;
    const isDashing = this.dashTime > 0;

    if (isDashing) {
      vx = this.dashVx;
      vy = this.dashVy;
    } else {
      const mv = input.getMovement();
      let spd = this.speed;
      if (this.hasEffect('shadowStep')) spd *= 1.5;
      vx = mv.x * spd;
      vy = mv.y * spd;
      if (mv.x !== 0 || mv.y !== 0) {
        this.facing = { x: mv.x, y: mv.y };
      }
    }

    // Walk animation
    if (vx !== 0 || vy !== 0) {
      this.walkTimer += dt;
      if (this.walkTimer > 150) { this.walkTimer = 0; this.walkFrame = (this.walkFrame + 1) % 4; }
    } else {
      this.walkFrame = 0;
    }

    // Collision with walls
    const nx = this.x + vx * dtSec;
    const ny = this.y + vy * dtSec;
    if (!world.collidesAt(nx, this.y, this.w, this.h)) this.x = nx;
    if (!world.collidesAt(this.x, ny, this.w, this.h)) this.y = ny;

    // Swing animation decay
    if (this.swingAnim > 0) this.swingAnim -= dtSec * 8;

    // ── Dash ──
    if (input.isPressed('ShiftLeft') || input.isPressed('ShiftRight')) {
      this._tryDash(input);
    }

    // ── Attack ──
    if (input.isPressed('Space') && this.attackCooldown <= 0) {
      return 'attack';
    }

    // ── Special ──
    if (input.isPressed('KeyE') && this.specialCooldown <= 0 && this.weapon.special) {
      return 'special';
    }

    return null;
  }

  _tryDash() {
    if (this.dashCooldown > 0) return;
    const speed = 400;
    this.dashVx = this.facing.x * speed;
    this.dashVy = this.facing.y * speed;
    if (this.dashVx === 0 && this.dashVy === 0) this.dashVx = speed;
    this.dashTime     = 160;
    this.dashCooldown = 1200;
    this.invincible   = 200;
  }

  /** Returns attack data for this frame */
  getAttackData() {
    const cd  = this.weapon.cooldown;
    const isCrit = Math.random() < this.critChance;
    let dmg = this.weapon.damage * this.damage;
    if (this.hasEffect('infernalRage')) dmg *= 2;
    if (isCrit) dmg = Math.ceil(dmg * 1.8);
    this.attackCooldown = cd;
    this.swingAnim = 1;
    this.totalDamageDealt += dmg;
    return {
      x: this.x + this.facing.x * 20,
      y: this.y + this.facing.y * 20,
      range: this.weapon.range,
      arc:   this.weapon.arc,
      angle: Math.atan2(this.facing.y, this.facing.x),
      damage: Math.round(dmg),
      isCrit,
    };
  }

  draw(ctx, camX, camY) {
    const sx = this.x - camX;
    const sy = this.y - camY;

    ctx.save();
    ctx.translate(sx, sy);

    // I-frame flicker
    if (this.invincible > 0 && Math.floor(this.invincible / 80) % 2 === 0) {
      ctx.globalAlpha = 0.4;
    }

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(0, this.h / 2 - 2, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body
    const w = this.w, h = this.h;
    ctx.fillStyle = '#d4c4b0';
    ctx.fillRect(-w / 2, -h / 2, w, h);

    // Armor tint
    ctx.fillStyle = 'rgba(80,60,50,0.6)';
    ctx.fillRect(-w / 2, -h / 2, w, h * 0.65);

    // Eye / face direction indicator
    const ex = this.facing.x * 6;
    const ey = this.facing.y * 6;
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.arc(ex * 0.5, ey * 0.5 - 2, 3, 0, Math.PI * 2);
    ctx.fill();

    // Dash effect
    if (this.dashTime > 0) {
      ctx.strokeStyle = 'rgba(200,180,255,0.5)';
      ctx.lineWidth = 3;
      ctx.strokeRect(-w / 2, -h / 2, w, h);
    }

    // Weapon swing arc
    if (this.swingAnim > 0) {
      const a   = Math.atan2(this.facing.y, this.facing.x);
      const arc = this.weapon.arc;
      const r   = this.weapon.range;
      ctx.save();
      ctx.globalAlpha = this.swingAnim * 0.35;
      ctx.fillStyle = this.weapon.color || '#f1c40f';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, r, a - arc / 2, a + arc / 2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }
}

/* ──────────────────────────────────────────────────────────────
   ENEMY BASE CLASS
────────────────────────────────────────────────────────────── */
class Enemy {
  constructor(x, y, cfg) {
    this.x = x; this.y = y;
    this.w = cfg.w || 28; this.h = cfg.h || 28;
    this.maxHp  = cfg.hp;
    this.hp     = cfg.hp;
    this.speed  = cfg.speed  || 80;
    this.damage = cfg.damage || 8;
    this.souls  = cfg.souls  || 5;
    this.color  = cfg.color  || '#c0392b';
    this.name   = cfg.name   || 'Enemy';
    this.xp     = cfg.xp    || 0;

    this.state       = 'patrol';   // patrol | chase | attack | dying | dead
    this.patrolTimer = Utils.rand(0, 3000);
    this.patrolDir   = { x: 1, y: 0 };
    this.attackCooldown = 0;
    this.attackRange    = cfg.attackRange || 34;
    this.detectRange    = cfg.detectRange || 200;
    this.hitFlash       = 0;
    this.knockVx        = 0;
    this.knockVy        = 0;
    this.knockTime      = 0;
    this.dyingTimer     = 0;
    this.alive          = true;
    this.deathParticlesDone = false;
  }

  get left()   { return this.x - this.w / 2; }
  get top()    { return this.y - this.h / 2; }
  get right()  { return this.x + this.w / 2; }
  get bottom() { return this.y + this.h / 2; }

  takeDamage(amount) {
    if (this.state === 'dying' || this.state === 'dead') return 0;
    this.hp -= amount;
    this.hitFlash = 180;
    this.state = 'chase';
    if (this.hp <= 0) {
      this.hp = 0;
      this.state = 'dying';
      this.dyingTimer = 400;
    }
    return amount;
  }

  applyKnockback(vx, vy) {
    this.knockVx = vx; this.knockVy = vy;
    this.knockTime = 200;
  }

  update(dt, player, world) {
    const dtSec = dt / 1000;
    if (this.hitFlash > 0)      this.hitFlash      -= dt;
    if (this.attackCooldown > 0) this.attackCooldown -= dt;
    if (this.knockTime > 0) {
      this.knockTime -= dt;
      this.x += this.knockVx * dtSec;
      this.y += this.knockVy * dtSec;
      return null;
    }

    if (this.state === 'dying') {
      this.dyingTimer -= dt;
      if (this.dyingTimer <= 0) { this.state = 'dead'; this.alive = false; }
      return null;
    }
    if (this.state === 'dead') return null;

    const dist = Utils.dist(this.x, this.y, player.x, player.y);

    // ── State machine ──
    switch (this.state) {
      case 'patrol':
        this._patrol(dt, world);
        if (dist < this.detectRange) this.state = 'chase';
        break;

      case 'chase':
        if (dist > this.detectRange * 1.5) { this.state = 'patrol'; break; }
        if (dist < this.attackRange) { this.state = 'attack'; break; }
        this._moveToward(player.x, player.y, dtSec, world);
        break;

      case 'attack':
        if (dist > this.attackRange * 1.3) { this.state = 'chase'; break; }
        if (this.attackCooldown <= 0) {
          this.attackCooldown = 1200;
          return { type: 'attack', damage: this.damage };
        }
        break;
    }
    return null;
  }

  _patrol(dt, world) {
    this.patrolTimer -= dt;
    if (this.patrolTimer <= 0) {
      this.patrolTimer = Utils.rand(1500, 4000);
      const angle = Math.random() * Math.PI * 2;
      this.patrolDir = { x: Math.cos(angle), y: Math.sin(angle) };
    }
    const dtSec = dt / 1000;
    const nx = this.x + this.patrolDir.x * (this.speed * 0.4) * dtSec;
    const ny = this.y + this.patrolDir.y * (this.speed * 0.4) * dtSec;
    if (!world.collidesAt(nx, this.y, this.w, this.h)) this.x = nx;
    else this.patrolDir.x *= -1;
    if (!world.collidesAt(this.x, ny, this.w, this.h)) this.y = ny;
    else this.patrolDir.y *= -1;
  }

  _moveToward(tx, ty, dtSec, world) {
    const a  = Utils.angle(this.x, this.y, tx, ty);
    const vx = Math.cos(a) * this.speed;
    const vy = Math.sin(a) * this.speed;
    const nx = this.x + vx * dtSec;
    const ny = this.y + vy * dtSec;
    if (!world.collidesAt(nx, this.y, this.w, this.h)) this.x = nx;
    if (!world.collidesAt(this.x, ny, this.w, this.h)) this.y = ny;
  }

  draw(ctx, camX, camY) {
    if (this.state === 'dead') return;
    const sx = this.x - camX;
    const sy = this.y - camY;

    ctx.save();
    ctx.translate(sx, sy);

    const alpha = this.state === 'dying' ? this.dyingTimer / 400 : 1;
    ctx.globalAlpha = alpha;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(0, this.h / 2 - 2, this.w * 0.4, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = this.hitFlash > 0 ? '#ffffff' : this.color;
    ctx.fillRect(-this.w / 2, -this.h / 2, this.w, this.h);

    // Eyes
    ctx.fillStyle = '#ff0';
    ctx.fillRect(-5, -this.h / 4, 4, 4);
    ctx.fillRect(2,  -this.h / 4, 4, 4);

    // HP bar
    if (this.hp < this.maxHp) {
      const bw = this.w + 4;
      const bh = 4;
      const bx = -bw / 2;
      const by = -this.h / 2 - 8;
      ctx.fillStyle = '#3a0000';
      ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = '#e74c3c';
      ctx.fillRect(bx, by, bw * (this.hp / this.maxHp), bh);
    }

    ctx.restore();
  }
}

/* ──────────────────────────────────────────────────────────────
   ENEMY CONFIGS — Layer 1
────────────────────────────────────────────────────────────── */
const ENEMY_DEFS = {
  huskWalker: {
    name: 'Husk Walker', hp: 30, speed: 70, damage: 8,
    souls: 5, color: '#5a4a3a', w: 26, h: 26,
    attackRange: 32, detectRange: 180,
  },
  lostSoul: {
    name: 'Lost Soul', hp: 18, speed: 120, damage: 5,
    souls: 3, color: '#4a3a6a', w: 22, h: 22,
    attackRange: 28, detectRange: 220,
  },
  soulBat: {
    name: 'Soul Bat', hp: 14, speed: 150, damage: 4,
    souls: 2, color: '#2a1a4a', w: 18, h: 18,
    attackRange: 24, detectRange: 240,
  },
};

/* ──────────────────────────────────────────────────────────────
   BOSS BASE CLASS
────────────────────────────────────────────────────────────── */
class Boss extends Enemy {
  constructor(x, y, cfg) {
    super(x, y, cfg);
    this.phases      = cfg.phases;
    this.currentPhase = 0;
    this.isBoss      = true;
    this.w = cfg.w || 52; this.h = cfg.h || 52;
    this.phaseHpThresholds = cfg.phaseHpThresholds || [0.66, 0.33];
    this.phaseActions = [];   // queued special actions
    this.specialTimer = 0;
    this.specialCooldown = cfg.specialCooldown || 3000;
  }

  get phase() { return this.currentPhase; }

  update(dt, player, world) {
    const result = super.update(dt, player, world);
    if (this.state === 'dying' || this.state === 'dead') return result;

    // Phase transitions
    const ratio = this.hp / this.maxHp;
    if (this.currentPhase === 0 && ratio < this.phaseHpThresholds[0]) {
      this.currentPhase = 1;
      this._onPhaseChange(1);
    } else if (this.currentPhase === 1 && ratio < this.phaseHpThresholds[1]) {
      this.currentPhase = 2;
      this._onPhaseChange(2);
    }

    // Special attacks
    this.specialTimer -= dt;
    if (this.specialTimer <= 0) {
      this.specialTimer = this.specialCooldown;
      return this._doSpecial(player);
    }
    return result;
  }

  _onPhaseChange(phase) {
    // Override in subclasses
    this.speed += 20;
    this.damage += 4;
  }

  _doSpecial(player) {
    return null; // Override in subclasses
  }
}

/* ──────────────────────────────────────────────────────────────
   GATEKEEPER BOSS
────────────────────────────────────────────────────────────── */
class Gatekeeper extends Boss {
  constructor(x, y) {
    super(x, y, {
      name: 'The Gatekeeper', hp: 280, speed: 60, damage: 18,
      souls: 80, color: '#4a2020', w: 56, h: 56,
      attackRange: 52, detectRange: 320,
      specialCooldown: 4000,
      phases: ['basic', 'groundSlam', 'enraged'],
      phaseHpThresholds: [0.65, 0.35],
    });
    this.groundSlamActive = false;
    this.groundSlamTimer  = 0;
  }

  _onPhaseChange(phase) {
    if (phase === 1) { this.speed += 15; this.damage += 5; }
    if (phase === 2) { this.speed += 20; this.damage += 8; this.attackCooldown = 700; }
  }

  _doSpecial(player) {
    if (this.currentPhase === 0) return null;
    if (this.currentPhase === 1) {
      return { type: 'groundSlam', x: this.x, y: this.y, radius: 90, damage: 22 };
    }
    if (this.currentPhase === 2) {
      return { type: 'groundSlam', x: this.x, y: this.y, radius: 120, damage: 28 };
    }
    return null;
  }

  draw(ctx, camX, camY) {
    if (this.state === 'dead') return;
    const sx = this.x - camX;
    const sy = this.y - camY;
    ctx.save();
    ctx.translate(sx, sy);

    const alpha = this.state === 'dying' ? this.dyingTimer / 400 : 1;
    ctx.globalAlpha = alpha;

    // Glow aura
    const grd = ctx.createRadialGradient(0, 0, 0, 0, 0, 50);
    grd.addColorStop(0, 'rgba(180,20,0,0.2)');
    grd.addColorStop(1, 'rgba(180,20,0,0)');
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(0, 0, 50, 0, Math.PI * 2); ctx.fill();

    // Body
    ctx.fillStyle = this.hitFlash > 0 ? '#ffffff' : '#4a2020';
    ctx.fillRect(-this.w / 2, -this.h / 2, this.w, this.h);

    // Armor plates
    ctx.fillStyle = '#2a1010';
    ctx.fillRect(-this.w / 2, -this.h / 2, this.w, 12);
    ctx.fillRect(-this.w / 2, this.h / 2 - 12, this.w, 12);

    // Axe
    ctx.fillStyle = '#888';
    ctx.fillRect(this.w / 2 - 4, -this.h / 2, 8, this.h);
    ctx.fillStyle = '#c0392b';
    ctx.fillRect(this.w / 2,     -this.h / 2, 18, 20);
    ctx.fillRect(this.w / 2,     this.h / 2 - 20, 18, 20);

    // Eyes — red in phase 2
    ctx.fillStyle = this.currentPhase >= 2 ? '#ff2200' : '#ffaa00';
    ctx.fillRect(-10, -8, 8, 8);
    ctx.fillRect(2,   -8, 8, 8);

    // HP bar
    const bw = this.w + 20;
    const bx = -bw / 2;
    const by = -this.h / 2 - 14;
    ctx.fillStyle = '#1a0000'; ctx.fillRect(bx, by, bw, 6);
    ctx.fillStyle = '#c0392b'; ctx.fillRect(bx, by, bw * (this.hp / this.maxHp), 6);

    ctx.restore();
  }
}

/* ──────────────────────────────────────────────────────────────
   PARTICLE SYSTEM
────────────────────────────────────────────────────────────── */
class Particle {
  constructor(x, y, cfg) {
    this.x = x; this.y = y;
    this.vx = cfg.vx || 0; this.vy = cfg.vy || 0;
    this.life = cfg.life || 600;
    this.maxLife = this.life;
    this.size = cfg.size || 3;
    this.color = cfg.color || '#f1c40f';
    this.gravity = cfg.gravity || 0;
    this.fade = cfg.fade !== false;
  }
  update(dt) {
    const s = dt / 1000;
    this.x  += this.vx * s;
    this.y  += this.vy * s;
    this.vy += this.gravity * s;
    this.life -= dt;
    return this.life > 0;
  }
  draw(ctx, camX, camY) {
    const t = this.life / this.maxLife;
    ctx.globalAlpha = this.fade ? t : 1;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x - camX, this.y - camY, this.size * t, 0, Math.PI * 2);
    ctx.fill();
  }
}

class ParticleSystem {
  constructor() { this.particles = []; }

  spawn(x, y, cfg) { this.particles.push(new Particle(x, y, cfg)); }

  burst(x, y, count, cfg) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Utils.rand(cfg.speedMin || 40, cfg.speedMax || 120);
      this.spawn(x, y, {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        ...cfg,
      });
    }
  }

  bloodBurst(x, y, count = 8) {
    this.burst(x, y, count, {
      color: '#c0392b', size: 3, life: 500,
      speedMin: 60, speedMax: 140, gravity: 200,
    });
  }

  soulBurst(x, y, count = 12) {
    this.burst(x, y, count, {
      color: '#8e44ad', size: 2, life: 700,
      speedMin: 40, speedMax: 100,
    });
    this.burst(x, y, 4, {
      color: '#f1c40f', size: 2, life: 900,
      speedMin: 20, speedMax: 60,
    });
  }

  swordSlash(x, y, angle, range) {
    for (let i = 0; i < 6; i++) {
      const a = angle + Utils.rand(-0.5, 0.5);
      const r = Utils.rand(0, range);
      this.spawn(x + Math.cos(a) * r, y + Math.sin(a) * r, {
        vx: Math.cos(a) * 30, vy: Math.sin(a) * 30,
        color: '#f1c40f', size: 2, life: 200,
      });
    }
  }

  groundSlam(x, y, radius) {
    this.burst(x, y, 20, {
      color: '#c0392b', size: 4, life: 600,
      speedMin: radius * 0.3, speedMax: radius * 0.8, gravity: 300,
    });
    this.burst(x, y, 10, {
      color: '#8B4513', size: 3, life: 400,
      speedMin: 20, speedMax: 60, gravity: 400,
    });
  }

  update(dt) {
    this.particles = this.particles.filter(p => p.update(dt));
  }

  draw(ctx, camX, camY) {
    ctx.save();
    for (const p of this.particles) p.draw(ctx, camX, camY);
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

/* ──────────────────────────────────────────────────────────────
   PICKUPS
────────────────────────────────────────────────────────────── */
class Pickup {
  constructor(x, y, type) {
    this.x = x; this.y = y;
    this.type = type;
    this.alive = true;
    this.bobTimer = Math.random() * Math.PI * 2;
    this.w = 20; this.h = 20;
  }
  update(dt) { this.bobTimer += dt / 1000 * 2; }
  draw(ctx, camX, camY) {
    const sy = Math.sin(this.bobTimer) * 4;
    const sx = this.x - camX;
    const sby = this.y - camY + sy;
    ctx.save();
    ctx.shadowColor = PICKUP_CFG[this.type]?.glowColor || '#fff';
    ctx.shadowBlur  = 12;
    ctx.font = '18px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(PICKUP_CFG[this.type]?.icon || '?', sx, sby);
    ctx.restore();
  }
}

const PICKUP_CFG = {
  soulHeart:    { icon: '❤',  glowColor: '#e74c3c', desc: '+25 HP' },
  infernalRage: { icon: '🔥', glowColor: '#e67e22', desc: '2x damage 10s' },
  shadowStep:   { icon: '💨', glowColor: '#8e44ad', desc: '+50% speed 8s' },
  cursedArmor:  { icon: '🛡', glowColor: '#1abc9c', desc: '50% dmg reduction 10s' },
  hellfireAura: { icon: '⚡', glowColor: '#f1c40f', desc: 'Aura dmg 8s' },
};

/* ──────────────────────────────────────────────────────────────
   TILE MAP
────────────────────────────────────────────────────────────── */
class TileMap {
  constructor(grid, layer) {
    this.grid   = grid;           // 2D array of T.*
    this.rows   = grid.length;
    this.cols   = grid[0].length;
    this.layer  = layer;
    this.width  = this.cols * TILE;
    this.height = this.rows * TILE;
  }

  tileAt(col, row) {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return T.WALL;
    return this.grid[row][col];
  }

  isWalkable(col, row) {
    const t = this.tileAt(col, row);
    return t === T.FLOOR || t === T.DOOR || t === T.CHECKPOINT || t === T.CHEST;
  }

  /** True if a rectangle (world px, centre) overlaps a wall */
  collidesAt(cx, cy, w, h) {
    const pad = 2;
    const x1 = cx - w / 2 + pad, y1 = cy - h / 2 + pad;
    const x2 = cx + w / 2 - pad, y2 = cy + h / 2 - pad;
    const c1 = Math.floor(x1 / TILE), r1 = Math.floor(y1 / TILE);
    const c2 = Math.floor(x2 / TILE), r2 = Math.floor(y2 / TILE);
    for (let r = r1; r <= r2; r++) {
      for (let c = c1; c <= c2; c++) {
        if (!this.isWalkable(c, r)) return true;
      }
    }
    return false;
  }

  draw(ctx, camX, camY, canvasW, canvasH) {
    const startC = Math.max(0, Math.floor(camX / TILE));
    const startR = Math.max(0, Math.floor(camY / TILE));
    const endC   = Math.min(this.cols, Math.ceil((camX + canvasW) / TILE));
    const endR   = Math.min(this.rows, Math.ceil((camY + canvasH) / TILE));

    for (let r = startR; r < endR; r++) {
      for (let c = startC; c < endC; c++) {
        const tile = this.grid[r][c];
        const x = c * TILE - camX;
        const y = r * TILE - camY;
        this._drawTile(ctx, tile, x, y, c, r);
      }
    }
  }

  _drawTile(ctx, tile, x, y, c, r) {
    const lyr = this.layer;
    switch (tile) {
      case T.VOID:
        ctx.fillStyle = '#050305';
        ctx.fillRect(x, y, TILE, TILE);
        break;
      case T.FLOOR:
        ctx.fillStyle = lyr.floorColor;
        ctx.fillRect(x, y, TILE, TILE);
        // Subtle grid lines
        ctx.strokeStyle = lyr.accentColor;
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x, y, TILE, TILE);
        break;
      case T.WALL:
        ctx.fillStyle = lyr.wallColor;
        ctx.fillRect(x, y, TILE, TILE);
        // Top edge highlight
        ctx.fillStyle = 'rgba(255,255,255,0.04)';
        ctx.fillRect(x, y, TILE, 2);
        // Side shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(x + TILE - 4, y, 4, TILE);
        ctx.fillRect(x, y + TILE - 4, TILE, 4);
        break;
      case T.DOOR:
        ctx.fillStyle = '#3a2010';
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = '#6a4020';
        ctx.fillRect(x + 8, y + 4, TILE - 16, TILE - 8);
        ctx.fillStyle = '#f1c40f';
        ctx.beginPath();
        ctx.arc(x + TILE / 2, y + TILE / 2, 4, 0, Math.PI * 2);
        ctx.fill();
        break;
      case T.CHECKPOINT:
        ctx.fillStyle = lyr.floorColor;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = 'rgba(142,68,173,0.25)';
        ctx.fillRect(x, y, TILE, TILE);
        ctx.strokeStyle = '#8e44ad';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 4, y + 4, TILE - 8, TILE - 8);
        ctx.fillStyle = '#8e44ad';
        ctx.font = '20px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⚜', x + TILE / 2, y + TILE / 2);
        break;
      case T.CHEST:
        ctx.fillStyle = lyr.floorColor;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = '#6B4226';
        ctx.fillRect(x + 8, y + 12, TILE - 16, TILE - 20);
        ctx.fillStyle = '#8B5A2B';
        ctx.fillRect(x + 8, y + 12, TILE - 16, 8);
        ctx.fillStyle = '#f1c40f';
        ctx.fillRect(x + TILE / 2 - 3, y + 14, 6, 8);
        break;
      default:
        ctx.fillStyle = '#050305';
        ctx.fillRect(x, y, TILE, TILE);
    }
  }
}

/* ──────────────────────────────────────────────────────────────
   MAP DEFINITIONS — Layer 1 (hand-crafted 30×22)
   Legend: 0=void, 1=floor, 2=wall, 3=door, 4=checkpoint, 5=chest
────────────────────────────────────────────────────────────── */
function buildLayer1Map() {
  // prettier-ignore
  const grid = [
    [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2],
    [2,1,1,1,1,2,2,1,1,1,1,1,1,2,2,1,1,1,1,1,1,2,2,1,1,1,1,1,1,2],
    [2,1,1,1,1,2,2,1,1,1,1,1,1,2,2,1,1,1,1,1,1,2,2,1,1,1,1,1,1,2],
    [2,1,1,1,1,2,2,1,1,1,1,1,1,2,2,1,1,1,1,1,1,2,2,1,1,1,1,1,1,2],
    [2,1,1,1,1,3,3,1,1,1,1,1,1,3,3,1,1,1,1,1,1,3,3,1,1,1,1,1,1,2],
    [2,1,1,1,1,2,2,1,1,1,1,1,1,2,2,1,1,4,1,1,1,2,2,1,1,1,1,1,1,2],
    [2,1,1,1,1,2,2,1,1,1,1,1,1,2,2,1,1,1,1,1,1,2,2,1,1,5,1,1,1,2],
    [2,2,2,1,2,2,2,2,2,2,1,2,2,2,2,2,2,1,2,2,2,2,2,2,2,2,1,2,2,2],
    [2,2,2,1,2,2,2,2,2,2,1,2,2,2,2,2,2,1,2,2,2,2,2,2,2,2,1,2,2,2],
    [2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2],
    [2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2],
    [2,1,1,2,2,2,1,1,2,2,2,2,1,1,1,1,2,2,2,2,1,1,2,2,2,2,1,1,1,2],
    [2,1,1,2,2,2,1,1,2,2,2,2,1,1,1,1,2,2,2,2,1,1,2,2,2,2,1,1,1,2],
    [2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2],
    [2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2],
    [2,1,1,1,1,2,2,1,1,1,1,1,1,2,2,1,1,1,1,1,1,2,2,1,1,1,1,1,1,2],
    [2,1,1,1,1,2,2,1,1,1,1,1,1,2,2,1,1,1,1,1,1,2,2,1,1,1,1,1,1,2],
    [2,1,4,1,1,2,2,1,1,5,1,1,1,2,2,1,1,1,1,1,1,2,2,1,1,1,1,1,1,2],
    [2,1,1,1,1,3,3,1,1,1,1,1,1,3,3,1,1,1,1,1,1,3,3,1,1,1,1,1,1,2],
    [2,1,1,1,1,2,2,1,1,1,1,1,1,2,2,1,1,1,1,1,1,2,2,1,1,1,1,1,1,2],
    [2,1,1,1,1,2,2,1,1,1,1,1,1,2,2,1,1,1,1,1,1,2,2,1,1,1,1,1,1,2],
    [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2],
  ];
  return new TileMap(grid, LAYERS[0]);
}

/* Boss arena — separate room loaded when Gatekeeper fight begins */
function buildBossArena() {
  // prettier-ignore
  const grid = [
    [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2],
    [2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2],
    [2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2],
    [2,1,1,2,2,1,1,1,1,1,1,1,1,1,1,2,2,1,1,2],
    [2,1,1,2,2,1,1,1,1,1,1,1,1,1,1,2,2,1,1,2],
    [2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2],
    [2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2],
    [2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2],
    [2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2],
    [2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2],
    [2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2],
    [2,1,1,2,2,1,1,1,1,1,1,1,1,1,1,2,2,1,1,2],
    [2,1,1,2,2,1,1,1,1,1,1,1,1,1,1,2,2,1,1,2],
    [2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2],
    [2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2],
    [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2],
  ];
  return new TileMap(grid, LAYERS[0]);
}

/* ──────────────────────────────────────────────────────────────
   WORLD — manages current map, enemies, pickups
────────────────────────────────────────────────────────────── */
class World {
  constructor() {
    this.map      = null;
    this.enemies  = [];
    this.pickups  = [];
    this.boss     = null;
    this.bossArena = false;
    this.layerIndex = 0;
    this.cleared    = false;
    this.bossDefeated = false;
  }

  loadLayer1() {
    this.layerIndex = 0;
    this.bossArena  = false;
    this.map        = buildLayer1Map();
    this.enemies    = [];
    this.pickups    = [];
    this.boss       = null;
    this.cleared    = false;
    this.bossDefeated = false;
    this._spawnLayer1Enemies();
  }

  loadBossArena() {
    this.bossArena = true;
    this.map = buildBossArena();
    this.enemies = [];
    this.pickups = [];
    // Boss spawns center-top of arena
    const cx = this.map.width / 2;
    const cy = TILE * 3;
    this.boss = new Gatekeeper(cx, cy);
  }

  _spawnLayer1Enemies() {
    const positions = [
      // Room 1 — top-left cluster
      { x: 2, y: 2 }, { x: 3, y: 3 }, { x: 4, y: 2 },
      // Room 2 — top-center
      { x: 9, y: 2 }, { x: 10, y: 3 }, { x: 11, y: 2 },
      // Room 3 — top-right
      { x: 24, y: 2 }, { x: 25, y: 3 }, { x: 26, y: 2 },
      // Corridor
      { x: 5, y: 9 }, { x: 10, y: 10 }, { x: 15, y: 9 }, { x: 20, y: 10 }, { x: 25, y: 9 },
      // Lower rooms
      { x: 2, y: 16 }, { x: 3, y: 19 },
      { x: 9, y: 17 }, { x: 10, y: 19 },
      { x: 24, y: 17 }, { x: 25, y: 19 },
    ];
    const types = ['huskWalker', 'lostSoul', 'soulBat'];
    for (const p of positions) {
      const type = Utils.choice(types);
      const def  = ENEMY_DEFS[type];
      this.enemies.push(new Enemy(
        p.x * TILE + TILE / 2,
        p.y * TILE + TILE / 2,
        def
      ));
    }
  }

  collidesAt(x, y, w, h) {
    return this.map ? this.map.collidesAt(x, y, w, h) : false;
  }

  /** Returns tile type at world px coords */
  tileAtPx(wx, wy) {
    return this.map ? this.map.tileAt(Math.floor(wx / TILE), Math.floor(wy / TILE)) : T.WALL;
  }

  update(dt, player, particles) {
    // Enemies
    for (const e of this.enemies) {
      const result = e.update(dt, player, this);
      if (result?.type === 'attack') {
        const dist = Utils.dist(e.x, e.y, player.x, player.y);
        if (dist < e.attackRange + 10) {
          const taken = player.takeDamage(result.damage);
          if (taken > 0) particles.bloodBurst(player.x, player.y, 5);
        }
      }
    }

    // Boss
    if (this.boss && this.boss.alive) {
      const result = this.boss.update(dt, player, this);
      if (result?.type === 'attack') {
        const dist = Utils.dist(this.boss.x, this.boss.y, player.x, player.y);
        if (dist < this.boss.attackRange + 12) {
          const taken = player.takeDamage(result.damage);
          if (taken > 0) {
            particles.bloodBurst(player.x, player.y, 8);
          }
        }
      }
      if (result?.type === 'groundSlam') {
        particles.groundSlam(result.x, result.y, result.radius);
        const dist = Utils.dist(player.x, player.y, result.x, result.y);
        if (dist < result.radius) {
          const taken = player.takeDamage(result.damage);
          if (taken > 0) particles.bloodBurst(player.x, player.y, 10);
        }
      }
    }

    // Remove dead enemies
    const deadEnemies = this.enemies.filter(e => !e.alive);
    for (const e of deadEnemies) {
      particles.soulBurst(e.x, e.y, 10);
      player.addSouls(e.souls);
      player.killCount++;
      // Random pickup drop (30%)
      if (Math.random() < 0.30) {
        const pickupTypes = Object.keys(PICKUP_CFG);
        this.pickups.push(new Pickup(e.x, e.y, Utils.choice(pickupTypes)));
      }
    }
    this.enemies = this.enemies.filter(e => e.alive);

    // Boss death
    if (this.boss && !this.boss.alive && !this.bossDefeated) {
      this.bossDefeated = true;
      particles.soulBurst(this.boss.x, this.boss.y, 30);
      player.addSouls(this.boss.souls);
      player.killCount++;
      // Drop Heavy Axe
      this.pickups.push(new Pickup(this.boss.x, this.boss.y + 40, '__weapon_heavyAxe'));
    }

    // Pickups
    for (const pk of this.pickups) pk.update(dt);
    const collected = [];
    for (const pk of this.pickups) {
      if (Utils.dist(pk.x, pk.y, player.x, player.y) < 28) {
        this._applyPickup(pk, player, particles);
        pk.alive = false;
        collected.push(pk);
      }
    }
    this.pickups = this.pickups.filter(p => p.alive);

    // Check cleared
    if (!this.cleared && this.enemies.length === 0 && (!this.boss || this.bossDefeated)) {
      this.cleared = true;
    }
    return collected;
  }

  _applyPickup(pk, player, particles) {
    if (pk.type === 'soulHeart') {
      player.heal(25);
      particles.burst(pk.x, pk.y, 6, { color: '#e74c3c', size: 3, life: 400, speedMin: 30, speedMax: 80 });
    } else if (pk.type === 'infernalRage') {
      player.applyEffect('infernalRage', 10000);
    } else if (pk.type === 'shadowStep') {
      player.applyEffect('shadowStep', 8000);
    } else if (pk.type === 'cursedArmor') {
      player.applyEffect('cursedArmor', 10000);
    } else if (pk.type === 'hellfireAura') {
      player.applyEffect('hellfireAura', 8000);
    } else if (pk.type === '__weapon_heavyAxe') {
      player.equipWeapon('heavyAxe');
    }
  }

  draw(ctx, camX, camY, canvasW, canvasH) {
    this.map.draw(ctx, camX, camY, canvasW, canvasH);
    for (const e of this.enemies) e.draw(ctx, camX, camY);
    if (this.boss) this.boss.draw(ctx, camX, camY);
    for (const pk of this.pickups) pk.draw(ctx, camX, camY);
  }
}

/* ──────────────────────────────────────────────────────────────
   CAMERA
────────────────────────────────────────────────────────────── */
class Camera {
  constructor() { this.x = 0; this.y = 0; }

  follow(target, mapW, mapH, viewW, viewH) {
    const tx = target.x - viewW / 2;
    const ty = target.y - viewH / 2;
    this.x = Utils.clamp(tx, 0, Math.max(0, mapW  - viewW));
    this.y = Utils.clamp(ty, 0, Math.max(0, mapH - viewH));
  }
}

/* ──────────────────────────────────────────────────────────────
   UI MANAGER
────────────────────────────────────────────────────────────── */
class UIManager {
  constructor() {
    this.hpBar       = document.getElementById('hpBar');
    this.hpText      = document.getElementById('hpText');
    this.soulCount   = document.getElementById('soulCount');
    this.layerRoman  = document.getElementById('layerRoman');
    this.layerName   = document.getElementById('layerName');
    this.weaponName  = document.getElementById('weaponName');
    this.dashCd      = document.getElementById('dashCd');
    this.specialCd   = document.getElementById('specialCd');
    this.slotDash    = document.getElementById('slotDash');
    this.slotSpecial = document.getElementById('slotSpecial');
    this.bossHud     = document.getElementById('bossHud');
    this.bossBar     = document.getElementById('bossBar');
    this.bossName    = document.getElementById('bossName');
    this.bossPhase   = document.getElementById('bossPhase');
    this.interactPrompt = document.getElementById('interactPrompt');
    this.interactAction = document.getElementById('interactAction');
    this.roomInfo    = document.getElementById('roomInfo');
    this.damageLayer = document.getElementById('damageLayer');
    this.deathCause  = document.getElementById('deathCause');
    this.gameoverStats = document.getElementById('gameoverStats');
    this.victoryStats  = document.getElementById('victoryStats');
    this.upgradeSoulsCount = document.getElementById('upgradeSoulsCount');
    this.upgradeOptions    = document.getElementById('upgradeOptions');
    this.gameScreen  = document.getElementById('screen-game');
  }

  update(player, world) {
    // HP
    const hpPct = player.hp / player.maxHp;
    this.hpBar.style.width = (hpPct * 100) + '%';
    this.hpText.textContent = `${player.hp} / ${player.maxHp}`;
    // Low HP effect
    this.gameScreen.classList.toggle('low-hp', hpPct < 0.25);

    // Souls
    this.soulCount.textContent = `💀 ${player.souls}`;

    // Weapon
    this.weaponName.textContent = player.weapon.name;

    // Cooldowns
    const dc = Math.max(0, player.dashCooldown);
    this.dashCd.textContent = dc > 0 ? (dc / 1000).toFixed(1) + 's' : '';
    this.slotDash.classList.toggle('on-cooldown', dc > 0);

    const sc = Math.max(0, player.specialCooldown);
    this.specialCd.textContent = sc > 0 ? (sc / 1000).toFixed(1) + 's' : '';
    this.slotSpecial.classList.toggle('on-cooldown', sc > 0 || !player.weapon.special);

    // Boss HUD
    if (world.boss && world.boss.alive) {
      this.bossHud.classList.remove('hidden');
      this.bossName.textContent = world.boss.name;
      this.bossBar.style.width  = (world.boss.hp / world.boss.maxHp * 100) + '%';
      const phases = ['Phase I', 'Phase II', 'Phase III'];
      this.bossPhase.textContent = phases[world.boss.currentPhase] || 'Phase I';
    } else {
      this.bossHud.classList.add('hidden');
    }
  }

  showInteractPrompt(action) {
    this.interactAction.textContent = action;
    this.interactPrompt.classList.remove('hidden');
  }
  hideInteractPrompt() {
    this.interactPrompt.classList.add('hidden');
  }

  showRoomInfo(text, duration = 2500) {
    this.roomInfo.textContent = text;
    this.roomInfo.classList.remove('hidden');
    clearTimeout(this._roomInfoTimer);
    this._roomInfoTimer = setTimeout(() => this.roomInfo.classList.add('hidden'), duration);
  }

  spawnDamageNumber(x, y, amount, type = 'enemy-dmg', camX = 0, camY = 0) {
    const el = document.createElement('div');
    el.className = `dmg-number ${type}`;
    el.textContent = type === 'soul-pick' ? `+${amount} souls` : (type === 'crit' ? `${amount}!` : amount);
    el.style.left = (x - camX) + 'px';
    el.style.top  = (y - camY - 20) + 'px';
    this.damageLayer.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }

  screenShake() {
    this.gameScreen.classList.remove('shake');
    void this.gameScreen.offsetWidth; // reflow
    this.gameScreen.classList.add('shake');
    setTimeout(() => this.gameScreen.classList.remove('shake'), 400);
  }

  setLayer(layerData) {
    this.layerRoman.textContent = layerData.roman;
    this.layerName.textContent  = layerData.name;
  }

  buildUpgradeScreen(player, onBuy) {
    this.upgradeSoulsCount.textContent = player.souls;
    const upgrades = [
      { id: 'hp',     icon: '❤',  name: '+25 Max HP',         cost: 20, desc: 'Increases max health' },
      { id: 'damage', icon: '⚔',  name: '+20% Damage',        cost: 25, desc: 'More damage per hit' },
      { id: 'speed',  icon: '💨', name: '+15% Move Speed',    cost: 20, desc: 'Move faster' },
      { id: 'crit',   icon: '✦',  name: '+5% Crit Chance',    cost: 30, desc: 'More critical hits' },
    ];
    this.upgradeOptions.innerHTML = '';
    for (const u of upgrades) {
      const cost = u.cost + player.upgrades[u.id] * 10;
      const card = document.createElement('div');
      card.className = 'upgrade-card' + (player.souls < cost ? ' disabled' : '');
      card.innerHTML = `
        <div class="upgrade-card-icon">${u.icon}</div>
        <div class="upgrade-card-name">${u.name}</div>
        <div class="upgrade-card-cost">💀 ${cost} souls</div>
        <div class="upgrade-card-desc">${u.desc}</div>
      `;
      if (player.souls >= cost) {
        card.addEventListener('click', () => {
          player.souls -= cost;
          player.upgrades[u.id]++;
          if (u.id === 'hp')     { player.maxHp += 25; player.hp += 25; }
          if (u.id === 'damage') player.damage  += 0.2;
          if (u.id === 'speed')  player.speed   += player.speed * 0.15;
          if (u.id === 'crit')   player.critChance += 0.05;
          onBuy();
        });
      }
      this.upgradeOptions.appendChild(card);
    }
  }

  showDeathScreen(cause, player) {
    this.deathCause.textContent = cause;
    this.gameoverStats.innerHTML = `
      Souls collected: ${player.totalSoulsCollected}<br>
      Enemies slain: ${player.killCount}<br>
      Damage dealt: ${player.totalDamageDealt}
    `;
  }

  showVictoryScreen(player) {
    this.victoryStats.innerHTML = `
      Layer reached: I (Gatekeeper slain)<br>
      Souls collected: ${player.totalSoulsCollected}<br>
      Enemies slain: ${player.killCount}<br>
      Damage dealt: ${player.totalDamageDealt}
    `;
  }
}

/* ──────────────────────────────────────────────────────────────
   SCREEN MANAGER
────────────────────────────────────────────────────────────── */
class ScreenManager {
  constructor() {
    this.screens = {};
    document.querySelectorAll('.screen').forEach(s => {
      this.screens[s.id] = s;
    });
    this.current = 'screen-menu';
  }

  show(id) {
    for (const [key, el] of Object.entries(this.screens)) {
      if (key === id) {
        el.classList.add('active');
        el.classList.remove('hidden');
      } else {
        el.classList.remove('active');
        if (el.classList.contains('overlay-screen')) {
          el.classList.add('hidden');
        } else {
          el.classList.remove('active');
        }
      }
    }
    this.current = id;
  }

  showOverlay(id) {
    const el = this.screens[id];
    if (el) { el.classList.remove('hidden'); el.classList.add('active'); }
  }

  hideOverlay(id) {
    const el = this.screens[id];
    if (el) { el.classList.add('hidden'); el.classList.remove('active'); }
  }
}

/* ──────────────────────────────────────────────────────────────
   MAIN GAME CLASS
────────────────────────────────────────────────────────────── */
class Game {
  constructor() {
    this.canvas  = document.getElementById('gameCanvas');
    this.ctx     = this.canvas.getContext('2d');
    this.input   = new InputManager();
    this.screens = new ScreenManager();
    this.ui      = new UIManager();
    this.particles = new ParticleSystem();
    this.world   = new World();
    this.camera  = new Camera();
    this.player  = null;

    this.state   = 'menu';  // menu | playing | paused | upgrade | gameover | victory
    this.lastTime = 0;
    this.bossArenaTransitioning = false;

    this._setupButtons();
    this._setupResize();
    this._resize();

    requestAnimationFrame(t => this._loop(t));
  }

  /* ── Button wiring ── */
  _setupButtons() {
    // Main menu
    document.getElementById('btnStart').addEventListener('click', () => this.startGame());
    document.getElementById('btnStory').addEventListener('click', () => this.screens.show('screen-story'));
    document.getElementById('btnHowTo').addEventListener('click', () => this.screens.show('screen-howto'));
    document.getElementById('btnCredits').addEventListener('click', () => this.screens.show('screen-credits'));

    // Sub-screens back
    document.getElementById('btnStoryBack').addEventListener('click',   () => this.screens.show('screen-menu'));
    document.getElementById('btnHowToBack').addEventListener('click',   () => this.screens.show('screen-menu'));
    document.getElementById('btnCreditsBack').addEventListener('click', () => this.screens.show('screen-menu'));

    // Pause
    document.getElementById('btnResume').addEventListener('click',    () => this.resume());
    document.getElementById('btnRestart').addEventListener('click',   () => this.startGame());
    document.getElementById('btnPauseQuit').addEventListener('click', () => { this.screens.hideOverlay('screen-pause'); this.screens.show('screen-menu'); this.state = 'menu'; });

    // Game Over
    document.getElementById('btnGameOverRestart').addEventListener('click', () => { this.screens.hideOverlay('screen-gameover'); this.startGame(); });
    document.getElementById('btnGameOverMenu').addEventListener('click',    () => { this.screens.hideOverlay('screen-gameover'); this.screens.show('screen-menu'); });

    // Victory
    document.getElementById('btnPlayAgain').addEventListener('click',   () => { this.screens.hideOverlay('screen-victory'); this.startGame(); });
    document.getElementById('btnVictoryMenu').addEventListener('click', () => { this.screens.hideOverlay('screen-victory'); this.screens.show('screen-menu'); });

    // Upgrade
    document.getElementById('btnUpgradeContinue').addEventListener('click', () => this._continueFromUpgrade());
  }

  _setupResize() {
    window.addEventListener('resize', () => this._resize());
  }

  _resize() {
    this.canvas.width  = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  /* ── Start / Restart ── */
  startGame() {
    this.screens.hideOverlay('screen-pause');
    this.screens.hideOverlay('screen-gameover');
    this.screens.hideOverlay('screen-victory');
    this.screens.hideOverlay('screen-upgrade');
    this.screens.show('screen-game');

    this.player    = new Player(3 * TILE + TILE / 2, 3 * TILE + TILE / 2);
    this.world     = new World();
    this.particles = new ParticleSystem();
    this.camera    = new Camera();
    this.bossArenaTransitioning = false;

    this.world.loadLayer1();
    this.ui.setLayer(LAYERS[0]);
    this.ui.showRoomInfo('Layer I — Gates of Despair');

    this.state = 'playing';
  }

  /* ── Pause / Resume ── */
  pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.screens.showOverlay('screen-pause');
  }

  resume() {
    this.state = 'playing';
    this.screens.hideOverlay('screen-pause');
  }

  /* ── Upgrade flow ── */
  _openUpgradeScreen() {
    this.state = 'upgrade';
    this.screens.showOverlay('screen-upgrade');
    this.ui.buildUpgradeScreen(this.player, () => {
      this.ui.buildUpgradeScreen(this.player, () => {});
    });
  }

  _continueFromUpgrade() {
    this.screens.hideOverlay('screen-upgrade');
    this.state = 'playing';

    // After upgrade, load boss arena
    if (!this.world.bossArena) {
      this.world.loadBossArena();
      this.player.x = this.world.map.width / 2;
      this.player.y = this.world.map.height - TILE * 2;
      this.ui.showRoomInfo('⚠ THE GATEKEEPER AWAKENS ⚠', 4000);
      this.ui.screenShake();
    }
  }

  /* ── Game Over / Victory ── */
  _gameOver(cause) {
    this.state = 'gameover';
    this.ui.showDeathScreen(cause, this.player);
    this.screens.showOverlay('screen-gameover');
  }

  _victory() {
    this.state = 'victory';
    this.ui.showVictoryScreen(this.player);
    this.screens.showOverlay('screen-victory');
  }

  /* ── Main Loop ── */
  _loop(timestamp) {
    const dt = Math.min(timestamp - this.lastTime, 50); // cap at 50ms
    this.lastTime = timestamp;

    if (this.state === 'playing') {
      this._update(dt);
    }
    this._draw();

    requestAnimationFrame(t => this._loop(t));
  }

  /* ── Update ── */
  _update(dt) {
    // ESC to pause
    if (this.input.isPressed('Escape')) { this.pause(); return; }

    // Interact key
    const nearCheckpoint = this.world.tileAtPx(this.player.x, this.player.y) === T.CHECKPOINT
      || this._nearTile(this.player.x, this.player.y, T.CHECKPOINT, TILE * 1.2);

    // Player update
    const playerAction = this.player.update(dt, this.input, this.world);

    // Attack
    if (playerAction === 'attack') {
      const atk = this.player.getAttackData();
      this.particles.swordSlash(atk.x, atk.y, atk.angle, atk.range);
      this._resolveAttack(atk);
    }

    // Special ability
    if (playerAction === 'special') {
      this._doSpecial();
    }

    // Hellfire aura damage
    if (this.player.hasEffect('hellfireAura')) {
      const allEnemies = [...this.world.enemies, ...(this.world.boss ? [this.world.boss] : [])];
      for (const e of allEnemies) {
        if (Utils.dist(this.player.x, this.player.y, e.x, e.y) < 60) {
          e.takeDamage(0.8 * dt / 16);
        }
      }
    }

    // Interact
    if (this.input.isPressed('KeyR')) {
      if (nearCheckpoint && !this.world.bossArena && this.world.enemies.length === 0) {
        this._openUpgradeScreen();
        return;
      }
    }

    // Show/hide interact prompt
    if (nearCheckpoint && !this.world.bossArena && this.world.enemies.length === 0) {
      this.ui.showInteractPrompt('upgrade at checkpoint');
    } else {
      this.ui.hideInteractPrompt();
    }

    // World update
    const collected = this.world.update(dt, this.player, this.particles);
    for (const pk of collected) {
      if (pk.type.startsWith('__')) continue;
      const cfg = PICKUP_CFG[pk.type];
      if (cfg) this.ui.showRoomInfo(cfg.desc, 1500);
    }

    // Particles
    this.particles.update(dt);

    // Camera
    this.camera.follow(
      this.player,
      this.world.map.width, this.world.map.height,
      this.canvas.width, this.canvas.height
    );

    // UI
    this.ui.update(this.player, this.world);

    // Death check
    if (this.player.hp <= 0) {
      this._gameOver('Slain in the depths of Hell');
      return;
    }

    // Boss defeated → victory (for now, just Layer 1 boss)
    if (this.world.bossDefeated && this.state === 'playing' && !this._victoryTriggered) {
      this._victoryTriggered = true;
      setTimeout(() => this._victory(), 2500);
    }

    this.input.consumePressed();
  }

  _nearTile(px, py, tileType, radius) {
    const offsets = [[-1,-1],[0,-1],[1,-1],[-1,0],[0,0],[1,0],[-1,1],[0,1],[1,1]];
    for (const [dc, dr] of offsets) {
      const wx = px + dc * TILE;
      const wy = py + dr * TILE;
      if (this.world.tileAtPx(wx, wy) === tileType) {
        if (Utils.dist(px, py, wx, wy) < radius) return true;
      }
    }
    return false;
  }

  _resolveAttack(atk) {
    const targets = [...this.world.enemies];
    if (this.world.boss && this.world.boss.alive) targets.push(this.world.boss);

    for (const e of targets) {
      const dist  = Utils.dist(atk.x, atk.y, e.x, e.y);
      if (dist > atk.range + e.w / 2) continue;

      // Arc check
      const angleToEnemy = Utils.angle(atk.x, atk.y, e.x, e.y);
      let diff = angleToEnemy - atk.angle;
      while (diff >  Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      if (Math.abs(diff) > atk.arc / 2) continue;

      const dmgDone = e.takeDamage(atk.damage);
      if (dmgDone > 0) {
        // Knockback
        const kbAngle = Utils.angle(this.player.x, this.player.y, e.x, e.y);
        e.applyKnockback(Math.cos(kbAngle) * 200, Math.sin(kbAngle) * 200);

        // Damage number
        const type = atk.isCrit ? 'crit' : 'enemy-dmg';
        this.ui.spawnDamageNumber(e.x, e.y - 20, atk.damage, type, this.camera.x, this.camera.y);

        // Boss hit — shake
        if (e.isBoss) this.ui.screenShake();
      }
    }
  }

  _doSpecial() {
    const special = this.player.weapon.special;
    this.player.specialCooldown = 5000;

    if (special === 'heavySwing') {
      // 360° wide sweep
      const targets = [...this.world.enemies, ...(this.world.boss ? [this.world.boss] : [])];
      for (const e of targets) {
        if (Utils.dist(this.player.x, this.player.y, e.x, e.y) < 80) {
          const dmg = Math.round(this.player.weapon.damage * 2 * this.player.damage);
          e.takeDamage(dmg);
          this.ui.spawnDamageNumber(e.x, e.y - 20, dmg, 'crit', this.camera.x, this.camera.y);
        }
      }
      this.particles.burst(this.player.x, this.player.y, 20, {
        color: '#c0392b', size: 4, life: 400,
        speedMin: 60, speedMax: 180,
      });
      this.ui.screenShake();
    }

    if (special === 'dashStrike') {
      // Dash forward then deal damage
      this.player._tryDash();
      setTimeout(() => {
        const targets = [...this.world.enemies, ...(this.world.boss ? [this.world.boss] : [])];
        for (const e of targets) {
          if (Utils.dist(this.player.x, this.player.y, e.x, e.y) < 70) {
            const dmg = Math.round(this.player.weapon.damage * 1.5 * this.player.damage);
            e.takeDamage(dmg);
            this.ui.spawnDamageNumber(e.x, e.y - 20, dmg, 'crit', this.camera.x, this.camera.y);
          }
        }
        this.particles.burst(this.player.x, this.player.y, 15, {
          color: '#8e44ad', size: 3, life: 350,
          speedMin: 50, speedMax: 150,
        });
      }, 180);
    }
  }

  /* ── Draw ── */
  _draw() {
    const ctx = this.ctx;
    const W   = this.canvas.width;
    const H   = this.canvas.height;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#050305';
    ctx.fillRect(0, 0, W, H);

    if (this.state === 'menu' || this.state === 'gameover' || this.state === 'victory') return;
    if (!this.player || !this.world.map) return;

    const camX = this.camera.x;
    const camY = this.camera.y;

    // World (tiles + enemies + pickups)
    this.world.draw(ctx, camX, camY, W, H);

    // Particles (behind player)
    this.particles.draw(ctx, camX, camY);

    // Player
    this.player.draw(ctx, camX, camY);

    // Hellfire aura visual
    if (this.player.hasEffect('hellfireAura')) {
      ctx.save();
      ctx.globalAlpha = 0.25 + Math.sin(Date.now() / 200) * 0.1;
      ctx.fillStyle = '#f1c40f';
      ctx.beginPath();
      ctx.arc(this.player.x - camX, this.player.y - camY, 60, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Vignette
    this._drawVignette(ctx, W, H);
  }

  _drawVignette(ctx, W, H) {
    const grad = ctx.createRadialGradient(W/2, H/2, H*0.3, W/2, H/2, H*0.8);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }
}

/* ──────────────────────────────────────────────────────────────
   INIT MENU PARTICLES
────────────────────────────────────────────────────────────── */
function initMenuParticles() {
  const container = document.getElementById('menuParticles');
  if (!container) return;
  for (let i = 0; i < 35; i++) {
    const spark = document.createElement('div');
    spark.className = 'spark';
    spark.style.left    = Math.random() * 100 + '%';
    spark.style.setProperty('--dur',   Utils.rand(3, 7) + 's');
    spark.style.setProperty('--delay', Utils.rand(0, 5) + 's');
    spark.style.setProperty('--drift', (Utils.rand(-60, 60)) + 'px');
    // Mix gold/red/purple
    const colors = ['#f1c40f','#e74c3c','#8e44ad','#e67e22'];
    spark.style.background = Utils.choice(colors);
    container.appendChild(spark);
  }
}

/* ──────────────────────────────────────────────────────────────
   BOOTSTRAP
────────────────────────────────────────────────────────────── */
window.addEventListener('DOMContentLoaded', () => {
  initMenuParticles();
  window.game = new Game();
});