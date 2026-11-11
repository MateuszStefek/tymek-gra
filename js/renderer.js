// Rysowanie na Canvasie: postacie ludzi, miny, plamy farby, skrzynki z amunicją i efekty

function redrawPaintCanvas() {
  paintCtx.clearRect(0, 0, paintCanvas.width, paintCanvas.height);
  for (const s of splats) {
    paintCtx.fillStyle = s.color;
    paintCtx.beginPath();
    paintCtx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
    paintCtx.fill();
    for (const d of s.drops) {
      paintCtx.beginPath();
      paintCtx.arc(s.x + d.dx, s.y + d.dy, d.r, 0, Math.PI * 2);
      paintCtx.fill();
    }
  }
  paintCanvasDirty = false;
}

function addPaintSplat(x, y, color, radius = 22) {
  const drops = [];
  for (let i = 0; i < 8; i++) {
    const a = Math.random() * Math.PI * 2;
    const d = radius * (0.5 + Math.random() * 1.1);
    const r = 2 + Math.random() * (radius * 0.35);
    drops.push({
      dx: Math.cos(a) * d,
      dy: Math.sin(a) * d,
      r
    });
  }
  const newSplat = {
    x,
    y,
    color,
    radius,
    drops,
    ageFrames: 0,
    maxFrames: 120 * 60 // Po 2 minutach znika całkowicie z pamięci
  };
  splats.push(newSplat);

  // Jeśli jest więcej niż 100 plam, najstarsze znikają od razu z pamięci i przebudowujemy bufor
  if (splats.length > 100) {
    while (splats.length > 100) {
      splats.shift();
    }
    paintCanvasDirty = true;
  } else {
    // Dopisz nową plamę bezpośrednio do bufora paintCanvas (brak zamulania!)
    paintCtx.fillStyle = newSplat.color;
    paintCtx.beginPath();
    paintCtx.arc(newSplat.x, newSplat.y, newSplat.radius, 0, Math.PI * 2);
    paintCtx.fill();
    for (const d of newSplat.drops) {
      paintCtx.beginPath();
      paintCtx.arc(newSplat.x + d.dx, newSplat.y + d.dy, d.r, 0, Math.PI * 2);
      paintCtx.fill();
    }
  }
}

function drawMine(mine) {
  ctx.save();
  ctx.translate(mine.x, mine.y);

  // Trigger sensor ring (żółty podczas uzbrajania, czerwony gdy uzbrojona)
  ctx.beginPath();
  ctx.arc(0, 0, mine.triggerRadius, 0, Math.PI * 2);
  ctx.strokeStyle = mine.armed ? 'rgba(239, 68, 68, 0.65)' : 'rgba(250, 204, 21, 0.45)';
  ctx.lineWidth = mine.armed ? 2.5 : 2;
  ctx.setLineDash([6, 6]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Mine body
  ctx.beginPath();
  ctx.arc(0, 0, 12, 0, Math.PI * 2);
  ctx.fillStyle = '#1e293b';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = mine.armed ? '#ef4444' : '#facc15';
  ctx.stroke();

  // Blinking LED
  const blink = Math.sin(mine.pulse * (mine.armed ? 3 : 2)) > 0;
  ctx.beginPath();
  ctx.arc(0, 0, 5, 0, Math.PI * 2);
  ctx.fillStyle = mine.armed ? (blink ? '#ef4444' : '#7f1d1d') : (blink ? '#fde047' : '#854d0e');
  ctx.fill();

  // Napis odliczania 5s "PIK!" podczas uzbrajania
  if (!mine.armed) {
    const secs = Math.ceil(mine.armFrames / 60);
    ctx.font = 'bold 13px system-ui';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fde047';
    ctx.fillText(`PIK! ${secs}s`, 0, -18);
  }

  ctx.restore();
}

function drawHuman(x, y, aimAngle, walkCycle, shirtColor, isPlayer, splatColor, label, enemyObj = null) {
  ctx.save();
  ctx.translate(x, y);
  const scale = enemyObj ? (enemyObj.kind === 'boss' ? 1.24 : (enemyObj.kind === 'tough' ? 1.12 : 1)) : 1;
  if (scale !== 1) ctx.scale(scale, scale);

  ctx.beginPath();
  ctx.ellipse(0, 18, 14, 6, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fill();

  const legSwing = Math.sin(walkCycle) * 6;
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.moveTo(-5, 6);
  ctx.lineTo(-6 - legSwing * 0.4, 17 + legSwing);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(5, 6);
  ctx.lineTo(6 + legSwing * 0.4, 17 - legSwing);
  ctx.stroke();

  ctx.fillStyle = shirtColor;
  ctx.strokeStyle = enemyObj && enemyObj.kind === 'boss' ? '#facc15' : '#0f172a';
  ctx.lineWidth = enemyObj && enemyObj.kind !== 'normal' ? 3 : 2;
  ctx.beginPath();
  ctx.roundRect(-11, -8, 22, 18, 6);
  ctx.fill();
  ctx.stroke();

  if (splatColor) {
    ctx.fillStyle = splatColor;
    ctx.beginPath();
    ctx.arc(2, 0, 7, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.beginPath();
  ctx.arc(0, -16, 10, 0, Math.PI * 2);
  ctx.fillStyle = '#fde68a';
  ctx.fill();
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, -18, 10.5, Math.PI, Math.PI * 2);
  ctx.fillStyle = isPlayer ? '#0284c7' : (enemyObj && enemyObj.kind === 'boss' ? '#eab308' : shirtColor);
  ctx.fill();

  ctx.fillStyle = isPlayer ? '#38bdf8' : (enemyObj && enemyObj.kind === 'boss' ? '#ef4444' : '#1e293b');
  ctx.beginPath();
  ctx.roundRect(-8, -19, 16, 6, 3);
  ctx.fill();

  ctx.save();
  ctx.translate(0, -2);
  ctx.rotate(aimAngle);

  ctx.strokeStyle = shirtColor;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(12, 3);
  ctx.stroke();

  if (isPlayer && player.weapon === 'bazooka') {
    // Rysuj wyrzutnię rakiet (Bazookę)
    ctx.fillStyle = '#15803d';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-6, -5, 34, 10, 3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#f97316';
    ctx.fillRect(24, -6, 6, 12);
  } else {
    ctx.fillStyle = '#334155';
    ctx.fillRect(10, -2, 18, 6);
    ctx.fillStyle = isPlayer ? '#facc15' : '#cbd5e1';
    ctx.beginPath();
    ctx.arc(15, -5, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();

  if (isPlayer) {
    const pct = Math.max(0, player.hp) / player.maxHp;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(-22, -38, 44, 7);
    ctx.fillStyle = pct > 0.5 ? '#22c55e' : (pct > 0.25 ? '#facc15' : '#ef4444');
    ctx.fillRect(-21, -37, 42 * pct, 5);
  } else if (enemyObj && enemyObj.maxHp > 1) {
    const pct = Math.max(0, enemyObj.hp) / enemyObj.maxHp;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(-20, -37, 40, 6);
    ctx.fillStyle = enemyObj.kind === 'boss' ? '#c084fc' : '#f59e0b';
    ctx.fillRect(-19, -36, 38 * pct, 4);
    ctx.font = 'bold 10px system-ui';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fde047';
    const tag = enemyObj.kind === 'boss' ? `👑 ODPORNY NA MINY (${enemyObj.hp}/${enemyObj.maxHp})` : `🛡️ ${enemyObj.hp}/${enemyObj.maxHp}`;
    ctx.fillText(tag, 0, -41);
  } else if (enemyObj && enemyObj.kind === 'rapid') {
    ctx.font = 'bold 11px system-ui';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fde047';
    ctx.fillText('⚡ SZYBKOSTRZELNY', 0, -32);
  } else if (label) {
    ctx.font = 'bold 12px system-ui';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(label, 0, -32);
  }

  // Ikonka stanu AI nad wrogiem: ❓ (zagubiony przez 2s) lub 🧠 (zmiana na lepszą pozycję)
  if (!isPlayer && enemyObj && (enemyObj.aiState === 'confused' || enemyObj.aiState === 'repositioning')) {
    const isConfused = enemyObj.aiState === 'confused';
    const iconY = enemyObj.maxHp > 1 ? -60 : -50;
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, iconY, 13, 0, Math.PI * 2);
    ctx.fillStyle = isConfused ? 'rgba(250, 204, 21, 0.95)' : 'rgba(56, 189, 248, 0.95)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#0f172a';
    ctx.stroke();

    ctx.font = '16px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(isConfused ? '❓' : '🧠', 0, iconY + 1);
    ctx.restore();
  }

  ctx.restore();
}

function renderScene() {
  const theme = graphicThemes[currentThemeIndex % graphicThemes.length] || graphicThemes[0];
  ctx.fillStyle = theme.arenaBgOverride || currentArena.bgColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = theme.gridColor || currentArena.gridColor;
  ctx.lineWidth = 2;
  for (let x = 0; x < canvas.width; x += 60) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += 60) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
  }

  for (const ob of obstacles) {
    ctx.fillStyle = ob.type === 'crate' ? theme.crateFill : (ob.type === 'bunker' ? theme.bunkerFill : theme.wallFill);
    ctx.strokeStyle = theme.obstacleStroke;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(ob.x, ob.y, ob.w, ob.h, 8);
    ctx.fill();
    ctx.stroke();
  }

  if (paintCanvasDirty) {
    redrawPaintCanvas();
  }
  ctx.drawImage(paintCanvas, 0, 0);

  // Paczki z nabojami na mapie (+5 z wrogów, +10 ze zrzutów)
  for (const pack of ammoPickups) {
    ctx.save();
    ctx.translate(pack.x, pack.y);
    const s = 1 + Math.sin(pack.pulse) * 0.08;
    ctx.scale(s, s);

    ctx.beginPath();
    ctx.roundRect(-14, -12, 28, 24, 6);
    ctx.fillStyle = pack.amount >= 10 ? '#0284c7' : '#16a34a';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#fde047';
    ctx.stroke();

    ctx.font = '900 12px system-ui';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`+${pack.amount}`, 0, 4);
    ctx.restore();
  }

  // Rzadkie paczki z rakietami do bazooki (+1 rakieta)
  for (const rpack of rocketPickups) {
    ctx.save();
    ctx.translate(rpack.x, rpack.y);
    const s = 1 + Math.sin(rpack.pulse) * 0.1;
    ctx.scale(s, s);

    ctx.beginPath();
    ctx.roundRect(-16, -13, 32, 26, 7);
    ctx.fillStyle = '#ea580c';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#fde047';
    ctx.stroke();

    ctx.font = '900 11px system-ui';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('🚀+1', 0, 4);
    ctx.restore();
  }

  // Placed mines
  for (const mine of placedMines) {
    drawMine(mine);
  }

  // Mine explosions
  for (const ex of explosions) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, ex.alpha);
    ctx.beginPath();
    ctx.arc(ex.x, ex.y, ex.radius, 0, Math.PI * 2);
    ctx.fillStyle = ex.color;
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#fde047';
    ctx.stroke();
    ctx.restore();
  }

  for (const el of eliminatedHumans) {
    ctx.save();
    ctx.globalAlpha = el.timer / 45;
    drawHuman(el.x, el.y, 0, 0, el.shirtColor, false, el.splatColor, 'TRAFIONY!');
    ctx.restore();
  }

  for (const en of enemies) {
    drawHuman(en.x, en.y, en.angle, en.walkCycle, en.shirtColor, false, en.splatColor, '', en);
  }

  // Podświetlenie celu najbliższego wskaźnikowi myszy, gdy wybrana jest Bazooka
  if (gameState === 'playing' && player.weapon === 'bazooka' && enemies.length > 0) {
    const aimedEnemy = findNearestEnemy(mouse.x, mouse.y);
    if (aimedEnemy) {
      ctx.save();
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.85)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.arc(aimedEnemy.x, aimedEnemy.y, aimedEnemy.radius + 11, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  if (gameState !== 'dead') {
    drawHuman(player.x, player.y, player.angle, player.walkCycle, '#2563eb', true, player.splatColor, 'TY');
  }

  for (const b of bullets) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = b.color;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Rakiety samonaprowadzające z bazooki
  for (const r of homingRockets) {
    if (r.target && enemies.includes(r.target)) {
      ctx.save();
      ctx.strokeStyle = 'rgba(249, 115, 22, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(r.x, r.y);
      ctx.lineTo(r.target.x, r.target.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(r.target.x, r.target.y, r.target.radius + 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(r.x, r.y);
    ctx.rotate(r.angle);

    // Płomień odrzutowy
    ctx.beginPath();
    ctx.moveTo(-10, -4);
    ctx.lineTo(-19 - Math.random() * 6, 0);
    ctx.lineTo(-10, 4);
    ctx.closePath();
    ctx.fillStyle = '#facc15';
    ctx.fill();

    // Korpus rakiety
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-10, -5, 18, 10, 4);
    ctx.fill();
    ctx.stroke();

    // Głowica rakiety
    ctx.beginPath();
    ctx.moveTo(8, -5);
    ctx.lineTo(15, 0);
    ctx.lineTo(8, 5);
    ctx.closePath();
    ctx.fillStyle = '#ef4444';
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  for (const p of particles) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.alpha);
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();
    ctx.restore();
  }

  // Chmury zasłaniające fragment mapy (ok. 20% x 20% = ~188x112 px)
  for (const cl of clouds) {
    ctx.save();
    ctx.translate(cl.x, cl.y);

    // Cień chmury na ziemi
    ctx.fillStyle = 'rgba(15, 23, 42, 0.32)';
    ctx.beginPath();
    ctx.ellipse(6, 12, cl.w * 0.52, cl.h * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Gęste kłęby chmury całkowicie zasłaniające obszar ~20% x 20% mapy
    ctx.fillStyle = 'rgba(226, 232, 240, 0.97)';
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.85)';
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.ellipse(0, 0, cl.w * 0.44, cl.h * 0.44, 0, 0, Math.PI * 2);
    ctx.fill();

    for (const puff of cl.puffs) {
      const wobbleX = Math.sin(cl.phase + puff.phaseOffset) * 3;
      const wobbleY = Math.cos(cl.phase + puff.phaseOffset) * 2;
      ctx.beginPath();
      ctx.ellipse(puff.ox + wobbleX, puff.oy + wobbleY, puff.rx, puff.ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Jasny środek chmury zapewniający 100% zasłonięcia tego, co pod nią
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.ellipse(0, -2, cl.w * 0.4, cl.h * 0.36, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  for (const pop of popups) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, pop.alpha);
    ctx.font = '900 18px system-ui';
    ctx.textAlign = 'center';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 4;
    ctx.strokeText(pop.text, pop.x, pop.y);
    ctx.fillStyle = pop.color;
    ctx.fillText(pop.text, pop.x, pop.y);
    ctx.restore();
  }

  if (levelBannerTimer > 0 && gameState === 'playing') {
    const cfg = getLevelConfig(level);
    ctx.save();
    ctx.font = '900 24px system-ui';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fde047';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 6;
    const msg = activeCustomMapIndex !== null
      ? `🛠️ ${customMaps[activeCustomMapIndex].name} (${currentArena.name}) — ${formatCustomMapSummary(customMaps[activeCustomMapIndex])}`
      : `POZIOM ${level} (${currentArena.name}) — ${cfg.label}`;
    ctx.strokeText(msg, canvas.width / 2, 48);
    ctx.fillText(msg, canvas.width / 2, 48);
    ctx.restore();
  }

  if (player.hitFlash > 0) {
    ctx.fillStyle = `rgba(239, 68, 68, ${player.hitFlash * 0.025})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  if (gameState === 'paused') {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fde047';
    ctx.font = '900 44px system-ui';
    ctx.fillText('⏸️ GRA WSTRZYMANA (PAUZA)', canvas.width / 2, canvas.height / 2 - 20);
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 20px system-ui';
    ctx.fillText('Kliknij lewym przyciskiem myszy, naciśnij P lub guzik ▶️ Wznów, aby kontynuować', canvas.width / 2, canvas.height / 2 + 28);
  }
}
