// ==================== GŁÓWNA LOGIKA ROZGRYWKI I PĘTLA GRY ====================

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

  // Jeśli gracz zabije ostatniego przeciwnika, to chmury znikają
  if (enemies.length === 0) {
    clouds = [];
    levelClearPending = true;
    levelVictoryDelay = 30; // Po zabiciu ostatniego przeciwnika gra trwa jeszcze pół sekundy
  }
  updateHud();
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
    const proj = (dx * b.vx + dy * b.vy) / bSpeed;
    if (proj <= 0 || proj > 950) continue;

    const ux = b.vx / bSpeed;
    const uy = b.vy / bSpeed;

    const closestX = b.x + ux * proj;
    const closestY = b.y + uy * proj;
    const perpX = en.x - closestX;
    const perpY = en.y - closestY;
    const distToLine = Math.hypot(perpX, perpY);

    const timeToImpact = proj / bSpeed;

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

    // 1. ZAKAZ WCHODZENIA POD STRZAŁ Z DALEKA
    const approachSpeed = -(en.vx * outX + en.vy * outY);
    if (distToLine < en.radius + 80 && approachSpeed > 0) {
      en.vx += outX * (approachSpeed + 1.2);
      en.vy += outY * (approachSpeed + 1.2);
      en.changeDirTimer = Math.max(en.changeDirTimer, 18);
    }

    // 2. PRZEWIDYWANIE KOLIZJI I UNIK (DODGE)
    const futureX = en.x + en.vx * timeToImpact;
    const futureY = en.y + en.vy * timeToImpact;
    const futureDistToLine = Math.hypot(futureX - closestX, futureY - closestY);

    const dangerZone = en.radius + 36;
    if (distToLine < dangerZone || futureDistToLine < dangerZone) {
      if (timeToImpact < minTimeToImpact) {
        minTimeToImpact = timeToImpact;
        mostThreateningBullet = b;

        let testOutX = outX;
        let testOutY = outY;
        if (!canMoveTo(en.x + testOutX * 28, en.y + testOutY * 28, en.radius)) {
          if (canMoveTo(en.x - testOutX * 28, en.y - testOutY * 28, en.radius)) {
            testOutX = -testOutX;
            testOutY = -testOutY;
          }
        }

        en.dodgeSign = (testOutX * (-uy) + testOutY * ux) >= 0 ? 1 : -1;
        chosenNormalX = testOutX;
        chosenNormalY = testOutY;
      }
    }
  }

  if (!mostThreateningBullet) return;

  const dodgeSpeed = Math.max(en.speed * 1.9, 3.8);
  en.dodgeVx = chosenNormalX * dodgeSpeed;
  en.dodgeVy = chosenNormalY * dodgeSpeed;
  en.dodgeTimer = Math.min(Math.max(18, Math.round(minTimeToImpact + 8)), 32);
  en.vx = en.dodgeVx;
  en.vy = en.dodgeVy;
  en.changeDirTimer = Math.max(en.changeDirTimer, en.dodgeTimer + 10);
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
  civilianRespawnQueue.push({ timer: 5 * 60 });

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

  totalEnemiesInLevel = cfg.roster.length;
  for (let i = 0; i < cfg.roster.length; i++) {
    spawnEnemy(i, cfg.roster[i]);
  }
  const civCount = typeof cfg.civilians === 'number' ? cfg.civilians : 1;
  for (let i = 0; i < civCount; i++) {
    spawnCivilian(i);
  }
  spawnClouds(cfg.clouds || 0);
  initHelper();
  saveProgress();
  updateHud();
  canvas.focus();
}

function startCustomMap(idx) {
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
  initHelper();
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

function getBestFallbackWeapon() {
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
      playEmptyAmmoSound();
      if (player.emptyBazookaTries >= 2) {
        const fallback = getBestFallbackWeapon();
        player.weapon = fallback.id;
        player.emptyBazookaTries = 0;
        updateHud();
        playSwitchWeaponSound();
        popups.push({
          x: player.x,
          y: player.y - 30,
          text: `BRAK RAKIET! PRZEŁĄCZONO NA: ${fallback.name.toUpperCase()} 🔫`,
          color: '#fb923c',
          alpha: 1
        });
      } else {
        popups.push({
          x: player.x,
          y: player.y - 30,
          text: 'BRAK RAKIET W BAZOOCE! (KLIKNIJ PONOWNIE, ABY ZMIENIĆ BROŃ)',
          color: '#ef4444',
          alpha: 1
        });
      }
      return;
    }
    player.emptyBazookaTries = 0;
    player.rockets--;
    updateHud();
    playRocketLaunchSound();
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
  } else if (player.weapon === 'minigun') {
    const spread = (Math.random() - 0.5) * 0.14;
    firePaintball(fromX, fromY, angle + spread, true);
    player.cooldown = 3; // Ponad 3x szybciej niż standardowy marker (20 strzałów/s)!
  } else {
    firePaintball(fromX, fromY, angle, true);
    player.cooldown = 10;
  }
}

function update() {
  if (levelBannerTimer > 0) levelBannerTimer--;

  // Obsługa kontrolera Xbox (gamepad) — działa również w menu i na ekranach zakończenia poziomu!
  const gpInput = typeof updateGamepadInput === 'function' ? updateGamepadInput() : null;

  if (gameState !== 'playing') return;

  survivalSeconds = (performance.now() - startTime) / 1000;

  // Tor leczenia gracza
  if (healingLevel > 0 && player.hp > 0 && player.hp < player.maxHp) {
    if (!Array.isArray(player.healTimers)) player.healTimers = [];
    let totalHealedThisFrame = 0;
    for (let k = 1; k <= healingLevel; k++) {
      const idx = k - 1;
      player.healTimers[idx] = (player.healTimers[idx] || 0) + 1;
      const requiredFrames = getHealingIntervalSeconds(k) * 60;
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

  // Tor uzupełniania nabojów gracza
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

  let speedFactor = 1;
  if (touchJoystick.active) {
    dx += touchJoystick.dx;
    dy += touchJoystick.dy;
    if (!keys['KeyW'] && !keys['KeyS'] && !keys['KeyA'] && !keys['KeyD']) {
      speedFactor = Math.min(1, Math.hypot(touchJoystick.dx, touchJoystick.dy));
    }
  } else if (gpInput && (Math.abs(gpInput.moveX) > 0 || Math.abs(gpInput.moveY) > 0)) {
    dx = gpInput.moveX;
    dy = gpInput.moveY;
    speedFactor = Math.min(1, Math.hypot(gpInput.moveX, gpInput.moveY));
  }

  const curPlayerX = player.x;
  const curPlayerY = player.y;

  if (dx !== 0 || dy !== 0) {
    const len = Math.hypot(dx, dy);
    const nx = player.x + (dx / len) * player.speed * speedFactor;
    const ny = player.y + (dy / len) * player.speed * speedFactor;
    if (canMoveTo(nx, player.y, player.radius)) player.x = nx;
    if (canMoveTo(player.x, ny, player.radius)) player.y = ny;
    player.walkCycle += 0.26 * speedFactor;
  }

  player.vx = player.x - curPlayerX;
  player.vy = player.y - curPlayerY;

  // Celowanie: kontroler Xbox, dotyk lub mysz
  if (gpInput && gpInput.hasAim) {
    const gpAngle = Math.atan2(gpInput.aimY, gpInput.aimX);
    player.angle = gpAngle;
    mouse.x = player.x + Math.cos(gpAngle) * 200;
    mouse.y = player.y + Math.sin(gpAngle) * 200;
    mouse.active = true;
  } else if (touchAimId !== null || !touchJoystick.active || mouse.down) {
    player.angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
  } else if (touchJoystick.active && (touchJoystick.dx !== 0 || touchJoystick.dy !== 0)) {
    player.angle = Math.atan2(touchJoystick.dy, touchJoystick.dx);
  }

  if (player.cooldown > 0) player.cooldown--;

  // Strzał (mysz lub spust/przycisk kontrolera Xbox)
  const shouldShoot = (mouse.down || (gpInput && gpInput.isShooting)) && player.cooldown <= 0;
  if (shouldShoot) {
    const spread = player.weapon === 'bazooka' ? 0 : (player.weapon === 'minigun' ? (Math.random() - 0.5) * 0.16 : (Math.random() - 0.5) * 0.08);
    firePlayerWeapon(player.x, player.y, player.angle + spread);
  }

  // Update enemies
  const maxStuckW = canvas.width * 0.26;
  const maxStuckH = canvas.height * 0.26;
  const STUCK_TRIGGER_FRAMES = 12 * 60;

  for (let i = enemies.length - 1; i >= 0; i--) {
    const en = enemies[i];
    en.changeDirTimer--;
    if (en.repositionCooldown > 0) en.repositionCooldown--;

    const distToPlayer = Math.hypot(player.x - en.x, player.y - en.y);

    if (en.aiState === 'confused') {
      en.aiStateTimer--;
      en.vx *= 0.85;
      en.vy *= 0.85;

      if (en.aiStateTimer <= 0) {
        let chosenTarget = null;
        const safeClearance = en.radius + 28;
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
          en.aiStateTimer = 3 * 60;
          en.orbitSign = Math.random() < 0.5 ? 1 : -1;
        } else {
          en.aiState = 'normal';
        }
      }
    } else if (en.aiState === 'repositioning' && en.repositionTarget) {
      en.aiStateTimer--;
      const distToGoal = Math.hypot(en.repositionTarget.x - en.x, en.repositionTarget.y - en.y);
      if (distToGoal <= 32 || en.aiStateTimer <= 0) {
        en.aiState = 'normal';
        en.repositionTarget = null;
        en.repositionCooldown = 30 * 60;
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
      steerAwayFromPlayerBullets(en);
    }

    steerAwayFromMines(en);

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
        en.mineTimer = 30 * 60;
      }
    }

    en.shootTimer--;
    if (en.shootTimer <= 0 && distToPlayer < 480 && player.hp > 0) {
      let target = player;
      let targetDist = distToPlayer;
      if (helper && helper.alive) {
        const distToHelper = Math.hypot(helper.x - en.x, helper.y - en.y);
        if (distToHelper < distToPlayer) {
          target = helper;
          targetDist = distToHelper;
        }
      }

      if (en.kind === 'pro' || en.kind === 'returning_pro') {
        const t = targetDist / 5.2;
        const leadX = target.x + (target.vx || 0) * t;
        const leadY = target.y + (target.vy || 0) * t;
        const aimAngle = Math.atan2(leadY - en.y, leadX - en.x) + (Math.random() - 0.5) * 0.08;
        firePaintball(en.x, en.y, aimAngle, false);
        en.shootTimer = 40 + Math.random() * 25;
      } else {
        const spread = (en.kind === 'rapid' || en.kind === 'returning_rapid') ? 0.16 : (en.kind === 'miner' ? 0.4 : 0.25);
        const aimAngle = Math.atan2(target.y - en.y, target.x - en.x) + (Math.random() - 0.5) * spread;
        firePaintball(en.x, en.y, aimAngle, false);
        if (en.kind === 'rapid' || en.kind === 'returning_rapid') {
          en.shootTimer = 14 + Math.random() * 10;
        } else if (en.kind === 'miner') {
          en.shootTimer = 200 + Math.random() * 150;
        } else {
          en.shootTimer = Math.max(35, 85 - level * 4) + Math.random() * 55;
        }
      }
    }
  }

  // Miny podkładacza
  if (updateEnemyMines()) return;

  // Odradzanie powracających przeciwników
  for (let q = enemyRespawnQueue.length - 1; q >= 0; q--) {
    enemyRespawnQueue[q].timer--;
    if (enemyRespawnQueue[q].timer <= 0) {
      const item = enemyRespawnQueue[q];
      enemyRespawnQueue.splice(q, 1);
      const spot = getFarSpawnSpot(player.x, player.y);
      spawnEnemyAt(spot.x, spot.y, item.kind, enemies.length);
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

  // Odradzanie zabitych cywili po 5 sekundach
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

  // Ruch cywili
  for (let c = civilians.length - 1; c >= 0; c--) {
    const civ = civilians[c];
    civ.changeDirTimer--;

    let closestArmedMine = null;
    let closestMineDist = Infinity;
    for (const m of placedMines) {
      if (!m.armed) continue;
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

    const safeDist = closestArmedMine ? (closestArmedMine.triggerRadius + civ.radius + 24) : 0;
    if (closestArmedMine && closestMineDist < safeDist) {
      const away = Math.atan2(civ.y - closestArmedMine.y, civ.x - closestArmedMine.x);
      civ.vx = Math.cos(away) * civ.speed;
      civ.vy = Math.sin(away) * civ.speed;
      civ.changeDirTimer = 18;
    } else if (civ.changeDirTimer <= 0) {
      const ang = Math.random() * Math.PI * 2;
      civ.vx = Math.cos(ang) * civ.speed;
      civ.vy = Math.sin(ang) * civ.speed;
      civ.changeDirTimer = 35 + Math.random() * 55;
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

  // Aktualizacja sojuszniczego pomocnika
  updateHelper();

  // Uzbrajanie min oraz detekcja wrogów, cywili i gracza
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

    if (b.fromPlayer || b.fromHelper) {
      let hitEnemy = false;
      for (let j = enemies.length - 1; j >= 0; j--) {
        const en = enemies[j];
        if (Math.hypot(b.x - en.x, b.y - en.y) < en.radius + 7) {
          hitEnemy = true;

          if (en.kind === 'shield') {
            const hitAngle = Math.atan2(b.y - en.y, b.x - en.x);
            let angleDiff = Math.abs(hitAngle - en.shieldAngle);
            while (angleDiff > Math.PI * 2) angleDiff -= Math.PI * 2;
            if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;

            const shieldHalfAngle = Math.PI * 0.45;
            if (angleDiff <= shieldHalfAngle) {
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

      // Strzały gracza ranią cywila (strzały pomocnika i wrogów ich nie ranią)
      if (b.fromPlayer) {
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
      } else if (helper && helper.alive && Math.hypot(b.x - helper.x, b.y - helper.y) < helper.radius + 6) {
        bullets.splice(i, 1);
        damageHelper(1, b.color);
        continue;
      }
    }
  }

  // Rakiety samonaprowadzające (Bazooka)
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

  // Spawnowanie losowych nabojów na mapie
  ammoSpawnTimer--;
  if (ammoSpawnTimer <= 0) {
    if (ammoPickups.length < 6) {
      spawnRandomMapAmmo();
    }
    ammoSpawnTimer = 420;
  }

  // Spawnowanie losowych rakiet do bazooki
  rocketSpawnTimer--;
  if (rocketSpawnTimer <= 0) {
    if (rocketPickups.length < 2) {
      spawnRandomMapRocket();
    }
    rocketSpawnTimer = 1500;
  }

  // Zbieranie rakiet
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

  // Zbieranie nabojów
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

  // Popupy
  for (let i = popups.length - 1; i >= 0; i--) {
    const pop = popups[i];
    pop.y -= 1.0;
    pop.alpha -= 0.025;
    if (pop.alpha <= 0) popups.splice(i, 1);
  }

  // Wybuchy
  for (let i = explosions.length - 1; i >= 0; i--) {
    const ex = explosions[i];
    ex.radius += (ex.maxRadius - ex.radius) * 0.25;
    ex.alpha -= 0.05;
    if (ex.alpha <= 0) explosions.splice(i, 1);
  }

  // Cząsteczki farby
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.alpha -= 0.03;
    if (p.alpha <= 0) particles.splice(i, 1);
  }

  // Ślady farby (splats)
  for (let i = splats.length - 1; i >= 0; i--) {
    splats[i].ageFrames++;
    if (splats[i].ageFrames >= splats[i].maxFrames) {
      splats.splice(i, 1);
      paintCanvasDirty = true;
    }
  }

  // Chmury
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

  // Wyeliminowane postacie
  for (let i = eliminatedHumans.length - 1; i >= 0; i--) {
    eliminatedHumans[i].timer--;
    if (eliminatedHumans[i].timer <= 0) eliminatedHumans.splice(i, 1);
  }

  // Warunki zwycięstwa / przegranej
  const flyingProjectiles = bullets.length + homingRockets.length;

  if (enemies.length > 0) {
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

// Konsolowa funkcja do odblokowywania poziomów
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
