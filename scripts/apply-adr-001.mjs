// One-shot tool: apply ADR-001 decisions to docs/DESIGN.md.
// Run once after ADR-001 is ACCEPTED. Idempotent — safe to re-run.
import fs from 'node:fs';

const path = 'docs/DESIGN.md';
let content = fs.readFileSync(path, 'utf8');
let changed = false;

const anchor1 = '| Cargo Car | Holds run rewards; vulnerable | 0 | Low |';
const insert1 = `

**v1 layout rules** *(per ADR-001)*:

- Train is an ordered array of cars, indexed left-to-right.
- Engine occupies index 0 (leftmost). Exactly one Engine in v1. Cannot be moved or removed.
- Cargo Car, if present, defaults to the rightmost position but is not constrained there.
- Weapon / Armor / Crew cars may appear in any order between Engine and Cargo.
- Train length: 1–8 cars in v1.
- Reordering happens in the Hub's Engineering Bay between runs, never mid-run.
- **v2 may relax** these rules: multi-engine builds, mid-train engines, alternative topologies, train-as-build-axis.`;

if (!content.includes('**v1 layout rules**')) {
  if (!content.includes(anchor1)) throw new Error(`Anchor 1 not found in ${path}`);
  content = content.replace(anchor1, anchor1 + insert1);
  changed = true;
  console.log('Inserted: v1 layout rules into Section 4');
} else {
  console.log('Skipped: v1 layout rules already present');
}

const anchor2 = '- **Crew:** Slot-based (4 slots), no individual avatars or pathing in v1.';
const insert2 = `\n- **Train topology v1:** Ordered array. Engine leftmost & immovable. Single Engine. Cargo defaults rightmost. v2 may relax. (See ADR-001.)`;

if (!content.includes('**Train topology v1:**')) {
  if (!content.includes(anchor2)) throw new Error(`Anchor 2 not found in ${path}`);
  content = content.replace(anchor2, anchor2 + insert2);
  changed = true;
  console.log('Inserted: Train topology v1 bullet into Section 15');
} else {
  console.log('Skipped: Train topology bullet already present');
}

if (changed) {
  fs.writeFileSync(path, content);
  console.log(`Wrote ${path} (${content.length} chars)`);
} else {
  console.log('No changes needed.');
}
