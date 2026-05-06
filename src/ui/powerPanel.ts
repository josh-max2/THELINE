// DOM-based PowerPanel — fixed-position bottom-left overlay with one slider
// per eligible (non-Engine, non-Cargo) car. Per build plan Task 4.3:
// "drag handles to redistribute (real-time, not paused)."
//
// Built without React/Tailwind — vanilla DOM, styled via style.css.

import type { PowerSystem } from '../systems/PowerSystem';
import type { TrainSystem } from './../systems/TrainSystem';
import { MAX_POWER_WEIGHT } from '../lib/powerMath';

export class PowerPanel {
  private readonly root: HTMLDivElement;
  private readonly rows = new Map<number, { input: HTMLInputElement; readout: HTMLSpanElement }>();
  private readonly headerReadout: HTMLSpanElement;
  private unsubscribe?: () => void;

  constructor(parent: HTMLElement, train: TrainSystem, power: PowerSystem) {
    this.root = document.createElement('div');
    this.root.className = 'power-panel';

    const header = document.createElement('div');
    header.className = 'power-header';
    header.textContent = 'POWER';
    const headerReadout = document.createElement('span');
    headerReadout.className = 'power-header-readout';
    headerReadout.textContent = `0/${power.generation()}`;
    this.headerReadout = headerReadout;
    header.appendChild(headerReadout);
    this.root.appendChild(header);

    // One row per eligible car (Cargo has no modules, no demand → skip).
    // Engine is included — its turrets share the pool just like any other car.
    for (let i = 0; i < train.length; i++) {
      const car = train.getCar(i);
      if (!car) continue;
      if (car.type === 'cargo') continue;

      const row = document.createElement('div');
      row.className = 'power-row';

      const label = document.createElement('label');
      label.textContent = car.data.name;
      row.appendChild(label);

      const input = document.createElement('input');
      input.type = 'range';
      input.min = '0';
      input.max = String(MAX_POWER_WEIGHT);
      input.value = String(power.getWeight(i));
      input.addEventListener('input', () => {
        power.setWeight(i, Number(input.value));
      });
      row.appendChild(input);

      const readout = document.createElement('span');
      readout.className = 'power-readout';
      row.appendChild(readout);

      this.root.appendChild(row);
      this.rows.set(i, { input, readout });
    }

    parent.appendChild(this.root);

    this.unsubscribe = power.subscribe((allocations) => {
      let totalSupply = 0;
      for (const a of allocations) {
        totalSupply += a.supply;
        const row = this.rows.get(a.carIndex);
        if (!row) continue;
        const eff = Math.round(a.efficiency * 100);
        row.readout.textContent = `${a.supply.toFixed(1)}/${a.demand.toFixed(1)} ${eff}%`;
        row.readout.dataset.efficiency = eff < 100 ? 'low' : 'ok';
      }
      this.headerReadout.textContent = `${totalSupply.toFixed(1)}/${power.generation()}`;
    });
  }

  destroy(): void {
    this.unsubscribe?.();
    this.root.remove();
  }
}
