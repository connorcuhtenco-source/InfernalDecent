'use strict';

import { Input, Particles, spawnEmbers } from './engine.js';
import { makeTutorialMap, makeLayer1Map } from './world.js';
import { Player, Enemy, Gatekeeper, TutorialBoss, ENEMY_DEFS } from './entities.js';

class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    
    this.input = new Input();
    this.particles = new Particles();
    
    // Base game state configuration settings 
    this.settings = { particles: true };
    this.camera = { x: 0, y: 0 };
    
    this.world = { map: null };
    this.player = null;
  }

  init() {
    // This hooks into your level maps and sets up drawing properties
    this.world.map = makeTutorialMap();
    this.player = new Player(100, 100, 'warrior');
    
    spawnEmbers();
  }

  draw(ctx, W, H) {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#050305'; ctx.fillRect(0, 0, W, H);
    if (!this.player || !this.world.map) return;
    const cx = this.camera.x, cy = this.camera.y;
    this.world.map.draw(ctx, cx, cy, W, H);
    if (this.settings.particles) this.particles.draw(ctx, cx, cy);
    this.player.draw(ctx, cx, cy);
    this._drawVignette(ctx, W, H);
  }

  _drawVignette(ctx, W, H) {
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.28, W / 2, H / 2, H * 0.8);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.6)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
}

// Instantiate and kick off the module environment
const game = new Game();
window.addEventListener('DOMContentLoaded', () => {
  game.init();
});