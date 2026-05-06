// Hub UI overlay — DOM-heavy per DESIGN §10. Five sections:
// Engineering Bay (placeholder), Crew Roster (placeholder), Tech Tree (Task 5.3 functional),
// Mission Board (functional), Lore Log (placeholder).

import type { TechTreeSystem } from '../systems/TechTreeSystem';
import { TechTreePanel } from './techTreePanel';
import { salvageStore } from '../lib/salvageStore';

const PLACEHOLDER_NOTE = 'Phase 5 polish';

export interface HubOverlayDeps {
  techTree?: TechTreeSystem;
}

export class HubOverlay {
  private readonly root: HTMLDivElement;
  private readonly salvageEl: HTMLSpanElement;
  private readonly unsubSalvage?: () => void;
  private techPanel?: TechTreePanel;

  constructor(
    parent: HTMLElement,
    salvageTotal: number,
    onDepart: () => void,
    deps: HubOverlayDeps = {},
  ) {
    this.root = document.createElement('div');
    this.root.className = 'hub-overlay';

    const header = document.createElement('div');
    header.className = 'hub-header';
    const title = document.createElement('span');
    title.textContent = 'HUB';
    this.salvageEl = document.createElement('span');
    this.salvageEl.className = 'hub-salvage';
    this.salvageEl.textContent = `Salvage: ${salvageTotal}`;
    header.appendChild(title);
    header.appendChild(this.salvageEl);
    this.root.appendChild(header);

    // Keep header live during the hub session — purchases debit immediately.
    this.unsubSalvage = salvageStore.subscribe((total) => {
      this.salvageEl.textContent = `Salvage: ${total}`;
    });

    const grid = document.createElement('div');
    grid.className = 'hub-grid';

    grid.appendChild(this.makePanel('Engineering Bay', PLACEHOLDER_NOTE, 'Install/swap turrets, configure car loadouts.'));
    grid.appendChild(this.makePanel('Crew Roster', PLACEHOLDER_NOTE, 'Recruit crew, assign specialties.'));

    // Tech Tree — functional in v0 if a system was injected; placeholder otherwise.
    if (deps.techTree) {
      grid.appendChild(this.makeTechTreeCard(deps.techTree));
    } else {
      grid.appendChild(this.makePanel('Tech Tree', PLACEHOLDER_NOTE, 'Spend Salvage on permanent unlocks.'));
    }

    // Mission Board — the one functional panel.
    const mission = document.createElement('div');
    mission.className = 'hub-panel hub-mission';
    const missionTitle = document.createElement('h3');
    missionTitle.textContent = 'Mission Board';
    mission.appendChild(missionTitle);

    const missionDesc = document.createElement('p');
    missionDesc.textContent = 'Test Line — cycles through travel/swarm/mini-boss/boss encounters.';
    mission.appendChild(missionDesc);

    const departBtn = document.createElement('button');
    departBtn.className = 'hub-depart';
    departBtn.textContent = 'DEPART';
    departBtn.addEventListener('click', onDepart);
    mission.appendChild(departBtn);
    grid.appendChild(mission);

    grid.appendChild(this.makePanel('Lore Log', PLACEHOLDER_NOTE, 'Veil fragments accumulate.'));

    this.root.appendChild(grid);
    parent.appendChild(this.root);
  }

  destroy(): void {
    this.unsubSalvage?.();
    this.techPanel?.destroy();
    this.techPanel = undefined;
    this.root.remove();
  }

  private makeTechTreeCard(system: TechTreeSystem): HTMLDivElement {
    const panel = document.createElement('div');
    panel.className = 'hub-panel hub-techtree';
    const h = document.createElement('h3');
    h.textContent = 'Tech Tree';
    panel.appendChild(h);

    const owned = system.ownedIds.size;
    const summary = document.createElement('p');
    summary.textContent = `${owned} unlock${owned === 1 ? '' : 's'} purchased — click to spend Salvage.`;
    panel.appendChild(summary);

    panel.addEventListener('click', () => {
      if (this.techPanel) return;
      this.techPanel = new TechTreePanel(document.body, system, () => {
        this.techPanel = undefined;
        // Update the summary line after close in case purchases happened.
        const updated = system.ownedIds.size;
        summary.textContent = `${updated} unlock${updated === 1 ? '' : 's'} purchased — click to spend Salvage.`;
      });
    });

    // Keep the count live during hub session via system subscribe.
    system.subscribe((set) => {
      const n = set.size;
      summary.textContent = `${n} unlock${n === 1 ? '' : 's'} purchased — click to spend Salvage.`;
    });
    return panel;
  }

  private makePanel(title: string, badge: string, body: string): HTMLDivElement {
    const panel = document.createElement('div');
    panel.className = 'hub-panel';
    const h = document.createElement('h3');
    h.textContent = title;
    panel.appendChild(h);
    const tag = document.createElement('span');
    tag.className = 'hub-badge';
    tag.textContent = badge;
    panel.appendChild(tag);
    const p = document.createElement('p');
    p.textContent = body;
    panel.appendChild(p);
    return panel;
  }
}
