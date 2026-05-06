// Hub UI overlay — DOM-heavy per DESIGN §10. Five sections:
// Engineering Bay (placeholder), Crew Roster (placeholder), Tech Tree (Task 5.3 functional),
// Mission Board (functional), Lore Log (placeholder).

import type { TechTreeSystem } from '../systems/TechTreeSystem';
import { TechTreePanel } from './techTreePanel';
import { salvageStore } from '../lib/salvageStore';
import { decodeBuild, type SharedBuild } from '../lib/buildShare';
import { audioStore } from '../lib/audioStore';

const PLACEHOLDER_NOTE = 'Phase 5 polish';

export interface HubOverlayDeps {
  techTree?: TechTreeSystem;
  /** Build token passed via ?b=…; if present, Hub shows an Import Build banner. */
  importToken?: string | null;
  /**
   * Called when player clicks "Apply Build" in the import banner. Receives the
   * decoded build. Hub-side wiring should persist via SaveSystem.updateHubState.
   */
  onApplyImport?: (build: SharedBuild) => void;
  /** Called when the Mute toggle is clicked — persists muted flag to save. */
  onMuteToggle?: (muted: boolean) => void;
}

export class HubOverlay {
  private readonly root: HTMLDivElement;
  private readonly salvageEl: HTMLSpanElement;
  private readonly unsubSalvage?: () => void;
  private readonly unsubAudio?: () => void;
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

    // Mute toggle (Task 5.6) — sits in the header next to the salvage readout.
    const muteBtn = document.createElement('button');
    muteBtn.className = 'hub-mute';
    const renderMuteLabel = () => {
      muteBtn.textContent = audioStore.muted ? 'Sound: OFF' : 'Sound: ON';
    };
    renderMuteLabel();
    muteBtn.addEventListener('click', () => {
      const next = !audioStore.muted;
      audioStore.setMuted(next);
      deps.onMuteToggle?.(next);
    });
    this.unsubAudio = audioStore.subscribe(renderMuteLabel);

    header.appendChild(title);
    header.appendChild(muteBtn);
    header.appendChild(this.salvageEl);
    this.root.appendChild(header);

    // Keep header live during the hub session — purchases debit immediately.
    this.unsubSalvage = salvageStore.subscribe((total) => {
      this.salvageEl.textContent = `Salvage: ${total}`;
    });

    // Import-from-URL banner (Task 5.4) — shown when ?b=… is present.
    if (deps.importToken) {
      const banner = this.makeImportBanner(deps.importToken, deps.onApplyImport);
      if (banner) this.root.appendChild(banner);
    }

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
    this.unsubAudio?.();
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

  /**
   * Render the Import-Build banner. Returns null if the token is unrecoverable
   * (silently — no point showing an error banner if the URL is garbage).
   */
  private makeImportBanner(
    token: string,
    onApply?: (build: SharedBuild) => void,
  ): HTMLDivElement | null {
    const decoded = decodeBuild(token);
    const banner = document.createElement('div');
    banner.className = 'hub-import-banner';

    const heading = document.createElement('div');
    heading.className = 'hub-import-heading';

    const dismiss = document.createElement('button');
    dismiss.className = 'hub-import-dismiss';
    dismiss.textContent = 'Dismiss';
    dismiss.addEventListener('click', () => banner.remove());

    if (!decoded.ok) {
      heading.textContent = `Build URL invalid (${decoded.reason}).`;
      banner.appendChild(heading);
      banner.appendChild(dismiss);
      return banner;
    }

    const summary = describeBuild(decoded.build);
    heading.textContent = `Imported build: ${summary}`;
    banner.appendChild(heading);

    const apply = document.createElement('button');
    apply.className = 'hub-import-apply';
    apply.textContent = 'Apply Build';
    apply.addEventListener('click', () => {
      onApply?.(decoded.build);
      apply.disabled = true;
      apply.textContent = 'Applied';
    });
    banner.appendChild(apply);
    banner.appendChild(dismiss);
    return banner;
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

function describeBuild(build: SharedBuild): string {
  const cars = build.trainLayout.length;
  const turrets = build.attachments.length;
  const items = build.attachments.reduce((n, a) => n + a.itemIds.length, 0);
  return `${cars} car${cars === 1 ? '' : 's'}, ${turrets} turret${turrets === 1 ? '' : 's'}, ${items} item${items === 1 ? '' : 's'}.`;
}
