'use strict';

import { Input, Particles, spawnEmbers } from './engine.js';
import { TileMap, makeTutorialMap, makeLayer1Map } from './world.js'; 
import { Player, Enemy, Gatekeeper, TutorialBoss, ENEMY_DEFS } from './entities.js';
import { T, TILE } from './constants.js';

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
        cards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
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
    // --- SKILL TREE CLOSE ---
    this._bindBtn('btnSkillTreeClose', () => {
      this.switchScreen('game');
      this.lastTime = performance.now();
      this.isRunning = true;
      requestAnimationFrame((t) => this.loop(t));
    });
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

    // Use the authored tutorial map which contains a checkpoint and exit
    this.world.map = makeTutorialMap();

    // Find a safe spawn tile (prefer checkpoint tiles)
    const grid = this.world.map.grid;
    let spawnC = 0, spawnR = 0, found = false;
    for (let r = 0; r < grid.length && !found; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        if (grid[r][c] === T.CHECKPOINT) { spawnC = c; spawnR = r; found = true; break; }
      }
    }
    if (!found) {
      for (let r = 0; r < grid.length && !found; r++) {
        for (let c = 0; c < grid[r].length; c++) {
          if (grid[r][c] === T.FLOOR) { spawnC = c; spawnR = r; found = true; break; }
        }
      }
    }

    this.player = new Player(spawnC * TILE + TILE / 2, spawnR * TILE + TILE / 2, this.selectedClass);

    // Ensure initial camera position starts matching player coordinates
    this.camera.x = this.player.x - (this.canvas ? this.canvas.width / 2 : 400);
    this.camera.y = this.player.y - (this.canvas ? this.canvas.height / 2 : 300);

    // Spawn a few enemies on valid floor tiles, avoiding too-close tiles
    const enemyPositions = [];
    for (let r = 0; r < grid.length && enemyPositions.length < 4; r++) {
      for (let c = 0; c < grid[r].length && enemyPositions.length < 4; c++) {
        if (grid[r][c] === T.FLOOR) {
          const ex = c * TILE + TILE / 2, ey = r * TILE + TILE / 2;
          const dist = Math.hypot(ex - this.player.x, ey - this.player.y);
          if (dist > TILE * 2) enemyPositions.push({ x: ex, y: ey });
        }
      }
    }
    this.enemies = enemyPositions.map((p, i) => new Enemy(p.x, p.y, ENEMY_DEFS.huskWalker));
    // Add the gatekeeper deeper in the level (only if map is large enough)
    if (this.world.map.cols > 10) {
      this.enemies.push(new Gatekeeper((this.world.map.cols - 3) * TILE + TILE / 2, (this.world.map.rows - 3) * TILE + TILE / 2));
    }
    this.initialEnemyCount = this.enemies.length;
    
    window.addEventListener('resize', () => this.resizeCanvas());
    this.startTutorialDialogue();

    // Clean stray overlay elements (empty DIVs that might show as boxes)
    if (typeof this._cleanUiOverlays === 'function') this._cleanUiOverlays();

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

    // Handle player interaction (skill tree / descend)
    if (action === 'interact') {
      const tile = this.world.map.tileAtPx(this.player.x, this.player.y);
      // CHECKPOINT opens skill tree
      if (tile === 4) {
        this.switchScreen('skilltree');
        this.isRunning = false;
        return;
      }
      // EXIT descends to next layer
      if (tile === T.EXIT) {
        const alive = (this.enemies || []).filter(e => e.alive).length;
        const allowed = Math.max(0, Math.ceil((this.initialEnemyCount || this.enemies.length) * 0.1));
        if (alive <= allowed) {
          this.advanceToLayer1();
          const ip = document.getElementById('interactPrompt');
          if (ip) ip.classList.add('hidden');
        }
      }
    }

    // Handle player attack (apply damage to enemies in arc/range)
    if (action === 'attack') {
      const atk = this.player.getAttackData();
      const normalize = (ang) => {
        while (ang <= -Math.PI) ang += Math.PI * 2;
        while (ang > Math.PI) ang -= Math.PI * 2;
        return ang;
      };
      for (const enemy of this.enemies) {
        if (!enemy.alive) continue;
        const dx = enemy.x - atk.x; const dy = enemy.y - atk.y;
        const d = Math.hypot(dx, dy);
        if (d <= (atk.range + (enemy.w || 16))) {
          const aToE = Math.atan2(dy, dx);
          const da = Math.abs(normalize(aToE - atk.angle));
          if (da <= (atk.arc / 2) || atk.projectile) {
            const dealt = enemy.takeDamage(atk.damage);
            if (dealt > 0 && this.particles) this.particles.blood(enemy.x, enemy.y, 6);
            enemy.knock(this.player.facing.x * 120, this.player.facing.y * 120);
          }
        }
      }
    }

    // LINKED PROGRESSION LAYER: Show interact prompt on exits and gate progress requirements
    const currentTile = this.world.map.tileAtPx(this.player.x, this.player.y);
    const ip = document.getElementById('interactPrompt');
    if (currentTile === T.EXIT) {
      const alive = (this.enemies || []).filter(e => e.alive).length;
      const initial = this.initialEnemyCount || this.enemies.length;
      const required = Math.max(0, Math.ceil(initial * 0.9));
      const allowed = Math.max(0, initial - required);
      if (alive <= allowed) {
        if (ip) {
          ip.classList.remove('hidden');
          const ia = document.getElementById('interactAction'); if (ia) ia.textContent = 'descend';
        }
        this._exitHintShown = false;
      } else {
        if (ip) {
          ip.classList.remove('hidden');
          const ia = document.getElementById('interactAction'); if (ia) ia.textContent = `defeat ${required}`;
        }
        if (!this._exitHintShown) {
          this._showRoomInfo(`Requires ${required} of ${initial} enemies (90%)`, 3200);
          this._exitHintShown = true;
        }
      }
    } else {
      if (ip) ip.classList.add('hidden');
      this._exitHintShown = false;
    }
    
    this.camera.x += ((this.player.x - this.canvas.width / 2) - this.camera.x) * 0.1;
    this.camera.y += ((this.player.y - this.canvas.height / 2) - this.camera.y) * 0.1;

    if (this.settings.particles && this.particles) {
      this.particles.update(dt);
    }

    // Update enemies and handle their actions
    if (this.enemies && this.enemies.length) {
      for (const enemy of this.enemies) {
        const res = enemy.update(dt, this.player, this.world.map);
        if (res && res.type === 'attack') {
          this.player.takeDamage(res.damage);
        }
        if (res && res.type === 'groundSlam') {
          const d = Math.hypot(this.player.x - res.x, this.player.y - res.y);
          if (d <= (res.radius || 0)) this.player.takeDamage(res.damage || 0);
        }
        // Collect souls and spawn particles for dead enemies
        if (!enemy.alive || enemy.state === 'dead') {
          if (!enemy._collected) {
            const souls = enemy.souls || 0;
            if (souls > 0) {
              this.player.addSouls(souls);
              if (this.particles) this.particles.soulPop(enemy.x, enemy.y, Math.min(12, souls * 2));
            }
            enemy._collected = true;
          }
        }
      }
      // remove fully dead enemies from array
      this.enemies = this.enemies.filter(e => e.alive);
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
    for (let r = 1; r < grid.length - 1; r++) {
      for (let c = 1; c < grid[r].length - 1; c++) {
        if (grid[r][c] === T.FLOOR) {
          // prefer tiles with at least one adjacent floor (avoid spawning into tight walls)
          if (grid[r][c+1] === T.FLOOR || grid[r][c-1] === T.FLOOR || grid[r+1][c] === T.FLOOR || grid[r-1][c] === T.FLOOR) {
            spawnTileX = c;
            spawnTileY = r;
            foundSpawn = true;
            break;
          }
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
    
    // Ensure interact prompt is hidden after layer transition
    const ip = document.getElementById('interactPrompt');
    if (ip) ip.classList.add('hidden');

    // Clean stray overlay elements
    if (typeof this._cleanUiOverlays === 'function') this._cleanUiOverlays();

    console.log(`Spawned safely at Tile Column: ${spawnTileX}, Row: ${spawnTileY} (Px: ${this.player.x}, ${this.player.y})`);
  }


  _cleanUiOverlays() {
    const removeIfEmpty = (id) => {
      const el = document.getElementById(id);
      if (!el) return;
      Array.from(el.children).forEach(ch => {
        if (!ch.hasChildNodes() && (!ch.textContent || ch.textContent.trim() === '')) ch.remove();
      });
    };
    removeIfEmpty('damageLayer');
    removeIfEmpty('menuEmbers');
    removeIfEmpty('damageLayer');
  }

  _showRoomInfo(text, duration = 2600) {
    const info = document.getElementById('roomInfo');
    if (!info) return;
    info.textContent = text;
    info.classList.remove('hidden');
    if (this._roomInfoTimer) clearTimeout(this._roomInfoTimer);
    this._roomInfoTimer = setTimeout(() => {
      info.classList.add('hidden');
      this._roomInfoTimer = null;
    }, duration);
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