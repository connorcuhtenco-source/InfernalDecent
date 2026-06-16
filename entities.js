'use strict';

import { SOULS_PER_LEVEL, U, CLASS_DEFS, WEAPONS, SKILL_DEFS } from './constants.js';

/* ──────────────────────────────────────────────────────────
   PLAYER
────────────────────────────────────────────────────────── */
export class Player {
  constructor(x, y, classId) {
    this.x = x; this.y = y;
    this.w = 26; this.h = 26;
    this.classId = classId;

    const def = CLASS_DEFS[classId];
    this.className = def.name;
    this.bodyColor = def.bodyColor;
    this.classColor = def.color;

    this.baseHp = def.hp;
    this.baseStamina = def.stamina;
    this.baseSpeed = def.speed;
    this.baseDamage = def.damage;
    this.baseMagic = def.magicDmg;

    this.skills = { damage: 0, magicDmg: 0, speed: 0, stamina: 0, health: 0 };
    this._recalc();

    this.hp = this.maxHp;
    this.stamina = this.maxStamina;

    this.souls = 0;
    this.totalSouls = 0;
    this.level = 1;
    this.skillPoints = 0;
    this.soulsToNextLevel = SOULS_PER_LEVEL;
    this.soulsAccum = 0;

    this.weaponKeys = def.weapons;
    this.weaponIdx = 0;
    this.weapon = { ...WEAPONS[this.weaponKeys[0]] };

    this.atkCd = 0;
    this.dashCd = 0;
    this.specialCd = 0;
    this.iframes = 0;
    this.blockTime = 0;
    this.dashTime = 0;
    this.dashVx = 0;
    this.dashVy = 0;

    this.facing = { x: 1, y: 0 };
    this.swingAnim = 0;
    this.walkFrame = 0;
    this.walkTimer = 0;

    this.projectiles = [];

    this.killCount = 0;
    this.dmgDealt = 0;
    this.dmgTaken = 0;
  }

  _recalc() {
    this.maxHp = this.baseHp + this.skills.health * 10;
    this.maxStamina = this.baseStamina + this.skills.stamina * 15;
    this.damage = this.baseDamage + this.skills.damage * 5;
    this.magicDmg = this.baseMagic + this.skills.magicDmg * 5;
    this.speed = this.baseSpeed + this.skills.speed * 10;
  }

  get left() { return this.x - this.w / 2; }
  get top() { return this.y - this.h / 2; }
  get right() { return this.x + this.w / 2; }
  get bot() { return this.y + this.h / 2; }

  upgradeWeapon() {
    if (this.weaponIdx < this.weaponKeys.length - 1) {
      this.weaponIdx++;
      this.weapon = { ...WEAPONS[this.weaponKeys[this.weaponIdx]] };
      return this.weapon.name;
    }
    return null;
  }

  addSouls(n) {
    this.souls += n;
    this.totalSouls += n;
    this.soulsAccum += n;
    let leveled = false;
    while (this.soulsAccum >= SOULS_PER_LEVEL && this.level < 99) {
      this.soulsAccum -= SOULS_PER_LEVEL;
      this.level++;
      this.skillPoints++;
      leveled = true;
    }
    return leveled;
  }

  upgradeSkill(skillId) {
    const def = SKILL_DEFS.find(s => s.id === skillId);
    if (!def || this.skills[skillId] >= def.maxLvl || this.skillPoints < def.costPerLvl) return false;
    this.skillPoints -= def.costPerLvl;
    this.skills[skillId]++;
    const prevHp = this.maxHp;
    const prevSt = this.maxStamina;
    this._recalc();
    if (skillId === 'health') this.hp += this.maxHp - prevHp;
    if (skillId === 'stamina') this.stamina += this.maxStamina - prevSt;
    this.hp = U.clamp(this.hp, 0, this.maxHp);
    this.stamina = U.clamp(this.stamina, 0, this.maxStamina);
    return true;
  }

  takeDamage(amount) {
    if (this.iframes > 0) return 0;
    if (this.blockTime > 0) { amount = Math.ceil(amount * 0.2); }
    this.hp = Math.max(0, this.hp - amount);
    this.dmgTaken += amount;
    this.iframes = 550;
    return amount;
  }

  heal(n) { this.hp = Math.min(this.maxHp, this.hp + n); }

  useStamina(n) {
    if (this.stamina < n) return false;
    this.stamina -= n;
    return true;
  }

  regenStamina(dt) {
    const rate = 15;
    this.stamina = Math.min(this.maxStamina, this.stamina + rate * dt / 1000);
  }

  update(dt, input, world) {
    const s = dt / 1000;

    if (this.atkCd > 0) this.atkCd -= dt;
    if (this.dashCd > 0) this.dashCd -= dt;
    if (this.specialCd > 0) this.specialCd -= dt;
    if (this.iframes > 0) this.iframes -= dt;
    if (this.blockTime > 0) this.blockTime -= dt;
    if (this.dashTime > 0) this.dashTime -= dt;
    if (this.swingAnim > 0) this.swingAnim -= s * 7;

    this.regenStamina(dt);

    let vx = 0, vy = 0;
    if (this.dashTime > 0) {
      vx = this.dashVx; vy = this.dashVy;
    } else {
      const mv = input.move();
      vx = mv.x * this.speed;
      vy = mv.y * this.speed;
      if (mv.x !== 0 || mv.y !== 0) this.facing = { x: mv.x, y: mv.y };
      if ((input.isDown('ShiftLeft') || input.isDown('ShiftRight')) && (vx !== 0 || vy !== 0) && this.stamina > 0) {
        vx *= 1.5; vy *= 1.5;
        this.stamina = Math.max(0, this.stamina - 18 * s);
      }
    }

    if (vx !== 0 || vy !== 0) {
      this.walkTimer += dt;
      if (this.walkTimer > 140) { this.walkTimer = 0; this.walkFrame = (this.walkFrame + 1) % 4; }
    } else { this.walkFrame = 0; }

    const nx = this.x + vx * s, ny = this.y + vy * s;
    if (!world.collidesAt(nx, this.y, this.w, this.h)) this.x = nx;
    if (!world.collidesAt(this.x, ny, this.w, this.h)) this.y = ny;

    this.projectiles = this.projectiles.filter(p => p.alive);
    for (const p of this.projectiles) p.update(dt, world);

    if (input.isDown('KeyQ') && this.stamina > 0) {
      this.blockTime = 100;
      this.stamina = Math.max(0, this.stamina - 8 * s);
    }

    if (input.isPressed('Space') && this.atkCd <= 0) return 'attack';
    if (input.isPressed('ShiftLeft') || input.isPressed('ShiftRight')) {
      if (this.dashCd <= 0 && !this.dashTime && this.useStamina(15)) {
        this._dash();
      }
    }
    if (input.isPressed('KeyE') && this.specialCd <= 0) return 'special';
    if (input.isPressed('KeyR')) return 'interact';
    if (input.isPressed('Escape')) return 'pause';
    return null;
  }

  _dash() {
    const spd = 380;
    this.dashVx = this.facing.x * spd;
    this.dashVy = this.facing.y * spd;
    if (this.dashVx === 0 && this.dashVy === 0) this.dashVx = spd;
    this.dashTime = 170;
    this.dashCd = 900;
    this.iframes = 200;
  }

  getAttackData() {
    this.atkCd = this.weapon.cooldown;
    this.swingAnim = 1;
    const isCrit = Math.random() < 0.10;
    let dmg = (this.weapon.projectile ? this.magicDmg : this.damage) || this.weapon.damage || 0;
    if (isCrit) dmg = Math.ceil(dmg * 1.8);
    this.dmgDealt += dmg;
    this.stamina = Math.min(this.maxStamina, this.stamina + 4);
    return {
      x: this.x + this.facing.x * 22, y: this.y + this.facing.y * 22,
      range: this.weapon.range, arc: this.weapon.arc,
      angle: Math.atan2(this.facing.y, this.facing.x),
      damage: Math.round(dmg), isCrit,
      projectile: !!this.weapon.projectile,
    };
  }

  draw(ctx, cx, cy) {
    const sx = this.x - cx, sy = this.y - cy;
    ctx.save();
    ctx.translate(sx, sy);
    if (this.iframes > 0 && Math.floor(this.iframes / 70) % 2 === 0) ctx.globalAlpha = 0.35;

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(0, this.h / 2, 9, 3.5, 0, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = this.bodyColor;
    ctx.fillRect(-this.w / 2, -this.h / 2, this.w, this.h);

    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(-this.w / 2, -this.h / 2, this.w, 10);

    ctx.fillStyle = this.classColor;
    ctx.beginPath(); ctx.arc(this.facing.x * 7, this.facing.y * 7 - 2, 3.5, 0, Math.PI * 2); ctx.fill();

    if (this.blockTime > 0) {
      ctx.strokeStyle = 'rgba(100,200,255,0.6)'; ctx.lineWidth = 3;
      ctx.strokeRect(-this.w / 2, -this.h / 2, this.w, this.h);
    }

    if (this.dashTime > 0) {
      ctx.strokeStyle = 'rgba(230,126,34,0.5)'; ctx.lineWidth = 2;
      ctx.strokeRect(-this.w / 2, -this.h / 2, this.w, this.h);
    }

    if (this.swingAnim > 0) {
      const a = Math.atan2(this.facing.y, this.facing.x);
      ctx.save();
      ctx.globalAlpha = this.swingAnim * 0.3;
      ctx.fillStyle = this.weapon.color || '#f39c12';
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.arc(0, 0, this.weapon.range, a - this.weapon.arc / 2, a + this.weapon.arc / 2);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }

    ctx.restore();
    for (const p of this.projectiles) p.draw(ctx, cx, cy);
  }
}

/* ──────────────────────────────────────────────────────────
   PROJECTILE
────────────────────────────────────────────────────────── */
export class Projectile {
  constructor(x, y, angle, damage, color, speed = 300, life = 1800) {
    this.x = x; this.y = y;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.damage = damage;
    this.color = color;
    this.life = life;
    this.r = 8;
    this.alive = true;
    this.hit = false;
  }
  update(dt, world) {
    this.life -= dt;
    if (this.life <= 0) { this.alive = false; return; }
    const s = dt / 1000;
    const nx = this.x + this.vx * s;
    const ny = this.y + this.vy * s;
    if (world.collidesAt(nx, this.y, this.r * 2, this.r * 2) || world.collidesAt(this.x, ny, this.r * 2, this.r * 2)) {
      this.alive = false; return;
    }
    this.x = nx; this.y = ny;
  }
  draw(ctx, cx, cy) {
    if (!this.alive) return;
    const sx = this.x - cx, sy = this.y - cy;
    ctx.save();
    ctx.shadowColor = this.color; ctx.shadowBlur = 12;
    ctx.fillStyle = this.color;
    ctx.beginPath(); ctx.arc(sx, sy, this.r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

/* ──────────────────────────────────────────────────────────
   ENEMY BASE
────────────────────────────────────────────────────────── */
export class Enemy {
  constructor(x, y, cfg) {
    this.x = x; this.y = y;
    this.w = cfg.w || 26; this.h = cfg.h || 26;
    this.maxHp = cfg.hp; this.hp = cfg.hp;
    this.speed = cfg.speed || 80;
    this.damage = cfg.damage || 8;
    this.souls = cfg.souls || 5;
    this.color = cfg.color || '#c0392b';
    this.name = cfg.name || 'Enemy';
    this.atkRange = cfg.atkRange || 34;
    this.detectRange = cfg.detectRange || 200;
    this.isBoss = false;

    this.state = 'patrol';
    this.atkCd = 0;
    this.hitFlash = 0;
    this.knockVx = 0; this.knockVy = 0; this.knockT = 0;
    this.dyingT = 0;
    this.alive = true;
    this.patrolTimer = U.rand(0, 2500);
    this.patrolDir = { x: 1, y: 0 };
  }
  get left() { return this.x - this.w / 2; }
  get top() { return this.y - this.h / 2; }
  get right() { return this.x + this.w / 2; }
  get bot() { return this.y + this.h / 2; }

  takeDamage(n) {
    if (this.state === 'dying' || this.state === 'dead') return 0;
    this.hp -= n; this.hitFlash = 160;
    if (this.state === 'patrol') this.state = 'chase';
    if (this.hp <= 0) { this.hp = 0; this.state = 'dying'; this.dyingT = 380; }
    return n;
  }
  knock(vx, vy) { this.knockVx = vx; this.knockVy = vy; this.knockT = 200; }

  update(dt, player, world) {
    const s = dt / 1000;
    if (this.hitFlash > 0) this.hitFlash -= dt;
    if (this.atkCd > 0) this.atkCd -= dt;
    if (this.knockT > 0) {
      this.knockT -= dt;
      this.x += this.knockVx * s; this.y += this.knockVy * s;
      return null;
    }
    if (this.state === 'dying') { this.dyingT -= dt; if (this.dyingT <= 0) { this.state = 'dead'; this.alive = false; } return null; }
    if (this.state === 'dead') return null;

    const d = U.dist(this.x, this.y, player.x, player.y);
    switch (this.state) {
      case 'patrol':
        this._patrol(dt, world);
        if (d < this.detectRange) this.state = 'chase';
        break;
      case 'chase':
        if (d > this.detectRange * 1.6) { this.state = 'patrol'; break; }
        if (d < this.atkRange) { this.state = 'attack'; break; }
        this._moveTo(player.x, player.y, s, world);
        break;
      case 'attack':
        if (d > this.atkRange * 1.4) { this.state = 'chase'; break; }
        if (this.atkCd <= 0) {
          this.atkCd = 1100;
          return { type: 'attack', damage: this.damage };
        }
        break;
    }
    return null;
  }

  _patrol(dt, world) {
    this.patrolTimer -= dt;
    if (this.patrolTimer <= 0) {
      this.patrolTimer = U.rand(1500, 3500);
      const a = Math.random() * Math.PI * 2;
      this.patrolDir = { x: Math.cos(a), y: Math.sin(a) };
    }
    const s = dt / 1000;
    const nx = this.x + this.patrolDir.x * this.speed * 0.38 * s;
    const ny = this.y + this.patrolDir.y * this.speed * 0.38 * s;
    if (!world.collidesAt(nx, this.y, this.w, this.h)) this.x = nx; else this.patrolDir.x *= -1;
    if (!world.collidesAt(this.x, ny, this.w, this.h)) this.y = ny; else this.patrolDir.y *= -1;
  }

  _moveTo(tx, ty, s, world) {
    const a = U.angle(this.x, this.y, tx, ty);
    const vx = Math.cos(a) * this.speed, vy = Math.sin(a) * this.speed;
    const nx = this.x + vx * s, ny = this.y + vy * s;
    if (!world.collidesAt(nx, this.y, this.w, this.h)) this.x = nx;
    if (!world.collidesAt(this.x, ny, this.w, this.h)) this.y = ny;
  }

  draw(ctx, cx, cy) {
    if (this.state === 'dead') return;
    const sx = this.x - cx, sy = this.y - cy;
    ctx.save(); ctx.translate(sx, sy);
    ctx.globalAlpha = this.state === 'dying' ? this.dyingT / 380 : 1;
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath(); ctx.ellipse(0, this.h / 2, this.w * 0.38, 3.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = this.hitFlash > 0 ? '#ffffff' : this.color;
    ctx.fillRect(-this.w / 2, -this.h / 2, this.w, this.h);
    ctx.fillStyle = '#ff0';
    ctx.fillRect(-5, -this.h / 4, 4, 4); ctx.fillRect(2, -this.h / 4, 4, 4);
    if (this.hp < this.maxHp) {
      const bw = this.w + 4, bx = -bw / 2, by = -this.h / 2 - 9;
      ctx.fillStyle = '#200000'; ctx.fillRect(bx, by, bw, 5);
      ctx.fillStyle = '#e74c3c'; ctx.fillRect(bx, by, bw * (this.hp / this.maxHp), 5);
    }
    ctx.restore();
  }
}

export const ENEMY_DEFS = {
  huskWalker: { name: 'Husk Walker', hp: 35, speed: 65, damage: 10, souls: 5, color: '#5a4030', w: 26, h: 26, atkRange: 32, detectRange: 190 },
  lostSoul: { name: 'Lost Soul', hp: 20, speed: 115, damage: 6, souls: 3, color: '#3a2858', w: 22, h: 22, atkRange: 26, detectRange: 220 },
  soulBat: { name: 'Soul Bat', hp: 14, speed: 145, damage: 4, souls: 2, color: '#1a1230', w: 18, h: 18, atkRange: 22, detectRange: 250 },
};

/* ──────────────────────────────────────────────────────────
   BOSS BASE
────────────────────────────────────────────────────────── */
export class Boss extends Enemy {
  constructor(x, y, cfg) {
    super(x, y, cfg);
    this.isBoss = true;
    this.phase = 0;
    this.phaseTriggers = cfg.phaseTriggers || [0.65,0.35];
    this.specialCd = cfg.specialCd || 3500;
    this.specialTimer = this.specialCd;
    this.phaseNames = cfg.phaseNames || ['Phase I', 'Phase II', 'Phase III'];
  }
  get phaseName() { return this.phaseNames[this.phase] || 'Phase I'; }

  update(dt, player, world) {
    const result = super.update(dt, player, world);
    if (this.state === 'dying' || this.state === 'dead') return result;
    const r = this.hp / this.maxHp;
    if (this.phase === 0 && r < this.phaseTriggers[0]) { this.phase = 1; this._onPhase(1); }
    else if (this.phase === 1 && r < this.phaseTriggers[1]) { this.phase = 2; this._onPhase(2); }
    this.specialTimer -= dt;
    if (this.specialTimer <= 0) { this.specialTimer = this.specialCd; return this._special(player) || result; }
    return result;
  }
  _onPhase(p) { this.speed += 18; this.damage += 5; }
  _special(player) { return null; }
}

/* ──────────────────────────────────────────────────────────
   GATEKEEPER
────────────────────────────────────────────────────────── */
export class Gatekeeper extends Boss {
  constructor(x, y) {
    super(x, y, {
      name: 'The Gatekeeper', hp: 300, speed: 55, damage: 20, souls: 80,
      color: '#3a1010', w: 58, h: 58, atkRange: 56, detectRange: 340,
      specialCd: 3800, phaseTriggers: [0.65,0.35],
      phaseNames: ['Phase I — Axe Strikes', 'Phase II — Ground Slam', 'Phase III — Enraged'],
    });
  }
  _onPhase(p) {
    super._onPhase(p);
    if (p === 2) { this.atkCd = 0; this.speed += 15; }
  }
  _special(player) {
    if (this.phase === 0) return null;
    const radius = this.phase === 1 ? 85 : 115;
    return { type: 'groundSlam', x: this.x, y: this.y, radius, damage: this.phase === 1 ? 22 : 30 };
  }
  draw(ctx, cx, cy) {
    if (this.state === 'dead') return;
    const sx = this.x - cx, sy = this.y - cy;
    ctx.save(); ctx.translate(sx, sy);
    ctx.globalAlpha = this.state === 'dying' ? this.dyingT / 380 : 1;
    const grd = ctx.createRadialGradient(0, 0, 0, 0, 0, 55);
    grd.addColorStop(0, 'rgba(200,30,0,0.18)'); grd.addColorStop(1, 'rgba(200,30,0,0)');
    ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(0, 0, 55, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = this.hitFlash > 0 ? '#fff' : '#3a1010';
    ctx.fillRect(-this.w / 2, -this.h / 2, this.w, this.h);
    ctx.fillStyle = '#1a0808';
    ctx.fillRect(-this.w / 2, -this.h / 2, this.w, 14);
    ctx.fillRect(-this.w / 2, this.h / 2 - 14, this.w, 14);
    ctx.fillStyle = '#666'; ctx.fillRect(this.w / 2 - 4, -this.h / 2, 8, this.h);
    ctx.fillStyle = '#c0392b';
    ctx.fillRect(this.w / 2, -this.h / 2, 20, 22);
    ctx.fillRect(this.w / 2, this.h / 2 - 22, 20, 22);
    ctx.fillStyle = this.phase >= 2 ? '#ff2200' : '#ff8800';
    ctx.fillRect(-10, -8, 8, 8); ctx.fillRect(2, -8, 8, 8);
    const bw = this.w +24, bx = -bw / 2, by = -this.h / 2 - 16;
    ctx.fillStyle = '#120000'; ctx.fillRect(bx, by, bw, 7);
    ctx.fillStyle = '#c0392b'; ctx.fillRect(bx, by, bw * (this.hp / this.maxHp), 7);
    ctx.restore();
  }
}

/* ──────────────────────────────────────────────────────────
   TUTORIAL BOSS
────────────────────────────────────────────────────────── */
export class TutorialBoss extends Enemy {
  constructor(x, y) {
    super(x, y, {
      name: 'Hollow Warden', hp: 80, speed: 50, damage: 8, souls: 0,
      color: '#3a3028', w: 40, h: 40, atkRange: 44, detectRange: 260,
    });
  }
}