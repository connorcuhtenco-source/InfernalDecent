"use strict";

/* ============================================================
   INFERNAL DESCENT — PROCEDURAL PIXEL SPRITES
   Bright readable sprites. No external image files required.
============================================================ */

const SpriteFX = {
  pixel(ctx, x, y, s, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), s, s);
  },

  glow(ctx, x, y, r, color) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  },

  shadow(ctx, x, y, w, h) {
    ctx.fillStyle = "rgba(0,0,0,0.62)";
    ctx.beginPath();
    ctx.ellipse(x, y, w, h, 0, 0, Math.PI * 2);
    ctx.fill();
  }
};

const SpriteRenderer = {
  drawPlayer(ctx, x, y, player, frame = 0) {
    const c = player.color || "#ff6a3d";
    const walk = Math.sin(frame / 110) * 2;

    ctx.save();

    SpriteFX.glow(ctx, x, y, 48, c + "88");
    SpriteFX.shadow(ctx, x, y + 24, 20, 7);

    const px = x - 18;
    const py = y - 30;

    // legs
    SpriteFX.pixel(ctx, px + 5, py + 38 + walk, 8, "#090608");
    SpriteFX.pixel(ctx, px + 23, py + 38 - walk, 8, "#090608");

    // boots
    SpriteFX.pixel(ctx, px + 4, py + 48 + walk, 10, "#030203");
    SpriteFX.pixel(ctx, px + 22, py + 48 - walk, 10, "#030203");

    // body
    SpriteFX.pixel(ctx, px + 7, py + 16, 22, "#130c12");
    SpriteFX.pixel(ctx, px + 5, py + 24, 26, "#20151c");
    SpriteFX.pixel(ctx, px + 7, py + 24, 22, c);

    // chest highlight
    SpriteFX.pixel(ctx, px + 12, py + 22, 12, "#f8efe7");
    SpriteFX.pixel(ctx, px + 15, py + 28, 6, "#11080a");

    // head / hood
    SpriteFX.pixel(ctx, px + 8, py + 0, 20, "#11080d");
    SpriteFX.pixel(ctx, px + 10, py + 4, 16, "#241820");

    // eyes
    SpriteFX.pixel(ctx, px + 13, py + 10, 4, "#ffffff");
    SpriteFX.pixel(ctx, px + 22, py + 10, 4, "#ffffff");

    // shield when blocking
    if (held("KeyQ") && player.stamina > 5) {
      SpriteFX.glow(ctx, x, y, 66, "rgba(120,190,255,0.38)");
      ctx.strokeStyle = "rgba(160,215,255,0.9)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(x, y, 34, -0.9, 0.9);
      ctx.stroke();
    }

    // weapon direction
    ctx.strokeStyle = c;
    ctx.lineWidth = 5;
    ctx.shadowColor = c;
    ctx.shadowBlur = 18;

    ctx.beginPath();
    ctx.moveTo(x + player.facingX * 10, y + player.facingY * 10);
    ctx.lineTo(x + player.facingX * 42, y + player.facingY * 42);
    ctx.stroke();

    ctx.restore();
  },

  drawHusk(ctx, x, y, enemy, frame = 0) {
    const walk = Math.sin(frame / 140 + enemy.x) * 2;

    ctx.save();

    SpriteFX.glow(ctx, x, y, 38, "rgba(255,120,60,0.22)");
    SpriteFX.shadow(ctx, x, y + 21, 17, 6);

    const px = x - 16;
    const py = y - 29;

    SpriteFX.pixel(ctx, px + 6, py + 39 + walk, 7, "#0a0605");
    SpriteFX.pixel(ctx, px + 19, py + 39 - walk, 7, "#0a0605");

    SpriteFX.pixel(ctx, px + 6, py + 18, 20, "#4a352d");
    SpriteFX.pixel(ctx, px + 4, py + 26, 24, "#6b5145");
    SpriteFX.pixel(ctx, px + 10, py + 2, 14, "#2a1c17");

    SpriteFX.pixel(ctx, px + 11, py + 9, 4, "#ffd078");
    SpriteFX.pixel(ctx, px + 20, py + 9, 4, "#ffd078");

    ctx.restore();
  },

  drawHellHound(ctx, x, y, enemy, frame = 0) {
    const run = Math.sin(frame / 75 + enemy.x) * 3;

    ctx.save();

    SpriteFX.glow(ctx, x, y, 44, "rgba(255,90,25,0.52)");
    SpriteFX.shadow(ctx, x, y + 18, 24, 7);

    const px = x - 26;
    const py = y - 20;

    SpriteFX.pixel(ctx, px + 6, py + 8, 32, "#220804");
    SpriteFX.pixel(ctx, px + 12, py + 3, 26, "#e87519");
    SpriteFX.pixel(ctx, px + 38, py + 7, 12, "#ff6a3d");

    SpriteFX.pixel(ctx, px + 8, py + 25 + run, 7, "#090302");
    SpriteFX.pixel(ctx, px + 21, py + 25 - run, 7, "#090302");
    SpriteFX.pixel(ctx, px + 35, py + 25 + run, 7, "#090302");

    SpriteFX.pixel(ctx, px + 43, py + 10, 4, "#fff");
    SpriteFX.pixel(ctx, px + 46, py + 17, 3, "#fff");

    ctx.restore();
  },

  drawCyclops(ctx, x, y, enemy, frame = 0) {
    ctx.save();

    SpriteFX.glow(ctx, x, y, 52, "rgba(255,55,30,0.46)");
    SpriteFX.shadow(ctx, x, y + 27, 22, 8);

    const px = x - 22;
    const py = y - 38;

    SpriteFX.pixel(ctx, px + 9, py + 12, 28, "#3c1c18");
    SpriteFX.pixel(ctx, px + 4, py + 24, 38, "#722c24");
    SpriteFX.pixel(ctx, px + 9, py + 44, 10, "#140807");
    SpriteFX.pixel(ctx, px + 26, py + 44, 10, "#140807");

    SpriteFX.pixel(ctx, px + 13, py + 0, 20, "#2b1512");
    SpriteFX.pixel(ctx, px + 17, py + 9, 10, "#fff");
    SpriteFX.pixel(ctx, px + 20, py + 12, 4, "#ff2d1c");

    if (enemy.cooldown < 500) {
      SpriteFX.glow(ctx, x, y - 28, 34, "rgba(255,45,28,0.88)");
    }

    ctx.restore();
  },

  drawGargoyle(ctx, x, y, enemy, frame = 0) {
    const flap = Math.sin(frame / 90 + enemy.x) * 6;

    ctx.save();

    SpriteFX.glow(ctx, x, y, 40, "rgba(220,210,200,0.22)");
    SpriteFX.shadow(ctx, x, y + 22, 18, 6);

    ctx.fillStyle = "#4b4545";

    ctx.beginPath();
    ctx.moveTo(x - 4, y - 4);
    ctx.lineTo(x - 34, y - 20 + flap);
    ctx.lineTo(x - 18, y + 17);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(x + 4, y - 4);
    ctx.lineTo(x + 34, y - 20 - flap);
    ctx.lineTo(x + 18, y + 17);
    ctx.closePath();
    ctx.fill();

    const px = x - 20;
    const py = y - 28;

    SpriteFX.pixel(ctx, px + 12, py + 8, 18, "#77706d");
    SpriteFX.pixel(ctx, px + 10, py + 22, 22, "#58514f");
    SpriteFX.pixel(ctx, px + 14, py + 0, 14, "#302c2a");

    SpriteFX.pixel(ctx, px + 16, py + 8, 4, "#ff6a3d");
    SpriteFX.pixel(ctx, px + 25, py + 8, 4, "#ff6a3d");

    ctx.restore();
  },

  drawBoss(ctx, x, y, boss, frame = 0) {
    ctx.save();

    const aura = boss.phase2
      ? "rgba(255,40,20,0.78)"
      : "rgba(255,130,45,0.48)";

    SpriteFX.glow(ctx, x, y, boss.phase2 ? 100 : 82, aura);
    SpriteFX.shadow(ctx, x, y + 42, 38, 13);

    if (boss.name === "Alpha Cerberus") {
      this.drawCerberus(ctx, x, y, boss);
    } else if (boss.name === "The Devil") {
      this.drawDevil(ctx, x, y, boss);
    } else {
      this.drawWarden(ctx, x, y, boss);
    }

    ctx.restore();
  },

  drawWarden(ctx, x, y, boss) {
    const px = x - 34;
    const py = y - 56;

    SpriteFX.pixel(ctx, px + 14, py + 20, 40, boss.phase2 ? "#ff2d1c" : "#6b2a20");
    SpriteFX.pixel(ctx, px + 8, py + 40, 52, boss.phase2 ? "#c73622" : "#301713");
    SpriteFX.pixel(ctx, px + 20, py + 0, 28, "#130a10");

    SpriteFX.pixel(ctx, px + 24, py + 12, 5, "#fff");
    SpriteFX.pixel(ctx, px + 39, py + 12, 5, "#fff");

    ctx.strokeStyle = "#ffd078";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(x + 28, y - 24);
    ctx.lineTo(x + 70, y + 24);
    ctx.stroke();
  },

  drawCerberus(ctx, x, y, boss) {
    const px = x - 56;
    const py = y - 44;

    SpriteFX.pixel(ctx, px + 12, py + 32, 88, "#270d08");
    SpriteFX.pixel(ctx, px + 20, py + 20, 70, boss.phase2 ? "#ff3b24" : "#e87519");

    SpriteFX.pixel(ctx, px + 2, py + 2, 28, "#3a1008");
    SpriteFX.pixel(ctx, px + 42, py - 8, 28, "#3a1008");
    SpriteFX.pixel(ctx, px + 82, py + 2, 28, "#3a1008");

    SpriteFX.pixel(ctx, px + 12, py + 11, 5, "#fff");
    SpriteFX.pixel(ctx, px + 52, py + 1, 5, "#fff");
    SpriteFX.pixel(ctx, px + 92, py + 11, 5, "#fff");

    SpriteFX.pixel(ctx, px + 24, py + 66, 12, "#100403");
    SpriteFX.pixel(ctx, px + 52, py + 66, 12, "#100403");
    SpriteFX.pixel(ctx, px + 80, py + 66, 12, "#100403");
  },

  drawDevil(ctx, x, y, boss) {
    const px = x - 38;
    const py = y - 70;

    SpriteFX.pixel(ctx, px + 20, py + 18, 36, boss.phase2 ? "#ff1c0d" : "#b42016");
    SpriteFX.pixel(ctx, px + 14, py + 44, 48, boss.phase2 ? "#ff3b24" : "#6d120d");
    SpriteFX.pixel(ctx, px + 22, py + 0, 28, "#230504");

    SpriteFX.pixel(ctx, px + 8, py + 0, 10, "#ffd078");
    SpriteFX.pixel(ctx, px + 58, py + 0, 10, "#ffd078");

    SpriteFX.pixel(ctx, px + 27, py + 12, 5, "#fff");
    SpriteFX.pixel(ctx, px + 45, py + 12, 5, "#fff");

    ctx.strokeStyle = "#ffd078";
    ctx.lineWidth = 6;

    ctx.beginPath();
    ctx.moveTo(x + 40, y - 50);
    ctx.lineTo(x + 66, y + 40);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x + 36, y - 48);
    ctx.lineTo(x + 48, y - 62);
    ctx.moveTo(x + 44, y - 49);
    ctx.lineTo(x + 60, y - 64);
    ctx.moveTo(x + 52, y - 50);
    ctx.lineTo(x + 72, y - 58);
    ctx.stroke();
  }
};