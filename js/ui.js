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

function updateFollowButtonUI() {
  btnFollowMouse.classList.toggle('active', followMouse);
  btnFollowMouse.textContent = followMouse
    ? '🏃 Ruch za myszką: WŁ [Klawisz F]'
    : '🏃 Ruch za myszką: WYŁ [Klawisz F]';
}
updateFollowButtonUI();

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

  const aspect = canvas.width / canvas.height; // 940 / 560
  const padX = 24;
  const padY = 20;
  const availW = Math.max(420, window.innerWidth - padX);

  // Pierwszy przebieg: ustaw wstępną szerokość paska topbar, aby zmierzyć jego dokładną wysokość po zawinięciu wierszy
  if (topbarEl) {
    topbarEl.style.width = `${availW}px`;
  }
  const topbarH = topbarEl ? topbarEl.offsetHeight : 80;
  const hintH = hintEl ? hintEl.offsetHeight + 8 : 26;
  const availH = Math.max(260, window.innerHeight - topbarH - hintH - padY);

  let targetW = availW;
  let targetH = targetW / aspect;
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

  wrapper.style.width = `${Math.floor(targetW)}px`;
  wrapper.style.height = `${Math.floor(targetH)}px`;
}

window.addEventListener('resize', resizeGameLayout);
setTimeout(resizeGameLayout, 0);

function toggleFollowMouse() {
  followMouse = !followMouse;
  updateFollowButtonUI();
  saveProgress();
  canvas.focus();
}

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
  if (resultPopupOverlay) resultPopupOverlay.classList.add('hidden');
  if (shopOverlay) shopOverlay.classList.remove('hidden');
  renderShopWeapons();
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
  if (resultPopupOverlay) resultPopupOverlay.classList.add('hidden');
  if (settingsOverlay) settingsOverlay.classList.remove('hidden');
  renderSettingsScreen();
}

function renderSettingsScreen() {
  if (!settingsBox) return;
  const theme = graphicThemes[currentThemeIndex % graphicThemes.length] || graphicThemes[0];
  settingsBox.innerHTML = `
    <div class="editor-row">
      <span>🏃 Podążanie postaci za kursorem myszy [F]:</span>
      <button id="setToggleFollow" class="${followMouse ? 'btn-green' : 'btn-blue'}">${followMouse ? '✅ WŁĄCZONE' : '❌ WYŁĄCZONE'}</button>
    </div>
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

  settingsBox.querySelector('#setToggleFollow').onclick = () => {
    toggleFollowMouse();
    renderSettingsScreen();
  };
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

function renderHorizontalTrack(trackTitle, headerRightHtml, steps) {
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

  // Znajdź indeks ostatniego kupionego elementu na tym torze
  let lastOwnedIdx = -1;
  for (let i = 0; i < steps.length; i++) {
    if (steps[i].isOwned) lastOwnedIdx = i;
  }
  const nextUnlockIdx = lastOwnedIdx + 1;

  // Jeśli są wcześniejsze kupione elementy (przed ostatnim kupionym), zwiń je i rozwijaj po najechaniu
  if (lastOwnedIdx > 0) {
    const prevGroup = document.createElement('div');
    prevGroup.className = 'tree-prev-group';

    const pill = document.createElement('div');
    pill.className = 'tree-prev-pill';
    pill.innerHTML = `<div>📜 Kupione wcześniej (${lastOwnedIdx})</div><div style="font-size:10px;color:#94a3b8;margin-top:3px;">Najedź myszką, aby rozwinąć ▸</div>`;
    prevGroup.appendChild(pill);

    const prevItems = document.createElement('div');
    prevItems.className = 'tree-prev-items';
    for (let i = 0; i < lastOwnedIdx; i++) {
      prevItems.appendChild(steps[i].createNodeEl('prev-owned'));
      const conn = document.createElement('div');
      conn.className = 'tree-connector active';
      conn.textContent = '──►';
      prevItems.appendChild(conn);
    }
    prevGroup.appendChild(prevItems);
    rowEl.appendChild(prevGroup);
  }

  // Widoczny OSTATNI KUPIONY
  if (lastOwnedIdx >= 0) {
    rowEl.appendChild(steps[lastOwnedIdx].createNodeEl('last-owned'));
  }

  // Widoczny NASTĘPNY DO ODBLOKOWANIA
  if (nextUnlockIdx < steps.length) {
    if (lastOwnedIdx >= 0) {
      const conn = document.createElement('div');
      conn.className = 'tree-connector active';
      conn.textContent = '──►';
      rowEl.appendChild(conn);
    }
    rowEl.appendChild(steps[nextUnlockIdx].createNodeEl('next-unlock'));

    // Jeśli jeszcze nic na tym torze nie kupiono (lastOwnedIdx === -1), pokaż też pierwszy zablokowany szczebel za bronią bazową
    if (lastOwnedIdx === -1 && nextUnlockIdx + 1 < steps.length) {
      const conn2 = document.createElement('div');
      conn2.className = 'tree-connector';
      conn2.textContent = '──►';
      rowEl.appendChild(conn2);
      rowEl.appendChild(steps[nextUnlockIdx + 1].createNodeEl('locked'));
    }
  }

  return trackEl;
}

function renderShopWeapons() {
  if (!shopWeaponsGrid) return;
  const defObj = weaponsCatalog.find(w => w.id === defaultWeapon) || weaponsCatalog[0];
  if (shopSubtitle) {
    shopSubtitle.innerHTML = `Masz <b style="color:#38bdf8;">💎 ${diamonds} diamentów</b> | Domyślna broń: <b style="color:#fde047;">${defObj.name}</b> | Startowe HP: <b style="color:#4ade80;">${getStartingMaxHp()} ❤️</b><br><span style="font-size:12px;color:#94a3b8;">Każdy poziomy tor pokazuje <b>ostatni kupiony</b> poziom oraz <b>następny do odblokowania</b> (wcześniej kupione rozwijają się po najechaniu).</span>`;
  }
  shopWeaponsGrid.innerHTML = '';

  // Tory broni
  weaponsCatalog.forEach(w => {
    const isWeaponOwned = ownedWeapons.includes(w.id);
    const isDefault = defaultWeapon === w.id;
    const steps = [];

    // Krok 0: Broń bazowa
    steps.push({
      isOwned: isWeaponOwned,
      createNodeEl: (roleClass) => {
        const node = document.createElement('div');
        node.className = `tree-node ${isWeaponOwned ? 'owned' : ''} ${roleClass} ${isDefault ? 'default-weapon' : ''}`;
        const badge = isWeaponOwned ? '✅ OSTATNI KUPIONY (BROŃ)' : '🔓 NASTĘPNY DO ODBLOKOWANIA';
        node.innerHTML = `
          <div>
            <div style="font-size:10px;font-weight:900;color:${isWeaponOwned ? '#4ade80' : '#facc15'};">${badge}</div>
            <div class="lvl-title" style="font-size:15px;">${w.name}</div>
            <div class="lvl-enemies" style="font-size:11px;margin:3px 0;">${w.desc}</div>
            <div class="lvl-enemies" style="color:#93c5fd;font-size:11px;">${w.ammoLabel}</div>
          </div>
          <div class="custom-card-btns" style="margin-top:6px;justify-content:flex-start;"></div>
        `;
        const btnWrap = node.querySelector('.custom-card-btns');
        if (!isWeaponOwned) {
          const btnBuy = document.createElement('button');
          btnBuy.className = 'btn-green';
          btnBuy.disabled = diamonds < w.cost;
          btnBuy.textContent = diamonds >= w.cost ? `🛒 Kup broń (${w.cost} 💎)` : `🔒 Brak 💎 (${diamonds}/${w.cost})`;
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
        } else {
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
        return node;
      }
    });

    // Kolejne kroki: Wzmocnienia tej broni
    (w.upgrades || []).forEach(upg => {
      const isUpgOwned = ownedUpgrades.includes(upg.id);
      const canUnlock = isWeaponOwned && (!upg.requiresUpgrade || ownedUpgrades.includes(upg.requiresUpgrade));
      steps.push({
        isOwned: isUpgOwned,
        createNodeEl: (roleClass) => {
          const node = document.createElement('div');
          node.className = `tree-node ${isUpgOwned ? 'owned' : (!canUnlock ? 'locked' : '')} ${roleClass}`;
          const badge = isUpgOwned
            ? '✅ OSTATNI KUPIONY'
            : (canUnlock ? '🔓 NASTĘPNY DO ODBLOKOWANIA' : `🔒 WYMAGA: ${w.shortName}`);
          node.innerHTML = `
            <div>
              <div style="font-size:10px;font-weight:900;color:${isUpgOwned ? '#4ade80' : (canUnlock ? '#facc15' : '#94a3b8')};">${badge}</div>
              <div class="lvl-title" style="font-size:15px;">${upg.name}</div>
              <div class="lvl-enemies" style="font-size:11px;margin:3px 0;">${upg.desc}</div>
              <div class="lvl-enemies" style="color:#93c5fd;font-size:11px;">${upg.effectLabel}</div>
            </div>
            <div class="custom-card-btns" style="margin-top:6px;justify-content:flex-start;"></div>
          `;
          if (!isUpgOwned) {
            const btnWrap = node.querySelector('.custom-card-btns');
            const btnBuyUpg = document.createElement('button');
            btnBuyUpg.className = 'btn-green';
            btnBuyUpg.disabled = !canUnlock || diamonds < upg.cost;
            btnBuyUpg.textContent = !canUnlock
              ? `🔒 Kup najpierw ${w.shortName}`
              : (diamonds >= upg.cost ? `🛒 Kup wzmocnienie (${upg.cost} 💎)` : `🔒 Brak 💎 (${diamonds}/${upg.cost})`);
            btnBuyUpg.onclick = () => {
              if (!canUnlock || diamonds < upg.cost) return;
              diamonds -= upg.cost;
              if (!ownedUpgrades.includes(upg.id)) ownedUpgrades.push(upg.id);
              if (upg.id === 'bazooka_rockets_5' || upg.id === 'bazooka_rockets_7') {
                bazookaUpgraded = true;
                player.rockets = Math.max(player.rockets, getStartingRockets());
              }
              if (upg.id === 'pistol_ammo_1' || upg.id === 'pistol_ammo_2') {
                player.ammo = Math.max(player.ammo, getStartingAmmo());
              }
              saveProgress();
              updateHud();
              renderShopWeapons();
            };
            btnWrap.appendChild(btnBuyUpg);
          }
          return node;
        }
      });
    });

    const trackEl = renderHorizontalTrack(
      `🌳 Tor Broni: ${w.name}`,
      isWeaponOwned
        ? `<button class="btn-def-track ${isDefault ? 'btn-blue' : 'btn-purple'}" style="padding:3px 10px;font-size:11px;">${isDefault ? '⭐ Domyślna broń na start' : '⭐ Ustaw jako domyślną'}</button>`
        : `<span style="font-size:12px;color:#94a3b8;">🔒 Broń niekupiona</span>`,
      steps
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

  // Tor Wzmocnienia Życia (HP)
  const hpSteps = [];
  hpSteps.push({
    isOwned: true,
    createNodeEl: (roleClass) => {
      const node = document.createElement('div');
      node.className = `tree-node owned ${roleClass}`;
      node.innerHTML = `
        <div>
          <div style="font-size:10px;font-weight:900;color:#4ade80;">✅ BAZA TORU</div>
          <div class="lvl-title" style="font-size:15px;">${hpTrackConfig.baseName}</div>
          <div class="lvl-enemies" style="font-size:11px;margin:3px 0;">${hpTrackConfig.baseDesc}</div>
          <div class="lvl-enemies" style="color:#93c5fd;font-size:11px;">❤️ Aktualny start: ${getStartingMaxHp()} HP</div>
        </div>
      `;
      return node;
    }
  });

  hpTrackConfig.upgrades.forEach(upg => {
    const isUpgOwned = ownedUpgrades.includes(upg.id);
    const canUnlock = !upg.requiresUpgrade || ownedUpgrades.includes(upg.requiresUpgrade);
    hpSteps.push({
      isOwned: isUpgOwned,
      createNodeEl: (roleClass) => {
        const node = document.createElement('div');
        node.className = `tree-node ${isUpgOwned ? 'owned' : (!canUnlock ? 'locked' : '')} ${roleClass}`;
        const badge = isUpgOwned ? '✅ OSTATNI KUPIONY' : '🔓 NASTĘPNY DO ODBLOKOWANIA';
        node.innerHTML = `
          <div>
            <div style="font-size:10px;font-weight:900;color:${isUpgOwned ? '#4ade80' : '#facc15'};">${badge}</div>
            <div class="lvl-title" style="font-size:15px;">${upg.name}</div>
            <div class="lvl-enemies" style="font-size:11px;margin:3px 0;">${upg.desc}</div>
            <div class="lvl-enemies" style="color:#93c5fd;font-size:11px;">${upg.effectLabel}</div>
          </div>
          <div class="custom-card-btns" style="margin-top:6px;justify-content:flex-start;"></div>
        `;
        if (!isUpgOwned) {
          const btnWrap = node.querySelector('.custom-card-btns');
          const btnBuyHp = document.createElement('button');
          btnBuyHp.className = 'btn-green';
          btnBuyHp.disabled = !canUnlock || diamonds < upg.cost;
          btnBuyHp.textContent = diamonds >= upg.cost ? `🛒 Kup wzmocnienie (${upg.cost} 💎)` : `🔒 Brak 💎 (${diamonds}/${upg.cost})`;
          btnBuyHp.onclick = () => {
            if (!canUnlock || diamonds < upg.cost) return;
            diamonds -= upg.cost;
            if (!ownedUpgrades.includes(upg.id)) ownedUpgrades.push(upg.id);
            player.maxHp = getStartingMaxHp();
            player.hp = Math.min(player.maxHp, player.hp + (upg.bonusHp || 5));
            saveProgress();
            updateHud();
            renderShopWeapons();
          };
          btnWrap.appendChild(btnBuyHp);
        }
        return node;
      }
    });
  });

  shopWeaponsGrid.appendChild(
    renderHorizontalTrack(
      hpTrackConfig.title,
      `<span style="font-size:12px;color:#4ade80;">❤️ Aktualnie na start: ${getStartingMaxHp()} HP</span>`,
      hpSteps
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
  if (resultPopupOverlay) resultPopupOverlay.classList.add('hidden');
  customOverlay.classList.remove('hidden');

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
    const card = document.createElement('div');
    card.className = 'level-card completed' + (activeCustomMapIndex === idx ? ' current' : '');
    card.style.cursor = 'default';
    card.innerHTML = `
      <div class="lvl-title" style="color:#e9d5ff;">🛠️ ${cm.name}</div>
      <div class="lvl-enemies">🎯 ${formatCustomMapSummary(cm)}</div>
      <div class="lvl-enemies" style="color:#93c5fd;font-size:11px;">🗺️ ${arenaObj.name} | ☁️ ${cloudsCnt} | 🏥 Cywile: ${civsCnt}</div>
      <div class="lvl-status" style="color:#4ade80;">🔓 Zawsze odblokowana</div>
      <div class="custom-card-btns" style="margin-top:6px;">
        <button class="btn-green" id="playCustom_${idx}">▶️ Graj</button>
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
  customOverlayTitle.textContent = `✏️ EDYTOR WŁASNEJ MAPY: ${draft.name}`;
  customOverlaySub.textContent = 'Ustaw układ przeszkód oraz dokładną liczbę przeciwników każdego rodzaju:';

  function refreshEditorDOM() {
    const arenaObj = arenaLayouts[draft.arenaIndex % arenaLayouts.length];
    const total = draft.normal + draft.tough + draft.rapid + draft.boss;
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
      <div class="editor-row">
        <span>🎯 Zwykły przeciwnik (1 strzał):</span>
        <div class="editor-stepper">
          <button id="edNormDec">➖</button>
          <span>${draft.normal}</span>
          <button id="edNormInc">➕</button>
        </div>
      </div>
      <div class="editor-row">
        <span>🛡️ Pancerny przeciwnik (3 strzały):</span>
        <div class="editor-stepper">
          <button id="edToughDec">➖</button>
          <span>${draft.tough}</span>
          <button id="edToughInc">➕</button>
        </div>
      </div>
      <div class="editor-row">
        <span>⚡ Szybkostrzelny przeciwnik (seria strzałów):</span>
        <div class="editor-stepper">
          <button id="edRapidDec">➖</button>
          <span>${draft.rapid}</span>
          <button id="edRapidInc">➕</button>
        </div>
      </div>
      <div class="editor-row">
        <span>👑 Bardzo Mocny Boss (odporny na miny, 5 strzałów):</span>
        <div class="editor-stepper">
          <button id="edBossDec">➖</button>
          <span>${draft.boss}</span>
          <button id="edBossInc">➕</button>
        </div>
      </div>
      <div class="editor-row">
        <span>🏥 Cywil — Lekarz (2 HP, kara -50 HP za zabicie):</span>
        <div class="editor-stepper">
          <button id="edCivDec">➖</button>
          <span>${draft.civilians}</span>
          <button id="edCivInc">➕</button>
        </div>
      </div>
      <div style="text-align:center;font-size:13px;color:${total > 0 ? '#4ade80' : '#ef4444'};font-weight:800;">
        Łącznie przeciwników na mapie: ${total} ${total === 0 ? '(ustaw przynajmniej 1 przeciwnika!)' : ''}
      </div>
      <div class="action-row" style="margin-top:4px;">
        <button id="edSaveAndPlay" class="btn-big btn-green" ${total === 0 ? 'disabled' : ''}>💾 Zapisz i ▶️ Zagraj teraz!</button>
        <button id="edSaveOnly" class="btn-big btn-purple" ${total === 0 ? 'disabled' : ''}>💾 Zapisz i wróć do listy</button>
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

    customEditorView.querySelector('#edNormDec').onclick = () => { draft.normal = Math.max(0, draft.normal - 1); refreshEditorDOM(); };
    customEditorView.querySelector('#edNormInc').onclick = () => { draft.normal = Math.min(12, draft.normal + 1); refreshEditorDOM(); };

    customEditorView.querySelector('#edToughDec').onclick = () => { draft.tough = Math.max(0, draft.tough - 1); refreshEditorDOM(); };
    customEditorView.querySelector('#edToughInc').onclick = () => { draft.tough = Math.min(10, draft.tough + 1); refreshEditorDOM(); };

    customEditorView.querySelector('#edRapidDec').onclick = () => { draft.rapid = Math.max(0, draft.rapid - 1); refreshEditorDOM(); };
    customEditorView.querySelector('#edRapidInc').onclick = () => { draft.rapid = Math.min(10, draft.rapid + 1); refreshEditorDOM(); };

    customEditorView.querySelector('#edBossDec').onclick = () => { draft.boss = Math.max(0, draft.boss - 1); refreshEditorDOM(); };
    customEditorView.querySelector('#edBossInc').onclick = () => { draft.boss = Math.min(8, draft.boss + 1); refreshEditorDOM(); };

    customEditorView.querySelector('#edCivDec').onclick = () => { draft.civilians = Math.max(0, (draft.civilians || 0) - 1); refreshEditorDOM(); };
    customEditorView.querySelector('#edCivInc').onclick = () => { draft.civilians = Math.min(8, (draft.civilians || 0) + 1); refreshEditorDOM(); };

    customEditorView.querySelector('#edSaveAndPlay').onclick = () => {
      if (draft.normal + draft.tough + draft.rapid + draft.boss <= 0) return;
      customMaps[idx] = { ...draft };
      saveProgress();
      startCustomMap(idx);
    };
    customEditorView.querySelector('#edSaveOnly').onclick = () => {
      if (draft.normal + draft.tough + draft.rapid + draft.boss <= 0) return;
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
  resultPopupOverlay.classList.remove('hidden');

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
  if (resultPopupOverlay) resultPopupOverlay.classList.add('hidden');
  menuOverlay.classList.remove('hidden');

  const defObj = weaponsCatalog.find(w => w.id === defaultWeapon) || weaponsCatalog[0];
  menuTitle.textContent = '📋 MENU WYBORU POZIOMÓW';
  menuTitle.style.color = '#38bdf8';
  menuSubtitle.textContent = `Miny: ${minesCount} 💣 | Diamenty: ${diamonds} 💎 | Domyślna broń na start: ${defObj.shortName}`;

  levelsGrid.innerHTML = '';
  levelsGrid.style.display = 'grid';

  const totalCards = Math.max(8, Math.ceil((unlockedLevel + 2) / 4) * 4);
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

  const btnGoSettings = document.createElement('button');
  btnGoSettings.className = 'btn-big';
  btnGoSettings.textContent = '⚙️ Ustawienia / Reset';
  btnGoSettings.onclick = () => {
    if (!canActivateMenuAction()) return;
    openSettingsScreen();
  };
  menuActions.appendChild(btnGoSettings);
}
