'use strict';

import { U } from './constants.js';

/* ──────────────────────────────────────────────────────────
   INPUT
────────────────────────────────────────────────────────── */
export class Input {
  constructor() {
    this.down = {}; this.pressed = {};
    window.addEventListener('keydown', e => {
      if (!this.down[e.code]) this.pressed[e.code] = true;
      this.down[e.code] = true;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', e => { this.down[e.code] = false; });
  }
  isDown(c) { return !!this.down[c]; }
  isPressed(c) { const v = !!this.pressed[c]; this.pressed[c] = false; return v; }
  flush() { this.pressed = {}; }
  move() {
    let x = 0, y = 0;
    if (this.isDown('KeyA') || this.isDown('ArrowLeft')) x -= 1;
    if (this.isDown('KeyD') || this.isDown('ArrowRight')) x += 1;
    if (this.isDown('KeyW') || this.isDown('ArrowUp')) y -= 1;
    if (this.isDown('KeyS') || this.isDown('ArrowDown')) y += 1;
    const l = Math.hypot(x, y);
    return l > 0 ? { x: x / l, y: y / l } : { x: 0, y: 0 };
  }
}

/* ──────────────────────────────────────────────────────────
   PARTICLES
────────────────────────────────────────────────────────── */
export class Particle {
  constructor(x, y, cfg) {
    this.x = x; this.y = y;
    this.vx = cfg.vx || 0; this.vy = cfg.vy || 0;
    this.life = cfg.life || 500; this.maxLife = this.life;
    this.size = cfg.size || 3; this.color = cfg.color || '#e67e22';
    this.gravity = cfg.gravity || 0;
  }
  update(dt) { const s = dt / 1000; this.x += this.vx * s; this.y += this.vy * s; this.vy += this.gravity * s; this.life -= dt; return this.life > 0; }
  draw(ctx, cx, cy) {
    ctx.globalAlpha = (this.life / this.maxLife) * 0.9;
    ctx.fillStyle = this.color;
    ctx.beginPath(); ctx.arc(this.x - cx, this.y - cy, this.size * (this.life / this.maxLife), 0, Math.PI * 2); ctx.fill();
  }
}

export class Particles {
  constructor() { this.list = []; }
  add(x, y, cfg) { this.list.push(new Particle(x, y, cfg)); }
  burst(x, y, n, cfg) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = U.rand(cfg.sMin || 40, cfg.sMax || 120);
      this.add(x, y, { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, ...cfg });
    }
  }
  blood(x, y, n = 8) { this.burst(x, y, n, { color: '#c0392b', size: 3, life: 450, sMin: 50, sMax: 130, gravity: 220 }); }
  soulPop(x, y, n = 10) {
    this.burst(x, y, n, { color: '#e67e22', size: 2, life: 600, sMin: 30, sMax: 90 });
    this.burst(x, y, 4, { color: '#f39c12', size: 2, life: 800, sMin: 15, sMax: 50 });
  }
  slash(x, y, angle, range) {
    for (let i = 0; i < 7; i++) {
      const a = angle + U.rand(-0.5, 0.5); const r = U.rand(0, range);
      this.add(x + Math.cos(a) * r, y + Math.sin(a) * r, { vx: Math.cos(a) * 25, vy: Math.sin(a) * 25, color: '#e67e22', size: 2, life: 180 });
    }
  }
  slam(x, y, r) {
    this.burst(x, y, 22, { color: '#c0392b', size: 4, life: 550, sMin: r * 0.3, sMax: r * 0.85, gravity: 280 });
    this.burst(x, y, 10, { color: '#8B4513', size: 3, life: 350, sMin: 15, sMax: 55, gravity: 380 });
  }
  magic(x, y, n = 10) { this.burst(x, y, n, { color: '#9b59b6', size: 3, life: 500, sMin: 40, sMax: 100 }); }
  update(dt) { this.list = this.list.filter(p => p.update(dt)); }
  draw(ctx, cx, cy) { ctx.save(); for (const p of this.list) p.draw(ctx, cx, cy); ctx.globalAlpha = 1; ctx.restore(); }
}

/* ──────────────────────────────────────────────────────────
   MENU EMBERS
────────────────────────────────────────────────────────── */
export function spawnEmbers() {
  const c = document.getElementById('menuEmbers');
  if (!c) return;
  const colors = ['#e67e22', '#c0392b', '#f39c12', '#e74c3c'];
  for (let i = 0; i < 40; i++) {
    const el = document.createElement('div');
    el.className = 'ember';
    el.style.backgroundColor = U.choice(colors);
    el.style.left = U.rand(0, 100) + '%';
    el.style.width = U.rand(2, 6) + 'px';
    el.style.height = el.style.width;
    el.style.animationDelay = U.rand(0, 4) + 's';
    el.style.animationDuration = U.rand(3, 7) + 's';
    c.appendChild(el);
  }
}