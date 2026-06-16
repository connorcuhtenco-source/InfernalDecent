'use strict';

import { Input, Particles, spawnEmbers } from './engine.js';
import { TileMap } from './world.js'; // Fixed: Imported TileMap class instead of missing functions
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
    if (typeof spawnEmbers === 'function') {
      spawnEmbers();
    }
    
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
    screens.forEach(s => {
      s.classList.remove('active');
      s.classList.add('hidden');
    });

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
    console.log(`Starting journey as ${this.selectedClass}...`);
    this.switchScreen('game');
    
    // Fallback simple grid map generation if actual world layouts aren't fully configured
    const sampleGrid = [
      [2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
      [2, 1, 1, 1, 1, 1, 1, 1, 1, 2],
      [2, 1, 1, 1, 1, 1, 1, 1, 1, 2],
      [2, 1, 1, 4, 1, 1, 1, 1, 1, 2],
      [2, 1, 1, 1, 1, 1, 1, 1, 1, 2],
      [2, 2, 2, 2, 2, 2, 2, 2, 2, 2]
    ];
    this.world.map = new TileMap(sampleGrid, {});
    
    this.player = new Player(100, 100, this.selectedClass);
    this.enemies = [];
    this.lastTime = performance.now();
    this.isRunning = true;
    
    // Start game runtime safely if canvas and loop are defined
    if (this.canvas && typeof this.loop === 'function') {
      requestAnimationFrame((t) => this.loop(t));
    }
  }
}

// Automatically instantiate and run the module entry point on window load
window.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  game.init();
});