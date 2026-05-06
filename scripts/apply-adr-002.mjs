// One-shot tool: apply ADR-002 (Turrets + Items) + enemy-direction pivot to DESIGN.md.
// Idempotent — safe to re-run.
import fs from 'node:fs';

const path = 'docs/DESIGN.md';
let content = fs.readFileSync(path, 'utf8');
let changed = false;

const replacements = [
  {
    name: '§5 Modules → Turrets + Items rewrite',
    sentinel: 'Turrets + Items',
    from: `## 5. Modules

30 modules in v1, 6 categories (kinetic, fire, cryo, explosive, electric, support).
All defined in \`src/data/modules.json\`.
Rarity tiers: common / uncommon / rare / exotic.

- **Kinetic:** railgun, gatling, mortar — terrain destruction, no environmental effect
- **Fire:** flamethrower, plasma — burning patches (DOT)
- **Cryo:** freeze beam, ice mortar — slowing patches
- **Explosive:** missile, frag cannon — craters, AOE
- **Electric:** lightning, EMP — chains through enemies/terrain
- **Support:** shield emitter, repair drone bay, decoy launcher, target paint, healing aura, EMP pulse, magnetic coil, point-defense
- **Exotic:** time dilation, gravity well, monster pacifier, Veil siphon`,
    to: `## 5. Modules — Turrets + Items (Binding of Isaac stacking)

The module system has **two kinds**:

**Turrets** occupy car slots and produce projectiles, beams, or area effects. Each turret has a damage type (kinetic, fire, cryo, explosive, electric) that interacts with the environmental matrix (§8). Defined in \`src/data/modules.json\`.

**Items** stack onto turrets and modify their traits — damage, fire rate, projectile count, pierce, status effects, etc. Items physically render as stacked silhouettes on the turret, BoI-style, so the player can see at a glance what mods their turret carries. Defined in \`src/data/items.json\`.

\`\`\`
Car (slot) → Turret → Item × N (stacks on turret base, visible)
\`\`\`

**v1 ships ~10 turrets + ~20 items.** Effective stats are composed each frame as \`base ⊕ all-attached-items\`. Items declare \`appliesTo: TurretArchetype[]\` so a "spread shot" item only fits projectile turrets, etc.

**Turret archetypes (behavior kinds):**
- **Auto-fire** — cannons, railguns, gatlings (kinetic + most damage types)
- **Beam** — flamethrower, freeze beam, lightning
- **AOE pulse** — mortars, missiles, EMP
- **Support aura** — shield emitter, repair drones, target paint, healing
- **Terrain-effect** — exotic Veil/cosmic-horror modules

**Item categories:**
- **Damage mods** — flat +damage, % multipliers, crit chance
- **Projectile mods** — multi-shot, pierce, homing, ricochet
- **Rate mods** — fire rate, charge time, cooldown reduction
- **Status mods** — burn, freeze, shock, mark
- **Synergy mods** — items that interact with environmental matrix or other items

**Stack cap:** 3 items per turret in v1 (tech-tree upgradeable to 5+).

**Item discovery:** Items drop from encounters (BoI-style). Tech tree unlocks new items into the loot pool. Items are run-scoped: collected during a run, lost on death; only Salvage (meta-currency) persists.

**Synergies (Phase 5):** Specific stacks transform turrets — e.g., burn + pierce + spread = "molten lance volley." Defined in \`src/data/synergies.json\`.

**v2 expansion:** ~80 items, formal transformation triggers ("3 of one stat-type item → unique effect"), rarity tiers, Veil-corrupted item variants.`,
  },
  {
    name: '§6 Combat — enemies spawn except +x',
    sentinel: 'EXCEPT forward',
    from: `## 6. Combat

Vampire Survivors enemy density. Auto-fire. Player configures targeting priorities, fires manually at terrain.
- Modules auto-target by priority (closest, highest threat, weakest, lowest HP %)
- Enemies spawn from all sides, ramping by distance
- Bullet-hell visual density with particles, beams, projectile clouds
- Snowball pacing: minute 1 sparse, minute 15 chaos, minute 25 screen-clearing fireworks`,
    to: `## 6. Combat

Vampire Survivors enemy density. Auto-fire. Player configures targeting priorities, fires manually at terrain.

- Turrets auto-target by priority (closest, highest threat, weakest, lowest HP %).
- **Enemies spawn from every direction EXCEPT forward** (the +x direction the train is heading toward). The fantasy is "being chased": threats catch up from behind (-x), drop in from above (-y), come up from below (+y). The forward arc is the only "safe" sector — and only because nothing's spawned there yet. (v2 may add forward threats: rival train ambushes, biome bosses staked along the line.)
- Spawn weights: ~50% rear, ~25% top, ~25% bottom in v1; tunable per encounter type.
- Bullet-hell visual density with particles, beams, projectile clouds.
- Snowball pacing: minute 1 sparse, minute 15 chaos, minute 25 screen-clearing fireworks.`,
  },
  {
    name: '§10 Hub — Item Stash',
    sentinel: 'Item Stash',
    from: `**The Hub** (between runs):
- **Engineering Bay** — bolt new modules, save blueprints
- **Crew Roster** — recruit new crew, see specialty stats
- **Tech Tree** — spend Salvage (meta currency) on permanent unlocks
- **Mission Board** — pick which Line to run next
- **Lore Log** — Veil fragments accumulate
- **Idle income** — passive Salvage based on highest completed run
- **Auto-run mode** — set train to auto-repeat completed lines while away`,
    to: `**The Hub** (between runs):
- **Engineering Bay** — install/swap turrets, configure car-slot loadouts, save blueprints
- **Item Stash** *(post-run only)* — items found this run pile up in the run's stash visible on the train; on death, items are lost and only Salvage carries over
- **Crew Roster** — recruit new crew, see specialty stats
- **Tech Tree** — spend Salvage (meta currency) on permanent unlocks: new turret types, new items in the loot pool, more car/turret slots, higher item-stack caps
- **Mission Board** — pick which Line to run next
- **Lore Log** — Veil fragments accumulate
- **Idle income** — passive Salvage based on highest completed run
- **Auto-run mode** — set train to auto-repeat completed lines while away`,
  },
  {
    name: '§14 Open questions — 4 new',
    sentinel: 'Item stack visual direction',
    from: `## 14. Open questions

(Updated as design evolves. Do not let agents resolve these without human input.)

- [ ] Final target run length: 15 or 20 min?
- [ ] Crew specialties — passive boost or active ability per crew?
- [ ] Boss telegraph system — how do players learn boss patterns?`,
    to: `## 14. Open questions

(Updated as design evolves. Do not let agents resolve these without human input.)

- [ ] Final target run length: 15 or 20 min?
- [ ] Crew specialties — passive boost or active ability per crew?
- [ ] Boss telegraph system — how do players learn boss patterns?
- [ ] Item stack visual direction: above the turret, beside it, or radial cluster?
- [ ] Item drop source: enemy kills, encounter completion, or both?
- [ ] Item rarity tiers in v1, or defer to v2?
- [ ] Forward-arc threats (v2 ambushes) — early-game tease vs. pure v2 expansion?`,
  },
  {
    name: '§15 Pinned decisions — 2 new bullets',
    sentinel: 'Module model:** Two kinds',
    from: `- **Train topology v1:** Ordered array. Engine leftmost & immovable. Single Engine. Cargo defaults rightmost. v2 may relax. (See ADR-001.)`,
    to: `- **Train topology v1:** Ordered array. Engine leftmost & immovable. Single Engine. Cargo defaults rightmost. v2 may relax. (See ADR-001.)
- **Module model:** Two kinds — Turrets (slot-attached, fire) and Items (stack on turrets, modify traits). BoI-style item stacking. v1 ~10 turrets + ~20 items, item-stack cap 3. (See ADR-002.)
- **Enemy spawn directions:** All directions EXCEPT forward (+x). Train is being chased; spawn at rear/top/bottom only in v1. (See ADR-001 §Gap 2 + amendment, ADR-002.)`,
  },
];

for (const r of replacements) {
  if (content.includes(r.sentinel)) {
    console.log(`Skipped: ${r.name} (sentinel "${r.sentinel}" already present)`);
    continue;
  }
  if (!content.includes(r.from)) {
    throw new Error(`Anchor not found: ${r.name}`);
  }
  content = content.replace(r.from, r.to);
  changed = true;
  console.log(`Inserted: ${r.name}`);
}

if (changed) {
  fs.writeFileSync(path, content);
  console.log(`Wrote ${path} (${content.length} chars).`);
} else {
  console.log('No changes needed.');
}
