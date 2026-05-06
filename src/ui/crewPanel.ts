// DOM-based CrewPanel — fixed top-left under the in-canvas HUD label.
// Build plan Task 4.4 — "drag-drop or click-to-assign". v0 ships dropdowns
// (click-to-assign); Phase 5 polish can swap to HTML5 DnD.

import type { CrewSystem } from '../systems/CrewSystem';
import type { TrainSystem } from '../systems/TrainSystem';
import { DEFAULT_CREW } from '../lib/types';

export class CrewPanel {
  private readonly root: HTMLDivElement;
  private readonly selects = new Map<number, HTMLSelectElement>();
  private unsubscribe?: () => void;

  constructor(parent: HTMLElement, train: TrainSystem, crew: CrewSystem) {
    this.root = document.createElement('div');
    this.root.className = 'crew-panel';

    const header = document.createElement('div');
    header.className = 'crew-header';
    header.textContent = 'CREW';
    this.root.appendChild(header);

    for (const member of DEFAULT_CREW) {
      const row = document.createElement('div');
      row.className = 'crew-row';

      const dot = document.createElement('span');
      dot.className = 'crew-dot';
      dot.style.background = member.color;
      row.appendChild(dot);

      const select = document.createElement('select');
      select.className = 'crew-select';
      const unassignedOpt = document.createElement('option');
      unassignedOpt.value = '';
      unassignedOpt.textContent = '(unassigned)';
      select.appendChild(unassignedOpt);
      for (let i = 0; i < train.length; i++) {
        const car = train.getCar(i);
        if (!car) continue;
        const opt = document.createElement('option');
        opt.value = String(i);
        opt.textContent = car.data.name;
        select.appendChild(opt);
      }
      select.addEventListener('change', () => {
        const v = select.value;
        crew.assign(member.id, v === '' ? null : Number(v));
      });
      row.appendChild(select);

      this.root.appendChild(row);
      this.selects.set(member.id, select);
    }

    parent.appendChild(this.root);

    this.unsubscribe = crew.subscribe(() => {
      const assignments = crew.getAssignments();
      for (const [crewId, sel] of this.selects) {
        const carIndex = assignments.get(crewId);
        sel.value = carIndex == null ? '' : String(carIndex);
      }
    });
  }

  destroy(): void {
    this.unsubscribe?.();
    this.root.remove();
  }
}
