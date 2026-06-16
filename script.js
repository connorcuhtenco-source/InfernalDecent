'use strict';
/* ═══════════════════════════════════════════════════════════
   INFERNAL DESCENT — script.js  (Day 1 complete)
   Classes: Warrior · Assassin · Mage
   Systems: Stamina · Skill Tree · Tutorial Wisp · Soul Levels
═══════════════════════════════════════════════════════════ */

/* ──────────────────────────────────────────────────────────
   CONSTANTS
────────────────────────────────────────────────────────── */
const TILE = 48;
const T = { VOID:0, FLOOR:1, WALL:2, DOOR:3, CHECKPOINT:4, EXIT:5 };

/* souls needed to level up */
const SOULS_PER_LEVEL = 5;

/* ──────────────────────────────────────────────────────────
   UTILS
────────────────────────────────────────────────────────── */
const U = {
  clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),
  dist:(ax,ay,bx,by)=>Math.hypot(bx-ax,by-ay),
  rand:(a,b)=>a+Math.random()*(b-a),
  randInt:(a,b)=>Math.floor(U.rand(a,b+1)),
  choice:arr=>arr[Math.floor(Math.random()*arr.length)],
  angle:(ax,ay,bx,by)=>Math.atan2(by-ay,bx-ax),
  aabb:(ax,ay,aw,ah,bx,by,bw,bh)=>ax<bx+bw&&ax+aw>bx&&ay<by+bh&&ay+ah>by,
};

/* ──────────────────────────────────────────────────────────
   INPUT
────────────────────────────────────────────────────────── */
class Input {
  constructor(){
    this.down={};this.pressed={};
    window.addEventListener('keydown',e=>{
      if(!this.down[e.code])this.pressed[e.code]=true;
      this.down[e.code]=true;
      if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
    });
    window.addEventListener('keyup',e=>{this.down[e.code]=false;});
  }
  isDown(c){return!!this.down[c];}
  isPressed(c){const v=!!this.pressed[c];this.pressed[c]=false;return v;}
  flush(){this.pressed={};}
  move(){
    let x=0,y=0;
    if(this.isDown('KeyA')||this.isDown('ArrowLeft'))x-=1;
    if(this.isDown('KeyD')||this.isDown('ArrowRight'))x+=1;
    if(this.isDown('KeyW')||this.isDown('ArrowUp'))y-=1;
    if(this.isDown('KeyS')||this.isDown('ArrowDown'))y+=1;
    const l=Math.hypot(x,y);
    return l>0?{x:x/l,y:y/l}:{x:0,y:0};
  }
}

/* ──────────────────────────────────────────────────────────
   CLASS DEFINITIONS
────────────────────────────────────────────────────────── */
const CLASS_DEFS = {
  warrior:{
    name:'Warrior',
    hp:130, stamina:60, speed:150, damage:30, magicDmg:0,
    weapons:['fireAxe','demonGreatsword','devilsGreatspear'],
    color:'#c0392b', bodyColor:'#8B6050',
  },
  assassin:{
    name:'Assassin',
    hp:80,  stamina:90, speed:220, damage:30, magicDmg:0,
    weapons:['fireDagger','demonKatana','devilsNagakiba'],
    color:'#2c2c3a', bodyColor:'#4a4060',
  },
  mage:{
    name:'Mage',
    hp:70,  stamina:60, speed:175, damage:0,  magicDmg:30,
    weapons:['fireGloves','demonWand','devilsOrb'],
    color:'#4a2060', bodyColor:'#6a3a80',
  },
};

/* ──────────────────────────────────────────────────────────
   WEAPON DEFINITIONS
────────────────────────────────────────────────────────── */
const WEAPONS = {
  /* Warrior */
  fireAxe:{
    id:'fireAxe', name:'Fire Axe',
    damage:28, range:60, arc:Math.PI*0.85, cooldown:550,
    color:'#e67e22', special:'groundSmash', specialCd:5000,
    desc:'Leaves fire on enemies',
  },
  demonGreatsword:{
    id:'demonGreatsword', name:'Demon Greatsword',
    damage:48, range:72, arc:Math.PI*0.75, cooldown:700,
    color:'#c0392b', special:'heavySlam', specialCd:4500,
    desc:'Massive damage on impact',
  },
  devilsGreatspear:{
    id:'devilsGreatspear', name:"Devil's Greatspear",
    damage:65, range:90, arc:Math.PI*0.55, cooldown:600,
    color:'#e74c3c', special:'spearThrow', specialCd:4000,
    desc:'Throw and melee range',
  },
  /* Assassin */
  fireDagger:{
    id:'fireDagger', name:'Fire Dagger',
    damage:18, range:44, arc:Math.PI*0.6, cooldown:250,
    color:'#e67e22', special:'shadowStrike', specialCd:4000,
    desc:'Fast, leaves fire trail',
  },
  demonKatana:{
    id:'demonKatana', name:'Demon Katana',
    damage:34, range:58, arc:Math.PI*0.65, cooldown:320,
    color:'#8e44ad', special:'dashStrike', specialCd:3500,
    desc:'Quick slash with dash',
  },
  devilsNagakiba:{
    id:'devilsNagakiba', name:"Devil's Nagakiba",
    damage:52, range:80, arc:Math.PI*0.55, cooldown:280,
    color:'#c0392b', special:'bladestorm', specialCd:5000,
    desc:'Long blade, bladestorm',
  },
  /* Mage */
  fireGloves:{
    id:'fireGloves', name:'Fire Gloves',
    damage:0, magicDmg:28, range:180, arc:Math.PI*0.3, cooldown:400,
    color:'#e67e22', special:'fireball', specialCd:4000,
    desc:'Cast spells from hands',
    projectile:true,
  },
  demonWand:{
    id:'demonWand', name:'Demon Wand',
    damage:0, magicDmg:48, range:220, arc:Math.PI*0.25, cooldown:500,
    color:'#9b59b6', special:'arcaneBlast', specialCd:4500,
    desc:'Focused spell blast',
    projectile:true,
  },
  devilsOrb:{
    id:'devilsOrb', name:"Devil's Orb",
    damage:0, magicDmg:70, range:260, arc:Math.PI*0.35, cooldown:600,
    color:'#8e44ad', special:'orbStorm', specialCd:5000,
    desc:'Orb of destruction',
    projectile:true,
  },
};

/* ──────────────────────────────────────────────────────────
   SKILL TREE
────────────────────────────────────────────────────────── */
const SKILL_DEFS = [
  { id:'damage',    icon:'⚔',  name:'Damage',      desc:'Base damage +5 per level (warrior/assassin)',  maxLvl:20, costPerLvl:1 },
  { id:'magicDmg',  icon:'🔮', name:'Magic Damage', desc:'Magic damage +5 per level (mage only)',        maxLvl:20, costPerLvl:1 },
  { id:'speed',     icon:'💨', name:'Speed',        desc:'Move speed +10 per level (base 50)',           maxLvl:20, costPerLvl:1 },
  { id:'stamina',   icon:'⚡', name:'Stamina',      desc:'Max stamina +15 per level (base 50)',          maxLvl:20, costPerLvl:1 },
  { id:'health',    icon:'❤',  name:'Health',       desc:'Max HP +10 per level (base 100)',              maxLvl:20, costPerLvl:1 },
];

/* ──────────────────────────────────────────────────────────
   PLAYER
────────────────────────────────────────────────────────── */
class Player {
  constructor(x, y, classId) {
    this.x=x; this.y=y;
    this.w=26; this.h=26;
    this.classId=classId;

    const def = CLASS_DEFS[classId];
    this.className = def.name;
    this.bodyColor = def.bodyColor;
    this.classColor = def.color;

    /* Base stats (modified by skill tree) */
    this.baseHp      = def.hp;
    this.baseStamina = def.stamina;
    this.baseSpeed   = def.speed;
    this.baseDamage  = def.damage;
    this.baseMagic   = def.magicDmg;

    /* Skill tree levels */
    this.skills = { damage:0, magicDmg:0, speed:0, stamina:0, health:0 };

    /* Derived stats */
    this._recalc();

    /* Current values */
    this.hp      = this.maxHp;
    this.stamina = this.maxStamina;

    /* Soul / level system */
    this.souls           = 0;
    this.totalSouls      = 0;
    this.level           = 1;
    this.skillPoints     = 0;
    this.soulsToNextLevel= SOULS_PER_LEVEL;
    this.soulsAccum      = 0; // souls accumulated toward next level

    /* Weapon */
    this.weaponKeys = def.weapons;
    this.weaponIdx  = 0;
    this.weapon     = { ...WEAPONS[this.weaponKeys[0]] };

    /* Timers */
    this.atkCd     = 0;
    this.dashCd    = 0;
    this.specialCd = 0;
    this.iframes   = 0;
    this.blockTime = 0;
    this.dashTime  = 0;
    this.dashVx    = 0;
    this.dashVy    = 0;

    /* Visuals */
    this.facing    = {x:1, y:0};
    this.swingAnim = 0;
    this.walkFrame = 0;
    this.walkTimer = 0;

    /* Projectiles */
    this.projectiles = [];

    /* Stats tracking */
    this.killCount   = 0;
    this.dmgDealt    = 0;
    this.dmgTaken    = 0;
  }

  _recalc() {
    this.maxHp      = this.baseHp      + this.skills.health   * 10;
    this.maxStamina = this.baseStamina + this.skills.stamina   * 15;
    this.damage     = this.baseDamage  + this.skills.damage    * 5;
    this.magicDmg   = this.baseMagic   + this.skills.magicDmg  * 5;
    this.speed      = this.baseSpeed   + this.skills.speed     * 10;
  }

  get left()  { return this.x - this.w/2; }
  get top()   { return this.y - this.h/2; }
  get right() { return this.x + this.w/2; }
  get bot()   { return this.y + this.h/2; }

  /* Unlock next weapon when boss is defeated */
  upgradeWeapon() {
    if (this.weaponIdx < this.weaponKeys.length - 1) {
      this.weaponIdx++;
      this.weapon = { ...WEAPONS[this.weaponKeys[this.weaponIdx]] };
      return this.weapon.name;
    }
    return null;
  }

  addSouls(n) {
    this.souls      += n;
    this.totalSouls += n;
    this.soulsAccum += n;
    // Level up loop
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
    const def = SKILL_DEFS.find(s=>s.id===skillId);
    if (!def || this.skills[skillId] >= def.maxLvl || this.skillPoints < def.costPerLvl) return false;
    this.skillPoints -= def.costPerLvl;
    this.skills[skillId]++;
    const prevHp = this.maxHp;
    const prevSt = this.maxStamina;
    this._recalc();
    // Scale current values with upgrades
    if (skillId === 'health')  this.hp      += this.maxHp - prevHp;
    if (skillId === 'stamina') this.stamina += this.maxStamina - prevSt;
    this.hp      = U.clamp(this.hp,      0, this.maxHp);
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
    const rate = 15; // per second base
    this.stamina = Math.min(this.maxStamina, this.stamina + rate * dt/1000);
  }

  update(dt, input, world) {
    const s = dt/1000;

    /* Timers */
    if (this.atkCd     > 0) this.atkCd     -= dt;
    if (this.dashCd    > 0) this.dashCd    -= dt;
    if (this.specialCd > 0) this.specialCd -= dt;
    if (this.iframes   > 0) this.iframes   -= dt;
    if (this.blockTime > 0) this.blockTime -= dt;
    if (this.dashTime  > 0) this.dashTime  -= dt;
    if (this.swingAnim > 0) this.swingAnim -= s * 7;

    /* Stamina regen */
    this.regenStamina(dt);

    /* Movement */
    let vx=0, vy=0;
    if (this.dashTime > 0) {
      vx = this.dashVx; vy = this.dashVy;
    } else {
      const mv = input.move();
      vx = mv.x * this.speed;
      vy = mv.y * this.speed;
      if (mv.x!==0||mv.y!==0) this.facing={x:mv.x,y:mv.y};
      /* Sprint: hold shift while moving — costs stamina */
      if ((input.isDown('ShiftLeft')||input.isDown('ShiftRight')) && (vx!==0||vy!==0) && this.stamina>0) {
        vx*=1.5; vy*=1.5;
        this.stamina=Math.max(0,this.stamina - 18*s);
      }
    }

    /* Walk anim */
    if (vx!==0||vy!==0){
      this.walkTimer+=dt;
      if(this.walkTimer>140){this.walkTimer=0;this.walkFrame=(this.walkFrame+1)%4;}
    } else { this.walkFrame=0; }

    /* Collision */
    const nx=this.x+vx*s, ny=this.y+vy*s;
    if(!world.collidesAt(nx,this.y,this.w,this.h)) this.x=nx;
    if(!world.collidesAt(this.x,ny,this.w,this.h)) this.y=ny;

    /* Update projectiles */
    this.projectiles = this.projectiles.filter(p=>p.alive);
    for(const p of this.projectiles) p.update(dt,world);

    /* Block */
    if (input.isDown('KeyQ') && this.stamina>0) {
      this.blockTime = 100;
      this.stamina = Math.max(0, this.stamina - 8*s);
    }

    /* Actions */
    if (input.isPressed('Space') && this.atkCd<=0) return 'attack';
    if (input.isPressed('ShiftLeft')||input.isPressed('ShiftRight')) {
      if (this.dashCd<=0 && !this.dashTime && this.useStamina(15)) {
        this._dash();
      }
    }
    if (input.isPressed('KeyE') && this.specialCd<=0) return 'special';
    if (input.isPressed('KeyR')) return 'interact';
    if (input.isPressed('Escape')) return 'pause';
    return null;
  }

  _dash() {
    const spd=380;
    this.dashVx=this.facing.x*spd;
    this.dashVy=this.facing.y*spd;
    if(this.dashVx===0&&this.dashVy===0)this.dashVx=spd;
    this.dashTime=170;
    this.dashCd=900;
    this.iframes=200;
  }

  getAttackData() {
    this.atkCd = this.weapon.cooldown;
    this.swingAnim = 1;
    const isCrit = Math.random()<0.10;
    let dmg = (this.weapon.projectile ? this.magicDmg : this.damage) || this.weapon.damage || 0;
    if(isCrit) dmg=Math.ceil(dmg*1.8);
    this.dmgDealt += dmg;
    /* Stamina regen on attack */
    this.stamina=Math.min(this.maxStamina,this.stamina+4);
    return {
      x: this.x+this.facing.x*22, y: this.y+this.facing.y*22,
      range:this.weapon.range, arc:this.weapon.arc,
      angle:Math.atan2(this.facing.y,this.facing.x),
      damage:Math.round(dmg), isCrit,
      projectile:!!this.weapon.projectile,
    };
  }

  draw(ctx,cx,cy) {
    const sx=this.x-cx, sy=this.y-cy;
    ctx.save();
    ctx.translate(sx,sy);
    if(this.iframes>0&&Math.floor(this.iframes/70)%2===0)ctx.globalAlpha=0.35;

    /* Shadow */
    ctx.fillStyle='rgba(0,0,0,0.3)';
    ctx.beginPath();ctx.ellipse(0,this.h/2,9,3.5,0,0,Math.PI*2);ctx.fill();

    /* Body */
    ctx.fillStyle=this.bodyColor;
    ctx.fillRect(-this.w/2,-this.h/2,this.w,this.h);

    /* Armor top stripe */
    ctx.fillStyle='rgba(0,0,0,0.45)';
    ctx.fillRect(-this.w/2,-this.h/2,this.w,10);

    /* Facing dot */
    ctx.fillStyle=this.classColor;
    ctx.beginPath();ctx.arc(this.facing.x*7,this.facing.y*7-2,3.5,0,Math.PI*2);ctx.fill();

    /* Block flash */
    if(this.blockTime>0){
      ctx.strokeStyle='rgba(100,200,255,0.6)';ctx.lineWidth=3;
      ctx.strokeRect(-this.w/2,-this.h/2,this.w,this.h);
    }

    /* Dash trail */
    if(this.dashTime>0){
      ctx.strokeStyle='rgba(230,126,34,0.5)';ctx.lineWidth=2;
      ctx.strokeRect(-this.w/2,-this.h/2,this.w,this.h);
    }

    /* Swing arc */
    if(this.swingAnim>0){
      const a=Math.atan2(this.facing.y,this.facing.x);
      ctx.save();
      ctx.globalAlpha=this.swingAnim*0.3;
      ctx.fillStyle=this.weapon.color||'#f39c12';
      ctx.beginPath();ctx.moveTo(0,0);
      ctx.arc(0,0,this.weapon.range,a-this.weapon.arc/2,a+this.weapon.arc/2);
      ctx.closePath();ctx.fill();
      ctx.restore();
    }

    ctx.restore();

    /* Projectiles */
    for(const p of this.projectiles) p.draw(ctx,cx,cy);
  }
}

/* ──────────────────────────────────────────────────────────
   PROJECTILE
────────────────────────────────────────────────────────── */
class Projectile {
  constructor(x,y,angle,damage,color,speed=300,life=1800){
    this.x=x;this.y=y;
    this.vx=Math.cos(angle)*speed;
    this.vy=Math.sin(angle)*speed;
    this.damage=damage;
    this.color=color;
    this.life=life;
    this.r=8;
    this.alive=true;
    this.hit=false;
  }
  update(dt,world){
    this.life-=dt;
    if(this.life<=0){this.alive=false;return;}
    const s=dt/1000;
    const nx=this.x+this.vx*s;
    const ny=this.y+this.vy*s;
    if(world.collidesAt(nx,this.y,this.r*2,this.r*2)||world.collidesAt(this.x,ny,this.r*2,this.r*2)){
      this.alive=false;return;
    }
    this.x=nx;this.y=ny;
  }
  draw(ctx,cx,cy){
    if(!this.alive)return;
    const sx=this.x-cx,sy=this.y-cy;
    ctx.save();
    ctx.shadowColor=this.color;ctx.shadowBlur=12;
    ctx.fillStyle=this.color;
    ctx.beginPath();ctx.arc(sx,sy,this.r,0,Math.PI*2);ctx.fill();
    ctx.restore();
  }
}

/* ──────────────────────────────────────────────────────────
   ENEMY BASE
────────────────────────────────────────────────────────── */
class Enemy {
  constructor(x,y,cfg){
    this.x=x;this.y=y;
    this.w=cfg.w||26;this.h=cfg.h||26;
    this.maxHp=cfg.hp;this.hp=cfg.hp;
    this.speed=cfg.speed||80;
    this.damage=cfg.damage||8;
    this.souls=cfg.souls||5;
    this.color=cfg.color||'#c0392b';
    this.name=cfg.name||'Enemy';
    this.atkRange=cfg.atkRange||34;
    this.detectRange=cfg.detectRange||200;
    this.isBoss=false;

    this.state='patrol';
    this.atkCd=0;
    this.hitFlash=0;
    this.knockVx=0;this.knockVy=0;this.knockT=0;
    this.dyingT=0;
    this.alive=true;
    this.patrolTimer=U.rand(0,2500);
    this.patrolDir={x:1,y:0};
  }
  get left(){return this.x-this.w/2;}
  get top(){return this.y-this.h/2;}
  get right(){return this.x+this.w/2;}
  get bot(){return this.y+this.h/2;}

  takeDamage(n){
    if(this.state==='dying'||this.state==='dead')return 0;
    this.hp-=n;this.hitFlash=160;
    if(this.state==='patrol')this.state='chase';
    if(this.hp<=0){this.hp=0;this.state='dying';this.dyingT=380;}
    return n;
  }
  knock(vx,vy){this.knockVx=vx;this.knockVy=vy;this.knockT=200;}

  update(dt,player,world){
    const s=dt/1000;
    if(this.hitFlash>0)this.hitFlash-=dt;
    if(this.atkCd>0)this.atkCd-=dt;
    if(this.knockT>0){
      this.knockT-=dt;
      this.x+=this.knockVx*s;this.y+=this.knockVy*s;
      return null;
    }
    if(this.state==='dying'){this.dyingT-=dt;if(this.dyingT<=0){this.state='dead';this.alive=false;}return null;}
    if(this.state==='dead')return null;

    const d=U.dist(this.x,this.y,player.x,player.y);
    switch(this.state){
      case 'patrol':
        this._patrol(dt,world);
        if(d<this.detectRange)this.state='chase';
        break;
      case 'chase':
        if(d>this.detectRange*1.6){this.state='patrol';break;}
        if(d<this.atkRange){this.state='attack';break;}
        this._moveTo(player.x,player.y,s,world);
        break;
      case 'attack':
        if(d>this.atkRange*1.4){this.state='chase';break;}
        if(this.atkCd<=0){
          this.atkCd=1100;
          return{type:'attack',damage:this.damage};
        }
        break;
    }
    return null;
  }

  _patrol(dt,world){
    this.patrolTimer-=dt;
    if(this.patrolTimer<=0){
      this.patrolTimer=U.rand(1500,3500);
      const a=Math.random()*Math.PI*2;
      this.patrolDir={x:Math.cos(a),y:Math.sin(a)};
    }
    const s=dt/1000;
    const nx=this.x+this.patrolDir.x*this.speed*0.38*s;
    const ny=this.y+this.patrolDir.y*this.speed*0.38*s;
    if(!world.collidesAt(nx,this.y,this.w,this.h))this.x=nx;else this.patrolDir.x*=-1;
    if(!world.collidesAt(this.x,ny,this.w,this.h))this.y=ny;else this.patrolDir.y*=-1;
  }

  _moveTo(tx,ty,s,world){
    const a=U.angle(this.x,this.y,tx,ty);
    const vx=Math.cos(a)*this.speed,vy=Math.sin(a)*this.speed;
    const nx=this.x+vx*s,ny=this.y+vy*s;
    if(!world.collidesAt(nx,this.y,this.w,this.h))this.x=nx;
    if(!world.collidesAt(this.x,ny,this.w,this.h))this.y=ny;
  }

  draw(ctx,cx,cy){
    if(this.state==='dead')return;
    const sx=this.x-cx,sy=this.y-cy;
    ctx.save();ctx.translate(sx,sy);
    ctx.globalAlpha=this.state==='dying'?this.dyingT/380:1;
    /* Shadow */
    ctx.fillStyle='rgba(0,0,0,0.28)';
    ctx.beginPath();ctx.ellipse(0,this.h/2,this.w*0.38,3.5,0,0,Math.PI*2);ctx.fill();
    /* Body */
    ctx.fillStyle=this.hitFlash>0?'#ffffff':this.color;
    ctx.fillRect(-this.w/2,-this.h/2,this.w,this.h);
    /* Eyes */
    ctx.fillStyle='#ff0';
    ctx.fillRect(-5,-this.h/4,4,4);ctx.fillRect(2,-this.h/4,4,4);
    /* HP bar */
    if(this.hp<this.maxHp){
      const bw=this.w+4,bx=-bw/2,by=-this.h/2-9;
      ctx.fillStyle='#200000';ctx.fillRect(bx,by,bw,5);
      ctx.fillStyle='#e74c3c';ctx.fillRect(bx,by,bw*(this.hp/this.maxHp),5);
    }
    ctx.restore();
  }
}

/* ──────────────────────────────────────────────────────────
   ENEMY CONFIGS
────────────────────────────────────────────────────────── */
const ENEMY_DEFS = {
  huskWalker:{ name:'Husk Walker',hp:35,speed:65,damage:10,souls:5,color:'#5a4030',w:26,h:26,atkRange:32,detectRange:190 },
  lostSoul:  { name:'Lost Soul',  hp:20,speed:115,damage:6,souls:3,color:'#3a2858',w:22,h:22,atkRange:26,detectRange:220 },
  soulBat:   { name:'Soul Bat',   hp:14,speed:145,damage:4,souls:2,color:'#1a1230',w:18,h:18,atkRange:22,detectRange:250 },
};

/* ──────────────────────────────────────────────────────────
   BOSS BASE
────────────────────────────────────────────────────────── */
class Boss extends Enemy {
  constructor(x,y,cfg){
    super(x,y,cfg);
    this.isBoss=true;
    this.phase=0;
    this.phaseTriggers=cfg.phaseTriggers||[0.65,0.35];
    this.specialCd=cfg.specialCd||3500;
    this.specialTimer=this.specialCd;
    this.phaseNames=cfg.phaseNames||['Phase I','Phase II','Phase III'];
  }
  get phaseName(){return this.phaseNames[this.phase]||'Phase I';}

  update(dt,player,world){
    const result=super.update(dt,player,world);
    if(this.state==='dying'||this.state==='dead')return result;
    /* Phase check */
    const r=this.hp/this.maxHp;
    if(this.phase===0&&r<this.phaseTriggers[0]){this.phase=1;this._onPhase(1);}
    else if(this.phase===1&&r<this.phaseTriggers[1]){this.phase=2;this._onPhase(2);}
    /* Special */
    this.specialTimer-=dt;
    if(this.specialTimer<=0){this.specialTimer=this.specialCd;return this._special(player)||result;}
    return result;
  }
  _onPhase(p){this.speed+=18;this.damage+=5;}
  _special(player){return null;}
}

/* ──────────────────────────────────────────────────────────
   GATEKEEPER
────────────────────────────────────────────────────────── */
class Gatekeeper extends Boss {
  constructor(x,y){
    super(x,y,{
      name:'The Gatekeeper',hp:300,speed:55,damage:20,souls:80,
      color:'#3a1010',w:58,h:58,atkRange:56,detectRange:340,
      specialCd:3800,phaseTriggers:[0.65,0.35],
      phaseNames:['Phase I — Axe Strikes','Phase II — Ground Slam','Phase III — Enraged'],
    });
  }
  _onPhase(p){
    super._onPhase(p);
    if(p===2){this.atkCd=0;this.speed+=15;}
  }
  _special(player){
    if(this.phase===0)return null;
    const radius=this.phase===1?85:115;
    return{type:'groundSlam',x:this.x,y:this.y,radius,damage:this.phase===1?22:30};
  }
  draw(ctx,cx,cy){
    if(this.state==='dead')return;
    const sx=this.x-cx,sy=this.y-cy;
    ctx.save();ctx.translate(sx,sy);
    ctx.globalAlpha=this.state==='dying'?this.dyingT/380:1;
    /* Glow */
    const grd=ctx.createRadialGradient(0,0,0,0,0,55);
    grd.addColorStop(0,'rgba(200,30,0,0.18)');grd.addColorStop(1,'rgba(200,30,0,0)');
    ctx.fillStyle=grd;ctx.beginPath();ctx.arc(0,0,55,0,Math.PI*2);ctx.fill();
    /* Body */
    ctx.fillStyle=this.hitFlash>0?'#fff':'#3a1010';
    ctx.fillRect(-this.w/2,-this.h/2,this.w,this.h);
    /* Armor plates */
    ctx.fillStyle='#1a0808';
    ctx.fillRect(-this.w/2,-this.h/2,this.w,14);
    ctx.fillRect(-this.w/2,this.h/2-14,this.w,14);
    /* Axe */
    ctx.fillStyle='#666';ctx.fillRect(this.w/2-4,-this.h/2,8,this.h);
    ctx.fillStyle='#c0392b';
    ctx.fillRect(this.w/2,   -this.h/2,20,22);
    ctx.fillRect(this.w/2,    this.h/2-22,20,22);
    /* Eyes */
    ctx.fillStyle=this.phase>=2?'#ff2200':'#ff8800';
    ctx.fillRect(-10,-8,8,8);ctx.fillRect(2,-8,8,8);
    /* HP bar */
    const bw=this.w+24,bx=-bw/2,by=-this.h/2-16;
    ctx.fillStyle='#120000';ctx.fillRect(bx,by,bw,7);
    ctx.fillStyle='#c0392b';ctx.fillRect(bx,by,bw*(this.hp/this.maxHp),7);
    ctx.restore();
  }
}

/* ──────────────────────────────────────────────────────────
   TUTORIAL BOSS
────────────────────────────────────────────────────────── */
class TutorialBoss extends Enemy {
  constructor(x,y){
    super(x,y,{
      name:'Hollow Warden',hp:80,speed:50,damage:8,souls:0,
      color:'#3a3028',w:40,h:40,atkRange:44,detectRange:260,
    });
  }
}

/* ──────────────────────────────────────────────────────────
   PARTICLES
────────────────────────────────────────────────────────── */
class Particle{
  constructor(x,y,cfg){
    this.x=x;this.y=y;
    this.vx=cfg.vx||0;this.vy=cfg.vy||0;
    this.life=cfg.life||500;this.maxLife=this.life;
    this.size=cfg.size||3;this.color=cfg.color||'#e67e22';
    this.gravity=cfg.gravity||0;
  }
  update(dt){const s=dt/1000;this.x+=this.vx*s;this.y+=this.vy*s;this.vy+=this.gravity*s;this.life-=dt;return this.life>0;}
  draw(ctx,cx,cy){
    ctx.globalAlpha=(this.life/this.maxLife)*0.9;
    ctx.fillStyle=this.color;
    ctx.beginPath();ctx.arc(this.x-cx,this.y-cy,this.size*(this.life/this.maxLife),0,Math.PI*2);ctx.fill();
  }
}

class Particles{
  constructor(){this.list=[];}
  add(x,y,cfg){this.list.push(new Particle(x,y,cfg));}
  burst(x,y,n,cfg){
    for(let i=0;i<n;i++){
      const a=Math.random()*Math.PI*2;
      const sp=U.rand(cfg.sMin||40,cfg.sMax||120);
      this.add(x,y,{vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,...cfg});
    }
  }
  blood(x,y,n=8){this.burst(x,y,n,{color:'#c0392b',size:3,life:450,sMin:50,sMax:130,gravity:220});}
  soulPop(x,y,n=10){
    this.burst(x,y,n,{color:'#e67e22',size:2,life:600,sMin:30,sMax:90});
    this.burst(x,y,4, {color:'#f39c12',size:2,life:800,sMin:15,sMax:50});
  }
  slash(x,y,angle,range){
    for(let i=0;i<7;i++){
      const a=angle+U.rand(-0.5,0.5);const r=U.rand(0,range);
      this.add(x+Math.cos(a)*r,y+Math.sin(a)*r,{vx:Math.cos(a)*25,vy:Math.sin(a)*25,color:'#e67e22',size:2,life:180});
    }
  }
  slam(x,y,r){
    this.burst(x,y,22,{color:'#c0392b',size:4,life:550,sMin:r*0.3,sMax:r*0.85,gravity:280});
    this.burst(x,y,10,{color:'#8B4513',size:3,life:350,sMin:15,sMax:55,gravity:380});
  }
  magic(x,y,n=10){this.burst(x,y,n,{color:'#9b59b6',size:3,life:500,sMin:40,sMax:100});}
  update(dt){this.list=this.list.filter(p=>p.update(dt));}
  draw(ctx,cx,cy){ctx.save();for(const p of this.list)p.draw(ctx,cx,cy);ctx.globalAlpha=1;ctx.restore();}
}

/* ──────────────────────────────────────────────────────────
   TILE MAP
────────────────────────────────────────────────────────── */
class TileMap{
  constructor(grid,colors){
    this.grid=grid;this.rows=grid.length;this.cols=grid[0].length;
    this.colors={floor:'#140e0e',wall:'#0a0606',accent:'#2a1a14',...colors};
    this.width=this.cols*TILE;this.height=this.rows*TILE;
  }
  at(c,r){if(r<0||r>=this.rows||c<0||c>=this.cols)return T.WALL;return this.grid[r][c];}
  walkable(c,r){const t=this.at(c,r);return t===T.FLOOR||t===T.DOOR||t===T.CHECKPOINT||t===T.EXIT;}
  collidesAt(cx,cy,w,h){
    const p=2,x1=cx-w/2+p,y1=cy-h/2+p,x2=cx+w/2-p,y2=cy+h/2-p;
    for(let r=Math.floor(y1/TILE);r<=Math.floor(y2/TILE);r++)
      for(let c=Math.floor(x1/TILE);c<=Math.floor(x2/TILE);c++)
        if(!this.walkable(c,r))return true;
    return false;
  }
  tileAtPx(wx,wy){return this.at(Math.floor(wx/TILE),Math.floor(wy/TILE));}

  draw(ctx,cx,cy,vw,vh){
    const c0=Math.max(0,Math.floor(cx/TILE));
    const r0=Math.max(0,Math.floor(cy/TILE));
    const c1=Math.min(this.cols,Math.ceil((cx+vw)/TILE));
    const r1=Math.min(this.rows,Math.ceil((cy+vh)/TILE));
    for(let r=r0;r<r1;r++)for(let c=c0;c<c1;c++)
      this._tile(ctx,this.grid[r][c],c*TILE-cx,r*TILE-cy);
  }
  _tile(ctx,t,x,y){
    switch(t){
      case T.FLOOR:
        ctx.fillStyle=this.colors.floor;ctx.fillRect(x,y,TILE,TILE);
        ctx.strokeStyle=this.colors.accent;ctx.lineWidth=0.5;ctx.strokeRect(x,y,TILE,TILE);
        break;
      case T.WALL:
        ctx.fillStyle=this.colors.wall;ctx.fillRect(x,y,TILE,TILE);
        ctx.fillStyle='rgba(255,255,255,0.03)';ctx.fillRect(x,y,TILE,2);
        ctx.fillStyle='rgba(0,0,0,0.25)';ctx.fillRect(x+TILE-4,y,4,TILE);ctx.fillRect(x,y+TILE-4,TILE,4);
        break;
      case T.DOOR:
        ctx.fillStyle='#2a1408';ctx.fillRect(x,y,TILE,TILE);
        ctx.fillStyle='#5a2e10';ctx.fillRect(x+8,y+4,TILE-16,TILE-8);
        ctx.fillStyle='#e67e22';ctx.beginPath();ctx.arc(x+TILE/2,y+TILE/2,4,0,Math.PI*2);ctx.fill();
        break;
      case T.CHECKPOINT:
        ctx.fillStyle=this.colors.floor;ctx.fillRect(x,y,TILE,TILE);
        ctx.fillStyle='rgba(230,126,34,0.18)';ctx.fillRect(x,y,TILE,TILE);
        ctx.strokeStyle='#e67e22';ctx.lineWidth=1;ctx.strokeRect(x+4,y+4,TILE-8,TILE-8);
        ctx.font='18px serif';ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.fillStyle='#e67e22';ctx.fillText('⚜',x+TILE/2,y+TILE/2);
        break;
      case T.EXIT:
        ctx.fillStyle='#100808';ctx.fillRect(x,y,TILE,TILE);
        ctx.strokeStyle='#c0392b';ctx.lineWidth=2;ctx.strokeRect(x+2,y+2,TILE-4,TILE-4);
        ctx.font='20px serif';ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.fillStyle='#c0392b';ctx.fillText('🚪',x+TILE/2,y+TILE/2);
        break;
      default:
        ctx.fillStyle='#050305';ctx.fillRect(x,y,TILE,TILE);
    }
  }
}

/* ──────────────────────────────────────────────────────────
   MAPS
────────────────────────────────────────────────────────── */
function makeTutorialMap(){
  const g=[
    [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2],
    [2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2],
    [2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2],
    [2,1,1,2,2,2,1,1,1,1,1,1,1,1,2,2,2,1,1,2],
    [2,1,1,2,2,2,1,1,1,1,1,1,1,1,2,2,2,1,1,2],
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
  return new TileMap(g,{floor:'#100c0c',wall:'#080505',accent:'#1e1010'});
}

function makeLayer1Map(){
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

function makeBossArena(){
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
  return new TileMap(g,{floor:'#120a0a',wall:'#080404',accent:'#221010'});
}

/* ──────────────────────────────────────────────────────────
   WORLD
────────────────────────────────────────────────────────── */
class World{
  constructor(){
    this.map=null;this.enemies=[];this.boss=null;
    this.bossDefeated=false;this.cleared=false;
    this.isBossArena=false;
  }
  loadTutorial(){
    this.map=makeTutorialMap();this.enemies=[];this.boss=null;
    this.isBossArena=false;this.cleared=false;
    this.boss=new TutorialBoss(19/2*TILE+TILE/2, 2*TILE+TILE/2);
  }
  loadLayer1(){
    this.map=makeLayer1Map();this.enemies=[];this.boss=null;
    this.isBossArena=false;this.cleared=false;this.bossDefeated=false;
    const pos=[
      {x:2,y:2},{x:3,y:3},{x:4,y:2},
      {x:8,y:2},{x:9,y:3},{x:10,y:2},
      {x:15,y:3},{x:16,y:4},
      {x:5,y:7},{x:10,y:8},{x:16,y:7},{x:22,y:8},
      {x:2,y:13},{x:3,y:14},{x:8,y:13},{x:16,y:13},{x:22,y:13},
    ];
    const types=['huskWalker','lostSoul','soulBat'];
    for(const p of pos)
      this.enemies.push(new Enemy(p.x*TILE+TILE/2,p.y*TILE+TILE/2,ENEMY_DEFS[U.choice(types)]));
  }
  loadBossArena(){
    this.map=makeBossArena();this.enemies=[];
    this.isBossArena=true;this.cleared=false;this.bossDefeated=false;
    this.boss=new Gatekeeper(10*TILE+TILE/2, 3*TILE+TILE/2);
  }
  collidesAt(x,y,w,h){return this.map?this.map.collidesAt(x,y,w,h):false;}
  tileAtPx(wx,wy){return this.map?this.map.tileAtPx(wx,wy):T.WALL;}

  update(dt,player,particles){
    const results=[];
    /* Enemies */
    for(const e of this.enemies){
      const r=e.update(dt,player,this);
      if(r?.type==='attack'){
        if(U.dist(e.x,e.y,player.x,player.y)<e.atkRange+10){
          const taken=player.takeDamage(r.damage);
          if(taken>0)particles.blood(player.x,player.y,5);
        }
      }
    }
    /* Boss */
    if(this.boss&&this.boss.alive){
      const r=this.boss.update(dt,player,this);
      if(r?.type==='attack'){
        if(U.dist(this.boss.x,this.boss.y,player.x,player.y)<this.boss.atkRange+12){
          const taken=player.takeDamage(r.damage);
          if(taken>0)particles.blood(player.x,player.y,8);
        }
      }
      if(r?.type==='groundSlam'){
        particles.slam(r.x,r.y,r.radius);
        if(U.dist(player.x,player.y,r.x,r.y)<r.radius){
          const taken=player.takeDamage(r.damage);
          if(taken>0)particles.blood(player.x,player.y,10);
        }
        results.push({type:'screenShake'});
      }
    }
    /* Dead enemies */
    const dead=this.enemies.filter(e=>!e.alive);
    for(const e of dead){
      particles.soulPop(e.x,e.y,10);
      const leveled=player.addSouls(e.souls);
      player.killCount++;
      if(leveled)results.push({type:'levelUp'});
    }
    this.enemies=this.enemies.filter(e=>e.alive);
    /* Dead boss */
    if(this.boss&&!this.boss.alive&&!this.bossDefeated){
      this.bossDefeated=true;
      particles.soulPop(this.boss.x,this.boss.y,30);
      const leveled=player.addSouls(this.boss.souls);
      player.killCount++;
      if(leveled)results.push({type:'levelUp'});
      results.push({type:'bossDefeated',bossName:this.boss.name});
    }
    /* Projectile hits */
    for(const p of player.projectiles){
      if(!p.alive)continue;
      const targets=[...this.enemies,...(this.boss&&this.boss.alive?[this.boss]:[])];
      for(const e of targets){
        if(U.dist(p.x,p.y,e.x,e.y)<e.w/2+p.r){
          const dmg=e.takeDamage(p.damage);
          if(dmg>0)particles.magic(p.x,p.y,6);
          p.alive=false;
          results.push({type:'dmgNumber',x:e.x,y:e.y,amount:dmg,kind:'dmg-magic'});
          break;
        }
      }
    }
    /* Cleared */
    if(!this.cleared&&this.enemies.length===0&&(!this.boss||this.bossDefeated))this.cleared=true;
    return results;
  }

  draw(ctx,cx,cy,vw,vh){
    this.map.draw(ctx,cx,cy,vw,vh);
    for(const e of this.enemies)e.draw(ctx,cx,cy);
    if(this.boss)this.boss.draw(ctx,cx,cy);
  }
}

/* ──────────────────────────────────────────────────────────
   CAMERA
────────────────────────────────────────────────────────── */
class Camera{
  constructor(){this.x=0;this.y=0;}
  follow(tx,ty,mw,mh,vw,vh){
    this.x=U.clamp(tx-vw/2,0,Math.max(0,mw-vw));
    this.y=U.clamp(ty-vh/2,0,Math.max(0,mh-vh));
  }
}

/* ──────────────────────────────────────────────────────────
   UI MANAGER
────────────────────────────────────────────────────────── */
class UI{
  constructor(){
    this.hpBar   =document.getElementById('hpBar');
    this.hpText  =document.getElementById('hpText');
    this.stBar   =document.getElementById('stBar');
    this.stText  =document.getElementById('stText');
    this.hudSouls=document.getElementById('hudSouls');
    this.hudLevel=document.getElementById('hudLevel');
    this.hudXpBar=document.getElementById('hudXpBar');
    this.hudWeapon=document.getElementById('hudWeapon');
    this.hudClass=document.getElementById('hudClass');
    this.layerRoman=document.getElementById('hudLayerRoman');
    this.layerName =document.getElementById('hudLayerName');
    this.atkCdEl   =document.getElementById('atkCd');
    this.dashCdEl  =document.getElementById('dashCd');
    this.specialCdEl=document.getElementById('specialCd');
    this.blockCdEl =document.getElementById('blockCd');
    this.slotAtk   =document.getElementById('slotAttack');
    this.slotDash  =document.getElementById('slotDash');
    this.slotSpec  =document.getElementById('slotSpecial');
    this.bossHud   =document.getElementById('bossHud');
    this.bossBar   =document.getElementById('bossBar');
    this.bossNameEl=document.getElementById('bossName');
    this.bossPhaseEl=document.getElementById('bossPhase');
    this.interactPrompt=document.getElementById('interactPrompt');
    this.interactAction=document.getElementById('interactAction');
    this.roomInfo  =document.getElementById('roomInfo');
    this.dmgLayer  =document.getElementById('damageLayer');
    this.gameScreen=document.getElementById('screen-game');
    this.wispDlg   =document.getElementById('wispDialogue');
    this.wispText  =document.getElementById('wispText');
    this._roomTimer=null;
  }

  update(player,world){
    /* HP */
    const hpPct=player.hp/player.maxHp;
    this.hpBar.style.width=(hpPct*100)+'%';
    this.hpText.textContent=`${Math.ceil(player.hp)}/${player.maxHp}`;
    this.gameScreen.classList.toggle('low-hp',hpPct<0.25);
    /* Stamina */
    const stPct=player.stamina/player.maxStamina;
    this.stBar.style.width=(stPct*100)+'%';
    this.stText.textContent=`${Math.floor(player.stamina)}/${player.maxStamina}`;
    /* Souls / Level */
    this.hudSouls.textContent=player.souls;
    this.hudLevel.textContent=player.level;
    const xpPct=player.soulsAccum/SOULS_PER_LEVEL;
    this.hudXpBar.style.width=(xpPct*100)+'%';
    /* Weapon */
    this.hudWeapon.textContent=player.weapon.name;
    this.hudClass.textContent=player.className.toUpperCase();
    /* Cooldowns */
    const fmtCd=ms=>ms>0?(ms/1000).toFixed(1)+'s':'';
    this.atkCdEl.textContent=fmtCd(Math.max(0,player.atkCd));
    this.dashCdEl.textContent=fmtCd(Math.max(0,player.dashCd));
    this.specialCdEl.textContent=fmtCd(Math.max(0,player.specialCd));
    this.slotAtk.classList.toggle('cooling',player.atkCd>0);
    this.slotDash.classList.toggle('cooling',player.dashCd>0);
    this.slotSpec.classList.toggle('cooling',player.specialCd>0);
    /* Boss HUD */
    if(world.boss&&world.boss.alive){
      this.bossHud.classList.remove('hidden');
      this.bossNameEl.textContent=world.boss.name;
      this.bossBar.style.width=(world.boss.hp/world.boss.maxHp*100)+'%';
      this.bossPhaseEl.textContent=world.boss.phaseName||'Phase I';
    } else {
      this.bossHud.classList.add('hidden');
    }
  }

  showInteract(action){
    this.interactAction.textContent=action;
    this.interactPrompt.classList.remove('hidden');
  }
  hideInteract(){this.interactPrompt.classList.add('hidden');}

  showRoomInfo(txt,dur=2600){
    this.roomInfo.textContent=txt;
    this.roomInfo.classList.remove('hidden');
    clearTimeout(this._roomTimer);
    this._roomTimer=setTimeout(()=>this.roomInfo.classList.add('hidden'),dur);
  }

  shake(){
    this.gameScreen.classList.remove('shaking');
    void this.gameScreen.offsetWidth;
    this.gameScreen.classList.add('shaking');
    setTimeout(()=>this.gameScreen.classList.remove('shaking'),400);
  }

  dmgNumber(x,y,amount,kind,cx,cy){
    const el=document.createElement('div');
    el.className=`dmg-num ${kind}`;
    el.textContent=kind==='dmg-soul'?`+${amount}💀`:kind==='dmg-crit'?`${amount}!!`:amount;
    el.style.left=(x-cx)+'px';
    el.style.top=(y-cy-18)+'px';
    this.dmgLayer.appendChild(el);
    el.addEventListener('animationend',()=>el.remove());
  }

  setLayer(roman,name){
    this.layerRoman.textContent=roman;
    this.layerName.textContent=name;
  }

  showWisp(text){
    this.wispText.textContent=text;
    this.wispDlg.classList.remove('hidden');
  }
  hideWisp(){this.wispDlg.classList.add('hidden');}

  buildSkillTree(player,onUpgrade){
    const grid=document.getElementById('skilltreeGrid');
    document.getElementById('stLevel').textContent=player.level;
    document.getElementById('stSouls').textContent=player.souls;
    document.getElementById('stPoints').textContent=player.skillPoints;
    grid.innerHTML='';
    for(const def of SKILL_DEFS){
      const lvl=player.skills[def.id];
      const canUp=player.skillPoints>=def.costPerLvl&&lvl<def.maxLvl;
      const card=document.createElement('div');
      card.className='skill-card';
      card.innerHTML=`
        <div class="skill-card-top">
          <span class="skill-card-icon">${def.icon}</span>
          <span class="skill-card-name">${def.name}</span>
          <span class="skill-card-level">${lvl}/${def.maxLvl}</span>
        </div>
        <div class="skill-card-bar-wrap"><div class="skill-card-bar" style="width:${(lvl/def.maxLvl)*100}%"></div></div>
        <div class="skill-card-desc">${def.desc}</div>
        <button class="skill-upgrade-btn" ${canUp?'':'disabled'}>Upgrade (${def.costPerLvl} pt)</button>
      `;
      if(canUp){
        card.querySelector('button').addEventListener('click',()=>{
          if(player.upgradeSkill(def.id)){onUpgrade();}
        });
      }
      grid.appendChild(card);
    }
  }

  showDeathScreen(cause,player){
    document.getElementById('deathCause').textContent=cause;
    document.getElementById('gameoverStats').innerHTML=
      `Souls: ${player.totalSouls} &nbsp;·&nbsp; Level: ${player.level}<br>
       Kills: ${player.killCount} &nbsp;·&nbsp; Dmg dealt: ${player.dmgDealt}`;
  }
  showVictoryScreen(player){
    document.getElementById('victoryStats').innerHTML=
      `Souls: ${player.totalSouls} &nbsp;·&nbsp; Level: ${player.level}<br>
       Kills: ${player.killCount} &nbsp;·&nbsp; Dmg dealt: ${player.dmgDealt}`;
  }
}

/* ──────────────────────────────────────────────────────────
   SCREEN MANAGER
────────────────────────────────────────────────────────── */
class Screens{
  constructor(){
    this.all=document.querySelectorAll('.screen');
    this.current=null;
  }
  show(id){
    this.all.forEach(s=>{
      if(s.id===id){s.classList.remove('hidden');s.classList.add('active');}
      else{s.classList.add('hidden');s.classList.remove('active');}
    });
    this.current=id;
  }
  showOverlay(id){
    const el=document.getElementById(id);
    if(el){el.classList.remove('hidden');el.classList.add('active');}
  }
  hideOverlay(id){
    const el=document.getElementById(id);
    if(el){el.classList.add('hidden');el.classList.remove('active');}
  }
}

/* ──────────────────────────────────────────────────────────
   TUTORIAL WISP CONTROLLER
────────────────────────────────────────────────────────── */
class WispTutorial{
  constructor(ui,onDone){
    this.ui=ui;this.onDone=onDone;this.step=0;
    this.lines=[
      "Welcome, warrior. I am a guide sent to prepare you for what lies below.",
      "Use W A S D to move through the darkness.",
      "Press SPACE to attack enemies with your weapon.",
      "Hold Q to block — it reduces damage but drains stamina.",
      "Press SHIFT to dash — quick bursts of speed. Watch your stamina bar.",
      "Press E to use your special ability once you unlock it.",
      "Every 5 souls you collect, you gain a level. Spend points in the Skill Tree.",
      "A hollow guardian stands before the gate. Defeat it to begin your descent.",
      "Good luck. You will need it."
    ];
    document.getElementById('wispNext').addEventListener('click',()=>this.next());
    this.ui.showWisp(this.lines[0]);
  }
  next(){
    this.step++;
    if(this.step>=this.lines.length){this.ui.hideWisp();this.onDone();return;}
    this.ui.showWisp(this.lines[this.step]);
  }
  get done(){return this.step>=this.lines.length;}
}

/* ──────────────────────────────────────────────────────────
   SETTINGS MANAGER
────────────────────────────────────────────────────────── */
class Settings{
  constructor(){
    this.brightness=100;this.volume=80;this.sfx=80;
    this.screenShake=true;this.particles=true;
    this._wire();
  }
  _wire(){
    const bSlider=document.getElementById('settingBrightness');
    const bVal   =document.getElementById('brightnessVal');
    bSlider?.addEventListener('input',()=>{
      this.brightness=+bSlider.value;
      bVal.textContent=this.brightness+'%';
      const ol=document.getElementById('brightnessOverlay');
      if(ol){
        if(this.brightness<100)ol.style.background=`rgba(0,0,0,${(100-this.brightness)/100*0.6})`;
        else if(this.brightness>100)ol.style.background=`rgba(255,200,100,${(this.brightness-100)/100*0.3})`;
        else ol.style.background='transparent';
      }
    });
    document.getElementById('settingVolume')?.addEventListener('input',e=>{
      this.volume=+e.target.value;
      document.getElementById('volumeVal').textContent=this.volume+'%';
    });
    document.getElementById('settingSFX')?.addEventListener('input',e=>{
      this.sfx=+e.target.value;
      document.getElementById('sfxVal').textContent=this.sfx+'%';
    });
    document.getElementById('toggleShake')?.addEventListener('click',e=>{
      this.screenShake=!this.screenShake;
      e.target.textContent=this.screenShake?'ON':'OFF';
      e.target.classList.toggle('active',this.screenShake);
    });
    document.getElementById('toggleParticles')?.addEventListener('click',e=>{
      this.particles=!this.particles;
      e.target.textContent=this.particles?'ON':'OFF';
      e.target.classList.toggle('active',this.particles);
    });
  }
}

/* ──────────────────────────────────────────────────────────
   MAIN GAME
────────────────────────────────────────────────────────── */
class Game{
  constructor(){
    this.canvas =document.getElementById('gameCanvas');
    this.ctx    =this.canvas.getContext('2d');
    this.input  =new Input();
    this.screens=new Screens();
    this.ui     =new UI();
    this.settings=new Settings();
    this.particles=new Particles();
    this.world  =new World();
    this.camera =new Camera();
    this.player =null;
    this.state  ='menu'; // menu|tutorial|playing|paused|skilltree|gameover|victory
    this.selectedClass=null;
    this.tutorialWisp=null;
    this.tutorialDone=false;
    this._victoryFlag=false;
    this._lastTime=0;

    this._wireButtons();
    this._wireResize();
    this._resize();
    requestAnimationFrame(t=>this._loop(t));
  }

  /* ── Button wiring ── */
  _wireButtons(){
    /* Main menu */
    document.getElementById('btnPlay').addEventListener('click',()=>this.screens.show('screen-classselect'));
    document.getElementById('btnMenuStory').addEventListener('click',()=>this.screens.show('screen-story'));
    document.getElementById('btnMenuHowTo').addEventListener('click',()=>this.screens.show('screen-howto'));
    document.getElementById('btnMenuSettings').addEventListener('click',()=>this.screens.show('screen-settings'));
    document.getElementById('btnMenuCredits').addEventListener('click',()=>this.screens.show('screen-credits'));
    /* Back buttons */
    ['btnStoryBack','btnHowToBack','btnSettingsBack','btnCreditsBack']
      .forEach(id=>document.getElementById(id)?.addEventListener('click',()=>this.screens.show('screen-menu')));
    /* Class select */
    document.querySelectorAll('.class-select-btn').forEach(btn=>{
      btn.addEventListener('click',()=>this._startGame(btn.dataset.class));
    });
    /* Pause */
    document.getElementById('btnResume').addEventListener('click',()=>this._resume());
    document.getElementById('btnPauseRestart').addEventListener('click',()=>{this.screens.hideOverlay('screen-pause');this._startGame(this.selectedClass);});
    document.getElementById('btnPauseMenu').addEventListener('click',()=>{this.screens.hideOverlay('screen-pause');this.screens.show('screen-menu');this.state='menu';});
    /* Skill tree */
    document.getElementById('btnSkillTreeClose').addEventListener('click',()=>this._closeSkillTree());
    /* Game over */
    document.getElementById('btnGORestart').addEventListener('click',()=>{this.screens.hideOverlay('screen-gameover');this._startGame(this.selectedClass);});
    document.getElementById('btnGOMenu').addEventListener('click',()=>{this.screens.hideOverlay('screen-gameover');this.screens.show('screen-menu');});
    /* Victory */
    document.getElementById('btnVictoryPlay').addEventListener('click',()=>{this.screens.hideOverlay('screen-victory');this._startGame(this.selectedClass);});
    document.getElementById('btnVictoryMenu').addEventListener('click',()=>{this.screens.hideOverlay('screen-victory');this.screens.show('screen-menu');});
  }

  _wireResize(){window.addEventListener('resize',()=>this._resize());}
  _resize(){this.canvas.width=window.innerWidth;this.canvas.height=window.innerHeight;}

  /* ── Start game ── */
  _startGame(classId){
    this.screens.hideOverlay('screen-pause');
    this.screens.hideOverlay('screen-gameover');
    this.screens.hideOverlay('screen-victory');
    this.screens.hideOverlay('screen-skilltree');
    this.screens.show('screen-game');
    this.selectedClass=classId;
    this.player=new Player(2*TILE+TILE/2, 7*TILE+TILE/2, classId);
    this.world=new World();
    this.particles=new Particles();
    this.camera=new Camera();
    this._victoryFlag=false;
    this.tutorialDone=false;

    /* Start in tutorial */
    this.world.loadTutorial();
    this.player.x=3*TILE+TILE/2;
    this.player.y=12*TILE+TILE/2;
    this.ui.setLayer('T','Tutorial — Hollow Gate');
    this.state='tutorial';

    /* Wisp dialogue */
    this.tutorialWisp=new WispTutorial(this.ui,()=>{
      this.tutorialDone=true;
      this.ui.showRoomInfo('⚔ Defeat the Hollow Warden!',3000);
    });
  }

  /* ── Tutorial complete → Layer 1 ── */
  _enterLayer1(){
    const wn=this.player.upgradeWeapon();
    this.world.loadLayer1();
    this.player.x=3*TILE+TILE/2;
    this.player.y=3*TILE+TILE/2;
    this.ui.setLayer('I','Gates of Despair');
    this.ui.showRoomInfo('Layer I — Gates of Despair',3500);
    if(wn)setTimeout(()=>this.ui.showRoomInfo(`Weapon acquired: ${wn}`,2500),3600);
    this.state='playing';
    this.ui.hideWisp();
  }

  /* ── Boss arena ── */
  _enterBossArena(){
    this.world.loadBossArena();
    this.player.x=10*TILE+TILE/2;
    this.player.y=13*TILE+TILE/2;
    this.ui.showRoomInfo('⚠ THE GATEKEEPER AWAKENS ⚠',4000);
    if(this.settings.screenShake)this.ui.shake();
  }

  /* ── Pause / Resume ── */
  _pause(){if(this.state!=='playing'&&this.state!=='tutorial')return;this._prevState=this.state;this.state='paused';this.screens.showOverlay('screen-pause');}
  _resume(){this.state=this._prevState||'playing';this.screens.hideOverlay('screen-pause');}

  /* ── Skill Tree ── */
  _openSkillTree(){
    this.state='skilltree';
    this.screens.showOverlay('screen-skilltree');
    this.ui.buildSkillTree(this.player,()=>this.ui.buildSkillTree(this.player,()=>{}));
  }
  _closeSkillTree(){
    this.screens.hideOverlay('screen-skilltree');
    this.state='playing';
    /* After skill tree from boss checkpoint — load boss */
    if(!this.world.isBossArena&&this.world.enemies.length===0){
      this._enterBossArena();
    }
  }

  /* ── Game over / Victory ── */
  _die(cause){
    this.state='gameover';
    this.ui.showDeathScreen(cause,this.player);
    this.screens.showOverlay('screen-gameover');
  }
  _victory(){
    this.state='victory';
    this.ui.showVictoryScreen(this.player);
    this.screens.showOverlay('screen-victory');
  }

  /* ── Loop ── */
  _loop(ts){
    const dt=Math.min(ts-this._lastTime,50);
    this._lastTime=ts;
    if(this.state==='playing'||this.state==='tutorial')this._update(dt);
    this._draw();
    requestAnimationFrame(t=>this._loop(t));
  }

  /* ── Update ── */
  _update(dt){
    const action=this.player.update(dt,this.input,this.world);

    if(action==='pause'){this._pause();this.input.flush();return;}

    /* Interact */
    if(action==='interact'){
      const tile=this.world.tileAtPx(this.player.x,this.player.y);
      if(tile===T.CHECKPOINT&&this.world.enemies.length===0&&!this.world.isBossArena){
        this._openSkillTree();this.input.flush();return;
      }
      if(tile===T.EXIT&&this.world.isBossArena&&this.world.bossDefeated){
        this._victory();this.input.flush();return;
      }
    }

    /* Attack */
    if(action==='attack'){
      const atk=this.player.getAttackData();
      if(atk.projectile){
        const proj=new Projectile(
          this.player.x+this.player.facing.x*30,
          this.player.y+this.player.facing.y*30,
          Math.atan2(this.player.facing.y,this.player.facing.x),
          atk.damage, this.player.weapon.color
        );
        this.player.projectiles.push(proj);
      } else {
        this.particles.slash(atk.x,atk.y,atk.angle,atk.range);
        this._resolveAtk(atk);
      }
    }

    /* Special */
    if(action==='special')this._doSpecial();

    /* World update */
    const events=this.world.update(dt,this.player,this.particles);
    for(const ev of events){
      if(ev.type==='screenShake'&&this.settings.screenShake)this.ui.shake();
      if(ev.type==='levelUp')this.ui.showRoomInfo(`Level Up! LV ${this.player.level} — +1 skill point`,2200);
      if(ev.type==='dmgNumber')this.ui.dmgNumber(ev.x,ev.y,ev.amount,ev.kind,this.camera.x,this.camera.y);
      if(ev.type==='bossDefeated'){
        const wn=this.player.upgradeWeapon();
        setTimeout(()=>{
          this.ui.showRoomInfo(wn?`${ev.bossName} defeated! Weapon: ${wn}`:`${ev.bossName} defeated!`,3500);
        },400);
      }
    }

    /* Particles */
    if(this.settings.particles)this.particles.update(dt);

    /* Camera */
    this.camera.follow(this.player.x,this.player.y,this.world.map.width,this.world.map.height,this.canvas.width,this.canvas.height);

    /* UI */
    this.ui.update(this.player,this.world);

    /* Interact prompt */
    const tile=this.world.tileAtPx(this.player.x,this.player.y);
    if(tile===T.CHECKPOINT&&this.world.enemies.length===0&&!this.world.isBossArena){
      this.ui.showInteract('open Skill Tree');
    } else if(tile===T.EXIT&&this.world.bossDefeated){
      this.ui.showInteract('descend deeper');
    } else {
      this.ui.hideInteract();
    }

    /* Tutorial: boss dead → exit door → layer 1 */
    if(this.state==='tutorial'&&this.world.bossDefeated&&!this._tutExitShown){
      this._tutExitShown=true;
      this.ui.showRoomInfo('The gate opens... Step through.',3000);
    }
    if(this.state==='tutorial'&&tile===T.EXIT&&this.world.bossDefeated){
      this._enterLayer1();
    }

    /* Death */
    if(this.player.hp<=0)this._die(`Slain in the ${this.world.isBossArena?'Boss Arena':'depths'}`);

    /* Victory flag */
    if(this.world.isBossArena&&this.world.bossDefeated&&tile===T.EXIT&&!this._victoryFlag){
      this._victoryFlag=true;this._victory();
    }

    this.input.flush();
  }

  /* ── Attack resolution ── */
  _resolveAtk(atk){
    const targets=[...this.world.enemies,...(this.world.boss&&this.world.boss.alive?[this.world.boss]:[])];
    for(const e of targets){
      if(U.dist(atk.x,atk.y,e.x,e.y)>atk.range+e.w/2)continue;
      const ea=U.angle(atk.x,atk.y,e.x,e.y);
      let diff=ea-atk.angle;
      while(diff>Math.PI)diff-=Math.PI*2;while(diff<-Math.PI)diff+=Math.PI*2;
      if(Math.abs(diff)>atk.arc/2)continue;
      const dmg=e.takeDamage(atk.damage);
      if(dmg>0){
        const ka=U.angle(this.player.x,this.player.y,e.x,e.y);
        e.knock(Math.cos(ka)*190,Math.sin(ka)*190);
        const kind=atk.isCrit?'dmg-crit':'dmg-enemy';
        this.ui.dmgNumber(e.x,e.y-20,atk.damage,kind,this.camera.x,this.camera.y);
        if(e.isBoss&&this.settings.screenShake)this.ui.shake();
        /* Stamina regen on hit */
        this.player.stamina=Math.min(this.player.maxStamina,this.player.stamina+5);
      }
    }
  }

  /* ── Special abilities ── */
  _doSpecial(){
    const sp=this.player.weapon.special;
    if(!sp)return;
    this.player.specialCd=this.player.weapon.specialCd||5000;
    const targets=[...this.world.enemies,...(this.world.boss&&this.world.boss.alive?[this.world.boss]:[])];

    if(sp==='groundSmash'||sp==='heavySlam'){
      /* Wide AOE */
      for(const e of targets){
        if(U.dist(this.player.x,this.player.y,e.x,e.y)<90){
          const dmg=Math.round((this.player.damage)*2);
          e.takeDamage(dmg);
          this.ui.dmgNumber(e.x,e.y-20,dmg,'dmg-crit',this.camera.x,this.camera.y);
        }
      }
      this.particles.slam(this.player.x,this.player.y,90);
      if(this.settings.screenShake)this.ui.shake();
    }

    if(sp==='shadowStrike'||sp==='dashStrike'||sp==='bladestorm'){
      this.player._dash();
      setTimeout(()=>{
        const ts2=[...this.world.enemies,...(this.world.boss&&this.world.boss.alive?[this.world.boss]:[])];
        for(const e of ts2){
          if(U.dist(this.player.x,this.player.y,e.x,e.y)<72){
            const dmg=Math.round(this.player.damage*1.8);
            e.takeDamage(dmg);
            this.ui.dmgNumber(e.x,e.y-20,dmg,'dmg-crit',this.camera.x,this.camera.y);
          }
        }
        this.particles.burst(this.player.x,this.player.y,14,{color:'#e74c3c',size:3,life:320,sMin:50,sMax:140});
      },180);
    }

    if(sp==='fireball'||sp==='arcaneBlast'||sp==='orbStorm'){
      /* Fire 3 projectiles in spread */
      const baseAngle=Math.atan2(this.player.facing.y,this.player.facing.x);
      for(let i=-1;i<=1;i++){
        const a=baseAngle+i*0.25;
        this.player.projectiles.push(new Projectile(
          this.player.x+this.player.facing.x*30,
          this.player.y+this.player.facing.y*30,
          a, this.player.magicDmg*1.5, '#9b59b6', 280, 2200
        ));
      }
      this.particles.magic(this.player.x,this.player.y,12);
    }

    if(sp==='spearThrow'){
      const proj=new Projectile(
        this.player.x+this.player.facing.x*30,
        this.player.y+this.player.facing.y*30,
        Math.atan2(this.player.facing.y,this.player.facing.x),
        this.player.damage*2.2,'#e74c3c',420,2800
      );
      this.player.projectiles.push(proj);
      this.particles.burst(this.player.x,this.player.y,8,{color:'#e67e22',size:3,life:300,sMin:40,sMax:100});
    }
  }

  /* ── Draw ── */
  _draw(){
    const ctx=this.ctx;
    const W=this.canvas.width,H=this.canvas.height;
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle='#050305';ctx.fillRect(0,0,W,H);
    if(!this.player||!this.world.map)return;
    const cx=this.camera.x,cy=this.camera.y;
    this.world.draw(ctx,cx,cy,W,H);
    if(this.settings.particles)this.particles.draw(ctx,cx,cy);
    this.player.draw(ctx,cx,cy);
    this._drawVignette(ctx,W,H);
  }

  _drawVignette(ctx,W,H){
    const g=ctx.createRadialGradient(W/2,H/2,H*0.28,W/2,H/2,H*0.8);
    g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,0.6)');
    ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  }
}

/* ──────────────────────────────────────────────────────────
   MENU EMBERS
────────────────────────────────────────────────────────── */
function spawnEmbers(){
  const c=document.getElementById('menuEmbers');
  if(!c)return;
  const colors=['#e67e22','#c0392b','#f39c12','#e74c3c'];
  for(let i=0;i<40;i++){
    const el=document.createElement('div');
    el.className='ember';
    el.style.left=Math.random()*100+'%';
    el.style.setProperty('--dur',U.rand(3.5,8)+'s');
    el.style.setProperty('--delay',U.rand(0,6)+'s');
    el.style.setProperty('--dx',(U.rand(-70,70))+'px');
    el.style.setProperty('--sz',(U.rand(2,5))+'px');
    el.style.setProperty('--col',U.choice(colors));
    c.appendChild(el);
  }
}

/* ──────────────────────────────────────────────────────────
   BOOT
────────────────────────────────────────────────────────── */
window.addEventListener('DOMContentLoaded',()=>{
  spawnEmbers();
  window.game=new Game();
});