'use strict';

import { TILE, T } from './constants.js';

/* ──────────────────────────────────────────────────────────
   TILE MAP
────────────────────────────────────────────────────────── */
export class TileMap {
  constructor(grid, colors) {
    this.grid = grid; this.rows = grid.length; this.cols = grid[0].length;
    this.colors = { floor: '#140e0e', wall: '#0a0606', accent: '#2a1a14', ...colors };
    this.width = this.cols * TILE; this.height = this.rows * TILE;
  }
  at(c, r) { if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) return T.WALL; return this.grid[r][c]; }
  walkable(c, r) { const t = this.at(c, r); return t === T.FLOOR || t === T.DOOR || t === T.CHECKPOINT || t === T.EXIT; }
  collidesAt(cx, cy, w, h) {
    const p = 2, x1 = cx - w/2 + p, y1 = cy - h/2 + p, x2 = cx + w/2 - p, y2 = cy + h/2 - p;
    for (let r = Math.floor(y1 / TILE); r <= Math.floor(y2 / TILE); r++)
      for (let c = Math.floor(x1 / TILE); c <= Math.floor(x2 / TILE); c++)
        if (!this.walkable(c, r)) return true;
    return false;
  }
  tileAtPx(wx, wy) { return this.at(Math.floor(wx / TILE), Math.floor(wy / TILE)); }

  draw(ctx, cx, cy, vw, vh) {
    const c0 = Math.max(0, Math.floor(cx / TILE));
    const r0 = Math.max(0, Math.floor(cy / TILE));
    const c1 = Math.min(this.cols, Math.ceil((cx + vw) / TILE));
    const r1 = Math.min(this.rows, Math.ceil((cy + vh) / TILE));
    for (let r = r0; r < r1; r++) for (let c = c0; c < c1; c++)
      this._tile(ctx, this.grid[r][c], c * TILE - cx, r * TILE - cy);
  }

  _tile(ctx, t, x, y) {
    switch (t) {
      case T.FLOOR:
        ctx.fillStyle = this.colors.floor; ctx.fillRect(x, y, TILE, TILE);
        ctx.strokeStyle = this.colors.accent; ctx.lineWidth = 0.5; ctx.strokeRect(x, y, TILE, TILE);
        break;
      case T.WALL:
        ctx.fillStyle = this.colors.wall; ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = 'rgba(255,255,255,0.03)'; ctx.fillRect(x, y, TILE, 2);
        ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x + TILE - 4, y, 4, TILE); ctx.fillRect(x, y + TILE - 4, TILE, 4);
        break;
      case T.DOOR:
        ctx.fillStyle = '#2a1408'; ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = '#5a2e10'; ctx.fillRect(x + 8, y + 4, TILE - 16, TILE - 8);
        ctx.fillStyle = '#e67e22'; ctx.beginPath(); ctx.arc(x + TILE / 2, y + TILE / 2, 4, 0, Math.PI * 2); ctx.fill();
        break;
      case T.CHECKPOINT:
        ctx.fillStyle = this.colors.floor; ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = 'rgba(230,126,34,0.18)'; ctx.fillRect(x, y, TILE, TILE);
        ctx.strokeStyle = '#e67e22'; ctx.lineWidth = 1; ctx.strokeRect(x + 4, y + 4, TILE - 8, TILE - 8);
        ctx.font = '18px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#e67e22'; ctx.fillText('⚜', x + TILE / 2, y + TILE / 2);
        break;
      case T.EXIT:
        ctx.fillStyle = '#100808'; ctx.fillRect(x, y, TILE, TILE);
        ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 2; ctx.strokeRect(x + 2, y + 2, TILE - 4, TILE - 4);
        ctx.font = '20px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#c0392b'; ctx.fillText('🚪', x + TILE / 2, y + TILE / 2);
        break;
      default:
        ctx.fillStyle = '#050305'; ctx.fillRect(x, y, TILE, TILE);
    }
  }
}

/* ──────────────────────────────────────────────────────────
   MAPS
────────────────────────────────────────────────────────── */
export function makeTutorialMap() {
  const g = [
    [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
    [2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2],
    [2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2],
    [2, 1, 1, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 1, 1, 2],
    [2, 1, 1, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 1, 1, 2],
    [2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2],
    [2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2],
    [2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2],
    [2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2],
    [2, 1, 1, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 1, 1, 1, 2],
    [2, 1, 1, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 1, 1, 1, 2],
    [2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2],
    [2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2],
    [2, 1, 4, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 5, 1, 2],
    [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
  ];
  return new TileMap(g, { floor: '#100c0c', wall: '#080505', accent: '#1e1010' });
}

export function makeLayer1Map() {
  const g = [
    [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
    [2, 1, 1, 1, 1, 2, 2, 1, 1, 1, 1, 1, 2, 2, 1, 1, 1, 1, 1, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 2],
    // Note: If your full map arrays were cut off, merge the rest of your raw layer1 grid lines right here
    [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2]
  ];
  return new TileMap(g, { floor: '#140e0e', wall: '#0a0606', accent: '#2a1a14' });
}