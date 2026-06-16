'use strict';
/* ═══════════════════════════════════════════════════════════
   INFERNAL DESCENT — script.js
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
      this.add(x,y,{
        vx:Math.cos(a)*sp,
        vy:Math.sin(a)*sp,
        life:U.rand(300,700),
        size:U.rand(1.5,4),
        color:cfg.color,
        gravity:cfg.gravity||0
      });
    }
  }
  update(dt){this.list=this.list.filter(p=>p.update(dt));}
  draw(ctx,cx,cy){for(const p of this.list)p.draw(ctx,cx,cy);}
}

/* ──────────────────────────────────────────────────────────
   CAMERA
────────────────────────────────────────────────────────── */
class Camera {
  constructor(){this.x=0;this.y=0;}
  follow(px,py,sw,sh,mw,mh){
    this.x=U.clamp(px-sw/2,0,mw-sw);
    this.y=U.clamp(py-sh/2,0,mh-sh);
  }
}

/* ──────────────────────────────────────────────────────────
   TILEMAP & WORLD
────────────────────────────────────────────────────────── */
class TileMap {
  constructor(grid,colors){
    this.grid=grid;
    this.h=grid.length;
    this.w=grid[0]?grid[0].length:0;
    this.colors=colors;
  }
  get pixelW(){return this.w*TILE;}
  get pixelH(){return this.h*TILE;}

  getTileAt(px,py){
    const tx=Math.floor(px/TILE),ty=Math.floor(py/TILE);
    if(tx<0||tx>=this.w||ty<0||ty>=this.h)return T.VOID;
    return this.grid[ty][tx];
  }
  setTileAt(px,py,val){
    const tx=Math.floor(px/TILE),ty=Math.floor(py/TILE);
    if(tx>=0&&tx<this.w&&ty>=0&&ty<this.h)this.grid[ty][tx]=val;
  }
  draw(ctx,cx,cy,sw,sh){
    const x0=Math.max(0,Math.floor(cx/TILE)),x1=Math.min(this.w,Math.ceil((cx+sw)/TILE));
    const y0=Math.max(0,Math.floor(cy/TILE)),y1=Math.min(this.h,Math.ceil((cy+sh)/TILE));
    for(let y=y0;y<y1;y++){
      for(let x=x0;x<x1;x++){
        const t=this.grid[y][x];
        if(t===T.VOID)continue;
        const sx=x*TILE-cx,sy=y*TILE-cy;
        if(t===T.FLOOR)ctx.fillStyle=this.colors.floor;
        else if(t===T.WALL)ctx.fillStyle=this.colors.wall;
        else if(t===T.DOOR)ctx.fillStyle='#7e57c2';
        else if(t===T.CHECKPOINT)ctx.fillStyle=this.colors.accent;
        else if(t===T.EXIT)ctx.fillStyle='#27ae60';
        ctx.fillRect(sx,sy,TILE,TILE);
        if(t===T.WALL){
          ctx.strokeStyle='rgba(255,255,255,0.03)';ctx.lineWidth=1;
          ctx.strokeRect(sx,sy,TILE,TILE);
        }
      }
    }
  }
}

class World {
  constructor(){
    this.map=null;
    this.enemies=[];
    this.boss=null;
    this.isBossArena=false;
    this.checkpointReached=false;
  }
  get width(){return this.map?this.map.pixelW:0;}
  get height(){return this.map?this.map.pixelH:0;}

  collidesAt(px,py,w,h){
    if(!this.map)return true;
    const l=px-w/2,r=px+w/2,t=py-h/2,b=py+h/2;
    const points=[{x:l,y:t},{x:r,y:t},{x:l,y:b},{x:r,y:b},{x:px,y:t},{x:px,y:b},{x:l,y:py},{x:r,y:py}];
    for(const p of points){
      const tile=this.map.getTileAt(p.x,p.y);
      if(tile===T.WALL||tile===T.VOID||tile===T.DOOR)return true;
    }
    return false;
  }

  loadTutorial(){
    this.isBossArena=false;this.boss=null;this.checkpointReached=false;
    this.map=makeTutorialMap();
    this.enemies=[new TutorialBoss(12*TILE+TILE/2,7*TILE+TILE/2)];
  }
  loadLayer1(){
    this.isBossArena=false;this.boss=null;this.checkpointReached=false;
    this.map=makeLayer1Map();
    this.enemies=[
      new Enemy(10*TILE,3*TILE,ENEMY_DEFS.huskWalker),
      new Enemy(16*TILE,2*TILE,ENEMY_DEFS.lostSoul),
      new Enemy(23*TILE,4*TILE,ENEMY_DEFS.soulBat),
      new Enemy(8*TILE,11*TILE,ENEMY_DEFS.huskWalker),
      new Enemy(12*TILE,14*TILE,ENEMY_DEFS.lostSoul),
      new Enemy(20*TILE,12*TILE,ENEMY_DEFS.soulBat),
    ];
  }
  loadBossArena(){
    this.isBossArena=true;this.enemies=[];this.checkpointReached=false;
    this.map=makeBossArena();
    this.boss=new Gatekeeper(10*TILE,6*TILE);
  }
  get bossDefeated(){return this.boss&&!this.boss.alive;}

  openDoors(){
    if(!this.map)return;
    for(let y=0;y<this.map.h;y++){
      for(let x=0;x<this.map.w;x++){
        if(this.map.grid[y][x]===T.DOOR)this.map.grid[y][x]=T.FLOOR;
      }
    }
  }
}

function makeTutorialMap(){
  const g=[
    [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2],
    [2,1,1,1,2,2,1,1,1,1,1,1,2,2,1,1,1,1,1,2],
    [2,1,1,1,2,2,1,1,1,1,1,1,2,2,1,1,1,1,1,2],
    [2,1,1,1,3,3,1,1,1,1,1,1,3,3,1,1,1,1,1,2],
    [2,1,1,1,2,2,1,1,1,1,1,1,2,2,1,1,1,1,1,2],
    [2,2,2,1,2,2,2,2,2,1,2,2,2,2,2,2,1,2,2,2],
    [2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2],
    [2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2],
    [2,2,2,1,2,2,2,2,2,1,2,2,2,2,2,2,1,2,2,2],
    [2,1,1,1,2,2,1,1,1,1,1,1,2,2,1,1,1,1,1,2],
    [2,1,1,1,3,3,1,1,1,1,1,1,3,3,1,1,4,1,1,2],
    [2,1,1,1,2,2,1,1,1,1,1,1,2,2,1,1,1,1,1,2],
    [2,1,1,1,2,2,1,1,1,1,1,1,2,2,1,1,1,1,5,2],
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
    [2,1,1,2,2,1,1,1,1,1,1,1,1,1,1,2,2,1,1,2],
    [2,1,1,2,2,1,1,1,1,1,1,1,1,1,1,2,2,1,1,2],
    [2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2],
    [2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2],
    [2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2],
    [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2],
  ];
  return new TileMap(g,{floor:'#1c0c0c',wall:'#0e0505',accent:'#3a1010'});
}

/* ──────────────────────────────────────────────────────────
   USER INTERFACE / HUD MANAGER
────────────────────────────────────────────────────────── */
class UI {
  constructor(){
    this.hpBar=document.getElementById('hpBar');
    this.staminaBar=document.getElementById('staminaBar');
    this.soulCount=document.getElementById('soulCount');
    this.levelDisplay=document.getElementById('levelDisplay');
    this.roomInfo=document.getElementById('roomInfo');
    this.interactPrompt=document.getElementById('interactPrompt');
    this.interactAction=document.getElementById('interactAction');
    this.wispDlg=document.getElementById('wispDialogue');
    this.wispText=document.getElementById('wispText');
    this.layerRoman=document.getElementById('layerRoman');
    this.layerName=document.getElementById('layerName');
    this.bossHud=document.getElementById('bossHud');
    this.bossBar=document.getElementById('bossBar');
    this.bossPhase=document.getElementById('bossPhase');
    this.gameScreen=document.getElementById('screen-game');
    this.dmgLayer=document.getElementById('damageNumbersLayer');
  }

  update(player,world){
    this.hpBar.style.width=`${(player.hp/player.maxHp)*100}%`;
    this.staminaBar.style.width=`${(player.stamina/player.maxStamina)*100}%`;
    this.soulCount.textContent=player.souls;
    this.levelDisplay.textContent=player.level;

    /* CD labels */
    document.getElementById('dashCd').textContent=player.dashCd>0?Math.ceil(player.dashCd/1000):'';
    document.getElementById('specialCd').textContent=player.specialCd>0?Math.ceil(player.specialCd/1000):'';

    const tile=world.map?world.map.getTileAt(player.x,player.y):T.VOID;
    if(tile===T.CHECKPOINT && !world.checkpointReached){
      this.showInteract('rest at checkpoint');
    } else if(tile===T.EXIT){
      this.showInteract(world.isBossArena?'escape inferno':'descend deeper');
    } else {
      this.hideInteract();
    }

    if(world.isBossArena && world.boss && world.boss.alive){
      this.bossHud.classList.remove('hidden');
      this.bossBar.style.width=`${(world.boss.hp/world.boss.maxHp)*100}%`;
      this.bossPhase.textContent=world.boss.phaseName;
    } else {
      this.bossHud.classList.add('hidden');
    }
  }

  showRoomInfo(txt,duration=3000){
    this.roomInfo.textContent=txt;this.roomInfo.classList.remove('hidden');
    if(this._riTimeout)clearTimeout(this._riTimeout);
    this._riTimeout=setTimeout(()=>this.roomInfo.classList.add('hidden'),duration);
  }
  showInteract(act){this.interactAction.textContent=act;this.interactPrompt.classList.remove('hidden');}
  hideInteract(){this.interactPrompt.classList.add('hidden');}

  screenShake(){
    this.gameScreen.classList.remove('shaking');
    void this.gameScreen.offsetWidth;
    this.gameScreen.classList.add('shaking');
    setTimeout(()=>this.gameScreen.classList.remove('shaking'),400);
  }
  dmgNumber(x,y,amount,kind,cx,cy){
    const el=document.createElement('div');
    el.className=`dmg-num ${kind}`;
    el.textContent=kind==='dmg-soul'?`+${amount}💀`:kind==='dmg-crit'?`${amount}!!`:amount;
    el.style.left=(x-cx)+'px';el.style.top=(y-cy-18)+'px';
    this.dmgLayer.appendChild(el);
    el.addEventListener('animationend',()=>el.remove());
  }
  setLayer(roman,name){this.layerRoman.textContent=roman;this.layerName.textContent=name;}
  showWisp(text){this.wispText.textContent=text;this.wispDlg.classList.remove('hidden');}
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
  constructor(){this.all=document.querySelectorAll('.screen');this.current=null;}
  show(id){
    this.all.forEach(s=>{
      if(s.id===id){s.classList.remove('hidden');s.classList.add('active');}
      else{s.classList.add('hidden');s.classList.remove('active');}
    });
    this.current=id;
  }
  showOverlay(id){const el=document.getElementById(id);if(el){el.classList.remove('hidden');el.classList.add('active');}}
  hideOverlay(id){const el=document.getElementById(id);if(el){el.classList.add('hidden');el.classList.remove('active');}}
}

/* ──────────────────────────────────────────────────────────
   TUTORIAL WISP CONTROLLER (FIXED)
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
    
    /* FIX: Reclone the button node to completely wipe stale event listeners on reset/new game instances */
    const oldBtn = document.getElementById('wispNext');
    const newBtn = oldBtn.cloneNode(true);
    oldBtn.parentNode.replaceChild(newBtn, oldBtn);

    newBtn.addEventListener('click',()=>this.next());
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
   CORE ENGINE GAME LOOP
────────────────────────────────────────────────────────── */
class Game {
  constructor(){
    this.canvas=document.getElementById('gameCanvas');
    this.ctx=this.canvas.getContext('2d');
    this.input=new Input();
    this.ui=new UI();
    this.screens=new Screens();

    this.state='menu';
    this.player=null;
    this.world=null;
    this.particles=null;
    this.camera=null;
    this.tutorialWisp=null;

    this._lastT=0;
    this._victoryFlag=false;
    this.selectedClass='warrior';
    this.tutorialDone=false;

    this._wireButtons();
    this._wireResize();
    this._resize();

    /* Init particles loop for menu */
    spawnEmbers();
    setInterval(spawnEmbers,2500);

    /* Start loop */
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
    this.player.x=3*TILE+TILE/2;this.player.y=12*TILE+TILE/2;
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
    this.player.x=3*TILE+TILE/2;this.player.y=3*TILE+TILE/2;
    this.ui.setLayer('I','Gates of Despair');
    this.ui.showRoomInfo('Layer I — Gates of Despair',3500);
    if(wn)setTimeout(()=>this.ui.showRoomInfo(`Weapon acquired: ${wn}`,2500),3600);
    this.state='playing';
    this.ui.hideWisp();
  }

  /* ── Boss arena ── */
  _enterBossArena(){
    this.world.loadBossArena();
    this.player.x=10*TILE;this.player.y=10*TILE;
    this.ui.setLayer('B','The Gatekeeper Arena');
    this.ui.showRoomInfo('WARNING: The Gatekeeper Appears!',4000);
    this.state='playing';
  }

  /* ── Rest / Checkpoint ── */
  _restAtCheckpoint(){
    this.world.checkpointReached=true;
    this.player.heal(this.player.maxHp);
    this.player.stamina=this.player.maxStamina;
    this.screens.showOverlay('screen-skilltree');
    this.ui.buildSkillTree(this.player,()=>this.ui.buildSkillTree(this.player,()=>this._closeSkillTree()));
    this.state='paused';
  }
  _closeSkillTree(){this.screens.hideOverlay('screen-skilltree');this.state='playing';}

  /* ── Game loops ── */
  _resume(){this.screens.hideOverlay('screen-pause');this.state=this.tutorialDone?'playing':'tutorial';}
  _pause(){this.screens.showOverlay('screen-pause');this.state='paused';}
  _gameover(cause){this.screens.showOverlay('screen-gameover');this.ui.showDeathScreen(cause,this.player);this.state='paused';}
  _victory(){this.screens.showOverlay('screen-victory');this.ui.showVictoryScreen(this.player);this.state='paused';}

  _loop(timestamp){
    if(!this._lastT)this._lastT=timestamp;
    let dt=timestamp-this._lastT;
    if(dt>100)dt=100; // Cap lag spikes
    this._lastT=timestamp;

    this._update(dt);
    this._draw();
    requestAnimationFrame(t=>this._loop(t));
  }

  _update(dt){
    if(this.state==='menu'||this.state==='paused')return;

    /* Core execution rules mapping */
    const action=this.player.update(dt,this.input,this.world);
    if(action==='pause'){this._pause();return;}

    if(action==='attack'){
      const atk=this.player.getAttackData();
      if(atk.projectile){
        this.player.projectiles.push(new Projectile(this.player.x,this.player.y,atk.angle,atk.damage,this.player.weapon.color));
      } else {
        this._resolveAtk(atk);
      }
    }
    if(action==='special' && this.player.weaponIdx>=1){
      /* Special ability resolution stub */
      this.player.specialCd=this.player.weapon.specialCd;
      this.ui.showRoomInfo(`Cast: ${this.player.weapon.special}!`,1500);
    }
    if(action==='interact'){
      const tile=this.world.map?this.world.map.getTileAt(this.player.x,this.player.y):T.VOID;
      if(tile===T.CHECKPOINT && !this.world.checkpointReached)this._restAtCheckpoint();
      else if(tile===T.EXIT){
        if(this.state==='tutorial')this._enterLayer1();
        else if(!this.world.isBossArena)this._enterBossArena();
      }
    }

    /* Particles update */
    this.particles.update(dt);

    /* Enemies resolution */
    if(!this.world.isBossArena && this.world.enemies.length===0 && this.state==='playing'){
      this.world.openDoors();
    }
    if(this.world.isBossArena && this.world.bossDefeated){
      this.world.openDoors();
    }

    for(let i=this.world.enemies.length-1;i>=0;i--){
      const e=this.world.enemies[i];
      const res=e.update(dt,this.player,this.world);
      if(!e.alive){
        this.player.killCount++;
        const leveled=this.player.addSouls(e.souls);
        this.ui.dmgNumber(e.x,e.y-35,e.souls,'dmg-soul',this.camera.x,this.camera.y);
        if(leveled)this.ui.showRoomInfo('LEVEL UP! Rest at checkpoints to spend points.',3500);
        this.world.enemies.splice(i,1);
        continue;
      }
      if(res && res.type==='attack'){
        const actualDmg=this.player.takeDamage(res.damage);
        if(actualDmg>0){
          this.ui.dmgNumber(this.player.x,this.player.y,'-'+actualDmg,'dmg-player',this.camera.x,this.camera.y);
          this.ui.screenShake();
        }
      }
    }

    /* Boss resolution loop */
    if(this.world.boss && this.world.boss.alive){
      const res=this.world.boss.update(dt,this.player,this.world);
      if(res && res.type==='attack'){
        const actualDmg=this.player.takeDamage(res.damage);
        if(actualDmg>0){
          this.ui.dmgNumber(this.player.x,this.player.y,'-'+actualDmg,'dmg-player',this.camera.x,this.camera.y);
          this.ui.screenShake();
        }
      } else if(res && res.type==='groundSlam'){
        if(U.dist(res.x,res.y,this.player.x,this.player.y)<res.radius){
          const actualDmg=this.player.takeDamage(res.damage);
          if(actualDmg>0){
            this.ui.dmgNumber(this.player.x,this.player.y,'-'+actualDmg,'dmg-player',this.camera.x,this.camera.y);
            this.ui.screenShake();
          }
        }
        this.particles.burst(res.x,res.y,25,{color:'#c0392b',sMin:60,sMax:220});
      }
      if(!this.world.boss.alive){
        this.player.addSouls(this.world.boss.souls);
        this.ui.dmgNumber(this.world.boss.x,this.world.boss.y-40,this.world.boss.souls,'dmg-soul',this.camera.x,this.camera.y);
        this.ui.showRoomInfo('THE GATEKEEPER DEFEATED! The exit path is open.',4000);
      }
    }

    /* Projectiles vs Enemies hits */
    for(const p of this.player.projectiles){
      if(!p.alive)continue;
      const targets=[...this.world.enemies,...(this.world.boss && this.world.boss.alive?[this.world.boss]:[])];
      for(const e of targets){
        if(U.aabb(p.x-p.r,p.y-p.r,p.r*2,p.r*2,e.left,e.top,e.w,e.h)){
          p.alive=false;
          const dmg=e.takeDamage(p.damage);
          if(dmg>0){
            const ka=Math.atan2(e.y-p.y,e.x-p.x);
            e.knock(Math.cos(ka)*140,Math.sin(ka)*140);
            this.ui.dmgNumber(e.x,e.y-20,p.damage,'dmg-magic',this.camera.x,this.camera.y);
          }
          break;
        }
      }
    }

    /* Death trigger check */
    if(this.player.hp<=0){
      this._gameover(this.world.isBossArena?`Slain by ${this.world.boss.name}`:`Slain in the depths`);
    }

    /* Victory flag exit check */
    const tile=this.world.map?this.world.map.getTileAt(this.player.x,this.player.y):T.VOID;
    if(this.world.isBossArena && this.world.bossDefeated && tile===T.EXIT && !this._victoryFlag){
      this._victoryFlag=true;this._victory();
    }

    this.input.flush();
    this.ui.update(this.player,this.world);
    this.camera.follow(this.player.x,this.player.y,this.canvas.width,this.canvas.height,this.world.width,this.world.height);
  }

  _draw(){
    const ctx=this.ctx,W=this.canvas.width,H=this.canvas.height;
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle='#050305';ctx.fillRect(0,0,W,H);
    if(this.state==='menu'||!this.player||!this.world.map)return;

    const cx=this.camera.x,cy=this.camera.y;
    this.world.draw(ctx,cx,cy,W,H);
    this.particles.draw(ctx,cx,cy);
    this.player.draw(ctx,cx,cy);

    for(const e of this.world.enemies)e.draw(ctx,cx,cy);
    if(this.world.boss)this.world.boss.draw(ctx,cx,cy);

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
  for(let i=0; i<40; i++){
    const el=document.createElement('div');
    el.className='ember';
    el.style.left=U.rand(0,100)+'%';
    el.style.top=U.rand(0,100)+'%';
    el.style.width=U.rand(2,6)+'px';
    el.style.height=el.style.width;
    el.style.background=U.choice(colors);
    el.style.setProperty('--tx',U.rand(-60,60)+'px');
    el.style.setProperty('--ty',U.rand(-120,-40)+'px');
    el.style.animation=`emberFloat ${U.rand(2,5)}s linear infinite`;
    c.appendChild(el);
    setTimeout(()=>el.remove(),5000);
  }
}

/* Run game instantiation on window lock load */
window.addEventListener('DOMContentLoaded', () => {
  window.gameEngine = new Game();
});