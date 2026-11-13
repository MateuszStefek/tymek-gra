// Główna pętla rozgrywki, fizyka kolizji, logika min, amunicji, przeciwników oraz obsługa wejścia

function rectCircleColliding(circleX, circleY, radius, rect) {
  const distX = Math.abs(circleX - rect.x - rect.w / 2);
  const distY = Math.abs(circleY - rect.y - rect.h / 2);
  if (distX > (rect.w / 2 + radius)) return false;
  if (distY > (rect.h / 2 + radius)) return false;
  if (distX <= (rect.w / 2)) return true;
  if (distY <= (rect.h / 2)) return true;
  const dx = distX - rect.w / 2;
  const dy = distY - rect.h / 2;
  return (dx * dx + dy * dy <= (radius * radius));
}

function canMoveTo(x, y, radius) {
  if (x < radius + 12 || x > canvas.width - radius - 12) return false;
  if (y < radius + 12 || y > canvas.height - radius - 12) return false;
  for (const ob of obstacles) {
    if (rectCircleColliding(x, y, radius, ob)) return false;
  }
  return true;
}

function spawnAmmoPickup(x, y, amount) {
  ammoPickups.push({
    x: Math.max(30, Math.min(canvas.width - 30, x)),
    y: Math.max(30, Math.min(canvas.height - 30, y)),
    amount,
    radius: 15,
    pulse: Math.random() * Math.PI * 2
  });
}

function spawnRandomMapAmmo() {
  for (let tries = 0; tries < 20; tries++) {
    const rx = 60 + Math.random() * (canvas.width - 120);
    const ry = 60 + Math.random() * (canvas.height - 120);
    if (canMoveTo(rx, ry, 22) && Math.hypot(rx - player.x, ry - player.y) > 90) {
      spawnAmmoPickup(rx, ry, 10);
      popups.push({ x: rx, y: ry - 15, text: '📦 +10 NABOJÓW!', color: '#38bdf8', alpha: 1 });
      return;
    }
  }
}

function spawnRocketPickup(x, y) {
  rocketPickups.push({
    x: Math.max(35, Math.min(canvas.width - 35, x)),
    y: Math.max(35, Math.min(canvas.height - 35, y)),
    radius: 16,
    pulse: Math.random() * Math.PI * 2
  });
}

function spawnRandomMapRocket() {
  for (let tries = 0; tries < 20; tries++) {
    const rx = 65 + Math.random() * (canvas.width - 130);
    const ry = 65 + Math.random() * (canvas.height - 130);
    if (canMoveTo(rx, ry, 22) && Math.hypot(rx - player.x, ry - player.y) > 90) {
      spawnRocketPickup(rx, ry);
      popups.push({ x: rx, y: ry - 16, text: '🚀 +1 RAKIETA DO BAZOOKI!', color: '#fb923c', alpha: 1 });
      return;
    }
  }
}

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

function eliminateEnemy(j, en, splatColor) {
  addPaintSplat(en.x, en.y, splatColor, 34);
  spawnAmmoPickup(en.x, en.y, 5);
  if (Math.random() < 0.08) {
    spawnRocketPickup(en.x + 14, en.y);
  }
  eliminatedHumans.push({
    x: en.x,
    y: en.y,
    shirtColor: splatColor,
    splatColor,
    timer: 48
  });
  dropEnemyLoot(en);

  // Obsługa powracających przeciwników (Punkty 3, 4, 5, 6)
  if (en.kind && en.kind.startsWith('returning_')) {
    let delaySec = 10;
    if (en.kind === 'returning_tough' || en.kind === 'returning_pro') delaySec = 15;
    else if (en.kind === 'returning_boss') delaySec = 20;
    enemyRespawnQueue.push({
      kind: en.kind,
      timer: Math.round(delaySec * 60)
    });
  }

  enemies.splice(j, 1);

  // Punkt 15: Jeśli gracz zabije ostatniego przeciwnika, to chmury znikają
  if (enemies.length === 0) {
    clouds = [];
    levelClearPending = true;
    levelVictoryDelay = 30; // Po zabiciu ostatniego przeciwnika gra trwa jeszcze pół sekundy niezależnie od lecących pocisków
  }
  updateHud();
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

function handleLevelVictory() {
  const tStr = survivalSeconds.toFixed(1);
  lastDiamondsEarned = 0;
  if (activeCustomMapIndex === null) {
    if (!bestTimes[level] || parseFloat(tStr) < parseFloat(bestTimes[level])) {
      bestTimes[level] = tStr;
    }
    if (level + 1 > unlockedLevel) {
      unlockedLevel = level + 1;
    }
    // Za przejście poziomu > 10 otrzymuje się floor(poziom / 10) diamentów
    if (level > 10) {
      lastDiamondsEarned = Math.floor(level / 10);
      diamonds += lastDiamondsEarned;
    }
  }
  // Niewykorzystane miny (także te postawione na ziemi, które nie wybuchły) przechodzą dalej + 1 nowa mina za przejście etapu!
  minesCount += placedMines.length + 1;
  placedMines = [];
  enemyMines = [];
  saveProgress();
  updateHud();
  openMenu('level_clear');
}

function spawnClouds(count) {
  clouds = [];
  const w = Math.round(canvas.width * 0.20);  // ok. 20% szerokości mapy (~188 px)
  const h = Math.round(canvas.height * 0.20); // ok. 20% wysokości mapy (~112 px)
  const presetCenters = [
    { x: canvas.width * 0.34, y: canvas.height * 0.38 },
    { x: canvas.width * 0.68, y: canvas.height * 0.56 },
    { x: canvas.width * 0.48, y: canvas.height * 0.26 }
  ];
  for (let i = 0; i < count; i++) {
    const base = presetCenters[i % presetCenters.length];
    const cx = base.x + (Math.random() - 0.5) * 60;
    const cy = base.y + (Math.random() - 0.5) * 45;
    const puffs = [
      { ox: -w * 0.28, oy: -h * 0.12, rx: w * 0.26, ry: h * 0.32, phaseOffset: 0 },
      { ox: w * 0.28,  oy: -h * 0.10, rx: w * 0.27, ry: h * 0.32, phaseOffset: 1.5 },
      { ox: -w * 0.20, oy: h * 0.18,  rx: w * 0.28, ry: h * 0.28, phaseOffset: 3.0 },
      { ox: w * 0.22,  oy: h * 0.16,  rx: w * 0.28, ry: h * 0.29, phaseOffset: 4.5 },
      { ox: 0,         oy: -h * 0.22, rx: w * 0.31, ry: h * 0.30, phaseOffset: 2.2 }
    ];
    const driftAngle = Math.random() * Math.PI * 2;
    clouds.push({
      x: cx,
      y: cy,
      w,
      h,
      vx: Math.cos(driftAngle) * 0.28,
      vy: Math.sin(driftAngle) * 0.22,
      phase: Math.random() * Math.PI * 2,
      puffs
    });
  }
}

let enemyIdCounter = 0;

function spawnEnemyAt(x, y, kind = 'normal', index = 0) {
  const stats = typeof getEnemyKindStats === 'function' ? getEnemyKindStats(kind, index) : {
    maxHits: 1, radius: 16, shirtColor: '#ef4444', speed: 1.7, shootTimer: 60, mineImmune: false
  };

  let ex = x;
  let ey = y;
  if (!canMoveTo(ex, ey, stats.radius)) {
    for (let r = 12; r <= 90; r += 16) {
      let found = false;
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
        const tx = ex + Math.cos(a) * r;
        const ty = ey + Math.sin(a) * r;
        if (canMoveTo(tx, ty, stats.radius)) {
          ex = tx;
          ey = ty;
          found = true;
          break;
        }
      }
      if (found) break;
    }
  }

  enemies.push({
    id: ++enemyIdCounter,
    x: ex,
    y: ey,
    vx: 0,
    vy: 0,
    kind,
    hp: stats.maxHits,
    maxHp: stats.maxHits,
    mineImmune: stats.mineImmune,
    speed: stats.speed,
    radius: stats.radius,
    angle: Math.PI / 2,
    walkCycle: Math.random() * 10,
    shirtColor: stats.shirtColor,
    splatColor: null,
    changeDirTimer: 0,
    boxMinX: ex,
    boxMaxX: ex,
    boxMinY: ey,
    boxMaxY: ey,
    stuckFrames: 0,
    aiState: 'normal',
    aiStateTimer: 0,
    repositionCooldown: 0,
    repositionTarget: null,
    orbitSign: Math.random() < 0.5 ? 1 : -1,
    shootTimer: stats.shootTimer,
    mineTimer: 15 * 60,
    shieldAngle: Math.PI / 2,
    dodgeTimer: 0,
    dodgeVx: 0,
    dodgeVy: 0,
    dodgeSign: Math.random() < 0.5 ? 1 : -1
  });
}

function getFarSpawnSpot(px, py) {
  const candidateSpots = [
    { x: 470, y: 65 },
    { x: 95, y: 75 },
    { x: 845, y: 75 },
    { x: 80, y: 260 },
    { x: 860, y: 260 },
    { x: 260, y: 65 },
    { x: 680, y: 65 },
    { x: 95, y: 490 },
    { x: 845, y: 490 },
    { x: 470, y: 495 }
  ];
  let bestSpot = null;
  let bestDist = -1;

  for (const s of candidateSpots) {
    const d = Math.hypot(s.x - px, s.y - py);
    if (d > bestDist && canMoveTo(s.x, s.y, 22)) {
      bestDist = d;
      bestSpot = s;
    }
  }

  for (let tries = 0; tries < 45; tries++) {
    const rx = 80 + Math.random() * (canvas.width - 160);
    const ry = 70 + Math.random() * (canvas.height - 140);
    const d = Math.hypot(rx - px, ry - py);
    if (d >= 340 && canMoveTo(rx, ry, 22)) {
      let onMine = false;
      for (const m of placedMines) {
        if (Math.hypot(rx - m.x, ry - m.y) < m.blastRadius + 25) { onMine = true; break; }
      }
      if (!onMine) return { x: rx, y: ry };
    }
  }

  return bestSpot || { x: 470, y: 65 };
}

function spawnEnemy(index, kind = 'normal') {
  const spots = [
    { x: 470, y: 65 },
    { x: 95, y: 75 },
    { x: 845, y: 75 },
    { x: 80, y: 260 },
    { x: 860, y: 260 },
    { x: 260, y: 65 },
    { x: 680, y: 65 },
    { x: 95, y: 345 },
    { x: 845, y: 345 }
  ];
  const spot = spots[index % spots.length];
  const ex = spot.x + (Math.random() - 0.5) * 24;
  const ey = spot.y + (Math.random() - 0.5) * 24;
  spawnEnemyAt(ex, ey, kind, index);
}

function spawnCivilian(index = 0) {
  const radius = 15;
  let cx = 470;
  let cy = 280;
  let found = false;

  for (let tries = 0; tries < 50; tries++) {
    const rx = 70 + Math.random() * (canvas.width - 140);
    const ry = 70 + Math.random() * (canvas.height - 140);
    if (!canMoveTo(rx, ry, radius + 8)) continue;
    if (Math.hypot(rx - player.x, ry - player.y) < 110) continue;

    let nearArmedMine = false;
    for (const m of placedMines) {
      if (m.armed && Math.hypot(rx - m.x, ry - m.y) < m.blastRadius + 35) {
        nearArmedMine = true;
        break;
      }
    }
    if (nearArmedMine) continue;

    cx = rx;
    cy = ry;
    found = true;
    break;
  }

  if (!found) {
    const fallbackSpots = [
      { x: 240, y: 170 },
      { x: 700, y: 170 },
      { x: 240, y: 390 },
      { x: 700, y: 390 }
    ];
    const spot = fallbackSpots[index % fallbackSpots.length];
    if (canMoveTo(spot.x, spot.y, radius)) {
      cx = spot.x;
      cy = spot.y;
    }
  }

  const initAngle = Math.random() * Math.PI * 2;
  const speed = 1.35 + Math.random() * 0.25;
  civilians.push({
    x: cx,
    y: cy,
    vx: Math.cos(initAngle) * speed,
    vy: Math.sin(initAngle) * speed,
    isCivilian: true,
    hp: 2, // Przetrwa dokładnie 1 strzał (ma 2 HP)
    maxHp: 2,
    speed,
    radius,
    angle: initAngle,
    walkCycle: Math.random() * 10,
    splatColor: null,
    changeDirTimer: 35 + Math.random() * 55
  });
}

// Podkładacz min po zabiciu dropuje nową minę dla gracza
function dropEnemyLoot(en) {
  if (en.kind !== 'miner') return;
  minesCount += 1;
  saveProgress();
  playPickupSound();
  popups.push({ x: en.x, y: en.y - 28, text: '💣 +1 MINA!', color: '#facc15', alpha: 1 });
  updateHud();
}

// Podkładacz min kładzie nową minę dokładnie w swojej pozycji (maks. 12 min naraz)
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

// Profesjonalista unika wejścia na linię strzału gracza, jeśli punkt startu naboju wynosi co najmniej 25% ekranu
function steerAwayFromPlayerBullets(en) {
  // Jeśli przeciwnik jest już w trakcie zdecydowanego uniku w wybraną stronę, kontynuuj ten manewr bez drgania
  if (en.dodgeTimer > 0) {
    en.dodgeTimer--;
    if (canMoveTo(en.x + en.dodgeVx, en.y + en.dodgeVy, en.radius)) {
      en.vx = en.dodgeVx;
      en.vy = en.dodgeVy;
      return;
    } else {
      // Uderzył w ścianę podczas uniku — spróbuj odwrócić unik w przeciwną stronę
      en.dodgeVx *= -1;
      en.dodgeVy *= -1;
      en.dodgeSign = -(en.dodgeSign || 1);
      if (canMoveTo(en.x + en.dodgeVx, en.y + en.dodgeVy, en.radius)) {
        en.vx = en.dodgeVx;
        en.vy = en.dodgeVy;
        return;
      }
      en.dodgeTimer = 0;
    }
  }

  const minStartDist = canvas.width * 0.25; // 25% szerokości ekranu (~235 px)
  let mostThreateningBullet = null;
  let minTimeToImpact = Infinity;
  let chosenNormalX = 0;
  let chosenNormalY = 0;

  for (const b of bullets) {
    if (!b.fromPlayer) continue;
    const startX = typeof b.startX === 'number' ? b.startX : b.x;
    const startY = typeof b.startY === 'number' ? b.startY : b.y;

    // Zapamiętaj odległość punktu startowego od wroga w momencie wystrzału / pierwszego wykrycia,
    // aby podbiegnięcie wroga w locie nie wyłączało nagle reguły uniku
    if (!b.distToPro) b.distToPro = {};
    const proKey = en.id || 1;
    if (typeof b.distToPro[proKey] !== 'number') {
      b.distToPro[proKey] = Math.hypot(startX - en.x, startY - en.y);
    }
    if (b.distToPro[proKey] < minStartDist) continue;

    const bSpeed = Math.hypot(b.vx, b.vy);
    if (bSpeed < 0.1) continue;

    const dx = en.x - b.x;
    const dy = en.y - b.y;
    // Rzut pozycji przeciwnika na wektor lotu pocisku
    const proj = (dx * b.vx + dy * b.vy) / bSpeed;
    if (proj <= 0 || proj > 950) continue; // Pocisk nie leci w stronę wroga lub jest zbyt daleko

    const ux = b.vx / bSpeed;
    const uy = b.vy / bSpeed;

    // Najbliższy punkt na linii strzału
    const closestX = b.x + ux * proj;
    const closestY = b.y + uy * proj;
    const perpX = en.x - closestX;
    const perpY = en.y - closestY;
    const distToLine = Math.hypot(perpX, perpY);

    const timeToImpact = proj / bSpeed; // Czas dolotu pocisku w klatkach

    // Wektor prostopadły oddalający od linii strzału (w stronę, po której stoi wróg)
    let outX = 0;
    let outY = 0;
    if (distToLine > 0.5) {
      outX = perpX / distToLine;
      outY = perpY / distToLine;
    } else {
      const nx = -uy;
      const ny = ux;
      const side = en.dodgeSign || 1;
      outX = nx * side;
      outY = ny * side;
    }

    // 1. ZAKAZ WCHODZENIA POD STRZAŁ Z DALEKA:
    // Jeśli marker leci z daleka, a wróg idzie W STRONĘ linii strzału (en.vx, en.vy zbliża go do linii),
    // Profesjonalista zatrzymuje się przed linią lub skręca z dala od toru lotu!
    const approachSpeed = -(en.vx * outX + en.vy * outY); // Dodatnie, jeśli prędkość zmierza do linii
    if (distToLine < en.radius + 80 && approachSpeed > 0) {
      en.vx += outX * (approachSpeed + 1.2);
      en.vy += outY * (approachSpeed + 1.2);
      en.changeDirTimer = Math.max(en.changeDirTimer, 18);
    }

    // 2. PRZEWIDYWANIE KOLIZJI I UNIK (DODGE):
    // Gdzie wróg znajdzie się za timeToImpact klatek, jeśli zachowa obecny wektor:
    const futureX = en.x + en.vx * timeToImpact;
    const futureY = en.y + en.vy * timeToImpact;
    const futureDistToLine = Math.hypot(futureX - closestX, futureY - closestY);

    const dangerZone = en.radius + 36;
    if (distToLine < dangerZone || futureDistToLine < dangerZone) {
      if (timeToImpact < minTimeToImpact) {
        minTimeToImpact = timeToImpact;
        mostThreateningBullet = b;

        // Sprawdź czy wybrana strona nie jest zablokowana przez ścianę
        let testOutX = outX;
        let testOutY = outY;
        if (!canMoveTo(en.x + testOutX * 28, en.y + testOutY * 28, en.radius)) {
          if (canMoveTo(en.x - testOutX * 28, en.y - testOutY * 28, en.radius)) {
            testOutX = -testOutX;
            testOutY = -testOutY;
          }
        }

        // Zapamiętaj stronę uniku, by nie oscylować
        en.dodgeSign = (testOutX * (-uy) + testOutY * ux) >= 0 ? 1 : -1;
        chosenNormalX = testOutX;
        chosenNormalY = testOutY;
      }
    }
  }

  if (!mostThreateningBullet) return;

  // Szybki, zdecydowany odskok z toru lotu pocisku
  const dodgeSpeed = Math.max(en.speed * 1.9, 3.8);
  en.dodgeVx = chosenNormalX * dodgeSpeed;
  en.dodgeVy = chosenNormalY * dodgeSpeed;
  en.dodgeTimer = Math.min(Math.max(18, Math.round(minTimeToImpact + 8)), 32);
  en.vx = en.dodgeVx;
  en.vy = en.dodgeVy;
  en.changeDirTimer = Math.max(en.changeDirTimer, en.dodgeTimer + 10);
}

// Aktualizacja min podkładacza; zwraca true, jeśli gracz zginął (przerwij dalszą aktualizację klatki)
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

function damageCivilian(civIdx, dmg, splatColor) {
  const civ = civilians[civIdx];
  if (!civ) return;

  civ.hp -= dmg;
  civ.splatColor = splatColor;
  addPaintSplat(civ.x, civ.y, splatColor, civ.hp <= 0 ? 30 : 16);

  for (let k = 0; k < (civ.hp <= 0 ? 22 : 10); k++) {
    const a = Math.random() * Math.PI * 2;
    const s = 1.5 + Math.random() * 4.5;
    particles.push({
      x: civ.x,
      y: civ.y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      r: 4 + Math.random() * 3,
      color: splatColor,
      alpha: 1
    });
  }

  if (civ.hp > 0) {
    popups.push({
      x: civ.x,
      y: civ.y - 26,
      text: `⚠️ UWAŻAJ! TO CYWIL! (${civ.hp}/${civ.maxHp} ❤️)`,
      color: '#38bdf8',
      alpha: 1
    });
    return;
  }

  // Cywil został zabity!
  eliminatedHumans.push({
    x: civ.x,
    y: civ.y,
    shirtColor: '#f8fafc',
    splatColor,
    timer: 50
  });
  civilians.splice(civIdx, 1);

  // Zabity cywil respawnuje się po 5 sekundach (300 klatek)
  civilianRespawnQueue.push({ timer: 5 * 60 });

  // Kara za zabicie cywila: zmniejsza HP oraz maksymalne HP o 50 (maksymalne HP wraca do domyślnego po zakończeniu poziomu)
  player.maxHp = Math.max(1, player.maxHp - 50);
  player.hp = Math.max(0, player.hp - 50);
  player.hitFlash = 28;
  player.splatColor = '#ef4444';

  popups.push({
    x: player.x,
    y: player.y - 34,
    text: '💀 ZABIŁEŚ CYWILA! -50 HP i -50 MAX HP!',
    color: '#ef4444',
    alpha: 1
  });

  updateHud();
  if (player.hp <= 0 && gameState === 'playing') {
    openMenu('dead');
  }
}

function startLevel(targetLevel) {
  if (menuCountdownInterval) {
    clearInterval(menuCountdownInterval);
    menuCountdownInterval = null;
  }
  // Jeśli na planszy zostały niewykorzystane miny z poprzedniej próby, wracają do puli
  if (placedMines.length > 0) {
    minesCount += placedMines.length;
    placedMines = [];
  }

  activeCustomMapIndex = null;
  hasStartedAnyGame = true;
  level = targetLevel;
  const cfg = getLevelConfig(level);
  currentArena = cfg.arena;
  obstacles = cfg.arena.obstacles;

  menuOverlay.classList.add('hidden');
  customOverlay.classList.add('hidden');
  if (shopOverlay) shopOverlay.classList.add('hidden');
  if (settingsOverlay) settingsOverlay.classList.add('hidden');
  if (enemiesOverlay) enemiesOverlay.classList.add('hidden');
  if (resultPopupOverlay) resultPopupOverlay.classList.add('hidden');
  resizeGameLayout();
  paintCtx.clearRect(0, 0, paintCanvas.width, paintCanvas.height);
  startTime = performance.now();
  survivalSeconds = 0;

  player.x = 470;
  player.y = 495;
  player.maxHp = getStartingMaxHp();
  player.hp = player.maxHp;
  player.hpRegenTimer = 0;
  player.healTimers = [];
  player.ammoRegenTimer = 0;
  player.ammo = getStartingAmmo(); // Zaczynamy poziom od 30 nabojów (lub 40 z ulepszeniem)
  player.rockets = getStartingRockets(); // Standardowa bazooka: 3 rakiety na starcie (5 po wzmocnieniu ze sklepu)
  player.emptyBazookaTries = 0;
  player.weapon = ownedWeapons.includes(defaultWeapon) ? defaultWeapon : 'pistol';
  player.hitFlash = 0;
  player.splatColor = null;

  enemies = [];
  enemyRespawnQueue = [];
  levelClearPending = false;
  playerDeadPending = false;
  player.vx = 0;
  player.vy = 0;
  enemyMines = [];
  civilians = [];
  civilianRespawnQueue = [];
  bullets = [];
  homingRockets = [];
  ammoPickups = [];
  rocketPickups = [];
  popups = [];
  ammoSpawnTimer = 360;
  rocketSpawnTimer = 1500;
  explosions = [];
  particles = [];
  splats = [];
  eliminatedHumans = [];
  gameState = 'playing';
  levelBannerTimer = 85;
  levelClearPending = false;
  levelVictoryDelay = 0;
  playerDeadPending = false;

  totalEnemiesInLevel = cfg.roster.length;
  for (let i = 0; i < cfg.roster.length; i++) {
    spawnEnemy(i, cfg.roster[i]);
  }
  const civCount = typeof cfg.civilians === 'number' ? cfg.civilians : 1;
  for (let i = 0; i < civCount; i++) {
    spawnCivilian(i);
  }
  spawnClouds(cfg.clouds || 0);
  saveProgress();
  updateHud();
  canvas.focus();
}

function startCustomMap(idx) {
  // Mapa z zablokowanymi (jeszcze nieodkrytymi) przeciwnikami nie może zostać uruchomiona
  const lockedKinds = getLockedKindsInCustomMap(customMaps[idx]);
  if (lockedKinds.length > 0) {
    popups.push({
      x: player.x,
      y: player.y - 30,
      text: `🔒 Zablokowani przeciwnicy: ${lockedKinds.join(', ')}`,
      color: '#ef4444',
      alpha: 1
    });
    return;
  }
  if (menuCountdownInterval) {
    clearInterval(menuCountdownInterval);
    menuCountdownInterval = null;
  }
  if (placedMines.length > 0) {
    minesCount += placedMines.length;
    placedMines = [];
  }

  activeCustomMapIndex = idx;
  hasStartedAnyGame = true;
  const cm = customMaps[idx];
  currentArena = arenaLayouts[cm.arenaIndex % arenaLayouts.length];
  obstacles = currentArena.obstacles;

  menuOverlay.classList.add('hidden');
  customOverlay.classList.add('hidden');
  if (shopOverlay) shopOverlay.classList.add('hidden');
  if (settingsOverlay) settingsOverlay.classList.add('hidden');
  if (enemiesOverlay) enemiesOverlay.classList.add('hidden');
  if (resultPopupOverlay) resultPopupOverlay.classList.add('hidden');
  resizeGameLayout();
  paintCtx.clearRect(0, 0, paintCanvas.width, paintCanvas.height);
  startTime = performance.now();
  survivalSeconds = 0;

  player.x = 470;
  player.y = 495;
  player.maxHp = getStartingMaxHp();
  player.hp = player.maxHp;
  player.hpRegenTimer = 0;
  player.healTimers = [];
  player.ammoRegenTimer = 0;
  player.ammo = getStartingAmmo();
  player.rockets = getStartingRockets();
  player.emptyBazookaTries = 0;
  player.weapon = ownedWeapons.includes(defaultWeapon) ? defaultWeapon : 'pistol';
  player.hitFlash = 0;
  player.splatColor = null;

  enemies = [];
  enemyRespawnQueue = [];
  levelClearPending = false;
  playerDeadPending = false;
  player.vx = 0;
  player.vy = 0;
  enemyMines = [];
  civilians = [];
  civilianRespawnQueue = [];
  bullets = [];
  homingRockets = [];
  ammoPickups = [];
  rocketPickups = [];
  popups = [];
  ammoSpawnTimer = 360;
  rocketSpawnTimer = 1500;
  explosions = [];
  particles = [];
  splats = [];
  eliminatedHumans = [];
  gameState = 'playing';
  levelBannerTimer = 85;
  levelClearPending = false;
  levelVictoryDelay = 0;
  playerDeadPending = false;

  const roster = [];
  for (const k of ENEMY_KIND_KEYS) {
    const cnt = cm[k] || 0;
    for (let i = 0; i < cnt; i++) roster.push(k);
  }
  if (roster.length === 0) roster.push('normal');

  totalEnemiesInLevel = roster.length;
  for (let i = 0; i < roster.length; i++) {
    spawnEnemy(i, roster[i]);
  }
  const civCount = typeof cm.civilians === 'number' ? cm.civilians : 1;
  for (let i = 0; i < civCount; i++) {
    spawnCivilian(i);
  }
  spawnClouds(typeof cm.clouds === 'number' ? cm.clouds : 1);
  saveProgress();
  updateHud();
  canvas.focus();
}

function firePaintball(fromX, fromY, angle, fromPlayer) {
  if (fromPlayer) {
    if (player.hp <= 0) return;
    if (player.ammo <= 0) {
      playEmptyAmmoSound();
      popups.push({ x: player.x, y: player.y - 28, text: 'BRAK NABOJÓW!', color: '#ef4444', alpha: 1 });
      return;
    }
    player.ammo--;
    updateHud();
    playShootSound();
  }
  const color = fromPlayer
    ? colors[Math.floor(Math.random() * colors.length)]
    : '#ef4444';
  const speed = fromPlayer ? 9.8 : 5.2;
  bullets.push({
    x: fromX + Math.cos(angle) * 24,
    y: fromY + Math.sin(angle) * 24,
    startX: fromX,
    startY: fromY,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    color,
    fromPlayer,
    life: 100
  });
}

// Bazooka śledzi najbliższego przeciwnika LUB cywila (jeśli pechowo jest najbliżej kursora myszy!)
function findNearestEnemy(fromX, fromY) {
  let best = null;
  let bestDist = Infinity;
  for (const en of enemies) {
    const d = Math.hypot(en.x - fromX, en.y - fromY);
    if (d < bestDist) {
      bestDist = d;
      best = en;
    }
  }
  for (const civ of civilians) {
    const d = Math.hypot(civ.x - fromX, civ.y - fromY);
    if (d < bestDist) {
      bestDist = d;
      best = civ;
    }
  }
  return best;
}

function normalizeAngleDiff(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function computeObstacleAvoidingAngle(rx, ry, currentAngle, targetX, targetY) {
  const desiredAngle = Math.atan2(targetY - ry, targetX - rx);
  const distToTarget = Math.hypot(targetX - rx, targetY - ry);

  // Sprawdź czy linia prosta do celu jest wolna od przeszkód
  let directClear = true;
  const checkSteps = Math.min(8, Math.ceil(distToTarget / 22));
  for (let s = 1; s <= checkSteps; s++) {
    const d = Math.min(distToTarget, s * 22);
    const tx = rx + Math.cos(desiredAngle) * d;
    const ty = ry + Math.sin(desiredAngle) * d;
    if (!canMoveTo(tx, ty, 8)) {
      directClear = false;
      break;
    }
  }
  if (directClear) {
    return desiredAngle;
  }

  // Jeśli na drodze jest przeszkoda, oceń 20 kierunków wokół rakiety (steering feelers)
  let bestAngle = currentAngle;
  let bestScore = -Infinity;
  const numDirs = 20;
  for (let i = 0; i < numDirs; i++) {
    const candAngle = -Math.PI + (i / numDirs) * Math.PI * 2;
    let clearDist = 0;
    const maxLook = 110;
    for (let d = 16; d <= maxLook; d += 16) {
      const tx = rx + Math.cos(candAngle) * d;
      const ty = ry + Math.sin(candAngle) * d;
      if (canMoveTo(tx, ty, 9)) {
        clearDist = d;
      } else {
        break;
      }
    }
    if (clearDist < 16) continue;

    const diffToGoal = Math.abs(normalizeAngleDiff(candAngle - desiredAngle));
    const diffToCurrent = Math.abs(normalizeAngleDiff(candAngle - currentAngle));
    const score = clearDist * 1.6 - diffToGoal * 55 - diffToCurrent * 18;
    if (score > bestScore) {
      bestScore = score;
      bestAngle = candAngle;
    }
  }
  return bestAngle;
}

// Wyznacza kąt ruchu dla wroga idącego do punktu docelowego z omijaniem przeszkód (przez rogi przeszkód)
function computeEnemyPathAngle(en, targetX, targetY) {
  const pad = en.radius + 16;
  const distToTarget = Math.hypot(targetX - en.x, targetY - en.y);
  const directAngle = Math.atan2(targetY - en.y, targetX - en.x);

  // Sprawdź pierwszą przeszkodę na linii do celu
  let blockingOb = null;
  const steps = Math.max(4, Math.ceil(distToTarget / 14));
  for (let s = 1; s <= steps; s++) {
    const d = Math.min(distToTarget, s * 14);
    const tx = en.x + Math.cos(directAngle) * d;
    const ty = en.y + Math.sin(directAngle) * d;
    for (const ob of obstacles) {
      if (rectCircleColliding(tx, ty, en.radius + 4, ob)) {
        blockingOb = ob;
        break;
      }
    }
    if (blockingOb) break;
  }

  let aimX = targetX;
  let aimY = targetY;

  if (blockingOb) {
    // Wybierz najlepszy róg przeszkody, przez który można ją ominąć
    const corners = [
      { x: blockingOb.x - pad, y: blockingOb.y - pad },
      { x: blockingOb.x + blockingOb.w + pad, y: blockingOb.y - pad },
      { x: blockingOb.x - pad, y: blockingOb.y + blockingOb.h + pad },
      { x: blockingOb.x + blockingOb.w + pad, y: blockingOb.y + blockingOb.h + pad }
    ];
    let bestCorner = null;
    let bestCost = Infinity;
    for (const c of corners) {
      if (!canMoveTo(c.x, c.y, en.radius)) continue;
      const d1 = Math.hypot(c.x - en.x, c.y - en.y);
      const d2 = Math.hypot(targetX - c.x, targetY - c.y);
      if (d1 < 12) continue;
      const cost = d1 + d2;
      if (cost < bestCost) {
        bestCost = cost;
        bestCorner = c;
      }
    }
    if (bestCorner) {
      aimX = bestCorner.x;
      aimY = bestCorner.y;
    }
  }

  const desiredAngle = Math.atan2(aimY - en.y, aimX - en.x);
  if (canMoveTo(en.x + Math.cos(desiredAngle) * 18, en.y + Math.sin(desiredAngle) * 18, en.radius)) {
    return desiredAngle;
  }

  // Jeśli bezpośrednio przed wrogiem jest ściana, szukaj wolnego kierunku z preferencją orbitSign
  for (let step = 1; step <= 16; step++) {
    const delta = (step * Math.PI) / 16;
    const cand1 = desiredAngle + delta * en.orbitSign;
    if (canMoveTo(en.x + Math.cos(cand1) * 20, en.y + Math.sin(cand1) * 20, en.radius)) {
      return cand1;
    }
    const cand2 = desiredAngle - delta * en.orbitSign;
    if (canMoveTo(en.x + Math.cos(cand2) * 20, en.y + Math.sin(cand2) * 20, en.radius)) {
      return cand2;
    }
  }
  return desiredAngle;
}

function getBestFallbackWeapon() {
  // Zwraca najlepszą posiadaną broń bez limitu rakiet (np. Marker Paintballowy)
  let best = weaponsCatalog[0];
  for (const w of weaponsCatalog) {
    if (w.id !== 'bazooka' && ownedWeapons.includes(w.id) && w.cost >= best.cost) {
      best = w;
    }
  }
  return best;
}

function firePlayerWeapon(fromX, fromY, angle) {
  if (player.hp <= 0) return;
  if (player.weapon === 'bazooka') {
    if (player.rockets <= 0) {
      player.emptyBazookaTries = (player.emptyBazookaTries || 0) + 1;
      player.cooldown = 18;
      if (player.emptyBazookaTries >= 2) {
        player.emptyBazookaTries = 0;
        const fallback = getBestFallbackWeapon();
        player.weapon = fallback.id;
        playReloadSound();
        popups.push({
          x: player.x,
          y: player.y - 30,
          text: `🔄 PRZEŁADOWANIE: ${fallback.shortName}!`,
          color: '#fde047',
          alpha: 1
        });
        updateHud();
      } else {
        playEmptyAmmoSound();
        popups.push({ x: player.x, y: player.y - 28, text: 'BRAK RAKIET! 🚀 (1/2)', color: '#ef4444', alpha: 1 });
      }
      return;
    }
    player.emptyBazookaTries = 0;
    player.rockets--;
    updateHud();
    playRocketLaunchSound();
    // Celuj w przeciwnika najbliższego do wskaźnika myszy (mouse.x, mouse.y)
    const target = findNearestEnemy(mouse.x, mouse.y);
    homingRockets.push({
      x: fromX + Math.cos(angle) * 26,
      y: fromY + Math.sin(angle) * 26,
      angle,
      speed: 5.4,
      target,
      color: '#fb923c',
      life: 480
    });
    player.cooldown = 28;
  } else {
    firePaintball(fromX, fromY, angle, true);
    player.cooldown = 10;
  }
}
// Event listenery przycisków i wejścia
btnPause.addEventListener('click', togglePause);

let diamondCheatClicks = 0;
if (diamondStatBox) {
  diamondStatBox.addEventListener('click', () => {
    diamondCheatClicks++;
    if (diamondCheatClicks >= 7) {
      diamondCheatClicks = 0;
      diamonds += 10;
      playPickupSound();
      saveProgress();
      updateHud();
      popups.push({
        x: player.x,
        y: player.y - 32,
        text: '💎 +10 DIAMENTÓW!',
        color: '#38bdf8',
        alpha: 1
      });
      if (gameState === 'shop') {
        renderShopWeapons();
      } else if (gameState === 'menu' || gameState === 'level_clear' || gameState === 'dead') {
        openMenu(gameState === 'menu' ? 'select' : gameState);
      }
    }
  });
}

if (btnOpenShop) {
  btnOpenShop.addEventListener('click', () => {
    if (gameState === 'shop') {
      shopOverlay.classList.add('hidden');
      startTime = performance.now() - survivalSeconds * 1000;
      gameState = 'playing';
      updatePauseButtonUI();
      canvas.focus();
    } else {
      openShopScreen();
      updatePauseButtonUI();
    }
  });
}

if (btnSwitchWeapon) {
  btnSwitchWeapon.addEventListener('click', switchWeaponInStage);
}

if (btnShopToLevels) {
  btnShopToLevels.addEventListener('click', () => openMenu('select'));
}

if (btnCloseShop) {
  btnCloseShop.addEventListener('click', () => {
    shopOverlay.classList.add('hidden');
    if (!hasStartedAnyGame) {
      startLevel(level);
    } else {
      startTime = performance.now() - survivalSeconds * 1000;
      gameState = 'playing';
      updatePauseButtonUI();
      canvas.focus();
    }
  });
}

if (btnOpenSettings) {
  btnOpenSettings.addEventListener('click', () => {
    if (gameState === 'settings') {
      settingsOverlay.classList.add('hidden');
      if (!hasStartedAnyGame) {
        openMenu('select');
      } else {
        startTime = performance.now() - survivalSeconds * 1000;
        gameState = 'playing';
        updatePauseButtonUI();
        canvas.focus();
      }
    } else {
      openSettingsScreen();
      updatePauseButtonUI();
    }
  });
}

if (btnSettingsToLevels) {
  btnSettingsToLevels.addEventListener('click', () => openMenu('select'));
}

if (btnCloseSettings) {
  btnCloseSettings.addEventListener('click', () => {
    settingsOverlay.classList.add('hidden');
    if (!hasStartedAnyGame) {
      startLevel(level);
    } else {
      startTime = performance.now() - survivalSeconds * 1000;
      gameState = 'playing';
      updatePauseButtonUI();
      canvas.focus();
    }
  });
}

if (btnOpenEnemies) {
  btnOpenEnemies.addEventListener('click', () => {
    if (gameState === 'enemies') {
      enemiesOverlay.classList.add('hidden');
      if (!hasStartedAnyGame) {
        openMenu('select');
      } else {
        startTime = performance.now() - survivalSeconds * 1000;
        gameState = 'playing';
        updatePauseButtonUI();
        canvas.focus();
      }
    } else {
      openEnemiesScreen();
      updatePauseButtonUI();
    }
  });
}

if (btnEnemiesToLevels) {
  btnEnemiesToLevels.addEventListener('click', () => openMenu('select'));
}

if (btnCloseEnemies) {
  btnCloseEnemies.addEventListener('click', () => {
    enemiesOverlay.classList.add('hidden');
    if (!hasStartedAnyGame) {
      startLevel(level);
    } else {
      startTime = performance.now() - survivalSeconds * 1000;
      gameState = 'playing';
      updatePauseButtonUI();
      canvas.focus();
    }
  });
}

btnOpenMenu.addEventListener('click', () => {
  if (gameState === 'menu') {
    menuOverlay.classList.add('hidden');
    resizeGameLayout();
    startTime = performance.now() - survivalSeconds * 1000;
    gameState = 'playing';
    updatePauseButtonUI();
    canvas.focus();
  } else {
    openMenu('select');
    updatePauseButtonUI();
  }
});

btnOpenCustom.addEventListener('click', () => {
  if (gameState === 'custom_maps') {
    customOverlay.classList.add('hidden');
    startTime = performance.now() - survivalSeconds * 1000;
    gameState = 'playing';
    updatePauseButtonUI();
    canvas.focus();
  } else {
    openCustomMapsScreen(null);
    updatePauseButtonUI();
  }
});

btnAddCustomMap.addEventListener('click', () => {
  customMaps.push({
    name: `Własna Mapa ${customMaps.length + 1}`,
    arenaIndex: customMaps.length % arenaLayouts.length,
    clouds: 1,
    civilians: 1,
    normal: 1,
    tough: getUnlockedEnemyKinds().has('tough') ? 1 : 0,
    rapid: getUnlockedEnemyKinds().has('rapid') ? 1 : 0,
    boss: 0
  });
  saveProgress();
  openCustomMapsScreen(customMaps.length - 1);
});

btnCustomToLevels.addEventListener('click', () => {
  openMenu('select');
});

btnCloseCustom.addEventListener('click', () => {
  customOverlay.classList.add('hidden');
  startTime = performance.now() - survivalSeconds * 1000;
  gameState = 'playing';
  updatePauseButtonUI();
  canvas.focus();
});

btnPrevLevel.addEventListener('click', () => {
  if (level > 1) startLevel(level - 1);
});

btnNextLevel.addEventListener('click', () => {
  if (level < unlockedLevel) startLevel(level + 1);
});

btnPlaceMine.addEventListener('click', placeMine);
if (btnTheme) btnTheme.addEventListener('click', cycleGraphicTheme);

function toggleFullscreen() {
  const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
  if (!isFs) {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch(() => {});
    } else if (elem.webkitRequestFullscreen) {
      elem.webkitRequestFullscreen();
    } else if (elem.mozRequestFullScreen) {
      elem.mozRequestFullScreen();
    } else if (elem.msRequestFullscreen) {
      elem.msRequestFullscreen();
    }
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if (document.mozCancelFullScreen) {
      document.mozCancelFullScreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    }
  }
}

function updateFullscreenButton() {
  if (!btnFullscreen) return;
  const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
  btnFullscreen.textContent = isFs ? '🗗 Wyjdź z pełnego ekranu' : '⛶ Pełny ekran';
  btnFullscreen.classList.toggle('active', isFs);
}

if (btnFullscreen) {
  btnFullscreen.addEventListener('click', toggleFullscreen);
}
document.addEventListener('fullscreenchange', updateFullscreenButton);
document.addEventListener('webkitfullscreenchange', updateFullscreenButton);

// Wykrywanie urządzeń dotykowych i inicjalizacja kontrolek
function checkTouchSupport() {
  const isPureTouch = (('ontouchstart' in window) || navigator.maxTouchPoints > 0) &&
    !window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (isPureTouch) {
    isTouchDevice = true;
    if (touchActionGroup) touchActionGroup.classList.remove('hidden');
  }
}
checkTouchSupport();

// Odblokowanie Web Audio API na iOS Safari przy pierwszym dotknięciu
window.addEventListener('touchstart', () => {
  ensureAudio();
  isTouchDevice = true;
  if (touchActionGroup) touchActionGroup.classList.remove('hidden');
}, { passive: true });

// Przyciski akcji na ekranie dotykowym
if (touchBtnMine) {
  touchBtnMine.addEventListener('touchstart', e => {
    e.preventDefault();
    e.stopPropagation();
    ensureAudio();
    if (gameState === 'playing') placeMine();
  }, { passive: false });
  touchBtnMine.addEventListener('click', e => {
    e.preventDefault();
    if (gameState === 'playing') placeMine();
  });
}

if (touchBtnWeapon) {
  touchBtnWeapon.addEventListener('touchstart', e => {
    e.preventDefault();
    e.stopPropagation();
    ensureAudio();
    switchWeaponInStage();
  }, { passive: false });
  touchBtnWeapon.addEventListener('click', e => {
    e.preventDefault();
    switchWeaponInStage();
  });
}

// Obsługa multi-touch (lewa ręka: joystick, prawa ręka: celowanie i strzelanie)
function handleCanvasTouchStart(e) {
  ensureAudio();
  if (!isTouchDevice) {
    isTouchDevice = true;
    if (touchActionGroup) touchActionGroup.classList.remove('hidden');
  }

  // Nie przechwytuj dotknięć w przyciski górnego paska, nakładki menu, przyciski akcji ani formularze
  if (e.target.closest('button, .topbar, .overlay, .popup-backdrop, input, a, .touch-action-btn')) {
    return;
  }

  if (gameState === 'paused') {
    togglePause();
    e.preventDefault();
    return;
  }
  if (gameState !== 'playing') return;
  e.preventDefault();

  const rect = canvas.getBoundingClientRect();
  const screenMidX = Math.max(rect.left + rect.width * 0.45, window.innerWidth * 0.48);

  for (let i = 0; i < e.changedTouches.length; i++) {
    const t = e.changedTouches[i];
    const clientX = t.clientX;
    const clientY = t.clientY;

    // Lewa strona ekranu (także w marginesie poza planszą!) steruje ruchem gracza (joystick)
    if (clientX < screenMidX && touchJoystick.identifier === null) {
      touchJoystick.active = true;
      touchJoystick.identifier = t.identifier;
      touchJoystick.baseX = clientX;
      touchJoystick.baseY = clientY;
      touchJoystick.dx = 0;
      touchJoystick.dy = 0;

      if (joystickBase && joystickThumb) {
        joystickBase.style.left = touchJoystick.baseX + 'px';
        joystickBase.style.top = touchJoystick.baseY + 'px';
        joystickThumb.style.left = '50%';
        joystickThumb.style.top = '50%';
        joystickBase.style.display = 'block';
      }
    } else if (touchAimId === null) {
      // Prawa strona ekranu: celowanie i strzał
      touchAimId = t.identifier;
      const canvasX = (clientX - rect.left) * (canvas.width / rect.width);
      const canvasY = (clientY - rect.top) * (canvas.height / rect.height);
      mouse.x = Math.max(0, Math.min(canvas.width, canvasX));
      mouse.y = Math.max(0, Math.min(canvas.height, canvasY));
      mouse.active = true;
      mouse.down = true;
      const angle = Math.atan2(canvasY - player.y, canvasX - player.x);
      firePlayerWeapon(player.x, player.y, angle);
    }
  }
}

function handleCanvasTouchMove(e) {
  if (touchJoystick.identifier === null && touchAimId === null) return;
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();

  for (let i = 0; i < e.changedTouches.length; i++) {
    const t = e.changedTouches[i];
    if (t.identifier === touchJoystick.identifier) {
      const curX = t.clientX;
      const curY = t.clientY;
      const diffX = curX - touchJoystick.baseX;
      const diffY = curY - touchJoystick.baseY;
      const dist = Math.hypot(diffX, diffY);
      const maxR = touchJoystick.radius;
      const clampedDist = Math.min(dist, maxR);
      const angle = Math.atan2(diffY, diffX);
      const defX = Math.cos(angle) * clampedDist;
      const defY = Math.sin(angle) * clampedDist;

      touchJoystick.dx = defX / maxR;
      touchJoystick.dy = defY / maxR;

      if (joystickThumb) {
        joystickThumb.style.left = `calc(50% + ${defX}px)`;
        joystickThumb.style.top = `calc(50% + ${defY}px)`;
      }
    } else if (t.identifier === touchAimId) {
      const canvasX = (t.clientX - rect.left) * (canvas.width / rect.width);
      const canvasY = (t.clientY - rect.top) * (canvas.height / rect.height);
      mouse.x = Math.max(0, Math.min(canvas.width, canvasX));
      mouse.y = Math.max(0, Math.min(canvas.height, canvasY));
      mouse.active = true;
    }
  }
}

function handleCanvasTouchEnd(e) {
  for (let i = 0; i < e.changedTouches.length; i++) {
    const t = e.changedTouches[i];
    if (t.identifier === touchJoystick.identifier) {
      touchJoystick.active = false;
      touchJoystick.identifier = null;
      touchJoystick.dx = 0;
      touchJoystick.dy = 0;
      if (joystickBase) joystickBase.style.display = 'none';
    }
    if (t.identifier === touchAimId) {
      touchAimId = null;
      mouse.down = false;
      pointerReleasedAfterMenuOpen = true;
    }
  }
}

document.addEventListener('touchstart', handleCanvasTouchStart, { passive: false });
document.addEventListener('touchmove', handleCanvasTouchMove, { passive: false });
document.addEventListener('touchend', handleCanvasTouchEnd, { passive: false });
document.addEventListener('touchcancel', handleCanvasTouchEnd, { passive: false });

btnRetry.addEventListener('click', () => {
  if (activeCustomMapIndex !== null) startCustomMap(activeCustomMapIndex);
  else startLevel(level);
});

window.addEventListener('keydown', e => {
  if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
  keys[e.code] = true;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
    e.preventDefault();
  }
  if (e.code === 'KeyP' || e.code === 'Pause') {
    togglePause();
  } else if (e.code === 'KeyT') {
    cycleGraphicTheme();
  } else if (e.code === 'KeyQ') {
    switchWeaponInStage();
  } else if (e.code === 'KeyE' || (e.code === 'Space' && gameState === 'playing')) {
    placeMine();
  } else if (e.code === 'Escape' || e.code === 'KeyM') {
    if (gameState === 'playing' || gameState === 'paused') openMenu('select');
    else if (gameState === 'menu' || gameState === 'custom_maps' || gameState === 'shop' || gameState === 'settings' || gameState === 'enemies') {
      menuOverlay.classList.add('hidden');
      customOverlay.classList.add('hidden');
      if (shopOverlay) shopOverlay.classList.add('hidden');
      if (settingsOverlay) settingsOverlay.classList.add('hidden');
      if (enemiesOverlay) enemiesOverlay.classList.add('hidden');
      resizeGameLayout();
      startTime = performance.now() - survivalSeconds * 1000;
      gameState = 'playing';
      updatePauseButtonUI();
    }
  }
});

window.addEventListener('keyup', e => {
  keys[e.code] = false;
});

// Całkowita blokada menu kontekstowego pod prawym przyciskiem myszy (nic się nie dzieje)
window.addEventListener('contextmenu', e => {
  e.preventDefault();
});

canvas.addEventListener('mousemove', e => {
  const rect = canvas.getBoundingClientRect();
  mouse.x = (e.clientX - rect.left) * (canvas.width / rect.width);
  mouse.y = (e.clientY - rect.top) * (canvas.height / rect.height);
  mouse.active = true;
});

canvas.addEventListener('mousedown', e => {
  window.focus();
  canvas.focus();
  const rect = canvas.getBoundingClientRect();
  mouse.x = (e.clientX - rect.left) * (canvas.width / rect.width);
  mouse.y = (e.clientY - rect.top) * (canvas.height / rect.height);
  mouse.active = true;
  if (e.button === 2) {
    e.preventDefault();
    if (gameState === 'playing') {
      placeMine();
    }
    return;
  }
  if (e.button !== 0) {
    e.preventDefault();
    return;
  }
  if (gameState === 'paused') {
    togglePause();
    return;
  }
  if (gameState !== 'playing') return;
  mouse.down = true;
  mouse.active = true;
  const angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
  firePlayerWeapon(player.x, player.y, angle);
});

window.addEventListener('mouseup', () => {
  mouse.down = false;
  pointerReleasedAfterMenuOpen = true;
});

function update() {
  if (levelBannerTimer > 0) levelBannerTimer--;
  if (gameState !== 'playing') return;

  survivalSeconds = (performance.now() - startTime) / 1000;

  // Tor leczenia: dyskretne impulsy (+1 HP co 5s, +1 HP co 6s, +1 HP co 7s, +1 HP co 8s...)
  if (healingLevel > 0 && player.hp > 0 && player.hp < player.maxHp) {
    if (!Array.isArray(player.healTimers)) player.healTimers = [];
    let totalHealedThisFrame = 0;
    for (let k = 1; k <= healingLevel; k++) {
      const idx = k - 1;
      player.healTimers[idx] = (player.healTimers[idx] || 0) + 1;
      const requiredFrames = getHealingIntervalSeconds(k) * 60; // 5s=300, 6s=360, 7s=420, 8s=480...
      if (player.healTimers[idx] >= requiredFrames) {
        player.healTimers[idx] = 0;
        totalHealedThisFrame += 1;
      }
    }
    if (totalHealedThisFrame > 0) {
      const actualHealed = Math.min(player.maxHp - player.hp, totalHealedThisFrame);
      player.hp = Math.min(player.maxHp, player.hp + totalHealedThisFrame);
      if (actualHealed > 0) {
        popups.push({
          x: player.x,
          y: player.y - 26,
          text: `💚 +${actualHealed} HP`,
          color: '#4ade80',
          alpha: 1
        });
      }
      updateHud();
    }
  } else {
    player.healTimers = [];
  }

  // Tor uzupełniania nabojów: co 5 sekund gracz otrzymuje +ammoRegenLevel nabojów
  if (ammoRegenLevel > 0) {
    player.ammoRegenTimer = (player.ammoRegenTimer || 0) + 1;
    if (player.ammoRegenTimer >= 5 * 60) {
      player.ammoRegenTimer = 0;
      player.ammo += ammoRegenLevel;
      popups.push({
        x: player.x,
        y: player.y - 26,
        text: `+${ammoRegenLevel} NABOJÓW! 🎨`,
        color: '#38bdf8',
        alpha: 1
      });
      updateHud();
    }
  }

  if (player.hitFlash > 0) player.hitFlash--;

  let dx = 0;
  let dy = 0;
  if (keys['KeyW'] || keys['ArrowUp']) dy -= 1;
  if (keys['KeyS'] || keys['ArrowDown']) dy += 1;
  if (keys['KeyA'] || keys['ArrowLeft']) dx -= 1;
  if (keys['KeyD'] || keys['ArrowRight']) dx += 1;

  if (touchJoystick.active) {
    dx += touchJoystick.dx;
    dy += touchJoystick.dy;
  }

  const curPlayerX = player.x;
  const curPlayerY = player.y;

  if (dx !== 0 || dy !== 0) {
    const len = Math.hypot(dx, dy);
    const speedFactor = touchJoystick.active && !keys['KeyW'] && !keys['KeyS'] && !keys['KeyA'] && !keys['KeyD'] ? Math.min(1, len) : 1;
    const nx = player.x + (dx / len) * player.speed * speedFactor;
    const ny = player.y + (dy / len) * player.speed * speedFactor;
    if (canMoveTo(nx, player.y, player.radius)) player.x = nx;
    if (canMoveTo(player.x, ny, player.radius)) player.y = ny;
    player.walkCycle += 0.26 * speedFactor;
  }

  player.vx = player.x - curPlayerX;
  player.vy = player.y - curPlayerY;

  if (touchAimId !== null || !touchJoystick.active || mouse.down) {
    player.angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
  } else if (touchJoystick.active && (touchJoystick.dx !== 0 || touchJoystick.dy !== 0)) {
    player.angle = Math.atan2(touchJoystick.dy, touchJoystick.dx);
  }

  if (player.cooldown > 0) player.cooldown--;
  if (mouse.down && player.cooldown <= 0) {
    const spread = player.weapon === 'bazooka' ? 0 : (Math.random() - 0.5) * 0.08;
    firePlayerWeapon(player.x, player.y, player.angle + spread);
  }

  // Update enemies
  // Lekko powiększony prostokąt wykrywania utknięcia (~26% szerokości i wysokości mapy: ok. 244x145 px)
  const maxStuckW = canvas.width * 0.26;
  const maxStuckH = canvas.height * 0.26;
  const STUCK_TRIGGER_FRAMES = 12 * 60; // 12 sekund (720 klatek) przebywania w małym prostokącie uruchamia stan zagubienia

  for (let i = enemies.length - 1; i >= 0; i--) {
    const en = enemies[i];
    en.changeDirTimer--;
    if (en.repositionCooldown > 0) en.repositionCooldown--;

    const distToPlayer = Math.hypot(player.x - en.x, player.y - en.y);

    if (en.aiState === 'confused') {
      // Przez 2 sekundy (120 klatek) ma nad sobą ikonkę pytajnika ❓ (zagubiony)
      en.aiStateTimer--;
      en.vx *= 0.85;
      en.vy *= 0.85;

      if (en.aiStateTimer <= 0) {
        // Po 2 sekundach: ikonka mózgu 🧠 i wybór nowej pozycji daleko od gracza ORAZ z dala od przeszkód
        let chosenTarget = null;
        const safeClearance = en.radius + 28; // Duży zapas od przeszkód i ścian, aby pozycja zawsze była łatwo osiągalna
        for (let tries = 0; tries < 60; tries++) {
          const gx = 70 + Math.random() * (canvas.width - 140);
          const gy = 70 + Math.random() * (canvas.height - 140);
          const distFromPlayer = Math.hypot(gx - player.x, gy - player.y);
          const distFromSelf = Math.hypot(gx - en.x, gy - en.y);
          if (distFromPlayer >= 250 && distFromSelf >= 160 && canMoveTo(gx, gy, safeClearance)) {
            chosenTarget = { x: gx, y: gy };
            break;
          }
        }
        // Fallback jeśli gracz stoi na środku i trudno o 250px: wybierz najdalszy bezpieczny punkt od gracza z dużym odstępem od przeszkód
        if (!chosenTarget) {
          let bestDist = -1;
          for (let tries = 0; tries < 40; tries++) {
            const gx = 70 + Math.random() * (canvas.width - 140);
            const gy = 70 + Math.random() * (canvas.height - 140);
            const distFromPlayer = Math.hypot(gx - player.x, gy - player.y);
            const distFromSelf = Math.hypot(gx - en.x, gy - en.y);
            if (distFromSelf >= 120 && canMoveTo(gx, gy, safeClearance) && distFromPlayer > bestDist) {
              bestDist = distFromPlayer;
              chosenTarget = { x: gx, y: gy };
            }
          }
        }

        if (chosenTarget) {
          en.aiState = 'repositioning';
          en.repositionTarget = chosenTarget;
          en.aiStateTimer = 3 * 60; // Maksymalnie 3 sekundy (180 klatek) na manewr zmiany pozycji
          en.orbitSign = Math.random() < 0.5 ? 1 : -1;
        } else {
          en.aiState = 'normal';
        }
      }
    } else if (en.aiState === 'repositioning' && en.repositionTarget) {
      // Stan 🧠: idzie prosto do nowej pozycji (komenda ruchu w stronę gracza NIE nadpisuje tego stanu!)
      en.aiStateTimer--;
      const distToGoal = Math.hypot(en.repositionTarget.x - en.x, en.repositionTarget.y - en.y);
      if (distToGoal <= 32 || en.aiStateTimer <= 0) {
        // Doszedł na pozycję — wraca do normalnego stanu!
        en.aiState = 'normal';
        en.repositionTarget = null;
        en.repositionCooldown = 30 * 60; // Kolejna decyzja najwcześniej za 30 sekund (1800 klatek)
        en.boxMinX = en.x;
        en.boxMaxX = en.x;
        en.boxMinY = en.y;
        en.boxMaxY = en.y;
        en.stuckFrames = 0;
        en.changeDirTimer = 0;
      } else {
        const moveAngle = computeEnemyPathAngle(en, en.repositionTarget.x, en.repositionTarget.y);
        en.vx = Math.cos(moveAngle) * (en.speed * 1.25);
        en.vy = Math.sin(moveAngle) * (en.speed * 1.25);
      }
    } else {
      // Stan normalny: śledź prostokąt przebywania
      en.boxMinX = Math.min(en.boxMinX, en.x);
      en.boxMaxX = Math.max(en.boxMaxX, en.x);
      en.boxMinY = Math.min(en.boxMinY, en.y);
      en.boxMaxY = Math.max(en.boxMaxY, en.y);

      if ((en.boxMaxX - en.boxMinX) <= maxStuckW && (en.boxMaxY - en.boxMinY) <= maxStuckH) {
        en.stuckFrames++;
      } else {
        en.boxMinX = en.x;
        en.boxMaxX = en.x;
        en.boxMinY = en.y;
        en.boxMaxY = en.y;
        en.stuckFrames = 0;
      }

      if (en.stuckFrames >= STUCK_TRIGGER_FRAMES && en.repositionCooldown <= 0) {
        // Wykryto utknięcie w prostokącie -> przejdź w stan ❓ (zagubiony) na 2 sekundy (120 klatek)
        en.aiState = 'confused';
        en.aiStateTimer = 120;
        en.stuckFrames = 0;
      } else if (en.changeDirTimer <= 0) {
        let targetAngle;
        const roll = Math.random();
        if (roll < 0.35) {
          targetAngle = Math.random() * Math.PI * 2;
        } else if (distToPlayer < 140) {
          targetAngle = Math.atan2(en.y - player.y, en.x - player.x) + (Math.random() - 0.5) * 1.4;
        } else {
          targetAngle = Math.atan2(player.y - en.y, player.x - en.x) + (Math.random() - 0.5) * 1.8;
        }
        en.vx = Math.cos(targetAngle) * en.speed;
        en.vy = Math.sin(targetAngle) * en.speed;
        en.changeDirTimer = 25 + Math.random() * 45;
      }
    }

    if (en.kind === 'pro' || en.kind === 'returning_pro') {
      steerAwayFromPlayerBullets(en); // Profesjonalista unika wejścia na linię strzału gracza (gdy nabój wystrzelono z odległości >= 25% ekranu)
    }

    steerAwayFromMines(en); // Przeciwnicy widzą miny (podkładacza oraz — w jego przypadku — także Twoje) i je omijają

    const nx = en.x + en.vx;
    const ny = en.y + en.vy;
    if (canMoveTo(nx, en.y, en.radius)) {
      en.x = nx;
    } else if (en.aiState !== 'repositioning' && (!en.dodgeTimer || en.dodgeTimer <= 0)) {
      en.vx *= -1;
      en.vy += (Math.random() - 0.5) * en.speed;
    }
    if (canMoveTo(en.x, ny, en.radius)) {
      en.y = ny;
    } else if (en.aiState !== 'repositioning' && (!en.dodgeTimer || en.dodgeTimer <= 0)) {
      en.vy *= -1;
      en.vx += (Math.random() - 0.5) * en.speed;
    }

    en.walkCycle += 0.22;
    if (en.kind === 'shield') {
      if (typeof en.shieldAngle !== 'number') en.shieldAngle = en.angle || 0;
      const targetShieldAngle = Math.atan2(player.y - en.y, player.x - en.x);
      // Wolniejszy obrót tarczy: obrót o 180 stopni zajmuje ok. 5.2 sekundy (312 klatek przy 60 fps)
      const maxTurnRate = Math.PI / (5.2 * 60);
      let diff = targetShieldAngle - en.shieldAngle;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      if (Math.abs(diff) <= maxTurnRate) {
        en.shieldAngle = targetShieldAngle;
      } else {
        en.shieldAngle += Math.sign(diff) * maxTurnRate;
      }
      en.angle = en.shieldAngle;
    } else {
      en.angle = Math.atan2(player.y - en.y, player.x - en.x);
    }

    if (en.kind === 'miner' && player.hp > 0) {
      en.mineTimer--;
      if (en.mineTimer <= 0) {
        plantEnemyMine(en);
        en.mineTimer = 30 * 60; // Nowa mina raz na 30 sekund
      }
    }

    en.shootTimer--;
    // Punkt 13: Uwaga: gdy gracz nie żyje, przeciwnicy nie strzelają
    if (en.shootTimer <= 0 && distToPlayer < 480 && player.hp > 0) {
      if (en.kind === 'pro' || en.kind === 'returning_pro') {
        // Punkt 7: Profesjonalista bierze pod uwagę kierunek ruchu gracza i celuje z wyprzedzeniem
        const t = distToPlayer / 5.2; // prędkość pocisku przeciwnika to 5.2
        const leadX = player.x + (player.vx || 0) * t;
        const leadY = player.y + (player.vy || 0) * t;
        const aimAngle = Math.atan2(leadY - en.y, leadX - en.x) + (Math.random() - 0.5) * 0.08;
        firePaintball(en.x, en.y, aimAngle, false);
        en.shootTimer = 40 + Math.random() * 25;
      } else {
        const spread = (en.kind === 'rapid' || en.kind === 'returning_rapid') ? 0.16 : (en.kind === 'miner' ? 0.4 : 0.25);
        const aimAngle = Math.atan2(player.y - en.y, player.x - en.x) + (Math.random() - 0.5) * spread;
        firePaintball(en.x, en.y, aimAngle, false);
        if (en.kind === 'rapid' || en.kind === 'returning_rapid') {
          en.shootTimer = 14 + Math.random() * 10; // Strzela około 4 razy częściej!
        } else if (en.kind === 'miner') {
          en.shootTimer = 200 + Math.random() * 150; // Mały pistolecik — strzela całkiem rzadko
        } else {
          en.shootTimer = Math.max(35, 85 - level * 4) + Math.random() * 55;
        }
      }
    }
  }

  // Miny podkładacza: uzbrajanie i wybuch przy wejściu gracza
  if (updateEnemyMines()) return;

  // Odradzanie powracających przeciwników (Punkty 3, 4, 5, 6, 12)
  for (let q = enemyRespawnQueue.length - 1; q >= 0; q--) {
    enemyRespawnQueue[q].timer--;
    if (enemyRespawnQueue[q].timer <= 0) {
      const item = enemyRespawnQueue[q];
      enemyRespawnQueue.splice(q, 1);
      const spot = getFarSpawnSpot(player.x, player.y);
      spawnEnemyAt(spot.x, spot.y, item.kind, enemies.length);
      // Punkt 12: Jeżeli w tym czasie nie-cywil powróci na planszę, to gra wraca do normalnego stanu!
      levelClearPending = false;
      const newest = enemies[enemies.length - 1];
      if (newest) {
        popups.push({
          x: newest.x,
          y: newest.y - 24,
          text: '🔄 PRZECIWNIK POWRÓCIŁ!',
          color: '#38bdf8',
          alpha: 1
        });
      }
    }
  }

  // Odradzanie zabitych cywili po 5 sekundach (300 klatek)
  for (let q = civilianRespawnQueue.length - 1; q >= 0; q--) {
    civilianRespawnQueue[q].timer--;
    if (civilianRespawnQueue[q].timer <= 0) {
      civilianRespawnQueue.splice(q, 1);
      spawnCivilian(civilians.length);
      const newest = civilians[civilians.length - 1];
      if (newest) {
        popups.push({
          x: newest.x,
          y: newest.y - 24,
          text: '🏥 CYWIL WRÓCIŁ NA ARENĘ!',
          color: '#38bdf8',
          alpha: 1
        });
      }
    }
  }

  // Ruch cywili (chodzą losowo po mapie i omijają UZBROJONE miny; nie widzą min w trakcie uzbrajania!)
  for (let c = civilians.length - 1; c >= 0; c--) {
    const civ = civilians[c];
    civ.changeDirTimer--;

    // Sprawdź czy w pobliżu znajduje się uzbrojona mina (mine.armed === true)
    let closestArmedMine = null;
    let closestMineDist = Infinity;
    for (const m of placedMines) {
      if (!m.armed) continue; // Cywil NIE widzi min w trakcie uzbrajania!
      const d = Math.hypot(civ.x - m.x, civ.y - m.y);
      if (d < closestMineDist) {
        closestMineDist = d;
        closestArmedMine = m;
      }
    }

    for (const m of enemyMines) {
      const d = Math.hypot(civ.x - m.x, civ.y - m.y);
      if (d < closestMineDist) {
        closestMineDist = d;
        closestArmedMine = m;
      }
    }

    const safeMineDistance = closestArmedMine ? (closestArmedMine.triggerRadius + 95) : 0;
    if (closestArmedMine && closestMineDist < safeMineDistance) {
      // Wybierz ścieżkę ucieczki daleko od uzbrojonej miny
      const awayAngle = Math.atan2(civ.y - closestArmedMine.y, civ.x - closestArmedMine.x);
      let chosenAngle = awayAngle;
      for (let step = 0; step <= 8; step++) {
        const delta = (step * Math.PI) / 10;
        const c1 = awayAngle + delta;
        if (canMoveTo(civ.x + Math.cos(c1) * 20, civ.y + Math.sin(c1) * 20, civ.radius)) {
          chosenAngle = c1;
          break;
        }
        const c2 = awayAngle - delta;
        if (canMoveTo(civ.x + Math.cos(c2) * 20, civ.y + Math.sin(c2) * 20, civ.radius)) {
          chosenAngle = c2;
          break;
        }
      }
      civ.vx = Math.cos(chosenAngle) * (civ.speed * 1.15);
      civ.vy = Math.sin(chosenAngle) * (civ.speed * 1.15);
      civ.changeDirTimer = 18;
    } else if (civ.changeDirTimer <= 0) {
      // Losowy kierunek marszu z dala od uzbrojonych min
      let bestAngle = Math.random() * Math.PI * 2;
      for (let tries = 0; tries < 10; tries++) {
        const cand = Math.random() * Math.PI * 2;
        const testX = civ.x + Math.cos(cand) * 48;
        const testY = civ.y + Math.sin(cand) * 48;
        if (!canMoveTo(testX, testY, civ.radius)) continue;
        let nearArmed = false;
        for (const m of placedMines) {
          if (m.armed && Math.hypot(testX - m.x, testY - m.y) < m.triggerRadius + 85) {
            nearArmed = true;
            break;
          }
        }
        if (!nearArmed) {
          bestAngle = cand;
          break;
        }
      }
      civ.vx = Math.cos(bestAngle) * civ.speed;
      civ.vy = Math.sin(bestAngle) * civ.speed;
      civ.changeDirTimer = 40 + Math.random() * 65;
    }

    const cnx = civ.x + civ.vx;
    const cny = civ.y + civ.vy;
    if (canMoveTo(cnx, civ.y, civ.radius)) {
      civ.x = cnx;
    } else {
      civ.vx *= -1;
      civ.changeDirTimer = Math.min(civ.changeDirTimer, 12);
    }
    if (canMoveTo(civ.x, cny, civ.radius)) {
      civ.y = cny;
    } else {
      civ.vy *= -1;
      civ.changeDirTimer = Math.min(civ.changeDirTimer, 12);
    }

    civ.walkCycle += 0.19;
    if (Math.hypot(civ.vx, civ.vy) > 0.05) {
      civ.angle = Math.atan2(civ.vy, civ.vx);
    }
  }

  // Uzbrajanie min (5 sekund pik-pik-pik) oraz detekcja wrogów, cywili i gracza!
  for (let m = placedMines.length - 1; m >= 0; m--) {
    const mine = placedMines[m];
    mine.pulse += 0.14;

    if (!mine.armed) {
      mine.armFrames--;
      if (mine.armFrames > 0 && mine.armFrames % 60 === 0) {
        playMineBeep(false);
      } else if (mine.armFrames <= 0) {
        mine.armed = true;
        playMineBeep(true);
      }
      continue;
    }

    let triggered = false;
    // Sprawdź, czy gracz wpadł na własną uzbrojoną minę
    if (Math.hypot(player.x - mine.x, player.y - mine.y) <= mine.triggerRadius) {
      triggered = true;
    } else {
      for (const en of enemies) {
        if (Math.hypot(en.x - mine.x, en.y - mine.y) <= mine.triggerRadius) {
          triggered = true;
          break;
        }
      }
      if (!triggered) {
        for (const civ of civilians) {
          if (Math.hypot(civ.x - mine.x, civ.y - mine.y) <= mine.triggerRadius) {
            triggered = true;
            break;
          }
        }
      }
    }
    if (triggered) {
      placedMines.splice(m, 1);
      triggerMineExplosion(mine);
      if (gameState !== 'playing') return;
    }
  }

  // Bullets
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.x += b.vx;
    b.y += b.vy;
    b.life--;

    let hitWall = false;
    if (b.x < 10 || b.x > canvas.width - 10 || b.y < 10 || b.y > canvas.height - 10) {
      hitWall = true;
    } else {
      for (const ob of obstacles) {
        if (rectCircleColliding(b.x, b.y, 5, ob)) {
          hitWall = true;
          break;
        }
      }
    }

    if (hitWall || b.life <= 0) {
      addPaintSplat(b.x, b.y, b.color, 13 + Math.random() * 7);
      bullets.splice(i, 1);
      continue;
    }

    if (b.fromPlayer) {
      let hitEnemy = false;
      for (let j = enemies.length - 1; j >= 0; j--) {
        const en = enemies[j];
        if (Math.hypot(b.x - en.x, b.y - en.y) < en.radius + 7) {
          hitEnemy = true;

          // Przeciwnik z tarczą taktyczną: 45% obwodu (łuk 162°: od -81° do +81° od osi) osłonięte tarczą taktyczną
          if (en.kind === 'shield') {
            const hitAngle = Math.atan2(b.y - en.y, b.x - en.x);
            let angleDiff = Math.abs(hitAngle - en.shieldAngle);
            while (angleDiff > Math.PI * 2) angleDiff -= Math.PI * 2;
            if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;

            // Uderzenie od strony tarczy (45% obwodu = Math.PI * 0.45 radianów = 81° w każdą stronę)
            const shieldHalfAngle = Math.PI * 0.45;
            if (angleDiff <= shieldHalfAngle) {
              // Uderzenie markerem od strony tarczy nic mu nie robi!
              playShieldBlockSound();
              addPaintSplat(b.x, b.y, b.color, 12);
              for (let k = 0; k < 8; k++) {
                const a = hitAngle + (Math.random() - 0.5) * 1.2;
                const s = 1.5 + Math.random() * 3.5;
                particles.push({
                  x: b.x,
                  y: b.y,
                  vx: Math.cos(a) * s,
                  vy: Math.sin(a) * s,
                  r: 3 + Math.random() * 2,
                  color: '#67e8f9',
                  alpha: 1
                });
              }
              popups.push({
                x: en.x,
                y: en.y - 24,
                text: '🛡️ BLOK TARCZY!',
                color: '#38bdf8',
                alpha: 1
              });
              break;
            }
          }

          en.hp--;
          en.splatColor = b.color;
          addPaintSplat(en.x, en.y, b.color, en.hp <= 0 ? 28 : 16);
          for (let k = 0; k < (en.hp <= 0 ? 22 : 10); k++) {
            const a = Math.random() * Math.PI * 2;
            const s = 1.5 + Math.random() * 5;
            particles.push({
              x: en.x,
              y: en.y,
              vx: Math.cos(a) * s,
              vy: Math.sin(a) * s,
              r: 4 + Math.random() * 3,
              color: b.color,
              alpha: 1
            });
          }

          if (en.hp > 0) {
            popups.push({
              x: en.x,
              y: en.y - 24,
              text: `TRAFIONY! (${en.hp}/${en.maxHp} ❤️)`,
              color: '#fde047',
              alpha: 1
            });
            break;
          }

          eliminateEnemy(j, en, b.color);
          break;
        }
      }
      if (hitEnemy) {
        bullets.splice(i, 1);
        continue;
      }

      // Strzały gracza ranią cywila (strzały przeciwnika go NIE ranią!)
      let hitCivilian = false;
      for (let c = civilians.length - 1; c >= 0; c--) {
        const civ = civilians[c];
        if (Math.hypot(b.x - civ.x, b.y - civ.y) < civ.radius + 6) {
          hitCivilian = true;
          damageCivilian(c, 1, b.color);
          break;
        }
      }
      if (hitCivilian) {
        bullets.splice(i, 1);
        if (gameState !== 'playing') return;
        continue;
      }
    } else {
      if (Math.hypot(b.x - player.x, b.y - player.y) < player.radius + 6) {
        player.hp = Math.max(0, player.hp - 15);
        player.hitFlash = 14;
        player.splatColor = b.color;
        addPaintSplat(player.x, player.y, b.color, 22);
        for (let k = 0; k < 16; k++) {
          const a = Math.random() * Math.PI * 2;
          particles.push({
            x: player.x,
            y: player.y,
            vx: Math.cos(a) * (2 + Math.random() * 4),
            vy: Math.sin(a) * (2 + Math.random() * 4),
            r: 4,
            color: b.color,
            alpha: 1
          });
        }
        updateHud();
        bullets.splice(i, 1);

        if (player.hp <= 0) {
          clouds = [];
          playerDeadPending = true;
          if (bullets.length === 0 && homingRockets.length === 0) {
            openMenu('dead');
          }
        }
        continue;
      }
    }
  }

  // Aktualizacja rakiet samonaprowadzających (Bazooka) z omijaniem przeszkód
  for (let i = homingRockets.length - 1; i >= 0; i--) {
    const r = homingRockets[i];
    r.life--;
    if (r.life <= 0) {
      addPaintSplat(r.x, r.y, r.color, 26);
      homingRockets.splice(i, 1);
      continue;
    }

    if (!r.target || (!enemies.includes(r.target) && !civilians.includes(r.target))) {
      r.target = findNearestEnemy(mouse.x, mouse.y);
    }
    if (r.target) {
      const steerAngle = computeObstacleAvoidingAngle(r.x, r.y, r.angle, r.target.x, r.target.y);
      const diff = normalizeAngleDiff(steerAngle - r.angle);
      const maxTurn = 0.14;
      r.angle += Math.max(-maxTurn, Math.min(maxTurn, diff));
    }

    const nx = r.x + Math.cos(r.angle) * r.speed;
    const ny = r.y + Math.sin(r.angle) * r.speed;
    if (canMoveTo(nx, ny, 6)) {
      r.x = nx;
      r.y = ny;
    } else {
      // Ślizganie wzdłuż krawędzi przeszkody (omijanie bez utknięcia)
      let moved = false;
      if (canMoveTo(nx, r.y, 6)) {
        r.x = nx;
        moved = true;
      }
      if (canMoveTo(r.x, ny, 6)) {
        r.y = ny;
        moved = true;
      }
      if (!moved) {
        r.angle += 0.65;
      }
    }

    if (r.life % 2 === 0) {
      particles.push({
        x: r.x - Math.cos(r.angle) * 10,
        y: r.y - Math.sin(r.angle) * 10,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        r: 3.5,
        color: '#fb923c',
        alpha: 0.75
      });
    }

    let hitIdx = -1;
    let hitCivIdx = -1;
    for (let j = enemies.length - 1; j >= 0; j--) {
      const en = enemies[j];
      if (Math.hypot(r.x - en.x, r.y - en.y) <= en.radius + 12) {
        hitIdx = j;
        break;
      }
    }
    if (hitIdx === -1) {
      for (let c = civilians.length - 1; c >= 0; c--) {
        const civ = civilians[c];
        if (Math.hypot(r.x - civ.x, r.y - civ.y) <= civ.radius + 12) {
          hitCivIdx = c;
          break;
        }
      }
    }

    if (hitIdx !== -1 || hitCivIdx !== -1) {
      playExplosionSound();
      const blastColor = colors[Math.floor(Math.random() * colors.length)];
      addPaintSplat(r.x, r.y, blastColor, 38);
      explosions.push({
        x: r.x,
        y: r.y,
        radius: 8,
        maxRadius: 68,
        color: blastColor,
        alpha: 1
      });
      for (let k = 0; k < 28; k++) {
        const a = Math.random() * Math.PI * 2;
        const s = 2 + Math.random() * 5.5;
        particles.push({
          x: r.x,
          y: r.y,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s,
          r: 4 + Math.random() * 3,
          color: blastColor,
          alpha: 1
        });
      }

      // Zadaj obrażenia trafionemu wrogowi (3 HP) oraz pobliskim w promieniu wybuchu
      for (let j = enemies.length - 1; j >= 0; j--) {
        const en = enemies[j];
        const dist = Math.hypot(r.x - en.x, r.y - en.y);
        if (j === hitIdx || dist <= 68) {
          const dmg = j === hitIdx ? 3 : 1;
          en.hp -= dmg;
          en.splatColor = blastColor;
          if (en.hp > 0) {
            popups.push({
              x: en.x,
              y: en.y - 24,
              text: `💥 RAKIETA! (${en.hp}/${en.maxHp} ❤️)`,
              color: '#fb923c',
              alpha: 1
            });
          } else {
            eliminateEnemy(j, en, blastColor);
          }
        }
      }

      // Rakiety z Bazooki ranią również cywili (bezpośrednie trafienie zabija na miejscu: 2 obrażenia)
      for (let c = civilians.length - 1; c >= 0; c--) {
        const civ = civilians[c];
        const dist = Math.hypot(r.x - civ.x, r.y - civ.y);
        if (c === hitCivIdx || dist <= 68) {
          const civDmg = (c === hitCivIdx || dist <= civ.radius + 16) ? 2 : 1;
          damageCivilian(c, civDmg, blastColor);
          if (gameState !== 'playing') {
            homingRockets.splice(i, 1);
            return;
          }
        }
      }

      homingRockets.splice(i, 1);
      updateHud();
    }
  }

  // Co jakiś czas na mapie pojawia się paczka 10 nowych nabojów!
  ammoSpawnTimer--;
  if (ammoSpawnTimer <= 0) {
    if (ammoPickups.length < 6) {
      spawnRandomMapAmmo();
    }
    ammoSpawnTimer = 420; // Co 7 sekund
  }

  // Bardzo rzadko na mapie pojawia się nowa rakieta do bazooki!
  rocketSpawnTimer--;
  if (rocketSpawnTimer <= 0) {
    if (rocketPickups.length < 2) {
      spawnRandomMapRocket();
    }
    rocketSpawnTimer = 1500; // Co ok. 25 sekund
  }

  // Zbieranie rakiet po najechaniu postacią
  for (let i = rocketPickups.length - 1; i >= 0; i--) {
    const rpack = rocketPickups[i];
    rpack.pulse += 0.1;
    if (Math.hypot(player.x - rpack.x, player.y - rpack.y) <= player.radius + rpack.radius + 4) {
      player.rockets += 1;
      playPickupSound();
      popups.push({
        x: rpack.x,
        y: rpack.y - 12,
        text: `+1 RAKIETA! 🚀`,
        color: '#fb923c',
        alpha: 1
      });
      rocketPickups.splice(i, 1);
      updateHud();
    }
  }

  // Zbieranie nabojów po najechaniu / najściu na nie postacią
  for (let i = ammoPickups.length - 1; i >= 0; i--) {
    const pack = ammoPickups[i];
    pack.pulse += 0.1;
    if (Math.hypot(player.x - pack.x, player.y - pack.y) <= player.radius + pack.radius + 4) {
      player.ammo += pack.amount;
      playPickupSound();
      popups.push({
        x: pack.x,
        y: pack.y - 12,
        text: `+${pack.amount} NABOJÓW! 🎨`,
        color: '#4ade80',
        alpha: 1
      });
      ammoPickups.splice(i, 1);
      updateHud();
    }
  }

  for (let i = popups.length - 1; i >= 0; i--) {
    const pop = popups[i];
    pop.y -= 1.0;
    pop.alpha -= 0.025;
    if (pop.alpha <= 0) popups.splice(i, 1);
  }

  for (let i = explosions.length - 1; i >= 0; i--) {
    const ex = explosions[i];
    ex.radius += (ex.maxRadius - ex.radius) * 0.25;
    ex.alpha -= 0.05;
    if (ex.alpha <= 0) explosions.splice(i, 1);
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.alpha -= 0.03;
    if (p.alpha <= 0) particles.splice(i, 1);
  }

  for (let i = splats.length - 1; i >= 0; i--) {
    splats[i].ageFrames++;
    if (splats[i].ageFrames >= splats[i].maxFrames) {
      splats.splice(i, 1);
      paintCanvasDirty = true;
    }
  }

  for (const cl of clouds) {
    cl.phase += 0.03;
    cl.x += cl.vx;
    cl.y += cl.vy;
    const minX = cl.w * 0.55;
    const maxX = canvas.width - cl.w * 0.55;
    const minY = cl.h * 0.6;
    const maxY = canvas.height - cl.h * 0.6;
    if (cl.x < minX) { cl.x = minX; cl.vx *= -1; }
    if (cl.x > maxX) { cl.x = maxX; cl.vx *= -1; }
    if (cl.y < minY) { cl.y = minY; cl.vy *= -1; }
    if (cl.y > maxY) { cl.y = maxY; cl.vy *= -1; }
  }

  for (let i = eliminatedHumans.length - 1; i >= 0; i--) {
    eliminatedHumans[i].timer--;
    if (eliminatedHumans[i].timer <= 0) eliminatedHumans.splice(i, 1);
  }

  // Obsługa oczekiwania na zakończenie lotu pocisków (Punkty 12, 13, 14, 15)
  const flyingProjectiles = bullets.length + homingRockets.length;

  if (enemies.length > 0) {
    // Jeśli powracający przeciwnik powrócił na planszę, resetujemy stan zakończenia
    levelClearPending = false;
    levelVictoryDelay = 0;
  }

  if (player.hp <= 0 || playerDeadPending) {
    clouds = [];
    levelClearPending = false;
    levelVictoryDelay = 0;
    if (flyingProjectiles === 0) {
      playerDeadPending = false;
      openMenu('dead');
      return;
    }
  } else if (levelClearPending || (enemies.length === 0 && gameState === 'playing')) {
    clouds = [];
    if (!levelClearPending) {
      levelClearPending = true;
      levelVictoryDelay = 30;
    }
    if (levelVictoryDelay > 0) {
      levelVictoryDelay--;
    }
    // Po zabiciu ostatniego przeciwnika gra trwa jeszcze pół sekundy (30 klatek) niezależnie od lecących pocisków
    if (levelVictoryDelay <= 0 && flyingProjectiles === 0) {
      levelClearPending = false;
      handleLevelVictory();
      return;
    }
  }
}

function gameLoop() {
  update();
  renderScene();
  requestAnimationFrame(gameLoop);
}

startLevel(level);
hasStartedAnyGame = false;
openMenu('select');
requestAnimationFrame(gameLoop);

// Konsolowa funkcja do odblokowywania poziomów wpisując ublock(n) lub unlock(n)
window.ublock = function(n) {
  const target = parseInt(n, 10);
  if (isNaN(target) || target < 1) {
    console.warn('Użycie: ublock(n) - podaj numer poziomu do odblokowania (np. ublock(10))');
    return 'Podaj poprawny numer poziomu (np. ublock(5))';
  }
  unlockedLevel = Math.max(unlockedLevel, target);
  saveProgress();
  updateHud();
  if (typeof openMenu === 'function' && (gameState === 'menu' || gameState === 'select')) {
    openMenu('select');
  }
  if (typeof renderEnemiesCatalog === 'function') {
    renderEnemiesCatalog();
  }
  const msg = `🔓 Odblokowano poziomy do poziomu ${unlockedLevel}!`;
  console.log(msg);
  return msg;
};
window.unlock = window.ublock;
