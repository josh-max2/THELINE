// Tech Tree modal panel — DOM-based, opens over the Hub. Per Task 5.3.
// Renders 3 tiers as horizontal lanes; each node is a clickable card whose
// state (owned / affordable / cant-afford / locked) is recomputed every render.

import { canPurchase, nodesByTier } from '../lib/techTreeMath';
import type { TechNodeData } from '../lib/types';
import type { TechTreeSystem } from '../systems/TechTreeSystem';
import { salvageStore } from '../lib/salvageStore';

export class TechTreePanel {
  private readonly bg: HTMLDivElement;
  private readonly modal: HTMLDivElement;
  private readonly content: HTMLDivElement;
  private readonly system: TechTreeSystem;
  private readonly unsubSalvage: () => void;
  private readonly unsubTech: () => void;
  private readonly onClose: () => void;

  constructor(parent: HTMLElement, system: TechTreeSystem, onClose: () => void) {
    this.system = system;
    this.onClose = onClose;

    this.bg = document.createElement('div');
    this.bg.className = 'tech-tree-modal-bg';
    this.bg.addEventListener('click', (e) => {
      if (e.target === this.bg) this.close();
    });

    this.modal = document.createElement('div');
    this.modal.className = 'tech-tree-modal';

    const header = document.createElement('div');
    header.className = 'tech-tree-header';

    const titleWrap = document.createElement('div');
    const title = document.createElement('div');
    title.className = 'tech-tree-title';
    title.textContent = 'TECH TREE';
    titleWrap.appendChild(title);
    const sub = document.createElement('div');
    sub.style.fontSize = '11px';
    sub.style.color = '#7a90b0';
    sub.style.marginTop = '4px';
    sub.textContent = 'Spend Salvage on permanent unlocks across runs.';
    titleWrap.appendChild(sub);
    header.appendChild(titleWrap);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'tech-tree-close';
    closeBtn.textContent = 'CLOSE';
    closeBtn.addEventListener('click', () => this.close());
    header.appendChild(closeBtn);

    this.modal.appendChild(header);

    this.content = document.createElement('div');
    this.modal.appendChild(this.content);

    this.bg.appendChild(this.modal);
    parent.appendChild(this.bg);

    // Re-render whenever salvage or owned-set changes.
    this.unsubSalvage = salvageStore.subscribe(() => this.render());
    this.unsubTech = this.system.subscribe(() => this.render());
  }

  destroy(): void {
    this.unsubSalvage();
    this.unsubTech();
    this.bg.remove();
  }

  private close(): void {
    this.destroy();
    this.onClose();
  }

  private render(): void {
    const tiers = nodesByTier();
    this.content.replaceChildren();
    for (const tier of [1, 2, 3] as const) {
      const tierEl = document.createElement('div');
      tierEl.className = 'tech-tree-tier';

      const label = document.createElement('div');
      label.className = 'tech-tree-tier-label';
      label.textContent = `Tier ${tier}`;
      tierEl.appendChild(label);

      const row = document.createElement('div');
      row.className = 'tech-tree-row';
      for (const node of tiers[tier]) row.appendChild(this.renderNode(node));
      tierEl.appendChild(row);

      this.content.appendChild(tierEl);
    }
  }

  private renderNode(node: TechNodeData): HTMLDivElement {
    const card = document.createElement('div');
    card.className = 'tech-node';

    const isOwned = this.system.has(node.id);
    const result = canPurchase(node.id, this.system.ownedIds, salvageStore.total);

    const state: 'owned' | 'affordable' | 'cant-afford' | 'locked' = (() => {
      if (isOwned) return 'owned';
      if (result.ok) return 'affordable';
      if (result.reason === 'insufficient-salvage') return 'cant-afford';
      return 'locked';
    })();
    card.dataset.state = state;

    const head = document.createElement('div');
    head.style.display = 'flex';
    head.style.justifyContent = 'space-between';
    head.style.alignItems = 'baseline';

    const name = document.createElement('div');
    name.className = 'tech-node-name';
    name.textContent = node.name;
    head.appendChild(name);

    const cost = document.createElement('div');
    cost.className = 'tech-node-cost';
    cost.dataset.cantAfford = state === 'cant-afford' ? 'true' : 'false';
    cost.textContent = `${node.cost} S`;
    head.appendChild(cost);

    card.appendChild(head);

    const desc = document.createElement('p');
    desc.className = 'tech-node-desc';
    desc.textContent = node.description;
    card.appendChild(desc);

    const status = document.createElement('div');
    status.className = 'tech-node-status';
    status.dataset.state = state;
    status.textContent = (() => {
      if (state === 'owned') return 'OWNED';
      if (state === 'locked') return 'Requires earlier tier';
      if (state === 'cant-afford') return 'Need more Salvage';
      return 'Click to purchase';
    })();
    card.appendChild(status);

    if (state === 'affordable') {
      card.addEventListener('click', () => {
        const r = this.system.purchase(node.id);
        if (!r.ok) {
          // Defensive — UI should prevent this, but log if it slips through.
          console.warn(`Tech purchase failed: ${node.id} (${r.reason})`);
        }
      });
    }
    return card;
  }
}
