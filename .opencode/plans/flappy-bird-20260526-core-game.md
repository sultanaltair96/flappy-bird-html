# Flappy Bird — Implementation Plan

## Goal
Build a fully playable Flappy Bird clone as a single HTML file (game) + Cloudflare Pages Functions (API backend) + D1 (database). Studio-quality polish, online leaderboard.

## Design Decisions
- **Canvas:** 400×600 portrait, centered
- **State machine:** IDLE → PLAYING → GAME_OVER → ...
- **Difficulty:** Flat (no ramp). Gap ~130px, speed ~3px/frame
- **Art style:** Daytime — blue sky gradient, white clouds, green hills, green pipes, brown ground
- **Online leaderboard:** D1 DB with top 10 scores by name

## Files

### 1. `index.html` — The Game (single self-contained file)
- Embedded CSS (centered layout, dark page background)
- Embedded JavaScript using Canvas API
- All visuals procedurally drawn (no external assets)

### 2. `functions/api/score.js` — API Endpoint (Cloudflare Pages Function)
- `POST /api/score` — submit `{name, score}` → INSERT into D1 with timestamp
- `GET /api/score` — SELECT top 10 scores ORDER BY score DESC
- CORS headers set

### 3. `wrangler.toml` — Configuration
- Pages project config
- D1 database binding

## Game Implementation Details

### State Machine
```
IDLE → (space/tap) → PLAYING → (collision) → GAME_OVER → (space/tap) → IDLE
```

### Physics
- Gravity: 0.45 px/frame²
- Jump impulse: -7.5 px/frame
- Terminal velocity: 10 px/frame
- Delta-time scaling for 60fps

### Bird
- Position: fixed X=80, Y varies
- Hitbox: 24×18 (slightly forgiving inset from visual 30×22)
- Rotation: -25° (rising) to +90° (falling), lerped
- Wing animation: 3 frames cycled every 6 game frames (wing up, mid, down)

### Pipes
- Width: 52px
- Gap: 130px
- Speed: 3 px/frame (scrolls left)
- Horizontal spacing between pipe pairs: ~220px (about 3.5s at speed)
- Gap Y: random between minY (80) and maxY (420) given ground at 520
- Score increments when pipe's right edge passes bird's left edge

### Collision
- AABB with bird hitbox against pipes (top pipe bottom rect, bottom pipe top rect)
- Check Y against ceiling (0) and ground (530)
- If collision → state = GAME_OVER

### Parallax Background
- Layer 0: Sky gradient (blue → lighter blue)
- Layer 1: Clouds — 5 ellipses scrolling at 0.5 px/frame
- Layer 2: Hills — 3 smoothed curves scrolling at 1.0 px/frame (green shades)
- Layer 3: Ground — repeating stripe at y=520, scrolling at 3 px/frame
- Layer 4: Pipes — scrolling at 3 px/frame
- Layer 5: Bird + Score

### Screens
- **Start:** "FLAPPY BIRD" title, instruction text, animated bird bobbing
- **Game Over:** "GAME OVER" text, final score, "ENTER NAME" input (3-12 chars), submit button, leaderboard table (top 10), "PRESS SPACE TO RESTART"
- **Leaderboard section:** Scrollable list within game-over screen showing rank, name, score, date

### Scoring & Leaderboard
- Score increments when bird passes a pipe pair
- Local high score saved to localStorage
- On game-over, prompt for name (validated: 3-12 chars, alphanumeric + spaces)
- Submit via POST fetch to `/api/score`
- Fetch GET top 10 scores and display

### Input
- Spacebar → jump / start / restart
- Mouse click → jump (on canvas)
- Touch → jump (on canvas)
- Prevent default on space

### Visual Polish
- Death: brief screen shake (3 frames, offset ±4px) + red flash (alpha fade over 500ms)
- Score: large bold white text with black drop shadow
- Ground: sawtooth grass edge at top of brown strip
- Pipes: light green gradient body, darker green cap edges, highlight strips
- Bird: yellow body, orange beak, eye dot, 3 wing positions

## API Implementation

### POST /api/score
```json
// Request
{ "name": "Player1", "score": 42 }
// Response
{ "success": true, "id": 1 }
```

### GET /api/score
```json
// Response
{ "scores": [
  { "rank": 1, "name": "Player1", "score": 99, "created_at": "2026-05-26T..." },
  ...
]}
```

### D1 Schema
```sql
CREATE TABLE scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  score INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_score ON scores(score DESC);
```

## Verification
- `node -e "new Function(fs.readFileSync('index.html','utf8').match(/<script>([\s\S]*?)<\/script>/)[1]); console.log('OK')"`
- Start a local server: `python3 -m http.server 8080`
- Manual play test: space/tap, collision, score increment, game-over flow
- API test: curl POST/GET the /api/score endpoint

## Build Sequence
1. Create `index.html` with full game + embedded CSS/JS
2. Create `functions/api/score.js` with D1-backed API
3. Create `wrangler.toml` with Pages + D1 binding
4. Create D1 database via wrangler
5. Test locally
6. Git commit
7. Deploy to Cloudflare Pages with D1 binding
