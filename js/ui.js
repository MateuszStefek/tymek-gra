// Interfejs użytkownika: HUD, menu poziomów, ekran własnych map i edytor oraz pauza

menuOverlay.addEventListener('mousedown', (e) => {
  if (e.button === 0 && performance.now() >= menuReadyAt && pointerReleasedAfterMenuOpen) {
    menuPointerArmed = true;
  } else {
    menuPointerArmed = false;
  }
});

if (resultPopupOverlay) {
  resultPopupOverlay.addEventListener('mousedown', (e) => {
    if (e.button === 0 && performance.now() >= menuReadyAt && pointerReleasedAfterMenuOpen) {
      menuPointerArmed = true;
    } else {
      menuPointerArmed = false;
    }
  });
}

function canActivateMenuAction() {
  return performance.now() >= menuReadyAt && pointerReleasedAfterMenuOpen && menuPointerArmed;
}

function applyGraphicTheme() {
  const theme = graphicThemes[currentThemeIndex % graphicThemes.length] || graphicThemes[0];
  document.body.style.backgroundColor = theme.bodyBg;
  if (topbarEl) {
    topbarEl.style.backgroundColor = theme.panelBg;
    topbarEl.style.borderColor = theme.accentColor;
  }
  canvas.style.borderColor = theme.accentColor;
  menuOverlay.style.borderColor = theme.accentColor;
  customOverlay.style.borderColor = theme.accentColor;
  if (shopOverlay) shopOverlay.style.borderColor = theme.accentColor;
  if (settingsOverlay) settingsOverlay.style.borderColor = theme.accentColor;
  if (enemiesOverlay) enemiesOverlay.style.borderColor = theme.accentColor;
  if (btnTheme) {
    btnTheme.textContent = `🎨 Motyw: ${theme.name} [T]`;
  }
}
applyGraphicTheme();

function cycleGraphicTheme() {
  currentThemeIndex = (currentThemeIndex + 1) % graphicThemes.length;
  applyGraphicTheme();
  saveProgress();
  canvas.focus();
}

function resizeGameLayout() {
  const wrapper = document.querySelector('.game-wrapper');
  const hintEl = document.getElementById('hint');
  if (!wrapper) return;

  const isLevelMenuOpen = Boolean(menuOverlay && !menuOverlay.classList.contains('hidden'));
  const aspect = canvas.width / canvas.height; // 940 / 560
  const padX = 24;
  const padY = 20;
  const availW = Math.max(420, window.innerWidth - padX);

  // Pierwszy przebieg: ustaw wstępną szerokość paska topbar, aby zmierzyć jego dokładną wysokość po zawinięciu wierszy
  if (topbarEl) {
    topbarEl.style.width = `${availW}px`;
  }
  const topbarH = topbarEl ? topbarEl.offsetHeight : 80;
  const hintH = hintEl && hintEl.offsetParent !== null ? hintEl.offsetHeight + 8 : 0;
  const availH = Math.max(260, window.innerHeight - topbarH - hintH - padY);

  let targetW = availW;
  let targetH = availH;

  if (isLevelMenuOpen) {
    // Menu poziomów może być szersze niż proporcje areny 940:560, jeśli mieści się na ekranie
    wrapper.style.aspectRatio = 'auto';
  } else {
    wrapper.style.aspectRatio = '940 / 560';
    targetH = targetW / aspect;
    if (targetH > availH) {
      targetH = availH;
      targetW = targetH * aspect;
    }

    if (topbarEl) {
      topbarEl.style.width = `${Math.floor(targetW)}px`;
      const newTopbarH = topbarEl.offsetHeight;
      if (newTopbarH !== topbarH) {
        const availH2 = Math.max(260, window.innerHeight - newTopbarH - hintH - padY);
        if (targetH > availH2) {
          targetH = availH2;
          targetW = targetH * aspect;
          topbarEl.style.width = `${Math.floor(targetW)}px`;
        }
      }
    }
  }

  if (topbarEl) {
    topbarEl.style.width = `${Math.floor(targetW)}px`;
  }
  wrapper.style.width = `${Math.floor(targetW)}px`;
  wrapper.style.height = `${Math.floor(targetH)}px`;
}

window.addEventListener('resize', resizeGameLayout);
setTimeout(resizeGameLayout, 0);

function updatePauseButtonUI() {
  const isPaused = gameState === 'paused';
  btnPause.classList.toggle('active', isPaused);
  btnPause.textContent = isPaused ? '▶️ Wznów [P]' : '⏸️ Pauza [P]';
}

function togglePause() {
  if (gameState === 'playing') {
    gameState = 'paused';
    updatePauseButtonUI();
  } else if (gameState === 'paused') {
    startTime = performance.now() - survivalSeconds * 1000;
    gameState = 'playing';
    updatePauseButtonUI();
    canvas.focus();
  }
}

function updateHud() {
  const hp = Math.max(0, player.hp);
  const pct = (hp / player.maxHp) * 100;
  levelText.textContent = activeCustomMapIndex !== null
    ? `🛠️ ${customMaps[activeCustomMapIndex].name}`
    : `${level} (max: ${unlockedLevel})`;
  if (diamondsText) diamondsText.textContent = diamonds;
  ammoText.textContent = player.ammo;
  ammoText.style.color = player.ammo > 5 ? '#facc15' : '#ef4444';
  if (rocketsText) {
    rocketsText.textContent = player.rockets;
    rocketsText.style.color = player.rockets > 0 ? '#fb923c' : '#ef4444';
  }
  if (btnSwitchWeapon) {
    const wObj = weaponsCatalog.find(w => w.id === player.weapon) || weaponsCatalog[0];
    btnSwitchWeapon.textContent = `${wObj.shortName} [Q]`;
    btnSwitchWeapon.classList.toggle('active', player.weapon === 'bazooka');
  }
  minesText.textContent = minesCount;
  btnPlaceMine.textContent = `💣 Postaw minę: ${minesCount} [PPM / SPACJA]`;
  btnPlaceMine.disabled = minesCount <= 0;
  if (touchMineBadge) touchMineBadge.textContent = minesCount;
  if (touchBtnMine) touchBtnMine.disabled = minesCount <= 0;
  if (touchBtnWeapon) {
    touchBtnWeapon.textContent = player.weapon === 'bazooka' ? '🚀' : '🔫';
  }
  hpText.textContent = `${hp}/${player.maxHp}`;
  hpFill.style.width = pct + '%';
  hpFill.style.backgroundColor = pct > 50 ? '#22c55e' : (pct > 25 ? '#facc15' : '#ef4444');
  aliveText.textContent = `${enemies.length} / ${totalEnemiesInLevel}`;
  btnPrevLevel.disabled = level <= 1;
  btnNextLevel.disabled = level >= unlockedLevel;
  updatePauseButtonUI();
}

function switchWeaponInStage() {
  if (ownedWeapons.length <= 1) {
    popups.push({
      x: player.x,
      y: player.y - 30,
      text: 'Kup więcej broni w 🛒 Sklepie!',
      color: '#38bdf8',
      alpha: 1
    });
    canvas.focus();
    return;
  }
  const idx = ownedWeapons.indexOf(player.weapon);
  player.weapon = ownedWeapons[(idx + 1) % ownedWeapons.length];
  player.emptyBazookaTries = 0;
  playReloadSound();
  const wObj = weaponsCatalog.find(w => w.id === player.weapon) || weaponsCatalog[0];
  popups.push({
    x: player.x,
    y: player.y - 30,
    text: `Wybrano: ${wObj.shortName}!`,
    color: '#fde047',
    alpha: 1
  });
  updateHud();
  canvas.focus();
}

function openShopScreen() {
  if (menuCountdownInterval) {
    clearInterval(menuCountdownInterval);
    menuCountdownInterval = null;
  }
  mouse.down = false;
  gameState = 'shop';
  menuOverlay.classList.add('hidden');
  customOverlay.classList.add('hidden');
  if (settingsOverlay) settingsOverlay.classList.add('hidden');
  if (enemiesOverlay) enemiesOverlay.classList.add('hidden');
  if (resultPopupOverlay) resultPopupOverlay.classList.add('hidden');
  if (shopOverlay) shopOverlay.classList.remove('hidden');
  resizeGameLayout();
  renderShopWeapons();
}

function openEnemiesScreen() {
  if (menuCountdownInterval) {
    clearInterval(menuCountdownInterval);
    menuCountdownInterval = null;
  }
  mouse.down = false;
  gameState = 'enemies';
  menuOverlay.classList.add('hidden');
  customOverlay.classList.add('hidden');
  if (shopOverlay) shopOverlay.classList.add('hidden');
  if (settingsOverlay) settingsOverlay.classList.add('hidden');
  if (resultPopupOverlay) resultPopupOverlay.classList.add('hidden');
  if (enemiesOverlay) enemiesOverlay.classList.remove('hidden');
  resizeGameLayout();
  renderEnemiesCatalog();
}

function renderEnemiesCatalog() {
  if (!enemiesCatalogGrid) return;
  enemiesCatalogGrid.innerHTML = '';

  const catalog = ENEMY_KIND_KEYS.map(k => {
    const info = ENEMY_KIND_INFO[k];
    return {
      kind: k,
      title: info.name,
      badge: info.badge,
      badgeColor: info.badgeColor,
      desc: info.desc,
      details: info.details
    };
  });

  catalog.push({
    kind: 'civilian',
    title: '🏥 Cywil — Lekarz',
    badge: '❤️ 2 HP | ⚠️ Kara: -50 HP i -50 Max HP!',
    badgeColor: '#38bdf8',
    desc: 'Postać w białym fartuchu lekarskim z czerwonym krzyżem, czepkiem medycznym i apteczką w dłoni.',
    details: 'Chodzi losowo po mapie i omija uzbrojone miny (nie widzi min w trakcie uzbrajania). Pociski wrogów go nie ranią, ale Twoje strzały, miny oraz Bazooka (jeśli jest najbliżej kursora) tak! Przetrwa 1 postrzał — zabicie go odejmuje 50 HP i 50 Max HP do końca poziomu (odradza się po 5s).'
  });

  const unlockedKinds = getUnlockedEnemyKinds();
  catalog.filter(item => item.kind === 'civilian' || unlockedKinds.has(item.kind)).forEach(item => {
    const card = document.createElement('div');
    card.className = 'level-card';
    card.style.cursor = 'default';
    card.style.textAlign = 'left';
    card.style.gap = '6px';
    card.style.borderColor = item.badgeColor;

    card.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;">
        <canvas width="76" height="84" style="width:76px;height:84px;background:#0f172a;border:2px solid ${item.badgeColor};border-radius:10px;flex-shrink:0;"></canvas>
        <div>
          <div class="lvl-title" style="font-size:16px;color:${item.badgeColor};">${item.title}</div>
          <div style="font-size:11px;font-weight:900;color:#fde047;margin-top:2px;">${item.badge}</div>
          <div class="lvl-enemies" style="font-size:12px;margin-top:4px;color:#e2e8f0;">${item.desc}</div>
        </div>
      </div>
      <div class="lvl-enemies" style="font-size:11px;color:#93c5fd;background:#0f172a;padding:7px 9px;border-radius:8px;border:1px solid #334155;">
        ${item.details}
      </div>
    `;
    enemiesCatalogGrid.appendChild(card);
    const previewCanvas = card.querySelector('canvas');
    drawNpcPreviewOnCanvas(previewCanvas, item.kind);
  });
}

let confirmResetPending = false;
let resetSuccessMessage = '';

function openSettingsScreen() {
  if (menuCountdownInterval) {
    clearInterval(menuCountdownInterval);
    menuCountdownInterval = null;
  }
  mouse.down = false;
  confirmResetPending = false;
  resetSuccessMessage = '';
  gameState = 'settings';
  menuOverlay.classList.add('hidden');
  customOverlay.classList.add('hidden');
  if (shopOverlay) shopOverlay.classList.add('hidden');
  if (enemiesOverlay) enemiesOverlay.classList.add('hidden');
  if (resultPopupOverlay) resultPopupOverlay.classList.add('hidden');
  if (settingsOverlay) settingsOverlay.classList.remove('hidden');
  resizeGameLayout();
  renderSettingsScreen();
}

function renderSettingsScreen() {
  if (!settingsBox) return;
  const theme = graphicThemes[currentThemeIndex % graphicThemes.length] || graphicThemes[0];
  settingsBox.innerHTML = `
    <div class="editor-row">
      <span>🎨 Motyw graficzny areny [T]:</span>
      <div class="editor-stepper">
        <button id="setPrevTheme">⬅️</button>
        <span style="min-width:155px;font-size:14px;color:#38bdf8;">${theme.name}</span>
        <button id="setNextTheme">➡️</button>
      </div>
    </div>
    <div class="editor-row" style="border-color:#ef4444;background:rgba(127, 29, 29, 0.22);flex-direction:column;align-items:stretch;gap:8px;">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
        <div>
          <div style="color:#fca5a5;font-size:15px;font-weight:900;">🗑️ Reset osiągnięć — Pełny Reset</div>
          <div style="color:#cbd5e1;font-size:12px;font-weight:600;margin-top:2px;">Kasuje odblokowane poziomy (wraca do Poziomu 1), czasy, 💎 diamenty, kupione bronie, ulepszenia, miny oraz własne mapy.</div>
        </div>
        <button id="setBtnResetAll" class="mine-btn" style="background:${confirmResetPending ? '#dc2626' : '#991b1b'};border-color:#f87171;">
          ${confirmResetPending ? '⚠️ POTWIERDŹ PEŁNY RESET!' : '🗑️ Reset osiągnięć (Pełny Reset)'}
        </button>
      </div>
      ${confirmResetPending ? '<div style="font-size:12px;color:#fde047;text-align:right;">Kliknij przycisk ponownie, aby bezpowrotnie wyzerować cały postęp!</div>' : ''}
      ${resetSuccessMessage ? `<div style="font-size:13px;color:#4ade80;font-weight:900;text-align:center;">${resetSuccessMessage}</div>` : ''}
    </div>
  `;

  settingsBox.querySelector('#setPrevTheme').onclick = () => {
    currentThemeIndex = (currentThemeIndex + graphicThemes.length - 1) % graphicThemes.length;
    applyGraphicTheme();
    saveProgress();
    renderSettingsScreen();
  };
  settingsBox.querySelector('#setNextTheme').onclick = () => {
    currentThemeIndex = (currentThemeIndex + 1) % graphicThemes.length;
    applyGraphicTheme();
    saveProgress();
    renderSettingsScreen();
  };
  settingsBox.querySelector('#setBtnResetAll').onclick = () => {
    if (!confirmResetPending) {
      confirmResetPending = true;
      renderSettingsScreen();
      return;
    }
    resetAllProgress();
    startLevel(1);
    hasStartedAnyGame = false;
    confirmResetPending = false;
    resetSuccessMessage = '✅ Wykonano pełny reset osiągnięć! Wszystkie statystyki, bronie i poziomy wróciły do stanu początkowego.';
    openSettingsScreen();
    resetSuccessMessage = '✅ Wykonano pełny reset osiągnięć! Wszystkie statystyki, bronie i poziomy wróciły do stanu początkowego.';
    renderSettingsScreen();
  };
}

function renderHorizontalTrack(trackTitle, headerRightHtml, currentStateNode, nextPurchaseNode) {
  const trackEl = document.createElement('div');
  trackEl.className = 'tree-track';
  trackEl.innerHTML = `
    <div class="tree-track-header">
      <span>${trackTitle}</span>
      <div>${headerRightHtml || ''}</div>
    </div>
    <div class="tree-nodes-row"></div>
  `;
  const rowEl = trackEl.querySelector('.tree-nodes-row');

  if (currentStateNode) {
    rowEl.appendChild(currentStateNode);
  }

  if (nextPurchaseNode) {
    const conn = document.createElement('div');
    conn.className = 'tree-connector active';
    conn.textContent = '──►';
    rowEl.appendChild(conn);
    rowEl.appendChild(nextPurchaseNode);
  }

  return trackEl;
}

function renderShopWeapons() {
  if (!shopWeaponsGrid) return;
  const defObj = weaponsCatalog.find(w => w.id === defaultWeapon) || weaponsCatalog[0];
  if (shopSubtitle) {
    const avgHeal = getAverageHealingPerSecond(healingLevel);
    shopSubtitle.innerHTML = `Masz <b style="color:#38bdf8;">💎 ${diamonds} diamentów</b> | Domyślna broń: <b style="color:#fde047;">${defObj.name}</b> | Startowe HP: <b style="color:#4ade80;">${getStartingMaxHp()} ❤️</b> | Leczenie śr.: <b style="color:#4ade80;">${avgHeal.toFixed(2)} HP/s 💚</b><br><span style="font-size:12px;color:#94a3b8;">Każdy tor pokazuje po lewej <b>aktualny stan</b>, a po prawej <b>następną rzecz do kupienia</b> (pierwszy zakup odblokowuje tor).</span>`;
  }
  shopWeaponsGrid.innerHTML = '';

  // Tory broni
  weaponsCatalog.forEach(w => {
    const isWeaponOwned = ownedWeapons.includes(w.id);
    const isDefault = defaultWeapon === w.id;
    const upgrades = w.upgrades || [];

    // Znajdź ostatnie kupione ulepszenie tej broni
    let lastOwnedUpg = null;
    let nextUpg = null;
    for (let i = 0; i < upgrades.length; i++) {
      if (ownedUpgrades.includes(upgrades[i].id)) {
        lastOwnedUpg = upgrades[i];
      } else if (!nextUpg) {
        nextUpg = upgrades[i];
      }
    }

    // 1. Węzeł AKTUALNEGO STANU (po lewej)
    const currentNode = document.createElement('div');
    if (!isWeaponOwned) {
      currentNode.className = 'tree-node locked';
      currentNode.innerHTML = `
        <div>
          <div style="font-size:10px;font-weight:900;color:#94a3b8;">🔒 AKTUALNY STAN: TOR ZABLOKOWANY</div>
          <div class="lvl-title" style="font-size:15px;color:#94a3b8;">${w.name}</div>
          <div class="lvl-enemies" style="font-size:11px;margin:3px 0;">Nie posiadasz jeszcze tej broni.</div>
          <div class="lvl-enemies" style="color:#64748b;font-size:11px;">Kup odblokowanie toru po prawej stronie, aby używać broni i kupować jej wzmocnienia!</div>
        </div>
      `;
    } else {
      currentNode.className = `tree-node owned last-owned ${isDefault ? 'default-weapon' : ''}`;
      const stateTitle = lastOwnedUpg ? `${w.shortName} — ${lastOwnedUpg.name}` : w.name;
      const stateDesc = lastOwnedUpg ? lastOwnedUpg.desc : w.desc;
      const stateEffect = lastOwnedUpg ? lastOwnedUpg.effectLabel : w.ammoLabel;
      currentNode.innerHTML = `
        <div>
          <div style="font-size:10px;font-weight:900;color:#4ade80;">✅ AKTUALNY STAN</div>
          <div class="lvl-title" style="font-size:15px;">${stateTitle}</div>
          <div class="lvl-enemies" style="font-size:11px;margin:3px 0;">${stateDesc}</div>
          <div class="lvl-enemies" style="color:#93c5fd;font-size:11px;">${stateEffect}</div>
        </div>
        <div class="custom-card-btns" style="margin-top:6px;justify-content:flex-start;"></div>
      `;
      const btnWrap = currentNode.querySelector('.custom-card-btns');
      const btnDef = document.createElement('button');
      btnDef.className = isDefault ? 'btn-blue' : 'btn-purple';
      btnDef.textContent = isDefault ? '⭐ Domyślna broń' : '⭐ Ustaw jako domyślną';
      btnDef.onclick = () => {
        defaultWeapon = w.id;
        player.weapon = w.id;
        saveProgress();
        updateHud();
        renderShopWeapons();
      };
      btnWrap.appendChild(btnDef);
    }

    // 2. Węzeł NASTĘPNEJ RZECZY DO KUPIENIA (po prawej)
    const nextNode = document.createElement('div');
    if (!isWeaponOwned) {
      // Pierwsza rzecz do kupienia to odblokowanie toru (zakup broni)
      nextNode.className = 'tree-node next-unlock';
      nextNode.innerHTML = `
        <div>
          <div style="font-size:10px;font-weight:900;color:#facc15;">🔓 NASTĘPNA RZECZ DO KUPIENIA (ODBLOKOWANIE TORU)</div>
          <div class="lvl-title" style="font-size:15px;">${w.name}</div>
          <div class="lvl-enemies" style="font-size:11px;margin:3px 0;">${w.desc}</div>
          <div class="lvl-enemies" style="color:#93c5fd;font-size:11px;">${w.ammoLabel}</div>
        </div>
        <div class="custom-card-btns" style="margin-top:6px;justify-content:flex-start;"></div>
      `;
      const btnWrap = nextNode.querySelector('.custom-card-btns');
      const btnBuy = document.createElement('button');
      btnBuy.className = 'btn-green';
      btnBuy.disabled = diamonds < w.cost;
      btnBuy.textContent = diamonds >= w.cost ? `🛒 Odblokuj tor (${w.cost} 💎)` : `🔒 Brak 💎 (${diamonds}/${w.cost})`;
      btnBuy.onclick = () => {
        if (diamonds < w.cost) return;
        diamonds -= w.cost;
        if (!ownedWeapons.includes(w.id)) ownedWeapons.push(w.id);
        defaultWeapon = w.id;
        player.weapon = w.id;
        saveProgress();
        updateHud();
        renderShopWeapons();
      };
      btnWrap.appendChild(btnBuy);
    } else if (nextUpg) {
      nextNode.className = 'tree-node next-unlock';
      nextNode.innerHTML = `
        <div>
          <div style="font-size:10px;font-weight:900;color:#facc15;">🔓 NASTĘPNA RZECZ DO KUPIENIA</div>
          <div class="lvl-title" style="font-size:15px;">${nextUpg.name}</div>
          <div class="lvl-enemies" style="font-size:11px;margin:3px 0;">${nextUpg.desc}</div>
          <div class="lvl-enemies" style="color:#93c5fd;font-size:11px;">${nextUpg.effectLabel}</div>
        </div>
        <div class="custom-card-btns" style="margin-top:6px;justify-content:flex-start;"></div>
      `;
      const btnWrap = nextNode.querySelector('.custom-card-btns');
      const btnBuyUpg = document.createElement('button');
      btnBuyUpg.className = 'btn-green';
      btnBuyUpg.disabled = diamonds < nextUpg.cost;
      btnBuyUpg.textContent = diamonds >= nextUpg.cost ? `🛒 Kup wzmocnienie (${nextUpg.cost} 💎)` : `🔒 Brak 💎 (${diamonds}/${nextUpg.cost})`;
      btnBuyUpg.onclick = () => {
        if (diamonds < nextUpg.cost) return;
        diamonds -= nextUpg.cost;
        if (!ownedUpgrades.includes(nextUpg.id)) ownedUpgrades.push(nextUpg.id);
        if (nextUpg.id.startsWith('bazooka_rockets_')) {
          bazookaUpgraded = true;
          player.rockets = Math.max(player.rockets, getStartingRockets());
        }
        if (nextUpg.id === 'pistol_ammo_1' || nextUpg.id === 'pistol_ammo_2') {
          player.ammo = Math.max(player.ammo, getStartingAmmo());
        }
        saveProgress();
        updateHud();
        renderShopWeapons();
      };
      btnWrap.appendChild(btnBuyUpg);
    } else {
      nextNode.className = 'tree-node owned';
      nextNode.innerHTML = `
        <div>
          <div style="font-size:10px;font-weight:900;color:#4ade80;">🏆 MAKSYMALNY POZIOM</div>
          <div class="lvl-title" style="font-size:15px;">Wszystkie wzmocnienia kupione!</div>
          <div class="lvl-enemies" style="font-size:11px;margin:3px 0;">Ten tor broni został ulepszony do maksimum.</div>
        </div>
      `;
    }

    const trackEl = renderHorizontalTrack(
      `🌳 Tor Broni: ${w.name}`,
      isWeaponOwned
        ? `<button class="btn-def-track ${isDefault ? 'btn-blue' : 'btn-purple'}" style="padding:3px 10px;font-size:11px;">${isDefault ? '⭐ Domyślna broń na start' : '⭐ Ustaw jako domyślną'}</button>`
        : `<span style="font-size:12px;color:#94a3b8;">🔒 Tor zablokowany</span>`,
      currentNode,
      nextNode
    );
    const hdrBtn = trackEl.querySelector('.btn-def-track');
    if (hdrBtn) {
      hdrBtn.onclick = () => {
        defaultWeapon = w.id;
        player.weapon = w.id;
        saveProgress();
        updateHud();
        renderShopWeapons();
      };
    }
    shopWeaponsGrid.appendChild(trackEl);
  });

  // Tor Wzmocnienia Życia (HP) — nieskończony: każdy poziom +5 max HP, cena rośnie ciągiem Fibonacciego (1, 2, 3, 5, 8...)
  const hpNextLvl = hpLevel + 1;
  const hpNextCost = getFibonacciCost(hpNextLvl);

  const hpCurrentNode = document.createElement('div');
  hpCurrentNode.className = 'tree-node owned last-owned';
  hpCurrentNode.innerHTML = `
    <div>
      <div style="font-size:10px;font-weight:900;color:#4ade80;">✅ AKTUALNY STAN (POZIOM ${hpLevel})</div>
      <div class="lvl-title" style="font-size:15px;">❤️ Zdrowie: ${getStartingMaxHp()} HP</div>
      <div class="lvl-enemies" style="font-size:11px;margin:3px 0;">${hpLevel === 0 ? hpTrackConfig.baseDesc : `Kupiono ${hpLevel} wzmocnień życia (+${hpLevel * 5} HP do bazowych 200 HP).`}</div>
    </div>
  `;

  const hpNextNode = document.createElement('div');
  hpNextNode.className = 'tree-node next-unlock';
  hpNextNode.innerHTML = `
    <div>
      <div style="font-size:10px;font-weight:900;color:#facc15;">🔓 NASTĘPNA RZECZ DO KUPIENIA</div>
      <div class="lvl-title" style="font-size:15px;">🛡️ Wzmocnienie Życia ${hpNextLvl} (+5 HP)</div>
      <div class="lvl-enemies" style="font-size:11px;margin:3px 0;">Kolejne +5 maksymalnego HP na start każdej rundy. Tor bez limitu!</div>
      <div class="lvl-enemies" style="color:#93c5fd;font-size:11px;">❤️ Startowe HP: ${getStartingMaxHp()} ➡️ ${getStartingMaxHp() + 5} HP</div>
    </div>
    <div class="custom-card-btns" style="margin-top:6px;justify-content:flex-start;"></div>
  `;
  const hpBtnWrap = hpNextNode.querySelector('.custom-card-btns');
  const btnBuyHp = document.createElement('button');
  btnBuyHp.className = 'btn-green';
  btnBuyHp.disabled = diamonds < hpNextCost;
  btnBuyHp.textContent = diamonds >= hpNextCost
    ? `🛒 Kup wzmocnienie (${hpNextCost} 💎)`
    : `🔒 Brak 💎 (${diamonds}/${hpNextCost})`;
  btnBuyHp.onclick = () => {
    if (diamonds < hpNextCost) return;
    diamonds -= hpNextCost;
    hpLevel = hpNextLvl;
    player.maxHp = getStartingMaxHp();
    player.hp = Math.min(player.maxHp, player.hp + 5);
    saveProgress();
    updateHud();
    renderShopWeapons();
  };
  hpBtnWrap.appendChild(btnBuyHp);

  shopWeaponsGrid.appendChild(
    renderHorizontalTrack(
      hpTrackConfig.title,
      `<span style="font-size:12px;color:#4ade80;">❤️ Aktualnie na start: ${getStartingMaxHp()} HP</span>`,
      hpCurrentNode,
      hpNextNode
    )
  );

  // Tor Leczenia — każdy kolejny poziom dodaje dyskretny impuls +1 HP co (4 + poziom) sekund (5s, 6s, 7s, 8s...), a ceny rosną Fibonaccim (1, 2, 3, 5, 8...)
  const curHeal = healingLevel;
  const nextHealLvl = curHeal + 1;
  const nextHealSec = getHealingIntervalSeconds(nextHealLvl);
  const nextHealCost = getHealingUpgradeCost(nextHealLvl);
  const curAvgHpSec = getAverageHealingPerSecond(curHeal);
  const nextAvgHpSec = getAverageHealingPerSecond(nextHealLvl);

  const healCurrentNode = document.createElement('div');
  if (curHeal <= 0) {
    healCurrentNode.className = 'tree-node locked';
    healCurrentNode.innerHTML = `
      <div>
        <div style="font-size:10px;font-weight:900;color:#94a3b8;">🔒 AKTUALNY STAN: TOR ZABLOKOWANY</div>
        <div class="lvl-title" style="font-size:15px;color:#94a3b8;">${healingTrackConfig.lockedName}</div>
        <div class="lvl-enemies" style="font-size:11px;margin:3px 0;">${healingTrackConfig.lockedDesc}</div>
        <div class="lvl-enemies" style="color:#64748b;font-size:11px;">💚 Uśrednione leczenie: 0.00 HP / s</div>
      </div>
    `;
  } else {
    const activePulses = [];
    for (let k = 1; k <= curHeal; k++) {
      activePulses.push(`1 HP/${getHealingIntervalSeconds(k)}s`);
    }
    healCurrentNode.className = 'tree-node owned last-owned';
    healCurrentNode.innerHTML = `
      <div>
        <div style="font-size:10px;font-weight:900;color:#4ade80;">✅ AKTUALNY STAN (POZIOM ${curHeal})</div>
        <div class="lvl-title" style="font-size:15px;">💚 Średnio: ${curAvgHpSec.toFixed(2)} HP / s</div>
        <div class="lvl-enemies" style="font-size:11px;margin:3px 0;">Aktywne dyskretne impulsy leczenia (${curHeal}):</div>
        <div class="lvl-enemies" style="color:#93c5fd;font-size:11px;">⏱️ ${activePulses.join(' + ')}</div>
      </div>
    `;
  }

  const healNextNode = document.createElement('div');
  const isFirstHealUnlock = curHeal === 0;
  healNextNode.className = 'tree-node next-unlock';
  healNextNode.innerHTML = `
    <div>
      <div style="font-size:10px;font-weight:900;color:#facc15;">${isFirstHealUnlock ? '🔓 NASTĘPNA RZECZ DO KUPIENIA (ODBLOKOWANIE TORU)' : '🔓 NASTĘPNA RZECZ DO KUPIENIA'}</div>
      <div class="lvl-title" style="font-size:15px;">💚 +1 HP co ${nextHealSec} sekund (${nextHealCost} 💎)</div>
      <div class="lvl-enemies" style="font-size:11px;margin:3px 0;">${isFirstHealUnlock ? `Odblokowuje pierwszy dyskretny impuls leczenia: +1 HP co każde ${nextHealSec} sekund!` : `Dodaje kolejny niezależny impuls: +1 HP co każde ${nextHealSec} sekund!`}</div>
      <div class="lvl-enemies" style="color:#93c5fd;font-size:11px;">💚 Średnio: ${curAvgHpSec.toFixed(2)} ➡️ ${nextAvgHpSec.toFixed(2)} HP / s</div>
    </div>
    <div class="custom-card-btns" style="margin-top:6px;justify-content:flex-start;"></div>
  `;
  const healBtnWrap = healNextNode.querySelector('.custom-card-btns');
  const btnBuyHeal = document.createElement('button');
  btnBuyHeal.className = 'btn-green';
  btnBuyHeal.disabled = diamonds < nextHealCost;
  btnBuyHeal.textContent = diamonds >= nextHealCost
    ? `🛒 ${isFirstHealUnlock ? 'Odblokuj tor' : 'Kup wzmocnienie'}: 1 HP/${nextHealSec}s (${nextHealCost} 💎)`
    : `🔒 Brak 💎 (${diamonds}/${nextHealCost})`;
  btnBuyHeal.onclick = () => {
    if (diamonds < nextHealCost) return;
    diamonds -= nextHealCost;
    healingLevel = nextHealLvl;
    saveProgress();
    updateHud();
    renderShopWeapons();
  };
  healBtnWrap.appendChild(btnBuyHeal);

  shopWeaponsGrid.appendChild(
    renderHorizontalTrack(
      healingTrackConfig.title,
      curHeal > 0
        ? `<span style="font-size:12px;color:#4ade80;">💚 Średnio: ${curAvgHpSec.toFixed(2)} HP/s (Poziom ${curHeal})</span>`
        : `<span style="font-size:12px;color:#94a3b8;">🔒 Tor zablokowany (0.00 HP/s)</span>`,
      healCurrentNode,
      healNextNode
    )
  );

  // Tor Uzupełniania Nabojów — nieskończony: każdy poziom daje +1 nabój co 5 sekund, ceny Fibonacciego
  const curAmmo = ammoRegenLevel;
  const nextAmmoLvl = curAmmo + 1;
  const nextAmmoCost = getFibonacciCost(nextAmmoLvl);

  const ammoCurrentNode = document.createElement('div');
  if (curAmmo <= 0) {
    ammoCurrentNode.className = 'tree-node locked';
    ammoCurrentNode.innerHTML = `
      <div>
        <div style="font-size:10px;font-weight:900;color:#94a3b8;">🔒 AKTUALNY STAN: TOR ZABLOKOWANY</div>
        <div class="lvl-title" style="font-size:15px;color:#94a3b8;">🎨 Uzupełnianie Wyłączone (0 nab./5s)</div>
        <div class="lvl-enemies" style="font-size:11px;margin:3px 0;">Brak automatycznego odnawiania amunicji w trakcie etapu. Odblokuj tor po prawej stronie!</div>
      </div>
    `;
  } else {
    ammoCurrentNode.className = 'tree-node owned last-owned';
    ammoCurrentNode.innerHTML = `
      <div>
        <div style="font-size:10px;font-weight:900;color:#4ade80;">✅ AKTUALNY STAN (POZIOM ${curAmmo})</div>
        <div class="lvl-title" style="font-size:15px;">🎨 +${curAmmo} nab. co 5 sekund</div>
        <div class="lvl-enemies" style="font-size:11px;margin:3px 0;">Co 5 sekund otrzymujesz automatycznie ${curAmmo} nab. farby!</div>
        <div class="lvl-enemies" style="color:#93c5fd;font-size:11px;">Średnio: ${(curAmmo / 5).toFixed(2)} nab./s</div>
      </div>
    `;
  }

  const ammoNextNode = document.createElement('div');
  ammoNextNode.className = 'tree-node next-unlock';
  ammoNextNode.innerHTML = `
    <div>
      <div style="font-size:10px;font-weight:900;color:#facc15;">${curAmmo === 0 ? '🔓 NASTĘPNA RZECZ DO KUPIENIA (ODBLOKOWANIE TORU)' : '🔓 NASTĘPNA RZECZ DO KUPIENIA'}</div>
      <div class="lvl-title" style="font-size:15px;">🎨 ${curAmmo === 0 ? '1 nabój co 5 sekund' : `+1 nabój co 5s (łącznie: ${nextAmmoLvl} nab./5s)`}</div>
      <div class="lvl-enemies" style="font-size:11px;margin:3px 0;">Nieskończony tor amunicji! Każdy poziom zwiększa odnawianie o +1 nabój co 5 sekund.</div>
      <div class="lvl-enemies" style="color:#93c5fd;font-size:11px;">🎨 Średnio: ${(curAmmo / 5).toFixed(2)} ➡️ ${(nextAmmoLvl / 5).toFixed(2)} nab./s</div>
    </div>
    <div class="custom-card-btns" style="margin-top:6px;justify-content:flex-start;"></div>
  `;
  const btnBuyAmmo = document.createElement('button');
  btnBuyAmmo.className = 'btn-green';
  btnBuyAmmo.disabled = diamonds < nextAmmoCost;
  btnBuyAmmo.textContent = diamonds >= nextAmmoCost
    ? `🛒 ${curAmmo === 0 ? 'Odblokuj tor' : 'Kup wzmocnienie'}: +1 nab./5s (${nextAmmoCost} 💎)`
    : `🔒 Brak 💎 (${diamonds}/${nextAmmoCost})`;
  btnBuyAmmo.onclick = () => {
    if (diamonds < nextAmmoCost) return;
    diamonds -= nextAmmoCost;
    ammoRegenLevel = nextAmmoLvl;
    saveProgress();
    updateHud();
    renderShopWeapons();
  };
  ammoNextNode.querySelector('.custom-card-btns').appendChild(btnBuyAmmo);

  shopWeaponsGrid.appendChild(
    renderHorizontalTrack(
      '🎨 Tor Uzupełniania Nabojów (bez limitu)',
      curAmmo > 0
        ? `<span style="font-size:12px;color:#4ade80;">🎨 +${curAmmo} nab./5s (Poziom ${curAmmo})</span>`
        : `<span style="font-size:12px;color:#94a3b8;">🔒 Tor zablokowany</span>`,
      ammoCurrentNode,
      ammoNextNode
    )
  );
}

function openCustomMapsScreen(editIdx = null) {
  if (menuCountdownInterval) {
    clearInterval(menuCountdownInterval);
    menuCountdownInterval = null;
  }
  if (placedMines.length > 0) {
    minesCount += placedMines.length;
    placedMines = [];
    saveProgress();
    updateHud();
  }
  mouse.down = false;
  gameState = 'custom_maps';
  menuOverlay.classList.add('hidden');
  if (shopOverlay) shopOverlay.classList.add('hidden');
  if (settingsOverlay) settingsOverlay.classList.add('hidden');
  if (enemiesOverlay) enemiesOverlay.classList.add('hidden');
  if (resultPopupOverlay) resultPopupOverlay.classList.add('hidden');
  customOverlay.classList.remove('hidden');
  resizeGameLayout();

  if (editIdx !== null) {
    renderCustomMapEditor(editIdx);
  } else {
    customListView.style.display = 'flex';
    customEditorView.style.display = 'none';
    customOverlayTitle.textContent = '🛠️ ZESTAW WŁASNYCH MAP (ZAWSZE ODBLOKOWANE)';
    customOverlaySub.textContent = 'Każda własna mapa jest od razu odblokowana! Kliknij ▶️ Graj, aby wejść na arenę, albo ✏️ Edytuj, aby zmienić liczby przeciwników.';
    renderCustomMapsList();
  }
}

function renderCustomMapsList() {
  customMapsGrid.innerHTML = '';
  customMaps.forEach((cm, idx) => {
    const arenaObj = arenaLayouts[cm.arenaIndex % arenaLayouts.length];
    const cloudsCnt = typeof cm.clouds === 'number' ? cm.clouds : 1;
    const civsCnt = typeof cm.civilians === 'number' ? cm.civilians : 1;
    const lockedKinds = getLockedKindsInCustomMap(cm);
    const card = document.createElement('div');
    card.className = 'custom-map-card' + (activeCustomMapIndex === idx ? ' current' : '');
    card.style.cursor = 'default';
    card.innerHTML = `
      <div>
        <div class="lvl-title">
          <span>🛠️ ${cm.name}</span>
          <span class="lvl-status" style="color:${lockedKinds.length ? '#ef4444' : '#4ade80'};">${lockedKinds.length ? `🔒 Zablokowani wrogowie` : '🔓 Odblokowana'}</span>
        </div>
        <div class="lvl-enemies" style="margin-top:3px;">🎯 ${formatCustomMapSummary(cm)}</div>
        <div class="lvl-meta" style="margin-top:4px;">
          <span>🗺️ ${arenaObj.name}</span>
          <span>☁️ ${cloudsCnt}</span>
          <span>🏥 Cywile: ${civsCnt}</span>
        </div>
        ${lockedKinds.length ? `<div style="color:#ef4444;font-size:11px;font-weight:700;margin-top:2px;">Wymaga odblokowania: ${lockedKinds.join(', ')}</div>` : ''}
      </div>
      <div class="custom-card-btns">
        <button class="btn-green" id="playCustom_${idx}" ${lockedKinds.length ? 'disabled' : ''}>${lockedKinds.length ? '🔒 Zablokowana' : '▶️ Graj'}</button>
        <button class="btn-purple" id="editCustom_${idx}">✏️ Edytuj</button>
      </div>
    `;
    customMapsGrid.appendChild(card);
    card.querySelector(`#playCustom_${idx}`).onclick = () => startCustomMap(idx);
    card.querySelector(`#editCustom_${idx}`).onclick = () => openCustomMapsScreen(idx);
  });
}

function renderCustomMapEditor(idx) {
  customListView.style.display = 'none';
  customEditorView.style.display = 'flex';
  const draft = { clouds: 1, civilians: 1, ...customMaps[idx] };
  for (const k of ENEMY_KIND_KEYS) {
    if (typeof draft[k] !== 'number') draft[k] = 0;
  }
  customOverlayTitle.textContent = `✏️ EDYTOR WŁASNEJ MAPY: ${draft.name}`;
  customOverlaySub.textContent = 'Ustaw układ przeszkód oraz dokładną liczbę przeciwników każdego rodzaju:';

  function refreshEditorDOM() {
    const arenaObj = arenaLayouts[draft.arenaIndex % arenaLayouts.length];
    let total = 0;
    for (const k of ENEMY_KIND_KEYS) {
      total += (draft[k] || 0);
    }
    const unlockedKinds = getUnlockedEnemyKinds();
    const isLocked = kind => !unlockedKinds.has(kind);
    const lockedUsed = getLockedKindsInCustomMap(draft);
    const cannotSave = total === 0 || lockedUsed.length > 0;

    const enemyRowsHtml = ENEMY_KIND_KEYS.map(k => {
      const info = ENEMY_KIND_INFO[k] || { icon: '🎯', shortName: k, badge: '' };
      const val = draft[k] || 0;
      const locked = isLocked(k);
      return `
        <div class="editor-row">
          <span>${info.icon} ${info.shortName} <span style="font-size:11px;color:#94a3b8;">(${info.badge})</span>:</span>
          <div class="editor-stepper">
            <button data-dec-kind="${k}">➖</button>
            <span>${val}</span>
            <button data-inc-kind="${k}" ${locked ? 'disabled title="Przeciwnik zablokowany"' : ''}>${locked ? '🔒' : '➕'}</button>
          </div>
        </div>
      `;
    }).join('');

    customEditorView.innerHTML = `
      <div class="editor-row">
        <span>📝 Nazwa własnej mapy:</span>
        <input id="edMapName" class="editor-input" type="text" maxlength="26" value="${draft.name.replace(/"/g, '&quot;')}" />
      </div>
      <div class="editor-row">
        <span>🗺️ Układ przeszkód na arenie:</span>
        <div class="editor-stepper">
          <button id="edPrevArena">⬅️</button>
          <span style="min-width:170px;font-size:14px;color:#38bdf8;">${arenaObj.name}</span>
          <button id="edNextArena">➡️</button>
        </div>
      </div>
      <div class="editor-row">
        <span>☁️ Liczba chmur zasłaniających mapę (0–3):</span>
        <div class="editor-stepper">
          <button id="edCloudsDec">➖</button>
          <span>${draft.clouds}</span>
          <button id="edCloudsInc">➕</button>
        </div>
      </div>
      ${enemyRowsHtml}
      <div class="editor-row">
        <span>🏥 Cywil — Lekarz (2 HP, kara -50 HP za zabicie):</span>
        <div class="editor-stepper">
          <button id="edCivDec">➖</button>
          <span>${draft.civilians}</span>
          <button id="edCivInc">➕</button>
        </div>
      </div>
      <div style="text-align:center;font-size:13px;color:${!cannotSave ? '#4ade80' : '#ef4444'};font-weight:800;">
        Łącznie przeciwników na mapie: ${total} ${total === 0 ? '(ustaw przynajmniej 1 przeciwnika!)' : ''}
        ${lockedUsed.length > 0 ? `<br>🔒 Zablokowani przeciwnicy w mapie: ${lockedUsed.join(', ')} — zmniejsz ich liczbę do 0, aby zapisać.` : ''}
      </div>
      <div class="action-row" style="margin-top:4px;">
        <button id="edSaveAndPlay" class="btn-big btn-green" ${cannotSave ? 'disabled' : ''}>💾 Zapisz i ▶️ Zagraj teraz!</button>
        <button id="edSaveOnly" class="btn-big btn-purple" ${cannotSave ? 'disabled' : ''}>💾 Zapisz i wróć do listy</button>
        <button id="edCancel" class="btn-big btn-blue">↩️ Anuluj</button>
      </div>
    `;

    const nameInput = customEditorView.querySelector('#edMapName');
    nameInput.oninput = () => { draft.name = nameInput.value.trim() || `Mapa ${idx + 1}`; };

    customEditorView.querySelector('#edPrevArena').onclick = () => {
      draft.arenaIndex = (draft.arenaIndex + arenaLayouts.length - 1) % arenaLayouts.length;
      refreshEditorDOM();
    };
    customEditorView.querySelector('#edNextArena').onclick = () => {
      draft.arenaIndex = (draft.arenaIndex + 1) % arenaLayouts.length;
      refreshEditorDOM();
    };

    customEditorView.querySelector('#edCloudsDec').onclick = () => {
      draft.clouds = Math.max(0, (draft.clouds || 0) - 1);
      refreshEditorDOM();
    };
    customEditorView.querySelector('#edCloudsInc').onclick = () => {
      draft.clouds = Math.min(3, (draft.clouds || 0) + 1);
      refreshEditorDOM();
    };

    customEditorView.querySelectorAll('[data-dec-kind]').forEach(btn => {
      btn.onclick = () => {
        const k = btn.getAttribute('data-dec-kind');
        draft[k] = Math.max(0, (draft[k] || 0) - 1);
        refreshEditorDOM();
      };
    });
    customEditorView.querySelectorAll('[data-inc-kind]').forEach(btn => {
      btn.onclick = () => {
        const k = btn.getAttribute('data-inc-kind');
        if (isLocked(k)) return;
        draft[k] = Math.min(15, (draft[k] || 0) + 1);
        refreshEditorDOM();
      };
    });

    customEditorView.querySelector('#edCivDec').onclick = () => { draft.civilians = Math.max(0, (draft.civilians || 0) - 1); refreshEditorDOM(); };
    customEditorView.querySelector('#edCivInc').onclick = () => { draft.civilians = Math.min(8, (draft.civilians || 0) + 1); refreshEditorDOM(); };

    customEditorView.querySelector('#edSaveAndPlay').onclick = () => {
      if (cannotSave) return;
      customMaps[idx] = { ...draft };
      saveProgress();
      startCustomMap(idx);
    };
    customEditorView.querySelector('#edSaveOnly').onclick = () => {
      if (cannotSave) return;
      customMaps[idx] = { ...draft };
      saveProgress();
      openCustomMapsScreen(null);
    };
    customEditorView.querySelector('#edCancel').onclick = () => {
      openCustomMapsScreen(null);
    };
  }

  refreshEditorDOM();
}

function openResultPopup(mode) {
  if (menuCountdownInterval) {
    clearInterval(menuCountdownInterval);
    menuCountdownInterval = null;
  }
  // Blokada zapobiegająca przypadkowemu kliknięciu (1.6s opóźnienia + wymóg puszczenia przycisku myszy)
  pointerReleasedAfterMenuOpen = !mouse.down;
  mouse.down = false;
  if (touchJoystick) {
    touchJoystick.active = false;
    touchJoystick.identifier = null;
    touchJoystick.dx = 0;
    touchJoystick.dy = 0;
  }
  if (joystickBase) joystickBase.style.display = 'none';
  touchAimId = null;
  menuPointerArmed = false;
  menuReadyAt = performance.now() + 1600;

  if (placedMines.length > 0) {
    minesCount += placedMines.length;
    placedMines = [];
    saveProgress();
    updateHud();
  }

  gameState = mode; // 'level_clear' | 'dead'
  menuOverlay.classList.add('hidden');
  customOverlay.classList.add('hidden');
  if (shopOverlay) shopOverlay.classList.add('hidden');
  if (settingsOverlay) settingsOverlay.classList.add('hidden');
  if (enemiesOverlay) enemiesOverlay.classList.add('hidden');
  resultPopupOverlay.classList.remove('hidden');
  resizeGameLayout();

  const isWin = mode === 'level_clear';
  const stageName = activeCustomMapIndex !== null
    ? `Własna Mapa "${customMaps[activeCustomMapIndex].name}"`
    : `Poziom ${level}`;

  resultPopupCard.style.borderColor = isWin ? '#4ade80' : '#ef4444';
  resultPopupTitle.style.color = isWin ? '#4ade80' : '#ef4444';

  if (isWin) {
    resultPopupTitle.textContent = `🏆 ${stageName.toUpperCase()} UKOŃCZONY!`;
    resultPopupSub.textContent = `Świetna robota! Czas ukończenia: ${survivalSeconds.toFixed(1)}s`;
    const diamondPart = lastDiamondsEarned > 0 ? ` | +${lastDiamondsEarned} 💎 Diament!` : '';
    resultPopupRewards.textContent = `Nagroda: +1 💣 Mina${diamondPart} (Masz: ${minesCount} 💣 | ${diamonds} 💎)`;
  } else {
    resultPopupTitle.textContent = `💀 PRZEGRANA — ${stageName.toUpperCase()}`;
    resultPopupSub.textContent = `Straciłeś całe zdrowie (0 HP) po ${survivalSeconds.toFixed(1)}s walki.`;
    resultPopupRewards.textContent = `Twoje zapasy: ${minesCount} 💣 min | ${diamonds} 💎 diamentów`;
  }

  resultPopupActions.innerHTML = '';
  const popupButtons = [];

  // 1. Guzik "Następny" (dla kampanii, gdy kolejny poziom jest odblokowany — po wygranej zawsze odblokowany)
  if (activeCustomMapIndex === null && level < unlockedLevel) {
    const nextCfg = getLevelConfig(level + 1);
    const btnNext = document.createElement('button');
    btnNext.className = 'btn-green';
    btnNext.dataset.label = `▶️ Następny (Poziom ${level + 1} — ${nextCfg.label})`;
    btnNext.onclick = () => {
      if (!canActivateMenuAction()) return;
      resultPopupOverlay.classList.add('hidden');
      startLevel(level + 1);
    };
    resultPopupActions.appendChild(btnNext);
    popupButtons.push(btnNext);
  }

  // 2. Guzik "Zagraj jeszcze raz"
  const btnReplay = document.createElement('button');
  btnReplay.className = isWin && activeCustomMapIndex === null ? 'btn-blue' : 'btn-green';
  btnReplay.dataset.label = `🔄 Zagraj jeszcze raz (${stageName})`;
  btnReplay.onclick = () => {
    if (!canActivateMenuAction()) return;
    resultPopupOverlay.classList.add('hidden');
    if (activeCustomMapIndex !== null) startCustomMap(activeCustomMapIndex);
    else startLevel(level);
  };
  resultPopupActions.appendChild(btnReplay);
  popupButtons.push(btnReplay);

  // 3. Guzik "Wróć do głównego ekranu"
  const btnMainScreen = document.createElement('button');
  btnMainScreen.className = 'btn-purple';
  btnMainScreen.dataset.label = '🏠 Wróć do głównego ekranu';
  btnMainScreen.onclick = () => {
    if (!canActivateMenuAction()) return;
    resultPopupOverlay.classList.add('hidden');
    openMenu('select');
  };
  resultPopupActions.appendChild(btnMainScreen);
  popupButtons.push(btnMainScreen);

  function syncPopupGuardUI() {
    const now = performance.now();
    const remMs = menuReadyAt - now;
    const locked = remMs > 0 || !pointerReleasedAfterMenuOpen;
    popupButtons.forEach(b => {
      b.disabled = locked;
      if (remMs > 0) {
        b.textContent = `${b.dataset.label} (⏳ ${(remMs / 1000).toFixed(1)}s)`;
      } else if (!pointerReleasedAfterMenuOpen) {
        b.textContent = `🖱️ Puść przycisk myszy...`;
      } else {
        b.textContent = b.dataset.label;
      }
    });
    if (!locked && menuCountdownInterval) {
      clearInterval(menuCountdownInterval);
      menuCountdownInterval = null;
    }
  }

  syncPopupGuardUI();
  menuCountdownInterval = setInterval(syncPopupGuardUI, 80);
}

function openMenu(mode = 'select') {
  if (mode === 'level_clear' || mode === 'dead') {
    openResultPopup(mode);
    return;
  }
  if (menuCountdownInterval) {
    clearInterval(menuCountdownInterval);
    menuCountdownInterval = null;
  }
  pointerReleasedAfterMenuOpen = true;
  mouse.down = false;
  if (touchJoystick) {
    touchJoystick.active = false;
    touchJoystick.identifier = null;
    touchJoystick.dx = 0;
    touchJoystick.dy = 0;
  }
  if (joystickBase) joystickBase.style.display = 'none';
  touchAimId = null;
  menuPointerArmed = false;
  menuReadyAt = 0;

  if (placedMines.length > 0) {
    minesCount += placedMines.length;
    placedMines = [];
    saveProgress();
    updateHud();
  }

  gameState = 'menu';
  customOverlay.classList.add('hidden');
  if (shopOverlay) shopOverlay.classList.add('hidden');
  if (settingsOverlay) settingsOverlay.classList.add('hidden');
  if (enemiesOverlay) enemiesOverlay.classList.add('hidden');
  if (resultPopupOverlay) resultPopupOverlay.classList.add('hidden');
  menuOverlay.classList.remove('hidden');
  resizeGameLayout();

  const defObj = weaponsCatalog.find(w => w.id === defaultWeapon) || weaponsCatalog[0];
  menuTitle.textContent = '📋 MENU WYBORU POZIOMÓW';
  menuTitle.style.color = '#38bdf8';
  menuSubtitle.textContent = `Miny: ${minesCount} 💣 | Diamenty: ${diamonds} 💎 | Domyślna broń na start: ${defObj.shortName}`;

  levelsGrid.innerHTML = '';
  levelsGrid.style.display = 'grid';

  const totalCards = Math.max(12, Math.ceil((unlockedLevel + 4) / 4) * 4);
  for (let i = 1; i <= totalCards; i++) {
    const isUnlocked = i <= unlockedLevel;
    const isCompleted = Boolean(bestTimes[i]);
    const card = document.createElement('div');
    card.className = 'level-card'
      + (!isUnlocked ? ' locked' : '')
      + (isCompleted ? ' completed' : '')
      + (activeCustomMapIndex === null && i === level ? ' current' : '');

    const cfg = getLevelConfig(i);
    const enemyLabel = cfg.label;
    const cloudsInfo = cfg.clouds > 0 ? ` | ☁️ ${cfg.clouds}` : '';
    const civInfo = cfg.civilians > 0 ? ` | 🏥 ${cfg.civilians}` : '';
    const mapLabel = `🗺️ ${cfg.arena.name}${cloudsInfo}${civInfo}`;
    let statusLabel = '🔒 Zablokowany';
    if (isCompleted) {
      statusLabel = `⭐ Ukończono (${bestTimes[i]}s)`;
    } else if (isUnlocked) {
      statusLabel = '🔓 Dostępny — Zagraj!';
    }

    card.innerHTML = `
      <div class="lvl-title">Poziom ${i}</div>
      <div class="lvl-enemies">🎯 ${enemyLabel}</div>
      <div class="lvl-enemies" style="color:#93c5fd;font-size:11px;">${mapLabel}</div>
      <div class="lvl-status">${statusLabel}</div>
    `;

    if (isUnlocked) {
      card.addEventListener('click', () => {
        if (!canActivateMenuAction()) return;
        startLevel(i);
      });
    }
    levelsGrid.appendChild(card);
  }

  const currentCardEl = levelsGrid.querySelector('.level-card.current');
  if (currentCardEl) {
    setTimeout(() => currentCardEl.scrollIntoView({ block: 'nearest' }), 0);
  }

  menuActions.innerHTML = '';

  const btnCont = document.createElement('button');
  btnCont.className = 'btn-big btn-green';
  btnCont.textContent = hasStartedAnyGame ? `▶️ Wróć do gry` : `▶️ Zagraj (Poziom ${level})`;
  btnCont.onclick = () => {
    if (!canActivateMenuAction()) return;
    if (!hasStartedAnyGame) {
      startLevel(level);
    } else {
      menuOverlay.classList.add('hidden');
      resizeGameLayout();
      startTime = performance.now() - survivalSeconds * 1000;
      gameState = 'playing';
      updatePauseButtonUI();
      canvas.focus();
    }
  };
  menuActions.appendChild(btnCont);

  const btnGoCustom = document.createElement('button');
  btnGoCustom.className = 'btn-big btn-purple';
  btnGoCustom.textContent = '🛠️ Własne Mapy i Edytor';
  btnGoCustom.onclick = () => {
    if (!canActivateMenuAction()) return;
    openCustomMapsScreen(null);
  };
  menuActions.appendChild(btnGoCustom);

  const btnGoShop = document.createElement('button');
  btnGoShop.className = 'btn-big btn-blue';
  const curDef = weaponsCatalog.find(w => w.id === defaultWeapon) || weaponsCatalog[0];
  btnGoShop.textContent = `🛒 Sklep i Domyślna Broń (${curDef.shortName} | 💎 ${diamonds})`;
  btnGoShop.onclick = () => {
    if (!canActivateMenuAction()) return;
    openShopScreen();
  };
  menuActions.appendChild(btnGoShop);

  const btnGoEnemies = document.createElement('button');
  btnGoEnemies.className = 'btn-big btn-purple';
  btnGoEnemies.textContent = '📖 Przegląd Wrogów i Postaci';
  btnGoEnemies.onclick = () => {
    if (!canActivateMenuAction()) return;
    openEnemiesScreen();
  };
  menuActions.appendChild(btnGoEnemies);

  const btnGoSettings = document.createElement('button');
  btnGoSettings.className = 'btn-big';
  btnGoSettings.textContent = '⚙️ Ustawienia / Reset';
  btnGoSettings.onclick = () => {
    if (!canActivateMenuAction()) return;
    openSettingsScreen();
  };
  menuActions.appendChild(btnGoSettings);
}
