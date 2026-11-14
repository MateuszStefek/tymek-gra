// ==================== OBSŁUGA WEJŚCIA: KLAWIATURA, MYSZ, DOTYK ORAZ KONTROLER XBOX ====================

// Topbar i przyciski menu
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

  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  for (let i = 0; i < e.changedTouches.length; i++) {
    const t = e.changedTouches[i];
    const clientX = t.clientX;
    const clientY = t.clientY;

    if (clientX < window.innerWidth * 0.45 && !touchJoystick.active) {
      touchJoystick.active = true;
      touchJoystick.identifier = t.identifier;
      touchJoystick.startX = clientX;
      touchJoystick.startY = clientY;
      touchJoystick.currentX = clientX;
      touchJoystick.currentY = clientY;
      touchJoystick.dx = 0;
      touchJoystick.dy = 0;

      if (joystickBase && joystickThumb) {
        joystickBase.style.left = `${clientX}px`;
        joystickBase.style.top = `${clientY}px`;
        joystickBase.style.display = 'block';
        joystickThumb.style.transform = 'translate(-50%, -50%)';
      }
    } else {
      touchAimId = t.identifier;
      mouse.x = (clientX - rect.left) * scaleX;
      mouse.y = (clientY - rect.top) * scaleY;
      mouse.down = true;
      mouse.active = true;

      if (gameState === 'playing' && player.weapon !== 'nuke') {
        const angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
        firePlayerWeapon(player.x, player.y, angle);
      }
    }
  }
}

function handleCanvasTouchMove(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  for (let i = 0; i < e.changedTouches.length; i++) {
    const t = e.changedTouches[i];
    if (t.identifier === touchJoystick.identifier && touchJoystick.active) {
      touchJoystick.currentX = t.clientX;
      touchJoystick.currentY = t.clientY;
      const rawDx = t.clientX - touchJoystick.startX;
      const rawDy = t.clientY - touchJoystick.startY;
      const dist = Math.hypot(rawDx, rawDy);
      const maxR = 48;
      const clampedDist = Math.min(dist, maxR);
      const angle = Math.atan2(rawDy, rawDx);

      if (dist > 8) {
        touchJoystick.dx = (Math.cos(angle) * (clampedDist / maxR));
        touchJoystick.dy = (Math.sin(angle) * (clampedDist / maxR));
      } else {
        touchJoystick.dx = 0;
        touchJoystick.dy = 0;
      }

      if (joystickThumb) {
        const thumbX = Math.cos(angle) * clampedDist;
        const thumbY = Math.sin(angle) * clampedDist;
        joystickThumb.style.transform = `translate(calc(-50% + ${thumbX}px), calc(-50% + ${thumbY}px))`;
      }
    } else if (t.identifier === touchAimId) {
      mouse.x = (t.clientX - rect.left) * scaleX;
      mouse.y = (t.clientY - rect.top) * scaleY;
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

// Całkowita blokada menu kontekstowego pod prawym przyciskiem myszy
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
  if (player.weapon !== 'nuke') {
    const angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
    firePlayerWeapon(player.x, player.y, angle);
  }
});

window.addEventListener('mouseup', () => {
  mouse.down = false;
  pointerReleasedAfterMenuOpen = true;
});

// ==================== KONTROLER XBOX (GAMEPAD API) ====================

let gamepadIndex = null;
let lastGamepadButtons = {};
let isGamepadConnected = false;

window.addEventListener('gamepadconnected', (e) => {
  gamepadIndex = e.gamepad.index;
  isGamepadConnected = true;
  document.body.classList.add('gamepad-active');
  const gpName = (e.gamepad.id || 'Kontroler Xbox').split('(')[0].trim();
  popups.push({
    x: player.x,
    y: player.y - 36,
    text: `🎮 Kontroler podłączony! (${gpName})`,
    color: '#22c55e',
    alpha: 1
  });
});

window.addEventListener('gamepaddisconnected', (e) => {
  if (gamepadIndex === e.gamepad.index) {
    gamepadIndex = null;
    isGamepadConnected = false;
    document.body.classList.remove('gamepad-active');
    popups.push({
      x: player.x,
      y: player.y - 36,
      text: '🎮 Kontroler odłączony',
      color: '#ef4444',
      alpha: 1
    });
  }
});

function updateGamepadInput() {
  const gamepads = typeof navigator.getGamepads === 'function' ? navigator.getGamepads() : [];
  let gp = null;
  if (gamepadIndex !== null && gamepads[gamepadIndex]) {
    gp = gamepads[gamepadIndex];
  } else {
    for (let i = 0; i < gamepads.length; i++) {
      if (gamepads[i] && gamepads[i].connected) {
        gp = gamepads[i];
        gamepadIndex = i;
        isGamepadConnected = true;
        break;
      }
    }
  }

  if (!gp || !gp.connected) {
    if (isGamepadConnected) {
      isGamepadConnected = false;
      document.body.classList.remove('gamepad-active');
    }
    return null;
  }

  isGamepadConnected = true;
  document.body.classList.add('gamepad-active');

  // Martwa strefa gałek analogowych (deadzone)
  const deadzone = 0.18;

  // Pomocnicze funkcje do sprawdzania przycisków
  const isDown = (idx) => {
    const btn = gp.buttons[idx];
    if (!btn) return false;
    return typeof btn === 'object' ? (btn.pressed || btn.value > 0.35) : btn > 0.35;
  };
  const isJustPressed = (idx) => {
    const down = isDown(idx);
    const wasDown = !!lastGamepadButtons[idx];
    return down && !wasDown;
  };

  // Obsługa przycisków kontrolera na ekranie ukończenia poziomu (oraz ekranie przegranej)
  if (gameState === 'level_clear' || gameState === 'dead') {
    const ready = performance.now() >= menuReadyAt;
    if (ready) {
      // Przycisk A [0]: Następny poziom (jeśli dostępny po ukończeniu poziomu)
      if (isJustPressed(0)) {
        if (activeCustomMapIndex === null && level < unlockedLevel) {
          resultPopupOverlay.classList.add('hidden');
          startLevel(level + 1);
          for (let b = 0; b < gp.buttons.length; b++) lastGamepadButtons[b] = isDown(b);
          return null;
        }
      }

      // Przycisk X [2]: Zagraj jeszcze raz
      if (isJustPressed(2)) {
        resultPopupOverlay.classList.add('hidden');
        if (activeCustomMapIndex !== null) startCustomMap(activeCustomMapIndex);
        else startLevel(level);
        for (let b = 0; b < gp.buttons.length; b++) lastGamepadButtons[b] = isDown(b);
        return null;
      }

      // Przycisk B [1]: Wróć do ekranu głównego / wyboru poziomów
      if (isJustPressed(1)) {
        resultPopupOverlay.classList.add('hidden');
        openMenu('select');
        for (let b = 0; b < gp.buttons.length; b++) lastGamepadButtons[b] = isDown(b);
        return null;
      }
    }

    for (let b = 0; b < gp.buttons.length; b++) {
      lastGamepadButtons[b] = isDown(b);
    }
    return null;
  }

  // Lewa gałka (ruch postaci)
  let moveX = gp.axes[0] || 0;
  let moveY = gp.axes[1] || 0;
  if (Math.abs(moveX) < deadzone) moveX = 0;
  if (Math.abs(moveY) < deadzone) moveY = 0;

  // Obsługa D-pada do poruszania się
  if (gp.buttons[14] && gp.buttons[14].pressed) moveX = -1; // D-pad Left
  if (gp.buttons[15] && gp.buttons[15].pressed) moveX = 1;  // D-pad Right
  if (gp.buttons[12] && gp.buttons[12].pressed) moveY = -1; // D-pad Up
  if (gp.buttons[13] && gp.buttons[13].pressed) moveY = 1;  // D-pad Down

  // Normalizacja wektora ruchu jeśli długość > 1
  const moveLen = Math.hypot(moveX, moveY);
  if (moveLen > 1) {
    moveX /= moveLen;
    moveY /= moveLen;
  }

  // Prawa gałka (celowanie)
  let aimX = gp.axes[2] || 0;
  let aimY = gp.axes[3] || 0;
  const aimDistSq = aimX * aimX + aimY * aimY;
  const hasAim = aimDistSq > (deadzone * deadzone);

  // Start / Menu [przycisk 9]: pauza
  if (isJustPressed(9)) {
    togglePause();
  }

  // Back / View [przycisk 8]: menu poziomów
  if (isJustPressed(8)) {
    if (gameState === 'playing' || gameState === 'paused') openMenu('select');
    else if (['menu', 'custom_maps', 'shop', 'settings', 'enemies'].includes(gameState)) {
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

  // Przycisk Y [przycisk 3]: zmiana broni [Q]
  if (isJustPressed(3)) {
    switchWeaponInStage();
  }

  // Przycisk B [1], Przycisk X [2] lub Lewy Spust LT [6]: postawienie miny
  if (isJustPressed(1) || isJustPressed(2) || isJustPressed(6)) {
    if (gameState === 'playing') {
      placeMine();
    }
  }

  // Prawy Spust RT [7], Prawy Bumper RB [5] lub Przycisk A [0]: strzał
  const isShooting = isDown(7) || isDown(5) || isDown(0);

  // Zapamiętanie stanów przycisków do wykrywania pojedynczych kliknięć
  for (let b = 0; b < gp.buttons.length; b++) {
    lastGamepadButtons[b] = isDown(b);
  }

  return {
    moveX,
    moveY,
    aimX,
    aimY,
    hasAim,
    isShooting
  };
}
