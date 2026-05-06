// Hub UI overlay — DOM-heavy per DESIGN §10. Five sections:
// Engineering Bay, Crew Roster, Tech Tree (placeholder), Mission Board, Lore Log (placeholder).
// v0 ships only the Mission Board's Depart button as functional; rest are stubs.

const PLACEHOLDER_NOTE = 'Phase 5 polish';

export class HubOverlay {
  private readonly root: HTMLDivElement;

  constructor(parent: HTMLElement, salvageTotal: number, onDepart: () => void) {
    this.root = document.createElement('div');
    this.root.className = 'hub-overlay';

    const header = document.createElement('div');
    header.className = 'hub-header';
    const title = document.createElement('span');
    title.textContent = 'HUB';
    const salvage = document.createElement('span');
    salvage.className = 'hub-salvage';
    salvage.textContent = `Salvage: ${salvageTotal}`;
    header.appendChild(title);
    header.appendChild(salvage);
    this.root.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'hub-grid';

    grid.appendChild(this.makePanel('Engineering Bay', PLACEHOLDER_NOTE, 'Install/swap turrets, configure car loadouts.'));
    grid.appendChild(this.makePanel('Crew Roster', PLACEHOLDER_NOTE, 'Recruit crew, assign specialties.'));
    grid.appendChild(this.makePanel('Tech Tree', PLACEHOLDER_NOTE, 'Spend Salvage on permanent unlocks.'));

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
    this.root.remove();
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
