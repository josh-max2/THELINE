# BALANCE_AUDIT.md

> Phase 6.1 — QA + balance audit. Static DPS analysis across all 30 modules.
> Updated: 2026-05-06.

## Method

Theoretical-DPS computation per behavior kind:

| Kind | Formula | Notes |
|---|---|---|
| auto-fire | `damage × fireRate` | per-projectile, single target |
| beam | `damagePerSecond` | declared directly |
| aoe-pulse | `damage × fireRate` | single-target equivalent — multi-target adds value above this |
| support-aura | n/a | passive utility, no direct damage |

Power efficiency = DPS / power consumption.

Outliers flagged at <30% or >300% of median DPS, or <30% / >300% of median DPS-per-power.

## Per-module table (sorted by DPS)

| id | kind | category | DPS | power | DPS/pwr |
|---|---|---|---:|---:|---:|
| point-defense | auto-fire | support | 25 | 2 | 12.50 |
| plasma-torch | beam | fire | 18 | 2 | 9.00 |
| lightning | beam | electric | 14 | 1 | 14.00 |
| gatling | auto-fire | kinetic | 12 | 1 | 12.00 |
| ember-volley | auto-fire | fire | 12 | 2 | 6.00 |
| frag-cannon | auto-fire | explosive | 12 | 2 | 6.00 |
| missile | aoe-pulse | explosive | 10.5 | 2 | 5.25 |
| basic-cannon | auto-fire | kinetic | 10 | 1 | 10.00 |
| flamethrower | beam | fire | 10 | 1 | 10.00 |
| chain-lightning | beam | electric | 10 | 2 | 5.00 |
| frost-cannon | auto-fire | cryo | 9 | 2 | 4.50 |
| napalm-spray | beam | fire | 8 | 2 | 4.00 |
| railgun | auto-fire | kinetic | 7.5 | 3 | 2.50 |
| gauss-cannon | auto-fire | kinetic | 7.5 | 4 | 1.88 |
| glacial-spike | aoe-pulse | cryo | 7.2 | 2 | 3.60 |
| mortar | aoe-pulse | explosive | 6.25 | 3 | 2.08 |
| ignite-mortar | aoe-pulse | fire | 6 | 2 | 3.00 |
| ice-mortar | aoe-pulse | cryo | 6 | 2 | 3.00 |
| demo-charge | aoe-pulse | explosive | 6 | 4 | 1.50 |
| freeze-beam | beam | cryo | 5 | 1 | 5.00 |
| shotgun | auto-fire | kinetic | 4 | 2 | 2.00 |
| **emp-pulse** | aoe-pulse | electric | **0** | 3 | **0.00** |
| blizzard-gen | support-aura | cryo | (passive) | 3 | — |
| shield-emitter | support-aura | support | (passive) | 1 | — |
| repair-drone | support-aura | support | (passive) | 1 | — |
| decoy-launcher | support-aura | support | (passive) | 2 | — |
| magnetic-coil | support-aura | support | (passive) | 2 | — |
| target-paint | support-aura | support | (passive) | 1 | — |
| gravity-well | support-aura | support | (passive) | 3 | — |
| veil-siphon | support-aura | support | (passive) | 4 | — |

DPS median (excluding support-aura): **9**.
DPS/power median (excluding support-aura, power>0): **5.00**.

## Flagged outliers

### BLOCKER — broken module

**emp-pulse** (electric / aoe-pulse): `damage: 0`. The aoe-pulse handler will fire normally
(every 5s, 150-radius blast) but apply zero damage to enemies. The only effect that
actually lands is the env-zone tick (`electric` damageType in rock biome → 2 dps × 1s = ~0.4 effective DPS
amortized over the 5s firing window). Intent appears to be a stun/disable mechanic
that doesn't yet exist in the v0 handlers.

**Fix options for v1:**
1. Replace `damage: 0` with a non-zero value (~3-6) so it lands as a weak electric pulse.
2. Add a `behavior.disable` field + handler logic that briefly pauses enemy `tracker` movement.
3. Remove emp-pulse from the catalog; ship it in a content patch when the disable mechanic lands.

**Recommendation:** Option 1 for launch — minimal code change, keeps the module shippable,
defers the stun mechanic to post-launch. Set `damage: 4` and reduce `fireRate` to 0.4 to
avoid making it a top-tier kinetic-equivalent at the same time.

### NOTE — borderline outliers (within threshold, watch in playtests)

- **point-defense** (DPS 25, support category): 2.78× median DPS, just under the 3× outlier threshold. It's classified as `support` category but has the highest DPS in the catalog. Misclassification — should be `kinetic`. Doesn't affect runtime (category only gates env zone via `categoryToDamageType` which returns undefined for `support` so it skips zones). For v1 either re-classify or accept the misclassification.
- **lightning** (DPS/pwr 14): 2.8× the DPS/power median. Most efficient turret in the catalog.
  At 1 power for 14 DPS, beats basic-cannon (1 power, 10 DPS) and gatling (1 power, 12 DPS).
  Acceptable since electric is the smallest category (3 modules) — single dominant pick is
  forgivable. Watch in playtests for "always pick lightning" pattern.
- **gauss-cannon** (DPS/pwr 1.88) and **shotgun** (DPS/pwr 2.00): low-efficiency but
  high-burst (gauss = 50 damage / 0.15 fireRate = 7.5 dps but each shot is huge).
  Anti-armor archetype. Acceptable.
- **demo-charge** (DPS/pwr 1.50): 4 power for 6 DPS — worst efficiency in the
  attack catalog. Slow pulse (0.5 fireRate) with big radius implied. Probably intended
  as a screen-clear; current numbers don't justify the 4-power cost. Recommend
  reducing power to 2-3 or buffing damage to 12+ for v1.

## Test coverage gap closed (Phase 6.1 audit)

`modulesData.test.ts > every module references a registered behavior kind`
previously allowed 7 kinds (`auto-fire`, `beam`, `shield`, `repair`, `aoe-pulse`,
`support-aura`, `terrain-effect`). Only 4 of these have registered handlers in
production (`auto-fire`, `beam`, `aoe-pulse`, `support-aura`). The other 3 are
declared in the `BehaviorKind` union for future use but no handler exists.

A future module accidentally using `kind: 'shield'` would have passed the test
but crashed at runtime via `MAS.attach`'s "no handler registered" guard.

Tightened the test to read the registry directly (`moduleBehaviors.has(...)`)
so only currently-runnable kinds pass. 372 unit still green.

## Action items rolling into Phase 6.x

| # | item | severity | task |
|---|---|---|---|
| 1 | Fix `emp-pulse` damage:0 → damage:4, fireRate:0.4 | BLOCKER for v1 | 6.1 |
| 2 | Re-classify `point-defense` from support → kinetic | NIT | 6.3 (balance simulator may surface) |
| 3 | Tune `demo-charge` (raise damage or lower power) | NIT | 6.3 |
| 4 | Watch lightning's dominance in playtests | OBSERVE | 6.6 (playtests) |
| 5 | Add stun/disable mechanic for true emp-pulse identity | DEFERRED | post-v1 |

## Status

- Static balance pass: ✅ done
- Latent test gap: ✅ closed
- emp-pulse fix: pending in this same task
- Live runtime gauntlet (every module fires correctly in-game): deferred to Task 6.3 balance simulator
