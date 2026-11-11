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
    desc: 'Wystrzeliwuje rakietę, która sama namierza najbliższego wroga i omija przeszkody! Start: 3 rakiety.',
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
  baseDesc: 'Podstawowa wytrzymałość zawodnika: 200 HP na start oraz regeneracja +1 HP/s.',
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

function getLevelConfig(lvl) {
  const presets = {
    1:  { roster: ['normal'], label: '1x Zwykły (1 HP)', clouds: 0 },
    2:  { roster: ['normal', 'normal'], label: '2x Zwykły', clouds: 1 },
    3:  { roster: ['tough'], label: '1x Pancerny 🛡️ (3 strzały)', clouds: 1 },
    4:  { roster: ['rapid'], label: '1x Szybkostrzelny ⚡ (Seria strzałów!)', clouds: 2 },
    5:  { roster: ['normal', 'tough', 'rapid'], label: '1x Zwykły + 1x 🛡️ + 1x ⚡ Szybki', clouds: 1 },
    6:  { roster: ['boss'], label: '1x BARDZO MOCNY 👑 (Odporny na miny!)', clouds: 2 },
    7:  { roster: ['rapid', 'rapid', 'tough'], label: '2x Szybkostrzelny ⚡ + 1x 🛡️', clouds: 2 },
    8:  { roster: ['normal', 'tough', 'rapid', 'boss'], label: '1x Zwykły + 🛡️ + ⚡ + 👑 Boss', clouds: 3 },
    9:  { roster: ['rapid', 'rapid', 'boss'], label: '2x Szybkostrzelny ⚡ + 1x 👑 Boss', clouds: 2 },
    10: { roster: ['tough', 'tough', 'rapid', 'boss', 'boss'], label: '2x 🛡️ + 1x ⚡ + 2x 👑 Boss', clouds: 3 }
  };
  if (presets[lvl]) {
    const p = presets[lvl];
    return {
      roster: p.roster,
      label: p.label,
      clouds: p.clouds,
      arena: arenaLayouts[(lvl - 1) % arenaLayouts.length]
    };
  }
  const roster = [];
  const bossCnt = 1 + Math.floor((lvl - 8) / 2);
  const toughCnt = 1 + (lvl % 2);
  const rapidCnt = 1 + ((lvl + 1) % 2);
  const normCnt = lvl % 2;
  for (let i = 0; i < normCnt; i++) roster.push('normal');
  for (let i = 0; i < rapidCnt; i++) roster.push('rapid');
  for (let i = 0; i < toughCnt; i++) roster.push('tough');
  for (let i = 0; i < bossCnt; i++) roster.push('boss');
  const clouds = 1 + (lvl % 3); // 1-3 chmury
  return {
    roster,
    label: `${normCnt ? normCnt + 'x Zwykły + ' : ''}${rapidCnt}x ⚡ + ${toughCnt}x 🛡️ + ${bossCnt}x 👑`,
    clouds,
    arena: arenaLayouts[(lvl - 1) % arenaLayouts.length]
  };
}

function formatCustomMapSummary(cm) {
  const parts = [];
  if (cm.normal > 0) parts.push(`${cm.normal}x 🎯 Zwykły`);
  if (cm.tough > 0) parts.push(`${cm.tough}x 🛡️ Pancerny`);
  if (cm.rapid > 0) parts.push(`${cm.rapid}x ⚡ Szybki`);
  if (cm.boss > 0) parts.push(`${cm.boss}x 👑 Boss`);
  return parts.length > 0 ? parts.join(' + ') : '1x 🎯 Zwykły';
}
