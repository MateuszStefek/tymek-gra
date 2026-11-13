// ==================== MINY GRACZA I PRZECIWNIKÓW ====================

function placeMine() {
  if (gameState !== 'playing' || player.hp <= 0 || minesCount <= 0) return;
  minesCount--;
  playMineBeep(false);
  placedMines.push({
    x: player.x,
    y: player.y,
    triggerRadius: 48,
    blastRadius: 105,
    pulse: 0,
    armFrames: 300, // 5 sekund uzbrajania (60 fps * 5 = 300 klatek)
    armed: false,
    color: '#f97316',
    visibleToPro: Math.random() < 0.5 // Profesjonalista widzi 50% min
  });
  saveProgress();
  updateHud();
  canvas.focus();
}

function triggerMineExplosion(mine) {
  playExplosionSound();
  const blastColor = colors[Math.floor(Math.random() * colors.length)];
  addPaintSplat(mine.x, mine.y, blastColor, 52);
  explosions.push({
    x: mine.x,
    y: mine.y,
    radius: 10,
    maxRadius: mine.blastRadius,
    color: blastColor,
    alpha: 1
  });

  for (let k = 0; k < 42; k++) {
    const a = Math.random() * Math.PI * 2;
    const s = 2 + Math.random() * 7;
    particles.push({
      x: mine.x,
      y: mine.y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      r: 4 + Math.random() * 5,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: 1
    });
  }

  // Sprawdź, czy gracz jest w polu rażenia własnej miny!
  if (Math.hypot(player.x - mine.x, player.y - mine.y) <= mine.blastRadius) {
    player.hp = Math.max(0, player.hp - 80);
    player.hitFlash = 24;
    player.splatColor = blastColor;
    addPaintSplat(player.x, player.y, blastColor, 34);
    if (player.hp <= 0) {
      updateHud();
      clouds = [];
      playerDeadPending = true;
      if (bullets.length === 0 && homingRockets.length === 0) {
        openMenu('dead');
        return;
      }
    }
  }

  // Eliminate enemies inside blastRadius (chyba że przeciwnik jest odporny na miny - 'boss' / 'returning_boss'!)
  for (let j = enemies.length - 1; j >= 0; j--) {
    const en = enemies[j];
    if (Math.hypot(en.x - mine.x, en.y - mine.y) <= mine.blastRadius) {
      if (en.mineImmune) {
        popups.push({
          x: en.x,
          y: en.y - 24,
          text: '👑 ODPORNY NA MINY!',
          color: '#facc15',
          alpha: 1
        });
        continue;
      }
      eliminateEnemy(j, en, blastColor);
    }
  }

  // Miny ranią również cywili będących w promieniu wybuchu!
  for (let c = civilians.length - 1; c >= 0; c--) {
    const civ = civilians[c];
    if (Math.hypot(civ.x - mine.x, civ.y - mine.y) <= mine.blastRadius) {
      damageCivilian(c, 2, blastColor);
      if (gameState !== 'playing') return;
    }
  }

  if (enemies.length === 0 && gameState === 'playing' && bullets.length === 0 && homingRockets.length === 0) {
    handleLevelVictory();
  } else {
    updateHud();
  }
}

function plantEnemyMine(en) {
  if (enemyMines.length >= 12) enemyMines.shift();
  enemyMines.push({
    x: en.x,
    y: en.y,
    triggerRadius: 42,
    blastRadius: 85,
    pulse: 0,
    armFrames: 180, // 3 sekundy uzbrajania
    armed: false
  });
  playMineBeep(false);
}

// Omijanie min przez przeciwników: wszyscy widzą miny podkładacza, podkładacz widzi także miny gracza, a Profesjonalista widzi 50% min gracza
function steerAwayFromMines(en) {
  let nearest = null;
  let nearestDist = Infinity;
  const consider = (m) => {
    const d = Math.hypot(en.x - m.x, en.y - m.y);
    if (d < nearestDist) {
      nearestDist = d;
      nearest = m;
    }
  };
  for (const m of enemyMines) consider(m);
  if (en.kind === 'miner') {
    for (const m of placedMines) consider(m);
  } else if (en.kind === 'pro' || en.kind === 'returning_pro') {
    for (const m of placedMines) {
      if (m.visibleToPro) consider(m);
    }
  }
  if (!nearest) return;
  const safeDist = nearest.triggerRadius + en.radius + 30;
  if (nearestDist >= safeDist) return;

  if (en.dodgeTimer > 0) {
    // Jeśli profesjonalista wykonuje manewr uniku przed pociskiem gracza,
    // nie pozwól minie przerwać uniku, chyba że wróg jest o krok od detonacji
    if (nearestDist > nearest.triggerRadius + en.radius + 6) {
      return;
    }
  }

  let away = Math.atan2(en.y - nearest.y, en.x - nearest.x);
  // Jeśli kierunek ucieczki prowadzi w ścianę, szukaj wolnego kierunku obok
  for (let step = 0; step <= 8; step++) {
    const delta = (step * Math.PI) / 10;
    const c1 = away + delta;
    if (canMoveTo(en.x + Math.cos(c1) * 20, en.y + Math.sin(c1) * 20, en.radius)) { away = c1; break; }
    const c2 = away - delta;
    if (canMoveTo(en.x + Math.cos(c2) * 20, en.y + Math.sin(c2) * 20, en.radius)) { away = c2; break; }
  }
  const spd = Math.max(en.speed, 0.9);
  en.vx = Math.cos(away) * spd;
  en.vy = Math.sin(away) * spd;
  en.changeDirTimer = Math.min(en.changeDirTimer, 12);
}

function updateEnemyMines() {
  for (let m = enemyMines.length - 1; m >= 0; m--) {
    const mine = enemyMines[m];
    mine.pulse += 0.14;
    if (!mine.armed) {
      mine.armFrames--;
      if (mine.armFrames <= 0) {
        mine.armed = true;
        playMineBeep(true);
      }
      continue;
    }
    if (Math.hypot(player.x - mine.x, player.y - mine.y) <= mine.triggerRadius) {
      enemyMines.splice(m, 1);
      playExplosionSound();
      const blastColor = '#a855f7';
      addPaintSplat(mine.x, mine.y, blastColor, 50);
      explosions.push({ x: mine.x, y: mine.y, radius: 10, maxRadius: mine.blastRadius, color: blastColor, alpha: 1 });
      for (let k = 0; k < 36; k++) {
        const a = Math.random() * Math.PI * 2;
        const s = 2 + Math.random() * 6;
        particles.push({
          x: mine.x, y: mine.y,
          vx: Math.cos(a) * s, vy: Math.sin(a) * s,
          r: 4 + Math.random() * 4,
          color: blastColor,
          alpha: 1
        });
      }
      player.hp = Math.max(0, player.hp - 60);
      player.hitFlash = 24;
      player.splatColor = blastColor;
      popups.push({ x: player.x, y: player.y - 30, text: '💥 MINA PODKŁADACZA! -60 HP', color: '#c084fc', alpha: 1 });
      updateHud();
      if (player.hp <= 0) {
        clouds = [];
        playerDeadPending = true;
        if (bullets.length === 0 && homingRockets.length === 0) {
          openMenu('dead');
          return true;
        }
      }
    }
  }
  return false;
}
