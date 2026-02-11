# Looky Shape Game

## Game Concept

A first-person shape collecting game with a unique twist: **shapes vanish when you look away**.

The player walks on a vast white surface under a black sky. Colorful shapes float in the air. The player is given a recipe requiring specific shapes. They must collect shapes and bring them to a collection zone to complete the recipe.

**The Core Mechanic:** When a shape enters your view and you've "seen" it, looking away causes it to despawn. A new shape spawns somewhere else. This creates chaos if you move quickly, but careful, methodical play lets you sort through shapes easily.

---

## Current State (as of cdb1660)

### Working Features
- ✅ First-person controls (WASD + mouse, shift to sprint)
- ✅ White ground plane, black sky
- ✅ White decorative shapes (non-collectible)
- ✅ Colored collectible shapes (cubes, spheres, tetrahedrons, octahedrons, tori)
- ✅ 100 shapes in the world
- ✅ Low-poly aesthetic with flat shading
- ✅ Click to pick up / drop shapes
- ✅ Fixed collection zone (glowing cyan)
- ✅ Recipe system with increasing difficulty
- ✅ Shadows

### Shape Types
| Shape | Color | Size Value | Rarity |
|-------|-------|------------|--------|
| Cube | Red | 5 | Common (10) |
| Sphere | Green | 10 | Medium (7) |
| Tetrahedron | Yellow | 7 | Uncommon (5) |
| Octahedron | Magenta | 8 | Rare (3) |
| Torus | Cyan | 12 | Very Rare (2) |

---

## TODO

### 🔴 High Priority: Fix Spawning System
**Problem:** Shapes currently spawn on-screen when they should only spawn off-screen.

**Desired Behavior:**
1. When a shape leaves the player's view (after being seen), it despawns
2. A replacement shape spawns **off-screen only**
3. As the player turns, they naturally encounter the newly spawned shapes at the edges
4. Shapes should never visibly "pop in" on screen

**Attempted Approaches:**
- Velocity-based spawning (spawn where player is looking) — didn't feel right
- Edge-of-frustum spawning — shapes still appeared on-screen
- Screen-space projection verification — needs more work

**Pinned for Later:** Velocity gizmo (green arrow showing camera rotation) was working and can be used to refine velocity-based spawning.

---

### 🟡 Medium Priority: Recipe Restrictions/Modifiers

Add complexity and variety to recipes with different challenge modes:

1. **Timer** — Complete recipe before time runs out
2. **Expiration** — Collected ingredients expire after X seconds
3. **Order Mode** — Must collect ingredients in specific order or start over
4. **Fragile Mode** — Looking away from a collected ingredient resets it
5. **Combo Expiration** — Certain shape combinations spoil if held too long

---

### 🟢 Lower Priority: Spawn Rate Modifiers

- **Day/Night Cycle** — Different shapes more common at different times
- **Rarity Shifts** — Rare shapes become common temporarily
- **Shape Waves** — Periods where only certain shapes spawn
- **Difficulty Scaling** — Spawn rates change as recipes get harder

---

### 🔵 Future Features

- **Portable Carrier** — Player can place a container to store multiple shapes
- **Larger World** — Expand play area with landmarks
- **Sound Effects** — Pickup, drop, complete sounds
- **Visual Feedback** — Particles on collect, recipe complete celebration
- **Leaderboard** — Track recipes completed, time taken

---

## Technical Notes

- **Framework:** Three.js with Vite
- **Deployment:** Vercel (auto-deploys from GitHub main branch)
- **GitHub:** https://github.com/TheRealDatamir/looky-shape-game
- **Live:** https://looky-shape-game.vercel.app

### Key Files
- `src/main.js` — All game logic
- `index.html` — UI and styling
- `PROJECT.md` — This file

---

## Session Log

### 2026-02-11
- Initial build: basic movement, shapes, recipe system
- Added shadows, larger world, higher floating shapes
- Tried low-poly aesthetic (kept)
- Multiple attempts at fixing spawn system (ongoing)
- Created velocity gizmo for debugging
- Reverted to cdb1660 to stabilize before continuing
