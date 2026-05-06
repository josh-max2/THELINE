# ADR-003: Environment System (5×5 matrix v1)

> Status: ACCEPTED
> Date: 2026-05-05
> Authors: claude (PM)
> Phase: 4 (Task 4.8)
> Affects: DESIGN §8

## Context

DESIGN §8 specifies a 5 weapon-damage-type × 5 terrain-biome matrix (25 cells) with lingering environmental effects (fire patches, ice slows, electric chains, etc.). The build plan (Phase 4 Task 4.8) wants this implemented in v1.

Implementing the full effect runtime — spawned damage zones with visuals, compound interactions like "wildfire spreads," biome-specific terrain rendering — is a Phase 5 polish-scale effort. Phase 4 v0 should ship the **architecture + data layer**, leaving the visual/runtime layer for Phase 5.

## Decision

**Three-layer architecture:**

```
biomes.json (5)         ─┐
                         ├─→ EnvironmentSystem ─→ ParallaxBackground tint
environment-matrix.json ─┘                       (Phase 5: damage zones)
(5×5 = 25 cells)
```

### Data layer (v0 ships this)

- `biomes.json` — 5 entries: `rock`, `forest`, `sand`, `swamp`, `snow`. Each has a name + base color tint.
- `environment-matrix.json` — 25 cells keyed `{damageType}.{biomeId}`. Each cell:
  - `effect`: short tag (e.g., `"crater"`, `"wildfire"`, `"shrapnel"`)
  - `damagePerSec`: damage applied to enemies in zone (Phase 5 wires)
  - `durationSec`: zone lifetime
  - `color`: tint for the eventual visual

### Runtime layer (v0 stub, Phase 5 fleshes out)

- `EnvironmentSystem.ts` (Phaser-aware) holds current biome + ParallaxBackground reference. Exposes `setBiome(biomeId)`.
- `EncounterSystem` propagates biome on encounter advance: `encounter.biome` added to template.
- ParallaxBackground re-tints when biome changes (only v0 visual change).
- `resolveCell(damageType, biomeId)` is pure — used by Phase 5 to create damage zones at weapon-impact locations.

### What v0 does NOT ship

- Active damage-zone spawning at weapon impacts (Phase 5)
- Compound interactions (fire+forest spreads, electric+swamp chains) — Phase 5
- Biome-specific terrain art (Phase 5 visual polish)

## Why architecture-only for Phase 4

1. **The matrix is data, but the runtime is visual + spatial.** Wiring runtime damage zones requires impact-event hooks on every weapon archetype (auto-fire, beam, aoe-pulse) plus per-cell visual spawning. That's ~500 LoC of polish work that doesn't enable any other Phase 4 task.
2. **Phase 5 Task 5.2 ("Full 5×5 environmental matrix") explicitly handles the runtime expansion.** Splitting the data definition into 4.8 and the runtime into 5.2 matches the build plan's intent.
3. **The biome-tint visual gives v0 something tangible.** Players see the world shift between encounters even without damage zones.

## Schema sketch

```typescript
// types.ts
export type BiomeId = 'rock' | 'forest' | 'sand' | 'swamp' | 'snow';

export interface BiomeData {
  id: BiomeId;
  name: string;
  /** Hex color used to tint the parallax horizon. */
  tint: string;
}

export type WeaponDamageType = 'kinetic' | 'fire' | 'cryo' | 'explosive' | 'electric';

export interface EnvironmentCell {
  effect: string;      // e.g., "crater", "wildfire"
  damagePerSec: number;
  durationSec: number;
  color: string;       // tint for the eventual zone visual
}

export type EnvironmentMatrix = Record<WeaponDamageType, Record<BiomeId, EnvironmentCell>>;
```

## Out of scope

- Real-time damage zones at impact (Phase 5).
- "Wildfire spreads" / synergy compound effects (Phase 5).
- Biome-specific terrain art (Phase 5).
- Mid-encounter biome transitions (currently biomes are encounter-fixed).
