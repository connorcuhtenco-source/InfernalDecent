'use strict';

import { Input, Particles, spawnEmbers } from './engine.js';
import { TileMap, makeTutorialMap, makeLayer1Map } from './world.js'; 
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

    // --- TUTORIAL DIALOGUE PROGRESSION ---
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
    
    // 1. Force absolute fallback canvas dimensions immediately
    if (this.canvas) {
      this.canvas.width = window.innerWidth || 800;
      this.canvas.height = window.innerHeight || 600;
    }

    const sampleGrid = [
      [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
      [2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2],
      [2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2],
      [2, 1, 1, 4, 1, 1, 1, 5, 1, 1, 1, 1, 1, 1, 2],
      [2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2],
      [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2]
    ];
    
    // Explicitly fallback to a default tileSize configuration
    this.world.map = new TileMap(sampleGrid, { tileSize: 64 });
    this.player = new Player(150, 150, this.selectedClass);
    
    // Ensure initial camera position starts matching player coordinates instead of 0,0
    this.camera.x = this.player.x - (this.canvas ? this.canvas.width / 2 : 400);
    this.camera.y = this.player.y - (this.canvas ? this.canvas.height / 2 : 300);

    this.enemies = [
      new Enemy(300, 200, ENEMY_DEFS ? ENEMY_DEFS.husk : 'husk'),
      new Enemy(500, 250, ENEMY_DEFS ? ENEMY_DEFS.husk : 'husk'),
      new Gatekeeper(700, 300)
    ];
    
    window.addEventListener('resize', () => this.resizeCanvas());
    this.startTutorialDialogue();

    this.lastTime = performance.now();
    this.isRunning = true;
    requestAnimationFrame((t) => this.loop(t));
  }

  resizeCanvas() {
    if (!this.canvas) return;
    // Fallback safeguard preventing 0 width/height updates
    this.canvas.width = window.innerWidth || 800;
    this.canvas.height = window.innerHeight || 600;
  }

  draw(ctx, W, H) {
    // Prevent rendering entirely if critical entities aren't loaded yet
    if (!this.player || !this.world.map) return;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#1a1625'; 
    ctx.fillRect(0, 0, W, H);
    
    // Safe-check camera calculations against NaN anomalies
    const cx = isNaN(this.camera.x) ? 0 : this.camera.x;
    const cy = isNaN(this.camera.y) ? 0 : this.camera.y;
    
    this.world.map.draw(ctx, cx, cy, W, H);
    
    if (this.settings.particles && this.particles) {
      this.particles.draw(ctx, cx, cy);
    }

    if (this.enemies) {
      this.enemies.forEach(enemy => {
        if (typeof enemy.draw === 'function') enemy.draw(ctx, cx, cy);
      });
    }

    this.player.draw(ctx, cx, cy);
    this._updateHudDOM();
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

    if (this.dialogueIndex >= this.dialogueSequence.length) {
      wispBox.classList.add('hidden');
      wispBox.style.display = 'none'; 
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

    // LINKED PROGRESSION LAYER: Evaluates if the player's coordinate step lands on an exit tile (value 5)
    const currentTile = this.world.map.tileAtPx(this.player.x, this.player.y);
    if (currentTile === 5) { 
       this.advanceToLayer1();
    }
    
    this.camera.x += ((this.player.x - this.canvas.width / 2) - this.camera.x) * 0.1;
    this.camera.y += ((this.player.y - this.canvas.height / 2) - this.camera.y) * 0.1;

    if (this.settings.particles && this.particles) {
      this.particles.update(dt);
    }
  }

  advanceToLayer1() {
    // 1. Swap the map over to Layer 1
    this.world.map = makeLayer1Map();
    
    // 2. Clear out old enemies
    this.enemies = []; 
    
    // 3. Dynamic Spawn Finder: Scan the new map grid to find a safe floor tile (1)
    let spawnTileX = 1;
    let spawnTileY = 1;
    let foundSpawn = false;
    
    const grid = this.world.map.grid;
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        if (grid[r][c] === 1) { // 1 is your T.FLOOR constant
          spawnTileX = c;
          spawnTileY = r;
          foundSpawn = true;
          break;
        }
      }
      if (foundSpawn) break;
    }
    
    // 4. Calculate coordinates using the actual map width/columns to find your exact TILE size
    // This dynamically calculates the tile size so it works whether your tiles are 32px, 48px, or 64px!
    const calculatedTileSize = this.world.map.width / this.world.map.cols;
    
    // 5. Center the player perfectly inside that open tile
    this.player.x = (spawnTileX * calculatedTileSize) + (calculatedTileSize / 2);
    this.player.y = (spawnTileY * calculatedTileSize) + (calculatedTileSize / 2);
    
    // 6. Snap the camera over to the player so there is no boundary-glitching scroll lag
    this.camera.x = this.player.x - this.canvas.width / 2;
    this.camera.y = this.player.y - this.canvas.height / 2;
    
    console.log(`Spawned safely at Tile Column: ${spawnTileX}, Row: ${spawnTileY} (Px: ${this.player.x}, ${this.player.y})`);
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