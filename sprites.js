"use strict";

/* ============================================================
   INFERNAL DESCENT — SPRITE RENDERER
   Adds:
   - Mouse-facing player direction
   - Better enemy readability
   - Better boss visuals
   - Shield/block visuals
   - Weapon direction visuals
   - Pixel-art style drawing
============================================================ */

const SpriteFX = {
  glow(ctx, x, y, r, color) {
    ctx.save();

    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, "rgba(0,0,0,0)");

    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  },

  shadow(ctx, x, y, w = 34, h = 11) {
    ctx.save();

    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.beginPath();
    ctx.ellipse(x, y, w, h, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  },

  pixel(ctx, x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  },

  outlineRect(ctx, x, y, w, h, fill, stroke = "rgba(255,255,255,0.12)") {
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);

    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
  }
};

const SpriteRenderer = {
  drawPlayer(ctx, x, y, player, frame = 0) {
    const bob = Math.sin(frame / 120) * 2;
    const angle = Math.atan2(player.facingY, player.facingX);

    SpriteFX.shadow(ctx, x, y + 24, 26, 8);

    ctx.save();

    ctx.translate(x, y + bob);
    ctx.rotate(angle);

    if (player.blocking) {
      SpriteFX.glow(ctx, 0, 0, 62, "rgba(120,210,255,0.28)");

      ctx.fillStyle = "rgba(120,210,255,0.22)";
      ctx.beginPath();
      ctx.arc(18, 0, 28, -1.2, 1.2);
      ctx.lineTo(8, 0);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = "rgba(190,240,255,0.65)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(18, 0, 28, -1.2, 1.2);
      ctx.stroke();
    }

    if (player.classId === "mage") {
      this.drawMageBody(ctx, player);
    } else if (player.classId === "assassin") {
      this.drawAssassinBody(ctx, player);
    } else {
      this.drawWarriorBody(ctx, player);
    }

    this.drawHeldWeapon(ctx, player);

    ctx.restore();

    if (player.speedBoostTimer > 0) {
      SpriteFX.glow(ctx, x, y, 44, "rgba(255,208,120,0.18)");
    }

    if (player.attackBoostTimer > 0) {
      SpriteFX.glow(ctx, x, y, 48, "rgba(255,90,30,0.22)");
    }
  },

  drawWarriorBody(ctx, player) {
    SpriteFX.outlineRect(ctx, -12, -18, 24, 34, "#2a1010");

    SpriteFX.pixel(ctx, -15, -10, 8, 22, "#4a1714");
    SpriteFX.pixel(ctx, 7, -10, 8, 22, "#4a1714");

    SpriteFX.pixel(ctx, -9, -28, 18, 14, "#cfc0b5");
    SpriteFX.pixel(ctx, -7, -25, 14, 6, "#ffe0bd");

    SpriteFX.pixel(ctx, -10, -34, 20, 8, "#4a1714");
    SpriteFX.pixel(ctx, -14, -31, 8, 7, "#7c241b");
    SpriteFX.pixel(ctx, 6, -31, 8, 7, "#7c241b");

    SpriteFX.pixel(ctx, -9, 16, 8, 16, "#0e0908");
    SpriteFX.pixel(ctx, 1, 16, 8, 16, "#0e0908");

    SpriteFX.pixel(ctx, -16, -15, 32, 4, player.color);
  },

  drawAssassinBody(ctx, player) {
    SpriteFX.outlineRect(ctx, -10, -18, 20, 34, "#130b0a");

    SpriteFX.pixel(ctx, -13, -9, 7, 24, "#27100d");
    SpriteFX.pixel(ctx, 6, -9, 7, 24, "#27100d");

    SpriteFX.pixel(ctx, -8, -28, 16, 14, "#1c1110");
    SpriteFX.pixel(ctx, -6, -24, 12, 5, "#ffd0aa");

    SpriteFX.pixel(ctx, -12, -31, 24, 7, "#0a0707");
    SpriteFX.pixel(ctx, -12, -21, 24, 4, player.color);

    SpriteFX.pixel(ctx, -8, 14, 6, 17, "#090707");
    SpriteFX.pixel(ctx, 2, 14, 6, 17, "#090707");

    SpriteFX.pixel(ctx, -18, -4, 9, 5, "#ff6a3d");
  },

  drawMageBody(ctx, player) {
    SpriteFX.glow(ctx, 0, 0, 36, "rgba(255,150,50,0.16)");

    SpriteFX.outlineRect(ctx, -11, -18, 22, 36, "#1a0b11");

    SpriteFX.pixel(ctx, -15, -7, 7, 24, "#2a1019");
    SpriteFX.pixel(ctx, 8, -7, 7, 24, "#2a1019");

    SpriteFX.pixel(ctx, -8, -29, 16, 14, "#f0d7b8");
    SpriteFX.pixel(ctx, -11, -35, 22, 10, "#35111d");

    SpriteFX.pixel(ctx, -12, -19, 24, 5, "#ffd078");
    SpriteFX.pixel(ctx, -5, -15, 10, 28, "#4b1722");

    SpriteFX.pixel(ctx, -8, 15, 6, 16, "#10080c");
    SpriteFX.pixel(ctx, 2, 15, 6, 16, "#10080c");

    SpriteFX.glow(ctx, 18, 0, 24, "rgba(255,159,46,0.3)");
    SpriteFX.pixel(ctx, 14, -4, 8, 8, "#ffd078");
  },

  drawHeldWeapon(ctx, player) {
    const weapon = player.weaponName;

    ctx.save();

    ctx.translate(10, 0);

    if (player.classId === "mage") {
      SpriteFX.glow(ctx, 24, 0, 30, "rgba(255,120,40,0.45)");

      ctx.strokeStyle = "#4a1a10";
      ctx.lineWidth = 5;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(30, 0);
      ctx.stroke();

      ctx.fillStyle = "#ff9f2e";
      ctx.beginPath();
      ctx.arc(35, 0, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#fff1c2";
      ctx.beginPath();
      ctx.arc(35, 0, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
      return;
    }

    if (weapon.includes("Dagger")) {
      ctx.strokeStyle = "#fff1d0";
      ctx.lineWidth = 4;

      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(26, -12);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, 6);
      ctx.lineTo(26, 12);
      ctx.stroke();

      ctx.fillStyle = player.color;
      ctx.fillRect(0, -9, 8, 18);
    } else if (weapon.includes("Katana") || weapon.includes("Nagakiba")) {
      ctx.strokeStyle = "#fff1d0";
      ctx.lineWidth = 5;
      ctx.shadowColor = player.color;
      ctx.shadowBlur = 12;

      ctx.beginPath();
      ctx.moveTo(-4, 0);
      ctx.lineTo(44, -5);
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.fillStyle = player.color;
      ctx.fillRect(-6, -5, 12, 10);
    } else if (weapon.includes("Spear")) {
      ctx.strokeStyle = "#9f5b2e";
      ctx.lineWidth = 4;

      ctx.beginPath();
      ctx.moveTo(-8, 0);
      ctx.lineTo(56, 0);
      ctx.stroke();

      ctx.fillStyle = "#fff1d0";
      ctx.beginPath();
      ctx.moveTo(66, 0);
      ctx.lineTo(50, -9);
      ctx.lineTo(52, 9);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.strokeStyle = "#6b3514";
      ctx.lineWidth = 6;

      ctx.beginPath();
      ctx.moveTo(-3, 0);
      ctx.lineTo(34, 0);
      ctx.stroke();

      ctx.fillStyle = "#d8c6b1";
      ctx.beginPath();
      ctx.moveTo(46, 0);
      ctx.lineTo(29, -18);
      ctx.lineTo(26, 16);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = player.color;
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    ctx.restore();
  },

  drawHusk(ctx, x, y, enemy, frame = 0) {
    const bob = Math.sin(frame / 180) * 1.5;

    SpriteFX.shadow(ctx, x, y + 22, 25, 8);

    ctx.save();
    ctx.translate(x, y + bob);

    SpriteFX.outlineRect(ctx, -13, -18, 26, 36, "#251914");

    SpriteFX.pixel(ctx, -9, -28, 18, 14, "#6b5145");
    SpriteFX.pixel(ctx, -5, -23, 4, 4, "#ffd078");
    SpriteFX.pixel(ctx, 4, -23, 4, 4, "#ffd078");

    SpriteFX.pixel(ctx, -17, -10, 8, 23, "#1a100d");
    SpriteFX.pixel(ctx, 9, -10, 8, 23, "#1a100d");

    SpriteFX.pixel(ctx, -10, 17, 7, 16, "#100b09");
    SpriteFX.pixel(ctx, 3, 17, 7, 16, "#100b09");

    ctx.restore();
  },

  drawHellHound(ctx, x, y, enemy, frame = 0) {
    const run = Math.sin(frame / 80) * 3;

    SpriteFX.glow(ctx, x, y, 48, "rgba(255,90,20,0.18)");
    SpriteFX.shadow(ctx, x, y + 20, 31, 9);

    ctx.save();
    ctx.translate(x, y);

    SpriteFX.outlineRect(ctx, -24, -13, 42, 25, "#2a0705");
    SpriteFX.pixel(ctx, 12, -22, 20, 18, "#3b0905");

    SpriteFX.pixel(ctx, 24, -28, 5, 10, "#ff6a3d");
    SpriteFX.pixel(ctx, 15, -28, 5, 10, "#ff6a3d");

    SpriteFX.pixel(ctx, 24, -13, 5, 4, "#ffd078");

    SpriteFX.pixel(ctx, -20, 10, 7, 16 + run, "#150504");
    SpriteFX.pixel(ctx, -5, 10, 7, 16 - run, "#150504");
    SpriteFX.pixel(ctx, 9, 10, 7, 16 + run, "#150504");

    SpriteFX.pixel(ctx, -30, -10, 10, 6, "#ff6a3d");

    ctx.restore();
  },

  drawCyclops(ctx, x, y, enemy, frame = 0) {
    const pulse = 0.5 + Math.sin(frame / 180) * 0.5;

    SpriteFX.shadow(ctx, x, y + 28, 33, 10);

    ctx.save();
    ctx.translate(x, y);

    SpriteFX.outlineRect(ctx, -17, -24, 34, 45, "#271511");

    SpriteFX.pixel(ctx, -12, -34, 24, 17, "#5a2a20");

    SpriteFX.glow(ctx, 0, -26, 24 + pulse * 8, "rgba(255,0,0,0.25)");

    ctx.fillStyle = "#ff2d1c";
    ctx.beginPath();
    ctx.arc(0, -25, 7 + pulse * 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(0, -25, 3, 0, Math.PI * 2);
    ctx.fill();

    SpriteFX.pixel(ctx, -25, -12, 9, 30, "#1a0d0a");
    SpriteFX.pixel(ctx, 16, -12, 9, 30, "#1a0d0a");

    SpriteFX.pixel(ctx, -12, 20, 8, 17, "#100806");
    SpriteFX.pixel(ctx, 4, 20, 8, 17, "#100806");

    ctx.restore();
  },

  drawGargoyle(ctx, x, y, enemy, frame = 0) {
    const flap = Math.sin(frame / 90) * 6;

    SpriteFX.shadow(ctx, x, y + 22, 28, 8);

    ctx.save();
    ctx.translate(x, y);

    SpriteFX.outlineRect(ctx, -13, -20, 26, 36, "#242021");

    ctx.fillStyle = "#3b3436";
    ctx.beginPath();
    ctx.moveTo(-13, -12);
    ctx.lineTo(-42, -28 + flap);
    ctx.lineTo(-24, 3);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(13, -12);
    ctx.lineTo(42, -28 - flap);
    ctx.lineTo(24, 3);
    ctx.closePath();
    ctx.fill();

    SpriteFX.pixel(ctx, -9, -31, 18, 13, "#82746d");

    SpriteFX.pixel(ctx, -6, -26, 4, 4, "#ff3b24");
    SpriteFX.pixel(ctx, 3, -26, 4, 4, "#ff3b24");

    SpriteFX.pixel(ctx, -10, 15, 7, 16, "#121010");
    SpriteFX.pixel(ctx, 3, 15, 7, 16, "#121010");

    ctx.restore();
  },

  drawBoss(ctx, x, y, boss, frame = 0) {
    if (boss.name === "Hollow Warden") {
      this.drawWarden(ctx, x, y, boss, frame);
      return;
    }

    if (boss.name === "The Gate Keeper") {
      this.drawGateKeeper(ctx, x, y, boss, frame);
      return;
    }

    if (boss.name === "Alpha Cerberus") {
      this.drawCerberus(ctx, x, y, boss, frame);
      return;
    }

    if (boss.name === "The Devil") {
      this.drawDevil(ctx, x, y, boss, frame);
      return;
    }

    this.drawWarden(ctx, x, y, boss, frame);
  },

  drawWarden(ctx, x, y, boss, frame = 0) {
    const pulse = Math.sin(frame / 180) * 4;

    SpriteFX.glow(ctx, x, y, 86 + pulse, "rgba(220,235,255,0.18)");
    SpriteFX.shadow(ctx, x, y + 42, 48, 14);

    ctx.save();
    ctx.translate(x, y);

    SpriteFX.outlineRect(ctx, -26, -42, 52, 78, "#171a1e", "rgba(220,235,255,0.2)");

    SpriteFX.pixel(ctx, -18, -62, 36, 24, "#e8f0ff");
    SpriteFX.pixel(ctx, -8, -54, 5, 6, "#0b0d12");
    SpriteFX.pixel(ctx, 4, -54, 5, 6, "#0b0d12");

    SpriteFX.pixel(ctx, -35, -25, 12, 44, "#11151a");
    SpriteFX.pixel(ctx, 23, -25, 12, 44, "#11151a");

    SpriteFX.pixel(ctx, -18, 34, 12, 28, "#090b0f");
    SpriteFX.pixel(ctx, 6, 34, 12, 28, "#090b0f");

    ctx.restore();
  },

  drawGateKeeper(ctx, x, y, boss, frame = 0) {
    const rage = boss.phase2 ? 1 : 0;
    const pulse = Math.sin(frame / 150) * 4;

    SpriteFX.glow(ctx, x, y, 90 + rage * 30, "rgba(255,80,25,0.22)");
    SpriteFX.shadow(ctx, x, y + 48, 55, 15);

    ctx.save();
    ctx.translate(x, y + pulse);

    SpriteFX.outlineRect(ctx, -32, -50, 64, 90, "#2a0d08");

    SpriteFX.pixel(ctx, -22, -75, 44, 30, "#5a1710");
    SpriteFX.pixel(ctx, -28, -82, 12, 18, "#ff9f2e");
    SpriteFX.pixel(ctx, 16, -82, 12, 18, "#ff9f2e");

    SpriteFX.pixel(ctx, -10, -63, 6, 7, "#ffd078");
    SpriteFX.pixel(ctx, 5, -63, 6, 7, "#ffd078");

    SpriteFX.pixel(ctx, -48, -30, 17, 55, "#190807");
    SpriteFX.pixel(ctx, 31, -30, 17, 55, "#190807");

    SpriteFX.pixel(ctx, -24, 38, 15, 34, "#090303");
    SpriteFX.pixel(ctx, 9, 38, 15, 34, "#090303");

    ctx.restore();
  },

  drawCerberus(ctx, x, y, boss, frame = 0) {
    const phase = boss.phase2 ? 1 : 0;
    const run = Math.sin(frame / 90) * 3;

    SpriteFX.glow(ctx, x, y, 105 + phase * 28, "rgba(255,90,20,0.28)");
    SpriteFX.shadow(ctx, x, y + 45, 72, 18);

    ctx.save();
    ctx.translate(x, y);

    SpriteFX.outlineRect(ctx, -52, -28, 100, 54, "#2a0705");

    const heads = [-34, 0, 34];

    for (const hx of heads) {
      SpriteFX.outlineRect(ctx, hx - 16, -60, 32, 30, "#3b0905");

      SpriteFX.pixel(ctx, hx - 11, -72, 6, 14, "#ff6a3d");
      SpriteFX.pixel(ctx, hx + 5, -72, 6, 14, "#ff6a3d");

      SpriteFX.pixel(ctx, hx - 7, -50, 5, 4, "#ffd078");
      SpriteFX.pixel(ctx, hx + 4, -50, 5, 4, "#ffd078");
    }

    SpriteFX.pixel(ctx, -44, 18, 10, 31 + run, "#150504");
    SpriteFX.pixel(ctx, -16, 18, 10, 31 - run, "#150504");
    SpriteFX.pixel(ctx, 16, 18, 10, 31 + run, "#150504");
    SpriteFX.pixel(ctx, 40, 18, 10, 31 - run, "#150504");

    ctx.restore();
  },

  drawDevil(ctx, x, y, boss, frame = 0) {
    const phase = boss.phase2 ? 1 : 0;
    const float = Math.sin(frame / 160) * 5;

    SpriteFX.glow(ctx, x, y, 130 + phase * 35, "rgba(255,0,30,0.3)");
    SpriteFX.shadow(ctx, x, y + 56, 65, 18);

    ctx.save();
    ctx.translate(x, y + float);

    SpriteFX.outlineRect(ctx, -34, -55, 68, 102, "#1a0306");

    ctx.fillStyle = "#23040a";
    ctx.beginPath();
    ctx.moveTo(-34, -30);
    ctx.lineTo(-85, -70);
    ctx.lineTo(-55, 20);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(34, -30);
    ctx.lineTo(85, -70);
    ctx.lineTo(55, 20);
    ctx.closePath();
    ctx.fill();

    SpriteFX.pixel(ctx, -24, -82, 48, 32, "#5a0712");

    SpriteFX.pixel(ctx, -31, -98, 10, 24, "#ff9f2e");
    SpriteFX.pixel(ctx, 21, -98, 10, 24, "#ff9f2e");

    SpriteFX.pixel(ctx, -12, -68, 7, 7, "#ffd078");
    SpriteFX.pixel(ctx, 6, -68, 7, 7, "#ffd078");

    SpriteFX.pixel(ctx, -50, -24, 14, 58, "#100204");
    SpriteFX.pixel(ctx, 36, -24, 14, 58, "#100204");

    SpriteFX.pixel(ctx, -22, 45, 14, 40, "#080102");
    SpriteFX.pixel(ctx, 8, 45, 14, 40, "#080102");

    ctx.strokeStyle = "#ff9f2e";
    ctx.lineWidth = 5;
    ctx.shadowColor = "#ff3b24";
    ctx.shadowBlur = 16;

    ctx.beginPath();
    ctx.moveTo(54, -18);
    ctx.lineTo(72, 54);
    ctx.stroke();

    ctx.shadowBlur = 0;

    ctx.restore();
  }
};