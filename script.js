'use strict';
/* ═══════════════════════════════════════════════════════════════
   INFERNAL DESCENT — script.js  (Competition Build)
   Architecture: Input → Game → World → Player → Enemy → Boss
                 ParticleSystem → Camera → UI → ScreenManager
   Features: 3 classes · stamina · skill tree · tutorial wisp ·
             soul leveling · boss phases · projectiles · fx
═══════════════════════════════════════════════════════════════ */

/* ─── CONSTANTS ──────────────────────────────────────────────── */
const TILE = 48;
const SOULS_PER_LEVEL = 5;
const T = { VOID:0, FLOOR:1, WALL:2, DOOR:3, CHECKPOINT:4, EXIT:5 };

/* ─── UTILITIES ──────────────────────────────────────────────── */
const U = {
  clamp: (v,a,b) => Math.max(a, Math.min(b, v)),
  lerp:  (a,b,t) => a + (b-a)*t,
  dist:  (ax,ay,bx,by) => Math.hypot(bx-ax, by-ay),
  rand:  (a,b) => a + Math.random()*(b-a),
  rInt:  (a,b) => Math.floor(U.rand(a,b+1)),
  pick:  arr => arr[Math.floor(Math.random()*arr.length)],
  angle: (ax,ay,bx,by) => Math.atan2(by-ay, bx-ax),
  norm:  (x,y) => { const l=Math.hypot(x,y); return l?{x:x/l,y:y/l}:{x:0,y:0}; },
};

/* ─── INPUT ──────────────────────────────────────────────────── */
class Input {
  constructor() {
    this.keys = {}; this.once = {};
    window.addEventListener('keydown', e => {
      if (!this.keys[e.code]) this.once[e.code] = true;
      this.keys[e.code] = true;
      if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', e => { this.keys[e.code] = false; });
  }
  held(c)    { return !!this.keys[c]; }
  pressed(c) { const v = !!this.once[c]; this.once[c] = false; return v; }
  flush()    { this.once = {}; }
  movement() {
    let x=0, y=0;
    if (this.held('KeyA')||this.held('ArrowLeft'))  x -= 1;
    if (this.held('KeyD')||this.held('ArrowRight')) x += 1;
    if (this.held('KeyW')||this.held('ArrowUp'))    y -= 1;
    if (this.held('KeyS')||this.held('ArrowDown'))  y += 1;
    return U.norm(x, y);
  }
}

/* ─── SETTINGS ───────────────────────────────────────────────── */
class Settings {
  constructor() {
    this.brightness = 100; this.volume = 80; this.sfx = 80;
    this.screenShake = true; this.particles = true; this.blood = true;
    this._wireSlider('sBrightness','sBrightnessVal','brightness','%',v=>{
      const ol = document.getElementById('brightnessOverlay');
      if (!ol) return;
      if (v < 100) ol.style.background = `rgba(0,0,0,${(100-v)/150})`;
      else if (v > 100) ol.style.background = `rgba(255,180,80,${(v-100)/200})`;
      else ol.style.background = 'transparent';
    });
    this._wireSlider('sVolume','sVolumeVal','volume','%');
    this._wireSlider('sSFX','sSFXVal','sfx','%');
    this._wireTog('togShake','screenShake');
    this._wireTog('togParticles','particles');
    this._wireTog('togBlood','blood');
  }
  _wireSlider(id, valId, key, suffix, cb) {
    const el = document.getElementById(id);
    const vEl = document.getElementById(valId);
    if (!el) return;
    el.addEventListener('input', () => {
      this[key] = +el.value;
      if (vEl) vEl.textContent = this[key] + suffix;
      if (cb) cb(this[key]);
    });
  }
  _wireTog(id, key) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('click', () => {
      this[key] = !this[key];
      el.textContent = this[key] ? 'ON' : 'OFF';
      el.classList.toggle('active', this[key]);
    });
  }
}

/* ─── CLASS DEFINITIONS ──────────────────────────────────────── */
const CLASS_DATA = {
  warrior: {
    name:'Warrior', tag:'The Ironclad',
    hp:130, stamina:60, speed:145, damage:30, magic:0,
    weapons:['fireAxe','demonGreatsword','devilsGreatspear'],
    color:'#c0392b', body:'#7a4535', accent:'#e74c3c',
  },
  assassin: {
    name:'Assassin', tag:'The Shadowblade',
    hp:80, stamina:90, speed:215, damage:28, magic:0,
    weapons:['fireDagger','demonKatana','devilsNagakiba'],
    color:'#6a3a8a', body:'#3a2850', accent:'#9b59b6',
  },
  mage: {
    name:'Mage', tag:'The Cursed Scholar',
    hp:70, stamina:55, speed:165, damage:0, magic:30,
    weapons:['fireGloves','demonWand','devilsOrb'],
    color:'#8e44ad', body:'#4a2070', accent:'#c39bd3',
  },
};

/* ─── WEAPON DEFINITIONS ─────────────────────────────────────── */
const WEAPON_DATA = {
  /* ── Warrior ── */
  fireAxe:         { name:'Fire Axe',          dmg:28, rng:58, arc:2.6, cd:520, sCd:4500, special:'groundSmash', color:'#e67e22', isProjectile:false },
  demonGreatsword: { name:'Demon Greatsword',   dmg:50, rng:72, arc:2.4, cd:680, sCd:4000, special:'heavySlam',  color:'#c0392b', isProjectile:false },
  devilsGreatspear:{ name:"Devil's Greatspear", dmg:68, rng:88, arc:1.8, cd:580, sCd:3800, special:'spearThrow', color:'#e74c3c', isProjectile:false },
  /* ── Assassin ── */
  fireDagger:      { name:'Fire Dagger',         dmg:20, rng:42, arc:1.9, cd:230, sCd:3800, special:'shadowStrike',color:'#e67e22', isProjectile:false },
  demonKatana:     { name:'Demon Katana',         dmg:36, rng:58, arc:2.0, cd:300, sCd:3500, special:'dashStrike', color:'#9b59b6', isProjectile:false },
  devilsNagakiba:  { name:"Devil's Nagakiba",     dmg:55, rng:80, arc:1.8, cd:270, sCd:4500, special:'bladestorm', color:'#e74c3c', isProjectile:false },
  /* ── Mage ── */
  fireGloves:      { name:'Fire Gloves',  mgc:30, rng:190, arc:1.0, cd:380, sCd:4000, special:'fireball',    color:'#e67e22', isProjectile:true },
  demonWand:       { name:'Demon Wand',   mgc:52, rng:230, arc:0.85,cd:480, sCd:4500, special:'arcaneBlast', color:'#9b59b6', isProjectile:true },
  devilsOrb:       { name:"Devil's Orb",  mgc:75, rng:260, arc:1.1, cd:560, sCd:5000, special:'orbStorm',    color:'#c39bd3', isProjectile:true },
};

/* ─── SKILL DEFINITIONS ──────────────────────────────────────── */
const SKILLS = [
  { id:'health',    icon:'❤',  name:'Health',       desc:'Max HP +10 per level (base 100). Cap: 20.',    max:20, apply:(p)=>{ p.maxHp+=10; p.hp+=10; } },
  { id:'damage',    icon:'⚔',  name:'Damage',       desc:'Base dmg +5 per level. Warrior/Assassin only.',max:20, apply:(p)=>{ p.baseDmg+=5; } },
  { id:'magic',     icon:'🔮', name:'Magic Damage', desc:'Magic dmg +5 per level. Mage only.',           max:20, apply:(p)=>{ p.baseMagic+=5; } },
  { id:'speed',     icon:'💨', name:'Speed',        desc:'Move speed +10 per level (base 50).',          max:20, apply:(p)=>{ p.baseSpeed+=10; } },
  { id:'stamina',   icon:'⚡', name:'Stamina',      desc:'Max stamina +15 per level (base 50).',         max:20, apply:(p)=>{ p.maxStamina+=15; p.stamina+=15; } },
];

/* ─── ENEMY CONFIGS ──────────────────────────────────────────── */
const ENEMY_CFG = {
  huskWalker: { name:'Husk Walker', hp:35, spd:62,  dmg:10, souls:5,  color:'#5a4030', w:26,h:26, aR:32, dR:185 },
  lostSoul:   { name:'Lost Soul',   hp:20, spd:115,  dmg:6,  souls:3,  color:'#3a2858', w:22,h:22, aR:26, dR:225 },
  soulBat:    { name:'Soul Bat',    hp:14, spd:148,  dmg:4,  souls:2,  color:'#1a1235', w:18,h:18, aR:22, dR:255 },
};

/* ════════════════════════════════════════════════════════════════
   PLAYER
════════════════════════════════════════════════════════════════ */
class Player {
  constructor(x, y, classId) {
    this.x=x; this.y=y; this.classId=classId;
    const cd = CLASS_DATA[classId];
    this.className  = cd.name;
    this.classTag   = cd.tag;
    this.bodyColor  = cd.body;
    this.accentColor= cd.accent;
    this.classColor = cd.color;

    // Base stats
    this.baseHp     = cd.hp;
    this.baseStamina= cd.stamina;
    this.baseSpeed  = cd.speed;
    this.baseDmg    = cd.damage;
    this.baseMagic  = cd.magic;

    // Skill levels
    this.skills = { health:0, damage:0, magic:0, speed:0, stamina:0 };

    // Derived (recalculated on skill up)
    this.maxHp     = cd.hp;
    this.maxStamina= cd.stamina;
    this.speed     = cd.speed;
    this.w=26; this.h=26;

    // Current values
    this.hp      = this.maxHp;
    this.stamina = this.maxStamina;

    // Level / soul system
    this.souls       = 0;
    this.totalSouls  = 0;
    this.level       = 1;
    this.skillPts    = 0;
    this.soulsBank   = 0;   // souls toward next level

    // Weapon
    this.weaponList = cd.weapons;
    this.weaponIdx  = 0;
    this.weapon     = { ...WEAPON_DATA[cd.weapons[0]] };

    // Timers (ms)
    this.atkCd=0; this.dashCd=0; this.specialCd=0;
    this.iframes=0; this.dashTime=0; this.blockTime=0;
    this.dashVx=0; this.dashVy=0;

    // Visual
    this.facing   = { x:1, y:0 };
    this.swingT   = 0;
    this.walkFrame= 0;
    this.walkTimer= 0;
    this.glowT    = 0;

    // Projectiles
    this.projs = [];

    // Track stats
    this.kills=0; this.dmgDealt=0; this.dmgTaken=0;
  }

  get left()  { return this.x - this.w/2; }
  get top()   { return this.y - this.h/2; }
  get right() { return this.x + this.w/2; }
  get bot()   { return this.y + this.h/2; }

  upgradeWeapon() {
    if (this.weaponIdx < this.weaponList.length - 1) {
      this.weaponIdx++;
      this.weapon = { ...WEAPON_DATA[this.weaponList[this.weaponIdx]] };
      return this.weapon.name;
    }
    return null;
  }

  addSouls(n) {
    this.souls += n; this.totalSouls += n; this.soulsBank += n;
    let leveled = false;
    while (this.soulsBank >= SOULS_PER_LEVEL) {
      this.soulsBank -= SOULS_PER_LEVEL;
      this.level++; this.skillPts++;
      leveled = true;
    }
    return leveled;
  }

  learnSkill(id) {
    const def = SKILLS.find(s=>s.id===id);
    if (!def || this.skills[id] >= def.max || this.skillPts < 1) return false;
    this.skillPts--;
    this.skills[id]++;
    def.apply(this);
    this.hp = Math.min(this.maxHp, this.hp);
    this.stamina = Math.min(this.maxStamina, this.stamina);
    return true;
  }

  takeDamage(n) {
    if (this.iframes > 0) return 0;
    if (this.blockTime > 0) n = Math.ceil(n * 0.15);
    this.hp = Math.max(0, this.hp - n);
    this.dmgTaken += n;
    this.iframes = 600;
    return n;
  }
  heal(n) { this.hp = Math.min(this.maxHp, this.hp + n); }

  useStamina(n) {
    if (this.stamina < n) return false;
    this.stamina -= n; return true;
  }

  update(dt, input, world) {
    const s = dt/1000;
    if (this.atkCd>0)     this.atkCd     -= dt;
    if (this.dashCd>0)    this.dashCd    -= dt;
    if (this.specialCd>0) this.specialCd -= dt;
    if (this.iframes>0)   this.iframes   -= dt;
    if (this.blockTime>0) this.blockTime -= dt;
    if (this.dashTime>0)  this.dashTime  -= dt;
    if (this.swingT>0)    this.swingT    -= s*7;
    this.glowT += s;

    // Stamina regen (faster during combat via _onHit)
    this.stamina = Math.min(this.maxStamina, this.stamina + 14*s);

    // Movement
    let vx=0, vy=0;
    if (this.dashTime > 0) {
      vx = this.dashVx; vy = this.dashVy;
    } else {
      const mv = input.movement();
      vx = mv.x * this.speed;
      vy = mv.y * this.speed;
      if (mv.x || mv.y) this.facing = { x:mv.x||this.facing.x, y:mv.y||this.facing.y };
      // Sprint — shift+move
      const sprinting = (input.held('ShiftLeft')||input.held('ShiftRight')) && (vx||vy);
      if (sprinting && this.stamina > 0) {
        vx *= 1.6; vy *= 1.6;
        this.stamina = Math.max(0, this.stamina - 20*s);
      }
    }

    // Walk animation
    if (vx||vy) {
      this.walkTimer += dt;
      if (this.walkTimer > 130) { this.walkTimer=0; this.walkFrame=(this.walkFrame+1)%4; }
    } else { this.walkFrame=0; }

    // Collision
    const nx=this.x+vx*s, ny=this.y+vy*s;
    if (!world.collidesAt(nx, this.y, this.w, this.h)) this.x = nx;
    if (!world.collidesAt(this.x, ny, this.w, this.h)) this.y = ny;

    // Block
    if (input.held('KeyQ') && this.stamina > 0) {
      this.blockTime = 120;
      this.stamina = Math.max(0, this.stamina - 10*s);
    }

    // Projectiles
    this.projs = this.projs.filter(p => p.alive);
    for (const p of this.projs) p.update(dt, world);

    // Actions
    if (input.pressed('Space') && this.atkCd <= 0)   return 'attack';
    if (input.pressed('KeyE')  && this.specialCd<=0)  return 'special';
    if (input.pressed('ShiftLeft')||input.pressed('ShiftRight')) {
      if (!this.dashTime && this.dashCd<=0 && this.useStamina(18)) this._dash();
    }
    if (input.pressed('KeyR'))     return 'interact';
    if (input.pressed('Escape'))   return 'pause';
    return null;
  }

  _dash() {
    const sp = 420;
    const n = U.norm(this.facing.x, this.facing.y);
    this.dashVx = (n.x||1)*sp; this.dashVy = n.y*sp;
    this.dashTime=175; this.dashCd=950; this.iframes=220;
  }

  attack() {
    this.atkCd = this.weapon.cd;
    this.swingT = 1;
    const isCrit = Math.random() < 0.10;
    const raw = this.weapon.isProjectile
      ? (this.weapon.mgc||0) + this.baseMagic
      : (this.weapon.dmg||0) + this.baseDmg;
    const dmg = Math.round(isCrit ? raw*1.85 : raw);
    this.dmgDealt += dmg;
    this.stamina = Math.min(this.maxStamina, this.stamina + 5);
    return {
      x: this.x + this.facing.x*24,
      y: this.y + this.facing.y*24,
      angle: Math.atan2(this.facing.y, this.facing.x),
      range: this.weapon.rng, arc: this.weapon.arc,
      damage: dmg, isCrit,
      isProjectile: this.weapon.isProjectile,
      color: this.weapon.color,
    };
  }

  draw(ctx, cx, cy) {
    const sx=this.x-cx, sy=this.y-cy;
    ctx.save();
    ctx.translate(sx, sy);

    // I-frame flicker
    if (this.iframes > 0 && Math.floor(this.iframes/75)%2===0) { ctx.globalAlpha=0.3; }

    // Glow aura (class colored)
    const pulse = 0.12 + Math.sin(this.glowT*3)*0.05;
    const gr = ctx.createRadialGradient(0,0,0,0,0,26);
    gr.addColorStop(0, this.classColor+'50');
    gr.addColorStop(1, 'transparent');
    ctx.fillStyle=gr; ctx.beginPath(); ctx.arc(0,0,26,0,Math.PI*2); ctx.fill();

    // Shadow
    ctx.globalAlpha*=0.9;
    ctx.fillStyle='rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(0,this.h/2+1,10,4,0,0,Math.PI*2); ctx.fill();

    // Body (slightly rounded rect illusion)
    ctx.fillStyle = this.bodyColor;
    this._roundRect(ctx,-this.w/2,-this.h/2,this.w,this.h,4);

    // Armor top
    ctx.fillStyle='rgba(0,0,0,0.5)';
    this._roundRect(ctx,-this.w/2,-this.h/2,this.w,this.h*0.5,4);

    // Accent stripe
    ctx.fillStyle=this.accentColor+'99';
    ctx.fillRect(-this.w/2+4,-this.h/2+6,this.w-8,3);

    // Facing dot (eye glow)
    ctx.fillStyle=this.accentColor;
    ctx.shadowColor=this.accentColor; ctx.shadowBlur=8;
    ctx.beginPath();
    ctx.arc(this.facing.x*7+this.facing.y*1, this.facing.y*7-this.facing.x*1-2, 3.5,0,Math.PI*2);
    ctx.fill(); ctx.shadowBlur=0;

    // Dash trail
    if (this.dashTime > 0) {
      ctx.globalAlpha*=0.5;
      ctx.strokeStyle=this.accentColor; ctx.lineWidth=2.5;
      this._roundRect(ctx,-this.w/2,-this.h/2,this.w,this.h,4,true);
    }

    // Block shield
    if (this.blockTime > 0) {
      ctx.globalAlpha=0.6;
      ctx.strokeStyle='rgba(120,200,255,0.8)'; ctx.lineWidth=3;
      ctx.shadowColor='rgba(120,200,255,0.8)'; ctx.shadowBlur=12;
      this._roundRect(ctx,-this.w/2-3,-this.h/2-3,this.w+6,this.h+6,6,true);
      ctx.shadowBlur=0;
    }

    // Swing arc
    if (this.swingT > 0) {
      const a = Math.atan2(this.facing.y,this.facing.x);
      ctx.save();
      ctx.globalAlpha = this.swingT * 0.28;
      ctx.fillStyle = this.weapon.color||'#e67e22';
      ctx.shadowColor = this.weapon.color||'#e67e22';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.moveTo(0,0);
      ctx.arc(0,0,this.weapon.rng,a-this.weapon.arc/2,a+this.weapon.arc/2);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }

    ctx.restore();
    // Draw projectiles
    for (const p of this.projs) p.draw(ctx,cx,cy);
  }

  _roundRect(ctx,x,y,w,h,r,stroke=false) {
    ctx.beginPath();
    ctx.moveTo(x+r,y);
    ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
    ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
    ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y);
    ctx.closePath();
    if (stroke) ctx.stroke(); else ctx.fill();
  }
}

/* ════════════════════════════════════════════════════════════════
   PROJECTILE
════════════════════════════════════════════════════════════════ */
class Projectile {
  constructor(x,y,angle,dmg,color,speed=295,life=1900) {
    this.x=x; this.y=y;
    this.vx=Math.cos(angle)*speed; this.vy=Math.sin(angle)*speed;
    this.dmg=dmg; this.color=color; this.life=life; this.maxLife=life;
    this.r=7; this.alive=true; this.age=0;
  }
  update(dt,world) {
    this.life-=dt; this.age+=dt;
    if (this.life<=0) { this.alive=false; return; }
    const s=dt/1000;
    const nx=this.x+this.vx*s, ny=this.y+this.vy*s;
    if (world.collidesAt(nx,this.y,this.r*2,this.r*2)||world.collidesAt(this.x,ny,this.r*2,this.r*2))
      { this.alive=false; return; }
    this.x=nx; this.y=ny;
  }
  draw(ctx,cx,cy) {
    if (!this.alive) return;
    const sx=this.x-cx, sy=this.y-cy;
    const t=this.life/this.maxLife;
    ctx.save();
    ctx.shadowColor=this.color; ctx.shadowBlur=18;
    // Outer glow
    const g=ctx.createRadialGradient(sx,sy,0,sx,sy,this.r*2.5);
    g.addColorStop(0,this.color+'ff'); g.addColorStop(1,this.color+'00');
    ctx.fillStyle=g; ctx.globalAlpha=t*0.5;
    ctx.beginPath(); ctx.arc(sx,sy,this.r*2.5,0,Math.PI*2); ctx.fill();
    // Core
    ctx.globalAlpha=t;
    ctx.fillStyle=this.color;
    ctx.beginPath(); ctx.arc(sx,sy,this.r,0,Math.PI*2); ctx.fill();
    // White hot center
    ctx.fillStyle='#fff'; ctx.globalAlpha=t*0.6;
    ctx.beginPath(); ctx.arc(sx,sy,this.r*0.4,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }
}

/* ════════════════════════════════════════════════════════════════
   ENEMY
════════════════════════════════════════════════════════════════ */
class Enemy {
  constructor(x,y,cfg) {
    this.x=x; this.y=y;
    this.w=cfg.w||26; this.h=cfg.h||26;
    this.maxHp=cfg.hp; this.hp=cfg.hp;
    this.speed=cfg.spd||80; this.damage=cfg.dmg||8;
    this.souls=cfg.souls||5; this.color=cfg.color||'#c0392b';
    this.name=cfg.name||'Enemy'; this.atkRange=cfg.aR||34;
    this.detectRange=cfg.dR||200; this.isBoss=false;
    this.state='patrol'; this.atkCd=0; this.hitFlash=0;
    this.knockVx=0; this.knockVy=0; this.knockT=0;
    this.dyingT=0; this.alive=true;
    this.patrolT=U.rand(0,2500); this.patrolDir={x:1,y:0};
    this.glowT=Math.random()*10;
  }
  get left(){return this.x-this.w/2;}  get top(){return this.y-this.h/2;}
  get right(){return this.x+this.w/2;} get bot(){return this.y+this.h/2;}

  takeDamage(n) {
    if (this.state==='dying'||this.state==='dead') return 0;
    this.hp-=n; this.hitFlash=140;
    if (this.state==='patrol') this.state='chase';
    if (this.hp<=0) { this.hp=0; this.state='dying'; this.dyingT=420; }
    return n;
  }
  knockback(vx,vy) { this.knockVx=vx; this.knockVy=vy; this.knockT=220; }

  update(dt,player,world) {
    const s=dt/1000;
    this.glowT+=s;
    if (this.hitFlash>0) this.hitFlash-=dt;
    if (this.atkCd>0)    this.atkCd-=dt;
    if (this.knockT>0) {
      this.knockT-=dt;
      this.x+=this.knockVx*s; this.y+=this.knockVy*s;
      return null;
    }
    if (this.state==='dying') { this.dyingT-=dt; if(this.dyingT<=0){this.state='dead';this.alive=false;} return null; }
    if (this.state==='dead') return null;
    const d=U.dist(this.x,this.y,player.x,player.y);
    switch(this.state) {
      case 'patrol':
        this._patrol(dt,world);
        if(d<this.detectRange) this.state='chase';
        break;
      case 'chase':
        if(d>this.detectRange*1.7) { this.state='patrol'; break; }
        if(d<this.atkRange) { this.state='attack'; break; }
        this._moveTo(player.x,player.y,s,world);
        break;
      case 'attack':
        if(d>this.atkRange*1.5) { this.state='chase'; break; }
        if(this.atkCd<=0) { this.atkCd=1050; return{type:'attack',damage:this.damage}; }
        break;
    }
    return null;
  }

  _patrol(dt,world) {
    this.patrolT-=dt;
    if(this.patrolT<=0) {
      this.patrolT=U.rand(1400,3500);
      const a=Math.random()*Math.PI*2;
      this.patrolDir={x:Math.cos(a),y:Math.sin(a)};
    }
    const s=dt/1000;
    const nx=this.x+this.patrolDir.x*this.speed*0.36*s;
    const ny=this.y+this.patrolDir.y*this.speed*0.36*s;
    if(!world.collidesAt(nx,this.y,this.w,this.h))this.x=nx; else this.patrolDir.x*=-1;
    if(!world.collidesAt(this.x,ny,this.w,this.h))this.y=ny; else this.patrolDir.y*=-1;
  }

  _moveTo(tx,ty,s,world) {
    const a=U.angle(this.x,this.y,tx,ty);
    const vx=Math.cos(a)*this.speed, vy=Math.sin(a)*this.speed;
    if(!world.collidesAt(this.x+vx*s,this.y,this.w,this.h)) this.x+=vx*s;
    if(!world.collidesAt(this.x,this.y+vy*s,this.w,this.h)) this.y+=vy*s;
  }

  draw(ctx,cx,cy) {
    if(this.state==='dead') return;
    const sx=this.x-cx, sy=this.y-cy;
    const alpha=this.state==='dying'?this.dyingT/420:1;
    ctx.save(); ctx.translate(sx,sy); ctx.globalAlpha=alpha;

    // Glow
    const g=ctx.createRadialGradient(0,0,0,0,0,this.w);
    g.addColorStop(0,this.color+'40'); g.addColorStop(1,'transparent');
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(0,0,this.w,0,Math.PI*2); ctx.fill();

    // Shadow
    ctx.fillStyle='rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(0,this.h/2,this.w*0.4,3.5,0,0,Math.PI*2); ctx.fill();

    // Body
    ctx.fillStyle=this.hitFlash>0?'#ffffff':this.color;
    if(this.hitFlash>0) ctx.shadowColor='#fff', ctx.shadowBlur=12;
    ctx.fillRect(-this.w/2,-this.h/2,this.w,this.h);
    ctx.shadowBlur=0;

    // Eyes
    ctx.fillStyle=this.hitFlash>0?this.color:'#ffcc00';
    ctx.shadowColor='#ffcc00'; ctx.shadowBlur=6;
    ctx.fillRect(-5,-this.h/4,4,4); ctx.fillRect(2,-this.h/4,4,4);
    ctx.shadowBlur=0;

    // HP bar
    if(this.hp<this.maxHp) {
      const bw=this.w+6,bx=-bw/2,by=-this.h/2-10;
      ctx.fillStyle='rgba(0,0,0,0.7)'; ctx.fillRect(bx,by,bw,5);
      ctx.fillStyle=this.color; ctx.fillRect(bx,by,bw*(this.hp/this.maxHp),5);
    }
    ctx.restore();
  }
}

/* ════════════════════════════════════════════════════════════════
   BOSS BASE
════════════════════════════════════════════════════════════════ */
class Boss extends Enemy {
  constructor(x,y,cfg) {
    super(x,y,cfg);
    this.isBoss=true; this.phase=0;
    this.phaseTriggers=cfg.phaseTriggers||[0.65,0.35];
    this.phaseNames=cfg.phaseNames||['Phase I','Phase II','Phase III'];
    this.specialCd=cfg.specialCd||3500;
    this.specialTimer=this.specialCd;
  }
  get phaseName() { return this.phaseNames[this.phase]||'Phase I'; }

  update(dt,player,world) {
    const r=super.update(dt,player,world);
    if(this.state==='dying'||this.state==='dead') return r;
    const ratio=this.hp/this.maxHp;
    if(this.phase===0&&ratio<this.phaseTriggers[0]) { this.phase=1; this._onPhase(1); }
    else if(this.phase===1&&ratio<this.phaseTriggers[1]) { this.phase=2; this._onPhase(2); }
    this.specialTimer-=dt;
    if(this.specialTimer<=0) { this.specialTimer=this.specialCd; return this._special(player)||r; }
    return r;
  }
  _onPhase(p) { this.speed+=20; this.damage+=6; }
  _special(player) { return null; }
}

/* ─── GATEKEEPER ──────────────────────────────────────────── */
class Gatekeeper extends Boss {
  constructor(x,y) {
    super(x,y,{
      name:'The Gatekeeper', hp:320, spd:52, dmg:22, souls:80,
      color:'#3a0e0e', w:60, h:60, aR:58, dR:340,
      specialCd:3800,
      phaseTriggers:[0.65,0.35],
      phaseNames:['Phase I — Axe Strikes','Phase II — Ground Slam','Phase III — Enraged'],
    });
    this.axeAngle=0;
  }
  _onPhase(p) { super._onPhase(p); if(p===2){this.atkCd=0;this.speed+=15;} }
  _special(player) {
    if(this.phase===0) return null;
    const r=this.phase===1?88:118, dmg=this.phase===1?24:32;
    return{type:'groundSlam',x:this.x,y:this.y,radius:r,damage:dmg};
  }
  update(dt,player,world) { this.axeAngle+=dt/1000*1.5; return super.update(dt,player,world); }
  draw(ctx,cx,cy) {
    if(this.state==='dead') return;
    const sx=this.x-cx, sy=this.y-cy;
    const alpha=this.state==='dying'?this.dyingT/420:1;
    ctx.save(); ctx.translate(sx,sy); ctx.globalAlpha=alpha;
    // Outer hell glow
    const g=ctx.createRadialGradient(0,0,0,0,0,70);
    g.addColorStop(0,'rgba(200,30,0,0.22)'); g.addColorStop(1,'rgba(200,30,0,0)');
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(0,0,70,0,Math.PI*2); ctx.fill();
    // Body
    ctx.fillStyle=this.hitFlash>0?'#fff':'#3a0e0e';
    if(this.hitFlash>0){ctx.shadowColor='#fff';ctx.shadowBlur=20;}
    ctx.fillRect(-this.w/2,-this.h/2,this.w,this.h);
    ctx.shadowBlur=0;
    // Armor
    ctx.fillStyle='#1a0808';
    ctx.fillRect(-this.w/2,-this.h/2,this.w,16);
    ctx.fillRect(-this.w/2,this.h/2-16,this.w,16);
    ctx.fillStyle='rgba(200,30,0,0.35)';
    ctx.fillRect(-this.w/2+4,-this.h/2+4,this.w-8,6);
    // Spinning axe
    ctx.save(); ctx.rotate(this.axeAngle);
    ctx.fillStyle='#888'; ctx.fillRect(-4,-this.h/2-6,8,12);
    ctx.fillStyle='#c0392b'; ctx.shadowColor='#c0392b'; ctx.shadowBlur=10;
    ctx.fillRect(-4,-this.h/2-18,8,12);
    ctx.fillRect(-12,-this.h/2-14,8,8); ctx.fillRect(4,-this.h/2-14,8,8);
    ctx.restore(); ctx.shadowBlur=0;
    // Eyes (glow red in phase 2+)
    const eyeCol=this.phase>=2?'#ff2200':'#ff8800';
    ctx.fillStyle=eyeCol; ctx.shadowColor=eyeCol; ctx.shadowBlur=10;
    ctx.fillRect(-11,-9,9,9); ctx.fillRect(2,-9,9,9);
    ctx.shadowBlur=0;
    // HP bar
    const bw=this.w+28,bx=-bw/2,by=-this.h/2-18;
    ctx.fillStyle='rgba(0,0,0,0.7)'; ctx.fillRect(bx,by,bw,8);
    ctx.fillStyle='#c0392b'; ctx.shadowColor='#c0392b'; ctx.shadowBlur=6;
    ctx.fillRect(bx,by,bw*(this.hp/this.maxHp),8);
    ctx.shadowBlur=0;
    ctx.restore();
  }
}

/* ─── TUTORIAL BOSS ───────────────────────────────────────── */
class TutorialBoss extends Enemy {
  constructor(x,y) {
    super(x,y,{ name:'Hollow Warden',hp:90,spd:48,dmg:7,souls:0,color:'#3a3028',w:42,h:42,aR:46,dR:280 });
  }
}

/* ════════════════════════════════════════════════════════════════
   PARTICLES
════════════════════════════════════════════════════════════════ */
class Particle {
  constructor(x,y,cfg) {
    this.x=x; this.y=y;
    this.vx=cfg.vx||0; this.vy=cfg.vy||0;
    this.life=cfg.life||500; this.maxLife=this.life;
    this.size=cfg.size||3; this.color=cfg.color||'#e67e22';
    this.gravity=cfg.gravity||0; this.fade=cfg.fade!==false;
    this.spin=cfg.spin||0; this.ang=Math.random()*Math.PI*2;
  }
  update(dt) {
    const s=dt/1000;
    this.x+=this.vx*s; this.y+=this.vy*s;
    this.vy+=this.gravity*s; this.ang+=this.spin*s;
    this.vx*=0.98; this.vy*=0.98;
    this.life-=dt; return this.life>0;
  }
  draw(ctx,cx,cy) {
    const t=this.life/this.maxLife;
    ctx.globalAlpha=(this.fade?t:1)*0.88;
    ctx.fillStyle=this.color;
    ctx.shadowColor=this.color; ctx.shadowBlur=6;
    const s=this.size*t;
    ctx.beginPath(); ctx.arc(this.x-cx,this.y-cy,Math.max(0.5,s),0,Math.PI*2); ctx.fill();
    ctx.shadowBlur=0;
  }
}

class Particles {
  constructor() { this.list=[]; }
  add(x,y,cfg) { this.list.push(new Particle(x,y,cfg)); }
  burst(x,y,n,cfg) {
    for(let i=0;i<n;i++) {
      const a=Math.random()*Math.PI*2;
      const sp=U.rand(cfg.sMin||40,cfg.sMax||120);
      this.add(x,y,{vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,...cfg});
    }
  }
  blood(x,y,n=8) {
    this.burst(x,y,n,{color:'#c0392b',size:3,life:480,sMin:55,sMax:140,gravity:240,spin:2});
    this.burst(x,y,3,{color:'#e74c3c',size:2,life:300,sMin:20,sMax:60,gravity:180});
  }
  soulPop(x,y,n=12) {
    this.burst(x,y,n,{color:'#e67e22',size:2.5,life:700,sMin:35,sMax:110});
    this.burst(x,y,5,{color:'#f39c12',size:2,life:900,sMin:15,sMax:50});
    this.burst(x,y,4,{color:'#fff',size:1.5,life:500,sMin:10,sMax:40});
  }
  slash(x,y,angle,range) {
    for(let i=0;i<9;i++) {
      const a=angle+U.rand(-0.55,0.55); const r=U.rand(0,range);
      this.add(x+Math.cos(a)*r,y+Math.sin(a)*r,
        {vx:Math.cos(a)*30,vy:Math.sin(a)*30,color:'#e67e22',size:2.5,life:200});
    }
  }
  slam(x,y,r) {
    this.burst(x,y,28,{color:'#c0392b',size:4.5,life:600,sMin:r*.28,sMax:r*.85,gravity:300,spin:3});
    this.burst(x,y,14,{color:'#8B4513',size:3,life:380,sMin:14,sMax:50,gravity:400});
    this.burst(x,y,10,{color:'#e67e22',size:2,life:800,sMin:r*.1,sMax:r*.4});
  }
  magic(x,y,n=12) { this.burst(x,y,n,{color:'#c39bd3',size:3,life:550,sMin:40,sMax:110}); }
  ember(x,y,n=5) { this.burst(x,y,n,{color:'#e67e22',size:2,life:600,sMin:10,sMax:40,gravity:-30}); }
  update(dt) { this.list=this.list.filter(p=>p.update(dt)); }
  draw(ctx,cx,cy) {
    ctx.save();
    for(const p of this.list) p.draw(ctx,cx,cy);
    ctx.globalAlpha=1; ctx.shadowBlur=0;
    ctx.restore();
  }
}

/* ════════════════════════════════════════════════════════════════
   TILE MAP
════════════════════════════════════════════════════════════════ */
class TileMap {
  constructor(grid,pal) {
    this.grid=grid; this.rows=grid.length; this.cols=grid[0].length;
    this.pal={ floor:'#140e0e',wall:'#0a0606',accent:'#2e1a14',...pal };
    this.width=this.cols*TILE; this.height=this.rows*TILE;
  }
  at(c,r) { if(r<0||r>=this.rows||c<0||c>=this.cols)return T.WALL; return this.grid[r][c]; }
  walkable(c,r) { const t=this.at(c,r); return t===T.FLOOR||t===T.DOOR||t===T.CHECKPOINT||t===T.EXIT; }
  collidesAt(cx,cy,w,h) {
    const p=2;
    const c0=Math.floor((cx-w/2+p)/TILE), r0=Math.floor((cy-h/2+p)/TILE);
    const c1=Math.floor((cx+w/2-p)/TILE), r1=Math.floor((cy+h/2-p)/TILE);
    for(let r=r0;r<=r1;r++) for(let c=c0;c<=c1;c++) if(!this.walkable(c,r)) return true;
    return false;
  }
  tileAtPx(wx,wy) { return this.at(Math.floor(wx/TILE),Math.floor(wy/TILE)); }
  draw(ctx,cx,cy,vw,vh,time) {
    const c0=Math.max(0,Math.floor(cx/TILE));
    const r0=Math.max(0,Math.floor(cy/TILE));
    const c1=Math.min(this.cols,Math.ceil((cx+vw)/TILE));
    const r1=Math.min(this.rows,Math.ceil((cy+vh)/TILE));
    for(let r=r0;r<r1;r++) for(let c=c0;c<c1;c++)
      this._drawTile(ctx,this.grid[r][c],c*TILE-cx,r*TILE-cy,c,r,time);
  }
  _drawTile(ctx,t,x,y,c,r,time) {
    switch(t) {
      case T.FLOOR:
        ctx.fillStyle=this.pal.floor; ctx.fillRect(x,y,TILE,TILE);
        ctx.strokeStyle=this.pal.accent; ctx.lineWidth=0.4; ctx.strokeRect(x,y,TILE,TILE);
        // Subtle noise dots
        if((c+r)%5===0) { ctx.fillStyle='rgba(255,255,255,0.02)'; ctx.fillRect(x+10,y+10,4,4); }
        break;
      case T.WALL:
        ctx.fillStyle=this.pal.wall; ctx.fillRect(x,y,TILE,TILE);
        ctx.fillStyle='rgba(255,255,255,0.035)'; ctx.fillRect(x,y,TILE,2);
        ctx.fillStyle='rgba(0,0,0,0.35)'; ctx.fillRect(x+TILE-5,y,5,TILE); ctx.fillRect(x,y+TILE-5,TILE,5);
        // Wall cracks
        if((c*7+r*3)%11===0) { ctx.strokeStyle='rgba(0,0,0,0.3)'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(x+8,y+8); ctx.lineTo(x+18,y+22); ctx.stroke(); }
        break;
      case T.DOOR:
        ctx.fillStyle='#2a1408'; ctx.fillRect(x,y,TILE,TILE);
        ctx.fillStyle='#5a2e10'; ctx.fillRect(x+8,y+4,TILE-16,TILE-8);
        ctx.fillStyle='#e67e22'; ctx.shadowColor='#e67e22'; ctx.shadowBlur=8;
        ctx.beginPath(); ctx.arc(x+TILE/2,y+TILE/2,4,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
        break;
      case T.CHECKPOINT: {
        ctx.fillStyle=this.pal.floor; ctx.fillRect(x,y,TILE,TILE);
        const pulse=0.15+Math.sin(time*2+c+r)*0.08;
        ctx.fillStyle=`rgba(230,126,34,${pulse})`; ctx.fillRect(x,y,TILE,TILE);
        ctx.strokeStyle='#e67e22'; ctx.lineWidth=1.5;
        ctx.strokeRect(x+4,y+4,TILE-8,TILE-8);
        ctx.font='20px serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.shadowColor='#e67e22'; ctx.shadowBlur=10;
        ctx.fillStyle='#e67e22'; ctx.fillText('⚜',x+TILE/2,y+TILE/2);
        ctx.shadowBlur=0; break;
      }
      case T.EXIT: {
        ctx.fillStyle='#100808'; ctx.fillRect(x,y,TILE,TILE);
        const gp=Math.sin(time*3+c)*0.5+0.5;
        ctx.strokeStyle=`rgba(192,57,43,${0.4+gp*0.5})`; ctx.lineWidth=2;
        ctx.strokeRect(x+2,y+2,TILE-4,TILE-4);
        ctx.font='22px serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.shadowColor='#c0392b'; ctx.shadowBlur=12+gp*8;
        ctx.fillStyle='#e74c3c'; ctx.fillText('🚪',x+TILE/2,y+TILE/2);
        ctx.shadowBlur=0; break;
      }
      default:
        ctx.fillStyle='#050305'; ctx.fillRect(x,y,TILE,TILE);
    }
  }
}

/* ─── MAPS ────────────────────────────────────────────────── */
function makeTutorialMap() {
  const g=[
    [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2],
    [2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2],
    [2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2],
    [2,1,1,2,2,2,1,1,1,1,1,1,1,2,2,2,1,1,1,2],
    [2,1,1,2,2,2,1,1,1,1,1,1,1,2,2,2,1,1,1,2],
    [2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2],
    [2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2],
    [2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2],
    [2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2],
    [2,1,1,2,2,1,1,1,1,1,1,1,1,1,2,2,1,1,1,2],
    [2,1,1,2,2,1,1,1,1,1,1,1,1,1,2,2,1,1,1,2],
    [2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2],
    [2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2],
    [2,1,4,1,1,1,1,1,1,1,1,1,1,1,1,1,1,5,1,2],
    [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2],
  ];
  return new TileMap(g,{floor:'#0f0c0c',wall:'#070404',accent:'#1e1010'});
}
function makeLayer1Map() {
  const g=[
    [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2],
    [2,1,1,1,1,2,2,1,1,1,1,1,2,2,1,1,1,1,1,2,2,1,1,1,1,1,1,2,2,2],
    [2,1,1,1,1,2,2,1,1,1,1,1,2,2,1,1,1,1,1,2,2,1,1,1,1,1,1,2,2,2],
    [2,1,1,1,1,2,2,1,1,1,1,1,2,2,1,1,4,1,1,2,2,1,1,1,1,1,1,2,2,2],
    [2,1,1,1,1,3,3,1,1,1,1,1,3,3,1,1,1,1,1,3,3,1,1,1,1,1,1,2,2,2],
    [2,1,1,1,1,2,2,1,1,1,1,1,2,2,1,1,1,1,1,2,2,1,1,1,1,1,1,2,2,2],
    [2,2,2,1,2,2,2,2,2,1,2,2,2,2,2,2,1,2,2,2,2,2,2,1,2,2,2,2,2,2],
    [2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2],
    [2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2],
    [2,1,1,2,2,1,1,2,2,2,1,1,1,1,2,2,2,2,1,1,2,2,2,1,1,2,2,1,1,2],
    [2,1,1,2,2,1,1,2,2,2,1,1,1,1,2,2,2,2,1,1,2,2,2,1,1,2,2,1,1,2],
    [2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2],
    [2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2],
    [2,1,4,1,1,2,2,1,1,1,1,1,2,2,1,1,1,1,1,2,2,1,1,1,1,1,1,2,1,2],
    [2,1,1,1,1,2,2,1,1,1,1,1,2,2,1,1,1,1,1,2,2,1,1,1,1,1,1,2,1,2],
    [2,1,1,1,1,3,3,1,1,1,1,1,3,3,1,1,1,1,1,3,3,1,1,1,1,1,1,3,1,2],
    [2,1,1,1,1,2,2,1,1,1,1,1,2,2,1,1,1,1,1,2,2,1,1,1,1,1,1,2,5,2],
    [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2],
  ];
  return new TileMap(g,{floor:'#1a1210',wall:'#0d0806',accent:'#2e1a10'});
}
function makeBossArena() {
  const g=[
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
    [2,1,1,2,2,1,1,1,1,1,1,1,1,1,1,2,2,1,1,2],
    [2,1,1,2,2,1,1,1,1,1,1,1,1,1,1,2,2,1,1,2],
    [2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2],
    [2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2],
    [2,1,4,1,1,1,1,1,1,1,1,1,1,1,1,1,1,5,1,2],
    [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2],
  ];
  return new TileMap(g,{floor:'#120a0a',wall:'#080404',accent:'#201010'});
}

/* ════════════════════════════════════════════════════════════════
   WORLD
════════════════════════════════════════════════════════════════ */
class World {
  constructor() {
    this.map=null; this.enemies=[]; this.boss=null;
    this.bossDefeated=false; this.cleared=false; this.isBossArena=false;
  }
  _spawn(poses,types) {
    for(const p of poses) this.enemies.push(new Enemy(p.x*TILE+TILE/2,p.y*TILE+TILE/2,ENEMY_CFG[U.pick(types)]));
  }
  loadTutorial() {
    this.map=makeTutorialMap(); this.enemies=[]; this.boss=null;
    this.isBossArena=false; this.cleared=false; this.bossDefeated=false;
    this.boss=new TutorialBoss(10*TILE+TILE/2, 2*TILE+TILE/2);
  }
  loadLayer1() {
    this.map=makeLayer1Map(); this.enemies=[]; this.boss=null;
    this.isBossArena=false; this.cleared=false; this.bossDefeated=false;
    const p=[
      {x:2,y:2},{x:3,y:3},{x:4,y:2},{x:8,y:2},{x:10,y:3},{x:11,y:2},
      {x:15,y:2},{x:16,y:3},{x:22,y:2},{x:23,y:3},
      {x:5,y:7},{x:10,y:8},{x:16,y:7},{x:22,y:8},{x:26,y:8},
      {x:2,y:13},{x:3,y:14},{x:8,y:13},{x:9,y:14},
      {x:16,y:13},{x:22,y:13},{x:23,y:14},
    ];
    this._spawn(p,['huskWalker','lostSoul','soulBat']);
  }
  loadBossArena() {
    this.map=makeBossArena(); this.enemies=[]; this.isBossArena=true;
    this.cleared=false; this.bossDefeated=false;
    this.boss=new Gatekeeper(10*TILE+TILE/2, 3*TILE+TILE/2);
  }

  collidesAt(x,y,w,h) { return this.map?this.map.collidesAt(x,y,w,h):false; }
  tileAtPx(wx,wy)       { return this.map?this.map.tileAtPx(wx,wy):T.WALL; }

  update(dt,player,particles,settings) {
    const events=[];
    // Enemies
    for(const e of this.enemies) {
      const r=e.update(dt,player,this);
      if(r?.type==='attack' && U.dist(e.x,e.y,player.x,player.y)<e.atkRange+10) {
        const taken=player.takeDamage(r.damage);
        if(taken>0 && settings.blood) particles.blood(player.x,player.y,6);
        if(taken>0) events.push({type:'playerHit',amount:taken,x:player.x,y:player.y});
      }
    }
    // Boss
    if(this.boss&&this.boss.alive) {
      const r=this.boss.update(dt,player,this);
      if(r?.type==='attack' && U.dist(this.boss.x,this.boss.y,player.x,player.y)<this.boss.atkRange+12) {
        const taken=player.takeDamage(r.damage);
        if(taken>0 && settings.blood) particles.blood(player.x,player.y,9);
        if(taken>0) events.push({type:'playerHit',amount:taken,x:player.x,y:player.y});
      }
      if(r?.type==='groundSlam') {
        if(settings.particles) particles.slam(r.x,r.y,r.radius);
        if(U.dist(player.x,player.y,r.x,r.y)<r.radius) {
          const taken=player.takeDamage(r.damage);
          if(taken>0 && settings.blood) particles.blood(player.x,player.y,12);
          if(taken>0) events.push({type:'playerHit',amount:taken,x:player.x,y:player.y});
        }
        events.push({type:'screenShake'});
      }
    }
    // Dead enemies
    const dead=this.enemies.filter(e=>!e.alive);
    for(const e of dead) {
      if(settings.particles) particles.soulPop(e.x,e.y,10);
      const leveled=player.addSouls(e.souls); player.kills++;
      if(leveled) events.push({type:'levelUp'});
      events.push({type:'soulDrop',amount:e.souls,x:e.x,y:e.y});
    }
    this.enemies=this.enemies.filter(e=>e.alive);
    // Dead boss
    if(this.boss&&!this.boss.alive&&!this.bossDefeated) {
      this.bossDefeated=true;
      if(settings.particles) particles.soulPop(this.boss.x,this.boss.y,35);
      const leveled=player.addSouls(this.boss.souls); player.kills++;
      if(leveled) events.push({type:'levelUp'});
      events.push({type:'bossDefeated',name:this.boss.name});
    }
    // Projectile hits
    for(const proj of player.projs) {
      if(!proj.alive) continue;
      const targets=[...this.enemies,...(this.boss&&this.boss.alive?[this.boss]:[])];
      for(const e of targets) {
        if(U.dist(proj.x,proj.y,e.x,e.y)<e.w/2+proj.r) {
          const dmg=e.takeDamage(proj.dmg);
          if(dmg>0) {
            if(settings.particles) particles.magic(proj.x,proj.y,7);
            events.push({type:'dmg',x:e.x,y:e.y,amount:dmg,kind:'dn-magic'});
          }
          proj.alive=false; break;
        }
      }
    }
    // Periodic embers on floor
    if(settings.particles && Math.random()<0.08) {
      const fx=this.map?U.rand(0,this.map.width):0;
      const fy=this.map?U.rand(0,this.map.height):0;
      if(this.map && this.tileAtPx(fx,fy)===T.FLOOR) particles.ember(fx,fy,1);
    }
    if(!this.cleared&&this.enemies.length===0&&(!this.boss||this.bossDefeated)) this.cleared=true;
    return events;
  }

  draw(ctx,cx,cy,vw,vh,time) {
    this.map.draw(ctx,cx,cy,vw,vh,time);
    for(const e of this.enemies) e.draw(ctx,cx,cy);
    if(this.boss) this.boss.draw(ctx,cx,cy);
  }
}

/* ════════════════════════════════════════════════════════════════
   CAMERA
════════════════════════════════════════════════════════════════ */
class Camera {
  constructor() { this.x=0; this.y=0; this.tx=0; this.ty=0; }
  follow(px,py,mw,mh,vw,vh) {
    this.tx = U.clamp(px-vw/2, 0, Math.max(0,mw-vw));
    this.ty = U.clamp(py-vh/2, 0, Math.max(0,mh-vh));
    this.x  = U.lerp(this.x, this.tx, 0.14);
    this.y  = U.lerp(this.y, this.ty, 0.14);
  }
}

/* ════════════════════════════════════════════════════════════════
   UI
════════════════════════════════════════════════════════════════ */
class UI {
  constructor() {
    this.$=id=>document.getElementById(id);
    this.hpBar     =this.$('hpBar');     this.hpVal    =this.$('hpVal');
    this.stBar     =this.$('stBar');     this.stVal    =this.$('stVal');
    this.hudSouls  =this.$('hudSouls');  this.hudLv    =this.$('hudLv');
    this.hudXp     =this.$('hudXp');     this.hwpName  =this.$('hwpName');
    this.hudClass  =this.$('hudClassBadge');
    this.layerNum  =this.$('hudLayerNum'); this.layerName=this.$('hudLayerName');
    this.cdAtk     =this.$('cdAtk');     this.cdDash   =this.$('cdDash');
    this.cdSpecial =this.$('cdSpecial'); this.cdBlock  =this.$('cdBlock');
    this.slotAtk   =this.$('hslot-atk');this.slotDash =this.$('hslot-dash');
    this.slotSpec  =this.$('hslot-special');
    this.bossHud   =this.$('bossHud');   this.bossBar  =this.$('bossBarFill');
    this.bossName  =this.$('bossHudName');this.bossPh  =this.$('bossHudPhase');
    this.interact  =this.$('interactPrompt'); this.iTxt =this.$('interactTxt');
    this.banner    =this.$('roomBanner');
    this.notif     =this.$('notification');
    this.dmgLayer  =this.$('dmgLayer');
    this.fxOverlay =this.$('fxOverlay');
    this.gameScreen=this.$('screen-game');
    this.wispBox   =this.$('wispBox');
    this.wispText  =this.$('wispText');
    this._bannerTimer=null; this._notifTimer=null;
  }

  update(player,world) {
    // Bars
    const hp=player.hp/player.maxHp, st=player.stamina/player.maxStamina;
    this.hpBar.style.width=(hp*100)+'%';
    this.hpVal.textContent=`${Math.ceil(player.hp)}/${player.maxHp}`;
    this.stBar.style.width=(st*100)+'%';
    this.stVal.textContent=`${Math.floor(player.stamina)}/${player.maxStamina}`;
    this.gameScreen.classList.toggle('low-hp',hp<0.25);
    // Souls / level
    this.hudSouls.textContent=player.souls;
    this.hudLv.textContent=player.level;
    this.hudXp.style.width=((player.soulsBank/SOULS_PER_LEVEL)*100)+'%';
    // Weapon / class
    this.hwpName.textContent=player.weapon.name;
    this.hudClass.textContent=player.className.toUpperCase();
    // Cooldowns
    const fmt=ms=>ms>0?(ms/1000).toFixed(1)+'s':'';
    this.cdAtk.textContent    = fmt(Math.max(0,player.atkCd));
    this.cdDash.textContent   = fmt(Math.max(0,player.dashCd));
    this.cdSpecial.textContent= fmt(Math.max(0,player.specialCd));
    this.slotAtk.classList.toggle('cooling',player.atkCd>0);
    this.slotDash.classList.toggle('cooling',player.dashCd>0);
    this.slotSpec.classList.toggle('cooling',player.specialCd>0||!player.weapon.special);
    // Boss HUD
    if(world.boss&&world.boss.alive) {
      this.bossHud.classList.remove('hidden');
      this.bossName.textContent=world.boss.name;
      this.bossBar.style.width=(world.boss.hp/world.boss.maxHp*100)+'%';
      this.bossPh.textContent=world.boss.phaseName;
    } else { this.bossHud.classList.add('hidden'); }
  }

  setLayer(num,name) { this.layerNum.textContent=num; this.layerName.textContent=name; }

  showInteract(txt) { this.iTxt.textContent=txt; this.interact.classList.remove('hidden'); }
  hideInteract()    { this.interact.classList.add('hidden'); }

  showBanner(txt,dur=2800) {
    this.banner.textContent=txt; this.banner.classList.remove('hidden');
    clearTimeout(this._bannerTimer);
    this._bannerTimer=setTimeout(()=>this.banner.classList.add('hidden'),dur);
  }

  showNotif(txt,dur=2200) {
    this.notif.textContent=txt; this.notif.classList.remove('hidden');
    clearTimeout(this._notifTimer);
    this._notifTimer=setTimeout(()=>this.notif.classList.add('hidden'),dur);
  }

  shake() {
    this.gameScreen.classList.remove('shaking');
    void this.gameScreen.offsetWidth;
    this.gameScreen.classList.add('shaking');
    setTimeout(()=>this.gameScreen.classList.remove('shaking'),420);
  }

  flash(type) {
    const el=document.createElement('div');
    el.className=`fx-${type}`;
    this.fxOverlay.appendChild(el);
    el.addEventListener('animationend',()=>el.remove());
  }

  dmgNum(x,y,txt,kind,cx,cy) {
    const el=document.createElement('div');
    el.className=`dnum ${kind}`; el.textContent=txt;
    el.style.left=(x-cx)+'px'; el.style.top=(y-cy-20)+'px';
    this.dmgLayer.appendChild(el);
    el.addEventListener('animationend',()=>el.remove());
  }

  showWisp(txt) { this.wispText.textContent=txt; this.wispBox.classList.remove('hidden'); }
  hideWisp()    { this.wispBox.classList.add('hidden'); }

  buildSkillTree(player, onUpgrade) {
    document.getElementById('stLvl').textContent  = player.level;
    document.getElementById('stSouls').textContent= player.souls;
    document.getElementById('stPts').textContent  = player.skillPts;
    const grid=document.getElementById('stGrid');
    grid.innerHTML='';
    for(const sk of SKILLS) {
      const lv=player.skills[sk.id];
      const maxed=lv>=sk.max;
      const canUp=!maxed&&player.skillPts>=1;
      const card=document.createElement('div'); card.className='st-card';
      card.innerHTML=`
        <div class="st-card-top">
          <span class="st-icon">${sk.icon}</span>
          <span class="st-name">${sk.name}</span>
          <span class="st-lv">${lv}/${sk.max}</span>
        </div>
        <div class="st-bar-w"><div class="st-bar" style="width:${(lv/sk.max)*100}%"></div></div>
        <div class="st-desc">${sk.desc}</div>
        ${maxed
          ? '<div class="st-maxed">✦ MAXED</div>'
          : `<button class="st-upbtn" ${canUp?'':'disabled'}>Upgrade (1 pt)</button>`}
      `;
      if(canUp) card.querySelector('.st-upbtn').addEventListener('click',()=>{
        if(player.learnSkill(sk.id)) onUpgrade();
      });
      grid.appendChild(card);
    }
  }

  showDeath(cause,player) {
    document.getElementById('goCause').textContent=cause;
    document.getElementById('goStats').innerHTML=
      `Layer: I &nbsp;·&nbsp; Level: ${player.level} &nbsp;·&nbsp; Souls: ${player.totalSouls}<br>
       Kills: ${player.kills} &nbsp;·&nbsp; Damage dealt: ${player.dmgDealt} &nbsp;·&nbsp; Damage taken: ${player.dmgTaken}`;
  }
  showVictory(player) {
    document.getElementById('vicStats').innerHTML=
      `Level: ${player.level} &nbsp;·&nbsp; Souls: ${player.totalSouls}<br>
       Kills: ${player.kills} &nbsp;·&nbsp; Damage dealt: ${player.dmgDealt}`;
  }
}

/* ════════════════════════════════════════════════════════════════
   SCREENS
════════════════════════════════════════════════════════════════ */
class Screens {
  constructor() { this.all=document.querySelectorAll('.screen'); }
  show(id) {
    this.all.forEach(s=>{
      const match=s.id===id;
      s.classList.toggle('hidden',!match);
      s.classList.toggle('active',match);
    });
  }
  showOverlay(id) { const e=document.getElementById(id); if(e){e.classList.remove('hidden');e.classList.add('active');} }
  hideOverlay(id) { const e=document.getElementById(id); if(e){e.classList.add('hidden');e.classList.remove('active');} }
}

/* ════════════════════════════════════════════════════════════════
   MENU CANVAS (animated background)
════════════════════════════════════════════════════════════════ */
class MenuCanvas {
  constructor(id) {
    this.canvas=document.getElementById(id);
    if(!this.canvas) return;
    this.ctx=this.canvas.getContext('2d');
    this.embers=[]; this.time=0;
    this._resize(); window.addEventListener('resize',()=>this._resize());
    for(let i=0;i<60;i++) this._addEmber(true);
    this._loop();
  }
  _resize() {
    if(!this.canvas)return;
    this.canvas.width=window.innerWidth; this.canvas.height=window.innerHeight;
  }
  _addEmber(randomY=false) {
    const W=this.canvas?.width||800, H=this.canvas?.height||600;
    this.embers.push({
      x:U.rand(0,W), y:randomY?U.rand(0,H):H+8,
      vx:U.rand(-18,18), vy:U.rand(-55,-25),
      size:U.rand(1.5,4.5), life:1, maxLife:U.rand(0.6,1),
      color:U.pick(['#e67e22','#c0392b','#f39c12','#e74c3c','#fff']),
    });
  }
  _loop() {
    if(!this.canvas)return;
    const dt=1/60; this.time+=dt;
    const ctx=this.ctx, W=this.canvas.width, H=this.canvas.height;
    ctx.clearRect(0,0,W,H);
    // Background gradient
    const bg=ctx.createLinearGradient(0,0,0,H);
    bg.addColorStop(0,'#07050a'); bg.addColorStop(0.6,'#0f060a'); bg.addColorStop(1,'#1a0808');
    ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);
    // Hell glow at bottom
    const glow=ctx.createRadialGradient(W/2,H,0,W/2,H,H*0.6);
    glow.addColorStop(0,`rgba(192,57,43,${0.18+Math.sin(this.time)*0.04})`);
    glow.addColorStop(1,'rgba(192,57,43,0)');
    ctx.fillStyle=glow; ctx.fillRect(0,0,W,H);
    // Side glows
    const lg=ctx.createRadialGradient(0,H*0.5,0,0,H*0.5,W*0.4);
    lg.addColorStop(0,'rgba(230,126,34,0.06)'); lg.addColorStop(1,'rgba(230,126,34,0)');
    ctx.fillStyle=lg; ctx.fillRect(0,0,W,H);
    // Embers
    this.embers=this.embers.filter(e=>e.life>0);
    while(this.embers.length<60) this._addEmber();
    for(const e of this.embers) {
      e.x+=e.vx*dt; e.y+=e.vy*dt; e.life-=dt/e.maxLife;
      const t=Math.max(0,e.life);
      ctx.globalAlpha=t*t*0.85;
      ctx.shadowColor=e.color; ctx.shadowBlur=e.size*4;
      ctx.fillStyle=e.color;
      ctx.beginPath(); ctx.arc(e.x,e.y,e.size*t,0,Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha=1; ctx.shadowBlur=0;
    requestAnimationFrame(()=>this._loop());
  }
}

/* ════════════════════════════════════════════════════════════════
   TUTORIAL WISP
════════════════════════════════════════════════════════════════ */
class WispTutorial {
  constructor(ui, onDone) {
    this.ui=ui; this.onDone=onDone; this.step=0; this.finished=false;
    this.lines=[
      "I am Ignis, a guide wisp. I will prepare you for what lies below these gates.",
      "Use W A S D to move through the darkness. You'll need to be quick.",
      "Press SPACE to strike enemies with your weapon. Time your attacks wisely.",
      "Hold Q to block incoming attacks — it costs stamina but can save your life.",
      "Press SHIFT to dash — a burst of speed with temporary invincibility. Costs stamina.",
      "Press E to use your Special Ability. Each weapon has a unique power.",
      "Every 5 souls you collect, you gain a LEVEL. Press R at checkpoints for the Skill Tree.",
      "The Hollow Warden guards these gates. Strike it down to begin your true descent.",
      "One last thing — this is Hell. There is no mercy here. Good luck, warrior.",
    ];
    document.getElementById('wispNext').addEventListener('click',()=>this._next());
    this.ui.showWisp(this.lines[0]);
  }
  _next() {
    this.step++;
    if(this.step>=this.lines.length) { this.finished=true; this.ui.hideWisp(); this.onDone(); return; }
    this.ui.showWisp(this.lines[this.step]);
  }
}

/* ════════════════════════════════════════════════════════════════
   MAIN GAME
════════════════════════════════════════════════════════════════ */
class Game {
  constructor() {
    this.canvas   = document.getElementById('gameCanvas');
    this.ctx      = this.canvas.getContext('2d');
    this.input    = new Input();
    this.screens  = new Screens();
    this.ui       = new UI();
    this.settings = new Settings();
    this.particles= new Particles();
    this.world    = new World();
    this.camera   = new Camera();
    this.player   = null;
    this.state    = 'loading';
    this.classId  = null;
    this.wisp     = null;
    this.time     = 0;
    this._lastTs  = 0;
    this._victoryArmed = false;
    this._tutBossExitShown = false;

    this._wireButtons();
    window.addEventListener('resize', ()=>this._resize());
    this._resize();
    this._runLoading();
  }

  /* ── LOADING ── */
  _runLoading() {
    const bar  = document.getElementById('loadingBar');
    const txt  = document.getElementById('loadingText');
    const msgs = ['Forging the underworld...','Summoning the Gatekeeper...','Binding the souls...','Opening the gates...'];
    let prog=0, mi=0;
    const iv = setInterval(()=>{
      prog += U.rand(8,18);
      bar.style.width=Math.min(prog,100)+'%';
      if(mi<msgs.length-1&&prog>mi*28) { txt.textContent=msgs[++mi]; }
      if(prog>=100) {
        clearInterval(iv);
        setTimeout(()=>{ this.screens.show('screen-menu'); this.state='menu'; },400);
      }
    },120);
  }

  /* ── BUTTONS ── */
  _wireButtons() {
    const on=(id,fn)=>document.getElementById(id)?.addEventListener('click',fn);
    // Menu
    on('btnPlay',         ()=>this.screens.show('screen-classselect'));
    on('btnMenuStory',    ()=>this.screens.show('screen-story'));
    on('btnMenuHowTo',    ()=>this.screens.show('screen-howto'));
    on('btnMenuSettings', ()=>this.screens.show('screen-settings'));
    on('btnMenuCredits',  ()=>this.screens.show('screen-credits'));
    // Backs
    ['btnStoryBack','btnHowToBack','btnSettingsBack','btnCreditsBack'].forEach(id=>on(id,()=>this.screens.show('screen-menu')));
    // Class select
    document.querySelectorAll('.ccard-btn').forEach(btn=>btn.addEventListener('click',()=>this._startGame(btn.dataset.class)));
    // Pause
    on('btnResume',       ()=>this._resume());
    on('btnPauseSkills',  ()=>{ this.screens.hideOverlay('screen-pause'); this._openSkillTree(); });
    on('btnPauseRestart', ()=>{ this.screens.hideOverlay('screen-pause'); this._startGame(this.classId); });
    on('btnPauseMenu',    ()=>{ this.screens.hideOverlay('screen-pause'); this.screens.show('screen-menu'); this.state='menu'; });
    // Skill tree
    on('btnStClose', ()=>this._closeSkillTree());
    // Game over
    on('btnGORestart', ()=>{ this.screens.hideOverlay('screen-gameover'); this._startGame(this.classId); });
    on('btnGOMenu',    ()=>{ this.screens.hideOverlay('screen-gameover'); this.screens.show('screen-menu'); });
    // Victory
    on('btnVicPlay', ()=>{ this.screens.hideOverlay('screen-victory'); this._startGame(this.classId); });
    on('btnVicMenu', ()=>{ this.screens.hideOverlay('screen-victory'); this.screens.show('screen-menu'); });
    // Card hover glow
    document.querySelectorAll('.ccard').forEach(c=>c.addEventListener('mouseenter',()=>c.classList.add('selected')));
    document.querySelectorAll('.ccard').forEach(c=>c.addEventListener('mouseleave',()=>c.classList.remove('selected')));
  }

  _resize() { this.canvas.width=window.innerWidth; this.canvas.height=window.innerHeight; }

  /* ── START GAME ── */
  _startGame(classId) {
    ['screen-pause','screen-gameover','screen-victory','screen-skilltree'].forEach(id=>this.screens.hideOverlay(id));
    this.classId=classId;
    this.player  = new Player(3*TILE+TILE/2, 12*TILE+TILE/2, classId);
    this.world   = new World();
    this.particles=new Particles();
    this.camera  = new Camera();
    this._victoryArmed=false; this._tutBossExitShown=false;
    this.world.loadTutorial();
    this.ui.setLayer('T','Tutorial — The Hollow Gate');
    this.screens.show('screen-game');
    this.state='tutorial';
    this.wisp=new WispTutorial(this.ui,()=>this.ui.showBanner('⚔ Defeat the Hollow Warden!',3000));
    requestAnimationFrame(t=>{ this._lastTs=t; this._loop(t); });
  }

  _pause()   { if(this.state!=='playing'&&this.state!=='tutorial')return; this._prevState=this.state; this.state='paused'; this.screens.showOverlay('screen-pause'); }
  _resume()  { this.state=this._prevState||'playing'; this.screens.hideOverlay('screen-pause'); }

  _openSkillTree() {
    this._prevState=this.state; this.state='skilltree';
    this.screens.showOverlay('screen-skilltree');
    this.ui.buildSkillTree(this.player,()=>this.ui.buildSkillTree(this.player,()=>{}));
  }
  _closeSkillTree() {
    this.screens.hideOverlay('screen-skilltree');
    this.state=this._prevState||'playing';
    // If enemies cleared on layer 1 → go to boss
    if(!this.world.isBossArena && this.world.enemies.length===0 && this.state==='playing') {
      this._enterBossArena();
    }
  }

  _enterLayer1() {
    const wn=this.player.upgradeWeapon();
    this.world.loadLayer1();
    this.player.x=3*TILE+TILE/2; this.player.y=3*TILE+TILE/2;
    this.ui.setLayer('I','Gates of Despair');
    this.ui.showBanner('— Layer I — Gates of Despair —',3500);
    if(wn) setTimeout(()=>this.ui.showNotif(`Weapon unlocked: ${wn}`,2500),3600);
    this.state='playing'; this.ui.hideWisp();
  }

  _enterBossArena() {
    this.world.loadBossArena();
    this.player.x=10*TILE+TILE/2; this.player.y=13*TILE+TILE/2;
    this.ui.showBanner('⚠ THE GATEKEEPER AWAKENS ⚠',4000);
    if(this.settings.screenShake) this.ui.shake();
    this.ui.flash('hit');
  }

  _die(cause) {
    this.state='gameover';
    this.ui.showDeath(cause, this.player);
    this.screens.showOverlay('screen-gameover');
  }

  _victory() {
    this.state='victory';
    this.ui.showVictory(this.player);
    this.screens.showOverlay('screen-victory');
  }

  /* ── LOOP ── */
  _loop(ts) {
    const dt=Math.min(ts-this._lastTs, 50);
    this._lastTs=ts; this.time+=dt/1000;
    if(this.state==='playing'||this.state==='tutorial') this._update(dt);
    this._draw();
    if(this.state!=='gameover'&&this.state!=='victory') requestAnimationFrame(t=>this._loop(t));
    else { /* wait for overlay */ setTimeout(()=>requestAnimationFrame(t=>this._loop(t)),500); }
  }

  /* ── UPDATE ── */
  _update(dt) {
    const action=this.player.update(dt,this.input,this.world);
    if(action==='pause') { this._pause(); this.input.flush(); return; }

    // Interact
    if(action==='interact') {
      const tile=this.world.tileAtPx(this.player.x,this.player.y);
      if(tile===T.CHECKPOINT && this.world.enemies.length===0 && !this.world.isBossArena) {
        this._openSkillTree(); this.input.flush(); return;
      }
      if(tile===T.EXIT && this.world.bossDefeated) {
        this._victory(); this.input.flush(); return;
      }
    }

    // Attack
    if(action==='attack') {
      const atk=this.player.attack();
      if(atk.isProjectile) {
        this.player.projs.push(new Projectile(atk.x,atk.y,atk.angle,atk.damage,atk.color));
      } else {
        if(this.settings.particles) this.particles.slash(atk.x,atk.y,atk.angle,atk.range);
        this._resolveAtk(atk);
      }
    }

    // Special
    if(action==='special') this._doSpecial();

    // World update
    const events=this.world.update(dt,this.player,this.particles,this.settings);
    for(const ev of events) {
      if(ev.type==='screenShake'&&this.settings.screenShake) this.ui.shake();
      if(ev.type==='playerHit') {
        this.ui.dmgNum(ev.x,ev.y,'-'+ev.amount,'dn-player',this.camera.x,this.camera.y);
        this.ui.flash('hit');
      }
      if(ev.type==='levelUp') { this.ui.flash('level'); this.ui.showNotif(`Level ${this.player.level}! +1 Skill Point 🔥`,2500); }
      if(ev.type==='soulDrop') { this.ui.dmgNum(ev.x,ev.y,'+'+ev.amount+'💀','dn-soul',this.camera.x,this.camera.y); }
      if(ev.type==='dmg') { this.ui.dmgNum(ev.x,ev.y,ev.amount,ev.kind,this.camera.x,this.camera.y); }
      if(ev.type==='bossDefeated') {
        const wn=this.player.upgradeWeapon();
        setTimeout(()=>{
          this.ui.showBanner(`${ev.name} has fallen!`,3500);
          if(wn) setTimeout(()=>this.ui.showNotif(`Weapon: ${wn}`,2500),3600);
        },400);
      }
    }

    // Particles
    if(this.settings.particles) this.particles.update(dt);

    // Camera
    if(this.world.map) this.camera.follow(this.player.x,this.player.y,this.world.map.width,this.world.map.height,this.canvas.width,this.canvas.height);

    // UI
    this.ui.update(this.player,this.world);

    // Interact prompts
    const tile=this.world.tileAtPx(this.player.x,this.player.y);
    if(tile===T.CHECKPOINT&&this.world.enemies.length===0&&!this.world.isBossArena) this.ui.showInteract('open Skill Tree');
    else if(tile===T.EXIT&&this.world.bossDefeated) this.ui.showInteract('descend deeper');
    else this.ui.hideInteract();

    // Tutorial exit
    if(this.state==='tutorial'&&this.world.bossDefeated&&!this._tutBossExitShown) {
      this._tutBossExitShown=true;
      this.ui.showBanner('The gates crack open... walk through.',3000);
    }
    if(this.state==='tutorial'&&tile===T.EXIT&&this.world.bossDefeated) { this._enterLayer1(); }

    // Death
    if(this.player.hp<=0) this._die(this.world.isBossArena?'Slain by The Gatekeeper':'Fallen in the depths');

    // Victory (boss arena exit)
    if(this.world.isBossArena&&this.world.bossDefeated&&tile===T.EXIT&&!this._victoryArmed) {
      this._victoryArmed=true; this._victory();
    }

    this.input.flush();
  }

  /* ── ATTACK RESOLVE ── */
  _resolveAtk(atk) {
    const targets=[...this.world.enemies,...(this.world.boss&&this.world.boss.alive?[this.world.boss]:[])];
    for(const e of targets) {
      if(U.dist(atk.x,atk.y,e.x,e.y)>atk.range+e.w/2) continue;
      let diff=U.angle(atk.x,atk.y,e.x,e.y)-atk.angle;
      while(diff>Math.PI)diff-=Math.PI*2; while(diff<-Math.PI)diff+=Math.PI*2;
      if(Math.abs(diff)>atk.arc/2) continue;
      const dmg=e.takeDamage(atk.damage);
      if(dmg>0) {
        const ka=U.angle(this.player.x,this.player.y,e.x,e.y);
        e.knockback(Math.cos(ka)*200,Math.sin(ka)*200);
        this.ui.dmgNum(e.x,e.y-22,atk.isCrit?atk.damage+'!!':atk.damage,atk.isCrit?'dn-crit':'dn-enemy',this.camera.x,this.camera.y);
        if(e.isBoss&&this.settings.screenShake) this.ui.shake();
        this.player.stamina=Math.min(this.player.maxStamina,this.player.stamina+5);
      }
    }
  }

  /* ── SPECIALS ── */
  _doSpecial() {
    const sp=this.player.weapon.special; if(!sp) return;
    this.player.specialCd=this.player.weapon.sCd||5000;
    const targets=[...this.world.enemies,...(this.world.boss&&this.world.boss.alive?[this.world.boss]:[])];

    if(sp==='groundSmash'||sp==='heavySlam') {
      const r=sp==='heavySlam'?100:80;
      for(const e of targets) {
        if(U.dist(this.player.x,this.player.y,e.x,e.y)<r) {
          const dmg=Math.round((this.player.baseDmg)*2.2);
          e.takeDamage(dmg);
          this.ui.dmgNum(e.x,e.y-22,dmg+'!!','dn-crit',this.camera.x,this.camera.y);
        }
      }
      if(this.settings.particles) this.particles.slam(this.player.x,this.player.y,r);
      if(this.settings.screenShake) this.ui.shake();
    }
    if(sp==='shadowStrike'||sp==='dashStrike'||sp==='bladestorm') {
      this.player._dash();
      setTimeout(()=>{
        const ts2=[...this.world.enemies,...(this.world.boss&&this.world.boss.alive?[this.world.boss]:[])];
        for(const e of ts2) {
          if(U.dist(this.player.x,this.player.y,e.x,e.y)<75) {
            const dmg=Math.round(this.player.baseDmg*1.9);
            e.takeDamage(dmg);
            this.ui.dmgNum(e.x,e.y-22,dmg+'!!','dn-crit',this.camera.x,this.camera.y);
          }
        }
        if(this.settings.particles) this.particles.burst(this.player.x,this.player.y,16,{color:this.player.accentColor,size:3,life:350,sMin:50,sMax:150});
      },190);
    }
    if(sp==='fireball'||sp==='arcaneBlast'||sp==='orbStorm') {
      const count=sp==='orbStorm'?5:3;
      const spread=sp==='fireball'?0.22:sp==='arcaneBlast'?0.15:0.3;
      const base=Math.atan2(this.player.facing.y,this.player.facing.x);
      for(let i=0;i<count;i++) {
        const a=base+(i-(count-1)/2)*spread;
        this.player.projs.push(new Projectile(
          this.player.x+this.player.facing.x*32,
          this.player.y+this.player.facing.y*32,
          a, Math.round(this.player.baseMagic*1.6),
          this.player.weapon.color, 260, 2400
        ));
      }
      if(this.settings.particles) this.particles.magic(this.player.x,this.player.y,14);
    }
    if(sp==='spearThrow') {
      const a=Math.atan2(this.player.facing.y,this.player.facing.x);
      this.player.projs.push(new Projectile(
        this.player.x+this.player.facing.x*32,
        this.player.y+this.player.facing.y*32,
        a, Math.round(this.player.baseDmg*2.5), '#e74c3c', 450, 3000
      ));
      if(this.settings.particles) this.particles.burst(this.player.x,this.player.y,10,{color:'#e67e22',size:3,life:300,sMin:40,sMax:110});
    }
  }

  /* ── DRAW ── */
  _draw() {
    const ctx=this.ctx, W=this.canvas.width, H=this.canvas.height;
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle='#07050a'; ctx.fillRect(0,0,W,H);
    if(!this.player||!this.world.map) return;
    const cx=this.camera.x, cy=this.camera.y;

    // World
    this.world.draw(ctx,cx,cy,W,H,this.time);

    // Floor glow under player (class colored)
    ctx.save();
    const pg=ctx.createRadialGradient(this.player.x-cx,this.player.y-cy,0,this.player.x-cx,this.player.y-cy,40);
    pg.addColorStop(0,this.player.classColor+'30'); pg.addColorStop(1,'transparent');
    ctx.fillStyle=pg; ctx.beginPath(); ctx.arc(this.player.x-cx,this.player.y-cy,40,0,Math.PI*2); ctx.fill();
    ctx.restore();

    // Particles (behind player)
    if(this.settings.particles) this.particles.draw(ctx,cx,cy);

    // Player
    this.player.draw(ctx,cx,cy);

    // Vignette
    this._vignette(ctx,W,H);
  }

  _vignette(ctx,W,H) {
    const g=ctx.createRadialGradient(W/2,H/2,H*0.25,W/2,H/2,H*0.82);
    g.addColorStop(0,'rgba(0,0,0,0)');
    g.addColorStop(1,'rgba(0,0,0,0.65)');
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
    // Red tint at very edge
    const e=ctx.createRadialGradient(W/2,H/2,H*0.6,W/2,H/2,H);
    e.addColorStop(0,'rgba(0,0,0,0)');
    e.addColorStop(1,'rgba(100,0,0,0.18)');
    ctx.fillStyle=e; ctx.fillRect(0,0,W,H);
  }
}

/* ════════════════════════════════════════════════════════════════
   BOOT
════════════════════════════════════════════════════════════════ */
window.addEventListener('DOMContentLoaded', () => {
  // Start animated menu bg canvases
  new MenuCanvas('menuCanvas');
  new MenuCanvas('classCanvas');
  // Boot game
  window.game = new Game();
});