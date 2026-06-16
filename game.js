'use strict';

import { Input, Particles, spawnEmbers } from './engine.js';
import { TileMap } from './world.js'; 
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

    // Dialogue State Framework
    this.dialogueSequence = [
      "Follow me, warrior...",
      "This grey labyrinth is Layer I: The Gates of Despair.",
      "Mindless Husks wander these corridors. Destroy them to harvest their souls.",
      "Collect 5 souls to grow stronger and access your Skill Tree.",
      "Beware... The Gatekeeper bars the exit down below. Prepare yourself!"
    ];
    this.dialogueIndex = 0;
  }

  init() {
    if (typeof spawnEmbers === 'function') {
      try { spawnEmbers(); } catch(e) { console.warn(e); }
    }
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

    // --- CHARACTER CLASS SELECTION ---
    const cards = document.querySelectorAll('.class-card');
    cards.forEach(card => {
      card.addEventListener('click', () => {
        cards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        this.selectedClass = card.dataset.class;
      });

      const selectBtn = card.querySelector('.class-select-btn');
      if (selectBtn) {
        selectBtn.addEventListener('click', (e) => {
          e.stopPropagation(); 
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

    // --- FIXED: TUTORIAL DIALOGUE PROGRESSION ---
    this._bindBtn('wispNext', () => this.advanceDialogue());
  }

  _bindBtn(id, callback) {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('click', callback);
    } else {
      console.warn(`Menu binder tracking: Element with id "${id}" was not detected in HTML layout.`);
    }
  }

  switchScreen(screenId) {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(s => {
      s.classList.remove('active');
      s.classList.add('hidden');
    });
    
    const target = document.getElementById(`screen-${screenId}`);
    if (target) {
      target.classList.remove('hidden');
      target.classList.add('active');
    }
    
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
    
    // Fallback grid generation matching your world structural properties
    const sampleGrid = [
      [2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
      [2, 1, 1, 1, 1, 1, 1, 1, 1, 2],
      [2, 1, 1, 1, 1, 1, 1, 1, 1, 2],
      [2, 1, 1, 4, 1, 1, 1, 3, 1, 2],
      [2, 1, 1, 1, 1, 1, 1, 1, 1, 2],
      [2, 2, 2, 2, 2, 2, 2, 2, 2, 2]
    ];
    this.world.map = new TileMap(sampleGrid, {});
    
    this.player = new Player(150, 150, this.selectedClass);
    this.enemies = [];
    
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    // Trigger dialogue interaction presentation frame setup
    this.startTutorialDialogue();

    this.lastTime = performance.now();
    this.isRunning = true;
    requestAnimationFrame((t) => this.loop(t));
  }

  startTutorialDialogue() {
    this.dialogueIndex = 0;
    const wispBox = document.getElementById('wispDialogue');
    const wispTxt = document.getElementById('wispText');
    
    if (wispBox && wispTxt) {
      wispTxt.textContent = this.dialogueSequence[this.dialogueIndex];
      wispBox.classList.remove('hidden');
    }
  }

  advanceDialogue() {
    this.dialogueIndex++;
    const wispBox = document.getElementById('wispDialogue');
    const wispTxt = document.getElementById('wispText');

    if (!wispBox || !wispTxt) return;

    // Fixed: Ensure we check if we have surpassed the last valid index BEFORE attempting to display text
    if (this.dialogueIndex >= this.dialogueSequence.length) {
      wispBox.classList.add('hidden');
      wispBox.style.display = 'none'; // Hard force style clear in case CSS specificity is fighting classList
    } else {
      wispTxt.textContent = this.dialogueSequence[this.dialogueIndex];
    }
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
    if (this.ctx && this.canvas) {
      this.draw(this.ctx, this.canvas.width, this.canvas.height);
    }

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
    
    this.camera.x += ((this.player.x - this.canvas.width / 2) - this.camera.x) * 0.1;
    this.camera.y += ((this.player.y - this.canvas.height / 2) - this.camera.y) * 0.1;

    if (this.settings.particles && this.particles) {
      this.particles.update(dt);
    }
  }

  draw(ctx, W, H) {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#050305'; 
    ctx.fillRect(0, 0, W, H);
    
    if (!this.player || !this.world.map) return;
    
    const cx = this.camera.x;
    const cy = this.camera.y;
    
    this.world.map.draw(ctx, cx, cy, W, H);
    if (this.settings.particles && this.particles) {
      this.particles.draw(ctx, cx, cy);
    }
    this.player.draw(ctx, cx, cy);
    
    this._updateHudDOM();
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

// Global script load configuration 
window.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  game.init();
});