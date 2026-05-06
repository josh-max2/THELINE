// Cross-scene singleton for the player's current train layout. Mirrors the
// salvageStore + unlocksStore pattern. Per Task 5.4 follow-up — consumer for
// hubState.trainLayout + Apply Build flow.
//
// HubScene populates this on save load + on Apply Build. RunScene reads it
// at create() to drive TrainSystem.addCar instead of hardcoding the layout.

import type { CarType } from './types';

export const DEFAULT_TRAIN_LAYOUT: ReadonlyArray<CarType> = [
  'engine',
  'weapon',
  'armor',
  'crew',
  'cargo',
];

type Listener = (layout: ReadonlyArray<CarType>) => void;

class LoadoutStore {
  private current: ReadonlyArray<CarType> = DEFAULT_TRAIN_LAYOUT;
  private readonly listeners = new Set<Listener>();

  get layout(): ReadonlyArray<CarType> {
    return this.current;
  }

  /** Replace the layout. Empty / non-engine-first input falls back to default. */
  setLayout(layout: ReadonlyArray<CarType>): void {
    if (layout.length === 0 || layout[0] !== 'engine') {
      this.current = DEFAULT_TRAIN_LAYOUT;
    } else {
      this.current = [...layout];
    }
    for (const l of this.listeners) l(this.current);
  }

  reset(): void {
    this.current = DEFAULT_TRAIN_LAYOUT;
    for (const l of this.listeners) l(this.current);
  }

  /** True if the layout matches the canonical Phase 4 default. */
  isCanonicalDefault(): boolean {
    if (this.current.length !== DEFAULT_TRAIN_LAYOUT.length) return false;
    return this.current.every((t, i) => t === DEFAULT_TRAIN_LAYOUT[i]);
  }

  subscribe(l: Listener): () => void {
    this.listeners.add(l);
    return () => {
      this.listeners.delete(l);
    };
  }
}

export const loadoutStore = new LoadoutStore();
