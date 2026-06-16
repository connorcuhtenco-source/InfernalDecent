'use strict';

import { Input, Particles, spawnEmbers } from './engine.js';
import { makeTutorialMap, makeLayer1Map } from './world.js';
import { Player, Enemy, Gatekeeper, TutorialBoss, ENEMY_DEFS } from './entities.js';

class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    if (this.canvas) {
      this.ctx = this.canvas.getContext('2d');
    }
    
    this.input = new Input();
    this.particles = new Particles();
    
    this.settings = { particles: true, difficulty: 'normal' };
    this.camera = { x: 0, y: 0 };
    
    this.world = { map: null };
    this.player = null;
    this.enemies = [];
    
    this.selectedClass = 'warrior';
    this.lastTime = 0;
    this.isRunning = false;
  }

  init() {
    // Start background main menu visuals
    spawnEmbers();
    
    // Wire up all structural menus directly using the precise HTML IDs
    this._setupMenuListeners();
  }

  _setupMenuListeners() {
    // --- MAIN MENU NAVIGATION ---
    this._bindBtn('btnPlay', () => this.switchScreen('classselect'));
    this._bindBtn('btnMenuStory', () => this.switchScreen('story'));
    this._bindBtn('btnMenuHowTo', () => this.switchScreen('howto'));
    this._bindBtn('btnMenuSettings', () => this.switchScreen('settings'));
    this._bindBtn('btnMenuCredits', () => this.switchScreen('credits'));
    
    // --- SUB-MENU BACK BUTTONS ---
    this._bindBtn('btnStoryBack', () => this.switchScreen('menu'));
    this._bindBtn('btnHowToBack', () => this.switchScreen('menu'));
    this._bindBtn('btnSettingsBack', () => this.switchScreen('menu'));
    this._bindBtn('btnCreditsBack', () => this.switchScreen('menu'));

    // --- CHARACTER CLASS SELECTION CARDS & BUTTONS ---
    const cards = document.querySelectorAll('.class-card');
    cards.forEach(card => {
      // Allow clicking the card wrapper to highlight it
      card.addEventListener('click', () => {
        cards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        this.selectedClass = card.dataset.class;
      });

      // Handle the button explicitly nested inside each card to boot the game
      const selectBtn = card.querySelector('.class-select-btn');
      if (selectBtn) {
        selectBtn.addEventListener('click', (e) => {
          e.stopPropagation(); // Stop parent wrapper double trigger clicks
          this.selectedClass = selectBtn.dataset.class;
          this.startGameJourney();
        });
      }
    });

    // --- PAUSE MENU ACTIONS ---
    this._bindBtn('btnResume', () => this.resumeGame());
    this._bindBtn('btnPauseRestart', () => this.startGameJourney());
    this._bindBtn('btnPauseMenu', () => this.switchScreen('menu'));

    // --- END GAME STATES ---
    this._bindBtn('btnGORestart', () => this.startGameJourney());
    this._bindBtn('btnGOMenu', () => this.switchScreen('menu'));
    this._bindBtn('btnVictoryPlay', () => this.startGameJourney());
    this._bindBtn('btnVictoryMenu', () => this.switchScreen('menu'));
  }

  _bindBtn(id, callback) {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('click', callback);
    } else {
      console.warn(`Menu binder tracking: Element with id "${id}" was not detected in your index.html layout template.`);
    }
  }

  switchScreen(screenId) {
    // Hide all menu views
    const screens = document.querySelectorAll('.screen');
    screens.forEach(s => s.classList.remove('active'));
    screens.forEach(s => s.classList.add('hidden'));
    
    // Show targeted frame screen wrapper
    const target = document.getElementById(`screen-${screenId}`);
    if (target) {
      target.classList.remove('hidden');
      target.classList.add('active');
    }
    
    // Pause runtime clocks if exiting main active match frame
    if (screenId !== 'game' && screenId !== 'pause' && screenId !== 'skilltree') {
      this.isRunning = false;
    }
  }

  resumeGame() {
    this.switchScreen('game');
    this.lastTime = performance.now();
    this.isRunning = true;
    requestAnimationFrame((t) => this.loop(t));
  }

  startGameJourney() {
    this.switchScreen('game');
    
    // Initialize standard runtime parameters
    this.world.map = makeTutorialMap();
    this.player = new Player(150, 150, this.selectedClass);
    this.enemies = [
      new TutorialBoss(400, 300)
    ];
    
    // Size viewport canvas dynamically
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    // Spin engine loop clock ticks
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
    if (dt > 100) dt = 16; 
    this.lastTime = timestamp;

    this.update(dt);
    this.draw(this.ctx, this.canvas.width, this.canvas.height);

    requestAnimationFrame((t) => this.loop(t));
  }

  update(dt) {
    if (!this.player) return;

    const action = this.player.update(dt, this.input, this.world.map);
    
    if (action === 'pause') {
      this.isRunning = false;
      this.switchScreen('pause');
      return;
    }
    
    // Smooth Camera Follow
    this.camera.x += ((this.player.x - this.canvas.width / 2) - this.camera.x) * 0.1;
    this.camera.y += ((this.player.y - this.canvas.height / 2) - this.camera.y) * 0.1;

    if (this.settings.particles) {
      this.particles.update(dt);
    }

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
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#050305'; 
    ctx.fillRect(0, 0, W, H);
    
    if (!this.player || !this.world.map) return;
    
    const cx = this.camera.x;
    const cy = this.camera.y;
    
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
    const hpBar = document.getElementById('hpBar');
    const stBar = document.getElementById('stBar');
    const hpText = document.getElementById('hpText');
    const stText = document.getElementById('stText');
    const hudSouls = document.getElementById('hudSouls');
    const hudLevel = document.getElementById('hudLevel');

    if (hpBar) hpBar.style.width = `${(this.player.hp / this.player.maxHp) * 100}%`;
    if (stBar) stBar.style.width = `${(this.player.stamina / this.player.maxStamina) * 100}%`;
    
    if (hpText) hpText.textContent = `${Math.ceil(this.player.hp)}/${this.player.maxHp}`;
    if (stText) stText.textContent = `${Math.ceil(this.player.stamina)}/${this.player.maxStamina}`;
    
    if (hudSouls) hudSouls.textContent = this.player.souls;
    if (hudLevel) hudLevel.textContent = this.player.level;
  }
}

// Global single initialization trigger hook
const game = new Game();
window.addEventListener('DOMContentLoaded', () => {
  game.init();
});