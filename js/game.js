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
  if (gameState !== 'playing' || minesCount <= 0) return;
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
    color: '#f97316'
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
      openMenu('dead');
      return;
    }
  }

  // Eliminate enemies inside blastRadius (chyba że przeciwnik jest odporny na miny - 'boss'!)
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
      addPaintSplat(en.x, en.y, blastColor, 34);
      spawnAmmoPickup(en.x, en.y, 5);
      eliminatedHumans.push({
        x: en.x,
        y: en.y,
        shirtColor: blastColor,
        splatColor: blastColor,
        timer: 50
      });
      enemies.splice(j, 1);
    }
  }

  if (enemies.length === 0 && gameState === 'playing') {
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
  saveProgress();
  updateHud();
  openMenu('level_clear');
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
  const shirtColors = ['#ef4444', '#f97316', '#eab308', '#ec4899'];

  const maxHits = kind === 'boss' ? 5 : (kind === 'tough' ? 3 : 1);
  const radius = kind === 'boss' ? 21 : (kind === 'tough' ? 18 : 16);
  const shirtColor = kind === 'boss'
    ? '#9333ea'
    : (kind === 'tough'
        ? '#d97706'
        : (kind === 'rapid' ? '#eab308' : shirtColors[index % shirtColors.length]));

  let ex = spot.x + (Math.random() - 0.5) * 24;
  let ey = spot.y + (Math.random() - 0.5) * 24;
  if (!canMoveTo(ex, ey, radius)) {
    ex = spot.x;
    ey = spot.y;
  }

  enemies.push({
    x: ex,
    y: ey,
    vx: 0,
    vy: 0,
    kind,
    hp: maxHits,
    maxHp: maxHits,
    mineImmune: kind === 'boss',
    speed: Math.min(2.8, (kind === 'boss' ? 1.45 : (kind === 'tough' ? 1.6 : (kind === 'rapid' ? 1.95 : 1.7))) + Math.random() * 0.4 + Math.min(level, 8) * 0.06),
    radius,
    angle: Math.PI / 2,
    walkCycle: Math.random() * 10,
    shirtColor,
    splatColor: null,
    changeDirTimer: 0,
    shootTimer: kind === 'rapid' ? (16 + Math.random() * 14) : (50 + Math.random() * 65)
  });
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
  paintCtx.clearRect(0, 0, paintCanvas.width, paintCanvas.height);
  startTime = performance.now();
  survivalSeconds = 0;

  player.x = 470;
  player.y = 495;
  player.maxHp = 200;
  player.hp = 200;
  player.hpRegenTimer = 0;
  player.ammo = 30; // Zaczynamy poziom od 30 nabojów!
  player.rockets = 5; // Bazooka: startujemy z 5 rakietami, licznik resetuje się między rundami!
  player.weapon = ownedWeapons.includes(defaultWeapon) ? defaultWeapon : 'pistol';
  player.hitFlash = 0;
  player.splatColor = null;

  enemies = [];
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

  totalEnemiesInLevel = cfg.roster.length;
  for (let i = 0; i < cfg.roster.length; i++) {
    spawnEnemy(i, cfg.roster[i]);
  }
  saveProgress();
  updateHud();
  canvas.focus();
}

function startCustomMap(idx) {
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
  paintCtx.clearRect(0, 0, paintCanvas.width, paintCanvas.height);
  startTime = performance.now();
  survivalSeconds = 0;

  player.x = 470;
  player.y = 495;
  player.maxHp = 200;
  player.hp = 200;
  player.hpRegenTimer = 0;
  player.ammo = 30;
  player.rockets = 5;
  player.weapon = ownedWeapons.includes(defaultWeapon) ? defaultWeapon : 'pistol';
  player.hitFlash = 0;
  player.splatColor = null;

  enemies = [];
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

  const roster = [];
  for (let i = 0; i < cm.normal; i++) roster.push('normal');
  for (let i = 0; i < cm.tough; i++) roster.push('tough');
  for (let i = 0; i < cm.rapid; i++) roster.push('rapid');
  for (let i = 0; i < cm.boss; i++) roster.push('boss');
  if (roster.length === 0) roster.push('normal');

  totalEnemiesInLevel = roster.length;
  for (let i = 0; i < roster.length; i++) {
    spawnEnemy(i, roster[i]);
  }
  saveProgress();
  updateHud();
  canvas.focus();
}

function firePaintball(fromX, fromY, angle, fromPlayer) {
  if (fromPlayer) {
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
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    color,
    fromPlayer,
    life: 100
  });
}

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

function firePlayerWeapon(fromX, fromY, angle) {
  if (player.weapon === 'bazooka') {
    if (player.rockets <= 0) {
      playEmptyAmmoSound();
      popups.push({ x: player.x, y: player.y - 28, text: 'BRAK RAKIET! 🚀', color: '#ef4444', alpha: 1 });
      return;
    }
    player.rockets--;
    updateHud();
    playRocketLaunchSound();
    const target = findNearestEnemy(fromX, fromY);
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

btnOpenMenu.addEventListener('click', () => {
  if (gameState === 'menu') {
    menuOverlay.classList.add('hidden');
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
    normal: 1,
    tough: 1,
    rapid: 1,
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
btnFollowMouse.addEventListener('click', toggleFollowMouse);
if (btnTheme) btnTheme.addEventListener('click', cycleGraphicTheme);

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
  } else if (e.code === 'KeyF') {
    toggleFollowMouse();
  } else if (e.code === 'KeyT') {
    cycleGraphicTheme();
  } else if (e.code === 'KeyQ') {
    switchWeaponInStage();
  } else if (e.code === 'KeyE' || (e.code === 'Space' && gameState === 'playing')) {
    placeMine();
  } else if (e.code === 'Escape' || e.code === 'KeyM') {
    if (gameState === 'playing' || gameState === 'paused') openMenu('select');
    else if (gameState === 'menu' || gameState === 'custom_maps' || gameState === 'shop') {
      menuOverlay.classList.add('hidden');
      customOverlay.classList.add('hidden');
      if (shopOverlay) shopOverlay.classList.add('hidden');
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

  // Odradzanie HP: +1 HP na sekundę (co 60 klatek)
  if (player.hp > 0 && player.hp < player.maxHp) {
    player.hpRegenTimer = (player.hpRegenTimer || 0) + 1;
    if (player.hpRegenTimer >= 60) {
      player.hpRegenTimer = 0;
      player.hp = Math.min(player.maxHp, player.hp + 1);
      updateHud();
    }
  } else {
    player.hpRegenTimer = 0;
  }

  if (player.hitFlash > 0) player.hitFlash--;

  let dx = 0;
  let dy = 0;
  if (keys['KeyW'] || keys['ArrowUp']) dy -= 1;
  if (keys['KeyS'] || keys['ArrowDown']) dy += 1;
  if (keys['KeyA'] || keys['ArrowLeft']) dx -= 1;
  if (keys['KeyD'] || keys['ArrowRight']) dx += 1;

  if (dx === 0 && dy === 0 && followMouse && mouse.active) {
    const distToMouse = Math.hypot(mouse.x - player.x, mouse.y - player.y);
    if (distToMouse > 45) {
      dx = (mouse.x - player.x) / distToMouse;
      dy = (mouse.y - player.y) / distToMouse;
    }
  }

  if (dx !== 0 || dy !== 0) {
    const len = Math.hypot(dx, dy);
    const nx = player.x + (dx / len) * player.speed;
    const ny = player.y + (dy / len) * player.speed;
    if (canMoveTo(nx, player.y, player.radius)) player.x = nx;
    if (canMoveTo(player.x, ny, player.radius)) player.y = ny;
    player.walkCycle += 0.26;
  }

  player.angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);

  if (player.cooldown > 0) player.cooldown--;
  if (mouse.down && player.cooldown <= 0) {
    const spread = player.weapon === 'bazooka' ? 0 : (Math.random() - 0.5) * 0.08;
    firePlayerWeapon(player.x, player.y, player.angle + spread);
  }

  // Update enemies
  for (let i = enemies.length - 1; i >= 0; i--) {
    const en = enemies[i];
    en.changeDirTimer--;
    const distToPlayer = Math.hypot(player.x - en.x, player.y - en.y);

    if (en.changeDirTimer <= 0) {
      let targetAngle;
      if (distToPlayer < 140) {
        targetAngle = Math.atan2(en.y - player.y, en.x - player.x) + (Math.random() - 0.5) * 1.1;
      } else {
        targetAngle = Math.atan2(player.y - en.y, player.x - en.x) + (Math.random() - 0.5) * 1.5;
      }
      en.vx = Math.cos(targetAngle) * en.speed;
      en.vy = Math.sin(targetAngle) * en.speed;
      en.changeDirTimer = 30 + Math.random() * 40;
    }

    const nx = en.x + en.vx;
    const ny = en.y + en.vy;
    if (canMoveTo(nx, en.y, en.radius)) en.x = nx; else en.vx *= -1;
    if (canMoveTo(en.x, ny, en.radius)) en.y = ny; else en.vy *= -1;

    en.walkCycle += 0.22;
    en.angle = Math.atan2(player.y - en.y, player.x - en.x);

    en.shootTimer--;
    if (en.shootTimer <= 0 && distToPlayer < 480) {
      const spread = en.kind === 'rapid' ? 0.16 : 0.25;
      const aimAngle = Math.atan2(player.y - en.y, player.x - en.x) + (Math.random() - 0.5) * spread;
      firePaintball(en.x, en.y, aimAngle, false);
      if (en.kind === 'rapid') {
        en.shootTimer = 14 + Math.random() * 10; // Strzela około 4 razy częściej!
      } else {
        en.shootTimer = Math.max(35, 85 - level * 4) + Math.random() * 55;
      }
    }
  }

  // Uzbrajanie min (5 sekund pik-pik-pik) oraz detekcja wrogów i gracza!
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

          spawnAmmoPickup(en.x, en.y, 5); // Każdy zabity przeciwnik dropuje 5 nabojów!
          if (Math.random() < 0.08) {
            spawnRocketPickup(en.x + 14, en.y);
          }
          eliminatedHumans.push({
            x: en.x,
            y: en.y,
            shirtColor: b.color,
            splatColor: b.color,
            timer: 45
          });
          enemies.splice(j, 1);
          if (enemies.length === 0) {
            handleLevelVictory();
          } else {
            updateHud();
          }
          break;
        }
      }
      if (hitEnemy) {
        bullets.splice(i, 1);
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
          openMenu('dead');
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

    r.target = findNearestEnemy(r.x, r.y);
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
    for (let j = enemies.length - 1; j >= 0; j--) {
      const en = enemies[j];
      if (Math.hypot(r.x - en.x, r.y - en.y) <= en.radius + 12) {
        hitIdx = j;
        break;
      }
    }

    if (hitIdx !== -1) {
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
            spawnAmmoPickup(en.x, en.y, 5);
            if (Math.random() < 0.08) {
              spawnRocketPickup(en.x + 14, en.y);
            }
            eliminatedHumans.push({
              x: en.x,
              y: en.y,
              shirtColor: blastColor,
              splatColor: blastColor,
              timer: 45
            });
            enemies.splice(j, 1);
          }
        }
      }

      homingRockets.splice(i, 1);
      if (enemies.length === 0) {
        handleLevelVictory();
        return;
      } else {
        updateHud();
      }
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
    }
  }

  for (let i = eliminatedHumans.length - 1; i >= 0; i--) {
    eliminatedHumans[i].timer--;
    if (eliminatedHumans[i].timer <= 0) eliminatedHumans.splice(i, 1);
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
