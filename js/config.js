// Konfiguracja kolorów, układów aren oraz fal przeciwników na poziomach

const colors = ['#f43f5e', '#38bdf8', '#facc15', '#4ade80', '#a855f7', '#fb923c', '#ec4899'];

const weaponsCatalog = [
  {
    id: 'pistol',
    name: '🔫 Marker Paintballowy',
    shortName: '🔫 Marker',
    cost: 0,
    desc: 'Klasyczny szybkostrzelny marker paintballowy. Korzysta ze zwykłych nabojów farby.',
    ammoLabel: '🎨 Naboje (30 na start)',
    upgrades: [
      {
        id: 'pistol_ammo_1',
        name: '📦 Powiększony Magazynek I',
        cost: 1,
        desc: 'Zwiększa liczbę nabojów na starcie rundy z 30 do 40 sztuk!',
        effectLabel: '🎨 Startowe naboje: 30 ➡️ 40',
        requiresUpgrade: null
      },
      {
        id: 'pistol_ammo_2',
        name: '📦 Powiększony Magazynek II',
        cost: 2,
        desc: 'Zwiększa liczbę nabojów na starcie rundy z 40 do 55 sztuk!',
        effectLabel: '🎨 Startowe naboje: 40 ➡️ 55',
        requiresUpgrade: 'pistol_ammo_1'
      }
    ]
  },
  {
    id: 'bazooka',
    name: '🚀 Bazooka Samonaprowadzająca',
    shortName: '🚀 Bazooka',
    cost: 1,
    desc: 'Wystrzeliwuje rakietę, która namierza wroga najbliższego wskaźnikowi myszy i omija przeszkody! Start: 3 rakiety.',
    ammoLabel: '🚀 Rakiety (3 na start rundy)',
    upgrades: [
      {
        id: 'bazooka_rockets_5',
        name: '⚡ Wzmocnienie Bazooki I (5 rakiet)',
        cost: 1,
        desc: 'Zwiększa zapas startowy Bazooki z 3 do 5 rakiet na początku każdej rundy!',
        effectLabel: '🚀 Startowe rakiety: 3 ➡️ 5',
        requiresUpgrade: null
      },
      {
        id: 'bazooka_rockets_7',
        name: '⚡ Wzmocnienie Bazooki II (7 rakiet)',
        cost: 2,
        desc: 'Zwiększa zapas startowy Bazooki z 5 do 7 rakiet na początku każdej rundy!',
        effectLabel: '🚀 Startowe rakiety: 5 ➡️ 7',
        requiresUpgrade: 'bazooka_rockets_5'
      }
    ]
  }
];

const hpTrackConfig = {
  title: '❤️ Tor Wzmocnienia Życia',
  baseName: '❤️ Zdrowie Bazowe (200 HP)',
  baseDesc: 'Podstawowa wytrzymałość zawodnika: 200 HP na start każdej rundy.',
  upgrades: [
    {
      id: 'hp_boost_1',
      name: '🛡️ Wzmocnienie Życia I (+5 HP)',
      cost: 1,
      bonusHp: 5,
      desc: 'Pierwsze wzmocnienie pancerza: +5 HP na start każdej rundy (łącznie 205 HP)!',
      effectLabel: '❤️ Startowe HP: 200 ➡️ 205 HP',
      requiresUpgrade: null
    },
    {
      id: 'hp_boost_2',
      name: '🛡️ Wzmocnienie Życia II (+10 HP)',
      cost: 2,
      bonusHp: 10,
      desc: 'Drugie wzmocnienie pancerza: kolejne +10 HP na start (łącznie 215 HP)!',
      effectLabel: '❤️ Startowe HP: 205 ➡️ 215 HP',
      requiresUpgrade: 'hp_boost_1'
    },
    {
      id: 'hp_boost_3',
      name: '🛡️ Wzmocnienie Życia III (+15 HP)',
      cost: 3,
      bonusHp: 15,
      desc: 'Trzecie wzmocnienie pancerza: kolejne +15 HP na start (łącznie 230 HP)!',
      effectLabel: '❤️ Startowe HP: 215 ➡️ 230 HP',
      requiresUpgrade: 'hp_boost_2'
    }
  ]
};

const healingTrackConfig = {
  title: '💚 Tor Leczenia (Dyskretne Impulsy HP)',
  lockedName: '💚 Leczenie Wyłączone (0.00 HP/s)',
  lockedDesc: 'Brak automatycznej regeneracji zdrowia. Odblokuj tor po prawej stronie!'
};

// Dla poziomu k (1, 2, 3, 4...) okres impulsu wynosi (4 + k) sekund: 5s, 6s, 7s, 8s...
function getHealingIntervalSeconds(targetLevel) {
  return 4 + targetLevel;
}

// Uśredniona wartość leczenia w HP na sekundę dla odblokowanych poziomów 1..maxLevel
function getAverageHealingPerSecond(maxLevel) {
  let sum = 0;
  for (let k = 1; k <= maxLevel; k++) {
    sum += 1 / getHealingIntervalSeconds(k);
  }
  return sum;
}

// Ceny kolejnych poziomów w torach nieskończonych rosną ciągiem Fibonacciego: 1, 2, 3, 5, 8, 13, 21...
function getHealingUpgradeCost(targetLevel) {
  return getFibonacciCost(targetLevel);
}

function getFibonacciCost(targetLevel) {
  let a = 1;
  let b = 2;
  if (targetLevel <= 1) return a;
  if (targetLevel === 2) return b;
  for (let i = 3; i <= targetLevel; i++) {
    const next = a + b;
    a = b;
    b = next;
  }
  return b;
}

const graphicThemes = [
  {
    id: 'classic',
    name: '🌿 Klasyczny',
    bodyBg: '#0f172a',
    panelBg: '#1e293b',
    accentColor: '#38bdf8',
    arenaBgOverride: null,
    gridColor: null,
    crateFill: '#b45309',
    bunkerFill: '#334155',
    wallFill: '#475569',
    obstacleStroke: '#1e293b'
  },
  {
    id: 'neon',
    name: '⚡ Cyber-Neon',
    bodyBg: '#05050f',
    panelBg: '#11132b',
    accentColor: '#22d3ee',
    arenaBgOverride: '#090a1a',
    gridColor: 'rgba(34, 211, 238, 0.14)',
    crateFill: '#5b21b6',
    bunkerFill: '#1e1b4b',
    wallFill: '#3b0764',
    obstacleStroke: '#f43f5e'
  },
  {
    id: 'desert',
    name: '🏜️ Pustynia',
    bodyBg: '#1c1917',
    panelBg: '#292524',
    accentColor: '#f59e0b',
    arenaBgOverride: '#855a2c',
    gridColor: 'rgba(254, 243, 199, 0.09)',
    crateFill: '#b45309',
    bunkerFill: '#57534e',
    wallFill: '#a16207',
    obstacleStroke: '#451a03'
  },
  {
    id: 'ice',
    name: '❄️ Arktyka',
    bodyBg: '#082f49',
    panelBg: '#0c4a6e',
    accentColor: '#7dd3fc',
    arenaBgOverride: '#155e75',
    gridColor: 'rgba(186, 230, 253, 0.14)',
    crateFill: '#0284c7',
    bunkerFill: '#1e3a8a',
    wallFill: '#0369a1',
    obstacleStroke: '#bae6fd'
  },
  {
    id: 'lava',
    name: '🌋 Wulkan',
    bodyBg: '#180909',
    panelBg: '#2a1212',
    accentColor: '#f97316',
    arenaBgOverride: '#3b0d0d',
    gridColor: 'rgba(251, 146, 60, 0.13)',
    crateFill: '#9a3412',
    bunkerFill: '#27272a',
    wallFill: '#451a03',
    obstacleStroke: '#f97316'
  }
];

let obstacles = [];
let currentArena = { name: 'Klasyczna Arena', bgColor: '#15803d', gridColor: 'rgba(255,255,255,0.05)' };

const arenaLayouts = [
  {
    name: 'Klasyczna Arena',
    bgColor: '#15803d',
    gridColor: 'rgba(255,255,255,0.05)',
    obstacles: [
      { x: 160, y: 115, w: 120, h: 48, type: 'wall' },
      { x: 660, y: 115, w: 120, h: 48, type: 'wall' },
      { x: 415, y: 235, w: 110, h: 90, type: 'bunker' },
      { x: 160, y: 395, w: 120, h: 48, type: 'wall' },
      { x: 660, y: 395, w: 120, h: 48, type: 'wall' },
      { x: 310, y: 105, w: 48, h: 48, type: 'crate' },
      { x: 585, y: 405, w: 48, h: 48, type: 'crate' }
    ]
  },
  {
    name: 'Dwa Bunkry i Korytarz',
    bgColor: '#065f46',
    gridColor: 'rgba(255,255,255,0.06)',
    obstacles: [
      { x: 210, y: 185, w: 115, h: 175, type: 'bunker' },
      { x: 615, y: 185, w: 115, h: 175, type: 'bunker' },
      { x: 430, y: 95, w: 80, h: 55, type: 'crate' },
      { x: 430, y: 390, w: 80, h: 50, type: 'crate' },
      { x: 75, y: 110, w: 70, h: 42, type: 'wall' },
      { x: 795, y: 110, w: 70, h: 42, type: 'wall' }
    ]
  },
  {
    name: 'Twierdza Skrzyń',
    bgColor: '#3f6212',
    gridColor: 'rgba(255,255,255,0.06)',
    obstacles: [
      { x: 340, y: 135, w: 260, h: 42, type: 'wall' },
      { x: 130, y: 255, w: 145, h: 46, type: 'wall' },
      { x: 665, y: 255, w: 145, h: 46, type: 'wall' },
      { x: 435, y: 245, w: 70, h: 70, type: 'bunker' },
      { x: 225, y: 395, w: 60, h: 55, type: 'crate' },
      { x: 655, y: 395, w: 60, h: 55, type: 'crate' },
      { x: 140, y: 115, w: 55, h: 55, type: 'crate' },
      { x: 745, y: 115, w: 55, h: 55, type: 'crate' }
    ]
  },
  {
    name: 'Labirynt Osłon',
    bgColor: '#1e3a8a',
    gridColor: 'rgba(255,255,255,0.07)',
    obstacles: [
      { x: 175, y: 130, w: 46, h: 190, type: 'wall' },
      { x: 719, y: 130, w: 46, h: 190, type: 'wall' },
      { x: 350, y: 190, w: 240, h: 48, type: 'bunker' },
      { x: 350, y: 335, w: 95, h: 52, type: 'crate' },
      { x: 495, y: 335, w: 95, h: 52, type: 'crate' },
      { x: 75, y: 400, w: 95, h: 45, type: 'wall' },
      { x: 770, y: 400, w: 95, h: 45, type: 'wall' }
    ]
  }
];

const ENEMY_KIND_KEYS = [
  'normal',
  'rapid',
  'tough',
  'boss',
  'returning_normal',
  'returning_rapid',
  'returning_tough',
  'miner',
  'pro',
  'returning_boss'
];

const ENEMY_KIND_INFO = {
  normal: {
    key: 'normal',
    name: '🎯 Zwykły Przeciwnik',
    shortName: 'Zwykły',
    icon: '🎯',
    badge: '❤️ 1 HP | 💣 Wrażliwy na miny',
    badgeColor: '#f87171',
    desc: 'Podstawowy zawodnik na arenie w czerwonej koszulce z ciemnym wizjerem.',
    details: 'Ginie po 1 trafieniu. Po eliminacji zostawia paczkę +5 nabojów farby.'
  },
  rapid: {
    key: 'rapid',
    name: '⚡ Szybkostrzelny',
    shortName: 'Szybki ⚡',
    icon: '⚡',
    badge: '❤️ 1 HP | ⚡ Strzela 4x częściej',
    badgeColor: '#facc15',
    desc: 'Żółta koszulka. Błyskawicznie zasypuje arenę seriami kulek farby.',
    details: 'Wymaga 1 trafienia, ale przez wysoką szybkostrzelność jest bardzo groźny.'
  },
  tough: {
    key: 'tough',
    name: '🛡️ Pancerny Przeciwnik',
    shortName: 'Pancerny 🛡️',
    icon: '🛡️',
    badge: '❤️ 3 HP | 🛡️ Pancerz',
    badgeColor: '#fb923c',
    desc: 'Brązowy pancerz i podwyższona wytrzymałość — posiada 3 punkty życia.',
    details: 'Wymaga 3 trafień z markera lub 1 bezpośredniego wybuchu miny.'
  },
  boss: {
    key: 'boss',
    name: '👑 Bardzo Mocny (Boss)',
    shortName: 'Boss 👑',
    icon: '👑',
    badge: '❤️ 5 HP | 👑 ODPORNY NA MINY!',
    badgeColor: '#c084fc',
    desc: 'Fioletowy strój i złota korona. Potężny wróg całkowicie odporny na wybuchy min!',
    details: 'Posiada 5 punktów życia. Wybuch miny go nie rani — musisz pokonać go markerem lub bazooką!'
  },
  returning_normal: {
    key: 'returning_normal',
    name: '🔄 Powracający Zwykły',
    shortName: 'Powracający 🔄',
    icon: '🔄',
    badge: '❤️ 1 HP | 🔄 Powraca po 10s',
    badgeColor: '#38bdf8',
    desc: 'Niebieski strój ze znakiem odrodzenia. Po zabiciu powraca na arenę po 10 sekundach z dala od gracza.',
    details: 'W trakcie czekania na respawn jest traktowany jak martwy (możesz ukończyć etap, zanim wróci).'
  },
  returning_rapid: {
    key: 'returning_rapid',
    name: '⚡🔄 Powracający Szybki',
    shortName: 'Powracający Szybki ⚡🔄',
    icon: '⚡🔄',
    badge: '❤️ 1 HP | ⚡ Szybki | 🔄 Powraca po 10s',
    badgeColor: '#facc15',
    desc: 'Żółty szybkostrzelny wróg z aureolą odrodzenia. Respawnuje się po 10 sekundach od eliminacji.',
    details: 'Połączenie szybkostrzelności z ciągłym powrotem na pole walki.'
  },
  returning_tough: {
    key: 'returning_tough',
    name: '🛡️🔄 Powracający Pancerny',
    shortName: 'Powracający Pancerny 🛡️🔄',
    icon: '🛡️🔄',
    badge: '❤️ 3 HP | 🛡️ Pancerz | 🔄 Powraca po 15s',
    badgeColor: '#fb923c',
    desc: 'Pancerny zawodnik, który po wyeliminowaniu powraca na planszę po 15 sekundach z dala od gracza.',
    details: 'Wymaga 3 trafień. Po odrodzeniu pojawia się ponownie z pełnym zapasem 3 HP.'
  },
  miner: {
    key: 'miner',
    name: '💣 Podkładacz Min',
    shortName: 'Podkładacz 💣',
    icon: '💣',
    badge: '❤️ 8 HP | 💣 Kładzie miny co 30s',
    badgeColor: '#22c55e',
    desc: 'Zielony mundur, plecak z minami. Porusza się powoli i raz na 30 sekund podkłada miny, które omija.',
    details: 'Aż 8 punktów życia. Omija miny własne i Twoje. Po zabiciu dropuje +1 nową minę dla Ciebie!'
  },
  pro: {
    key: 'pro',
    name: '🎯 Profesjonalista',
    shortName: 'Profesjonalista 🎯',
    icon: '🎯',
    badge: '❤️ 2 HP | 🧠 Wyprzedzenie | 🕶️ 50% min | 💨 Unika strzałów z daleka',
    badgeColor: '#818cf8',
    desc: 'Taktyczny ciemnogranatowy strój. Strzela sprytnie z wyprzedzeniem i unika strzałów gracza z dystansu (≥25% ekranu)!',
    details: '2 HP. Widzi połowę Twoich min i je omija. Gdy strzelasz z odległości ≥25% ekranu, profesjonalista reaguje i natychmiast usuwa się z linii strzału!'
  },
  returning_boss: {
    key: 'returning_boss',
    name: '👑🔄 Powracający Boss',
    shortName: 'Powracający Boss 👑🔄',
    icon: '👑🔄',
    badge: '❤️ 5 HP | 👑 Odporny na miny | 🔄 Powraca po 20s',
    badgeColor: '#c084fc',
    desc: 'Najgroźniejszy przeciwnik na arenie — potężny boss odporny na miny, który po zabiciu odradza się po 20 sekundach.',
    details: '5 HP. Odporny na miny. Po eliminacji wraca po 20 sekundach z pełnym życiem!'
  }
};

function getEnemyKindStats(kind, index = 0) {
  const shirtColors = ['#ef4444', '#f97316', '#eab308', '#ec4899'];
  const isBoss = kind === 'boss' || kind === 'returning_boss';
  const isTough = kind === 'tough' || kind === 'returning_tough';
  const isRapid = kind === 'rapid' || kind === 'returning_rapid';
  const isRetNorm = kind === 'returning_normal';
  const isPro = kind === 'pro';
  const isMiner = kind === 'miner';

  let maxHits = 1;
  if (isBoss) maxHits = 5;
  else if (isMiner) maxHits = 8;
  else if (isTough) maxHits = 3;
  else if (isPro) maxHits = 2;

  let radius = 16;
  if (isBoss) radius = 21;
  else if (isMiner || isTough) radius = 18;

  let shirtColor = shirtColors[index % shirtColors.length];
  if (isBoss) shirtColor = '#9333ea';
  else if (isMiner) shirtColor = '#15803d';
  else if (isTough) shirtColor = '#d97706';
  else if (isRapid) shirtColor = '#eab308';
  else if (isRetNorm) shirtColor = '#38bdf8';
  else if (isPro) shirtColor = '#1e1b4b';

  let speed = 1.7 + Math.random() * 0.35;
  if (isMiner) speed = 0.7 + Math.random() * 0.15;
  else if (isBoss) speed = 1.45 + Math.random() * 0.3;
  else if (isTough) speed = 1.6 + Math.random() * 0.3;
  else if (isRapid) speed = 1.95 + Math.random() * 0.35;
  else if (isPro) speed = 1.85 + Math.random() * 0.3;

  let shootTimer = 50 + Math.random() * 65;
  if (isMiner) shootTimer = 180 + Math.random() * 120;
  else if (isRapid) shootTimer = 16 + Math.random() * 14;
  else if (isPro) shootTimer = 42 + Math.random() * 30;

  return {
    maxHits,
    radius,
    shirtColor,
    speed,
    shootTimer,
    mineImmune: isBoss
  };
}

function getLevelConfig(lvl) {
  const presets = {
    1:  { roster: ['normal'], label: '1x Zwykły (1 HP)', clouds: 0, civilians: 1 },
    2:  { roster: ['normal', 'normal'], label: '2x Zwykły', clouds: 1, civilians: 1 },
    3:  { roster: ['rapid'], label: '1x Szybkostrzelny ⚡ (Nowy wróg!)', clouds: 0, civilians: 1 },
    4:  { roster: ['normal', 'rapid'], label: '1x Zwykły + 1x ⚡ Szybki', clouds: 1, civilians: 1 },
    5:  { roster: ['tough'], label: '1x Pancerny 🛡️ (Nowy wróg — 3 HP!)', clouds: 0, civilians: 2 },
    6:  { roster: ['normal', 'tough'], label: '1x Zwykły + 1x 🛡️ Pancerny', clouds: 1, civilians: 2 },
    7:  { roster: ['boss'], label: '1x Boss 👑 (Odporny na miny! Nowy wróg!)', clouds: 0, civilians: 2 },
    8:  { roster: ['normal', 'rapid', 'tough'], label: '1x Zwykły + 1x ⚡ + 1x 🛡️', clouds: 2, civilians: 2 },
    9:  { roster: ['normal', 'returning_normal'], label: '1x Zwykły + 1x 🔄 Powracający (Nowy wróg — powraca po 10s!)', clouds: 0, civilians: 1 },
    10: { roster: ['tough', 'returning_normal'], label: '1x 🛡️ Pancerny + 1x 🔄 Powracający', clouds: 1, civilians: 2 },
    11: { roster: ['normal', 'returning_rapid'], label: '1x Zwykły + 1x ⚡🔄 Powracający Szybki (Nowy wróg!)', clouds: 0, civilians: 1 },
    12: { roster: ['rapid', 'returning_rapid'], label: '1x ⚡ Szybki + 1x ⚡🔄 Powracający', clouds: 1, civilians: 2 },
    13: { roster: ['normal', 'returning_tough'], label: '1x Zwykły + 1x 🛡️🔄 Powracający Pancerny (Nowy wróg — 15s!)', clouds: 0, civilians: 2 },
    14: { roster: ['tough', 'returning_tough'], label: '1x 🛡️ Pancerny + 1x 🛡️🔄 Powracający', clouds: 2, civilians: 2 },
    15: { roster: ['miner'], label: '1x Podkładacz Min 💣 (Nowy wróg — dropuje miny!)', clouds: 0, civilians: 2 },
    16: { roster: ['miner', 'returning_normal'], label: '1x 💣 Podkładacz + 1x 🔄 Powracający', clouds: 1, civilians: 2 },
    17: { roster: ['pro'], label: '1x Profesjonalista 🎯 (Nowy wróg — strzał z wyprzedzeniem!)', clouds: 0, civilians: 2 },
    18: { roster: ['pro', 'miner'], label: '1x 🎯 Profesjonalista + 1x 💣 Podkładacz', clouds: 2, civilians: 2 },
    19: { roster: ['tough', 'returning_boss'], label: '1x 🛡️ Pancerny + 1x 👑🔄 Powracający Boss (Nowy wróg — powraca po 20s!)', clouds: 0, civilians: 3 },
    20: { roster: ['pro', 'miner', 'returning_boss'], label: '1x 🎯 Pro + 1x 💣 Podkładacz + 1x 👑🔄 Boss', clouds: 2, civilians: 3 }
  };
  if (presets[lvl]) {
    const p = presets[lvl];
    return {
      roster: p.roster,
      label: p.label,
      clouds: p.clouds,
      civilians: p.civilians,
      arena: arenaLayouts[(lvl - 1) % arenaLayouts.length]
    };
  }
  const roster = [];
  const bossCnt = 1 + Math.floor((lvl - 16) / 4);
  const toughCnt = 1 + (lvl % 2);
  const rapidCnt = 1 + ((lvl + 1) % 2);
  const retNormCnt = lvl % 2;
  const proCnt = 1 + (lvl % 3 === 0 ? 1 : 0);
  const minerCnt = 1 + Math.floor((lvl - 15) / 5);

  for (let i = 0; i < retNormCnt; i++) roster.push('returning_normal');
  for (let i = 0; i < rapidCnt; i++) roster.push('rapid');
  for (let i = 0; i < toughCnt; i++) roster.push('tough');
  for (let i = 0; i < proCnt; i++) roster.push('pro');
  for (let i = 0; i < minerCnt; i++) roster.push('miner');
  for (let i = 0; i < bossCnt; i++) roster.push(lvl % 2 === 0 ? 'returning_boss' : 'boss');

  const clouds = 1 + (lvl % 3);
  const civilians = 1 + (lvl % 3);
  return {
    roster,
    label: `${proCnt}x 🎯 Pro + ${minerCnt}x 💣 + ${toughCnt}x 🛡️ + ${bossCnt}x 👑`,
    clouds,
    civilians,
    arena: arenaLayouts[(lvl - 1) % arenaLayouts.length]
  };
}

function formatCustomMapSummary(cm) {
  const parts = [];
  for (const k of ENEMY_KIND_KEYS) {
    if (cm[k] > 0) {
      const info = ENEMY_KIND_INFO[k];
      parts.push(`${cm[k]}x ${info ? info.icon : ''} ${info ? info.shortName : k}`);
    }
  }
  return parts.length > 0 ? parts.join(' + ') : '1x 🎯 Zwykły';
}
