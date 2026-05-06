// First-run tutorial modal explaining controls. Per Task 5.7.
// Shown by HubScene on initial Hub enter when tutorialState.hasSeenTutorial()
// is false. "Got it" dismisses + marks seen.

import { markTutorialSeen } from '../lib/tutorialState';

interface TutorialItem {
  title: string;
  body: string;
}

const TUTORIAL_ITEMS: ReadonlyArray<TutorialItem> = [
  {
    title: 'The Run',
    body: 'You command a train holding the line. Enemies spawn from every direction except forward. Survive long enough to earn Salvage and bring it home.',
  },
  {
    title: 'Slow-time (SPACE)',
    body: 'Hold SPACE to slow time to 25%. Use it to read incoming swarms or line up an aoe-pulse on a tight cluster.',
  },
  {
    title: 'Salvage Persists',
    body: 'Kills earn Salvage. Salvage carries between runs and is the currency for Tech Tree unlocks at the Hub.',
  },
  {
    title: 'Hub & Tech Tree',
    body: 'Click Tech Tree to spend Salvage on permanent unlocks (extra turret slot, fire/cryo/electric category access, +10% global damage, etc).',
  },
  {
    title: 'Share Builds',
    body: 'Click "Copy Build URL" mid-run to copy a shareable link encoding your loadout. Anyone opening that link sees an Import Build banner at the Hub.',
  },
];

export class TutorialOverlay {
  private readonly bg: HTMLDivElement;

  constructor(parent: HTMLElement) {
    this.bg = document.createElement('div');
    this.bg.className = 'tutorial-bg';

    const modal = document.createElement('div');
    modal.className = 'tutorial-modal';

    const heading = document.createElement('div');
    heading.className = 'tutorial-heading';
    heading.textContent = 'WELCOME TO THE LINE';
    modal.appendChild(heading);

    const sub = document.createElement('div');
    sub.className = 'tutorial-sub';
    sub.textContent = 'A combat train roguelike. Read the basics, then DEPART.';
    modal.appendChild(sub);

    const list = document.createElement('div');
    list.className = 'tutorial-list';
    for (const item of TUTORIAL_ITEMS) {
      const row = document.createElement('div');
      row.className = 'tutorial-item';
      const t = document.createElement('div');
      t.className = 'tutorial-item-title';
      t.textContent = item.title;
      row.appendChild(t);
      const b = document.createElement('p');
      b.className = 'tutorial-item-body';
      b.textContent = item.body;
      row.appendChild(b);
      list.appendChild(row);
    }
    modal.appendChild(list);

    const ok = document.createElement('button');
    ok.className = 'tutorial-ok';
    ok.textContent = 'GOT IT';
    ok.addEventListener('click', () => this.dismiss());
    modal.appendChild(ok);

    this.bg.appendChild(modal);
    parent.appendChild(this.bg);
  }

  dismiss(): void {
    markTutorialSeen();
    this.bg.remove();
  }

  destroy(): void {
    this.bg.remove();
  }
}
