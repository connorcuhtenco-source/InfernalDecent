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
    
    this.settings = { particles: true, difficulty: 'normal' };
    this.camera = { x: 0, y: 0 };
    
    this.world = { map: null };
    this.player = null;
    this.enemies = [];
    
    this.currentScreen = 'menu';
    this.selectedClass = 'warrior';
    
    this.lastTime = 0;
    this.isRunning = false;
  }

  init() {
    // Start background visuals for the main menu screen
    spawnEmbers();
    this._setupMenuEventListeners();
  }

  // Wires up all button clicks from your index.html layout
  _setupMenuEventListeners() {
    // Navigation Core
    this._bindBtn('btnPlay', () => this.switchScreen('char-select'));
    this._bindBtn('btnMenuStory', () => this.switchScreen('story'));
    this._bindBtn('btnMenuHowTo', () => this.switchScreen('how-to'));
    this._bindBtn('btnMenuSettings', () => this.switchScreen('settings'));
    this._bindBtn('btnMenuCredits', () => this.switchScreen('credits'));
    
    // Back Buttons
    this._bindBtn('btnBackStory', () => this.switchScreen('menu'));
    this._bindBtn('btnBackHowTo', () => this.switchScreen('menu'));
    this._bindBtn('btnBackSettings', () => this.switchScreen('menu'));
    this._bindBtn('btnBackCredits', () => this.switchScreen('menu'));
    this._bindBtn('btnBackChar', () => this.switchScreen('menu'));

    // Character Selection Cards
    const cards = document.querySelectorAll('.char-card');
    cards.forEach(card => {
      card.addEventListener('click', () => {
        cards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        this.selectedClass = card.dataset.class;
      });
    });

    // Start Journey Action
    this._bindBtn('btnStartGame', () => {
      this.startGameJourney();
    });

    // Difficulty Selectors
    const diffBtns = document.querySelectorAll('.setting-row .btn');
    diffBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        diffBtns.forEach(b => b.classList.remove('btn-primary'));
        btn.classList.add('btn-primary');
        this.settings.difficulty = btn.textContent.trim().toLowerCase();
      });
    });
  }

  _bindBtn(id, callback) {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', callback);
  }

  switchScreen(screenId) {
    this.currentScreen = screenId;
    
    // Hide all game screens
    const screens = document.querySelectorAll('.screen');
    screens.forEach(s => s.classList.remove('active'));
    
    // Show targeted screen
    const target = document.getElementById(`screen-${screenId}`);
    if (target) target.classList.add('active');
    
    // Toggle HUD visibility visibility states
    const hud = document.getElementById('gameHud');
    if (screenId === 'game') {
      if (hud) hud.classList.remove('hidden');
    } else {
      if (hud) hud.classList.add('hidden');
      this.isRunning = false;
    }
  }

  startGameJourney() {
    this.switchScreen('game');
    
    // Build initial game values
    this.world.map = makeTutorialMap();
    this.player = new Player(150, 150, this.selectedClass);
    this.enemies = [
      new TutorialBoss(400, 300)
    ];
    
    // Resize rendering window canvas size context bounds
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    // Boot execution loop engine clock
    this.lastTime = performance.now();
    this.isRunning = true;
    requestAnimationFrame((t) => this.loop(t));
  }

  resizeCanvas() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  loop(timestamp) {
    if (!this.isRunning) return;
    
    let dt = timestamp - this.lastTime;
    if (dt > 100) dt = 16; // Prevent physics explosions on lag spikes
    this.lastTime = timestamp;

    this.update(dt);
    this.draw(this.ctx, this.canvas.width, this.canvas.height);

    requestAnimationFrame((t) => this.loop(t));
  }

  update(dt) {
    if (!this.player) return;

    // Process inputs, moves, actions
    const action = this.player.update(dt, this.input, this.world.map);
    
    // Smooth Camera Follow
    this.camera.x += ((this.player.x - this.canvas.width / 2) - this.camera.x) * 0.1;
    this.camera.y += ((this.player.y - this.canvas.height / 2) - this.camera.y) * 0.1;

    // Update particles environment
    if (this.settings.particles) {
      this.particles.update(dt);
    }

    // Process enemies array loops
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      enemy.update(dt, this.player, this.world.map);
      if (!enemy.alive) {
        this.player.addSouls(enemy.souls);
        this.enemies.splice(i, 1);
      }
    }
  }

  draw(ctx, W, H) {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#050305'; 
    ctx.fillRect(0, 0, W, H);
    
    if (!this.player || !this.world.map) return;
    
    const cx = this.camera.x;
    const cy = this.camera.y;
    
    // Draw assets layers
    this.world.map.draw(ctx, cx, cy, W, H);
    
    for (const enemy of this.enemies) {
      enemy.draw(ctx, cx, cy);
    }
    
    if (this.settings.particles) this.particles.draw(ctx, cx, cy);
    this.player.draw(ctx, cx, cy);
    
    this._drawVignette(ctx, W, H);
    this._updateHudDOM();
  }

  _drawVignette(ctx, W, H) {
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.28, W / 2, H / 2, H * 0.8);
    g.addColorStop(0, 'rgba(0,0,0,0)'); 
    g.addColorStop(1, 'rgba(0,0,0,0.6)');
    ctx.fillStyle = g; 
    ctx.fillRect(0, 0, W, H);
  }

  _updateHudDOM() {
    // Dynamic text link hook to synchronize visual status indicators
    const hpBar = document.getElementById('hpBar');
    const staminaBar = document.getElementById('staminaBar');
    const soulCount = document.getElementById('soulCount');
    const lvlIndicator = document.getElementById('txtLevel');

    if (hpBar) hpBar.style.width = `${(this.player.hp / this.maxHp) * 100}%`;
    if (staminaBar) staminaBar.style.width = `${(this.player.stamina / this.player.maxStamina) * 100}%`;
    if (soulCount) soulCount.textContent = this.player.souls;
    if (lvlIndicator) lvlIndicator.textContent = `Lvl ${this.player.level}`;
  }
}

// Global runtime instance startup execution triggers
const game = new Game();
window.addEventListener('DOMContentLoaded', () => {
  game.init();
});