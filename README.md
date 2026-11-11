# 🎨 Paintball Arena — Tymek Gra

Dwuwymiarowa gra zręcznościowa typu top-down shooter napisana w czystym HTML5, CSS3 i JavaScript (`Canvas 2D` + `Web Audio API`). Gra działa bezpośrednio w przeglądarce po otwarciu pliku `index.html` (przez protokół `file://`, bez konieczności uruchamiania lokalnego serwera HTTP).

---

## 📁 Struktura i podział kodu

Projekt został podzielony na mniejsze, tematyczne moduły, aby ułatwić dalszy rozwój i utrzymanie kodu:

```text
tymek-gra/
├── index.html        # Główny dokument HTML (szkielet UI, płótno Canvas i ładowanie skryptów)
├── style.css         # Arkusz stylów interfejsu, ekranów nakładkowych (overlay) i edytora map
├── README.md         # Dokumentacja projektu i opis architektury
└── js/
    ├── config.js     # Konfiguracja gry, układy aren i definicje poziomów
    ├── state.js      # Stan gry, referencje DOM oraz zapis/odczyt w localStorage
    ├── audio.js      # Syntezator efektów dźwiękowych (Web Audio API)
    ├── renderer.js   # Renderowanie grafiki na Canvas 2D
    ├── ui.js         # Obsługa interfejsu użytkownika, menu poziomów i edytora własnych map
    └── game.js       # Fizyka, kolizje, sztuczna inteligencja (AI), sterowanie i pętla gry
```

---

## 🧩 Szczegółowy opis plików

### 1. `index.html`
Zawiera wyłącznie strukturę DOM:
- Górny pasek przycisków (Menu poziomów, Własne mapy, Pauza, Stawianie min, Ruch za myszką, Reset).
- Pasek statystyk HUD (Poziom, HP, Naboje, Miny, Przeciwnicy).
- Element `<canvas id="gameCanvas">` o wymiarach `900×580`.
- Dwa niezależne ekrany nakładkowe (`.overlay`):
  - `#menuOverlay` — ekran wyboru poziomów kampanii oraz podsumowania wyniku (wygrana/przegrana).
  - `#customOverlay` — osobny ekran listy własnych map oraz formularza edytora map.
- Sekwencyjne ładowanie skryptów z katalogu `js/`.

### 2. `style.css`
Odpowiada za wygląd całej aplikacji:
- Układ flexbox/grid dla paska narzędzi i statystyk.
- Przewijana siatka kart poziomów (`.levels-grid`) zabezpieczająca przed przepełnieniem ekranu przy wielu odblokowanych etapach.
- Style dla ekranu własnych map (`.custom-maps-list`, `.custom-map-row`) oraz formularza edytora (`.editor-card`, `.enemy-Count-row`).
- Animacje (np. pulsowanie przycisku miny przy gotowości).

### 3. `js/config.js`
Przechowuje stałe dane konfiguracyjne oraz generatory poziomów:
- `colors` — paleta kolorów dla pocisków i plam farby.
- `arenaLayouts` — tablica 4 układów przeszkód na arenie (*Klasyczna Arena*, *Dwa Bunkry i Korytarz*, *Twierdza Skrzyń*, *Labirynt Osłon*).
- `getLevelConfig(lvl)` — funkcja zwracająca skład fali wrogów (`enemies`: typy `normal`, `tough`, `rapid`, `boss`), układ przeszkód i opis dla danego poziomu kampanii.
- `formatCustomMapSummary(cm)` — pomocnicza funkcja formatująca podsumowanie składu wrogów dla własnej mapy.

### 4. `js/state.js`
Zarządza globalnym stanem rozgrywki i trwałością danych:
- Referencje do elementów DOM (`canvas`, `ctx`, przyciski, kontenery menu).
- Stan postępów gracza zapisywany w `localStorage`:
  - `unlockedLevel` — najwyższy odblokowany poziom.
  - `completedLevels` — najlepsze czasy ukończenia poziomów.
  - `playerMines` — liczba posiadanych min (przechodzą między poziomami).
  - `customMaps` — lista własnych map stworzonych przez gracza.
- Obiekt `player` (pozycja, promień, HP, amunicja, kąt celowania) oraz tablice encji na arenie (`enemies`, `bullets`, `splats`, `mines`, `ammoPickups`, `obstacles`).
- `saveProgress()` — zapisuje bieżący stan postępów i własnych map w `localStorage`.

### 5. `js/audio.js`
Generuje efekty dźwiękowe w czasie rzeczywistym za pomocą `Web Audio API` (bez zewnętrznych plików `.mp3`/`.wav`):
- `playMineBeep(secondsLeft)` — dźwięk `PIK!` podczas 5-sekundowego uzbrajania miny (częstotliwość rośnie wraz ze zbliżaniem się uzbrojenia).
- `playExplosionSound()` — synteza wybuchu miny (szum biały + niski ton).
- `playShootSound()` — odgłos wystrzału kulki z farbą.
- `playPickupSound()` — dźwięk zebrania paczki z amunicją.
- `playEmptyAmmoSound()` — kliknięcie informujące o pustym magazynku.

### 6. `js/renderer.js`
Odpowiada wyłącznie za rysowanie obiektów na płótnie `<canvas>`:
- `addPaintSplat(x, y, color, count)` — tworzy rozbryzgi farby na podłożu po trafieniu lub wybuchu miny.
- `drawMine(mine)` — rysuje minę na ziemi wraz z licznikiem uzbrajania (`PIK! 5s..1s`) lub pulsującą czerwoną diodą i zasięgiem rażenia po uzbrojeniu.
- `drawAmmoPickups()` — rysuje skrzynki z amunicją (`+5` z wrogów, `+10` ze zrzutów na mapie).
- `drawHuman(entity, isPlayer)` — rysuje postać gracza lub przeciwnika (z uwzględnieniem skali, paska zdrowia, korony Bossa odpornego na miny, pioruna dla Szybkostrzelnego strzelca oraz tarczy dla Pancernego).
- `renderScene()` — składa całą klatkę obrazu (siatka tła, plamy farby, miny, amunicja, przeszkody z cieniami, postacie, pociski oraz celownik/nakładka pauzy).

### 7. `js/ui.js`
Obsługuje przełączanie ekranów, blokady UX oraz edytor map:
- `updateHud()` — odświeża liczniki w górnym pasku oraz stan przycisków.
- `startMenuButtonLock(buttons)` — zabezpiecza ekran wyników przed przypadkowym pominięciem (wymaga odczekania `1.6s` oraz puszczenia przycisku myszy po zakończeniu walki).
- `openMenu(mode)` — otwiera ekran wyboru poziomów lub podsumowania wygranej/przegranej (`select`, `win`, `lose`).
- `openCustomMapsScreen()` / `closeCustomMapsScreen()` — otwiera i zamyka niezależny ekran Własnych Map.
- `renderCustomMapsList()` — wyświetla karty własnych map z przyciskami *ZAGRAJ*, *Edytuj* i *Usuń*.
- `renderCustomMapEditor(mapId)` — otwiera osobny widok edytora pozwalający zmienić nazwę mapy, układ przeszkód oraz liczbę każdego z 4 typów przeciwników (`🎯 Zwykły`, `🛡️ Pancerny`, `⚡ Szybkostrzelny`, `👑 Boss`).

### 8. `js/game.js`
Serce mechaniki rozgrywki i pętli głównej:
- **Kolizje**: `rectCircleColliding()` oraz `canMoveTo()` sprawdzają kolizje postaci ze ścianami areny i przeszkodami.
- **Miny i amunicja**: `placeMine()`, `spawnAmmoDrop()`, `spawnPeriodicAmmoBox()`.
- **Przeciwnicy (`spawnEnemy`)**: inicjalizuje wrogów o odpowiednich statystykach:
  - `normal` — 1 HP, standardowa szybkostrzelność.
  - `tough` — 3 HP, większy rozmiar, wolniejszy ruch.
  - `rapid` — 1 HP, szybki ruch, strzela ~4x częściej.
  - `boss` — 5 HP, największy rozmiar, uruchamia miny, ale jest całkowicie odporny na ich wybuch.
- **Start rozgrywki**: `startLevel(lvl)` (kampania) oraz `startCustomMap(mapId)` (własne mapy).
- **Sterowanie**: obsługa klawiatury (`WASD`/Strzałki, `Spacja`/`E`, `F`, `P`, `M`, `R`) i myszy (celowanie i strzelanie, zablokowane menu kontekstowe PPM).
- **Pętla gry**: `update()` (ruch, AI, detekcja trafień, uzbrajanie i detonacja min) oraz `gameLoop()` oparte o `requestAnimationFrame`.
